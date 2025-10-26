-- Crear notificación para cotización enviada
INSERT INTO notifications (id, type, title, message, "clientId", "relatedId", "isRead", "createdAt", "readAt") 
VALUES (
  gen_random_uuid(), 
  'QUOTE_SENT', 
  '📋 Nueva Cotización Recibida', 
  'Has recibido una nueva cotización #QUO-1761507545706VOFCU3KNX', 
  'e99af59b-b7d3-44f6-95a8-534b350aba7d', 
  '80189cbd-fcf9-4112-8f5f-3bdc6519a05e', 
  false, 
  NOW(), 
  NULL
);
