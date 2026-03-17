import type { PageServerLoad } from './$types.js';
import { db, schema } from '$lib/server/db/index.js';
import { eq, sql, desc, and, ilike, or, inArray } from 'drizzle-orm';
import { getPublicUrl } from '$lib/server/storage/r2.js';

export const load: PageServerLoad = async ({ url }) => {
	const query = url.searchParams.get('q') || '';
	const sport = url.searchParams.get('sport') || '';

	try {
		// Monta filtros no banco — evita carregar todos os eventos em memória
		const filters = [eq(schema.events.status, 'active')];

		if (query) {
			filters.push(
				or(
					ilike(schema.events.name, `%${query}%`),
					ilike(schema.events.city, `%${query}%`)
				)!
			);
		}

		if (sport) {
			filters.push(ilike(schema.events.sport, sport));
		}

		const [events, sportsRows] = await Promise.all([
			db
				.select({
					id: schema.events.id,
					slug: schema.events.slug,
					name: schema.events.name,
					description: schema.events.description,
					sport: schema.events.sport,
					location: schema.events.location,
					city: schema.events.city,
					eventDate: schema.events.eventDate,
					coverUrl: schema.events.coverUrl,
					status: schema.events.status,
					packagePrice: schema.events.packagePrice,
					photoCount: sql<number>`count(${schema.photos.id})::int`
				})
				.from(schema.events)
				.leftJoin(schema.photos, eq(schema.photos.eventId, schema.events.id))
				.where(and(...filters))
				.groupBy(schema.events.id)
				.orderBy(desc(schema.events.eventDate)),

			db
				.selectDistinct({ sport: schema.events.sport })
				.from(schema.events)
				.where(eq(schema.events.status, 'active'))
		]);

		const sports = sportsRows.map((r) => r.sport);

		// Fetch up to 4 preview watermark URLs per event (for mosaic in card)
		// Use getPublicUrl directly — avoids per-image proxy requests on the listing page
		const eventIds = events.map((e) => e.id);
		const previewMap: Record<string, string[]> = {};

		if (eventIds.length > 0) {
			const previewRows = await db
				.select({ eventId: schema.photos.eventId, watermarkKey: schema.photos.watermarkKey })
				.from(schema.photos)
				.where(inArray(schema.photos.eventId, eventIds))
				.orderBy(schema.photos.createdAt)
				.limit(eventIds.length * 4);

			for (const row of previewRows) {
				if (!previewMap[row.eventId]) previewMap[row.eventId] = [];
				if (previewMap[row.eventId].length < 4) {
					previewMap[row.eventId].push(getPublicUrl(row.watermarkKey));
				}
			}
		}

		const todayStart = new Date();
		todayStart.setHours(0, 0, 0, 0);

		const eventsWithFuture = events.map((e) => ({
			...e,
			isFuture: new Date(e.eventDate) >= todayStart,
			previewPhotos: previewMap[e.id] ?? []
		}));

		return { events: eventsWithFuture, sports, query, sport };
	} catch {
		return { events: [], sports: [], query, sport };
	}
};
