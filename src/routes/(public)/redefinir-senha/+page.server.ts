import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types.js';
import { db, schema } from '$lib/server/db/index.js';
import { eq } from 'drizzle-orm';
import { createHmac } from 'crypto';
import { RESET_TOKEN_SECRET } from '$env/static/private';
import { hashPassword } from '$lib/server/auth/password.js';

export const load: PageServerLoad = async ({ url }) => {
	const uid = url.searchParams.get('uid') ?? '';
	const token = url.searchParams.get('token') ?? '';
	return { uid, token, invalid: !uid || !token };
};

function verifyResetToken(token: string, userId: string, hashedPassword: string): boolean {
	try {
		const [b64, sig] = token.split('.');
		if (!b64 || !sig) return false;
		const payload = Buffer.from(b64, 'base64url').toString();
		const [tid, expiryStr] = payload.split(':');
		if (tid !== userId) return false;
		if (Date.now() > Number(expiryStr)) return false;
		const expected = createHmac('sha256', RESET_TOKEN_SECRET || 'dev_secret')
			.update(`${payload}:${hashedPassword}`)
			.digest('hex');
		return sig === expected;
	} catch {
		return false;
	}
}

export const actions: Actions = {
	default: async ({ request }) => {
		const data = await request.formData();
		const uid = data.get('uid')?.toString() ?? '';
		const token = data.get('token')?.toString() ?? '';
		const password = data.get('password')?.toString() ?? '';
		const confirm = data.get('confirm')?.toString() ?? '';

		if (!uid || !token) return fail(400, { error: 'Link inválido ou expirado.', uid, token });
		if (password.length < 8) return fail(400, { error: 'A senha deve ter pelo menos 8 caracteres.', uid, token });
		if (password !== confirm) return fail(400, { error: 'As senhas não coincidem.', uid, token });

		const [user] = await db
			.select({ id: schema.users.id, hashedPassword: schema.users.hashedPassword })
			.from(schema.users)
			.where(eq(schema.users.id, uid))
			.limit(1);

		if (!user || !verifyResetToken(token, uid, user.hashedPassword)) {
			return fail(400, { error: 'Link inválido ou expirado. Solicite um novo link.', uid, token });
		}

		const newHash = await hashPassword(password);
		await db.update(schema.users).set({ hashedPassword: newHash, updatedAt: new Date() }).where(eq(schema.users.id, uid));

		redirect(302, '/login?reset=1');
	}
};
