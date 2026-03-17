import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db, schema } from '$lib/server/db/index.js';
import { eq, and } from 'drizzle-orm';

function requirePhotographer(locals: App.Locals) {
	if (!locals.user) throw error(401, 'Não autenticado');
	if (locals.user.role !== 'photographer' && locals.user.role !== 'admin') {
		throw error(403, 'Acesso negado');
	}
	return locals.user;
}

async function getSport(id: string, userId: string) {
	const [sport] = await db
		.select({ id: schema.photographerSports.id, name: schema.photographerSports.name })
		.from(schema.photographerSports)
		.where(
			and(
				eq(schema.photographerSports.id, id),
				eq(schema.photographerSports.photographerId, userId)
			)
		)
		.limit(1);
	return sport ?? null;
}

/** PATCH /api/photographer/sports/[id] — renomeia esporte */
export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	const user = requirePhotographer(locals);

	const sport = await getSport(params.id, user.id);
	if (!sport) throw error(404, 'Esporte não encontrado');

	const { name } = await request.json().catch(() => ({}));
	const trimmed = name?.toString().trim();

	if (!trimmed || trimmed.length < 2 || trimmed.length > 60) {
		throw error(400, 'Nome inválido (2–60 caracteres)');
	}

	const [updated] = await db
		.update(schema.photographerSports)
		.set({ name: trimmed })
		.where(eq(schema.photographerSports.id, params.id))
		.returning({ id: schema.photographerSports.id, name: schema.photographerSports.name });

	return json(updated);
};

/** DELETE /api/photographer/sports/[id] — remove esporte */
export const DELETE: RequestHandler = async ({ params, locals }) => {
	const user = requirePhotographer(locals);

	const sport = await getSport(params.id, user.id);
	if (!sport) throw error(404, 'Esporte não encontrado');

	await db
		.delete(schema.photographerSports)
		.where(eq(schema.photographerSports.id, params.id));

	return new Response(null, { status: 204 });
};
