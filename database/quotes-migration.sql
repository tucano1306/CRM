-- Migration: Add Quotes System
-- Description: Creates tables and enums for quotes/cotizaciones functionality
-- Date: 2025-10-23

-- Create QuoteStatus enum
CREATE TYPE "QuoteStatus" AS ENUM (
  'DRAFT',
  'SENT',
  'VIEWED',
  'ACCEPTED',
  'REJECTED',
  'EXPIRED',
  'CONVERTED'
);

-- Create quotes table
CREATE TABLE IF NOT EXISTS quotes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  quote_number VARCHAR(50) UNIQUE NOT NULL,
  seller_id TEXT NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
  subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
  discount DECIMAL(5, 2) NOT NULL DEFAULT 0,
  tax DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  valid_until TIMESTAMP NOT NULL,
  notes TEXT,
  terms_and_conditions TEXT,
  sent_at TIMESTAMP,
  converted_order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create quote_items table
CREATE TABLE IF NOT EXISTS quote_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  quote_id TEXT NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  product_name VARCHAR(255) NOT NULL,
  description TEXT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price_per_unit DECIMAL(10, 2) NOT NULL CHECK (price_per_unit >= 0),
  discount DECIMAL(5, 2) NOT NULL DEFAULT 0 CHECK (discount >= 0 AND discount <= 100),
  subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_quotes_seller_id ON quotes(seller_id);
CREATE INDEX idx_quotes_client_id ON quotes(client_id);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quotes_quote_number ON quotes(quote_number);
CREATE INDEX idx_quotes_created_at ON quotes(created_at);
CREATE INDEX idx_quotes_valid_until ON quotes(valid_until);
CREATE INDEX idx_quotes_converted_order_id ON quotes(converted_order_id);
CREATE INDEX idx_quote_items_quote_id ON quote_items(quote_id);
CREATE INDEX idx_quote_items_product_id ON quote_items(product_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_quotes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_quotes_updated_at
  BEFORE UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_quotes_updated_at();

-- Add comments for documentation
COMMENT ON TABLE quotes IS 'Stores price quotes/cotizaciones sent to clients';
COMMENT ON TABLE quote_items IS 'Individual items within a quote';
COMMENT ON COLUMN quotes.status IS 'Quote lifecycle status: DRAFT, SENT, VIEWED, ACCEPTED, REJECTED, EXPIRED, CONVERTED';
COMMENT ON COLUMN quotes.converted_order_id IS 'Links to the order created when quote is converted';
COMMENT ON COLUMN quotes.sent_at IS 'Timestamp when quote was sent to client';
COMMENT ON COLUMN quotes.valid_until IS 'Expiration date of the quote';
