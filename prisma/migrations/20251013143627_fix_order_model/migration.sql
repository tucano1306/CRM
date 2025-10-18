/*
  Warnings:

  - You are about to alter the column `totalAmount` on the `orders` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - A unique constraint covering the columns `[idempotencyKey]` on the table `orders` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED');

-- CreateEnum
CREATE TYPE "OrderConfirmationMethod" AS ENUM ('MANUAL', 'AUTOMATIC');

-- DropForeignKey
ALTER TABLE "public"."_ClientUsers" DROP CONSTRAINT "_ClientUsers_A_fkey";

-- DropForeignKey
ALTER TABLE "public"."_ClientUsers" DROP CONSTRAINT "_ClientUsers_B_fkey";

-- DropForeignKey
ALTER TABLE "public"."_SellerUsers" DROP CONSTRAINT "_SellerUsers_A_fkey";

-- DropForeignKey
ALTER TABLE "public"."_SellerUsers" DROP CONSTRAINT "_SellerUsers_B_fkey";

-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "orderConfirmationMethod" "OrderConfirmationMethod" NOT NULL DEFAULT 'MANUAL';

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "confirmationDeadline" TIMESTAMP(3),
ADD COLUMN     "generalMessage" TEXT,
ADD COLUMN     "idempotencyKey" TEXT,
ALTER COLUMN "totalAmount" SET DATA TYPE DECIMAL(10,2);

-- CreateTable
CREATE TABLE "order_schedules" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "dayOfWeek" "DayOfWeek" NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_schedules" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "dayOfWeek" "DayOfWeek" NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_status_updates" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "oldStatus" "OrderStatus" NOT NULL,
    "newStatus" "OrderStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_status_updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_items" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "price" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "order_schedules_sellerId_idx" ON "order_schedules"("sellerId");

-- CreateIndex
CREATE INDEX "order_schedules_dayOfWeek_idx" ON "order_schedules"("dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "order_schedules_sellerId_dayOfWeek_key" ON "order_schedules"("sellerId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "chat_schedules_sellerId_idx" ON "chat_schedules"("sellerId");

-- CreateIndex
CREATE INDEX "chat_schedules_dayOfWeek_idx" ON "chat_schedules"("dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "chat_schedules_sellerId_dayOfWeek_key" ON "chat_schedules"("sellerId", "dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "order_status_updates_idempotencyKey_key" ON "order_status_updates"("idempotencyKey");

-- CreateIndex
CREATE INDEX "order_status_updates_orderId_idx" ON "order_status_updates"("orderId");

-- CreateIndex
CREATE INDEX "order_status_updates_idempotencyKey_idx" ON "order_status_updates"("idempotencyKey");

-- CreateIndex
CREATE INDEX "carts_userId_idx" ON "carts"("userId");

-- CreateIndex
CREATE INDEX "cart_items_cartId_idx" ON "cart_items"("cartId");

-- CreateIndex
CREATE INDEX "cart_items_productId_idx" ON "cart_items"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "cart_items_cartId_productId_key" ON "cart_items"("cartId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "orders_idempotencyKey_key" ON "orders"("idempotencyKey");

-- AddForeignKey
ALTER TABLE "order_schedules" ADD CONSTRAINT "order_schedules_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "sellers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_schedules" ADD CONSTRAINT "chat_schedules_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "sellers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_updates" ADD CONSTRAINT "order_status_updates_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ClientUsers" ADD CONSTRAINT "_ClientUsers_A_fkey" FOREIGN KEY ("A") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ClientUsers" ADD CONSTRAINT "_ClientUsers_B_fkey" FOREIGN KEY ("B") REFERENCES "authenticated_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SellerUsers" ADD CONSTRAINT "_SellerUsers_A_fkey" FOREIGN KEY ("A") REFERENCES "sellers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SellerUsers" ADD CONSTRAINT "_SellerUsers_B_fkey" FOREIGN KEY ("B") REFERENCES "authenticated_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
