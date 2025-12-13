'use client'

import { useState, useEffect } from 'react'
import { X, CheckCircle, Package, Truck, AlertCircle, Eye, Lock, AlertTriangle, Check, Send, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatPrice } from '@/lib/utils'

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

type StockIssueType = 'OUT_OF_STOCK' | 'PARTIAL_STOCK' | null

interface OrderItem {
  id: string
  productId?: string
  productName: string
  quantity: number
  pricePerUnit: number
  subtotal: number
  product?: {
    id?: string
    sku?: string | null
    unit?: string
    stock?: number
  }
}

interface SelectedOrder {
  id: string
  orderNumber: string
  status: OrderStatus
  totalAmount: number
  clientId: string
  client: {
    id: string
    name: string
    email: string
    phone?: string
  }
  orderItems: OrderItem[]
}

interface ProductIssue {
  productId: string
  productName: string
  issueType: StockIssueType
  requestedQty: number
  availableQty: number
}

interface BulkStatusChangeModalProps {
  isOpen: boolean
  onClose: () => void
  selectedCount: number
  currentStatus: OrderStatus | null
  onConfirm: (newStatus: OrderStatus, notes?: string) => Promise<void>
  selectedOrdersData?: SelectedOrder[]
  onReportStockIssues?: (orderId: string, issues: ProductIssue[]) => Promise<void>
}

