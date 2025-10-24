# 🏷️ Sistema de Etiquetas Predefinidas - Documentación Completa

## 📋 Tabla de Contenidos

1. [Resumen General](#resumen-general)
2. [Arquitectura](#arquitectura)
3. [Componentes](#componentes)
4. [Etiquetas Predefinidas](#etiquetas-predefinidas)
5. [Sugerencias Automáticas](#sugerencias-automáticas)
6. [Uso e Integración](#uso-e-integración)
7. [API Reference](#api-reference)
8. [Testing](#testing)

---

## 🎯 Resumen General

Sistema completo de gestión de etiquetas para productos con:

- ✅ **17 etiquetas predefinidas** organizadas en 6 categorías
- ✅ **Colores personalizados** con validación hex
- ✅ **Sugerencias automáticas** basadas en stock, precio y fecha
- ✅ **UI moderna** con modal de gestión y selector visual
- ✅ **Etiquetas personalizadas** con picker de color
- ✅ **Filtrado dinámico** en la página de productos
- ✅ **Actualización en tiempo real** sin recargar página

### Archivos Creados/Modificados

```
lib/
  predefinedTags.ts              ← 220+ líneas (utilidades y definiciones)
components/products/
  TagManager.tsx                 ← 300+ líneas (modal de gestión)
  TagSuggestions.tsx             ← 80+ líneas (sugerencias automáticas)
  ProductModal.tsx               ← Modificado (integración)
  ProductCard.tsx                ← Modificado (display)
app/products-modern/
  page.tsx                       ← Modificado (callback updates)
```

---

## 🏗️ Arquitectura

### Flujo de Datos

```
┌─────────────────────────────────────────────────────────────────┐
│                        products-modern/page.tsx                 │
│  - Almacena lista de productos con tags                        │
│  - Maneja actualizaciones via callback onTagsUpdate            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                          ProductModal                           │
│  - Estado local de tags (useState)                              │
│  - Pasa producto completo a TagManager                          │
│  - Tab "Promociones" muestra tags y TagManager                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                          TagManager                             │
│  - Modal fullscreen con 2 tabs (Predefinidas/Personalizada)    │
│  - Muestra TagSuggestions si hay producto                       │
│  - CRUD de tags via API                                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                        TagSuggestions                           │
│  - Llama suggestTags() de predefinedTags.ts                    │
│  - Muestra solo sugerencias no aplicadas                        │
│  - Botones one-click para aplicar                               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    predefinedTags.ts (Utilities)                │
│  - 17 tags con colores, emojis, descripciones                  │
│  - 7 funciones helper (getPredefinedTag, suggestTags, etc.)    │
└─────────────────────────────────────────────────────────────────┘
```

### Base de Datos

**Tabla: `product_tags`**

```sql
CREATE TABLE product_tags (
  id          TEXT PRIMARY KEY,
  label       TEXT NOT NULL,
  color       TEXT DEFAULT '#6B7280',
  product_id  TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_product_tags_product_id ON product_tags(product_id);
CREATE INDEX idx_product_tags_label ON product_tags(label);
```

---

## 🧩 Componentes

### 1. **TagManager.tsx**

Modal completo de gestión de etiquetas.

**Props:**

```typescript
interface TagManagerProps {
  productId: string              // ID del producto
  product?: {                    // Producto completo (para sugerencias)
    id: string
    stock: number
    createdAt?: Date | string
    price?: number
  }
  currentTags: ProductTag[]      // Tags actuales del producto
  onTagsUpdate: (tags: ProductTag[]) => void  // Callback al actualizar
}
```

**Características:**

- ✅ Botón de apertura con icono y texto
- ✅ Modal fullscreen con header gradient naranja-ámbar
- ✅ Muestra tags actuales con botones de eliminar
- ✅ 2 tabs: Predefinidas / Personalizada
- ✅ Integra TagSuggestions al inicio
- ✅ Grid de etiquetas predefinidas con emojis y descripciones
- ✅ Form de etiqueta personalizada con picker de color
- ✅ Indica tags ya aplicadas con check verde
- ✅ Loading states en botones
- ✅ Manejo de errores con alerts

**Estados:**

```typescript
const [isOpen, setIsOpen] = useState(false)
const [customLabel, setCustomLabel] = useState('')
const [customColor, setCustomColor] = useState('#6B7280')
const [loading, setLoading] = useState(false)
const [activeTab, setActiveTab] = useState<'predefined' | 'custom'>('predefined')
```

**Métodos:**

```typescript
// Agregar tag (POST /api/products/[id]/tags)
const addTag = async (label: string, color: string) => { ... }

// Eliminar tag (DELETE /api/products/[id]/tags?tagId=xxx)
const removeTag = async (tagId: string) => { ... }

// Agregar tag personalizado
const handleAddCustomTag = async () => { ... }
```

---

### 2. **TagSuggestions.tsx**

Panel de sugerencias automáticas basadas en atributos del producto.

**Props:**

```typescript
interface TagSuggestionsProps {
  product: {
    stock: number
    createdAt?: Date | string
    price?: number
  }
  currentTags: string[]          // Labels de tags actuales
  onAddTag: (label: string, color: string) => void
  loading?: boolean
}
```

**Características:**

- ✅ Solo se muestra si hay sugerencias disponibles
- ✅ Excluye tags ya aplicados
- ✅ Background gradient azul-índigo
- ✅ Icono Sparkles ✨ para indicar sugerencias
- ✅ Badge con número de sugerencias
- ✅ Botones con colores de etiqueta predefinida
- ✅ Texto explicativo del algoritmo
- ✅ Icono 💡 con tip informativo

**Lógica de Sugerencias:**

```typescript
const suggestions = suggestTags(productForSuggestion)
// Retorna array de labels: ['Disponible', 'Nuevo', 'Premium']

const availableSuggestions = suggestions.filter(label => 
  !currentTags.includes(label)
)
```

---

### 3. **ProductModal.tsx** (Modificado)

Modal de detalles de producto con 4 tabs.

**Cambios Realizados:**

1. **Import TagManager**:
   ```tsx
   import TagManager from './TagManager'
   ```

2. **Estado Local de Tags**:
   ```tsx
   const [tags, setTags] = useState<ProductTag[]>(
     (product.productTags || []).map(tag => ({
       ...tag,
       color: tag.color || '#6B7280'  // Garantiza color no-undefined
     }))
   )
   ```

3. **Callback Handler**:
   ```tsx
   const handleTagsUpdate = (updatedTags: ProductTag[]) => {
     setTags(updatedTags)
     if (onTagsUpdate) {
       onTagsUpdate(updatedTags)
     }
   }
   ```

4. **Tab "Promociones"**:
   ```tsx
   <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg p-6">
     {/* Tags Display */}
     {tags.length > 0 && (
       <div className="flex flex-wrap gap-3 mb-4">
         {tags.map(tag => (
           <div style={{ backgroundColor: tag.color }}>
             {tag.label}
           </div>
         ))}
       </div>
     )}

     {/* Tag Manager */}
     <TagManager
       productId={product.id}
       product={{ id, stock, createdAt, price }}
       currentTags={tags}
       onTagsUpdate={handleTagsUpdate}
     />
   </div>
   ```

---

### 4. **products-modern/page.tsx** (Modificado)

Página principal de productos con filtros.

**Cambio Principal:**

```tsx
<ProductModal
  product={selectedProduct}
  isOpen={isModalOpen}
  onClose={() => {
    setIsModalOpen(false)
    setSelectedProduct(null)
  }}
  onTagsUpdate={(updatedTags) => {
    // Actualizar producto en lista local
    setProducts(products.map(p => 
      p.id === selectedProduct.id 
        ? { ...p, productTags: updatedTags }
        : p
    ))
    // Actualizar producto seleccionado
    setSelectedProduct({ ...selectedProduct, productTags: updatedTags })
  }}
/>
```

**Beneficio**: Actualización en tiempo real sin recargar página.

---

## 🏷️ Etiquetas Predefinidas

### Categorías y Tags

#### 1. **Estado** (3 tags)

| Label | Color | Emoji | Descripción |
|-------|-------|-------|-------------|
| Nuevo | `#3B82F6` | ✨ | Productos recientemente agregados |
| Popular | `#10B981` | 🔥 | Productos más buscados o vendidos |
| Bestseller | `#8B5CF6` | ⭐ | Los productos más vendidos |

#### 2. **Promociones** (3 tags)

| Label | Color | Emoji | Descripción |
|-------|-------|-------|-------------|
| En oferta | `#F87171` | 💰 | Productos con descuento |
| Oferta Flash | `#F59E0B` | ⚡ | Ofertas por tiempo limitado |
| Promoción | `#EC4899` | 🎁 | Promociones especiales |

#### 3. **Stock** (3 tags)

| Label | Color | Emoji | Descripción |
|-------|-------|-------|-------------|
| Sin stock | `#6B7280` | ❌ | Producto agotado |
| Pocas unidades | `#F59E0B` | ⚠️ | Stock bajo, quedan pocas unidades |
| Disponible | `#10B981` | ✅ | Producto en stock |

#### 4. **Características** (3 tags)

| Label | Color | Emoji | Descripción |
|-------|-------|-------|-------------|
| Orgánico | `#22C55E` | 🌱 | Producto orgánico o ecológico |
| Premium | `#F59E0B` | 👑 | Producto de alta calidad |
| Económico | `#06B6D4` | 💵 | Opción económica |

#### 5. **Recurrencia** (2 tags)

| Label | Color | Emoji | Descripción |
|-------|-------|-------|-------------|
| Recurrente | `#FBBF24` | 🔄 | Productos de compra frecuente |
| Por encargo | `#A855F7` | 📋 | Se prepara bajo pedido |

#### 6. **Temporada** (3 tags)

| Label | Color | Emoji | Descripción |
|-------|-------|-------|-------------|
| Temporada | `#14B8A6` | 🗓️ | Producto de temporada |
| Navidad | `#DC2626` | 🎄 | Especial para época navideña |
| Verano | `#F59E0B` | ☀️ | Producto de temporada de verano |

---

## 🤖 Sugerencias Automáticas

### Algoritmo `suggestTags()`

Función en `lib/predefinedTags.ts` que analiza atributos del producto y retorna array de labels sugeridos.

**Input:**

```typescript
interface ProductForSuggestion {
  stock: number
  createdAt?: Date
  price?: number
}
```

**Output:**

```typescript
string[]  // Ej: ['Disponible', 'Nuevo', 'Premium']
```

### Reglas de Sugerencia

#### 1. **Basado en Stock** (siempre se aplica)

```typescript
if (product.stock === 0) {
  suggestions.push('Sin stock')
} else if (product.stock < 10) {
  suggestions.push('Pocas unidades')
} else {
  suggestions.push('Disponible')
}
```

#### 2. **Basado en Fecha de Creación** (opcional)

```typescript
if (product.createdAt) {
  const daysSinceCreation = Math.floor(
    (Date.now() - product.createdAt.getTime()) / (1000 * 60 * 60 * 24)
  )
  if (daysSinceCreation <= 30) {
    suggestions.push('Nuevo')
  }
}
```

**Criterio**: Productos con menos de 30 días son "Nuevo" ✨

#### 3. **Basado en Precio** (opcional)

```typescript
if (product.price && product.price > 100) {
  suggestions.push('Premium')
}
```

**Criterio**: Productos con precio > $100 son "Premium" 👑

### Ejemplo Completo

**Producto:**

```typescript
{
  id: "abc123",
  stock: 5,
  createdAt: new Date('2025-01-15'),  // 15 días atrás
  price: 150
}
```

**Sugerencias Generadas:**

```typescript
suggestTags(product)
// Retorna: ['Pocas unidades', 'Nuevo', 'Premium']
```

**Visualización en UI:**

```
┌────────────────────────────────────────────────────┐
│ ✨ Etiquetas Sugeridas                      3      │
│ Basado en stock, precio y fecha de creación       │
├────────────────────────────────────────────────────┤
│ [⚠️ Pocas unidades] [✨ Nuevo] [👑 Premium]       │
│ 💡 Estas etiquetas se generaron automáticamente   │
└────────────────────────────────────────────────────┘
```

---

## 🔧 Uso e Integración

### Implementación en Nueva Página

Si quieres agregar el sistema de tags en otra página:

#### Paso 1: Importar Componentes

```tsx
import TagManager from '@/components/products/TagManager'
import TagSuggestions from '@/components/products/TagSuggestions'
import { predefinedTags } from '@/lib/predefinedTags'
```

#### Paso 2: Estado de Tags

```tsx
const [tags, setTags] = useState<ProductTag[]>(product.productTags || [])
```

#### Paso 3: Renderizar TagManager

```tsx
<TagManager
  productId={product.id}
  product={{
    id: product.id,
    stock: product.stock,
    createdAt: product.createdAt,
    price: product.price
  }}
  currentTags={tags}
  onTagsUpdate={(updatedTags) => {
    setTags(updatedTags)
    // Tu lógica adicional aquí
  }}
/>
```

### Uso de Utilidades

#### Obtener Tag Predefinido

```typescript
import { getPredefinedTag } from '@/lib/predefinedTags'

const tag = getPredefinedTag('Nuevo')
// { label: 'Nuevo', color: '#3B82F6', description: '...', icon: '✨' }
```

#### Filtrar por Categoría

```typescript
import { getTagsByCategory } from '@/lib/predefinedTags'

const promoTags = getTagsByCategory('promociones')
// [
//   { label: 'En oferta', color: '#F87171', ... },
//   { label: 'Oferta Flash', color: '#F59E0B', ... },
//   { label: 'Promoción', color: '#EC4899', ... }
// ]
```

#### Validar Color Hex

```typescript
import { isValidColor } from '@/lib/predefinedTags'

isValidColor('#3B82F6')  // true
isValidColor('#XYZ123')  // false
isValidColor('blue')     // false
```

#### Generar Color Aleatorio

```typescript
import { generateRandomColor } from '@/lib/predefinedTags'

const randomColor = generateRandomColor()
// Retorna uno de: #3B82F6, #10B981, #F59E0B, #F87171, #8B5CF6,
//                 #EC4899, #14B8A6, #F97316, #06B6D4, #84CC16
```

#### Formatear Label con Emoji

```typescript
import { formatTagLabel } from '@/lib/predefinedTags'

formatTagLabel('Nuevo')        // '✨ Nuevo'
formatTagLabel('En oferta')    // '💰 En oferta'
formatTagLabel('Custom Label') // '🏷️ Custom Label' (emoji por defecto)
```

---

## 📡 API Reference

### Endpoints Existentes

#### 1. **GET** `/api/products/[id]/tags`

Obtiene todas las etiquetas de un producto.

**Response:**

```json
{
  "tags": [
    {
      "id": "tag_abc123",
      "label": "Nuevo",
      "color": "#3B82F6",
      "productId": "prod_xyz",
      "createdAt": "2025-01-30T10:00:00Z"
    }
  ]
}
```

#### 2. **POST** `/api/products/[id]/tags`

Crea una nueva etiqueta para un producto.

**Request Body:**

```json
{
  "label": "Nuevo",
  "color": "#3B82F6"  // Opcional, default: #6B7280
}
```

**Validaciones:**
- ✅ Label requerido (no vacío)
- ✅ No duplicados (misma etiqueta para mismo producto)
- ✅ Color opcional (usa default si no se provee)
- ✅ Auth con Clerk (userId requerido)

**Response:**

```json
{
  "tag": {
    "id": "tag_new123",
    "label": "Nuevo",
    "color": "#3B82F6",
    "productId": "prod_xyz",
    "createdAt": "2025-01-30T10:30:00Z"
  }
}
```

#### 3. **DELETE** `/api/products/[id]/tags?tagId=xxx`

Elimina una etiqueta específica.

**Query Params:**
- `tagId` (required): ID de la etiqueta a eliminar

**Response:**

```json
{
  "message": "Tag eliminado correctamente"
}
```

---

## 🧪 Testing

### Checklist Manual

#### Test 1: Ver Etiquetas Predefinidas

1. Ir a `/products-modern`
2. Hacer clic en un producto
3. Ir al tab "Promociones"
4. Hacer clic en "Gestionar Etiquetas"
5. ✅ Debe mostrar 17 etiquetas con emojis y colores
6. ✅ Cada tag debe tener descripción
7. ✅ Tags ya aplicados deben mostrar check verde

#### Test 2: Agregar Etiqueta Predefinida

1. En TagManager, seleccionar tab "Etiquetas Predefinidas"
2. Hacer clic en "Nuevo" (azul con ✨)
3. ✅ Debe agregarse al producto inmediatamente
4. ✅ Debe aparecer en "Etiquetas actuales"
5. ✅ Debe mostrar check verde en la lista
6. ✅ Tag debe aparecer en ProductCard sin recargar

#### Test 3: Crear Etiqueta Personalizada

1. En TagManager, seleccionar tab "Etiqueta Personalizada"
2. Ingresar nombre: "Super Oferta"
3. Seleccionar color: `#FF6B9D`
4. Hacer clic en "Agregar Etiqueta Personalizada"
5. ✅ Debe aparecer en "Etiquetas actuales"
6. ✅ Debe tener el color seleccionado
7. ✅ Contador debe incrementar

#### Test 4: Eliminar Etiqueta

1. En "Etiquetas actuales", hacer clic en X de una tag
2. ✅ Debe desaparecer inmediatamente
3. ✅ Contador debe decrementar
4. ✅ Debe poder volver a agregarse
5. ✅ No debe mostrar check verde en predefinidas

#### Test 5: Sugerencias Automáticas

**Caso A: Producto nuevo con bajo stock**

```typescript
product = {
  stock: 5,
  createdAt: new Date(),  // hoy
  price: 50
}
```

✅ Debe sugerir: "Pocas unidades", "Nuevo"

**Caso B: Producto caro con stock normal**

```typescript
product = {
  stock: 100,
  createdAt: new Date('2024-01-01'),
  price: 250
}
```

✅ Debe sugerir: "Disponible", "Premium"

**Caso C: Producto sin stock**

```typescript
product = {
  stock: 0,
  createdAt: new Date('2023-01-01'),
  price: 10
}
```

✅ Debe sugerir solo: "Sin stock"

#### Test 6: Sugerencias No Duplican

1. Aplicar manualmente "Nuevo" al producto
2. Abrir TagManager
3. ✅ "Nuevo" NO debe aparecer en sugerencias
4. ✅ Otras sugerencias deben mostrarse normalmente

#### Test 7: Filtrado por Etiqueta

1. Crear varios productos con diferentes tags
2. En `/products-modern`, usar selector de tag
3. Seleccionar "Nuevo"
4. ✅ Solo deben aparecer productos con tag "Nuevo"
5. Cambiar a "En oferta"
6. ✅ Debe filtrar correctamente
7. Seleccionar "Todos"
8. ✅ Debe mostrar todos los productos

#### Test 8: Validación de Duplicados

1. Agregar tag "Nuevo" a un producto
2. Intentar agregar "Nuevo" nuevamente
3. ✅ Debe mostrar error "Tag ya existe para este producto"
4. ✅ No debe crear duplicado en base de datos

---

## 📊 Estadísticas del Sistema

### Líneas de Código

| Archivo | Líneas | Funcionalidad |
|---------|--------|---------------|
| `predefinedTags.ts` | 220+ | Definiciones y utilidades |
| `TagManager.tsx` | 300+ | Modal de gestión |
| `TagSuggestions.tsx` | 80+ | Panel de sugerencias |
| **TOTAL NUEVO** | **600+** | Sistema completo de tags |

### Archivos Modificados

| Archivo | Líneas Cambiadas | Cambio Principal |
|---------|------------------|------------------|
| `ProductModal.tsx` | ~50 | Integración TagManager |
| `ProductCard.tsx` | ~20 | Display de tags con colores |
| `page.tsx` | ~15 | Callback onTagsUpdate |

---

## 🚀 Próximas Mejoras

### Fase 2 (Futuro)

1. **Analytics de Tags**
   - Dashboard con tags más usados
   - Gráfico de distribución
   - Tags sin uso (report)

2. **Templates de Tags**
   - Guardar combinaciones comunes
   - Ej: "Lanzamiento" = Nuevo + En oferta + Popular
   - Aplicar template con un clic

3. **Tags Compartidos**
   - Tags globales vs por vendedor
   - Permisos de creación

4. **Auto-tagging Avanzado**
   - Machine learning para sugerir tags
   - Basado en historial de ventas
   - Análisis de descripción de producto

5. **Notificaciones**
   - Alert cuando producto "Nuevo" cumpla 30 días
   - Sugerir remover "Pocas unidades" cuando stock aumente

---

## 📝 Notas Finales

### Estado del Sistema

✅ **100% Funcional**
- Backend: API completa con validaciones
- Frontend: UI moderna y responsiva
- Database: Relacional con índices
- Utilidades: 7 funciones helper
- Documentación: Completa

### Bugs Conocidos

❌ **Ninguno reportado**

### Breaking Changes

⚠️ **Ninguno** - Sistema completamente retrocompatible

---

**Última actualización**: 30 de enero de 2025  
**Versión**: 1.0.0  
**Autor**: Sistema de Etiquetas Predefinidas - Food Orders CRM
