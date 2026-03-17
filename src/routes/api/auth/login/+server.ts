import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { z } from 'zod';
import { db, schema } from '$lib/server/db/index.js';
import { eq } from 'drizzle-orm';
import { verifyPassword } from '$lib/server/auth/password.js';
import { lucia } from '$lib/server/auth/index.js';
import { isRateLimited } from '$lib/server/rate-limit.js';
import { RATE_LIMIT_AUTH_MAX, RATE_LIMIT_AUTH_WINDOW_MS } from '$lib/constants.js';

const loginSchema = z.object({
	email: z.string().email(),
	password: z.string().min(1)
});

export const POST: RequestHandler = async ({ request, cookies, getClientAddress }) => {
	const ip = getClientAddress();
	if (isRateLimited(`auth:${ip}`, RATE_LIMIT_AUTH_MAX, RATE_LIMIT_AUTH_WINDOW_MS)) {
		return json({ error: 'Muitas tentativas. Tente novamente mais tarde.' }, { status: 429 });
	}

	const body = await request.json().catch(() => null);
	if (!body) return json({ error: 'Corpo inválido' }, { status: 400 });

	const parsed = loginSchema.safeParse(body);
	if (!parsed.success) {
		return json({ error: 'Dados inválidos' }, { status: 400 });
	}

	const { email, password } = parsed.data;

	const [user] = await db
		.select()
		.from(schema.users)
		.where(eq(schema.users.email, email))
		.limit(1);

	if (!user) {
		return json({ error: 'Email ou senha incorretos' }, { status: 401 });
	}

	const valid = await verifyPassword(user.hashedPassword, password);
	if (!valid) {
		return json({ error: 'Email ou senha incorretos' }, { status: 401 });
	}

	const session = await lucia.createSession(user.id, {});
	const sessionCookie = lucia.createSessionCookie(session.id);
	cookies.set(sessionCookie.name, sessionCookie.value, {
		path: '.',
		...sessionCookie.attributes
	});

	return json({ success: true });
};
