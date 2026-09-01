CREATE TYPE "public"."collection_visibility" AS ENUM('private', 'link_only', 'public');

CREATE TABLE "collections" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "slug" text NOT NULL,
  "visibility" "collection_visibility" DEFAULT 'private' NOT NULL,
  "forkable" boolean DEFAULT false NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "collections_slug_unique" UNIQUE("slug")
);

CREATE TABLE "collection_items" (
  "collection_id" integer NOT NULL,
  "item_id" uuid NOT NULL,
  "added_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "collection_items_pkey" PRIMARY KEY("collection_id","item_id")
);

ALTER TABLE "collections" ADD CONSTRAINT "collections_user_id_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_collection_id_collections_id_fk"
  FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_item_id_items_id_fk"
  FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;

CREATE UNIQUE INDEX "collections_user_name_uq" ON "collections" ("user_id","name");
CREATE INDEX "collections_user_id_idx" ON "collections" ("user_id");
CREATE INDEX "collections_visibility_idx" ON "collections" ("visibility") WHERE visibility = 'public';
CREATE INDEX "collection_items_collection_added_idx" ON "collection_items" ("collection_id","added_at" DESC);
