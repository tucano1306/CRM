SELECT COUNT(*) as total_messages FROM chat_messages;

SELECT 
    "senderId",
    "receiverId", 
    "isRead",
    "createdAt"
FROM chat_messages
ORDER BY "createdAt" DESC
LIMIT 10;
