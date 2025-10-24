-- Add tags column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Create product_history table
CREATE TABLE IF NOT EXISTS product_history (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    product_id TEXT NOT NULL,
    change_type TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_by TEXT,
    changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Create indexes for product_history
CREATE INDEX IF NOT EXISTS idx_product_history_product_id ON product_history(product_id);
CREATE INDEX IF NOT EXISTS idx_product_history_change_type ON product_history(change_type);
CREATE INDEX IF NOT EXISTS idx_product_history_changed_at ON product_history(changed_at);

-- Verify changes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'products' AND column_name = 'tags';

SELECT table_name, column_name 
FROM information_schema.columns 
WHERE table_name = 'product_history' 
ORDER BY ordinal_position;
