import type { PageServerLoad } from './$types.js';
import { db, schema } from '$lib/server/db/index.js';
import { eq, and, desc } from 'drizzle-orm';
import { getPublicUrl } from '$lib/server/storage/r2.js';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.user!.id;

	try {
		// Get all paid orders with photos
		const orders = await db
			.select({
				orderId: schema.orders.id,
				orderStatus: schema.orders.status,
				totalAmount: schema.orders.totalAmount,
				createdAt: schema.orders.createdAt,
				photoId: schema.photos.id,
				watermarkKey: schema.photos.watermarkKey,
				eventName: schema.events.name,
				eventSlug: schema.events.slug,
				priceAtPurchase: schema.orderItems.priceAtPurchase
			})
			.from(schema.orders)
			.innerJoin(schema.orderItems, eq(schema.orderItems.orderId, schema.orders.id))
			.innerJoin(schema.photos, eq(schema.photos.id, schema.orderItems.photoId))
			.innerJoin(schema.events, eq(schema.events.id, schema.photos.eventId))
			.where(and(eq(schema.orders.userId, userId), eq(schema.orders.status, 'paid')))
			.orderBy(desc(schema.orders.createdAt));

		// Group by order
		const ordersMap = new Map<
			string,
			{
				id: string;
				totalAmount: number;
				createdAt: Date;
				items: Array<{
					photoId: string;
					watermarkUrl: string;
					eventName: string;
					eventSlug: string;
					priceAtPurchase: number;
				}>;
			}
		>();

		for (const row of orders) {
			if (!ordersMap.has(row.orderId)) {
				ordersMap.set(row.orderId, {
					id: row.orderId,
					totalAmount: row.totalAmount,
					createdAt: row.createdAt,
					items: []
				});
			}
			ordersMap.get(row.orderId)!.items.push({
				photoId: row.photoId,
				watermarkUrl: getPublicUrl(row.watermarkKey),
				eventName: row.eventName,
				eventSlug: row.eventSlug,
				priceAtPurchase: row.priceAtPurchase
			});
		}

		return { orders: Array.from(ordersMap.values()) };
	} catch {
		return { orders: [] };
	}
};
