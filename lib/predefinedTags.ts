/**
 * Sistema de etiquetas predefinidas para productos
 */

export interface PredefinedTag {
  label: string
  color: string
  description?: string
  icon?: string
}

export const predefinedTags: PredefinedTag[] = [
  // Estado del producto
  { 
    label: 'Nuevo', 
    color: '#3B82F6',
    description: 'Productos recientemente agregados',
    icon: '✨'
  },
  { 
    label: 'Popular', 
    color: '#10B981',
    description: 'Productos más vendidos',
    icon: '🔥'
  },
  { 
    label: 'Bestseller', 
    color: '#8B5CF6',
    description: 'Productos top en ventas',
    icon: '⭐'
  },
  
  // Promociones
  { 
    label: 'En oferta', 
    color: '#F87171',
    description: 'Productos con descuento',
    icon: '💰'
  },
  { 
    label: 'Oferta Flash', 
    color: '#F59E0B',
    description: 'Oferta por tiempo limitado',
    icon: '⚡'
  },
  { 
    label: 'Promoción', 
    color: '#EC4899',
    description: 'Productos en promoción especial',
    icon: '🎁'
  },
  
  // Stock
  { 
    label: 'Sin stock', 
    color: '#6B7280',
    description: 'Producto agotado',
    icon: '❌'
  },
  { 
    label: 'Pocas unidades', 
    color: '#F59E0B',
    description: 'Stock limitado',
    icon: '⚠️'
  },
  { 
    label: 'Disponible', 
    color: '#10B981',
    description: 'En stock',
    icon: '✅'
  },
  
  // Características
  { 
    label: 'Orgánico', 
    color: '#22C55E',
    description: 'Producto orgánico certificado',
    icon: '🌱'
  },
  { 
    label: 'Premium', 
    color: '#F59E0B',
    description: 'Producto premium',
    icon: '👑'
  },
  { 
    label: 'Económico', 
    color: '#06B6D4',
    description: 'Producto económico',
    icon: '💵'
  },
  
  // Recurrencia
  { 
    label: 'Recurrente', 
    color: '#FBBF24',
    description: 'Pedido frecuente',
    icon: '🔄'
  },
  { 
    label: 'Por encargo', 
    color: '#A855F7',
    description: 'Solo bajo pedido',
    icon: '📋'
  },
  
  // Temporada
  { 
    label: 'Temporada', 
    color: '#14B8A6',
    description: 'Producto de temporada',
    icon: '🗓️'
  },
  { 
    label: 'Navidad', 
    color: '#DC2626',
    description: 'Producto navideño',
    icon: '🎄'
  },
  { 
    label: 'Verano', 
    color: '#F59E0B',
    description: 'Producto de verano',
    icon: '☀️'
  },
]

/**
 * Obtiene una etiqueta predefinida por su label
 */
export function getPredefinedTag(label: string): PredefinedTag | undefined {
  return predefinedTags.find(tag => tag.label === label)
}

/**
 * Obtiene todas las etiquetas de una categoría
 */
export function getTagsByCategory(category: 'estado' | 'promociones' | 'stock' | 'características' | 'recurrencia' | 'temporada') {
  const categories = {
    estado: ['Nuevo', 'Popular', 'Bestseller'],
    promociones: ['En oferta', 'Oferta Flash', 'Promoción'],
    stock: ['Sin stock', 'Pocas unidades', 'Disponible'],
    características: ['Orgánico', 'Premium', 'Económico'],
    recurrencia: ['Recurrente', 'Por encargo'],
    temporada: ['Temporada', 'Navidad', 'Verano']
  }
  
  return predefinedTags.filter(tag => categories[category].includes(tag.label))
}

/**
 * Valida si un color es válido (formato hex)
 */
export function isValidColor(color: string): boolean {
  return /^#[0-9A-F]{6}$/i.test(color)
}

/**
 * Genera un color aleatorio para etiquetas personalizadas
 */
export function generateRandomColor(): string {
  const colors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#EC4899', '#14B8A6', '#F97316', '#06B6D4', '#84CC16'
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}

/**
 * Obtiene sugerencias de etiquetas basadas en el producto
 */
export function suggestTags(product: {
  stock: number
  createdAt?: Date | string
  price?: number
}): string[] {
  const suggestions: string[] = []
  
  // Stock
  if (product.stock === 0) {
    suggestions.push('Sin stock')
  } else if (product.stock < 10) {
    suggestions.push('Pocas unidades')
  } else {
    suggestions.push('Disponible')
  }
  
  // Nuevo (últimos 30 días)
  if (product.createdAt) {
    const createdDate = typeof product.createdAt === 'string' 
      ? new Date(product.createdAt) 
      : product.createdAt
    const daysSinceCreation = Math.floor(
      (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
    )
    if (daysSinceCreation <= 30) {
      suggestions.push('Nuevo')
    }
  }
  
  // Premium (precio alto)
  if (product.price && product.price > 100) {
    suggestions.push('Premium')
  }
  
  return suggestions
}

/**
 * Formatea el nombre de una etiqueta con su emoji
 */
export function formatTagLabel(label: string): string {
  const tag = getPredefinedTag(label)
  return tag?.icon ? `${tag.icon} ${label}` : label
}
