import type { PageServerLoad } from './$types.js';
import { db, schema } from '$lib/server/db/index.js';
import { eq, and, count, sum, desc } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user!;

	try {
		// Stats
		const [stats] = await db
			.select({
				totalOrders: count(schema.orders.id),
				totalSpent: sum(schema.orders.totalAmount)
			})
			.from(schema.orders)
			.where(and(eq(schema.orders.userId, user.id), eq(schema.orders.status, 'paid')));

		// Recent orders
		const recentOrders = await db
			.select({
				id: schema.orders.id,
				status: schema.orders.status,
				totalAmount: schema.orders.totalAmount,
				createdAt: schema.orders.createdAt
			})
			.from(schema.orders)
			.where(eq(schema.orders.userId, user.id))
			.orderBy(desc(schema.orders.createdAt))
			.limit(5);

		return {
			profile: {
				id: user.id,
				name: user.name,
				email: user.email,
				role: user.role,
				avatarUrl: user.avatarUrl
			},
			stats: {
				totalOrders: Number(stats?.totalOrders ?? 0),
				totalSpent: Number(stats?.totalSpent ?? 0)
			},
			recentOrders
		};
	} catch {
		return {
			profile: {
				id: user.id,
				name: user.name,
				email: user.email,
				role: user.role,
				avatarUrl: user.avatarUrl
			},
			stats: { totalOrders: 0, totalSpent: 0 },
			recentOrders: []
		};
	}
};
