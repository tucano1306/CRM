-- Crear seller para el authenticated_user existente
INSERT INTO "sellers" (
  "id",
  "name",
  "email",
  "phone",
  "isActive",
  "territory",
  "commission",
  "createdAt",
  "updatedAt"
)
VALUES (
  '9de9276b-e8b7-4daf-9a94-e4a198875c49',  -- Mismo ID que ya existe en las notificaciones
  'Vendedor Principal',
  'vendedor@foodcrm.com',
  '+1555000000',
  true,
  'General',
  5.0,
  NOW(),
  NOW()
)
ON CONFLICT ("id") DO NOTHING;

-- Conectar authenticated_user con seller
INSERT INTO "_authenticated_users_to_sellers" ("A", "B")
VALUES (
  'd4ad08bb-8005-41d0-b60e-4d4224cec9ce',  -- authenticated_user id del vendedor
  '9de9276b-e8b7-4daf-9a94-e4a198875c49'   -- seller id
)
ON CONFLICT DO NOTHING;

-- Verificar
SELECT 
  au.id as auth_id,
  au."authId",
  au.email,
  au.role,
  s.id as seller_id,
  s.name as seller_name
FROM authenticated_users au
LEFT JOIN "_authenticated_users_to_sellers" rel ON au.id = rel."A"
LEFT JOIN sellers s ON rel."B" = s.id
WHERE au."authId" = 'user_33qmrSWlEDyZhiWqGuF7T27b1OM';
