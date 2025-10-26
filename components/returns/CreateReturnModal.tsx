'use client'

import { useState, useEffect } from 'react'
import { X, ChevronLeft, ChevronRight, Package, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Order {
  id: string
  orderNumber: string
  totalAmount: number
  createdAt: string
  orderItems: OrderItem[]
}

interface OrderItem {
  id: string
  productId: string
  productName: string
  quantity: number
  price: number
  subtotal: number
}

interface SelectedItem {
  orderItemId: string
  productId: string
  productName: string
  maxQuantity: number
  quantityReturned: number
  pricePerUnit: number
}

interface CreateReturnModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const RETURN_REASONS = [
  { value: 'DAMAGED', label: '📦 Producto dañado' },
  { value: 'EXPIRED', label: '⏰ Producto vencido' },
  { value: 'WRONG_PRODUCT', label: '❌ Producto incorrecto' },
  { value: 'QUALITY_ISSUE', label: '⚠️ Problema de calidad' },
  { value: 'NOT_AS_DESCRIBED', label: '📝 No coincide con descripción' },
  { value: 'OTHER', label: '🔹 Otro motivo' }
]

const REFUND_TYPES = [
  { value: 'CREDIT', label: '🎫 Crédito en tienda', description: 'Recibe crédito para futuras compras' },
  { value: 'REFUND', label: '💰 Reembolso', description: 'Devolución del dinero' },
  { value: 'REPLACEMENT', label: '🔄 Reemplazo', description: 'Cambio por otro producto' }
]

export default function CreateReturnModal({ isOpen, onClose, onSuccess }: CreateReturnModalProps) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedOrderId, setSelectedOrderId] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [reason, setReason] = useState('DAMAGED')
  const [reasonDescription, setReasonDescription] = useState('')
  const [refundType, setRefundType] = useState('CREDIT')
  const [notes, setNotes] = useState('')
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([])

  useEffect(() => {
    console.log('🔍 [CREATE RETURN MODAL] isOpen cambió a:', isOpen)
    if (isOpen) {
      console.log('📋 [CREATE RETURN MODAL] Ejecutando fetchOrders...')
      fetchOrders()
    }
  }, [isOpen])

  useEffect(() => {
    if (selectedOrderId) {
      const order = orders.find(o => o.id === selectedOrderId)
      setSelectedOrder(order || null)
      if (order) {
        setSelectedItems(
          order.orderItems.map(item => ({
            orderItemId: item.id,
            productId: item.productId,
            productName: item.productName,
            maxQuantity: item.quantity,
            quantityReturned: 0,
            pricePerUnit: item.price
          }))
        )
      }
    }
  }, [selectedOrderId, orders])

  const fetchOrders = async () => {
    try {
      console.log('🔍 [FETCH ORDERS] Iniciando petición a /api/orders...')
      // Buscar órdenes DELIVERED o COMPLETED (ambas son elegibles para devolución)
      const url = '/api/orders?role=client&status=DELIVERED,COMPLETED'
      console.log('📋 [FETCH ORDERS] URL:', url)
      
      const response = await fetch(url)
      const result = await response.json()
      
      console.log('✅ [FETCH ORDERS] Respuesta recibida:', result)
      console.log('📊 [FETCH ORDERS] Órdenes en result.orders:', result.orders?.length || 0)
      console.log('📊 [FETCH ORDERS] Órdenes en result.data:', result.data?.length || 0)
      
      if (result.success) {
        // El endpoint /api/orders devuelve { success: true, orders: [...] }
        const ordersList = result.orders || result.data || []
        console.log('✅ [FETCH ORDERS] Órdenes a guardar:', ordersList.length)
        setOrders(ordersList)
      }
    } catch (error) {
      console.error('❌ [FETCH ORDERS] Error fetching orders:', error)
    }
  }

  const handleItemQuantityChange = (orderItemId: string, quantity: number) => {
    setSelectedItems(prev =>
      prev.map(item =>
        item.orderItemId === orderItemId
          ? { ...item, quantityReturned: Math.min(Math.max(0, quantity), item.maxQuantity) }
          : item
      )
    )
  }

  const getItemsToReturn = () => {
    return selectedItems.filter(item => item.quantityReturned > 0)
  }

  const calculateTotals = () => {
    const items = getItemsToReturn()
    const totalReturnAmount = items.reduce(
      (sum, item) => sum + (item.quantityReturned * item.pricePerUnit),
      0
    )
    const restockFee = 0 // Puede ser configurable
    const finalRefundAmount = totalReturnAmount - restockFee
    
    return { totalReturnAmount, restockFee, finalRefundAmount }
  }

  const canProceedToStep2 = () => {
    return selectedOrderId && reason
  }

  const canProceedToStep3 = () => {
    return getItemsToReturn().length > 0
  }

  const handleSubmit = async () => {
    const itemsToReturn = getItemsToReturn()
    if (itemsToReturn.length === 0) {
      alert('Debes seleccionar al menos un producto para devolver')
      return
    }

    const { totalReturnAmount, restockFee, finalRefundAmount } = calculateTotals()

    const data = {
      orderId: selectedOrderId,
      reason,
      reasonDescription: reasonDescription || undefined,
      refundType,
      notes: notes || undefined,
      totalReturnAmount,
      restockFee,
      finalRefundAmount,
      items: itemsToReturn.map(item => ({
        orderItemId: item.orderItemId,
        productId: item.productId,
        productName: item.productName,
        quantityReturned: item.quantityReturned,
        pricePerUnit: item.pricePerUnit,
        subtotal: item.quantityReturned * item.pricePerUnit
      }))
    }

    try {
      setLoading(true)
      const response = await fetch('/api/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (result.success) {
        onSuccess()
      } else {
        alert(result.error || 'Error al crear la devolución')
      }
    } catch (error) {
      console.error('Error creating return:', error)
      alert('Error al crear la devolución')
    } finally {
      setLoading(false)
    }
  }

  const resetModal = () => {
    setStep(1)
    setSelectedOrderId('')
    setSelectedOrder(null)
    setReason('DAMAGED')
    setReasonDescription('')
    setRefundType('CREDIT')
    setNotes('')
    setSelectedItems([])
  }

  const handleClose = () => {
    resetModal()
    onClose()
  }

  if (!isOpen) return null

  const { totalReturnAmount, restockFee, finalRefundAmount } = calculateTotals()

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Nueva Devolución</h2>
            <p className="text-sm text-gray-600 mt-1">
              Paso {step} de 3: {step === 1 ? 'Información' : step === 2 ? 'Productos' : 'Revisión'}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-4 bg-gray-50">
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex-1">
                <div
                  className={`h-2 rounded-full transition-all ${
                    s <= step ? 'bg-purple-600' : 'bg-gray-200'
                  }`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* PASO 1: Información */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Seleccionar Orden *
                </label>
                <select
                  value={selectedOrderId}
                  onChange={(e) => setSelectedOrderId(e.target.value)}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Selecciona una orden entregada o completada...</option>
                  {orders.map((order) => (
                    <option key={order.id} value={order.id}>
                      {order.orderNumber} - ${Number(order.totalAmount).toFixed(2)} - {' '}
                      {new Date(order.createdAt).toLocaleDateString('es-ES')}
                    </option>
                  ))}
                </select>
                {orders.length === 0 && (
                  <p className="text-sm text-gray-500 mt-2">
                    No tienes órdenes entregadas o completadas disponibles para devolución
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Motivo de la Devolución *
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {RETURN_REASONS.map((r) => (
                    <label
                      key={r.value}
                      className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                        reason === r.value
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="reason"
                        value={r.value}
                        checked={reason === r.value}
                        onChange={(e) => setReason(e.target.value)}
                        className="text-purple-600"
                      />
                      <span className="text-sm font-medium">{r.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Descripción del Motivo (Opcional)
                </label>
                <textarea
                  value={reasonDescription}
                  onChange={(e) => setReasonDescription(e.target.value)}
                  placeholder="Proporciona más detalles sobre el motivo de la devolución..."
                  rows={3}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tipo de Reembolso *
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {REFUND_TYPES.map((type) => (
                    <label
                      key={type.value}
                      className={`flex flex-col gap-2 p-4 border rounded-lg cursor-pointer transition-all ${
                        refundType === type.value
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="refundType"
                          value={type.value}
                          checked={refundType === type.value}
                          onChange={(e) => setRefundType(e.target.value)}
                          className="text-purple-600"
                        />
                        <span className="text-sm font-semibold">{type.label}</span>
                      </div>
                      <p className="text-xs text-gray-600 ml-6">{type.description}</p>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* PASO 2: Productos */}
          {step === 2 && selectedOrder && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-semibold mb-1">Selecciona los productos a devolver</p>
                    <p className="text-blue-700">
                      Indica la cantidad de cada producto que deseas devolver. Puedes devolver todos o solo algunos.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {selectedItems.map((item) => (
                  <div
                    key={item.orderItemId}
                    className="bg-white border rounded-lg p-4 hover:border-purple-300 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="bg-purple-100 p-3 rounded-lg">
                        <Package className="h-6 w-6 text-purple-600" />
                      </div>
                      
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{item.productName}</h4>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                          <span>Precio: ${Number(item.pricePerUnit || 0).toFixed(2)}</span>
                          <span>Cantidad en orden: {item.maxQuantity}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <label className="text-sm font-medium text-gray-700">
                          Cantidad a devolver:
                        </label>
                        <input
                          type="number"
                          min="0"
                          max={item.maxQuantity}
                          value={item.quantityReturned}
                          onChange={(e) => handleItemQuantityChange(item.orderItemId, parseInt(e.target.value) || 0)}
                          className="w-20 px-3 py-2 border rounded-lg text-center focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                        <Button
                          onClick={() => handleItemQuantityChange(item.orderItemId, item.maxQuantity)}
                          size="sm"
                          variant="outline"
                          className="text-xs"
                        >
                          Todo
                        </Button>
                      </div>
                    </div>
                    
                    {item.quantityReturned > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-sm font-semibold text-purple-600">
                          Subtotal: ${(item.quantityReturned * Number(item.pricePerUnit || 0)).toFixed(2)}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {getItemsToReturn().length === 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                  <p className="text-sm text-yellow-800">
                    Debes seleccionar al menos un producto para devolver
                  </p>
                </div>
              )}
            </div>
          )}

          {/* PASO 3: Revisión */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen de la Devolución</h3>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Orden:</p>
                    <p className="font-semibold text-gray-900">{selectedOrder?.orderNumber}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Motivo:</p>
                    <p className="font-semibold text-gray-900">
                      {RETURN_REASONS.find(r => r.value === reason)?.label}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Tipo de Reembolso:</p>
                    <p className="font-semibold text-gray-900">
                      {REFUND_TYPES.find(t => t.value === refundType)?.label}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Productos a devolver:</p>
                    <p className="font-semibold text-gray-900">{getItemsToReturn().length}</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Productos:</h4>
                <div className="space-y-2">
                  {getItemsToReturn().map((item) => (
                    <div key={item.orderItemId} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{item.productName}</p>
                        <p className="text-sm text-gray-600">
                          {item.quantityReturned} × ${Number(item.pricePerUnit || 0).toFixed(2)}
                        </p>
                      </div>
                      <p className="font-semibold text-gray-900">
                        ${(item.quantityReturned * Number(item.pricePerUnit || 0)).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white border-2 border-purple-200 rounded-lg p-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Monto Total:</span>
                    <span className="font-semibold text-gray-900">${totalReturnAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Cargo por Reposición:</span>
                    <span className="font-semibold text-gray-900">${restockFee.toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between">
                    <span className="font-bold text-gray-900">Reembolso Final:</span>
                    <span className="font-bold text-2xl text-purple-600">${finalRefundAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Notas Adicionales (Opcional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Agrega cualquier información adicional..."
                  rows={3}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  ⚠️ Al enviar esta devolución, se creará con estado <strong>PENDIENTE</strong> y
                  deberá ser aprobada por el vendedor.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="flex gap-2">
            {step > 1 && (
              <Button
                onClick={() => setStep(step - 1)}
                variant="outline"
                className="flex items-center gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button onClick={handleClose} variant="outline">
              Cancelar
            </Button>

            {step < 3 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={step === 1 ? !canProceedToStep2() : !canProceedToStep3()}
                className="bg-purple-600 hover:bg-purple-700 flex items-center gap-2"
              >
                Siguiente
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {loading ? 'Enviando...' : 'Crear Devolución'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
