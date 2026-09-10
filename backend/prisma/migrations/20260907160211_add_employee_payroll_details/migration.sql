-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "bank_account" VARCHAR(50),
ADD COLUMN     "bank_name" VARCHAR(120),
ADD COLUMN     "ifsc" VARCHAR(20),
ADD COLUMN     "pan" VARCHAR(20),
ADD COLUMN     "pf_account" VARCHAR(50),
ADD COLUMN     "uan" VARCHAR(20);
