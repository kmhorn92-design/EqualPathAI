CREATE TYPE "public"."booking_status" AS ENUM('REQUESTED', 'CONFIRMED', 'DECLINED', 'CANCELLED', 'COMPLETED');--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" text PRIMARY KEY NOT NULL,
	"coach_id" text NOT NULL,
	"user_id" text NOT NULL,
	"session_type" text NOT NULL,
	"format" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"arrangement" "work_mode",
	"goal_enc" text,
	"accessibility_enc" text,
	"shared_resume_version_id" text,
	"status" "booking_status" DEFAULT 'REQUESTED' NOT NULL,
	"meeting_url" text,
	"coach_note_enc" text,
	"client_timezone" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coach_availability" (
	"id" text PRIMARY KEY NOT NULL,
	"coach_id" text NOT NULL,
	"weekday" integer NOT NULL,
	"start_minute" integer NOT NULL,
	"end_minute" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "coaches" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "coaches" ADD COLUMN "focus" "work_mode"[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "coaches" ADD COLUMN "formats" text[] DEFAULT '{video}' NOT NULL;--> statement-breakpoint
ALTER TABLE "coaches" ADD COLUMN "timezone" text DEFAULT 'America/New_York' NOT NULL;--> statement-breakpoint
ALTER TABLE "coaches" ADD COLUMN "booking_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_coach_id_coaches_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."coaches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_shared_resume_version_id_resume_versions_id_fk" FOREIGN KEY ("shared_resume_version_id") REFERENCES "public"."resume_versions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_availability" ADD CONSTRAINT "coach_availability_coach_id_coaches_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."coaches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bookings_coach_idx" ON "bookings" USING btree ("coach_id","starts_at");--> statement-breakpoint
CREATE INDEX "bookings_user_idx" ON "bookings" USING btree ("user_id","starts_at");--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_active_slot_uq" ON "bookings" USING btree ("coach_id","starts_at") WHERE status in ('REQUESTED','CONFIRMED');--> statement-breakpoint
CREATE INDEX "availability_coach_idx" ON "coach_availability" USING btree ("coach_id");--> statement-breakpoint
ALTER TABLE "coaches" ADD CONSTRAINT "coaches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "coaches_user_uq" ON "coaches" USING btree ("user_id");