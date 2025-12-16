'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Edit2, Save, X, MapPin, Truck } from 'lucide-react'

interface DeliveryInstructionsProps {
  readonly orderId: string
  readonly currentInstructions: string | null
  readonly onSave: (orderId: string, instructions: string) => Promise<void>
  readonly editable?: boolean
}

export default function DeliveryInstructions({ 
  orderId, 
  currentInstructions, 
  onSave,
  editable = true 
}: DeliveryInstructionsProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [instructions, setInstructions] = useState(currentInstructions || '')
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    try {
      setIsSaving(true)
      await onSave(orderId, instructions)
      setIsEditing(false)
    } catch (error) {
      console.error('Error guardando instrucciones:', error)
      alert('Error al guardar las instrucciones de entrega')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setInstructions(currentInstructions || '')
    setIsEditing(false)
  }

  // Helper function to render display state (non-editing)
  const renderInstructionsDisplay = () => {
    if (currentInstructions) {
      return (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 flex-1">
              <MapPin className="h-4 w-4 text-purple-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-purple-900">{currentInstructions}</p>
            </div>
            {editable && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsEditing(true)}
                className="flex-shrink-0"
              >
                <Edit2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      )
    }
    
    if (editable) {
      return (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsEditing(true)}
          className="gap-2 text-purple-600 border-purple-300 hover:bg-purple-50"
        >
          <MapPin className="h-4 w-4" />
          Agregar instrucciones de entrega
        </Button>
      )
    }
    
    return <p className="text-sm text-gray-500 italic">Sin instrucciones de entrega</p>
  }

  if (!editable && !currentInstructions) {
    return null
  }

  return (
    <div className="bg-white rounded-lg p-4 border">
      <div className="flex items-center gap-2 mb-3">
        <Truck className="h-5 w-5 text-purple-600" />
        <h4 className="font-semibold text-gray-800">Instrucciones de Entrega</h4>
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Ej: Tocar el timbre dos veces, entregar en recepción, llamar al llegar..."
            rows={3}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
            autoFocus
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="gap-1"
            >
              <Save className="h-3 w-3" />
              Guardar
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              disabled={isSaving}
              className="gap-1"
            >
              <X className="h-3 w-3" />
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        renderInstructionsDisplay()
      )}
    </div>
  )
}
