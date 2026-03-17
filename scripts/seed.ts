/**
 * Seed script — cria usuários iniciais para desenvolvimento/produção
 *
 * Uso:
 *   bun scripts/seed.ts
 *
 * Requer DATABASE_URL configurado no .env
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { Argon2id } from 'oslo/password';
import * as schema from '../src/lib/server/db/schema.js';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
	console.error('❌  DATABASE_URL não configurado no .env');
	process.exit(1);
}

const client = postgres(DATABASE_URL, { max: 1 });
const db = drizzle(client, { schema });
const argon2id = new Argon2id();

// ─── Credenciais padrão ─────────────────────────────────────
const ADMIN = {
	name: 'Administrador',
	email: 'admin@promomentos.com.br',
	password: 'Admin@123456',
	role: 'admin' as const
};

const PHOTOGRAPHER = {
	name: 'Fotógrafo Demo',
	email: 'foto@promomentos.com.br',
	password: 'Foto@123456',
	role: 'photographer' as const
};
// ─────────────────────────────────────────────────────────────

async function upsertUser(data: typeof ADMIN | typeof PHOTOGRAPHER) {
	const existing = await db
		.select({ id: schema.users.id, role: schema.users.role })
		.from(schema.users)
		.where(eq(schema.users.email, data.email))
		.limit(1);

	const hashedPassword = await argon2id.hash(data.password);

	if (existing.length > 0) {
		await db
			.update(schema.users)
			.set({ hashedPassword, role: data.role, name: data.name })
			.where(eq(schema.users.email, data.email));
		console.log(`✅  Atualizado: ${data.email} (role: ${data.role})`);
	} else {
		await db.insert(schema.users).values({
			name: data.name,
			email: data.email,
			hashedPassword,
			role: data.role
		});
		console.log(`✅  Criado: ${data.email} (role: ${data.role})`);
	}
}

async function main() {
	console.log('\n🌱  Iniciando seed...\n');

	await upsertUser(ADMIN);
	await upsertUser(PHOTOGRAPHER);

	console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  CREDENCIAIS DE ACESSO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  👑 Admin
     Email:  ${ADMIN.email}
     Senha:  ${ADMIN.password}
     URL:    /admin

  📷 Fotógrafo
     Email:  ${PHOTOGRAPHER.email}
     Senha:  ${PHOTOGRAPHER.password}
     URL:    /fotografo/painel

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ⚠️  Troque as senhas em produção!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

	await client.end();
}

main().catch((err) => {
	console.error('❌  Erro no seed:', err);
	process.exit(1);
});
