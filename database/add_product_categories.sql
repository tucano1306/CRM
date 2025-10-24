-- Migración: Agregar categorías a productos
-- Fecha: 2025-10-24
-- Descripción: Añade el enum ProductCategory y la columna category a la tabla products

-- Crear el enum ProductCategory
CREATE TYPE "ProductCategory" AS ENUM (
  'CARNES',
  'EMBUTIDOS', 
  'SALSAS',
  'LACTEOS',
  'GRANOS',
  'VEGETALES',
  'CONDIMENTOS',
  'BEBIDAS',
  'OTROS'
);

-- Agregar la columna category a la tabla products
ALTER TABLE products 
ADD COLUMN category "ProductCategory" DEFAULT 'OTROS';

-- Crear índice para mejorar performance en búsquedas por categoría
CREATE INDEX idx_products_category ON products(category);

-- Comentarios
COMMENT ON COLUMN products.category IS 'Categoría del producto para clasificación y filtrado';
COMMENT ON TYPE "ProductCategory" IS 'Categorías disponibles para productos';
