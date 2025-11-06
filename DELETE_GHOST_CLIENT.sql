-- ============================================
-- ELIMINAR CLIENTE FANTASMA
-- Email: l3oyucon1978@gmail.com
-- ============================================

-- INSTRUCCIONES:
-- 1. Ve a: https://vercel.com/tucano1306s-projects/food-order-crm/stores
-- 2. Haz clic en tu base de datos PostgreSQL
-- 3. Ve a la pestaña "Query" o "Data"
-- 4. Copia y pega TODAS estas queries una por una
-- 5. Haz clic en "Run Query" o "Execute"

-- ============================================
-- PASO 1: Ver si el cliente existe
-- ============================================
SELECT 
  id,
  email,
  name,
  "sellerId",
  "createdAt"
FROM "Client"
WHERE email = 'l3oyucon1978@gmail.com';

-- Si aparece un registro, continúa con los siguientes pasos
-- Si NO aparece, ¡ya está eliminado! ✅


-- ============================================
-- PASO 2: Eliminar relaciones con usuarios autenticados
-- ============================================
DELETE FROM "_ClientUsers"
WHERE "B" IN (
  SELECT id FROM "Client"
  WHERE email = 'l3oyucon1978@gmail.com'
);

-- ✅ Relaciones con usuarios eliminadas


-- ============================================
-- PASO 3: Eliminar items de órdenes del cliente
-- ============================================
DELETE FROM "OrderItem"
WHERE "orderId" IN (
  SELECT id FROM "Order"
  WHERE "clientId" IN (
    SELECT id FROM "Client"
    WHERE email = 'l3oyucon1978@gmail.com'
  )
);

-- ✅ Items de órdenes eliminados


-- ============================================
-- PASO 4: Eliminar órdenes del cliente
-- ============================================
DELETE FROM "Order"
WHERE "clientId" IN (
  SELECT id FROM "Client"
  WHERE email = 'l3oyucon1978@gmail.com'
);

-- ✅ Órdenes eliminadas


-- ============================================
-- PASO 5: Eliminar cotizaciones del cliente
-- ============================================
DELETE FROM "Quote"
WHERE "clientId" IN (
  SELECT id FROM "Client"
  WHERE email = 'l3oyucon1978@gmail.com'
);

-- ✅ Cotizaciones eliminadas


-- ============================================
-- PASO 6: Eliminar devoluciones del cliente
-- ============================================
DELETE FROM "Return"
WHERE "clientId" IN (
  SELECT id FROM "Client"
  WHERE email = 'l3oyucon1978@gmail.com'
);

-- ✅ Devoluciones eliminadas


-- ============================================
-- PASO 7: ELIMINAR EL CLIENTE (FINAL)
-- ============================================
DELETE FROM "Client"
WHERE email = 'l3oyucon1978@gmail.com';

-- 🎉 ¡CLIENTE ELIMINADO!


-- ============================================
-- PASO 8: Verificar que ya no existe
-- ============================================
SELECT COUNT(*) as "clientes_con_este_email"
FROM "Client"
WHERE email = 'l3oyucon1978@gmail.com';

-- Debería retornar: 0
-- Si retorna 0, ¡ÉXITO! ✅
-- Ahora puedes crear un nuevo cliente con ese email


-- ============================================
-- INFORMACIÓN ADICIONAL
-- ============================================
-- Ver todos tus clientes:
SELECT 
  id,
  email,
  name,
  "sellerId"
FROM "Client"
ORDER BY "createdAt" DESC
LIMIT 10;
