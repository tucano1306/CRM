-- PASO 1: Ver el authId del vendedor según la BD
SELECT 
    s.name as seller_name,
    s.email as seller_email,
    au."authId" as clerk_auth_id
FROM sellers s
JOIN "_SellerUsers" su ON s.id = su."A"
JOIN authenticated_users au ON su."B" = au.id
WHERE s.email = 'tucano0109@gmail.com';

-- PASO 2: Actualizar authenticated_user del vendedor con el ID correcto
UPDATE authenticated_users
SET "authId" = 'user_33qm_F7T27b10M'
WHERE email = 'tucano0109@gmail.com';

-- PASO 3: Ver el authId del comprador según la BD
SELECT 
    c.name as client_name,
    c.email as client_email,
    au."authId" as clerk_auth_id
FROM clients c
JOIN "_ClientUsers" cu ON c.id = cu."A"
JOIN authenticated_users au ON cu."B" = au.id
WHERE c.email = 'l3oyucon1978@gmail.com';

-- Actualizar authenticated_user del comprador con el ID correcto
UPDATE authenticated_users
SET "authId" = 'user_33qrW5gpS5AQwr465ISFwsUwLcD'
WHERE email = 'l3oyucon1978@gmail.com';

-- PASO 4: Verificación final
SELECT 
    'COMPRADOR' as tipo,
    au."authId",
    au.email
FROM authenticated_users au
WHERE au.email = 'l3oyucon1978@gmail.com'

UNION ALL

SELECT 
    'VENDEDOR' as tipo,
    au."authId",
    au.email
FROM authenticated_users au
WHERE au.email = 'tucano0109@gmail.com';
