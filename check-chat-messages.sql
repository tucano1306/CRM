-- Ver TODOS los mensajes
SELECT 
    id,
    "senderId",
    "receiverId", 
    message,
    "isRead",
    "createdAt"
FROM chat_messages
ORDER BY "createdAt" DESC;
