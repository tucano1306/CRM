-- Verificación completa de todas las relaciones
SELECT 
    'CLIENTE' as tipo,
    c.name as nombre,
    c.email,
    au."authId" as clerk_id,
    s.name as vendedor_asignado
FROM clients c
LEFT JOIN "_ClientUsers" cu ON c.id = cu."A"
LEFT JOIN authenticated_users au ON cu."B" = au.id
LEFT JOIN sellers s ON c."sellerId" = s.id
WHERE c.email = 'l3oyucon1978@gmail.com'

UNION ALL

SELECT 
    'VENDEDOR' as tipo,
    s.name as nombre,
    s.email,
    au."authId" as clerk_id,
    NULL as vendedor_asignado
FROM sellers s
LEFT JOIN "_SellerUsers" su ON s.id = su."A"
LEFT JOIN authenticated_users au ON su."B" = au.id
WHERE s.email = 'tucano0109@gmail.com';
