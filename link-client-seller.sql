-- Ver relación cliente-vendedor
SELECT 
    c.id as client_id,
    c.name as client_name,
    c.email as client_email,
    c."sellerId",
    s.id as seller_id,
    s.name as seller_name,
    s.email as seller_email
FROM clients c
LEFT JOIN sellers s ON c."sellerId" = s.id
WHERE c.email = 'l3oyucon1978@gmail.com';

-- Asignar vendedor al cliente
UPDATE clients
SET "sellerId" = (
    SELECT id FROM sellers 
    WHERE email = 'tucano0109@gmail.com' 
    LIMIT 1
)
WHERE email = 'l3oyucon1978@gmail.com';

-- Confirmar actualización
SELECT 
    c.name as client_name,
    c.email as client_email,
    s.name as seller_name
FROM clients c
JOIN sellers s ON c."sellerId" = s.id
WHERE c.email = 'l3oyucon1978@gmail.com';
