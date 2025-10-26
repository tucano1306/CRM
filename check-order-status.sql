-- Buscar la orden específica
SELECT id, "orderNumber", status, "clientId", "totalAmount", "createdAt" 
FROM orders 
WHERE "orderNumber" = '1761429996944'
ORDER BY "createdAt" DESC 
LIMIT 1;

-- Ver todas las órdenes COMPLETED del cliente Leo
SELECT o.id, o."orderNumber", o.status, c.name as client_name, o."totalAmount"
FROM orders o
LEFT JOIN clients c ON o."clientId" = c.id
WHERE c.email = 'l3oyucon1978@gmail.com'
  AND o.status IN ('DELIVERED', 'COMPLETED')
ORDER BY o."createdAt" DESC;
