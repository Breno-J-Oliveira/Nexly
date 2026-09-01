-- Migration: Add all missing columns and tables from schema evolution
-- This bridges the gap between the initial migration and the current schema

-- 1. User.permissions (granular RBAC)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- 2. Tenant.slug (unique identifier)
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "slug" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Tenant_slug_key" ON "Tenant"("slug");

-- 3. Webhook.userId (FK to User, required by schema)
ALTER TABLE "Webhook" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "Webhook" ADD CONSTRAINT "Webhook_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "Webhook_userId_idx" ON "Webhook"("userId");

-- 4. RefreshToken revoked index (C3 fix: token cleanup queries)
CREATE INDEX IF NOT EXISTS "RefreshToken_revoked_idx" ON "RefreshToken"("revoked");

-- 5. TenantInvitation table
CREATE TABLE IF NOT EXISTS "TenantInvitation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "token" TEXT NOT NULL,
    "invitedBy" TEXT NOT NULL,
    "accepted" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TenantInvitation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "TenantInvitation_token_key" ON "TenantInvitation"("token");
CREATE INDEX IF NOT EXISTS "TenantInvitation_tenantId_idx" ON "TenantInvitation"("tenantId");
CREATE INDEX IF NOT EXISTS "TenantInvitation_email_idx" ON "TenantInvitation"("email");
CREATE INDEX IF NOT EXISTS "TenantInvitation_expiresAt_idx" ON "TenantInvitation"("expiresAt");
ALTER TABLE "TenantInvitation" ADD CONSTRAINT "TenantInvitation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 6. WebhookDelivery table
CREATE TABLE IF NOT EXISTS "WebhookDelivery" (
    "id" TEXT NOT NULL,
    "webhookId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "statusCode" INTEGER,
    "attempt" INTEGER NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "WebhookDelivery_webhookId_idx" ON "WebhookDelivery"("webhookId");
CREATE INDEX IF NOT EXISTS "WebhookDelivery_event_idx" ON "WebhookDelivery"("event");
CREATE INDEX IF NOT EXISTS "WebhookDelivery_createdAt_idx" ON "WebhookDelivery"("createdAt");
ALTER TABLE "WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_webhookId_fkey" FOREIGN KEY ("webhookId") REFERENCES "Webhook"("id") ON DELETE CASCADE ON UPDATE CASCADE;