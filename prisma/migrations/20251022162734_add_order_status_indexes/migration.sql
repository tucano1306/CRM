-- Migración: Agregar índices para nuevos estados de OrderStatus
-- Fecha: 2025-01-22
-- Descripción: Mejora performance para consultas por estado

-- 1. Agregar índices para los nuevos estados
CREATE INDEX IF NOT EXISTS idx_orders_status_preparing 
ON orders(status) WHERE status = 'PREPARING';

CREATE INDEX IF NOT EXISTS idx_orders_status_delivery 
ON orders(status) WHERE status IN ('IN_DELIVERY', 'DELIVERED', 'PARTIALLY_DELIVERED');

CREATE INDEX IF NOT EXISTS idx_orders_status_payment 
ON orders(status) WHERE status IN ('PAYMENT_PENDING', 'PAID');

-- 2. Agregar comentarios para documentación
COMMENT ON TYPE "OrderStatus" IS 'Estados de orden: PENDING, CONFIRMED, PREPARING, READY_FOR_PICKUP, IN_DELIVERY, DELIVERED, PARTIALLY_DELIVERED, COMPLETED, CANCELED, PAYMENT_PENDING, PAID';
