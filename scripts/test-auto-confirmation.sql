-- Script de prueba para confirmación automática de órdenes
-- Ejecutar en orden para probar el sistema

-- 1. Ver órdenes actuales
SELECT 
  "orderNumber",
  status,
  "totalAmount",
  "createdAt",
  "confirmationDeadline",
  "confirmedAt"
FROM orders
WHERE status = 'PENDING'
ORDER BY "createdAt" DESC
LIMIT 10;

-- 2. Crear deadline vencido para testing (reemplazar ORD-XXXXX con tu orderNumber)
UPDATE orders 
SET "confirmationDeadline" = NOW() - INTERVAL '1 hour'
WHERE "orderNumber" = 'ORD-XXXXX'
  AND status = 'PENDING';

-- 3. Verificar que el cliente tiene auto-confirmación habilitada
SELECT 
  c.id,
  c.name,
  c.email,
  c."orderConfirmationEnabled",
  c."orderConfirmationMethod"
FROM clients c
JOIN orders o ON o."clientId" = c.id
WHERE o."orderNumber" = 'ORD-XXXXX';

-- 4. Si está deshabilitada, habilitarla para testing
UPDATE clients
SET "orderConfirmationEnabled" = true,
    "orderConfirmationMethod" = 'AUTO'
WHERE id = (
  SELECT "clientId" 
  FROM orders 
  WHERE "orderNumber" = 'ORD-XXXXX'
);

-- 5. Después de ejecutar el cron (/api/cron/confirm-orders),
--    verificar que la orden cambió a PLACED
SELECT 
  "orderNumber",
  status,
  "confirmedAt",
  "confirmationDeadline"
FROM orders
WHERE "orderNumber" = 'ORD-XXXXX';

-- 6. Ver el registro de cambio de estado
SELECT 
  osu.id,
  osu."oldStatus",
  osu."newStatus",
  osu."createdAt",
  o."orderNumber"
FROM order_status_updates osu
JOIN orders o ON o.id = osu."orderId"
WHERE o."orderNumber" = 'ORD-XXXXX'
ORDER BY osu."createdAt" DESC;

-- 7. Ver todas las órdenes que serían confirmadas ahora
SELECT 
  o."orderNumber",
  o.status,
  o."confirmationDeadline",
  c.name as client_name,
  c."orderConfirmationEnabled",
  CASE 
    WHEN o."confirmationDeadline" <= NOW() THEN 'SÍ - Vencida'
    ELSE 'NO - Aún vigente'
  END as "será_confirmada"
FROM orders o
JOIN clients c ON c.id = o."clientId"
WHERE o.status = 'PENDING'
  AND o."confirmationDeadline" IS NOT NULL
ORDER BY o."confirmationDeadline" ASC;

-- 8. Estadísticas de confirmación automática
SELECT 
  COUNT(*) FILTER (WHERE "confirmationDeadline" IS NOT NULL) as "con_deadline",
  COUNT(*) FILTER (WHERE "confirmationDeadline" IS NULL) as "sin_deadline",
  COUNT(*) FILTER (WHERE "confirmationDeadline" <= NOW() AND status = 'PENDING') as "vencidas_pendientes",
  COUNT(*) FILTER (WHERE status = 'PLACED' AND "confirmedAt" IS NOT NULL) as "confirmadas"
FROM orders;

-- 9. Limpiar testing (OPCIONAL - restaurar deadline futuro)
UPDATE orders 
SET "confirmationDeadline" = NOW() + INTERVAL '24 hours'
WHERE "orderNumber" = 'ORD-XXXXX'
  AND status = 'PENDING';
