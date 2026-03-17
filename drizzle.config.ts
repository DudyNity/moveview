import { defineConfig } from 'drizzle-kit';

export default defineConfig({
	dialect: 'postgresql',
	schema: './src/lib/server/db/schema.ts',
	out: './drizzle',
	dbCredentials: {
		url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/fotodb'
	},
	verbose: true,
	strict: true
});
