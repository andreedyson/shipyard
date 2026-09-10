-- AlterTable
ALTER TABLE "App"
ADD COLUMN "currentRevision" TEXT,
ADD COLUMN "previousRevision" TEXT;

-- AlterTable
ALTER TABLE "Deploy"
ADD COLUMN "stage" TEXT NOT NULL DEFAULT 'queued',
ADD COLUMN "action" TEXT NOT NULL DEFAULT 'deploy',
ADD COLUMN "environment" TEXT NOT NULL DEFAULT 'production',
ADD COLUMN "logBytes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "branch" TEXT,
ADD COLUMN "revision" TEXT,
ADD COLUMN "previousRevision" TEXT,
ADD COLUMN "commitMessage" TEXT,
ADD COLUMN "requestedBy" TEXT NOT NULL DEFAULT 'pin-user',
ADD COLUMN "requesterIp" TEXT,
ADD COLUMN "exitCode" INTEGER,
ADD COLUMN "failureSummary" TEXT,
ADD COLUMN "heartbeatAt" TIMESTAMP(3),
ADD COLUMN "startedAt" TIMESTAMP(3),
ADD COLUMN "finishedAt" TIMESTAMP(3),
ADD COLUMN "durationMs" INTEGER,
ADD COLUMN "cancelledAt" TIMESTAMP(3);

UPDATE "Deploy" SET "logBytes" = OCTET_LENGTH("logs");

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "appName" TEXT,
    "deployId" TEXT,
    "actor" TEXT NOT NULL,
    "requesterIp" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- Prevent concurrent active deployments for one app at the database layer.
CREATE UNIQUE INDEX "Deploy_one_active_per_app_key"
ON "Deploy"("appId")
WHERE "status" IN ('queued', 'running', 'verifying');

CREATE INDEX "Deploy_createdAt_idx" ON "Deploy"("createdAt");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