const STATUS_OPTIONS: { value: OrderStatus; label: string; icon: React.ElementType; color: string }[] = [
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
  onConfirm,
  selectedOrdersData = [],
  onReportStockIssues
}: BulkStatusChangeModalProps) {
  const [newStatus, setNewStatus] = useState<OrderStatus | ''>('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  
  // Estado para problemas de stock
  const [productIssues, setProductIssues] = useState<Map<string, ProductIssue>>(new Map())

  // Reset al cerrar
  useEffect(() => {
    if (!isOpen) {
      setNewStatus('')
      setNotes('')
      setProductIssues(new Map())
    }
  }, [isOpen])

  if (!isOpen) return null

  // Obtener la orden seleccionada (si es solo 1)
  const singleOrder = selectedOrdersData.length === 1 ? selectedOrdersData[0] : null
  const orderItems = singleOrder?.orderItems || []
  const hasProducts = orderItems.length > 0

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

  const toggleProductIssue = (item: OrderItem, issueType: StockIssueType) => {
    const key = item.id
    const newMap = new Map(productIssues)
    
    const existing = newMap.get(key)
    
    if (existing?.issueType === issueType) {
      newMap.delete(key)
    } else {
      newMap.set(key, {
        productId: item.productId || item.id,
        productName: item.productName,
        issueType,
        requestedQty: item.quantity,
        availableQty: issueType === 'OUT_OF_STOCK' ? 0 : Math.floor(item.quantity / 2)
      })
    }
    
    setProductIssues(newMap)
  }

  const updateAvailableQty = (itemId: string, qty: number) => {
    const newMap = new Map(productIssues)
    const existing = newMap.get(itemId)
    if (existing) {
      newMap.set(itemId, { ...existing, availableQty: qty })
      setProductIssues(newMap)
    }
  }

  const handleSendStockNotification = async () => {
    if (!singleOrder || productIssues.size === 0 || !onReportStockIssues) return

    try {
      setLoading(true)
      const issues = Array.from(productIssues.values()).filter(i => i.issueType !== null)
      await onReportStockIssues(singleOrder.id, issues)
      onClose()
    } catch (error) {
      console.error('Error reporting stock issues:', error)
    } finally {
      setLoading(false)
    }
  }

  const issuesCount = Array.from(productIssues.values()).filter(i => i.issueType !== null).length

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              📦 Revisar Orden
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {singleOrder 
                ? `Orden #${singleOrder.orderNumber} - ${singleOrder.client?.name || 'Cliente'}`
                : `${selectedCount} orden${selectedCount !== 1 ? 'es' : ''} seleccionada${selectedCount !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Sección de Productos - Solo si hay una orden y tiene productos */}
          {hasProducts && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-800 font-medium">
                  ⚠️ ¿Hay productos sin stock o con stock parcial?
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  Selecciona los productos con problemas para notificar al comprador
                </p>
              </div>

              {/* Lista de productos */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-100 px-4 py-3 border-b">
                  <h4 className="font-medium text-sm flex items-center justify-between">
                    <span>📋 Productos de la Orden</span>
                    <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">{orderItems.length} productos</span>
                  </h4>
                </div>
                
                <div className="divide-y max-h-[250px] overflow-y-auto">
                  {orderItems.map((item) => {
                    const issue = productIssues.get(item.id)
                    const isOutOfStock = issue?.issueType === 'OUT_OF_STOCK'
                    const isPartialStock = issue?.issueType === 'PARTIAL_STOCK'
                    const hasIssue = isOutOfStock || isPartialStock

                    return (
                      <div 
                        key={item.id}
                        className={`p-4 transition-colors ${hasIssue ? 'bg-red-50' : 'hover:bg-gray-50'}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{item.productName}</p>
                            <p className="text-sm text-gray-500">
                              Cantidad: {item.quantity} {item.product?.unit || 'unid.'} • {formatPrice(item.subtotal)}
                            </p>
                          </div>

                          <div className="flex gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => toggleProductIssue(item, 'OUT_OF_STOCK')}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                                isOutOfStock
                                  ? 'bg-red-600 text-white ring-2 ring-red-300'
                                  : 'bg-gray-100 text-gray-700 hover:bg-red-100 hover:text-red-700'
                              }`}
                            >
                              {isOutOfStock && <Check className="w-3 h-3" />}
                              ❌ Sin Stock
                            </button>

                            <button
                              type="button"
                              onClick={() => toggleProductIssue(item, 'PARTIAL_STOCK')}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                                isPartialStock
                                  ? 'bg-yellow-500 text-white ring-2 ring-yellow-300'
                                  : 'bg-gray-100 text-gray-700 hover:bg-yellow-100 hover:text-yellow-700'
                              }`}
                            >
                              {isPartialStock && <Check className="w-3 h-3" />}
                              ⚠️ Parcial
                            </button>
                          </div>
                        </div>

                        {isPartialStock && (
                          <div className="mt-3 flex items-center gap-3 pl-4 border-l-2 border-yellow-400">
                            <label className="text-sm text-gray-600">Cantidad disponible:</label>
                            <input
                              type="number"
                              min="0"
                              max={item.quantity - 1}
                              value={issue?.availableQty || 0}
                              onChange={(e) => updateAvailableQty(item.id, parseInt(e.target.value) || 0)}
                              className="w-20 px-2 py-1 border rounded text-sm"
                            />
                            <span className="text-xs text-gray-500">de {item.quantity} solicitados</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Botón de notificar - solo si hay issues */}
              {issuesCount > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h5 className="font-medium text-red-800 mb-2">📋 Problemas seleccionados ({issuesCount})</h5>
                  <ul className="text-sm text-red-700 space-y-1 mb-3">
                    {Array.from(productIssues.values())
                      .filter(i => i.issueType)
                      .map((issue, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <span>{issue.issueType === 'OUT_OF_STOCK' ? '❌' : '⚠️'}</span>
                          <span className="font-medium">{issue.productName}</span>
                          <span className="text-red-600">
                            {issue.issueType === 'OUT_OF_STOCK' 
                              ? '(Sin stock)'
                              : `(Disponible: ${issue.availableQty} de ${issue.requestedQty})`}
                          </span>
                        </li>
                      ))}
                  </ul>
                  <Button
                    onClick={handleSendStockNotification}
                    className="w-full bg-red-600 hover:bg-red-700"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Notificar al Comprador
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Separador visual */}
          {hasProducts && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">O cambiar estado</span>
              </div>
            </div>
          )}

          {/* Sección de Cambio de Estado */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {currentStatus && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Estado actual:</strong> {STATUS_OPTIONS.find(s => s.value === currentStatus)?.label}
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nuevo Estado
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                placeholder="Agrega notas sobre este cambio..."
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              />
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button type="button" onClick={onClose} variant="outline" className="flex-1" disabled={loading}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="flex-1 bg-purple-600 hover:bg-purple-700" 
                disabled={loading || !newStatus}
              >
                {loading ? 'Actualizando...' : 'Cambiar Estado'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
