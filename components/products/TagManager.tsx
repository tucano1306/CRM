'use client'

import { useState } from 'react'
import { X, Plus, Tag as TagIcon, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { predefinedTags, type PredefinedTag } from '@/lib/predefinedTags'
import TagSuggestions from './TagSuggestions'

interface ProductTag {
  id: string
  label: string
  color: string
}

interface Product {
  id: string
  stock: number
  createdAt?: Date | string
  price?: number
}

interface TagManagerProps {
  productId: string
  product?: Product
  currentTags: ProductTag[]
  onTagsUpdate: (tags: ProductTag[]) => void
}

export default function TagManager({ productId, product, currentTags, onTagsUpdate }: TagManagerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [customLabel, setCustomLabel] = useState('')
  const [customColor, setCustomColor] = useState('#6B7280')
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'predefined' | 'custom'>('predefined')

  const hasTag = (label: string) => {
    return currentTags.some(tag => tag.label === label)
  }

  const addTag = async (label: string, color: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/products/${productId}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, color })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al agregar etiqueta')
      }

      const data = await response.json()
      onTagsUpdate([...currentTags, data.tag])
    } catch (error) {
      console.error('Error adding tag:', error)
      alert(error instanceof Error ? error.message : 'Error al agregar etiqueta')
    } finally {
      setLoading(false)
    }
  }

  const removeTag = async (tagId: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/products/${productId}/tags?tagId=${tagId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Error al eliminar etiqueta')
      }

      onTagsUpdate(currentTags.filter(tag => tag.id !== tagId))
    } catch (error) {
      console.error('Error removing tag:', error)
      alert('Error al eliminar etiqueta')
    } finally {
      setLoading(false)
    }
  }

  const handleAddCustomTag = async () => {
    if (!customLabel.trim()) {
      alert('Por favor ingrese un nombre para la etiqueta')
      return
    }

    await addTag(customLabel.trim(), customColor)
    setCustomLabel('')
    setCustomColor('#6B7280')
  }

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="bg-orange-600 hover:bg-orange-700"
      >
        <TagIcon className="mr-2 h-4 w-4" />
        Gestionar Etiquetas
      </Button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Gestionar Etiquetas</h2>
              <p className="text-sm opacity-90 mt-1">
                {currentTags.length} etiqueta{currentTags.length !== 1 ? 's' : ''} asignada{currentTags.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Current Tags */}
        {currentTags.length > 0 && (
          <div className="p-4 bg-gray-50 border-b">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Etiquetas actuales:</h3>
            <div className="flex flex-wrap gap-2">
              {currentTags.map(tag => (
                <div
                  key={tag.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-white font-medium shadow-sm"
                  style={{ backgroundColor: tag.color }}
                >
                  <span>{tag.label}</span>
                  <button
                    onClick={() => removeTag(tag.id)}
                    disabled={loading}
                    className="hover:bg-white/20 rounded p-0.5 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('predefined')}
            className={`flex-1 px-6 py-3 font-medium transition-colors ${
              activeTab === 'predefined'
                ? 'text-orange-600 border-b-2 border-orange-600 bg-orange-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <TagIcon className="inline h-4 w-4 mr-2" />
            Etiquetas Predefinidas
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`flex-1 px-6 py-3 font-medium transition-colors ${
              activeTab === 'custom'
                ? 'text-orange-600 border-b-2 border-orange-600 bg-orange-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Plus className="inline h-4 w-4 mr-2" />
            Etiqueta Personalizada
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Tag Suggestions */}
          {product && (
            <TagSuggestions
              product={product}
              currentTags={currentTags.map(t => t.label)}
              onAddTag={addTag}
              loading={loading}
            />
          )}

          {activeTab === 'predefined' ? (
            <div className="space-y-4">
              {predefinedTags.map((tag: PredefinedTag) => {
                const isActive = hasTag(tag.label)
                return (
                  <button
                    key={tag.label}
                    onClick={() => !isActive && addTag(tag.label, tag.color)}
                    disabled={loading || isActive}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      isActive
                        ? 'border-green-500 bg-green-50 cursor-not-allowed'
                        : 'border-gray-200 hover:border-orange-500 hover:bg-orange-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
                          style={{ backgroundColor: tag.color }}
                        >
                          {tag.icon || '🏷️'}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">{tag.label}</span>
                            {isActive && (
                              <Check className="h-5 w-5 text-green-600" />
                            )}
                          </div>
                          {tag.description && (
                            <p className="text-sm text-gray-600">{tag.description}</p>
                          )}
                        </div>
                      </div>
                      <div
                        className="w-6 h-6 rounded border-2 border-gray-300"
                        style={{ backgroundColor: tag.color }}
                      />
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre de la etiqueta
                </label>
                <input
                  type="text"
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  placeholder="Ej: Oferta especial"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  maxLength={30}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {customLabel.length}/30 caracteres
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="color"
                    value={customColor}
                    onChange={(e) => setCustomColor(e.target.value)}
                    className="h-12 w-20 rounded border border-gray-300 cursor-pointer"
                  />
                  <div className="flex-1">
                    <div
                      className="px-4 py-2 rounded-lg text-white font-medium text-center"
                      style={{ backgroundColor: customColor }}
                    >
                      {customLabel || 'Vista previa'}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Código: {customColor}
                </p>
              </div>

              <Button
                onClick={handleAddCustomTag}
                disabled={loading || !customLabel.trim()}
                className="w-full bg-orange-600 hover:bg-orange-700"
              >
                <Plus className="mr-2 h-4 w-4" />
                Agregar Etiqueta Personalizada
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-gray-50 flex justify-end">
          <Button
            onClick={() => setIsOpen(false)}
            variant="outline"
          >
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  )
}
