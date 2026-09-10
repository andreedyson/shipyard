-- The previous migration uses a temporary default to backfill existing rows.
-- New deployments must always receive their environment from apps.config.ts.
ALTER TABLE "Deploy" ALTER COLUMN "environment" DROP DEFAULT;
