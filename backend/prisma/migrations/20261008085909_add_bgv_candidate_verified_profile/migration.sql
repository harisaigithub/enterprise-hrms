/*
  Warnings:

  - A unique constraint covering the columns `[verification_id,field_name]` on the table `BGVVerificationField` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "candidates" ADD COLUMN     "address" TEXT,
ADD COLUMN     "city" VARCHAR(100),
ADD COLUMN     "country" VARCHAR(100) DEFAULT 'India',
ADD COLUMN     "date_of_birth" DATE,
ADD COLUMN     "father_name" VARCHAR(150),
ADD COLUMN     "gender" VARCHAR(20),
ADD COLUMN     "mother_name" VARCHAR(150),
ADD COLUMN     "postal_code" VARCHAR(20),
ADD COLUMN     "state" VARCHAR(100);

-- CreateIndex
CREATE UNIQUE INDEX "BGVVerificationField_verification_id_field_name_key" ON "BGVVerificationField"("verification_id", "field_name");
