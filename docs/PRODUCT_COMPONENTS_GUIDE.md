# Componentes de Productos - Guía de Uso

## 📦 Archivos Creados

### 1. ProductCard.tsx (155 líneas) ✅
**Ubicación:** `components/products/ProductCard.tsx`

**Características:**
- 🎨 Diseño moderno con header gradiente (púrpura-rosa)
- 🚦 Indicadores de stock con código de colores:
  - 🔴 Rojo: Agotado (stock = 0)
  - 🟡 Amarillo: Stock bajo (stock < 10)
  - 🔵 Azul: Stock normal (stock ≥ 10)
- 💰 Display de precio con fondo verde
- 📊 Métricas de ventas (si disponibles)
- 🏷️ Display de etiquetas con overflow (+N más)
- ✏️ Botones de editar/eliminar con iconos Lucide
- 🖱️ Click handler para abrir detalles
- ✨ Efectos hover con overlay

**Ejemplo de uso:**
```tsx
import ProductCard from '@/components/products/ProductCard'

const products = [
  {
    id: '1',
    name: 'Caraotas',
    sku: 'CAR-001',
    price: 12.50,
    stock: 207,
    unit: 'kg',
    tags: ['Granos', 'Proteína'],
    sales: 150
  }
]

<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {products.map((product) => (
    <ProductCard
      key={product.id}
      product={product}
      onEdit={(id) => console.log('Edit', id)}
      onDelete={(id) => console.log('Delete', id)}
      onClick={(id) => console.log('View details', id)}
    />
  ))}
</div>
```

---

### 2. ProductModal.tsx (280 líneas) ✅
**Ubicación:** `components/products/ProductModal.tsx`

**Características:**
- 🎨 Header con gradiente púrpura-rosa
- 📑 4 Tabs con iconos Lucide:
  1. **Detalles** 📦: Precio, Stock, Información general
  2. **Stock** 📊: Stock actual con barra de progreso, historial de cambios
  3. **Ventas** 📈: Ventas registradas, ingresos totales, análisis
  4. **Promociones** 🏷️: Etiquetas del producto, promociones activas
- ✅ Indicadores de estado visual (semáforo en Stock)
- 📅 Timestamps formateados
- 🔒 Footer con botones de acción

**Ejemplo de uso:**
```tsx
import ProductModal from '@/components/products/ProductModal'
import { useState } from 'react'

const [selectedProduct, setSelectedProduct] = useState(null)
const [isOpen, setIsOpen] = useState(false)

// En el ProductCard:
onClick={(id) => {
  setSelectedProduct(products.find(p => p.id === id))
  setIsOpen(true)
}}

// Modal:
<ProductModal
  product={selectedProduct}
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
/>
```

---

### 3. Prisma Schema Extension ✅
**Ubicación:** `prisma/schema.prisma`

**Cambios aplicados:**

#### Model Product:
```prisma
model Product {
  // ... campos existentes ...
  tags        String[]        @default([])  // ⬅️ NUEVO
  history     ProductHistory[]              // ⬅️ NUEVO
  // ... relaciones existentes ...
}
```

#### Model ProductHistory (NUEVO):
```prisma
model ProductHistory {
  id          String   @id @default(uuid())
  productId   String   @map("product_id")
  changeType  String   @map("change_type") // 'PRICE', 'STOCK', 'NAME', etc.
  oldValue    String?  @map("old_value")
  newValue    String?  @map("new_value")
  changedBy   String?  @map("changed_by") // userId o 'SYSTEM'
  changedAt   DateTime @default(now()) @map("changed_at")
  
  product     Product  @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@index([productId])
  @@index([changeType])
  @@index([changedAt])
  @@map("product_history")
}
```

**Migración aplicada:**
```sql
ALTER TABLE products ADD COLUMN tags TEXT[] DEFAULT ARRAY[]::TEXT[];

CREATE TABLE product_history (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  change_type TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by TEXT,
  changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);
```

---

## 🎯 Integración Completa

