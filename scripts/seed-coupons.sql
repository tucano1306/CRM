-- Seed de cupones de prueba para testing

-- Cupón de 10% de descuento general
INSERT INTO coupons (id, code, description, discount_type, discount_value, min_purchase, max_discount, usage_limit, is_active, valid_from, valid_until)
VALUES 
  (gen_random_uuid(), 'DESCUENTO10', 'Descuento del 10% en cualquier compra', 'PERCENTAGE', 0.10, NULL, NULL, NULL, true, NOW(), NULL),
  
  (gen_random_uuid(), 'PRIMERACOMPRA', '15% de descuento en tu primera compra', 'PERCENTAGE', 0.15, 50.00, 20.00, 1, true, NOW(), NOW() + INTERVAL '30 days'),
  
  (gen_random_uuid(), 'ENVIOGRATIS', 'Envío gratis en compras mayores a $100', 'FIXED', 10.00, 100.00, NULL, NULL, true, NOW(), NULL),
  
  (gen_random_uuid(), 'VERANO2024', '20% de descuento - Promoción de verano', 'PERCENTAGE', 0.20, 75.00, 50.00, 100, true, NOW(), NOW() + INTERVAL '60 days'),
  
  (gen_random_uuid(), '50OFF', '$50 de descuento en compras mayores a $200', 'FIXED', 50.00, 200.00, NULL, 50, true, NOW(), NOW() + INTERVAL '15 days');

-- Verificar cupones creados
SELECT code, description, discount_type, discount_value, min_purchase, max_discount, usage_limit, is_active, valid_until
FROM coupons
ORDER BY created_at DESC;
