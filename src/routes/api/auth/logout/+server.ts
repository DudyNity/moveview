import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { lucia } from '$lib/server/auth/index.js';

export const POST: RequestHandler = async ({ locals, cookies }) => {
	if (!locals.session) {
		return json({ success: true });
	}

	await lucia.invalidateSession(locals.session.id);
	const blankCookie = lucia.createBlankSessionCookie();
	cookies.set(blankCookie.name, blankCookie.value, {
		path: '.',
		...blankCookie.attributes
	});

	return json({ success: true });
};
