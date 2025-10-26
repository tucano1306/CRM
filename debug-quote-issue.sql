-- Ver la cotización y su cliente
SELECT 
  q.id,
  q.quote_number,
  q.status,
  q.client_id,
  c.name as client_name,
  c.email as client_email,
  c.auth_id as client_auth_id
FROM quotes q
LEFT JOIN clients c ON q.client_id = c.id
WHERE q.id = '80189cbd-fcf9-4112-8f5f-3bdc6519a05e';

-- Ver el authenticated_user del comprador
SELECT 
  au.id,
  au.auth_id,
  au.email,
  au.name,
  au.role,
  cl.id as client_id,
  cl.name as client_name
FROM authenticated_users au
LEFT JOIN clients cl ON au.id = cl.auth_user_id
WHERE au.email = 'l3oyucon1978@gmail.com';

-- Ver todas las relaciones
SELECT 
  'Authenticated User' as type,
  au.id,
  au.auth_id,
  au.email
FROM authenticated_users au
WHERE au.email = 'l3oyucon1978@gmail.com'
UNION ALL
SELECT 
  'Client' as type,
  c.id,
  c.auth_id,
  c.email
FROM clients c
WHERE c.email = 'l3oyucon1978@gmail.com';
