-- CreateEnum
CREATE TYPE "ConnectionRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'CONNECTION_REQUEST';
ALTER TYPE "NotificationType" ADD VALUE 'CONNECTION_ACCEPTED';
ALTER TYPE "NotificationType" ADD VALUE 'CONNECTION_REJECTED';

-- CreateTable
CREATE TABLE "connection_requests" (
    "id" TEXT NOT NULL,
    "buyerClerkId" TEXT NOT NULL,
    "buyerName" TEXT NOT NULL,
    "buyerEmail" TEXT NOT NULL,
    "buyerPhone" TEXT,
    "buyerAddress" TEXT,
    "sellerId" TEXT NOT NULL,
    "status" "ConnectionRequestStatus" NOT NULL DEFAULT 'PENDING',
    "invitationToken" TEXT,
    "responseNote" TEXT,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "connection_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "connection_requests_sellerId_idx" ON "connection_requests"("sellerId");

-- CreateIndex
CREATE INDEX "connection_requests_buyerClerkId_idx" ON "connection_requests"("buyerClerkId");

-- CreateIndex
CREATE INDEX "connection_requests_status_idx" ON "connection_requests"("status");

-- CreateIndex
CREATE INDEX "connection_requests_sellerId_status_idx" ON "connection_requests"("sellerId", "status");

-- CreateIndex
CREATE INDEX "connection_requests_createdAt_idx" ON "connection_requests"("createdAt");
