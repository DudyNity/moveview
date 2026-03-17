/**
 * Script pontual: cria a tabela photographer_sports sem tocar nas demais.
 * Uso: bun scripts/add-sports-table.ts
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
	console.error('❌  DATABASE_URL não configurado');
	process.exit(1);
}

const client = postgres(DATABASE_URL, { max: 1 });
const db = drizzle(client);

await db.execute(sql`
	CREATE TABLE IF NOT EXISTS photographer_sports (
		id         text PRIMARY KEY NOT NULL,
		photographer_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		name       text NOT NULL,
		created_at timestamp with time zone DEFAULT now() NOT NULL
	)
`);

console.log('✅  Tabela photographer_sports criada (ou já existia)');
await client.end();
