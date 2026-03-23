import { pgTable, pgEnum, text, timestamp, integer, boolean, varchar } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['athlete', 'photographer', 'admin']);
export const orderStatusEnum = pgEnum('order_status', ['pending', 'paid', 'failed', 'refunded']);
export const eventStatusEnum = pgEnum('event_status', ['draft', 'active', 'archived']);

// Tables
export const users = pgTable('users', {
	id: text('id').primaryKey().$defaultFn(() => createId()),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	hashedPassword: text('hashed_password').notNull(),
	role: userRoleEnum('role').notNull().default('athlete'),
	avatarUrl: text('avatar_url'),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export const sessions = pgTable('sessions', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull()
});

export const events = pgTable('events', {
	id: text('id').primaryKey().$defaultFn(() => createId()),
	slug: text('slug').notNull().unique(),
	name: text('name').notNull(),
	description: text('description'),
	sport: text('sport').notNull(),
	location: text('location').notNull(),
	city: text('city').notNull(),
	eventDate: timestamp('event_date', { withTimezone: true }).notNull(),
	coverUrl: text('cover_url'),
	status: eventStatusEnum('status').notNull().default('draft'),
	packagePrice: integer('package_price'), // price in cents — full package
	photoPrice: integer('photo_price').notNull().default(2900), // price per individual photo in cents
	photographerId: text('photographer_id').references(() => users.id),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const photos = pgTable('photos', {
	id: text('id').primaryKey().$defaultFn(() => createId()),
	eventId: text('event_id')
		.notNull()
		.references(() => events.id, { onDelete: 'cascade' }),
	originalKey: text('original_key').notNull(), // R2/S3 key for original
	watermarkKey: text('watermark_key').notNull(), // R2/S3 key for watermarked
	width: integer('width').notNull(),
	height: integer('height').notNull(),
	bibNumbers: text('bib_numbers').array(), // detected bib numbers
	price: integer('price').notNull().default(2900), // price in cents
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const orders = pgTable('orders', {
	id: text('id').primaryKey().$defaultFn(() => createId()),
	userId: text('user_id')
		.notNull()
		.references(() => users.id),
	status: orderStatusEnum('status').notNull().default('pending'),
	totalAmount: integer('total_amount').notNull(), // in cents
	stripeSessionId: text('stripe_session_id').unique(),
	stripePaymentIntentId: text('stripe_payment_intent_id'),
	mpPreferenceId: text('mp_preference_id').unique(),
	mpPaymentId: text('mp_payment_id'),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export const orderItems = pgTable('order_items', {
	id: text('id').primaryKey().$defaultFn(() => createId()),
	orderId: text('order_id')
		.notNull()
		.references(() => orders.id, { onDelete: 'cascade' }),
	photoId: text('photo_id')
		.notNull()
		.references(() => photos.id),
	priceAtPurchase: integer('price_at_purchase').notNull()
});

export const photographerSports = pgTable('photographer_sports', {
	id: text('id').primaryKey().$defaultFn(() => createId()),
	photographerId: text('photographer_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const downloads = pgTable('downloads', {
	id: text('id').primaryKey().$defaultFn(() => createId()),
	userId: text('user_id')
		.notNull()
		.references(() => users.id),
	photoId: text('photo_id')
		.notNull()
		.references(() => photos.id),
	orderId: text('order_id')
		.notNull()
		.references(() => orders.id),
	downloadedAt: timestamp('downloaded_at', { withTimezone: true }).notNull().defaultNow(),
	ipAddress: varchar('ip_address', { length: 45 })
});

export const passwordResetTokens = pgTable('password_reset_tokens', {
	id: text('id').primaryKey().$defaultFn(() => createId()),
	userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
	token: text('token').notNull().unique(),
	expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
	usedAt: timestamp('used_at', { withTimezone: true })
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
	sessions: many(sessions),
	orders: many(orders),
	events: many(events, { relationName: 'photographer_events' }),
	downloads: many(downloads),
	sports: many(photographerSports)
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
	photographer: one(users, {
		fields: [events.photographerId],
		references: [users.id],
		relationName: 'photographer_events'
	}),
	photos: many(photos)
}));

export const photosRelations = relations(photos, ({ one, many }) => ({
	event: one(events, {
		fields: [photos.eventId],
		references: [events.id]
	}),
	orderItems: many(orderItems),
	downloads: many(downloads)
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
	user: one(users, {
		fields: [orders.userId],
		references: [users.id]
	}),
	items: many(orderItems),
	downloads: many(downloads)
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
	order: one(orders, {
		fields: [orderItems.orderId],
		references: [orders.id]
	}),
	photo: one(photos, {
		fields: [orderItems.photoId],
		references: [photos.id]
	})
}));

export const downloadsRelations = relations(downloads, ({ one }) => ({
	user: one(users, {
		fields: [downloads.userId],
		references: [users.id]
	}),
	photo: one(photos, {
		fields: [downloads.photoId],
		references: [photos.id]
	}),
	order: one(orders, {
		fields: [downloads.orderId],
		references: [orders.id]
	})
}));

export const photographerSportsRelations = relations(photographerSports, ({ one }) => ({
	photographer: one(users, {
		fields: [photographerSports.photographerId],
		references: [users.id]
	})
}));

// Inferred types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type Photo = typeof photos.$inferSelect;
export type NewPhoto = typeof photos.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type Download = typeof downloads.$inferSelect;
export type PhotographerSport = typeof photographerSports.$inferSelect;
