-- Limpiar antes de rehacerla migración
DROP TABLE IF EXISTS order_status_history CASCADE;
DROP TYPE IF EXISTS "OrderStatus_new" CASCADE;
