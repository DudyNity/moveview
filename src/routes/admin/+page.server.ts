import type { PageServerLoad } from './$types.js';
import { db, schema } from '$lib/server/db/index.js';
import { eq, count, sum, desc } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	try {
		const [userStats] = await db
			.select({ total: count(schema.users.id) })
			.from(schema.users);

		const [photographerStats] = await db
			.select({ total: count(schema.users.id) })
			.from(schema.users)
			.where(eq(schema.users.role, 'photographer'));

		const [eventStats] = await db
			.select({ total: count(schema.events.id) })
			.from(schema.events);

		const [activeEventStats] = await db
			.select({ total: count(schema.events.id) })
			.from(schema.events)
			.where(eq(schema.events.status, 'active'));

		const [photoStats] = await db
			.select({ total: count(schema.photos.id) })
			.from(schema.photos);

		const [orderStats] = await db
			.select({
				total: count(schema.orders.id),
				revenue: sum(schema.orders.totalAmount)
			})
			.from(schema.orders)
			.where(eq(schema.orders.status, 'paid'));

		// Recent orders
		const recentOrders = await db
			.select({
				id: schema.orders.id,
				status: schema.orders.status,
				totalAmount: schema.orders.totalAmount,
				createdAt: schema.orders.createdAt,
				userId: schema.orders.userId,
				userName: schema.users.name,
				userEmail: schema.users.email
			})
			.from(schema.orders)
			.innerJoin(schema.users, eq(schema.orders.userId, schema.users.id))
			.orderBy(desc(schema.orders.createdAt))
			.limit(20);

		// Recent events
		const recentEvents = await db
			.select({
				id: schema.events.id,
				slug: schema.events.slug,
				name: schema.events.name,
				sport: schema.events.sport,
				city: schema.events.city,
				status: schema.events.status,
				eventDate: schema.events.eventDate,
				createdAt: schema.events.createdAt,
				photographerName: schema.users.name
			})
			.from(schema.events)
			.leftJoin(schema.users, eq(schema.events.photographerId, schema.users.id))
			.orderBy(desc(schema.events.createdAt))
			.limit(10);

		return {
			stats: {
				totalUsers: Number(userStats?.total ?? 0),
				totalPhotographers: Number(photographerStats?.total ?? 0),
				totalEvents: Number(eventStats?.total ?? 0),
				activeEvents: Number(activeEventStats?.total ?? 0),
				totalPhotos: Number(photoStats?.total ?? 0),
				totalOrders: Number(orderStats?.total ?? 0),
				totalRevenueCents: Number(orderStats?.revenue ?? 0)
			},
			recentOrders,
			recentEvents
		};
	} catch {
		return {
			stats: {
				totalUsers: 0,
				totalPhotographers: 0,
				totalEvents: 0,
				activeEvents: 0,
				totalPhotos: 0,
				totalOrders: 0,
				totalRevenueCents: 0
			},
			recentOrders: [],
			recentEvents: []
		};
	}
};
