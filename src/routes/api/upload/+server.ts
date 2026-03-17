import type { RequestHandler } from './$types.js';
import { json, error } from '@sveltejs/kit';
import { db, schema } from '$lib/server/db/index.js';
import { eq, and } from 'drizzle-orm';
import { uploadFile, getPublicUrl } from '$lib/server/storage/r2.js';
import { processUploadedPhoto } from '$lib/server/watermark/apply.js';
import { isRateLimited } from '$lib/server/rate-limit.js';
import {
	RATE_LIMIT_UPLOAD_MAX,
	RATE_LIMIT_UPLOAD_WINDOW_MS,
	MAX_UPLOAD_SIZE_BYTES,
	DEFAULT_PHOTO_PRICE
} from '$lib/constants.js';

export const POST: RequestHandler = async ({ request, locals, getClientAddress }) => {
	if (!locals.user) throw error(401, 'Não autenticado');

	const user = locals.user;
	if (user.role !== 'photographer' && user.role !== 'admin') {
		throw error(403, 'Apenas fotógrafos podem fazer upload de fotos');
	}

	// Rate limiting por IP
	const ip = getClientAddress();
	if (isRateLimited(`upload:${ip}`, RATE_LIMIT_UPLOAD_MAX, RATE_LIMIT_UPLOAD_WINDOW_MS)) {
		throw error(429, 'Muitas tentativas de upload. Aguarde um momento.');
	}

	const formData = await request.formData().catch(() => null);
	if (!formData) throw error(400, 'Dados de formulário inválidos');

	const file = formData.get('file');
	const eventId = formData.get('eventId')?.toString();
	const priceStr = formData.get('price')?.toString() ?? String(DEFAULT_PHOTO_PRICE);

	if (!file || !(file instanceof File)) throw error(400, 'Arquivo não enviado');
	if (!eventId) throw error(400, 'ID do evento não informado');

	// Valida evento do fotógrafo
	const [event] = await db
		.select({ id: schema.events.id, name: schema.events.name })
		.from(schema.events)
		.where(and(eq(schema.events.id, eventId), eq(schema.events.photographerId, user.id)))
		.limit(1);

	if (!event) throw error(404, 'Evento não encontrado ou sem permissão');

	// Valida tipo de arquivo
	const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/tiff'];
	if (!allowedTypes.includes(file.type)) {
		throw error(400, 'Tipo de arquivo inválido. Use JPEG, PNG, WEBP ou TIFF.');
	}

	if (file.size > MAX_UPLOAD_SIZE_BYTES) {
		throw error(400, `Arquivo muito grande. Máximo ${MAX_UPLOAD_SIZE_BYTES / 1024 / 1024}MB por foto.`);
	}

	const buffer = Buffer.from(await file.arrayBuffer());
	const price = Math.max(0, parseInt(priceStr, 10) || DEFAULT_PHOTO_PRICE);

	let processed: Awaited<ReturnType<typeof processUploadedPhoto>>;
	try {
		processed = await processUploadedPhoto(buffer);
	} catch (e) {
		console.error('Error processing image:', e);
		throw error(500, 'Erro ao processar imagem');
	}

	const { original, watermarked, width, height } = processed;

	const timestamp = Date.now();
	const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
	const originalKey = `originals/${eventId}/${timestamp}_${safeFilename}`;
	const watermarkKey = `watermarks/${eventId}/${timestamp}_${safeFilename}`;

	try {
		await Promise.all([
			uploadFile(originalKey, original, 'image/jpeg'),
			uploadFile(watermarkKey, watermarked, 'image/jpeg')
		]);
	} catch (e) {
		console.error('Error uploading to storage:', e);
		throw error(500, 'Erro ao salvar arquivo no storage');
	}

	const [photo] = await db
		.insert(schema.photos)
		.values({
			eventId,
			originalKey,
			watermarkKey,
			width,
			height,
			price,
			bibNumbers: null
		})
		.returning({ id: schema.photos.id, watermarkKey: schema.photos.watermarkKey });

	return json({
		id: photo.id,
		watermarkUrl: getPublicUrl(photo.watermarkKey),
		width,
		height
	});
};
