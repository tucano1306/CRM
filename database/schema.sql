-- ============================================
-- FOOD ORDERS CRM - PostgreSQL Schema
-- Archivo: database/schema.sql
-- ============================================

-- Eliminar tablas si existen (para desarrollo)
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS product_sellers CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Crear tipos ENUM
DROP TYPE IF EXISTS user_role CASCADE;
CREATE TYPE user_role AS ENUM ('ADMIN', 'SELLER', 'CLIENT');

DROP TYPE IF EXISTS product_unit CASCADE;
CREATE TYPE product_unit AS ENUM ('case', 'pk');

DROP TYPE IF EXISTS order_status CASCADE;
CREATE TYPE order_status AS ENUM ('PENDING', 'PLACED', 'CONFIRMED', 'COMPLETED', 'CANCELED');

-- ============================================
-- TABLA: users
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'CLIENT',
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ============================================
-- TABLA: clients
-- ============================================
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    seller_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_clients_seller_id ON clients(seller_id);
CREATE INDEX idx_clients_email ON clients(email);

-- ============================================
-- TABLA: products
-- ============================================
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    unit product_unit NOT NULL DEFAULT 'case',
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_unit ON products(unit);

-- ============================================
-- TABLA: product_sellers (relación muchos a muchos)
-- ============================================
CREATE TABLE product_sellers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, seller_id)
);

CREATE INDEX idx_product_sellers_product_id ON product_sellers(product_id);
CREATE INDEX idx_product_sellers_seller_id ON product_sellers(seller_id);

-- ============================================
-- TABLA: orders
-- ============================================
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status order_status NOT NULL DEFAULT 'PENDING',
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orders_client_id ON orders(client_id);
CREATE INDEX idx_orders_seller_id ON orders(seller_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- ============================================
-- TABLA: order_items
-- ============================================
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    product_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price_per_unit DECIMAL(10, 2) NOT NULL CHECK (price_per_unit >= 0),
    confirmed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);

-- ============================================
-- TRIGGERS para actualizar updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TRIGGER para actualizar total_amount en orders
-- ============================================
CREATE OR REPLACE FUNCTION update_order_total()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE orders
    SET total_amount = (
        SELECT COALESCE(SUM(quantity * price_per_unit), 0)
        FROM order_items
        WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)
    )
    WHERE id = COALESCE(NEW.order_id, OLD.order_id);
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_order_total_on_insert AFTER INSERT ON order_items
    FOR EACH ROW EXECUTE FUNCTION update_order_total();

CREATE TRIGGER update_order_total_on_update AFTER UPDATE ON order_items
    FOR EACH ROW EXECUTE FUNCTION update_order_total();

CREATE TRIGGER update_order_total_on_delete AFTER DELETE ON order_items
    FOR EACH ROW EXECUTE FUNCTION update_order_total();

-- ============================================
-- COMENTARIOS EN TABLAS
-- ============================================
COMMENT ON TABLE users IS 'Usuarios del sistema (Admin, Vendedores, Clientes)';
COMMENT ON TABLE clients IS 'Clientes que realizan pedidos';
COMMENT ON TABLE products IS 'Catálogo de productos disponibles';
COMMENT ON TABLE product_sellers IS 'Relación entre productos y vendedores autorizados';
COMMENT ON TABLE orders IS 'Órdenes de compra realizadas por clientes';
COMMENT ON TABLE order_items IS 'Items individuales dentro de cada orden';

-- ============================================
-- DATOS DE PRUEBA
-- ============================================
-- Insertar usuarios de prueba (contraseñas: admin123, seller123, client123)
INSERT INTO users (id, email, name, role, password) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'admin@foodcrm.com', 'Admin User', 'ADMIN', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'seller1@foodcrm.com', 'John Seller', 'SELLER', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'client1@foodcrm.com', 'Restaurant Owner', 'CLIENT', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');

