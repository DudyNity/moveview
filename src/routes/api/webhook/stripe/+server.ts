import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db, schema } from '$lib/server/db/index.js';
import { eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
const { STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET } = env;
import { sendDownloadEmail } from '$lib/server/email/index.js';

export const POST: RequestHandler = async ({ request }) => {
	if (!STRIPE_SECRET_KEY || STRIPE_SECRET_KEY.includes('placeholder')) {
		return json({ received: true });
	}

	const body = await request.text();
	const signature = request.headers.get('stripe-signature');

	if (!signature) {
		return json({ error: 'Missing signature' }, { status: 400 });
	}

	try {
		const Stripe = (await import('stripe')).default;
		const stripe = new Stripe(STRIPE_SECRET_KEY);

		const event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);

		if (event.type === 'checkout.session.completed') {
			const session = event.data.object;
			const orderId = session.metadata?.orderId;
			const userId = session.metadata?.userId;

			if (orderId) {
				await db
					.update(schema.orders)
					.set({
						status: 'paid',
						stripePaymentIntentId: session.payment_intent as string,
						updatedAt: new Date()
					})
					.where(eq(schema.orders.id, orderId));

				// Envia e-mail de confirmação — falha não deve reverter o pagamento
				if (userId) {
					try {
						await sendDownloadEmail(userId, orderId);
					} catch (emailErr) {
						// Log detalhado para monitorar e reenviar manualmente se necessário
						console.error(
							`[Webhook] Falha ao enviar e-mail de confirmação — orderId=${orderId} userId=${userId}`,
							emailErr
						);
					}
				}
			}
		}

		if (event.type === 'checkout.session.expired') {
			const session = event.data.object;
			const orderId = session.metadata?.orderId;
			if (orderId) {
				await db
					.update(schema.orders)
					.set({ status: 'failed', updatedAt: new Date() })
					.where(eq(schema.orders.id, orderId));
			}
		}

		if (event.type === 'charge.refunded') {
			const charge = event.data.object;
			const paymentIntentId = charge.payment_intent as string;
			if (paymentIntentId) {
				await db
					.update(schema.orders)
					.set({ status: 'refunded', updatedAt: new Date() })
					.where(eq(schema.orders.stripePaymentIntentId, paymentIntentId));
			}
		}

		return json({ received: true });
	} catch (err) {
		console.error('[Webhook] Error:', err);
		return json({ error: 'Webhook error' }, { status: 400 });
	}
};
