-- AlterTable
ALTER TABLE "BGVVerification" ADD COLUMN     "candidate_action_message" TEXT,
ADD COLUMN     "candidate_responded_at" TIMESTAMP(6),
ADD COLUMN     "candidate_response" TEXT;

-- AlterTable
ALTER TABLE "candidates" ADD COLUMN     "college_name" VARCHAR(200),
ADD COLUMN     "current_company" VARCHAR(200),
ADD COLUMN     "current_designation" VARCHAR(150),
ADD COLUMN     "current_location" VARCHAR(150),
ADD COLUMN     "degree" VARCHAR(150),
ADD COLUMN     "expected_salary" DECIMAL(12,2),
ADD COLUMN     "highest_education" VARCHAR(100),
ADD COLUMN     "notice_period_days" INTEGER,
ADD COLUMN     "passing_year" INTEGER,
ADD COLUMN     "resume_file_name" VARCHAR(255),
ADD COLUMN     "resume_file_size" INTEGER,
ADD COLUMN     "resume_file_url" TEXT,
ADD COLUMN     "resume_mime_type" VARCHAR(100),
ADD COLUMN     "resume_object_key" TEXT,
ADD COLUMN     "specialization" VARCHAR(150),
ADD COLUMN     "total_experience_years" DECIMAL(5,2);
