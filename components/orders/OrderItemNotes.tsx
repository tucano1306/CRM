'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Edit2, Save, X, FileText } from 'lucide-react'

interface OrderItemNotesProps {
  itemId: string
  productName: string
  currentNote: string | null
  onSave: (itemId: string, note: string) => Promise<void>
  editable?: boolean
}

export default function OrderItemNotes({ 
  itemId, 
  productName, 
  currentNote, 
  onSave,
  editable = true 
}: OrderItemNotesProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [note, setNote] = useState(currentNote || '')
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    try {
      setIsSaving(true)
      await onSave(itemId, note)
      setIsEditing(false)
    } catch (error) {
      console.error('Error guardando nota:', error)
      alert('Error al guardar la nota')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setNote(currentNote || '')
    setIsEditing(false)
  }

  if (!editable && !currentNote) {
    return null
  }

  return (
    <div className="mt-2">
      {isEditing ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
            <FileText className="h-3 w-3" />
            <span className="font-medium">Nota para {productName}</span>
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ej: Sin cebolla, Extra salsa, Empaque especial..."
            rows={2}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
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
      ) : currentNote ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 flex-1">
              <FileText className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-blue-600 font-medium mb-1">Nota:</p>
                <p className="text-sm text-blue-900">{currentNote}</p>
              </div>
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
      ) : editable ? (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setIsEditing(true)}
          className="gap-1 text-gray-600"
        >
          <Edit2 className="h-3 w-3" />
          Agregar nota
        </Button>
      ) : null}
    </div>
  )
}
