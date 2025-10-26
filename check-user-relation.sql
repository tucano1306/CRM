-- Ver authenticated_users
SELECT id, "authId", email, name, role
FROM authenticated_users
WHERE email = 'l3oyucon1978@gmail.com';

-- Ver clients
SELECT id, name, email, "sellerId"
FROM clients
WHERE email = 'l3oyucon1978@gmail.com';
