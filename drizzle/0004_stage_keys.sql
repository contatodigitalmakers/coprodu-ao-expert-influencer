ALTER TABLE "loss_reasons" ADD COLUMN "key" text;--> statement-breakpoint
ALTER TABLE "stages" ADD COLUMN "key" text;--> statement-breakpoint
ALTER TABLE "loss_reasons" ADD CONSTRAINT "loss_reasons_key_unique" UNIQUE("key");--> statement-breakpoint
ALTER TABLE "stages" ADD CONSTRAINT "stages_key_unique" UNIQUE("key");