-- PASO 1: Ver si el cliente tiene sellerId asignado
SELECT 
    id,
    name,
    email,
    "sellerId"
FROM clients
WHERE email = 'l3oyucon1978@gmail.com';

-- Asignar el vendedor al cliente (si es necesario)
UPDATE clients
SET "sellerId" = (
    SELECT id FROM sellers WHERE email = 'tucano0109@gmail.com'
)
WHERE email = 'l3oyucon1978@gmail.com';

-- PASO 2: Verificar TODA la cadena de relaciones
SELECT 
    c.id as client_id,
    c.name as client_name,
    c."sellerId",
    s.id as seller_id,
    s.name as seller_name,
    cau."authId" as client_clerk_id,
    sau."authId" as seller_clerk_id
FROM clients c
LEFT JOIN sellers s ON c."sellerId" = s.id
LEFT JOIN "_ClientUsers" cu ON c.id = cu."A"
LEFT JOIN authenticated_users cau ON cu."B" = cau.id
LEFT JOIN "_SellerUsers" su ON s.id = su."A"
LEFT JOIN authenticated_users sau ON su."B" = sau.id
WHERE c.email = 'l3oyucon1978@gmail.com';

-- PASO 3: Crear relaciones faltantes (si es necesario)
INSERT INTO "_ClientUsers" ("A", "B")
SELECT c.id, au.id
FROM clients c, authenticated_users au
WHERE c.email = 'l3oyucon1978@gmail.com'
  AND au."authId" = 'user_33qrW5gpS5AQwr465ISFwsUwLcD'
ON CONFLICT DO NOTHING;

INSERT INTO "_SellerUsers" ("A", "B")
SELECT s.id, au.id
FROM sellers s, authenticated_users au
WHERE s.email = 'tucano0109@gmail.com'
  AND au."authId" = 'user_33qm_F7T27b10M'
ON CONFLICT DO NOTHING;
