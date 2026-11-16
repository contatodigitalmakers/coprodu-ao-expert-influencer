CREATE TABLE "presentations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"expert_id" uuid NOT NULL,
	"user_id" uuid,
	"code" text NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"last_viewed_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "presentations_code_unique" UNIQUE("code"),
	CONSTRAINT "presentations_code_format" CHECK ("presentations"."code" ~ '^[a-z0-9]{6,12}$')
);
--> statement-breakpoint
ALTER TABLE "presentations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "presentations" ADD CONSTRAINT "presentations_expert_id_experts_id_fk" FOREIGN KEY ("expert_id") REFERENCES "public"."experts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "presentations" ADD CONSTRAINT "presentations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "presentations_expert_id_idx" ON "presentations" USING btree ("expert_id");--> statement-breakpoint
CREATE POLICY "authenticated_can_select" ON "presentations" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "authenticated_can_insert" ON "presentations" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "authenticated_can_update" ON "presentations" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);