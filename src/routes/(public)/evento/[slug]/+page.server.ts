import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types.js';
import { db, schema } from '$lib/server/db/index.js';
import { eq, and, inArray, count } from 'drizzle-orm';
import { getPublicUrl } from '$lib/server/storage/r2.js';
import { PHOTOS_INITIAL_LIMIT } from '$lib/constants.js';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { slug } = params;

	try {
		const [event] = await db
			.select()
			.from(schema.events)
			.where(eq(schema.events.slug, slug))
			.limit(1);

		if (!event) {
			error(404, 'Evento não encontrado');
		}

		const [[{ total: totalPhotos }], rawPhotos] = await Promise.all([
			db.select({ total: count() }).from(schema.photos).where(eq(schema.photos.eventId, event.id)),
			db.select().from(schema.photos).where(eq(schema.photos.eventId, event.id))
				.orderBy(schema.photos.createdAt).limit(PHOTOS_INITIAL_LIMIT)
		]);

		const photos = rawPhotos.map((p) => ({
			id: p.id,
			eventId: p.eventId,
			// URL roteada pelo nosso servidor — nunca expõe a URL direta do R2
			watermarkUrl: `/api/photo/${p.id}`,
			width: p.width,
			height: p.height,
			bibNumbers: p.bibNumbers,
			price: p.price
		}));

		// Check which photos the user has purchased
		let purchasedPhotoIds: string[] = [];
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
			purchasedPhotoIds = purchased.map((p) => p.photoId);
		}

		const photosWithPurchased = photos.map((p) => ({
			...p,
			isPurchased: purchasedPhotoIds.includes(p.id)
		}));

		const todayStart = new Date();
		todayStart.setHours(0, 0, 0, 0);

		return {
			event: {
				id: event.id,
				slug: event.slug,
				name: event.name,
				description: event.description,
				sport: event.sport,
				location: event.location,
				city: event.city,
				eventDate: event.eventDate,
				coverUrl: event.coverUrl ? getPublicUrl(event.coverUrl) : null,
				status: event.status,
				packagePrice: event.packagePrice,
				photoPrice: event.photoPrice,
				isFuture: new Date(event.eventDate) >= todayStart
			},
			photos: photosWithPurchased,
			totalPhotos,
			hasMore: totalPhotos > PHOTOS_INITIAL_LIMIT
		};
	} catch (err: unknown) {
		if (err instanceof Error && 'status' in err) throw err;
		error(500, 'Erro ao carregar evento');
	}
};
