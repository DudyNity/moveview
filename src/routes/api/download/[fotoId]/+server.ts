import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db, schema } from '$lib/server/db/index.js';
import { eq, and } from 'drizzle-orm';
import { getFileBuffer } from '$lib/server/storage/r2.js';
import { isRateLimited } from '$lib/server/rate-limit.js';
import { RATE_LIMIT_DOWNLOAD_MAX, RATE_LIMIT_DOWNLOAD_WINDOW_MS } from '$lib/constants.js';

export const GET: RequestHandler = async ({ params, locals, getClientAddress }) => {
	if (!locals.user) {
		return json({ error: 'Não autenticado' }, { status: 401 });
	}

	// Rate limiting por usuário
	if (isRateLimited(`download:${locals.user.id}`, RATE_LIMIT_DOWNLOAD_MAX, RATE_LIMIT_DOWNLOAD_WINDOW_MS)) {
		return json({ error: 'Limite de downloads atingido. Aguarde um momento.' }, { status: 429 });
	}

	const { fotoId } = params;

	// Verifica se o usuário tem pedido pago contendo esta foto
	const result = await db
		.select({
			photoOriginalKey: schema.photos.originalKey,
			orderId: schema.orders.id,
			eventName: schema.events.name
		})
		.from(schema.orders)
		.innerJoin(schema.orderItems, eq(schema.orderItems.orderId, schema.orders.id))
		.innerJoin(schema.photos, eq(schema.photos.id, schema.orderItems.photoId))
		.innerJoin(schema.events, eq(schema.events.id, schema.photos.eventId))
		.where(
			and(
				eq(schema.orders.userId, locals.user.id),
				eq(schema.orders.status, 'paid'),
				eq(schema.photos.id, fotoId)
			)
		)
		.limit(1);

	if (result.length === 0) {
		return json({ error: 'Foto não encontrada ou não adquirida' }, { status: 403 });
	}

	const { photoOriginalKey, orderId, eventName } = result[0];

	// Registra o download
	await db.insert(schema.downloads).values({
		userId: locals.user.id,
		photoId: fotoId,
		orderId,
		ipAddress: getClientAddress()
	});

	const buffer = await getFileBuffer(photoOriginalKey);
	if (!buffer) {
		return json({ error: 'Arquivo não encontrado no storage' }, { status: 404 });
	}

	const safeName = eventName
		.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-zA-Z0-9 _-]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
	const filename = `Move View Photos - ${safeName}.jpg`;

	return new Response(new Uint8Array(buffer), {
		headers: {
			'Content-Type': 'image/jpeg',
			'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(`Move View Photos - ${eventName}.jpg`)}`,
			'Content-Length': buffer.length.toString(),
			'Cache-Control': 'private, no-store'
		}
	});
};
