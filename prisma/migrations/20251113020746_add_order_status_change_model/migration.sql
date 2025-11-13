-- CreateTable
CREATE TABLE "order_status_changes" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "oldStatus" "OrderStatus" NOT NULL,
    "newStatus" "OrderStatus" NOT NULL,
    "changedBy" TEXT NOT NULL,
    "reason" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_status_changes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "order_status_changes_idempotencyKey_key" ON "order_status_changes"("idempotencyKey");

-- CreateIndex
CREATE INDEX "order_status_changes_orderId_idx" ON "order_status_changes"("orderId");

-- CreateIndex
CREATE INDEX "order_status_changes_idempotencyKey_idx" ON "order_status_changes"("idempotencyKey");
