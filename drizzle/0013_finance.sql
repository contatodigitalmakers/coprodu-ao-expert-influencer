CREATE TYPE "public"."app_status" AS ENUM('prospecting', 'negotiating', 'contract_signed', 'in_development', 'beta', 'launching', 'operating', 'paused', 'closed');--> statement-breakpoint
CREATE TYPE "public"."cost_category" AS ENUM('paid_traffic', 'ai_app', 'infrastructure', 'sales_tools', 'app_freelancers', 'app_other', 'ai_development', 'software', 'people', 'services', 'taxes', 'company_other');--> statement-breakpoint
CREATE TABLE "app_sales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"app_id" uuid NOT NULL,
	"month" date NOT NULL,
	"new_sales" integer NOT NULL,
	"active_subscribers" integer NOT NULL,
	"cancellations" integer NOT NULL,
	"gross_revenue" numeric(12, 2) NOT NULL,
	"platform_fees" numeric(12, 2) NOT NULL,
	"refunds" numeric(12, 2) NOT NULL,
	"company_share" integer NOT NULL,
	"notes" text,
	"user_id" uuid,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_sales_month_first_day" CHECK (extract(day from "app_sales"."month") = 1),
	CONSTRAINT "app_sales_counts_positive" CHECK ("app_sales"."new_sales" >= 0 and "app_sales"."active_subscribers" >= 0 and "app_sales"."cancellations" >= 0),
	CONSTRAINT "app_sales_values_positive" CHECK ("app_sales"."gross_revenue" >= 0 and "app_sales"."platform_fees" >= 0 and "app_sales"."refunds" >= 0),
	CONSTRAINT "app_sales_company_share_range" CHECK ("app_sales"."company_share" between 0 and 100)
);
--> statement-breakpoint
ALTER TABLE "app_sales" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "apps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"expert_id" uuid,
	"partner_name" text NOT NULL,
	"partner_handle" text,
	"niche" text,
	"sales_platform" text,
	"monthly_price" numeric(12, 2),
	"company_share" integer NOT NULL,
	"status" "app_status" DEFAULT 'in_development' NOT NULL,
	"contract_date" date,
	"launch_date" date,
	"notes" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "apps_company_share_range" CHECK ("apps"."company_share" between 0 and 100),
	CONSTRAINT "apps_monthly_price_positive" CHECK ("apps"."monthly_price" >= 0)
);
--> statement-breakpoint
ALTER TABLE "apps" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "costs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"app_id" uuid,
	"spent_on" date NOT NULL,
	"category" "cost_category" NOT NULL,
	"supplier" text,
	"description" text,
	"amount" numeric(12, 2) NOT NULL,
	"shared" boolean DEFAULT false NOT NULL,
	"partner_share" integer,
	"user_id" uuid,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "costs_amount_positive" CHECK ("costs"."amount" > 0),
	CONSTRAINT "costs_shared_rules" CHECK (("costs"."shared" and "costs"."app_id" is not null and "costs"."partner_share" between 0 and 100) or (not "costs"."shared" and "costs"."partner_share" is null))
);
--> statement-breakpoint
ALTER TABLE "costs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app_sales" ADD CONSTRAINT "app_sales_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_sales" ADD CONSTRAINT "app_sales_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "apps" ADD CONSTRAINT "apps_expert_id_experts_id_fk" FOREIGN KEY ("expert_id") REFERENCES "public"."experts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "costs" ADD CONSTRAINT "costs_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "costs" ADD CONSTRAINT "costs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "app_sales_app_month_unique" ON "app_sales" USING btree ("app_id","month") WHERE "app_sales"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "app_sales_month_idx" ON "app_sales" USING btree ("month");--> statement-breakpoint
CREATE UNIQUE INDEX "apps_name_unique" ON "apps" USING btree (lower("name")) WHERE "apps"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "apps_expert_id_idx" ON "apps" USING btree ("expert_id");--> statement-breakpoint
CREATE INDEX "costs_app_id_idx" ON "costs" USING btree ("app_id");--> statement-breakpoint
CREATE INDEX "costs_spent_on_idx" ON "costs" USING btree ("spent_on");--> statement-breakpoint
CREATE POLICY "admin_can_select" ON "app_sales" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select public.is_admin()));--> statement-breakpoint
CREATE POLICY "admin_can_insert" ON "app_sales" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select public.is_admin()));--> statement-breakpoint
CREATE POLICY "admin_can_update" ON "app_sales" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select public.is_admin())) WITH CHECK ((select public.is_admin()));--> statement-breakpoint
CREATE POLICY "admin_can_select" ON "apps" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select public.is_admin()));--> statement-breakpoint
CREATE POLICY "admin_can_insert" ON "apps" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select public.is_admin()));--> statement-breakpoint
CREATE POLICY "admin_can_update" ON "apps" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select public.is_admin())) WITH CHECK ((select public.is_admin()));--> statement-breakpoint
CREATE POLICY "admin_can_select" ON "costs" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select public.is_admin()));--> statement-breakpoint
CREATE POLICY "admin_can_insert" ON "costs" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select public.is_admin()));--> statement-breakpoint
CREATE POLICY "admin_can_update" ON "costs" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select public.is_admin())) WITH CHECK ((select public.is_admin()));