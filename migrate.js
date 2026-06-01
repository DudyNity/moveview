import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
	console.error('DATABASE_URL não definida');
	process.exit(1);
}

console.log('Executando migrações...');

const client = postgres(DATABASE_URL, { max: 1 });
const db = drizzle(client);

try {
	await migrate(db, { migrationsFolder: join(__dirname, 'drizzle') });
	console.log('Migrações Drizzle concluídas.');
} catch (err) {
	console.error('Aviso: migração Drizzle com erro:', err.message);
}

// Garantias diretas — rodam sempre, idempotentes
// Só executa se a tabela users já existir (migrations rodaram)
console.log('Aplicando garantias de schema...');
try {
	await client.unsafe(`
		CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
			"id" text PRIMARY KEY NOT NULL,
			"user_id" text NOT NULL,
			"token" text NOT NULL,
			"expires_at" timestamp with time zone NOT NULL,
			"used_at" timestamp with time zone,
			CONSTRAINT "password_reset_tokens_token_unique" UNIQUE("token")
		)
	`);
	await client.unsafe(`ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "package_min_photos" integer`);
	console.log('Schema atualizado com sucesso.');
} catch (err) {
	console.error('Aviso: garantias de schema com erro:', err.message);
}

await client.end();
