-- Script para corregir órdenes con status NULL
-- Fecha: 2025-10-22

-- 1. Verificar cuántas órdenes tienen status NULL
SELECT COUNT(*) as total_null_status
FROM orders
WHERE status IS NULL;

-- 2. Ver detalles de las órdenes con status NULL
SELECT id, order_number, status, created_at, client_id, seller_id
FROM orders
WHERE status IS NULL
ORDER BY created_at DESC
LIMIT 20;

-- 3. Actualizar todas las órdenes con status NULL a PENDING
UPDATE orders
SET status = 'PENDING'
WHERE status IS NULL;

-- 4. Verificar que ya no hay NULL
SELECT COUNT(*) as remaining_nulls
FROM orders
WHERE status IS NULL;

-- 5. Ver las órdenes actualizadas
SELECT id, order_number, status, created_at
FROM orders
WHERE status = 'PENDING'
ORDER BY updated_at DESC
LIMIT 10;
