import { relations, sql } from "drizzle-orm";
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const games = sqliteTable("games", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  uid: text("uid").notNull().unique(),
  title: text("title").notNull(),
  location: text("location"),
  startsAt: integer("starts_at", { mode: "timestamp_ms" }).notNull(),
  endsAt: integer("ends_at", { mode: "timestamp_ms" }),
  isHomeGame: integer("is_home_game", { mode: "boolean" }).notNull().default(false),
  rawSummary: text("raw_summary").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch('subsec') * 1000)`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch('subsec') * 1000)`),
});

export const parents = sqliteTable("parents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  pinHash: text("pin_hash").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch('subsec') * 1000)`),
});

export const fikaSignups = sqliteTable(
  "fika_signups",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    gameId: integer("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    parentId: integer("parent_id")
      .notNull()
      .references(() => parents.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch('subsec') * 1000)`),
  },
  (table) => [
    uniqueIndex("fika_signups_game_parent_unique").on(table.gameId, table.parentId),
  ],
);

export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch('subsec') * 1000)`),
});

export const adminUsers = sqliteTable("admin_users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch('subsec') * 1000)`),
});

export const badgeCache = sqliteTable(
  "badge_cache",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    teamName: text("team_name").notNull(),
    badgeUrl: text("badge_url").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [uniqueIndex("badge_cache_team_name_unique").on(table.teamName)],
);

export const gamesRelations = relations(games, ({ many }) => ({
  signups: many(fikaSignups),
}));

export const parentsRelations = relations(parents, ({ many }) => ({
  signups: many(fikaSignups),
}));

export const fikaSignupsRelations = relations(fikaSignups, ({ one }) => ({
  game: one(games, {
    fields: [fikaSignups.gameId],
    references: [games.id],
  }),
  parent: one(parents, {
    fields: [fikaSignups.parentId],
    references: [parents.id],
  }),
}));
