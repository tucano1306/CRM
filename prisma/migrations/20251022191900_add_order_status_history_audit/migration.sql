-- Migración: Eliminar PLACED del enum y crear tabla de auditoría de estados
-- Fecha: 2025-01-22

-- Paso 1: Crear un nuevo enum sin PLACED
CREATE TYPE "OrderStatus_new" AS ENUM (
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'READY_FOR_PICKUP',
  'IN_DELIVERY',
  'DELIVERED',
  'PARTIALLY_DELIVERED',
  'COMPLETED',
  'CANCELED',
  'PAYMENT_PENDING',
  'PAID'
);

-- Paso 2: Migrar tabla orders
-- Agregar columna temporal
ALTER TABLE "orders" ADD COLUMN "status_new" "OrderStatus_new";

-- Copiar datos con conversión
UPDATE "orders" SET "status_new" = ("status"::TEXT)::"OrderStatus_new";

-- Eliminar columna vieja y renombrar la nueva
ALTER TABLE "orders" DROP COLUMN "status";
ALTER TABLE "orders" RENAME COLUMN "status_new" TO "status";
ALTER TABLE "orders" ALTER COLUMN "status" SET NOT NULL;
ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'PENDING'::"OrderStatus_new";

-- Paso 3: Migrar tabla order_status_updates - oldStatus
ALTER TABLE "order_status_updates" ADD COLUMN "oldStatus_new" "OrderStatus_new";
UPDATE "order_status_updates" SET "oldStatus_new" = ("oldStatus"::TEXT)::"OrderStatus_new";
ALTER TABLE "order_status_updates" DROP COLUMN "oldStatus";
ALTER TABLE "order_status_updates" RENAME COLUMN "oldStatus_new" TO "oldStatus";
ALTER TABLE "order_status_updates" ALTER COLUMN "oldStatus" SET NOT NULL;

-- Paso 4: Migrar tabla order_status_updates - newStatus  
ALTER TABLE "order_status_updates" ADD COLUMN "newStatus_new" "OrderStatus_new";
UPDATE "order_status_updates" SET "newStatus_new" = ("newStatus"::TEXT)::"OrderStatus_new";
ALTER TABLE "order_status_updates" DROP COLUMN "newStatus";
ALTER TABLE "order_status_updates" RENAME COLUMN "newStatus_new" TO "newStatus";
ALTER TABLE "order_status_updates" ALTER COLUMN "newStatus" SET NOT NULL;

-- Paso 5: Eliminar el tipo viejo y renombrar el nuevo
DROP TYPE "OrderStatus";
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";

-- Paso 6: Crear tabla de historial de cambios de estado
CREATE TABLE "order_status_history" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "previousStatus" "OrderStatus",
    "newStatus" "OrderStatus" NOT NULL,
    "changedBy" TEXT NOT NULL,
    "changedByName" TEXT NOT NULL,
    "changedByRole" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id")
);

-- Paso 7: Crear índices para búsquedas rápidas
CREATE INDEX "order_status_history_orderId_idx" 
ON "order_status_history"("orderId");

CREATE INDEX "order_status_history_changedBy_idx" 
ON "order_status_history"("changedBy");

CREATE INDEX "order_status_history_createdAt_idx" 
ON "order_status_history"("createdAt");

CREATE INDEX "order_status_history_newStatus_idx" 
ON "order_status_history"("newStatus");

-- Paso 8: Agregar foreign key a orders
ALTER TABLE "order_status_history" 
ADD CONSTRAINT "order_status_history_orderId_fkey" 
FOREIGN KEY ("orderId") 
REFERENCES "orders"("id") 
ON DELETE CASCADE 
ON UPDATE CASCADE;

