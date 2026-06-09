import { env } from '$env/dynamic/private';

const FACE_SERVICE_URL = env.FACE_SERVICE_URL?.trim();
const FACE_SERVICE_KEY = env.FACE_SERVICE_KEY?.trim() ?? '';

export function isFaceServiceConfigured(): boolean {
	return !!FACE_SERVICE_URL;
}

export async function indexPhotoFaces(photoId: string, eventId: string, imageUrl: string): Promise<void> {
	if (!FACE_SERVICE_URL) return;
	try {
		await fetch(`${FACE_SERVICE_URL}/index`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', 'x-api-key': FACE_SERVICE_KEY },
			body: JSON.stringify({ photo_id: photoId, event_id: eventId, image_url: imageUrl })
		});
	} catch {
		// não bloqueia o upload se o serviço estiver fora
	}
}

export async function searchFacesByBase64(
	eventId: string,
	selfieBase64: string,
	threshold = 0.4
): Promise<Array<{ photo_id: string; similarity: number }>> {
	if (!FACE_SERVICE_URL) return [];
	const res = await fetch(`${FACE_SERVICE_URL}/search`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', 'x-api-key': FACE_SERVICE_KEY },
		body: JSON.stringify({ event_id: eventId, selfie_base64: selfieBase64, threshold })
	});

	if (!res.ok) {
		const body = await res.json().catch(() => ({ detail: 'Erro desconhecido' }));
		const msg = body.detail ?? 'Erro no serviço de reconhecimento facial';
		throw new Error(msg);
	}

	const data = await res.json();
	return data.matches ?? [];
}

export async function deleteEventFaces(eventId: string): Promise<void> {
	if (!FACE_SERVICE_URL) return;
	try {
		await fetch(`${FACE_SERVICE_URL}/delete-event`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', 'x-api-key': FACE_SERVICE_KEY },
			body: JSON.stringify({ event_id: eventId })
		});
	} catch {}
}
