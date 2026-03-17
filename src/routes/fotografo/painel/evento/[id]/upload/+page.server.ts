import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types.js';
import { db, schema } from '$lib/server/db/index.js';
import { eq, and, count, desc } from 'drizzle-orm';
import { getPublicUrl } from '$lib/server/storage/r2.js';

export const load: PageServerLoad = async ({ params, locals }) => {
	const user = locals.user!;
	const { id } = params;

	const [event] = await db
		.select()
		.from(schema.events)
		.where(and(eq(schema.events.id, id), eq(schema.events.photographerId, user.id)))
		.limit(1);

	if (!event) {
		error(404, 'Evento não encontrado');
	}

	const photos = await db
		.select({
			id: schema.photos.id,
			watermarkKey: schema.photos.watermarkKey,
			width: schema.photos.width,
			height: schema.photos.height,
			price: schema.photos.price,
			bibNumbers: schema.photos.bibNumbers,
			createdAt: schema.photos.createdAt
		})
		.from(schema.photos)
		.where(eq(schema.photos.eventId, id))
		.orderBy(desc(schema.photos.createdAt))
		.limit(100);

	const photosWithUrls = photos.map((p) => ({
		...p,
		watermarkUrl: getPublicUrl(p.watermarkKey)
	}));

	return {
		event: {
			id: event.id,
			slug: event.slug,
			name: event.name,
			sport: event.sport,
			status: event.status,
			photoCount: photos.length,
			photoPrice: event.photoPrice
		},
		photos: photosWithUrls
	};
};
