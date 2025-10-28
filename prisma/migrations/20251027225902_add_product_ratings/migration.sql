-- CreateTable
CREATE TABLE "product_ratings" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "order_id" TEXT,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_ratings_product_id_idx" ON "product_ratings"("product_id");

-- CreateIndex
CREATE INDEX "product_ratings_client_id_idx" ON "product_ratings"("client_id");

-- CreateIndex
CREATE INDEX "product_ratings_rating_idx" ON "product_ratings"("rating");

-- CreateIndex
CREATE INDEX "product_ratings_created_at_idx" ON "product_ratings"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "product_ratings_product_id_client_id_order_id_key" ON "product_ratings"("product_id", "client_id", "order_id");

-- AddForeignKey
ALTER TABLE "product_ratings" ADD CONSTRAINT "product_ratings_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_ratings" ADD CONSTRAINT "product_ratings_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_ratings" ADD CONSTRAINT "product_ratings_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
