-- CreateEnum
CREATE TYPE "BGVFieldMatchStatus" AS ENUM ('NOT_CHECKED', 'MATCH', 'MISMATCH', 'MISSING', 'NOT_APPLICABLE');

-- CreateTable
CREATE TABLE "BGVVerificationField" (
    "id" UUID NOT NULL,
    "verification_id" UUID NOT NULL,
    "field_name" TEXT NOT NULL,
    "expected_value" TEXT,
    "actual_value" TEXT,
    "match_status" "BGVFieldMatchStatus" NOT NULL,
    "remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BGVVerificationField_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BGVVerificationField_verification_id_idx" ON "BGVVerificationField"("verification_id");

-- CreateIndex
CREATE INDEX "BGVVerificationField_field_name_idx" ON "BGVVerificationField"("field_name");

-- AddForeignKey
ALTER TABLE "BGVVerificationField" ADD CONSTRAINT "BGVVerificationField_verification_id_fkey" FOREIGN KEY ("verification_id") REFERENCES "BGVVerification"("id") ON DELETE CASCADE ON UPDATE CASCADE;
