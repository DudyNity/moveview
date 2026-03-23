import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { z } from 'zod';
import { db, schema } from '$lib/server/db/index.js';
import { inArray, eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { env as pubEnv } from '$env/dynamic/public';
const STRIPE_SECRET_KEY = env.STRIPE_SECRET_KEY;
const PUBLIC_APP_URL = pubEnv.PUBLIC_APP_URL;
import { isRateLimited } from '$lib/server/rate-limit.js';
import {
	RATE_LIMIT_CHECKOUT_MAX,
	RATE_LIMIT_CHECKOUT_WINDOW_MS
} from '$lib/constants.js';

const checkoutSchema = z.object({
	cartItems: z.array(z.string()).min(1, 'Carrinho vazio')
});

export const POST: RequestHandler = async ({ request, locals, getClientAddress }) => {
	if (!locals.user) {
		return json({ error: 'Não autenticado' }, { status: 401 });
	}

	// Rate limiting por IP
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

	// Busca fotos no banco
	const photos = await db
		.select({
			id: schema.photos.id,
			price: schema.photos.price,
			eventId: schema.photos.eventId
		})
		.from(schema.photos)
		.where(inArray(schema.photos.id, cartItems));

	if (photos.length === 0) {
		return json({ error: 'Fotos não encontradas' }, { status: 404 });
	}

	const totalAmount = photos.reduce((sum, p) => sum + p.price, 0);

	// Cria pedido e itens em uma única transaction para garantir consistência
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

	// Modo mock quando Stripe não está configurado
	if (!STRIPE_SECRET_KEY || STRIPE_SECRET_KEY.includes('placeholder')) {
		if (process.env.NODE_ENV !== 'production') {
			console.log(`[Checkout] Mock mode — order ${order.id} created, total ${totalAmount}`);
		}
		await db
			.update(schema.orders)
			.set({ status: 'paid', updatedAt: new Date() })
			.where(eq(schema.orders.id, order.id));
		return json({ url: `${appUrl}/pedidos/sucesso?order=${order.id}` });
	}

	try {
		const Stripe = (await import('stripe')).default;
		const stripe = new Stripe(STRIPE_SECRET_KEY);

		const lineItems = photos.map((p) => ({
			price_data: {
				currency: 'brl',
				product_data: { name: `Foto esportiva (${p.id.slice(0, 8)})` },
				unit_amount: p.price
			},
			quantity: 1
		}));

		const session = await stripe.checkout.sessions.create({
			payment_method_types: ['card', 'boleto', 'pix'],
			line_items: lineItems,
			mode: 'payment',
			success_url: `${appUrl}/pedidos/sucesso?order=${order.id}`,
			cancel_url: `${appUrl}/?canceled=1`,
			metadata: { orderId: order.id, userId: locals.user.id }
		});

		await db
			.update(schema.orders)
			.set({ stripeSessionId: session.id })
			.where(eq(schema.orders.id, order.id));

		return json({ url: session.url });
	} catch (err) {
		console.error('[Checkout] Stripe error:', err);

		// Marca o pedido como falho para não deixar órfão em pending
		await db
			.update(schema.orders)
			.set({ status: 'failed', updatedAt: new Date() })
			.where(eq(schema.orders.id, order.id));

		return json({ error: 'Erro ao criar sessão de pagamento' }, { status: 500 });
	}
};
