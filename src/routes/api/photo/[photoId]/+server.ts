import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db, schema } from '$lib/server/db/index.js';
import { eq } from 'drizzle-orm';
import { getFileBuffer } from '$lib/server/storage/r2.js';
import { isRateLimited } from '$lib/server/rate-limit.js';

const PHOTO_RATE_MAX = 40;          // 40 fotos/min por IP
const PHOTO_RATE_WINDOW_MS = 60_000;

export const GET: RequestHandler = async ({ params, getClientAddress, locals }) => {
	const ip = getClientAddress();
	// Rate limit por usuário autenticado OU por IP
	const rateLimitKey = locals.user ? `photo:user:${locals.user.id}` : `photo:ip:${ip}`;
	if (isRateLimited(rateLimitKey, PHOTO_RATE_MAX, PHOTO_RATE_WINDOW_MS)) {
		throw error(429, 'Muitas requisições. Aguarde um momento.');
	}

	const [photo] = await db
		.select({ watermarkKey: schema.photos.watermarkKey })
		.from(schema.photos)
		.where(eq(schema.photos.id, params.photoId))
		.limit(1);

	if (!photo) throw error(404, 'Foto não encontrada');

	const buffer = await getFileBuffer(photo.watermarkKey);
	if (!buffer) throw error(404, 'Arquivo não encontrado');

	return new Response(buffer, {
		headers: {
			'Content-Type': 'image/jpeg',
			// Cacheable pelo browser do usuário, mas não por proxies compartilhados
			'Cache-Control': 'private, max-age=3600',
			// Força exibição inline — não como download
			'Content-Disposition': 'inline',
			// Não indexar a imagem diretamente
			'X-Robots-Tag': 'noindex',
			// Impede embedding em outros sites
			'X-Frame-Options': 'SAMEORIGIN',
		}
	});
};
