import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { z } from 'zod';
import { db, schema } from '$lib/server/db/index.js';
import { inArray, eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { env as pubEnv } from '$env/dynamic/public';
import { isRateLimited } from '$lib/server/rate-limit.js';
import { RATE_LIMIT_CHECKOUT_MAX, RATE_LIMIT_CHECKOUT_WINDOW_MS } from '$lib/constants.js';
import { createPreference, isMPConfigured } from '$lib/server/payment/mercadopago.js';

const PUBLIC_APP_URL = pubEnv.PUBLIC_APP_URL;

const checkoutSchema = z.object({
	cartItems: z.array(z.string()).min(1, 'Carrinho vazio')
});

export const POST: RequestHandler = async ({ request, locals, getClientAddress }) => {
	if (!locals.user) {
		return json({ error: 'Não autenticado' }, { status: 401 });
	}

	const ip = getClientAddress();
	if (isRateLimited(`checkout:${ip}`, RATE_LIMIT_CHECKOUT_MAX, RATE_LIMIT_CHECKOUT_WINDOW_MS)) {
		return json({ error: 'Muitas tentativas. Tente novamente em alguns instantes.' }, { status: 429 });
	}

	const body = await request.json().catch(() => null);
	if (!body) return json({ error: 'Corpo inválido' }, { status: 400 });

	const parsed = checkoutSchema.safeParse(body);
	if (!parsed.success) {
		return json({ error: parsed.error.issues[0].message }, { status: 400 });
	}

	const { cartItems } = parsed.data;

	// Busca fotos e eventos no banco
	const photos = await db
		.select({
			id: schema.photos.id,
			price: schema.photos.price,
			eventId: schema.photos.eventId,
			eventName: schema.events.name
		})
		.from(schema.photos)
		.innerJoin(schema.events, eq(schema.events.id, schema.photos.eventId))
		.where(inArray(schema.photos.id, cartItems));

	if (photos.length === 0) {
		return json({ error: 'Fotos não encontradas' }, { status: 404 });
	}

	const totalAmount = photos.reduce((sum, p) => sum + p.price, 0);

	// Cria pedido e itens em transação
	const order = await db.transaction(async (tx) => {
		const [newOrder] = await tx
			.insert(schema.orders)
			.values({
				userId: locals.user!.id,
				status: 'pending',
				totalAmount
			})
			.returning({ id: schema.orders.id });

		await tx.insert(schema.orderItems).values(
			photos.map((p) => ({
				orderId: newOrder.id,
				photoId: p.id,
				priceAtPurchase: p.price
			}))
		);

		return newOrder;
	});

	const appUrl = PUBLIC_APP_URL || 'http://localhost:5173';

	// ── Modo mock (sem MP configurado) ────────────────────────────────────────
	if (!isMPConfigured()) {
		if (process.env.NODE_ENV !== 'production') {
			console.log(`[Checkout] Mock mode — order ${order.id}`);
		}
		await db
			.update(schema.orders)
			.set({ status: 'paid', updatedAt: new Date() })
			.where(eq(schema.orders.id, order.id));
		return json({ url: `${appUrl}/pedidos/sucesso?order=${order.id}` });
	}

	// ── Mercado Pago ──────────────────────────────────────────────────────────
	try {
		// Agrupa fotos por evento para título mais descritivo
		const eventMap = new Map<string, { name: string; count: number; totalCents: number }>();
		for (const p of photos) {
			const entry = eventMap.get(p.eventId) ?? { name: p.eventName, count: 0, totalCents: 0 };
			entry.count++;
			entry.totalCents += p.price;
			eventMap.set(p.eventId, entry);
		}

		const items = Array.from(eventMap.values()).map((e) => ({
			id: order.id,
			title: `Fotos — ${e.name}`,
			unit_price: e.totalCents / 100, // MP usa reais, não centavos
			quantity: 1
		}));

		const result = await createPreference(order.id, items, locals.user.email, {
			success: `${appUrl}/pedidos/sucesso?order=${order.id}`,
			failure: `${appUrl}/?canceled=1`,
			pending: `${appUrl}/pedidos/sucesso?order=${order.id}`
		});

		if (!result) {
			throw new Error('MP retornou null');
		}

		await db
			.update(schema.orders)
			.set({ mpPreferenceId: result.preferenceId })
			.where(eq(schema.orders.id, order.id));

		return json({ url: result.initPoint });
	} catch (err) {
		console.error('[Checkout] Mercado Pago error:', err);

		await db
			.update(schema.orders)
			.set({ status: 'failed', updatedAt: new Date() })
			.where(eq(schema.orders.id, order.id));

		return json({ error: 'Erro ao criar sessão de pagamento' }, { status: 500 });
	}
};
