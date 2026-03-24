import { redirect, fail, error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types.js';
import { db, schema } from '$lib/server/db/index.js';
import { eq, and, inArray } from 'drizzle-orm';
import { z } from 'zod';
import sharp from 'sharp';
import { uploadFile, getPublicUrl, deleteFile } from '$lib/server/storage/r2.js';
import { DEFAULT_PHOTO_PRICE } from '$lib/constants.js';

export const load: PageServerLoad = async ({ params, locals }) => {
	const user = locals.user!;

	const [event] = await db
		.select()
		.from(schema.events)
		.where(and(eq(schema.events.id, params.id), eq(schema.events.photographerId, user.id)))
		.limit(1);

	if (!event) error(404, 'Evento não encontrado');

	const photos = await db
		.select({
			id: schema.photos.id,
			watermarkKey: schema.photos.watermarkKey,
			width: schema.photos.width,
			height: schema.photos.height,
			bibNumbers: schema.photos.bibNumbers,
			price: schema.photos.price,
			createdAt: schema.photos.createdAt
		})
		.from(schema.photos)
		.where(eq(schema.photos.eventId, event.id))
		.orderBy(schema.photos.createdAt);

	return {
		event: {
			id: event.id,
			slug: event.slug,
			name: event.name,
			description: event.description,
			sport: event.sport,
			location: event.location,
			city: event.city,
			eventDate: event.eventDate,
			coverUrl: event.coverUrl ? getPublicUrl(event.coverUrl) : null,
			coverKey: event.coverUrl,
			status: event.status,
			packagePrice: event.packagePrice,
			photoPrice: event.photoPrice
		},
		photos: photos.map((p) => ({ ...p, watermarkUrl: getPublicUrl(p.watermarkKey) })),
		sports: await db
			.select({ id: schema.photographerSports.id, name: schema.photographerSports.name })
			.from(schema.photographerSports)
			.where(eq(schema.photographerSports.photographerId, user.id))
			.orderBy(schema.photographerSports.name)
	};
};

const updateEventSchema = z.object({
	name: z.string().min(3).max(120),
	description: z.string().max(1000).optional(),
	sport: z.string().min(2).max(60),
	location: z.string().min(2).max(200),
	city: z.string().min(2).max(80),
	eventDate: z.string().min(1).refine(
		(v) => !isNaN(new Date(v).getTime()),
		'Data do evento inválida'
	),
	packagePrice: z.string().optional(),
	photoPrice: z.string().optional(),
	status: z.enum(['draft', 'active', 'archived'])
});

export const actions: Actions = {
	updateEvent: async ({ request, params, locals }) => {
		const user = locals.user!;
		const formData = await request.formData();

		const [existing] = await db
			.select({ id: schema.events.id, coverUrl: schema.events.coverUrl })
			.from(schema.events)
			.where(and(eq(schema.events.id, params.id), eq(schema.events.photographerId, user.id)))
			.limit(1);

		if (!existing) return fail(404, { error: 'Evento não encontrado' });

		const raw = Object.fromEntries([...formData.entries()].filter(([k]) => k !== 'cover'));
		const parsed = updateEventSchema.safeParse(raw);
		if (!parsed.success) return fail(400, { error: parsed.error.errors[0]?.message ?? 'Dados inválidos' });

		const { name, description, sport, location, city, eventDate, packagePrice, photoPrice, status } = parsed.data;
		const packagePriceCents = packagePrice
			? Math.round(parseFloat(packagePrice.replace(',', '.')) * 100)
			: null;
		const photoPriceCents = photoPrice
			? Math.max(100, Math.round(parseFloat(photoPrice.replace(',', '.')) * 100))
			: DEFAULT_PHOTO_PRICE;

		// Handle new cover image
		let coverUrl: string | undefined = undefined;
		const coverFile = formData.get('cover') as File | null;
		if (coverFile && coverFile.size > 0) {
			try {
				const buffer = Buffer.from(await coverFile.arrayBuffer());
				const processed = await sharp(buffer)
					.resize(1400, 560, { fit: 'cover', position: 'center' })
					.jpeg({ quality: 85, progressive: true })
					.toBuffer();
				const key = `covers/${params.id}.jpg`;
				await uploadFile(key, processed, 'image/jpeg');
				coverUrl = key;
				// Delete old cover if different key
				if (existing.coverUrl && existing.coverUrl !== key) {
					await deleteFile(existing.coverUrl).catch(() => {});
				}
			} catch {
				// Non-fatal
			}
		}

		await db
			.update(schema.events)
			.set({
				name,
				description: description || null,
				sport,
				location,
				city,
				eventDate: new Date(eventDate),
				packagePrice: packagePriceCents,
				photoPrice: photoPriceCents,
				status,
				...(coverUrl !== undefined ? { coverUrl } : {})
			})
			.where(eq(schema.events.id, params.id));

		return { success: true };
	},

	deletePhoto: async ({ request, params, locals }) => {
		const user = locals.user!;
		const formData = await request.formData();
		const photoId = formData.get('photoId')?.toString();

		if (!photoId) return fail(400, { error: 'ID da foto não informado' });

		// Verify the photo belongs to this photographer's event
		const [photo] = await db
			.select({ id: schema.photos.id, originalKey: schema.photos.originalKey, watermarkKey: schema.photos.watermarkKey })
			.from(schema.photos)
			.innerJoin(schema.events, eq(schema.photos.eventId, schema.events.id))
			.where(and(eq(schema.photos.id, photoId), eq(schema.events.photographerId, user.id)))
			.limit(1);

		if (!photo) return fail(404, { error: 'Foto não encontrada' });

		// Block if paid orders exist for this photo
		const paidOrder = await db
			.select({ id: schema.orderItems.id })
			.from(schema.orderItems)
			.innerJoin(schema.orders, eq(schema.orderItems.orderId, schema.orders.id))
			.where(and(eq(schema.orderItems.photoId, photoId), eq(schema.orders.status, 'paid')))
			.limit(1);

		if (paidOrder.length > 0) return fail(409, { error: 'Não é possível remover: foto já comprada por um cliente.' });

		await db.delete(schema.downloads).where(eq(schema.downloads.photoId, photoId));
		await db.delete(schema.orderItems).where(eq(schema.orderItems.photoId, photoId));
		await db.delete(schema.photos).where(eq(schema.photos.id, photoId));
		await Promise.allSettled([deleteFile(photo.originalKey), deleteFile(photo.watermarkKey)]);

		redirect(302, `/fotografo/painel/evento/${params.id}/editar`);
	}
};
