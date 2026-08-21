ALTER TABLE "accounts" ADD COLUMN "issuer" text;--> statement-breakpoint
UPDATE "accounts"
SET "account_id" = "user_id"
WHERE "provider_id" = 'credential' AND "account_id" <> "user_id";--> statement-breakpoint
UPDATE "accounts"
SET "issuer" = CASE
	WHEN "provider_id" = 'credential' THEN 'local:credential'
	WHEN "provider_id" = 'google' THEN 'https://accounts.google.com'
	WHEN "provider_id" = 'github' THEN 'local:oauth:github'
END
WHERE "issuer" IS NULL;--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM "accounts" WHERE "issuer" IS NULL) THEN
		RAISE EXCEPTION 'Cannot migrate Better Auth accounts: unknown provider_id requires an explicit issuer mapping';
	END IF;
END
$$;--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM (
			SELECT "issuer", "account_id"
			FROM "accounts"
			GROUP BY "issuer", "account_id"
			HAVING COUNT(*) > 1
		) AS "identity_conflicts"
	) THEN
		RAISE EXCEPTION 'Cannot migrate Better Auth accounts: duplicate issuer/account_id identities found';
	END IF;
END
$$;--> statement-breakpoint
ALTER TABLE "accounts" ALTER COLUMN "issuer" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_issuer_account_id_idx" ON "accounts" USING btree ("issuer","account_id");
