import { sql } from "drizzle-orm";
import {
  boolean,
  customType,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  vector,
} from "drizzle-orm/pg-core";

export const platformEnum = pgEnum("platform", [
  "instagram",
  "linkedin",
  "reddit",
  "x",
  "youtube",
  "web",
  "whatsapp",
]);

export const analysisStatusEnum = pgEnum("analysis_status", [
  "pending",
  "processing",
  "done",
  "failed",
  "skipped",
]);

export const jobStatusEnum = pgEnum("job_status", [
  "pending",
  "processing",
  "done",
  "failed",
]);

const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

// ---------- better-auth tables ----------

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  apiKey: text("api_key")
    .notNull()
    .unique()
    .default(sql`(gen_random_uuid())::text`),
  openaiApiKey: text("openai_api_key"),
  openaiModel: text("openai_model"),
  aiProvider: text("ai_provider").notNull().default("openai"),
  anthropicApiKey: text("anthropic_api_key"),
  anthropicModel: text("anthropic_model"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_user_id_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("account_user_id_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

// ---------- app tables ----------

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  isSeeded: boolean("is_seeded").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const items = pgTable(
  "items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    platform: platformEnum("platform").notNull().default("web"),
    externalId: text("external_id"),
    url: text("url").notNull(),
    title: text("title"),
    description: text("description"),
    imageUrl: text("image_url"),
    localImagePath: text("local_image_path"),
    categoryId: integer("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    tags: text("tags")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    userTags: text("user_tags")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    notes: text("notes"),
    summary: text("summary"),
    analysisStatus: analysisStatusEnum("analysis_status")
      .notNull()
      .default("pending"),
    analysisError: text("analysis_error"),
    analysisTokensIn: integer("analysis_tokens_in"),
    analysisTokensOut: integer("analysis_tokens_out"),
    imageAnalysisTokensIn: integer("image_analysis_tokens_in"),
    imageAnalysisTokensOut: integer("image_analysis_tokens_out"),
    visitCount: integer("visit_count").notNull().default(0),
    lastVisitedAt: timestamp("last_visited_at", { withTimezone: true }),
    embedding: vector("embedding", { dimensions: 384 }),
    linkStatus: text("link_status"),
    linkCheckedAt: timestamp("link_checked_at", { withTimezone: true }),
    savedAt: timestamp("saved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    searchVector: tsvector("search_vector").generatedAlwaysAs(
      (): ReturnType<typeof sql> => sql`
        setweight(to_tsvector('english', coalesce("title", '')), 'A') ||
        setweight(to_tsvector('english', immutable_array_to_text("tags")), 'B') ||
        setweight(to_tsvector('english', immutable_array_to_text("user_tags")), 'B') ||
        setweight(to_tsvector('english', coalesce("summary", '')), 'C') ||
        setweight(to_tsvector('english', coalesce("notes", '')), 'C') ||
        setweight(to_tsvector('english', coalesce("description", '')), 'D')
      `,
    ),
  },
  (table) => [
    uniqueIndex("items_user_url_uq").on(table.userId, table.url),
    uniqueIndex("items_user_platform_ext_uq")
      .on(table.userId, table.platform, table.externalId)
      .where(sql`"external_id" IS NOT NULL`),
    index("items_search_idx").using("gin", table.searchVector),
    index("items_embedding_idx").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops"),
    ),
    index("items_category_idx").on(table.categoryId),
    index("items_user_id_idx").on(table.userId),
  ],
);

export const connections = pgTable(
  "connections",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    providerUsername: text("provider_username"),
    refreshToken: text("refresh_token").notNull(),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    cursor: text("cursor"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("connections_user_provider_uq").on(table.userId, table.provider),
  ],
);

export const jobs = pgTable(
  "jobs",
  {
    id: serial("id").primaryKey(),
    type: text("type").notNull(),
    payload: jsonb("payload").notNull().$type<{ itemId: string }>(),
    status: jobStatusEnum("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(3),
    runAt: timestamp("run_at", { withTimezone: true }).notNull().defaultNow(),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("jobs_claim_idx").on(table.status, table.runAt)],
);

export const collectionVisibilityEnum = pgEnum("collection_visibility", [
  "private",
  "link_only",
  "public",
]);

export const collections = pgTable(
  "collections",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    slug: text("slug").notNull().unique(),
    visibility: collectionVisibilityEnum("visibility").notNull().default("private"),
    forkable: boolean("forkable").notNull().default(false),
    forkedFrom: integer("forked_from"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("collections_user_name_uq").on(table.userId, table.name),
    index("collections_user_id_idx").on(table.userId),
    index("collections_visibility_idx")
      .on(table.visibility)
      .where(sql`visibility = 'public'`),
  ],
);

export const collectionItems = pgTable(
  "collection_items",
  {
    collectionId: integer("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    itemId: uuid("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.collectionId, table.itemId] }),
    index("collection_items_collection_added_idx").on(table.collectionId, table.addedAt),
  ],
);

export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type Job = typeof jobs.$inferSelect;
export type Connection = typeof connections.$inferSelect;
export type User = typeof user.$inferSelect;
export type Collection = typeof collections.$inferSelect;
