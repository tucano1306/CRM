-- Migración: Agregar nuevos estados a OrderStatus
-- Fecha: 2025-01-22
-- Descripción: Agrega estados intermedios para mejor seguimiento de órdenes

-- IMPORTANTE: PostgreSQL requiere que los nuevos valores de enum se agreguen
-- en transacciones separadas. No usar BEGIN/COMMIT aquí.

-- 1. Agregar nuevos valores al enum OrderStatus (uno por uno)
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'PREPARING';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'READY_FOR_PICKUP';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'IN_DELIVERY';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'DELIVERED';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'PARTIALLY_DELIVERED';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'PAYMENT_PENDING';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'PAID';

