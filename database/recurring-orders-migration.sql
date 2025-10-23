-- CreateEnum
CREATE TYPE "RecurringFrequency" AS ENUM ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'CUSTOM');

-- CreateTable
CREATE TABLE "recurring_orders" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "frequency" "RecurringFrequency" NOT NULL,
    "customDays" INTEGER,
    "dayOfWeek" INTEGER,
    "dayOfMonth" INTEGER,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "nextExecutionDate" TIMESTAMP(3) NOT NULL,
    "lastExecutionDate" TIMESTAMP(3),
    "notes" TEXT,
    "deliveryInstructions" TEXT,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "executionCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurring_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurring_order_items" (
    "id" TEXT NOT NULL,
    "recurringOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "pricePerUnit" DOUBLE PRECISION NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurring_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurring_order_executions" (
    "id" TEXT NOT NULL,
    "recurringOrderId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recurring_order_executions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recurring_orders_clientId_idx" ON "recurring_orders"("clientId");

-- CreateIndex
CREATE INDEX "recurring_orders_nextExecutionDate_idx" ON "recurring_orders"("nextExecutionDate");

-- CreateIndex
CREATE INDEX "recurring_orders_isActive_idx" ON "recurring_orders"("isActive");

-- CreateIndex
CREATE INDEX "recurring_order_items_recurringOrderId_idx" ON "recurring_order_items"("recurringOrderId");

-- CreateIndex
CREATE INDEX "recurring_order_items_productId_idx" ON "recurring_order_items"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "recurring_order_executions_orderId_key" ON "recurring_order_executions"("orderId");

-- CreateIndex
CREATE INDEX "recurring_order_executions_recurringOrderId_idx" ON "recurring_order_executions"("recurringOrderId");

-- CreateIndex
CREATE INDEX "recurring_order_executions_executedAt_idx" ON "recurring_order_executions"("executedAt");

-- AddForeignKey
ALTER TABLE "recurring_orders" ADD CONSTRAINT "recurring_orders_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_order_items" ADD CONSTRAINT "recurring_order_items_recurringOrderId_fkey" FOREIGN KEY ("recurringOrderId") REFERENCES "recurring_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_order_items" ADD CONSTRAINT "recurring_order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_order_executions" ADD CONSTRAINT "recurring_order_executions_recurringOrderId_fkey" FOREIGN KEY ("recurringOrderId") REFERENCES "recurring_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_order_executions" ADD CONSTRAINT "recurring_order_executions_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
