import { redirect, error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types.js';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		redirect(302, `/login?next=${encodeURIComponent(url.pathname)}`);
	}

	if (locals.user.role !== 'photographer' && locals.user.role !== 'admin') {
		error(403, 'Acesso restrito a fotógrafos');
	}

	return {
		user: {
			id: locals.user.id,
			name: locals.user.name,
			email: locals.user.email,
			role: locals.user.role,
			avatarUrl: locals.user.avatarUrl
		}
	};
};
