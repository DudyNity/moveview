import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getFileBuffer } from '$lib/server/storage/r2.js';

export const GET: RequestHandler = async ({ params }) => {
	const key = params.path;

	// Path traversal protection
	if (!key || key.includes('..') || key.startsWith('/')) {
		throw error(400, 'Caminho inválido');
	}

	const allowedExts = ['jpg', 'jpeg', 'png', 'webp'];
	const ext = key.split('.').pop()?.toLowerCase() ?? '';
	if (!allowedExts.includes(ext)) {
		throw error(400, 'Tipo de arquivo inválido');
	}

	const buffer = await getFileBuffer(key);
	if (!buffer) throw error(404, 'Arquivo não encontrado');

	const contentType =
		ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

	return new Response(new Uint8Array(buffer), {
		headers: {
			'Content-Type': contentType,
			'Cache-Control': 'public, max-age=3600'
		}
	});
};
