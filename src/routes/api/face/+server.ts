import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { searchFacesByBase64, isFaceServiceConfigured } from '$lib/server/face.js';
import { db, schema } from '$lib/server/db/index.js';
import { eq, inArray } from 'drizzle-orm';
import { getPublicUrl } from '$lib/server/storage/r2.js';

export const POST: RequestHandler = async ({ request }) => {
	if (!isFaceServiceConfigured()) {
		throw error(503, 'Serviço de reconhecimento facial não configurado');
	}

	const body = await request.json().catch(() => null);
	if (!body?.eventId || !body?.selfieBase64) {
		throw error(400, 'eventId e selfieBase64 são obrigatórios');
	}

	const matches = await searchFacesByBase64(body.eventId, body.selfieBase64);

	if (matches.length === 0) {
		return json({ photos: [] });
	}

	const photoIds = matches.map((m) => m.photo_id);
	const photos = await db
		.select({
			id: schema.photos.id,
			watermarkKey: schema.photos.watermarkKey,
			width: schema.photos.width,
			height: schema.photos.height,
			price: schema.photos.price,
			bibNumbers: schema.photos.bibNumbers,
			eventId: schema.photos.eventId
		})
		.from(schema.photos)
		.where(inArray(schema.photos.id, photoIds));

	const similarityMap = Object.fromEntries(matches.map((m) => [m.photo_id, m.similarity]));

	const result = photos
		.map((p) => ({
			id: p.id,
			watermarkUrl: `/api/photo/${p.id}`,
			width: p.width,
			height: p.height,
			price: p.price,
			bibNumbers: p.bibNumbers,
			eventId: p.eventId,
			similarity: similarityMap[p.id] ?? 0
		}))
		.sort((a, b) => b.similarity - a.similarity);

	return json({ photos: result });
};
