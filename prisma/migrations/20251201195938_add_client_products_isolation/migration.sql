-- CreateTable
CREATE TABLE "client_products" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "customPrice" DOUBLE PRECISION NOT NULL,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "client_products_clientId_idx" ON "client_products"("clientId");

-- CreateIndex
CREATE INDEX "client_products_productId_idx" ON "client_products"("productId");

-- CreateIndex
CREATE INDEX "client_products_isVisible_idx" ON "client_products"("isVisible");

-- CreateIndex
CREATE UNIQUE INDEX "client_products_clientId_productId_key" ON "client_products"("clientId", "productId");

-- CreateIndex
CREATE INDEX "orders_clientId_status_totalAmount_idx" ON "orders"("clientId", "status", "totalAmount");

-- AddForeignKey
ALTER TABLE "client_products" ADD CONSTRAINT "client_products_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_products" ADD CONSTRAINT "client_products_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
