import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db, schema } from '$lib/server/db/index.js';
import { eq, and } from 'drizzle-orm';
import { isRateLimited } from '$lib/server/rate-limit.js';
import { RATE_LIMIT_CREATE_SPORT_MAX, RATE_LIMIT_CREATE_SPORT_WINDOW_MS } from '$lib/constants.js';

function requirePhotographer(locals: App.Locals) {
	if (!locals.user) throw error(401, 'Não autenticado');
	if (locals.user.role !== 'photographer' && locals.user.role !== 'admin') {
		throw error(403, 'Acesso negado');
	}
	return locals.user;
}

/** GET /api/photographer/sports — lista os esportes do fotógrafo */
export const GET: RequestHandler = async ({ locals }) => {
	const user = requirePhotographer(locals);

	const sports = await db
		.select({ id: schema.photographerSports.id, name: schema.photographerSports.name })
		.from(schema.photographerSports)
		.where(eq(schema.photographerSports.photographerId, user.id))
		.orderBy(schema.photographerSports.name);

	return json(sports);
};

/** POST /api/photographer/sports — cria novo esporte */
export const POST: RequestHandler = async ({ request, locals }) => {
	const user = requirePhotographer(locals);

	if (isRateLimited(`create_sport:${user.id}`, RATE_LIMIT_CREATE_SPORT_MAX, RATE_LIMIT_CREATE_SPORT_WINDOW_MS)) {
		throw error(429, 'Muitos esportes criados em pouco tempo. Aguarde alguns minutos.');
	}

	const { name } = await request.json().catch(() => ({}));
	const trimmed = name?.toString().trim();

	if (!trimmed || trimmed.length < 2 || trimmed.length > 60) {
		throw error(400, 'Nome inválido (2–60 caracteres)');
	}

	// Evita duplicatas (case-insensitive) para o mesmo fotógrafo
	const existing = await db
		.select({ id: schema.photographerSports.id })
		.from(schema.photographerSports)
		.where(
			and(
				eq(schema.photographerSports.photographerId, user.id),
				eq(schema.photographerSports.name, trimmed)
			)
		)
		.limit(1);

	if (existing.length > 0) {
		throw error(409, 'Esporte já cadastrado');
	}

	const [sport] = await db
		.insert(schema.photographerSports)
		.values({ photographerId: user.id, name: trimmed })
		.returning({ id: schema.photographerSports.id, name: schema.photographerSports.name });

	return json(sport, { status: 201 });
};
