import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { z } from 'zod';
import { sendWelcomeEmail } from '$lib/server/email/index.js';
import { capitalizeName } from '$lib/utils.js';
import { db, schema } from '$lib/server/db/index.js';
import { eq } from 'drizzle-orm';
import { hashPassword } from '$lib/server/auth/password.js';
import { lucia } from '$lib/server/auth/index.js';
import { isRateLimited } from '$lib/server/rate-limit.js';
import { RATE_LIMIT_AUTH_MAX, RATE_LIMIT_AUTH_WINDOW_MS } from '$lib/constants.js';

const registerSchema = z.object({
	name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
	email: z.string().email('Email inválido'),
	password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres')
});

export const POST: RequestHandler = async ({ request, cookies, getClientAddress }) => {
	const ip = getClientAddress();
	if (isRateLimited(`auth:${ip}`, RATE_LIMIT_AUTH_MAX, RATE_LIMIT_AUTH_WINDOW_MS)) {
		return json({ error: 'Muitas tentativas. Tente novamente mais tarde.' }, { status: 429 });
	}

	const body = await request.json().catch(() => null);
	if (!body) return json({ error: 'Corpo inválido' }, { status: 400 });

	const parsed = registerSchema.safeParse(body);
	if (!parsed.success) {
		return json({ error: parsed.error.issues[0].message }, { status: 400 });
	}

	const { email, password } = parsed.data;
	const name = capitalizeName(parsed.data.name);

	const existing = await db
		.select({ id: schema.users.id })
		.from(schema.users)
		.where(eq(schema.users.email, email))
		.limit(1);

	if (existing.length > 0) {
		return json({ error: 'Email já cadastrado' }, { status: 409 });
	}

	const hashedPassword = await hashPassword(password);

	const [user] = await db
		.insert(schema.users)
		.values({ name, email, hashedPassword })
		.returning({ id: schema.users.id });

	const session = await lucia.createSession(user.id, {});
	const sessionCookie = lucia.createSessionCookie(session.id);
	cookies.set(sessionCookie.name, sessionCookie.value, {
		path: '.',
		...sessionCookie.attributes
	});

	// E-mail de boas-vindas é não-crítico — erro não deve quebrar o cadastro
	sendWelcomeEmail(name, email).catch((err) => {
		console.error(`[Register] Falha ao enviar e-mail de boas-vindas para ${email}:`, err);
	});

	return json({ success: true }, { status: 201 });
};
