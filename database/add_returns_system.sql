-- Migration: Add Returns and Credit Notes System
-- Description: Creates tables for product returns and credit notes
-- Date: 2025-10-23

-- Create ReturnStatus enum
CREATE TYPE "ReturnStatus" AS ENUM (
  'PENDING',
  'APPROVED',
  'REJECTED',
  'COMPLETED'
);

-- Create RefundType enum
CREATE TYPE "RefundType" AS ENUM (
  'REFUND',
  'CREDIT',
  'REPLACEMENT'
);

-- Create ReturnReason enum
CREATE TYPE "ReturnReason" AS ENUM (
  'DAMAGED',
  'EXPIRED',
  'WRONG_PRODUCT',
  'QUALITY_ISSUE',
  'NOT_AS_DESCRIBED',
  'OTHER'
);

-- Create returns table
CREATE TABLE IF NOT EXISTS returns (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  return_number VARCHAR(50) UNIQUE NOT NULL,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  seller_id TEXT NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  status "ReturnStatus" NOT NULL DEFAULT 'PENDING',
  reason "ReturnReason" NOT NULL,
  reason_description TEXT,
  refund_type "RefundType" NOT NULL DEFAULT 'CREDIT',
  total_return_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  restock_fee DECIMAL(10, 2) NOT NULL DEFAULT 0,
  final_refund_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  approved_by TEXT,
  approved_at TIMESTAMP,
  completed_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create return_items table
CREATE TABLE IF NOT EXISTS return_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  return_id TEXT NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
  order_item_id TEXT NOT NULL REFERENCES order_items(id) ON DELETE RESTRICT,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  product_name VARCHAR(255) NOT NULL,
  quantity_returned INTEGER NOT NULL CHECK (quantity_returned > 0),
  price_per_unit DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  restocked BOOLEAN NOT NULL DEFAULT false,
  restocked_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create credit_notes table
CREATE TABLE IF NOT EXISTS credit_notes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  credit_note_number VARCHAR(50) UNIQUE NOT NULL,
  return_id TEXT UNIQUE NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  seller_id TEXT NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  balance DECIMAL(10, 2) NOT NULL,
  used_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  expires_at TIMESTAMP,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create credit_note_usage table
CREATE TABLE IF NOT EXISTS credit_note_usage (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  credit_note_id TEXT NOT NULL REFERENCES credit_notes(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  amount_used DECIMAL(10, 2) NOT NULL,
  used_at TIMESTAMP NOT NULL DEFAULT NOW(),
  notes TEXT
);

-- Create indexes for returns
CREATE INDEX idx_returns_order_id ON returns(order_id);
CREATE INDEX idx_returns_client_id ON returns(client_id);
CREATE INDEX idx_returns_seller_id ON returns(seller_id);
CREATE INDEX idx_returns_status ON returns(status);
CREATE INDEX idx_returns_created_at ON returns(created_at);
CREATE INDEX idx_returns_return_number ON returns(return_number);

-- Create indexes for return_items
CREATE INDEX idx_return_items_return_id ON return_items(return_id);
CREATE INDEX idx_return_items_order_item_id ON return_items(order_item_id);
CREATE INDEX idx_return_items_product_id ON return_items(product_id);

-- Create indexes for credit_notes
CREATE INDEX idx_credit_notes_return_id ON credit_notes(return_id);
CREATE INDEX idx_credit_notes_client_id ON credit_notes(client_id);
CREATE INDEX idx_credit_notes_seller_id ON credit_notes(seller_id);
CREATE INDEX idx_credit_notes_is_active ON credit_notes(is_active);
CREATE INDEX idx_credit_notes_credit_note_number ON credit_notes(credit_note_number);

-- Create indexes for credit_note_usage
CREATE INDEX idx_credit_note_usage_credit_note_id ON credit_note_usage(credit_note_id);
CREATE INDEX idx_credit_note_usage_order_id ON credit_note_usage(order_id);

-- Add trigger to update updated_at on returns
CREATE OR REPLACE FUNCTION update_returns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_returns_updated_at
  BEFORE UPDATE ON returns
  FOR EACH ROW
  EXECUTE FUNCTION update_returns_updated_at();

-- Add trigger to update updated_at on return_items
CREATE TRIGGER trigger_update_return_items_updated_at
  BEFORE UPDATE ON return_items
  FOR EACH ROW
  EXECUTE FUNCTION update_returns_updated_at();

-- Add trigger to update updated_at on credit_notes
CREATE TRIGGER trigger_update_credit_notes_updated_at
  BEFORE UPDATE ON credit_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_returns_updated_at();

-- Add comments
COMMENT ON TABLE returns IS 'Stores product returns and refund requests';
COMMENT ON TABLE return_items IS 'Individual items within a return';
COMMENT ON TABLE credit_notes IS 'Store credits generated from approved returns';
COMMENT ON TABLE credit_note_usage IS 'Tracks usage of credit notes on orders';
COMMENT ON COLUMN returns.status IS 'Return status: PENDING, APPROVED, REJECTED, COMPLETED';
COMMENT ON COLUMN returns.refund_type IS 'Type of refund: REFUND, CREDIT, REPLACEMENT';
COMMENT ON COLUMN returns.reason IS 'Reason for return: DAMAGED, EXPIRED, WRONG_PRODUCT, etc';
COMMENT ON COLUMN credit_notes.balance IS 'Remaining balance available to use';
