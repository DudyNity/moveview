import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { env } from '$env/dynamic/private';

function getClient(): MercadoPagoConfig | null {
	const token = env.MP_ACCESS_TOKEN;
	if (!token || token.includes('placeholder')) return null;
	return new MercadoPagoConfig({ accessToken: token });
}

export interface MPItem {
	id: string;
	title: string;
	unit_price: number; // em reais (não centavos)
	quantity: number;
}

export interface CreatePreferenceResult {
	preferenceId: string;
	initPoint: string; // URL de pagamento
}

/** Cria uma Preference no Mercado Pago e retorna a URL de pagamento */
export async function createPreference(
	orderId: string,
	items: MPItem[],
	payerEmail: string,
	backUrls: { success: string; failure: string; pending: string }
): Promise<CreatePreferenceResult | null> {
	const client = getClient();
	if (!client) return null;

	const preference = new Preference(client);

	const result = await preference.create({
		body: {
			items: items.map((i) => ({
				id: i.id,
				title: i.title,
				unit_price: i.unit_price,
				quantity: i.quantity,
				currency_id: 'BRL'
			})),
			payer: { email: payerEmail },
			back_urls: backUrls,
			auto_return: 'approved',
			external_reference: orderId,
			notification_url: `${env.PUBLIC_APP_URL || ''}/api/webhook/mercadopago`,
			statement_descriptor: 'MOVE VIEW PHOTOS',
			payment_methods: {
				excluded_payment_types: [],
				installments: 12
			}
		}
	});

	if (!result.id || !result.init_point) return null;

	return {
		preferenceId: result.id,
		initPoint: result.init_point
	};
}

/** Busca os detalhes de um pagamento pelo ID */
export async function getPayment(paymentId: string | number) {
	const client = getClient();
	if (!client) return null;

	const payment = new Payment(client);
	return payment.get({ id: Number(paymentId) });
}

/** Retorna true se o MP está configurado */
export function isMPConfigured(): boolean {
	return !!getClient();
}
