import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db, schema } from '$lib/server/db/index.js';
import { eq, and } from 'drizzle-orm';
import { getFileBuffer } from '$lib/server/storage/r2.js';
import archiver from 'archiver';
import { isRateLimited } from '$lib/server/rate-limit.js';
import { RATE_LIMIT_DOWNLOAD_MAX, RATE_LIMIT_DOWNLOAD_WINDOW_MS } from '$lib/constants.js';

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		return json({ error: 'Não autenticado' }, { status: 401 });
	}

	// Rate limiting por usuário (compartilhado com download individual)
	if (isRateLimited(`download:${locals.user.id}`, RATE_LIMIT_DOWNLOAD_MAX, RATE_LIMIT_DOWNLOAD_WINDOW_MS)) {
		return json({ error: 'Limite de downloads atingido. Aguarde um momento.' }, { status: 429 });
	}

	const { orderId } = params;

	const [order] = await db
		.select({ id: schema.orders.id, status: schema.orders.status })
		.from(schema.orders)
		.where(and(eq(schema.orders.id, orderId), eq(schema.orders.userId, locals.user.id)))
		.limit(1);

	if (!order || order.status !== 'paid') {
		return json({ error: 'Pedido não encontrado ou não pago' }, { status: 403 });
	}

	const items = await db
		.select({
			photoId: schema.photos.id,
			originalKey: schema.photos.originalKey,
			eventName: schema.events.name
		})
		.from(schema.orderItems)
		.innerJoin(schema.photos, eq(schema.photos.id, schema.orderItems.photoId))
		.innerJoin(schema.events, eq(schema.events.id, schema.photos.eventId))
		.where(eq(schema.orderItems.orderId, orderId));

	if (items.length === 0) {
		return json({ error: 'Pedido sem fotos' }, { status: 404 });
	}

	const archive = archiver('zip', { zlib: { level: 1 } });

	(async () => {
		let i = 1;
		for (const item of items) {
			const buffer = await getFileBuffer(item.originalKey);
			if (buffer) {
				archive.append(buffer, { name: `foto${i}.jpg` });
				i++;
			}
		}
		archive.finalize();
	})();

	const webStream = new ReadableStream({
		start(controller) {
			archive.on('data', (chunk: Buffer) => controller.enqueue(chunk));
			archive.on('end', () => controller.close());
			archive.on('error', (err: Error) => controller.error(err));
		}
	});

	const eventName = items[0]?.eventName ?? 'Evento';
	const safeName = eventName
		.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-zA-Z0-9 _-]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
	const zipFilename = `Move View Photos - ${safeName}.zip`;

	return new Response(webStream, {
		headers: {
			'Content-Type': 'application/zip',
			'Content-Disposition': `attachment; filename="${zipFilename}"; filename*=UTF-8''${encodeURIComponent(`Move View Photos - ${eventName}.zip`)}`
		}
	});
};
