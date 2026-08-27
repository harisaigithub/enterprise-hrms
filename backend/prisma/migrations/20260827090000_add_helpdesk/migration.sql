CREATE TABLE "helpdesk_tickets" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "ticket_number" VARCHAR(20) NOT NULL,
  "requester_id" UUID NOT NULL, "assigned_to_id" UUID, "category" VARCHAR(50) NOT NULL,
  "queue" VARCHAR(80) NOT NULL, "subject" VARCHAR(160) NOT NULL, "description" TEXT NOT NULL,
  "priority" VARCHAR(20) NOT NULL DEFAULT 'Medium', "status" VARCHAR(30) NOT NULL DEFAULT 'Open',
  "is_confidential" BOOLEAN NOT NULL DEFAULT false, "attachment_file_name" VARCHAR(255),
  "sla_deadline" TIMESTAMP(6) NOT NULL, "resolution_notes" TEXT, "resolved_at" TIMESTAMP(6),
  "closed_at" TIMESTAMP(6), "reopened_at" TIMESTAMP(6), "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL, CONSTRAINT "helpdesk_tickets_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "helpdesk_comments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "ticket_id" UUID NOT NULL, "author_id" UUID NOT NULL,
  "message" TEXT NOT NULL, "is_internal" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "helpdesk_comments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "helpdesk_tickets_ticket_number_key" ON "helpdesk_tickets"("ticket_number");
CREATE INDEX "helpdesk_tickets_requester_id_created_at_idx" ON "helpdesk_tickets"("requester_id", "created_at");
CREATE INDEX "helpdesk_tickets_queue_status_idx" ON "helpdesk_tickets"("queue", "status");
CREATE INDEX "helpdesk_tickets_assigned_to_id_idx" ON "helpdesk_tickets"("assigned_to_id");
CREATE INDEX "helpdesk_tickets_sla_deadline_idx" ON "helpdesk_tickets"("sla_deadline");
CREATE INDEX "helpdesk_comments_ticket_id_created_at_idx" ON "helpdesk_comments"("ticket_id", "created_at");
CREATE INDEX "helpdesk_comments_author_id_idx" ON "helpdesk_comments"("author_id");
ALTER TABLE "helpdesk_tickets" ADD CONSTRAINT "helpdesk_tickets_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "helpdesk_tickets" ADD CONSTRAINT "helpdesk_tickets_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "helpdesk_comments" ADD CONSTRAINT "helpdesk_comments_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "helpdesk_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "helpdesk_comments" ADD CONSTRAINT "helpdesk_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
