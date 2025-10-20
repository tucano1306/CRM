-- Actualizar con el authId REAL de Clerk
UPDATE authenticated_users
SET "authId" = 'user_33qmrSWlEDyZhiWqGuF7T27b1OM'
WHERE email = 'tucano0109@gmail.com';

-- Verificar
SELECT "authId", email FROM authenticated_users WHERE email = 'tucano0109@gmail.com';
