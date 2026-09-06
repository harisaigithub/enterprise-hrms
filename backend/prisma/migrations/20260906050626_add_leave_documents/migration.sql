-- AlterTable
ALTER TABLE "compliance_cases" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "compliance_obligations" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "compliance_retention_records" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "leave_requests" ADD COLUMN     "document_mime_type" VARCHAR(100),
ADD COLUMN     "document_name" VARCHAR(255),
ADD COLUMN     "document_size" INTEGER,
ADD COLUMN     "document_url" TEXT;

-- AlterTable
ALTER TABLE "policies" ALTER COLUMN "updated_at" DROP DEFAULT;
