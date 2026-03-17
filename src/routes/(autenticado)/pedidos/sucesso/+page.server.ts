import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types.js';
import { db, schema } from '$lib/server/db/index.js';
import { eq, and } from 'drizzle-orm';
import { getPublicUrl } from '$lib/server/storage/r2.js';

export const load: PageServerLoad = async ({ url, locals }) => {
	const orderId = url.searchParams.get('order');
	if (!orderId) redirect(302, '/minhas-fotos');

	try {
		const [order] = await db
			.select({
				id: schema.orders.id,
				status: schema.orders.status,
				totalAmount: schema.orders.totalAmount,
				createdAt: schema.orders.createdAt
			})
			.from(schema.orders)
			.where(and(eq(schema.orders.id, orderId), eq(schema.orders.userId, locals.user!.id)))
			.limit(1);

		if (!order) redirect(302, '/minhas-fotos');

		const items = await db
			.select({
				photoId: schema.photos.id,
				watermarkKey: schema.photos.watermarkKey,
				eventName: schema.events.name,
				eventSlug: schema.events.slug
			})
			.from(schema.orderItems)
			.innerJoin(schema.photos, eq(schema.photos.id, schema.orderItems.photoId))
			.innerJoin(schema.events, eq(schema.events.id, schema.photos.eventId))
			.where(eq(schema.orderItems.orderId, orderId));

		return {
			order: {
				id: order.id,
				status: order.status,
				totalAmount: order.totalAmount,
				createdAt: order.createdAt,
				items: items.map((i) => ({
					photoId: i.photoId,
					watermarkUrl: getPublicUrl(i.watermarkKey),
					eventName: i.eventName,
					eventSlug: i.eventSlug
				}))
			}
		};
	} catch {
		redirect(302, '/minhas-fotos');
	}
};
