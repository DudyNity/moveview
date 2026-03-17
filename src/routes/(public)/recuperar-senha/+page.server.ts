import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types.js';
import { db, schema } from '$lib/server/db/index.js';
import { eq } from 'drizzle-orm';
import { createHmac } from 'crypto';
import { RESET_TOKEN_SECRET } from '$env/static/private';
import { PUBLIC_APP_URL, PUBLIC_APP_NAME } from '$env/static/public';
import { sendPasswordResetEmail } from '$lib/server/email/index.js';

export const load: PageServerLoad = async () => ({ sent: false });

function generateResetToken(userId: string, hashedPassword: string): string {
	const expiry = Date.now() + 3_600_000; // 1 hour
	const payload = `${userId}:${expiry}`;
	const sig = createHmac('sha256', RESET_TOKEN_SECRET || 'dev_secret')
		.update(`${payload}:${hashedPassword}`)
		.digest('hex');
	return `${Buffer.from(payload).toString('base64url')}.${sig}`;
}

export const actions: Actions = {
	default: async ({ request }) => {
		const data = await request.formData();
		const email = data.get('email')?.toString().trim().toLowerCase();

		if (!email) return fail(400, { error: 'Informe o e-mail' });

		// Always return success to avoid email enumeration
		const [user] = await db
			.select({ id: schema.users.id, name: schema.users.name, hashedPassword: schema.users.hashedPassword })
			.from(schema.users)
			.where(eq(schema.users.email, email))
			.limit(1);

		if (user) {
			const token = generateResetToken(user.id, user.hashedPassword);
			const resetUrl = `${PUBLIC_APP_URL}/redefinir-senha?uid=${user.id}&token=${encodeURIComponent(token)}`;
			await sendPasswordResetEmail(user.name, email, resetUrl, PUBLIC_APP_NAME || 'Move View Photos').catch(
				console.error
			);
		}

		return { sent: true };
	}
};
