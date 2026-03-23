import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types.js';
import { db, schema } from '$lib/server/db/index.js';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import sharp from 'sharp';
import { uploadFile, getPublicUrl } from '$lib/server/storage/r2.js';
import { DEFAULT_PHOTO_PRICE, RATE_LIMIT_CREATE_EVENT_MAX, RATE_LIMIT_CREATE_EVENT_WINDOW_MS } from '$lib/constants.js';
import { isRateLimited } from '$lib/server/rate-limit.js';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user!;
	const sports = await db
		.select({ id: schema.photographerSports.id, name: schema.photographerSports.name })
		.from(schema.photographerSports)
		.where(eq(schema.photographerSports.photographerId, user.id))
		.orderBy(schema.photographerSports.name);
	return { sports };
};

const createEventSchema = z.object({
	name: z.string().min(3, 'Nome deve ter ao menos 3 caracteres').max(120),
	description: z.string().max(1000).optional(),
	sport: z.string().min(2, 'Informe o tipo de esporte').max(60),
	location: z.string().min(2, 'Informe o local').max(200),
	city: z.string().min(2, 'Informe a cidade').max(80),
	eventDate: z.string().min(1, 'Informe a data do evento').refine(
		(v) => !isNaN(new Date(v).getTime()),
		'Data do evento inválida'
	),
	packagePrice: z.string().optional(),
	photoPrice: z.string().optional(),
	status: z.enum(['draft', 'active'])
});

function slugify(text: string): string {
	return text
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/(^-|-$)/g, '');
}

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const user = locals.user!;

		if (isRateLimited(`create_event:${user.id}`, RATE_LIMIT_CREATE_EVENT_MAX, RATE_LIMIT_CREATE_EVENT_WINDOW_MS)) {
			return fail(429, { error: 'Muitos eventos criados em pouco tempo. Aguarde alguns minutos.' });
		}

		const formData = await request.formData();
		const raw = Object.fromEntries(formData);

		const result = createEventSchema.safeParse(raw);
		if (!result.success) {
			return fail(400, {
				error: result.error.errors[0]?.message ?? 'Dados inválidos',
				values: raw
			});
		}

		const { name, description, sport, location, city, eventDate, packagePrice, photoPrice, status } =
			result.data;

		// Generate unique slug
		const baseSlug = slugify(name);
		const timestamp = Date.now().toString(36);
		const slug = `${baseSlug}-${timestamp}`;

		const packagePriceCents = packagePrice
			? Math.round(parseFloat(packagePrice.replace(',', '.')) * 100)
			: null;

		const photoPriceCents = photoPrice
			? Math.max(100, Math.round(parseFloat(photoPrice.replace(',', '.')) * 100))
			: DEFAULT_PHOTO_PRICE;

		// Process cover image if provided
		let coverUrl: string | null = null;
		const coverFile = formData.get('cover') as File | null;
		if (coverFile && coverFile.size > 0) {
			try {
				const buffer = Buffer.from(await coverFile.arrayBuffer());
				const processed = await sharp(buffer)
					.resize(1400, 560, { fit: 'cover', position: 'center' })
					.jpeg({ quality: 85, progressive: true })
					.toBuffer();
				const key = `covers/${slug}.jpg`;
				await uploadFile(key, processed, 'image/jpeg');
				coverUrl = getPublicUrl(key);
			} catch (err) {
				console.error('Error processing cover image:', err);
				// Non-fatal — proceed without cover
			}
		}

		let eventId: string;
		try {
			const [event] = await db
				.insert(schema.events)
				.values({
					slug,
					name,
					description: description || null,
					sport,
					location,
					city,
					eventDate: new Date(eventDate),
					packagePrice: packagePriceCents,
					photoPrice: photoPriceCents,
					coverUrl,
					status,
					photographerId: user.id
				})
				.returning({ id: schema.events.id });
			eventId = event.id;
		} catch (err: unknown) {
			console.error('Error creating event:', err);
			return fail(500, { error: 'Erro ao criar evento. Tente novamente.', values: raw });
		}

		redirect(302, `/fotografo/painel/evento/${eventId}/upload`);
	}
};
