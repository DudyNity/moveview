import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';
import { DATABASE_URL } from '$env/static/private';

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

function getDb() {
	if (_db) return _db;

	const client = postgres(DATABASE_URL, {
		max: 10,
		idle_timeout: 20,
		connect_timeout: 10
	});

	_db = drizzle(client, { schema });
	return _db;
}

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
	get(_target, prop) {
		const instance = getDb();
		if (!instance) throw new Error('Database not initialized');
		const value = (instance as unknown as Record<string | symbol, unknown>)[prop];
		return typeof value === 'function' ? value.bind(instance) : value;
	}
});

export { schema };
