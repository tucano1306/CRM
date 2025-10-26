-- Simular la consulta de Prisma para el comprador
SELECT 
  au.id as auth_user_id,
  au."authId",
  au.email,
  au.name,
  au.role,
  c.id as client_id,
  c.name as client_name,
  c.email as client_email
FROM authenticated_users au
LEFT JOIN "_ClientUsers" cu ON au.id = cu."B"
LEFT JOIN clients c ON cu."A" = c.id
WHERE au."authId" = 'user_33qrW5gpS5AQwr465ISFwsUwLcD';

-- Ver cotizaciones para ese cliente
SELECT 
  q.id,
  q.quote_number,
  q.status,
  q.client_id
FROM quotes q
WHERE q.client_id = 'e99af59b-b7d3-44f6-95a8-534b350aba7d'
  AND q.status = 'SENT';
