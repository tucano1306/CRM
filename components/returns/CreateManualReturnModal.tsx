'use client'

import { useState, useEffect } from 'react'
import { X, AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Order {
  id: string
  orderNumber: string
  status: string
  totalAmount: string
  createdAt: string
  client: {
    name: string
  }
}

interface CreateManualReturnModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const MANUAL_RETURN_REASONS = [
  { value: 'DAMAGED_PRODUCT', label: '📦 Producto dañado o defectuoso' },
  { value: 'INCORRECT_PRODUCT', label: '❌ Producto incorrecto enviado' },
  { value: 'CUSTOMER_DISSATISFACTION', label: '😞 Cliente insatisfecho con la calidad' },
  { value: 'PRICING_ERROR', label: '💵 Error en el precio cobrado' },
  { value: 'DUPLICATE_ORDER', label: '🔄 Orden duplicada' },
  { value: 'GOODWILL', label: '🤝 Gesto de buena voluntad' },
  { value: 'OVERCHARGE', label: '💰 Sobrecargo al cliente' },
  { value: 'PROMOTION_ADJUSTMENT', label: '🎁 Ajuste por promoción no aplicada' },
  { value: 'COMPENSATION', label: '⚖️ Compensación por inconveniente' },
  { value: 'OTHER', label: '📝 Otra razón (especificar)' },
]

export default function CreateManualReturnModal({ isOpen, onClose, onSuccess }: CreateManualReturnModalProps) {
  const [loading, setLoading] = useState(false)
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedOrderId, setSelectedOrderId] = useState('')
  const [reason, setReason] = useState('')
  const [customReason, setCustomReason] = useState('')
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      fetchCompletedOrders()
    }
  }, [isOpen])

  const fetchCompletedOrders = async () => {
    try {
      setLoadingOrders(true)
      const response = await fetch('/api/orders?role=seller&status=DELIVERED,COMPLETED')
      const result = await response.json()
      
      if (result.success) {
        const ordersList = result.orders || result.data || []
        setOrders(ordersList)
      }
    } catch (error) {
      console.error('Error fetching orders:', error)
      setError('Error al cargar órdenes')
    } finally {
      setLoadingOrders(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validaciones
    if (!selectedOrderId) {
      setError('Selecciona una orden')
      return
    }

    if (!reason) {
      setError('Selecciona una razón')
      return
    }

    if (reason === 'OTHER' && !customReason.trim()) {
      setError('Especifica la razón personalizada')
      return
    }

    const returnAmount = parseFloat(amount)
    if (isNaN(returnAmount) || returnAmount <= 0) {
      setError('Ingresa un monto válido mayor a 0')
      return
    }

    const selectedOrder = orders.find(o => o.id === selectedOrderId)
    if (selectedOrder && returnAmount > parseFloat(selectedOrder.totalAmount)) {
      setError(`El monto no puede exceder el total de la orden ($${parseFloat(selectedOrder.totalAmount).toFixed(2)})`)
      return
    }

    try {
      setLoading(true)

      const response = await fetch('/api/returns/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: selectedOrderId,
          reason: reason,
          reasonDescription: reason === 'OTHER' ? customReason : MANUAL_RETURN_REASONS.find(r => r.value === reason)?.label,
          amount: returnAmount,
          notes: notes || null
        })
      })

      const result = await response.json()

      if (result.success) {
        onSuccess()
        resetForm()
        onClose()
      } else {
        setError(result.error || 'Error al crear la devolución')
      }
    } catch (error) {
      console.error('Error creating manual return:', error)
      setError('Error al crear la devolución')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setSelectedOrderId('')
    setReason('')
    setCustomReason('')
    setAmount('')
    setNotes('')
    setError('')
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  if (!isOpen) return null

  const selectedOrder = orders.find(o => o.id === selectedOrderId)

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-red-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              🔄 Crear Devolución Manual
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Procesa devoluciones y genera créditos automáticamente
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Seleccionar Orden */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Seleccionar Orden *
            </label>
            {loadingOrders ? (
              <div className="text-sm text-gray-500">Cargando órdenes...</div>
            ) : (
              <select
                value={selectedOrderId}
                onChange={(e) => setSelectedOrderId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
              >
                <option value="">-- Selecciona una orden --</option>
                {orders.map((order) => (
                  <option key={order.id} value={order.id}>
                    {order.orderNumber} - {order.client.name} - ${parseFloat(order.totalAmount).toFixed(2)} - {new Date(order.createdAt).toLocaleDateString()}
                  </option>
                ))}
              </select>
            )}
            {selectedOrder && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Cliente:</strong> {selectedOrder.client.name} | 
                  <strong> Total:</strong> ${parseFloat(selectedOrder.totalAmount).toFixed(2)}
                </p>
              </div>
            )}
          </div>

          {/* Razón de Devolución */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Razón de la Devolución *
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              required
            >
              <option value="">-- Selecciona una razón --</option>
              {MANUAL_RETURN_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Razón Personalizada */}
          {reason === 'OTHER' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Especifica la Razón *
              </label>
              <input
                type="text"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Ej: Cliente reportó alergia al producto"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required={reason === 'OTHER'}
              />
            </div>
          )}

          {/* Monto a Devolver */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Monto a Devolver (USD) *
            </label>
            <div className="relative">
              <span className="absolute left-4 top-2.5 text-gray-500 font-semibold">$</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={selectedOrder ? parseFloat(selectedOrder.totalAmount) : undefined}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
              />
            </div>
            {selectedOrder && (
              <p className="text-xs text-gray-500 mt-1">
                Máximo: ${parseFloat(selectedOrder.totalAmount).toFixed(2)}
              </p>
            )}
          </div>

          {/* Notas Internas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notas Internas (Opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Información adicional sobre esta devolución..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Info Box */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-green-800">
                <p className="font-semibold mb-1">✓ Se creará automáticamente:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Registro de devolución aprobada</li>
                  <li>Nota de crédito por el monto especificado</li>
                  <li>Notificación al comprador</li>
                  <li>Crédito disponible inmediatamente</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              type="button"
              onClick={handleClose}
              variant="outline"
              className="flex-1"
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-orange-600 hover:bg-orange-700"
              disabled={loading}
            >
              {loading ? 'Procesando...' : 'Crear Devolución y Crédito'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
