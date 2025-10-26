-- Ver relación en _ClientUsers
SELECT * FROM "_ClientUsers";

-- Ver si existe la relación para el usuario comprador
SELECT 
  cu.*, 
  au.email as auth_email,
  c.name as client_name,
  c.email as client_email
FROM "_ClientUsers" cu
LEFT JOIN authenticated_users au ON cu."B" = au.id
LEFT JOIN clients c ON cu."A" = c.id
WHERE au.email = 'l3oyucon1978@gmail.com';