-- Insertar clientes de prueba
INSERT INTO clients (id, name, address, phone, email, seller_id) VALUES
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'Cornerstone Cafe', '123 Market St, Miami FL', '555-1234', 'cornerstone@example.com', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'),
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'The Bistro', '456 Main Rd, Miami FL', '555-5678', 'bistro@example.com', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'),
('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a66', 'Pizza Palace', '789 Oak Ave, Miami FL', '555-9012', 'pizza@example.com', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22');

-- Insertar productos de prueba
INSERT INTO products (id, name, description, unit, price, stock) VALUES
('10eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Tomatoes', 'Fresh, ripe tomatoes, perfect for sauces and salads', 'case', 25.99, 100),
('20eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Mozzarella', 'Italian mozzarella, ideal for pizza and pasta dishes', 'pk', 15.50, 50),
('30eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'Spaghetti', 'Dried spaghetti, a pantry staple for any Italian restaurant', 'pk', 8.75, 200),
('40eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'Olive Oil', 'Extra virgin olive oil from Spain', 'case', 45.00, 80),
('50eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'Basil', 'Fresh basil leaves', 'pk', 12.50, 150);

-- Relacionar productos con vendedores
INSERT INTO product_sellers (product_id, seller_id) VALUES
('10eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'),
('20eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'),
('30eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'),
('40eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'),
('50eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22');

-- Insertar órdenes de prueba
INSERT INTO orders (id, client_id, seller_id, status, total_amount) VALUES
('70eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'PENDING', 0),
('80eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'CONFIRMED', 0),
('90eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a66', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'COMPLETED', 0);

-- Insertar items de órdenes
INSERT INTO order_items (order_id, product_id, product_name, quantity, price_per_unit, confirmed) VALUES
('70eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '10eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Tomatoes', 2, 25.99, false),
('70eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '20eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Mozzarella', 3, 15.50, false),
('80eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', '30eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'Spaghetti', 5, 8.75, true),
('80eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', '40eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'Olive Oil', 1, 45.00, true),
('90eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', '10eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Tomatoes', 4, 25.99, true),
('90eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', '50eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'Basil', 2, 12.50, true);

-- ============================================
-- VISTAS ÚTILES
-- ============================================
CREATE OR REPLACE VIEW orders_detailed AS
SELECT 
    o.id,
    o.status,
    o.total_amount,
    o.created_at,
    o.updated_at,
    c.name as client_name,
    c.email as client_email,
    c.phone as client_phone,
    c.address as client_address,
    u.name as seller_name,
    u.email as seller_email,
    COUNT(oi.id) as items_count
FROM orders o
JOIN clients c ON o.client_id = c.id
JOIN users u ON o.seller_id = u.id
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id, o.status, o.total_amount, o.created_at, o.updated_at,
         c.name, c.email, c.phone, c.address, u.name, u.email;

CREATE OR REPLACE VIEW stats_summary AS
SELECT
    (SELECT COUNT(*) FROM products) as total_products,
    (SELECT COUNT(*) FROM clients) as total_clients,
    (SELECT COUNT(*) FROM orders) as total_orders,
    (SELECT COUNT(*) FROM orders WHERE status = 'PENDING') as pending_orders,
    (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE status = 'COMPLETED') as total_revenue;

CREATE OR REPLACE VIEW products_with_sellers AS
SELECT 
    p.id,
    p.name,
    p.description,
    p.unit,
    p.price,
    p.stock,
    p.created_at,
    ARRAY_AGG(u.name) as seller_names,
    ARRAY_AGG(u.id) as seller_ids
FROM products p
LEFT JOIN product_sellers ps ON p.id = ps.product_id
LEFT JOIN users u ON ps.seller_id = u.id
GROUP BY p.id, p.name, p.description, p.unit, p.price, p.stock, p.created_at;

-- ============================================
-- FUNCIONES ÚTILES
-- ============================================
CREATE OR REPLACE FUNCTION get_order_items_count(order_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    items_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO items_count
    FROM order_items
    WHERE order_id = order_uuid;
    RETURN items_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION check_product_stock(product_uuid UUID, required_quantity INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    current_stock INTEGER;
BEGIN
    SELECT stock INTO current_stock
    FROM products
    WHERE id = product_uuid;
    
    RETURN current_stock >= required_quantity;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VERIFICACIÓN FINAL
-- ============================================
DO $$
DECLARE
    user_count INTEGER;
    client_count INTEGER;
    product_count INTEGER;
    order_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM users;
    SELECT COUNT(*) INTO client_count FROM clients;
    SELECT COUNT(*) INTO product_count FROM products;
    SELECT COUNT(*) INTO order_count FROM orders;
    
    RAISE NOTICE '================================';
    RAISE NOTICE 'RESUMEN DE BASE DE DATOS';
    RAISE NOTICE '================================';
    RAISE NOTICE 'Usuarios creados: %', user_count;
    RAISE NOTICE 'Clientes creados: %', client_count;
    RAISE NOTICE 'Productos creados: %', product_count;
    RAISE NOTICE 'Órdenes creadas: %', order_count;
    RAISE NOTICE '================================';
END $$;

SELECT 'Schema creado exitosamente' as status;