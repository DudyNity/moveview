import type { PageServerLoad } from './$types.js';
import { db, schema } from '$lib/server/db/index.js';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user!;

	const sports = await db
		.select({ id: schema.photographerSports.id, name: schema.photographerSports.name })
		.from(schema.photographerSports)
		.where(eq(schema.photographerSports.photographerId, user.id))
		.orderBy(schema.photographerSports.name);

	return { sports };
};
