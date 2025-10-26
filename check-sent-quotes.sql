-- Ver cotizaciones y clientes
SELECT 
  q.id,
  q.quote_number,
  q.status,
  q.client_id,
  c.name as client_name,
  c.email as client_email
FROM quotes q
LEFT JOIN clients c ON q.client_id = c.id
WHERE q.status = 'SENT'
ORDER BY q.created_at DESC;
