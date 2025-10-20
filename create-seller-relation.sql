-- Create the relationship between seller and authenticated_user
INSERT INTO "_SellerUsers" ("A", "B")
SELECT 
    s.id,
    au.id
FROM sellers s, authenticated_users au
WHERE s.email = 'tucano0109@gmail.com'
  AND au.email = 'tucano0109@gmail.com'
ON CONFLICT DO NOTHING;

-- Verify the relationship was created
SELECT 
    s.name as seller_name,
    s.email as seller_email,
    au."authId" as clerk_user_id,
    au.role as user_role
FROM sellers s
JOIN "_SellerUsers" su ON s.id = su."A"
JOIN authenticated_users au ON su."B" = au.id
WHERE s.email = 'tucano0109@gmail.com';
