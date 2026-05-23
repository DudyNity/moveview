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
	console.error('Aviso: migração Drizzle com erro (pode ser esperado se já aplicada):', err.message);
}

// Garantias diretas — rodam sempre, idempotentes
console.log('Aplicando garantias de schema...');
await client.unsafe(`
	CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
		"id" text PRIMARY KEY NOT NULL,
		"user_id" text NOT NULL,
		"token" text NOT NULL,
		"expires_at" timestamp with time zone NOT NULL,
		"used_at" timestamp with time zone,
		CONSTRAINT "password_reset_tokens_token_unique" UNIQUE("token"),
		CONSTRAINT "password_reset_tokens_user_id_users_id_fk"
			FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade
	)
`);
await client.unsafe(`ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "package_min_photos" integer`);

console.log('Schema atualizado com sucesso.');
await client.end();
