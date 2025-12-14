'use client'

import { Sparkles } from 'lucide-react'
import { suggestTags, formatTagLabel, getPredefinedTag } from '@/lib/predefinedTags'
import { Button } from '@/components/ui/button'

interface Product {
  stock: number
  createdAt?: Date | string
  price?: number
}

interface TagSuggestionsProps {
  readonly product: Product
  readonly currentTags: string[]
  readonly onAddTag: (label: string, color: string) => void
  readonly loading?: boolean
}

export default function TagSuggestions({ product, currentTags, onAddTag, loading }: TagSuggestionsProps) {
  // Convertir createdAt si es string
  const productForSuggestion = {
    ...product,
    createdAt: typeof product.createdAt === 'string' 
      ? new Date(product.createdAt) 
      : product.createdAt
  }

  const suggestions = suggestTags(productForSuggestion)
  
  // Filtrar sugerencias que ya están aplicadas
  const availableSuggestions = suggestions.filter(label => !currentTags.includes(label))

  if (availableSuggestions.length === 0) {
    return null
  }

  return (
    <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border-2 border-blue-200">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-5 w-5 text-blue-600" />
        <h3 className="font-semibold text-blue-900">Etiquetas Sugeridas</h3>
        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
          {availableSuggestions.length}
        </span>
      </div>
      
      <p className="text-sm text-blue-700 mb-3">
        Basado en el stock, precio y fecha de creación del producto
      </p>

      <div className="flex flex-wrap gap-2">
        {availableSuggestions.map((label) => {
          const predefinedTag = getPredefinedTag(label)
          if (!predefinedTag) return null

          return (
            <Button
              key={label}
              onClick={() => onAddTag(label, predefinedTag.color)}
              disabled={loading}
              className="text-white font-medium shadow-sm hover:shadow-md transition-all"
              style={{ backgroundColor: predefinedTag.color }}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {formatTagLabel(label)}
            </Button>
          )
        })}
      </div>

      <p className="text-xs text-blue-600 mt-3">
        💡 Sugerencia: Estas etiquetas se generaron automáticamente para ayudarte a categorizar mejor tu producto
      </p>
    </div>
  )
}
