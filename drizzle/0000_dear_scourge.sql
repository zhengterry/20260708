CREATE TABLE "api_sync_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" uuid NOT NULL,
	"api_name" varchar(100) NOT NULL,
	"method" varchar(10) NOT NULL,
	"url_summary" text NOT NULL,
	"request_body" jsonb,
	"response_status" integer,
	"response_body" jsonb,
	"duration_ms" integer,
	"error_message" text,
	"error_type" varchar(50),
	"is_success" boolean NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"config_key" varchar(50) NOT NULL,
	"config_value" varchar(200) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "approval_config_config_key_unique" UNIQUE("config_key")
);
--> statement-breakpoint
CREATE TABLE "approval_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"ticket_version" integer NOT NULL,
	"approver_id" varchar(50) NOT NULL,
	"approval_level" integer NOT NULL,
	"action" varchar(20) NOT NULL,
	"comment" text,
	"result" varchar(20) NOT NULL,
	"ai_suggestion" text,
	"ai_basis" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "compensation_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"approval_id" integer,
	"direction" varchar(30) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"reason" text,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"reconciliation_ref" varchar(200),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exception_tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_no" varchar(50) NOT NULL,
	"waybill_no" varchar(50) NOT NULL,
	"exception_type" varchar(50) NOT NULL,
	"exception_subtype" varchar(50) NOT NULL,
	"source" varchar(20) NOT NULL,
	"description" text,
	"amount" numeric(12, 2),
	"severity" varchar(20) DEFAULT 'minor' NOT NULL,
	"current_status" varchar(30) DEFAULT 'pending_approval' NOT NULL,
	"status_log" jsonb NOT NULL,
	"submitter_id" varchar(50) NOT NULL,
	"assignee_id" varchar(50),
	"current_level" integer DEFAULT 1,
	"reject_count" integer DEFAULT 0,
	"max_rejects" integer DEFAULT 3 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"overdue_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "exception_tickets_ticket_no_unique" UNIQUE("ticket_no")
);
--> statement-breakpoint
CREATE TABLE "inventory" (
	"id" serial PRIMARY KEY NOT NULL,
	"sku_code" varchar(100) NOT NULL,
	"batch_no" varchar(100),
	"available_qty" integer DEFAULT 0 NOT NULL,
	"locked_qty" integer DEFAULT 0 NOT NULL,
	"total_qty" integer DEFAULT 0 NOT NULL,
	"last_change_ref" varchar(200),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"sku_code" varchar(100) NOT NULL,
	"batch_no" varchar(100),
	"change_type" varchar(30) NOT NULL,
	"change_qty" integer NOT NULL,
	"before_qty" integer NOT NULL,
	"after_qty" integer NOT NULL,
	"ref_type" varchar(50) NOT NULL,
	"ref_id" integer NOT NULL,
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qc_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"rule_code" varchar(50) NOT NULL,
	"rule_name" varchar(200) NOT NULL,
	"exception_type" varchar(50) NOT NULL,
	"condition_config" jsonb NOT NULL,
	"severity" varchar(20) DEFAULT 'minor' NOT NULL,
	"auto_create_ticket" boolean DEFAULT true NOT NULL,
	"default_approval_level" integer DEFAULT 2 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "qc_rules_rule_code_unique" UNIQUE("rule_code")
);
--> statement-breakpoint
CREATE TABLE "scan_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"scan_id" uuid NOT NULL,
	"waybill_no" varchar(50) NOT NULL,
	"sku_code" varchar(100) NOT NULL,
	"batch_no" varchar(100),
	"qty_scanned" integer NOT NULL,
	"qty_expected" integer,
	"is_defective" boolean DEFAULT false,
	"defect_level" integer,
	"spec_deviation" text,
	"qc_result" varchar(20) DEFAULT 'pending' NOT NULL,
	"qc_rule_hit_id" integer,
	"qc_reason" text,
	"batch_locked" boolean DEFAULT false NOT NULL,
	"ticket_id" integer,
	"operator_id" varchar(50) NOT NULL,
	"device_id" varchar(100),
	"scanned_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "scan_records_scan_id_unique" UNIQUE("scan_id")
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(50) NOT NULL,
	"role" varchar(30) NOT NULL,
	"warehouse_id" varchar(50),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "waybill_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"waybill_no" varchar(50) NOT NULL,
	"sender_info" jsonb,
	"receiver_info" jsonb,
	"amount" numeric(12, 2),
	"sku_list" jsonb,
	"v2_version" integer DEFAULT 1,
	"sync_source" varchar(20) DEFAULT 'api' NOT NULL,
	"synced_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "waybill_snapshots_waybill_no_unique" UNIQUE("waybill_no")
);
--> statement-breakpoint
CREATE INDEX "idx_asl_api_name" ON "api_sync_logs" USING btree ("api_name");--> statement-breakpoint
CREATE INDEX "idx_asl_created_at" ON "api_sync_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_asl_request_id" ON "api_sync_logs" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "idx_ar_ticket_id" ON "approval_records" USING btree ("ticket_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_ar_unique_op" ON "approval_records" USING btree ("ticket_id","ticket_version","action");--> statement-breakpoint
CREATE INDEX "idx_cr_ticket_id" ON "compensation_records" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "idx_cr_approval_id" ON "compensation_records" USING btree ("approval_id");--> statement-breakpoint
CREATE INDEX "idx_et_status" ON "exception_tickets" USING btree ("current_status");--> statement-breakpoint
CREATE INDEX "idx_et_waybill" ON "exception_tickets" USING btree ("waybill_no");--> statement-breakpoint
CREATE INDEX "idx_et_assignee" ON "exception_tickets" USING btree ("assignee_id");--> statement-breakpoint
CREATE INDEX "idx_et_source" ON "exception_tickets" USING btree ("source");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_et_unique_active" ON "exception_tickets" USING btree ("waybill_no","exception_subtype","source");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_inv_sku_batch" ON "inventory" USING btree ("sku_code","batch_no");--> statement-breakpoint
CREATE INDEX "idx_il_ref" ON "inventory_logs" USING btree ("ref_type","ref_id");--> statement-breakpoint
CREATE INDEX "idx_sr_ticket_id" ON "scan_records" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "idx_sr_waybill_sku" ON "scan_records" USING btree ("waybill_no","sku_code");--> statement-breakpoint
CREATE INDEX "idx_sr_batch_locked" ON "scan_records" USING btree ("batch_locked");--> statement-breakpoint
CREATE INDEX "idx_ur_user" ON "user_roles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_ur_role" ON "user_roles" USING btree ("role");--> statement-breakpoint
CREATE INDEX "idx_ws_waybill_no" ON "waybill_snapshots" USING btree ("waybill_no");--> statement-breakpoint
CREATE INDEX "idx_ws_synced_at" ON "waybill_snapshots" USING btree ("synced_at");