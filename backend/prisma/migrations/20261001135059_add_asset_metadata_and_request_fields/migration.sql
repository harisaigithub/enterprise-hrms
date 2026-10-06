-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "conditionNotes" TEXT,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "purchaseCost" DECIMAL(12,2),
ADD COLUMN     "purchaseDate" TIMESTAMP(3),
ADD COLUMN     "vendor" TEXT,
ADD COLUMN     "warrantyExpiry" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "AssetRequest" ADD COLUMN     "assetType" TEXT,
ADD COLUMN     "attachmentUrl" TEXT,
ADD COLUMN     "costCenter" TEXT,
ADD COLUMN     "deliveryLocation" TEXT,
ADD COLUMN     "model" TEXT,
ADD COLUMN     "neededBy" TIMESTAMP(3),
ADD COLUMN     "quantity" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "replacementAssetId" UUID,
ADD COLUMN     "requestType" TEXT;

-- AlterTable
ALTER TABLE "attendance_regularizations" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ess_tax_declarations" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "security_state" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "travel_requests" ALTER COLUMN "updated_at" DROP DEFAULT;

-- RenameIndex
ALTER INDEX "attendance_regularization_history_regularization_id_created_at_" RENAME TO "attendance_regularization_history_regularization_id_created_idx";
