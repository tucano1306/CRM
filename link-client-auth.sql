-- Ver si el cliente está enlazado con authenticated_users
SELECT 
    c.id as client_id,
    c.name as client_name,
    au.id as auth_id,
    au."authId" as clerk_id,
    au.email as auth_email
FROM clients c
LEFT JOIN "_ClientUsers" cu ON c.id = cu."A"
LEFT JOIN authenticated_users au ON cu."B" = au.id
WHERE c.email = 'l3oyucon1978@gmail.com';

-- Enlazar cliente con authenticated_user
INSERT INTO "_ClientUsers" ("A", "B")
SELECT 
    c.id,
    au.id
FROM clients c, authenticated_users au
WHERE c.email = 'l3oyucon1978@gmail.com'
  AND au.email = 'l3oyucon1978@gmail.com'
ON CONFLICT DO NOTHING;

-- Confirmar enlace
SELECT 
    c.name as client_name,
    au."authId" as clerk_id
FROM clients c
JOIN "_ClientUsers" cu ON c.id = cu."A"
JOIN authenticated_users au ON cu."B" = au.id
WHERE c.email = 'l3oyucon1978@gmail.com';
