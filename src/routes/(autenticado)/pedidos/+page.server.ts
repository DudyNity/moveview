import type { PageServerLoad } from './$types.js';
import { db, schema } from '$lib/server/db/index.js';
import { eq, desc, inArray } from 'drizzle-orm';
import { getPublicUrl } from '$lib/server/storage/r2.js';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user!;

	const orders = await db
		.select({
			id: schema.orders.id,
			status: schema.orders.status,
			totalAmount: schema.orders.totalAmount,
			createdAt: schema.orders.createdAt
		})
		.from(schema.orders)
		.where(eq(schema.orders.userId, user.id))
		.orderBy(desc(schema.orders.createdAt));

	if (orders.length === 0) return { orders: [] };

	const orderIds = orders.map((o) => o.id);

	const items = await db
		.select({
			orderId: schema.orderItems.orderId,
			photoId: schema.orderItems.photoId,
			priceAtPurchase: schema.orderItems.priceAtPurchase,
			watermarkKey: schema.photos.watermarkKey,
			eventName: schema.events.name,
			eventSlug: schema.events.slug
		})
		.from(schema.orderItems)
		.innerJoin(schema.photos, eq(schema.orderItems.photoId, schema.photos.id))
		.innerJoin(schema.events, eq(schema.photos.eventId, schema.events.id))
		.where(inArray(schema.orderItems.orderId, orderIds));

	const itemsByOrder = new Map<string, typeof items>();
	for (const item of items) {
		const arr = itemsByOrder.get(item.orderId) ?? [];
		arr.push(item);
		itemsByOrder.set(item.orderId, arr);
	}

	return {
		orders: orders.map((o) => ({
			...o,
			items: (itemsByOrder.get(o.id) ?? []).map((i) => ({
				...i,
				watermarkUrl: getPublicUrl(i.watermarkKey)
			}))
		}))
	};
};
