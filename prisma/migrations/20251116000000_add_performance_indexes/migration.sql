-- ⚡ Performance Optimization Migration
-- Add composite indexes for frequently queried combinations

-- Orders table indexes
CREATE INDEX IF NOT EXISTS "orders_sellerId_status_idx" ON "orders"("sellerId", "status");
CREATE INDEX IF NOT EXISTS "orders_sellerId_createdAt_idx" ON "orders"("sellerId", "createdAt");
CREATE INDEX IF NOT EXISTS "orders_clientId_status_idx" ON "orders"("clientId", "status");
CREATE INDEX IF NOT EXISTS "orders_clientId_createdAt_idx" ON "orders"("clientId", "createdAt");
CREATE INDEX IF NOT EXISTS "orders_status_createdAt_idx" ON "orders"("status", "createdAt");

-- Products table indexes
CREATE INDEX IF NOT EXISTS "products_category_isActive_idx" ON "products"("category", "isActive");
CREATE INDEX IF NOT EXISTS "products_isActive_stock_idx" ON "products"("isActive", "stock");
CREATE INDEX IF NOT EXISTS "products_category_stock_idx" ON "products"("category", "stock");

-- Notifications table indexes
CREATE INDEX IF NOT EXISTS "notifications_sellerId_isRead_createdAt_idx" ON "notifications"("sellerId", "isRead", "createdAt");
CREATE INDEX IF NOT EXISTS "notifications_clientId_isRead_createdAt_idx" ON "notifications"("clientId", "isRead", "createdAt");
CREATE INDEX IF NOT EXISTS "notifications_sellerId_createdAt_idx" ON "notifications"("sellerId", "createdAt");
CREATE INDEX IF NOT EXISTS "notifications_clientId_createdAt_idx" ON "notifications"("clientId", "createdAt");

-- Chat messages table indexes
CREATE INDEX IF NOT EXISTS "chat_messages_sellerId_createdAt_idx" ON "chat_messages"("sellerId", "createdAt");
CREATE INDEX IF NOT EXISTS "chat_messages_senderId_receiverId_createdAt_idx" ON "chat_messages"("senderId", "receiverId", "createdAt");
CREATE INDEX IF NOT EXISTS "chat_messages_isRead_createdAt_idx" ON "chat_messages"("isRead", "createdAt");
