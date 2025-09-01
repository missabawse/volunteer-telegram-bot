import { pgTable, serial, text, integer, timestamp, index, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Define enums
export const volunteerStatusEnum = pgEnum('volunteer_status', ['probation', 'full', 'inactive']);
export const eventFormatEnum = pgEnum('event_format', ['workshop', 'panel', 'online', 'in-person']);
export const eventStatusEnum = pgEnum('event_status', ['planning', 'published']);
export const eventRoleEnum = pgEnum('event_role', [
  'date_confirmation',
  'speaker_confirmation', 
  'venue_confirmation',
  'pre_event_marketing',
  'post_event_marketing',
  'moderator',
  'facilitator'
]);

// Volunteers table
export const volunteers = pgTable('volunteers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  telegram_handle: text('telegram_handle').notNull().unique(),
  status: volunteerStatusEnum('status').notNull().default('probation'),
  commitments: integer('commitments').notNull().default(0),
  probation_start_date: timestamp('probation_start_date', { withTimezone: true }).defaultNow(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow()
}, (table) => ({
  telegramHandleIdx: index('idx_volunteers_telegram_handle').on(table.telegram_handle),
  statusIdx: index('idx_volunteers_status').on(table.status),
}));

// Events table
export const events = pgTable('events', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  date: timestamp('date', { withTimezone: true }).notNull(),
  format: eventFormatEnum('format').notNull(),
  status: eventStatusEnum('status').notNull().default('planning'),
  details: text('details'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow()
}, (table) => ({
  dateIdx: index('idx_events_date').on(table.date),
  statusIdx: index('idx_events_status').on(table.status),
}));

// Event roles table
export const eventRoles = pgTable('event_roles', {
  id: serial('id').primaryKey(),
  event_id: integer('event_id').references(() => events.id, { onDelete: 'cascade' }),
  role: eventRoleEnum('role').notNull(),
  assigned_to: integer('assigned_to').references(() => volunteers.id, { onDelete: 'set null' }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow()
}, (table) => ({
  eventIdIdx: index('idx_event_roles_event_id').on(table.event_id),
  assignedToIdx: index('idx_event_roles_assigned_to').on(table.assigned_to),
}));

// Admins table
export const admins = pgTable('admins', {
  id: serial('id').primaryKey(),
  telegram_handle: text('telegram_handle').notNull().unique(),
  role: text('role').notNull().default('admin'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow()
}, (table) => ({
  telegramHandleIdx: index('idx_admins_telegram_handle').on(table.telegram_handle),
}));

// Define relations
export const volunteersRelations = relations(volunteers, ({ many }) => ({
  eventRoles: many(eventRoles),
}));

export const eventsRelations = relations(events, ({ many }) => ({
  eventRoles: many(eventRoles),
}));

export const eventRolesRelations = relations(eventRoles, ({ one }) => ({
  event: one(events, {
    fields: [eventRoles.event_id],
    references: [events.id],
  }),
  volunteer: one(volunteers, {
    fields: [eventRoles.assigned_to],
    references: [volunteers.id],
  }),
}));

// Export types
export type Volunteer = typeof volunteers.$inferSelect;
export type NewVolunteer = typeof volunteers.$inferInsert;
export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type EventRole = typeof eventRoles.$inferSelect;
export type NewEventRole = typeof eventRoles.$inferInsert;
export type Admin = typeof admins.$inferSelect;
export type NewAdmin = typeof admins.$inferInsert;
