-- Actualizar los mensajes para que apunten al authId correcto del vendedor
UPDATE chat_messages
SET "receiverId" = 'user_33qmrSWlEDyZhiWqGuF7T27b1OM'
WHERE "receiverId" = 'user_33qm_F7T27b10M';

-- Verificar
SELECT COUNT(*) as mensajes_actualizados 
FROM chat_messages 
WHERE "receiverId" = 'user_33qmrSWlEDyZhiWqGuF7T27b1OM';
