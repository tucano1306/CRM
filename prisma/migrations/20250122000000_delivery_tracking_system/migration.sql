-- Migración: Sistema de Tracking de Entrega
-- Fecha: 2025-01-22

BEGIN;

-- 1. Crear tabla de tracking de entregas
CREATE TABLE IF NOT EXISTS "delivery_tracking" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    
    -- Información del conductor
    "driverName" TEXT,
    "driverPhone" TEXT,
    
    -- Timing
    "estimatedDeliveryTime" TIMESTAMP(3),
    "actualDeliveryTime" TIMESTAMP(3),
    "departureTime" TIMESTAMP(3),
    
    -- Ubicación en tiempo real
    "currentLatitude" DOUBLE PRECISION,
    "currentLongitude" DOUBLE PRECISION,
    "lastLocationUpdate" TIMESTAMP(3),
    
    -- Dirección de entrega (solo visible para vendedor)
    "deliveryAddress" TEXT,
    "deliveryCity" TEXT,
    "deliveryState" TEXT,
    "deliveryZipCode" TEXT,
    "deliveryCoordinates" TEXT, -- lat,lng para mapa
    
    -- Estado del tracking
    "status" TEXT NOT NULL DEFAULT 'pending',
    -- pending, assigned, picked_up, in_transit, nearby, delivered, failed
    
    -- Metadatos
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_tracking_pkey" PRIMARY KEY ("id")
);

-- 2. Crear tabla de historial de ubicaciones (para ruta completa)
CREATE TABLE IF NOT EXISTS "delivery_location_history" (
    "id" TEXT NOT NULL,
    "trackingId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "speed" DOUBLE PRECISION, -- km/h
    "heading" INTEGER, -- dirección en grados
    
    CONSTRAINT "delivery_location_history_pkey" PRIMARY KEY ("id")
);

-- 3. Crear índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS "idx_delivery_tracking_orderId" 
ON "delivery_tracking"("orderId");

CREATE INDEX IF NOT EXISTS "idx_delivery_tracking_status" 
ON "delivery_tracking"("status");

CREATE INDEX IF NOT EXISTS "idx_delivery_tracking_estimatedTime" 
ON "delivery_tracking"("estimatedDeliveryTime");

CREATE INDEX IF NOT EXISTS "idx_delivery_location_history_trackingId" 
ON "delivery_location_history"("trackingId");

CREATE INDEX IF NOT EXISTS "idx_delivery_location_history_timestamp" 
ON "delivery_location_history"("timestamp");

-- 4. Agregar foreign keys
ALTER TABLE "delivery_tracking" 
ADD CONSTRAINT "delivery_tracking_orderId_fkey" 
FOREIGN KEY ("orderId") 
REFERENCES "orders"("id") 
ON DELETE CASCADE 
ON UPDATE CASCADE;

ALTER TABLE "delivery_location_history" 
ADD CONSTRAINT "delivery_location_history_trackingId_fkey" 
FOREIGN KEY ("trackingId") 
REFERENCES "delivery_tracking"("id") 
ON DELETE CASCADE 
ON UPDATE CASCADE;

-- 5. Agregar comentarios
COMMENT ON TABLE "delivery_tracking" IS 'Información de tracking de entrega compartida entre vendedor y comprador';
COMMENT ON TABLE "delivery_location_history" IS 'Historial de ubicaciones GPS para mostrar ruta completa';

COMMENT ON COLUMN "delivery_tracking"."deliveryAddress" IS 'Solo visible para vendedor por privacidad';
COMMENT ON COLUMN "delivery_tracking"."status" IS 'pending|assigned|picked_up|in_transit|nearby|delivered|failed';

COMMIT;

-- Verificar creación
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('delivery_tracking', 'delivery_location_history');
