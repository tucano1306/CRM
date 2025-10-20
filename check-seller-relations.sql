-- 1. Ver vendedores y sus authenticated_users
SELECT 
    s.id as seller_id,
    s.name as seller_name,
    s.email as seller_email,
    au.id as auth_user_id,
    au."authId" as clerk_auth_id
FROM sellers s
LEFT JOIN "_SellerUsers" su ON s.id = su."A"
LEFT JOIN authenticated_users au ON su."B" = au.id;

-- 2. Buscar el authenticated_user del vendedor
SELECT id, "authId", email, role 
FROM authenticated_users 
WHERE email = 'tucano0109@gmail.com';

-- 3. Ver todos los sellers
SELECT id, name, email FROM sellers;
