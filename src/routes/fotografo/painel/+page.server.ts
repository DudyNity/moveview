import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types.js';
import { db, schema } from '$lib/server/db/index.js';
import { eq, count, sum, desc, and, inArray } from 'drizzle-orm';
import { deleteFile } from '$lib/server/storage/r2.js';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user!;

	try {
		// Load photographer's events
		const events = await db
			.select({
				id: schema.events.id,
				slug: schema.events.slug,
				name: schema.events.name,
				sport: schema.events.sport,
				city: schema.events.city,
				eventDate: schema.events.eventDate,
				status: schema.events.status,
				coverUrl: schema.events.coverUrl,
				packagePrice: schema.events.packagePrice
			})
			.from(schema.events)
			.where(eq(schema.events.photographerId, user.id))
			.orderBy(desc(schema.events.createdAt));

		// Count photos per event
		const photoCounts = await db
			.select({
				eventId: schema.photos.eventId,
				count: count(schema.photos.id)
			})
			.from(schema.photos)
			.groupBy(schema.photos.eventId);

		const photoCountMap: Record<string, number> = {};
		for (const row of photoCounts) {
			photoCountMap[row.eventId] = Number(row.count);
		}

		// Sales stats: total revenue from photos in photographer's events
		const eventsIds = events.map((e) => e.id);
		let totalRevenueCents = 0;
		let totalSales = 0;

		if (eventsIds.length > 0) {
			const photographerSales = await db
				.select({
					total: sum(schema.orderItems.priceAtPurchase),
					qty: count(schema.orderItems.id)
				})
				.from(schema.orderItems)
				.innerJoin(schema.photos, eq(schema.orderItems.photoId, schema.photos.id))
				.innerJoin(schema.orders, eq(schema.orderItems.orderId, schema.orders.id))
				.innerJoin(schema.events, eq(schema.photos.eventId, schema.events.id))
				.where(
					and(
						eq(schema.events.photographerId, user.id),
						eq(schema.orders.status, 'paid')
					)
				);

			totalRevenueCents = Number(photographerSales[0]?.total ?? 0);
			totalSales = Number(photographerSales[0]?.qty ?? 0);
		}

		const eventsWithCounts = events.map((e) => ({
			...e,
			photoCount: photoCountMap[e.id] ?? 0
		}));

		return {
			events: eventsWithCounts,
			stats: {
				totalEvents: events.length,
				activeEvents: events.filter((e) => e.status === 'active').length,
				totalRevenueCents,
				totalSales
			}
		};
	} catch {
		return {
			events: [],
			stats: { totalEvents: 0, activeEvents: 0, totalRevenueCents: 0, totalSales: 0 }
		};
	}
};

export const actions: Actions = {
	deleteEvent: async ({ request, locals }) => {
		const user = locals.user!;
		const formData = await request.formData();
		const eventId = formData.get('eventId')?.toString();

		if (!eventId) return fail(400, { error: 'ID do evento não informado' });

		// Verify ownership
		const [event] = await db
			.select({ id: schema.events.id })
			.from(schema.events)
			.where(and(eq(schema.events.id, eventId), eq(schema.events.photographerId, user.id)))
			.limit(1);

		if (!event) return fail(404, { error: 'Evento não encontrado' });

		// Check for paid orders referencing photos of this event
		const photos = await db
			.select({ id: schema.photos.id, originalKey: schema.photos.originalKey, watermarkKey: schema.photos.watermarkKey })
			.from(schema.photos)
			.where(eq(schema.photos.eventId, eventId));

		if (photos.length > 0) {
			const photoIds = photos.map((p) => p.id);

			// Block deletion if any paid orders reference these photos
			const paidOrders = await db
				.select({ id: schema.orderItems.id })
				.from(schema.orderItems)
				.innerJoin(schema.orders, eq(schema.orderItems.orderId, schema.orders.id))
				.where(and(inArray(schema.orderItems.photoId, photoIds), eq(schema.orders.status, 'paid')))
				.limit(1);

			if (paidOrders.length > 0) {
				return fail(409, { error: 'Não é possível apagar: há compras confirmadas para fotos deste evento.' });
			}

			// Delete downloads referencing these photos (no cascade in schema)
			await db.delete(schema.downloads).where(inArray(schema.downloads.photoId, photoIds));

			// Delete non-paid order items referencing these photos (no cascade in schema)
			await db.delete(schema.orderItems).where(inArray(schema.orderItems.photoId, photoIds));

			// Delete files from storage
			await Promise.allSettled(
				photos.flatMap((p) => [deleteFile(p.originalKey), deleteFile(p.watermarkKey)])
			);
		}

		// Delete event (photos cascade via DB via onDelete: 'cascade')
		await db.delete(schema.events).where(eq(schema.events.id, eventId));

		return { success: true };
	},

	setStatus: async ({ request, locals }) => {
		const user = locals.user!;
		const formData = await request.formData();
		const eventId = formData.get('eventId')?.toString();
		const status = formData.get('status')?.toString() as 'draft' | 'active' | 'archived' | undefined;

		if (!eventId || !status || !['draft', 'active', 'archived'].includes(status)) {
			return fail(400, { error: 'Dados inválidos' });
		}

		const [event] = await db
			.select({ id: schema.events.id })
			.from(schema.events)
			.where(and(eq(schema.events.id, eventId), eq(schema.events.photographerId, user.id)))
			.limit(1);

		if (!event) return fail(404, { error: 'Evento não encontrado' });

		await db.update(schema.events).set({ status }).where(eq(schema.events.id, eventId));

		return { success: true };
	}
};
