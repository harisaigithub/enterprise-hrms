-- AlterTable
ALTER TABLE "BGVVerification" ADD COLUMN     "candidate_document_id" UUID;

-- CreateIndex
CREATE INDEX "BGVVerification_candidate_document_id_idx" ON "BGVVerification"("candidate_document_id");

-- AddForeignKey
ALTER TABLE "BGVVerification" ADD CONSTRAINT "BGVVerification_candidate_document_id_fkey" FOREIGN KEY ("candidate_document_id") REFERENCES "candidate_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
