/**
 * Force-deletes an event and all related data, even when paid orders exist.
 * USE ONLY IN DEV / TEST environments.
 *
 * Usage:
 *   bun run scripts/force-delete-event.ts              ← lista todos os eventos
 *   bun run scripts/force-delete-event.ts <slug>       ← apaga pelo slug
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql, eq, inArray } from 'drizzle-orm';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
	console.error('DATABASE_URL não configurado');
	process.exit(1);
}

const client = postgres(DATABASE_URL, { max: 1 });
const db = drizzle(client);

const targetSlug = process.argv[2];

if (!targetSlug) {
	// Lista todos os eventos
	const events = await db.execute(
		sql`SELECT id, slug, name, status FROM events ORDER BY created_at`
	);

	if (events.length === 0) {
		console.log('Nenhum evento cadastrado.');
	} else {
		console.log('\nEventos cadastrados:\n');
		for (const e of events) {
			console.log(`  slug: ${String(e.slug).padEnd(40)} status: ${String(e.status).padEnd(10)} nome: ${e.name}`);
		}
		console.log('\nUso: bun run scripts/force-delete-event.ts <slug>\n');
	}

	await client.end();
	process.exit(0);
}

// Busca o evento pelo slug
const [event] = await db.execute(
	sql`SELECT id, name FROM events WHERE slug = ${targetSlug} LIMIT 1`
);

if (!event) {
	console.error(`Evento com slug "${targetSlug}" não encontrado.`);
	await client.end();
	process.exit(1);
}

const eventId = String(event.id);
console.log(`\nApagando evento: "${event.name}" (${eventId})`);

// 1. Fotos do evento
const photos = await db.execute(
	sql`SELECT id FROM photos WHERE event_id = ${eventId}`
);
console.log(`  ${photos.length} foto(s) encontrada(s)`);

if (photos.length > 0) {
	const photoIds = photos.map((p) => String(p.id));
	const photoIdList = sql.join(photoIds.map((id) => sql`${id}`), sql`, `);

	// 2. Remove downloads
	await db.execute(sql`DELETE FROM downloads WHERE photo_id IN (${photoIdList})`);
	console.log(`  downloads removidos`);

	// 3. Busca order items dessas fotos
	const orderItems = await db.execute(
		sql`SELECT id, order_id FROM order_items WHERE photo_id IN (${photoIdList})`
	);

	if (orderItems.length > 0) {
		const orderItemIds = orderItems.map((oi) => String(oi.id));
		const orderIds = [...new Set(orderItems.map((oi) => String(oi.order_id)))];

		const oiList = sql.join(orderItemIds.map((id) => sql`${id}`), sql`, `);
		const oList  = sql.join(orderIds.map((id) => sql`${id}`), sql`, `);

		// 4. Remove order items
		await db.execute(sql`DELETE FROM order_items WHERE id IN (${oiList})`);
		console.log(`  ${orderItemIds.length} order item(s) removido(s)`);

		// 5. Remove orders
		await db.execute(sql`DELETE FROM orders WHERE id IN (${oList})`);
		console.log(`  ${orderIds.length} order(s) removida(s)`);
	}
}

// 6. Apaga o evento (fotos em cascade via FK)
await db.execute(sql`DELETE FROM events WHERE id = ${eventId}`);
console.log(`\n✓ Evento "${event.name}" apagado com sucesso.\n`);

await client.end();
process.exit(0);
