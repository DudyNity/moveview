import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db, schema } from '$lib/server/db/index.js';
import { eq, and, inArray } from 'drizzle-orm';
import { getPublicUrl } from '$lib/server/storage/r2.js';
import { PHOTOS_PAGE_LIMIT } from '$lib/constants.js';

export const GET: RequestHandler = async ({ params, url, locals }) => {
	const offset = Math.max(0, parseInt(url.searchParams.get('offset') ?? '0'));

	const [event] = await db
		.select({ id: schema.events.id })
		.from(schema.events)
		.where(eq(schema.events.slug, params.slug))
		.limit(1);

	if (!event) error(404, 'Evento não encontrado');

	// Fetch one extra to detect if there are more
	const rawPhotos = await db
		.select({
			id: schema.photos.id,
			watermarkKey: schema.photos.watermarkKey,
			width: schema.photos.width,
			height: schema.photos.height,
			bibNumbers: schema.photos.bibNumbers,
			price: schema.photos.price
		})
		.from(schema.photos)
		.where(eq(schema.photos.eventId, event.id))
		.orderBy(schema.photos.createdAt)
		.limit(PHOTOS_PAGE_LIMIT + 1)
		.offset(offset);

	const hasMore = rawPhotos.length > PHOTOS_PAGE_LIMIT;
	const slice = rawPhotos.slice(0, PHOTOS_PAGE_LIMIT);

	const photos = slice.map((p) => ({
		id: p.id,
		// URL roteada pelo nosso servidor — nunca expõe a URL direta do R2
		watermarkUrl: `/api/photo/${p.id}`,
		width: p.width,
		height: p.height,
		bibNumbers: p.bibNumbers,
		price: p.price,
		isPurchased: false
	}));

	if (locals.user && photos.length > 0) {
		const photoIds = photos.map((p) => p.id);
		const purchased = await db
			.select({ photoId: schema.orderItems.photoId })
			.from(schema.orders)
			.innerJoin(schema.orderItems, eq(schema.orderItems.orderId, schema.orders.id))
			.where(
				and(
					eq(schema.orders.userId, locals.user.id),
					eq(schema.orders.status, 'paid'),
					inArray(schema.orderItems.photoId, photoIds)
				)
			);
		const purchasedIds = new Set(purchased.map((p) => p.photoId));
		for (const photo of photos) {
			photo.isPurchased = purchasedIds.has(photo.id);
		}
	}

	return json({ photos, hasMore });
};
