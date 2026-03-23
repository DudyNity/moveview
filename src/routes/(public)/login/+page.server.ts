import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.user) {
		// Valida open redirect: só permite caminhos relativos (evita /login?next=https://evil.com)
		const raw = url.searchParams.get('next') || '/';
		const next = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';
		redirect(302, next);
	}
	return {};
};
