CREATE TABLE "password_setup_tokens" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "token_hash" VARCHAR(64) NOT NULL,
  "expires_at" TIMESTAMP(6) NOT NULL,
  "used_at" TIMESTAMP(6),
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "password_setup_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "password_setup_tokens_token_hash_key" ON "password_setup_tokens"("token_hash");
CREATE INDEX "password_setup_tokens_user_id_expires_at_idx" ON "password_setup_tokens"("user_id", "expires_at");
ALTER TABLE "password_setup_tokens" ADD CONSTRAINT "password_setup_tokens_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
