import { lucia } from '$lib/server/auth/index.js';
import type { Handle } from '@sveltejs/kit';
import { capitalizeName } from '$lib/utils.js';
import { redirect } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	// Força HTTPS em produção
	if (
		event.request.headers.get('x-forwarded-proto') === 'http' &&
		event.url.hostname !== 'localhost'
	) {
		redirect(301, `https://${event.url.host}${event.url.pathname}${event.url.search}`);
	}

	const sessionId = event.cookies.get(lucia.sessionCookieName);

	if (!sessionId) {
		event.locals.user = null;
		event.locals.session = null;
		return resolve(event);
	}

	const { session, user } = await lucia.validateSession(sessionId);

	if (session && session.fresh) {
		const sessionCookie = lucia.createSessionCookie(session.id);
		event.cookies.set(sessionCookie.name, sessionCookie.value, {
			path: '.',
			...sessionCookie.attributes
		});
	}

	if (!session) {
		const blankCookie = lucia.createBlankSessionCookie();
		event.cookies.set(blankCookie.name, blankCookie.value, {
			path: '.',
			...blankCookie.attributes
		});
	}

	event.locals.user = user ? { ...user, name: capitalizeName(user.name) } : null;
	event.locals.session = session;

	const response = await resolve(event);

	const isProd = event.url.hostname !== 'localhost';

	if (isProd) {
		response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
	}

	// Content Security Policy
	response.headers.set(
		'Content-Security-Policy',
		[
			"default-src 'self'",
			"script-src 'self' 'unsafe-inline'",   // unsafe-inline necessário para SvelteKit SSR
			"style-src 'self' 'unsafe-inline'",
			"img-src 'self' data: blob: https:",   // fotos do R2 (Cloudflare)
			"connect-src 'self' https:",            // presigned uploads para R2
			"font-src 'self'",
			"object-src 'none'",                    // bloqueia Flash / plugins
			"base-uri 'self'",                      // previne injeção de <base>
			"form-action 'self'",                   // previne hijack de formulários
			"frame-ancestors 'none'"                // previne clickjacking (substitui X-Frame-Options)
		].join('; ')
	);

	// Headers de segurança adicionais
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

	return response;
};
