import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { db, schema } from '$lib/server/db/index.js';
import { eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { getPayment } from '$lib/server/payment/mercadopago.js';
import { sendDownloadEmail } from '$lib/server/email/index.js';
import { createHmac } from 'crypto';

const MP_WEBHOOK_SECRET = env.MP_WEBHOOK_SECRET;

/** Valida a assinatura do webhook do Mercado Pago */
function validateSignature(request: Request, _rawBody: string): boolean {
	if (!MP_WEBHOOK_SECRET) {
		console.warn('[MP Webhook] MP_WEBHOOK_SECRET não configurado — pulando validação de assinatura');
		return true; // permissivo até configurar o secret
	}

	const xSignature = request.headers.get('x-signature');
	const xRequestId = request.headers.get('x-request-id');
	const url = new URL(request.url);
	const dataId = url.searchParams.get('data.id');

	if (!xSignature) return false;

	// Extrai ts e v1 do header x-signature
	const parts = Object.fromEntries(xSignature.split(',').map((p) => p.split('=')));
	const ts = parts['ts'];
	const v1 = parts['v1'];
	if (!ts || !v1) return false;

	// Monta a string de validação conforme docs do MP
	const manifest = [
		dataId ? `id:${dataId};` : '',
		xRequestId ? `request-id:${xRequestId};` : '',
		`ts:${ts};`
	].join('');

	const expectedHash = createHmac('sha256', MP_WEBHOOK_SECRET)
		.update(manifest)
		.digest('hex');

	console.log('[MP Webhook] manifest:', manifest);
	console.log('[MP Webhook] expected:', expectedHash);
	console.log('[MP Webhook] received:', v1);

	return expectedHash === v1;
}

export const POST = async ({ request }: RequestEvent) => {
	const rawBody = await request.text();

	if (!validateSignature(request, rawBody)) {
		console.error('[MP Webhook] Assinatura inválida');
		return json({ error: 'Assinatura inválida' }, { status: 401 });
	}

	let body: { type?: string; data?: { id?: string } };
	try {
		body = JSON.parse(rawBody);
	} catch {
		return json({ error: 'Body inválido' }, { status: 400 });
	}

	// MP envia vários tipos de notificação — só processa pagamentos
	if (body.type !== 'payment') {
		return json({ received: true });
	}

	const paymentId = body.data?.id;
	if (!paymentId) return json({ received: true });

	try {
		const payment = await getPayment(paymentId);
		if (!payment) return json({ received: true });

		const orderId = payment.external_reference;
		if (!orderId) return json({ received: true });

		// Busca o pedido no banco para validar que existe
		const [order] = await db
			.select({ id: schema.orders.id, userId: schema.orders.userId, status: schema.orders.status })
			.from(schema.orders)
			.where(eq(schema.orders.id, orderId))
			.limit(1);

		if (!order) {
			console.error(`[MP Webhook] orderId=${orderId} não encontrado`);
			return json({ received: true });
		}

		const mpStatus = payment.status; // approved, pending, rejected, cancelled

		if (mpStatus === 'approved' && order.status !== 'paid') {
			await db
				.update(schema.orders)
				.set({
					status: 'paid',
					mpPaymentId: String(paymentId),
					updatedAt: new Date()
				})
				.where(eq(schema.orders.id, orderId));

			// Envia e-mail de confirmação
			try {
				await sendDownloadEmail(order.userId, orderId);
			} catch (emailErr) {
				console.error(`[MP Webhook] Falha ao enviar e-mail — orderId=${orderId}`, emailErr);
			}

		} else if (['rejected', 'cancelled'].includes(mpStatus ?? '') && order.status === 'pending') {
			await db
				.update(schema.orders)
				.set({ status: 'failed', updatedAt: new Date() })
				.where(eq(schema.orders.id, orderId));
		}

		return json({ received: true });
	} catch (err) {
		console.error('[MP Webhook] Erro ao processar:', err);
		return json({ error: 'Erro interno' }, { status: 500 });
	}
};
