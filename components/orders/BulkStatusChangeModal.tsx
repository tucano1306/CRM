'use client'

import { useState } from 'react'
import { X, CheckCircle, Package, Truck, AlertCircle, Eye, Lock, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

type OrderStatus = 
  | 'PENDING' 
  | 'REVIEWING'
  | 'ISSUE_REPORTED'
  | 'LOCKED'
  | 'CONFIRMED' 
  | 'PREPARING'
  | 'READY_FOR_PICKUP'
  | 'IN_DELIVERY'
  | 'DELIVERED'
  | 'PARTIALLY_DELIVERED'
  | 'COMPLETED' 
  | 'CANCELED'
  | 'PAYMENT_PENDING'
  | 'PAID'

interface BulkStatusChangeModalProps {
  isOpen: boolean
  onClose: () => void
  selectedCount: number
  currentStatus: OrderStatus | null
  onConfirm: (newStatus: OrderStatus, notes?: string) => Promise<void>
}

const STATUS_OPTIONS: { value: OrderStatus; label: string; icon: any; color: string }[] = [
  { value: 'PENDING', label: 'Pendiente', icon: AlertCircle, color: 'text-yellow-600' },
  { value: 'REVIEWING', label: 'En Revisión', icon: Eye, color: 'text-blue-500' },
  { value: 'ISSUE_REPORTED', label: 'Con Problemas', icon: AlertTriangle, color: 'text-red-500' },
  { value: 'LOCKED', label: 'Bloqueada', icon: Lock, color: 'text-green-500' },
  { value: 'CONFIRMED', label: 'Confirmada', icon: CheckCircle, color: 'text-blue-600' },
  { value: 'PREPARING', label: 'Preparando', icon: Package, color: 'text-indigo-600' },
  { value: 'READY_FOR_PICKUP', label: 'Listo para Recoger', icon: Package, color: 'text-purple-600' },
  { value: 'IN_DELIVERY', label: 'En Entrega', icon: Truck, color: 'text-orange-600' },
  { value: 'DELIVERED', label: 'Entregado', icon: CheckCircle, color: 'text-green-600' },
  { value: 'COMPLETED', label: 'Completado', icon: CheckCircle, color: 'text-emerald-600' },
  { value: 'CANCELED', label: 'Cancelado', icon: X, color: 'text-red-600' },
]

export default function BulkStatusChangeModal({
  isOpen,
  onClose,
  selectedCount,
  currentStatus,
  onConfirm
}: BulkStatusChangeModalProps) {
  const [newStatus, setNewStatus] = useState<OrderStatus | ''>('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newStatus) return

    try {
      setLoading(true)
      await onConfirm(newStatus as OrderStatus, notes || undefined)
      onClose()
    } catch (error) {
      console.error('Error updating status:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              📦 Cambio Masivo de Estado
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Actualizar {selectedCount} orden{selectedCount !== 1 ? 'es' : ''} seleccionada{selectedCount !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {currentStatus && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Estado actual:</strong> Todas las órdenes seleccionadas tienen el estado: <strong>{STATUS_OPTIONS.find(s => s.value === currentStatus)?.label}</strong>
              </p>
            </div>
          )}

          {!currentStatus && selectedCount > 1 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-sm text-orange-800">
                <strong>⚠️ Estados mixtos:</strong> Las órdenes seleccionadas tienen diferentes estados. El cambio se aplicará a todas por igual.
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nuevo Estado *
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
            >
              <option value="">-- Selecciona un estado --</option>
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notas (Opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Agrega notas sobre este cambio de estado..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              Las notas se agregarán a todas las órdenes seleccionadas
            </p>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-700 mb-2">
              <strong>Se actualizarán {selectedCount} orden{selectedCount !== 1 ? 'es' : ''}:</strong>
            </p>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              <li>El estado se cambiará a: <strong>{newStatus ? STATUS_OPTIONS.find(s => s.value === newStatus)?.label : 'Seleccionar'}</strong></li>
              <li>Se registrará la fecha y hora del cambio</li>
              {notes && <li>Se agregarán las notas especificadas</li>}
              <li>Se notificará a los clientes afectados</li>
            </ul>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="flex-1"
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-purple-600 hover:bg-purple-700"
              disabled={loading || !newStatus}
            >
              {loading ? 'Actualizando...' : `Actualizar ${selectedCount} Orden${selectedCount !== 1 ? 'es' : ''}`}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
