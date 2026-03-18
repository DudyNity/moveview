import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db, schema } from '$lib/server/db/index.js';
import { and, eq } from 'drizzle-orm';
import { getSignedUploadUrl } from '$lib/server/storage/r2.js';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) throw error(401, 'Não autenticado');
	const user = locals.user;
	if (user.role !== 'photographer' && user.role !== 'admin') {
		throw error(403, 'Acesso negado');
	}

	const { eventId, filename, contentType } = await request.json().catch(() => ({}));
	if (!eventId || !filename) throw error(400, 'Dados inválidos');

	const [event] = await db
		.select({ id: schema.events.id })
		.from(schema.events)
		.where(and(eq(schema.events.id, eventId), eq(schema.events.photographerId, user.id)))
		.limit(1);

	if (!event) throw error(404, 'Evento não encontrado');

	const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
	const key = `originals/${eventId}/${Date.now()}_${safeFilename}`;
	const uploadUrl = await getSignedUploadUrl(key, contentType || 'image/jpeg');

	if (!uploadUrl) {
		// R2 não configurado — devolve null e o cliente faz upload normal
		return json({ uploadUrl: null, key });
	}

	return json({ uploadUrl, key });
};
