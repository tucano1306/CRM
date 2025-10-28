/*
  Warnings:

  - You are about to drop the `product_ratings` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "product_ratings" DROP CONSTRAINT "product_ratings_client_id_fkey";

-- DropForeignKey
ALTER TABLE "product_ratings" DROP CONSTRAINT "product_ratings_order_id_fkey";

-- DropForeignKey
ALTER TABLE "product_ratings" DROP CONSTRAINT "product_ratings_product_id_fkey";

-- DropTable
DROP TABLE "product_ratings";

-- CreateTable
CREATE TABLE "order_ratings" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "order_ratings_order_id_key" ON "order_ratings"("order_id");

-- CreateIndex
CREATE INDEX "order_ratings_client_id_idx" ON "order_ratings"("client_id");

-- CreateIndex
CREATE INDEX "order_ratings_rating_idx" ON "order_ratings"("rating");

-- CreateIndex
CREATE INDEX "order_ratings_created_at_idx" ON "order_ratings"("created_at");

-- AddForeignKey
ALTER TABLE "order_ratings" ADD CONSTRAINT "order_ratings_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_ratings" ADD CONSTRAINT "order_ratings_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
