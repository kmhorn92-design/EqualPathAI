CREATE TABLE "partners" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"industry" text NOT NULL,
	"description" text NOT NULL,
	"website" text,
	"brand_color" text DEFAULT '#8B5CF6' NOT NULL,
	"hiring_for" text[] DEFAULT '{}' NOT NULL,
	"locations" text[] DEFAULT '{}' NOT NULL,
	"work_modes" "work_mode"[] DEFAULT '{}' NOT NULL,
	"job_company_names" text[] DEFAULT '{}' NOT NULL,
	"partner_since" text,
	"agreement_confirmed_at" timestamp with time zone,
	"agreement_confirmed_by" text,
	"status" "moderation_status" DEFAULT 'PENDING' NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "partners_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "recruiters" (
	"id" text PRIMARY KEY NOT NULL,
	"partner_id" text NOT NULL,
	"name" text NOT NULL,
	"title" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"specialties" text[] DEFAULT '{}' NOT NULL,
	"work_modes" "work_mode"[] DEFAULT '{}' NOT NULL,
	"linkedin_url" text,
	"consent_confirmed_at" timestamp with time zone NOT NULL,
	"consent_confirmed_by" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "recruiters" ADD CONSTRAINT "recruiters_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "recruiters_partner_idx" ON "recruiters" USING btree ("partner_id");