### Página de Productos (Ejemplo):
```tsx
'use client'

import { useState } from 'react'
import ProductCard from '@/components/products/ProductCard'
import ProductModal from '@/components/products/ProductModal'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export default function ProductsPage() {
  const [products, setProducts] = useState([])
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleEdit = (id) => {
    const product = products.find(p => p.id === id)
    setSelectedProduct(product)
    setIsModalOpen(true)
  }

  const handleDelete = async (id) => {
    if (confirm('¿Eliminar producto?')) {
      await fetch(`/api/products/${id}`, { method: 'DELETE' })
      setProducts(products.filter(p => p.id !== id))
    }
  }

  const handleView = (id) => {
    const product = products.find(p => p.id === id)
    setSelectedProduct(product)
    setIsModalOpen(true)
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold">Productos</h1>
        <Button className="bg-purple-600 hover:bg-purple-700">
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Producto
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onClick={handleView}
          />
        ))}
      </div>

      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  )
}
```

---

## 🔄 Tracking de Cambios con ProductHistory

### Ejemplo: Registrar cambio de stock
```typescript
// En tu API de actualización de productos
await prisma.productHistory.create({
  data: {
    productId: product.id,
    changeType: 'STOCK',
    oldValue: String(oldStock),
    newValue: String(newStock),
    changedBy: userId,
    changedAt: new Date()
  }
})
```

### Ejemplo: Registrar cambio de precio
```typescript
await prisma.productHistory.create({
  data: {
    productId: product.id,
    changeType: 'PRICE',
    oldValue: String(product.price),
    newValue: String(newPrice),
    changedBy: userId
  }
})
```

### Ejemplo: Consultar historial
```typescript
const history = await prisma.productHistory.findMany({
  where: { productId: product.id },
  orderBy: { changedAt: 'desc' },
  take: 10
})
```

---

## 📊 Estado Actual

### ✅ Completado (100%):
1. **ProductCard.tsx** - 155 líneas
   - Diseño moderno con gradientes
   - Indicadores de stock con colores
   - Badges de estado (Agotado, Bajo Stock)
   - Display de ventas y tags
   - Botones de acción

2. **ProductModal.tsx** - 280 líneas
   - Modal con 4 tabs
   - Display detallado de información
   - Barra de progreso de stock
   - Placeholders para historial y promociones

3. **Prisma Schema** - Extendido
   - Campo `tags[]` en Product
   - Modelo `ProductHistory` completo
   - Migración aplicada en PostgreSQL

### 🎨 Características Visuales:
- Gradientes: `from-purple-500 to-pink-500`
- Colores de stock:
  - 🔴 Rojo: `bg-red-50 text-red-700 border-red-200`
  - 🟡 Amarillo: `bg-yellow-50 text-yellow-700 border-yellow-200`
  - 🔵 Azul: `bg-blue-50 text-blue-700 border-blue-200`
- Verde para precio: `bg-green-50 text-green-700`
- Efectos hover: `hover:shadow-xl hover:scale-105`

### 📦 Dependencias:
- Lucide React (iconos)
- @/components/ui/button
- Tailwind CSS
- @headlessui/react (si se necesita en futuro)

---

## 🚀 Próximos Pasos (Opcionales):

1. **Implementar History Tab en ProductModal**:
   - Crear API: `GET /api/products/[id]/history`
   - Mostrar timeline de cambios
   - Filtrar por tipo de cambio

2. **Sistema de Promociones**:
   - Crear modelo `ProductPromotion`
   - Tab funcional en ProductModal
   - Display de descuentos

3. **Página de Gestión**:
   - `app/products/page.tsx`
   - Grid con ProductCards
   - Búsqueda y filtros
   - CRUD completo

4. **Tracking Automático**:
   - Middleware para detectar cambios
   - Registro automático en ProductHistory
   - Notificaciones de cambios críticos

---

## ✨ Resumen

**3 archivos creados/modificados:**
1. ✅ `components/products/ProductCard.tsx` (155 líneas)
2. ✅ `components/products/ProductModal.tsx` (280 líneas)  
3. ✅ `prisma/schema.prisma` (Product + ProductHistory)

**Migración aplicada:**
- ✅ `tags TEXT[]` en tabla `products`
- ✅ Tabla `product_history` creada
- ✅ 3 índices agregados

**Estado:** 🎉 **COMPLETADO - Listo para usar**
