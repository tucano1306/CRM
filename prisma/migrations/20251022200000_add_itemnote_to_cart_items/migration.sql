-- Add itemNote field to cart_items table
-- This allows users to add notes to individual cart items before checkout

ALTER TABLE "cart_items" 
ADD COLUMN IF NOT EXISTS "itemNote" TEXT;
