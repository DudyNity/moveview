import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db, schema } from '$lib/server/db/index.js';
import { eq, and, gt } from 'drizzle-orm';
import { hashPassword } from '$lib/server/auth/password.js';
import { sendPasswordResetEmail } from '$lib/server/email/index.js';
import { env as pubEnv } from '$env/dynamic/public';
const { PUBLIC_APP_URL, PUBLIC_APP_NAME } = pubEnv;
import { randomBytes } from 'crypto';

// POST /api/auth/reset-password
// Body: { action: 'request', email } | { action: 'confirm', token, password }
export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => null);
	if (!body) throw error(400, 'Dados inválidos');

	if (body.action === 'request') {
		const email = body.email?.trim()?.toLowerCase();
		if (!email) throw error(400, 'Email obrigatório');

		const [user] = await db
			.select({ id: schema.users.id, name: schema.users.name, email: schema.users.email })
			.from(schema.users)
			.where(eq(schema.users.email, email))
			.limit(1);

		// Always respond OK — don't reveal if email exists
		if (!user) return json({ ok: true });

		// Invalidate previous tokens
		await db
			.delete(schema.passwordResetTokens)
			.where(eq(schema.passwordResetTokens.userId, user.id));

		const token = randomBytes(32).toString('hex');
		const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

		await db.insert(schema.passwordResetTokens).values({
			userId: user.id,
			token,
			expiresAt
		});

		const appUrl = PUBLIC_APP_URL || 'http://localhost:5173';
		const appName = PUBLIC_APP_NAME || 'Move View Photos';
		const resetUrl = `${appUrl}/redefinir-senha?token=${token}`;

		await sendPasswordResetEmail(user.name, user.email, resetUrl, appName);

		return json({ ok: true });
	}

	if (body.action === 'confirm') {
		const { token, password } = body;
		if (!token || !password) throw error(400, 'Dados incompletos');
		if (typeof password !== 'string' || password.length < 8) {
			throw error(400, 'A senha deve ter no mínimo 8 caracteres');
		}

		const [row] = await db
			.select({
				id: schema.passwordResetTokens.id,
				userId: schema.passwordResetTokens.userId,
				usedAt: schema.passwordResetTokens.usedAt
			})
			.from(schema.passwordResetTokens)
			.where(
				and(
					eq(schema.passwordResetTokens.token, token),
					gt(schema.passwordResetTokens.expiresAt, new Date())
				)
			)
			.limit(1);

		if (!row) throw error(400, 'Link inválido ou expirado');
		if (row.usedAt) throw error(400, 'Este link já foi utilizado');

		const hashedPassword = await hashPassword(password);

		await db
			.update(schema.users)
			.set({ hashedPassword, updatedAt: new Date() })
			.where(eq(schema.users.id, row.userId));

		await db
			.update(schema.passwordResetTokens)
			.set({ usedAt: new Date() })
			.where(eq(schema.passwordResetTokens.id, row.id));

		// Invalidate all sessions
		await db.delete(schema.sessions).where(eq(schema.sessions.userId, row.userId));

		return json({ ok: true });
	}

	throw error(400, 'Ação inválida');
};
