-- PASO 1: Ver si el cliente tiene vendedor asignado
SELECT 
    c.id,
    c.name,
    c.email,
    c."sellerId",
    s.name as seller_name
FROM clients c
LEFT JOIN sellers s ON c."sellerId" = s.id
WHERE c.email = 'l3oyucon1978@gmail.com';

-- Asignar vendedor al cliente (si es necesario)
UPDATE clients c
SET "sellerId" = s.id
FROM sellers s
WHERE c.email = 'l3oyucon1978@gmail.com'
  AND s.email = 'tucano0109@gmail.com';

-- Verificar
SELECT 
    c.name as cliente,
    s.name as vendedor_asignado
FROM clients c
JOIN sellers s ON c."sellerId" = s.id
WHERE c.email = 'l3oyucon1978@gmail.com';

-- PASO 2: Script completo de verificación
SELECT 
    '1. CLIENTE' as paso,
    c.id as id,
    c.name as nombre,
    c.email,
    c."sellerId" as tiene_seller
FROM clients c
WHERE c.email = 'l3oyucon1978@gmail.com'

UNION ALL

SELECT 
    '2. SELLER',
    s.id,
    s.name,
    s.email,
    NULL
FROM sellers s
WHERE s.email = 'tucano0109@gmail.com'

UNION ALL

SELECT 
    '3. CLIENT AUTH',
    au.id,
    au.name,
    au.email,
    au."authId"
FROM authenticated_users au
WHERE au.email = 'l3oyucon1978@gmail.com'

UNION ALL

SELECT 
    '4. SELLER AUTH',
    au.id,
    au.name,
    au.email,
    au."authId"
FROM authenticated_users au
WHERE au.email = 'tucano0109@gmail.com'

UNION ALL

SELECT 
    '5. RELACION C-U',
    cu."A",
    'Cliente ID',
    cu."B",
    'Auth User ID'
FROM "_ClientUsers" cu
JOIN clients c ON cu."A" = c.id
WHERE c.email = 'l3oyucon1978@gmail.com'

UNION ALL

SELECT 
    '6. RELACION S-U',
    su."A",
    'Seller ID',
    su."B",
    'Auth User ID'
FROM "_SellerUsers" su
JOIN sellers s ON su."A" = s.id
WHERE s.email = 'tucano0109@gmail.com';
