-- CreateEnum
CREATE TYPE "OrderIssueType" AS ENUM ('OUT_OF_STOCK', 'PARTIAL_STOCK', 'DISCONTINUED', 'PRICE_CHANGE', 'OTHER');

-- CreateEnum
CREATE TYPE "OrderIssueStatus" AS ENUM ('PENDING', 'BUYER_NOTIFIED', 'NEGOTIATING', 'ACCEPTED', 'REJECTED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'SMS', 'WHATSAPP', 'PUSH', 'ALL');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OrderStatus" ADD VALUE 'REVIEWING';
ALTER TYPE "OrderStatus" ADD VALUE 'ISSUE_REPORTED';
ALTER TYPE "OrderStatus" ADD VALUE 'LOCKED';

-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "preferredChannel" "NotificationChannel" NOT NULL DEFAULT 'EMAIL',
ADD COLUMN     "whatsappNumber" TEXT;

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "availableQty" INTEGER,
ADD COLUMN     "issueNote" TEXT;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "hasIssues" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lockedAt" TIMESTAMP(3),
ADD COLUMN     "lockedBy" TEXT,
ADD COLUMN     "reviewStartedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "order_issues" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "issueType" "OrderIssueType" NOT NULL,
    "description" TEXT NOT NULL,
    "productId" TEXT,
    "productName" TEXT,
    "requestedQty" INTEGER,
    "availableQty" INTEGER,
    "proposedSolution" TEXT,
    "substituteProductId" TEXT,
    "substituteProductName" TEXT,
    "status" "OrderIssueStatus" NOT NULL DEFAULT 'PENDING',
    "buyerResponse" TEXT,
    "buyerAccepted" BOOLEAN,
    "reportedBy" TEXT NOT NULL,
    "resolvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "order_issues_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "order_issues_orderId_idx" ON "order_issues"("orderId");

-- CreateIndex
CREATE INDEX "order_issues_status_idx" ON "order_issues"("status");

-- CreateIndex
CREATE INDEX "order_issues_productId_idx" ON "order_issues"("productId");

-- AddForeignKey
ALTER TABLE "order_issues" ADD CONSTRAINT "order_issues_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
