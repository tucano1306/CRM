-- Eliminar columna tags (array simple) de products
ALTER TABLE products DROP COLUMN IF EXISTS tags;

-- Crear tabla product_tags
CREATE TABLE IF NOT EXISTS product_tags (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    label TEXT NOT NULL,
    color TEXT DEFAULT '#6B7280',
    product_id TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_product_tag FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Crear índices para product_tags
CREATE INDEX IF NOT EXISTS idx_product_tags_product_id ON product_tags(product_id);
CREATE INDEX IF NOT EXISTS idx_product_tags_label ON product_tags(label);

-- Insertar etiquetas de ejemplo comunes
INSERT INTO product_tags (label, color, product_id)
SELECT 'Nuevo', '#10B981', id FROM products WHERE created_at >= NOW() - INTERVAL '30 days'
ON CONFLICT DO NOTHING;

-- Verificar cambios
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'product_tags' 
ORDER BY ordinal_position;

SELECT COUNT(*) as total_tags FROM product_tags;
