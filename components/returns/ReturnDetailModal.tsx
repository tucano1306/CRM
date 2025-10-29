'use client'

import { useState } from 'react'
import { X, Package, Info, Settings, CheckCircle, XCircle, Clock, DollarSign } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface ReturnItem {
  id: string
  productName: string
  quantityReturned: number
  pricePerUnit: number
  subtotal: number
  restocked: boolean
  restockedAt: string | null
}

interface Return {
  id: string
  returnNumber: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED'
  reason: string
  reasonDescription?: string
  refundType: 'REFUND' | 'CREDIT' | 'REPLACEMENT'
  totalReturnAmount: number
  restockFee: number
  finalRefundAmount: number
  notes?: string
  isManual?: boolean
  createdAt: string
  approvedAt?: string
  completedAt?: string
  order: {
    orderNumber: string
  }
  client?: {
    name: string
    email: string
  }
  seller?: {
    businessName?: string
    name?: string
  }
  items: ReturnItem[]
  creditNote?: {
    creditNoteNumber: string
    amount: number
    balance: number
  }
}

interface ReturnDetailModalProps {
  returnRecord: Return
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
  role?: 'seller' | 'client'
}

const RETURN_REASONS = {
  DAMAGED: '📦 Producto dañado',
  EXPIRED: '⏰ Producto vencido',
  WRONG_PRODUCT: '❌ Producto incorrecto',
  QUALITY_ISSUE: '⚠️ Problema de calidad',
  NOT_AS_DESCRIBED: '📝 No coincide con descripción',
  OTHER: '🔹 Otro motivo'
}

const REFUND_TYPES = {
  REFUND: '💰 Reembolso',
  CREDIT: '🎫 Crédito en tienda',
  REPLACEMENT: '🔄 Reemplazo'
}

export default function ReturnDetailModal({ returnRecord, isOpen, onClose, onUpdate, role = 'seller' }: ReturnDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'items' | 'actions'>('info')
  const [loading, setLoading] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [restockInventory, setRestockInventory] = useState(true)

  const handleApprove = async () => {
    if (!confirm('¿Estás seguro de aprobar esta devolución?')) return

    try {
      setLoading(true)
      const response = await fetch(`/api/returns/${returnRecord.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })

      const result = await response.json()

      if (result.success) {
        alert('Devolución aprobada exitosamente')
        onUpdate()
        onClose()
      } else {
        alert(result.error || 'Error al aprobar')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al aprobar la devolución')
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Debes proporcionar un motivo de rechazo')
      return
    }

    if (!confirm('¿Estás seguro de rechazar esta devolución?')) return

    try {
      setLoading(true)
      const response = await fetch(`/api/returns/${returnRecord.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejectionReason })
      })

      const result = await response.json()

      if (result.success) {
        alert('Devolución rechazada')
        onUpdate()
        onClose()
      } else {
        alert(result.error || 'Error al rechazar')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al rechazar la devolución')
    } finally {
      setLoading(false)
    }
  }

  const handleComplete = async () => {
    if (!confirm('¿Estás seguro de completar esta devolución? Esta acción no se puede deshacer.')) return

    try {
      setLoading(true)
      const response = await fetch(`/api/returns/${returnRecord.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restockInventory })
      })

      const result = await response.json()

      if (result.success) {
        const message = returnRecord.refundType === 'CREDIT'
          ? 'Devolución completada y nota de crédito generada'
          : 'Devolución completada exitosamente'
        alert(message)
        onUpdate()
        onClose()
      } else {
        alert(result.error || 'Error al completar')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al completar la devolución')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de eliminar esta devolución? Esta acción no se puede deshacer.')) return

    try {
      setLoading(true)
      const response = await fetch(`/api/returns/${returnRecord.id}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        alert('Devolución eliminada')
        onUpdate()
        onClose()
      } else {
        alert(result.error || 'Error al eliminar')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al eliminar la devolución')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const canApprove = role === 'seller' && returnRecord.status === 'PENDING'
  const canReject = role === 'seller' && returnRecord.status === 'PENDING'
  const canComplete = role === 'seller' && returnRecord.status === 'APPROVED'
  const canDelete = returnRecord.status === 'PENDING' || returnRecord.status === 'REJECTED'

  const getStatusBadge = () => {
    const badges = {
      PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock, label: 'Pendiente' },
      APPROVED: { bg: 'bg-blue-100', text: 'text-blue-800', icon: CheckCircle, label: 'Aprobada' },
      REJECTED: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle, label: 'Rechazada' },
      COMPLETED: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle, label: 'Completada' }
    }
    const badge = badges[returnRecord.status]
    const Icon = badge.icon
    return (
      <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${badge.bg}`}>
        <Icon className={`h-5 w-5 ${badge.text}`} />
        <span className={`font-semibold ${badge.text}`}>{badge.label}</span>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/90 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full h-full sm:h-auto sm:max-w-4xl sm:rounded-lg shadow-xl sm:max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b bg-gradient-to-r from-purple-50 to-pink-50">
          <div className="flex items-start justify-between gap-2 mb-3">
            <h2 className="text-lg sm:text-2xl font-bold text-gray-900 flex-1">{returnRecord.returnNumber}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
            >
              <X className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
          </div>
          
          <div className="flex flex-col gap-2 mb-3">
            {getStatusBadge()}
            
            {/* Badge de origen de devolución */}
            {returnRecord.isManual ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-100 border border-orange-300 w-fit">
                <span className="text-xs font-semibold text-orange-800">
                  🛠️ Devolución Manual por Vendedor
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 border border-blue-300 w-fit">
                <span className="text-xs font-semibold text-blue-800">
                  📝 Solicitud del Cliente
                </span>
              </div>
            )}
          </div>
          
          <p className="text-xs sm:text-sm text-gray-600">
            Orden: {returnRecord.order.orderNumber}<br className="sm:hidden" />
            <span className="hidden sm:inline"> | </span>
            Creada: {new Date(returnRecord.createdAt).toLocaleDateString('es-ES', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex border-b bg-gray-50 overflow-x-auto">
          <button
            onClick={() => setActiveTab('info')}
            className={`flex-1 min-w-[100px] px-3 sm:px-6 py-3 font-medium transition-colors flex items-center justify-center gap-1 sm:gap-2 text-sm sm:text-base ${
              activeTab === 'info'
                ? 'text-purple-600 border-b-2 border-purple-600 bg-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Info className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="hidden sm:inline">Información</span>
            <span className="sm:hidden">Info</span>
          </button>
          <button
            onClick={() => setActiveTab('items')}
            className={`flex-1 min-w-[120px] px-3 sm:px-6 py-3 font-medium transition-colors flex items-center justify-center gap-1 sm:gap-2 text-sm sm:text-base ${
              activeTab === 'items'
                ? 'text-purple-600 border-b-2 border-purple-600 bg-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Package className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="hidden sm:inline">Productos ({returnRecord.items.length})</span>
            <span className="sm:hidden">({returnRecord.items.length})</span>
          </button>
          {role === 'seller' && (
            <button
              onClick={() => setActiveTab('actions')}
              className={`flex-1 min-w-[100px] px-3 sm:px-6 py-3 font-medium transition-colors flex items-center justify-center gap-1 sm:gap-2 text-sm sm:text-base ${
                activeTab === 'actions'
                  ? 'text-purple-600 border-b-2 border-purple-600 bg-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>Acciones</span>
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* TAB: Información */}
          {activeTab === 'info' && (
            <div className="space-y-6">
              {/* Información de Origen */}
              <div className={`border rounded-lg p-4 ${returnRecord.isManual ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200'}`}>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  {returnRecord.isManual ? '🛠️' : '📝'} Origen de la Devolución
                </h3>
                <div className="space-y-2 text-sm">
                  {returnRecord.isManual ? (
                    <>
                      <p className="text-gray-800">
                        <span className="font-medium">Tipo:</span> Devolución Manual creada por el Vendedor
                      </p>
                      <p className="text-gray-700">
                        Esta devolución fue generada directamente por el vendedor como un gesto de servicio al cliente. 
                        No requirió aprobación previa ya que fue procesada automáticamente.
                      </p>
                      {returnRecord.seller && (
                        <p className="text-gray-800 mt-2">
                          <span className="font-medium">Vendedor:</span> {returnRecord.seller.name || returnRecord.seller.businessName || 'N/A'}
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="text-gray-800">
                        <span className="font-medium">Tipo:</span> Solicitud de Devolución del Cliente
                      </p>
                      <p className="text-gray-700">
                        Esta devolución fue solicitada por el cliente y {returnRecord.status === 'PENDING' ? 'está pendiente de revisión' : returnRecord.status === 'APPROVED' ? 'fue aprobada' : returnRecord.status === 'REJECTED' ? 'fue rechazada' : 'fue completada'} por el vendedor.
                      </p>
                      {returnRecord.client && (
                        <p className="text-gray-800 mt-2">
                          <span className="font-medium">Solicitante:</span> {returnRecord.client.name}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Cliente */}
              {returnRecord.client && (
                <div className="bg-white border rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">👤 Cliente</h3>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">Nombre:</span> {returnRecord.client.name}</p>
                    <p><span className="font-medium">Email:</span> {returnRecord.client.email}</p>
                  </div>
                </div>
              )}

              {/* Detalles */}
              <div className="bg-white border rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">📋 Detalles de la Devolución</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Motivo:</p>
                    <p className="font-semibold text-gray-900">
                      {RETURN_REASONS[returnRecord.reason as keyof typeof RETURN_REASONS] || returnRecord.reason}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Tipo de Reembolso:</p>
                    <p className="font-semibold text-gray-900">
                      {REFUND_TYPES[returnRecord.refundType as keyof typeof REFUND_TYPES] || returnRecord.refundType}
                    </p>
                  </div>
                  {returnRecord.approvedAt && (
                    <div>
                      <p className="text-gray-600">Aprobada:</p>
                      <p className="font-semibold text-gray-900">
                        {new Date(returnRecord.approvedAt).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                  )}
                  {returnRecord.completedAt && (
                    <div>
                      <p className="text-gray-600">Completada:</p>
                      <p className="font-semibold text-gray-900">
                        {new Date(returnRecord.completedAt).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Descripción del motivo */}
              {returnRecord.reasonDescription && (
                <div className="bg-white border rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">📝 Descripción del Motivo</h3>
                  <p className="text-sm text-gray-700">{returnRecord.reasonDescription}</p>
                </div>
              )}

              {/* Notas */}
              {returnRecord.notes && (
                <div className="bg-white border rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">📌 Notas</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{returnRecord.notes}</p>
                </div>
              )}

              {/* Nota de crédito */}
              {returnRecord.creditNote && (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <DollarSign className="h-6 w-6 text-green-600 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-green-900 mb-2">Nota de Crédito Generada</h3>
                      <div className="space-y-1 text-sm text-green-800">
                        <p><span className="font-medium">Número:</span> {returnRecord.creditNote.creditNoteNumber}</p>
                        <p><span className="font-medium">Monto:</span> {formatPrice(returnRecord.creditNote.amount)}</p>
                        <p><span className="font-medium">Balance Disponible:</span> {formatPrice(returnRecord.creditNote.balance)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: Productos */}
          {activeTab === 'items' && (
            <div className="space-y-4">
              <div className="space-y-3">
                {returnRecord.items.map((item) => (
                  <div key={item.id} className="bg-white border rounded-lg p-4">
                    <div className="flex items-start gap-4">
                      <div className="bg-purple-100 p-3 rounded-lg">
                        <Package className="h-6 w-6 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{item.productName}</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2 text-sm">
                          <div>
                            <p className="text-gray-600">Cantidad:</p>
                            <p className="font-semibold text-gray-900">{item.quantityReturned}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Precio unitario:</p>
                            <p className="font-semibold text-gray-900">{formatPrice(item.pricePerUnit)}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Subtotal:</p>
                            <p className="font-semibold text-gray-900">{formatPrice(item.subtotal)}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Reabastecido:</p>
                            <p className={`font-semibold ${item.restocked ? 'text-green-600' : 'text-gray-400'}`}>
                              {item.restocked ? '✓ Sí' : '✗ No'}
                            </p>
                          </div>
                        </div>
                        {item.restocked && item.restockedAt && (
                          <p className="text-xs text-gray-500 mt-2">
                            Reabastecido el {new Date(item.restockedAt).toLocaleDateString('es-ES')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totales */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4">💰 Resumen de Montos</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">Monto Total de Devolución:</span>
                    <span className="font-semibold text-gray-900">{formatPrice(returnRecord.totalReturnAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">Cargo por Reposición:</span>
                    <span className="font-semibold text-gray-900">-{formatPrice(returnRecord.restockFee)}</span>
                  </div>
                  <div className="border-t-2 border-purple-300 pt-3 flex justify-between">
                    <span className="font-bold text-gray-900 text-lg">Reembolso Final:</span>
                    <span className="font-bold text-2xl text-purple-600">{formatPrice(returnRecord.finalRefundAmount)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: Acciones */}
          {activeTab === 'actions' && role === 'seller' && (
            <div className="space-y-6">
              {/* Aprobar */}
              {canApprove && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                    <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 flex-shrink-0" />
                    <div className="flex-1 w-full">
                      <h3 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">Aprobar Devolución</h3>
                      <p className="text-xs sm:text-sm text-gray-700 mb-4">
                        Al aprobar esta devolución, cambiarás su estado a APROBADA. 
                        Luego podrás completarla para procesar el reembolso o crédito.
                      </p>
                      <Button
                        onClick={handleApprove}
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
                      >
                        {loading ? 'Procesando...' : 'Aprobar Devolución'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Rechazar */}
              {canReject && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                    <XCircle className="h-6 w-6 sm:h-8 sm:w-8 text-red-600 flex-shrink-0" />
                    <div className="flex-1 w-full">
                      <h3 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">Rechazar Devolución</h3>
                      <p className="text-xs sm:text-sm text-gray-700 mb-4">
                        Si no procede esta devolución, puedes rechazarla proporcionando un motivo.
                      </p>
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Motivo del rechazo..."
                        rows={3}
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 border rounded-lg mb-3 focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                      />
                      <Button
                        onClick={handleReject}
                        disabled={loading || !rejectionReason.trim()}
                        className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
                      >
                        {loading ? 'Procesando...' : 'Rechazar Devolución'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Completar */}
              {canComplete && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                    <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 flex-shrink-0" />
                    <div className="flex-1 w-full">
                      <h3 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">Completar Devolución</h3>
                      <p className="text-xs sm:text-sm text-gray-700 mb-4">
                        Al completar, se procesará el {returnRecord.refundType === 'CREDIT' ? 'crédito' : 'reembolso'}.
                        {returnRecord.refundType === 'CREDIT' && ' Se generará una nota de crédito automáticamente.'}
                      </p>
                      
                      <label className="flex items-start gap-2 mb-4 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={restockInventory}
                          onChange={(e) => setRestockInventory(e.target.checked)}
                          className="rounded text-green-600 mt-0.5 flex-shrink-0"
                        />
                        <span className="text-xs sm:text-sm text-gray-700">
                          Restaurar inventario de productos devueltos
                        </span>
                      </label>

                      <Button
                        onClick={handleComplete}
                        disabled={loading}
                        className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
                      >
                        {loading ? 'Procesando...' : 'Completar Devolución'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Eliminar */}
              {canDelete && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <div className="flex items-start gap-4">
                    <XCircle className="h-8 w-8 text-gray-600 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-2">Eliminar Devolución</h3>
                      <p className="text-sm text-gray-700 mb-4">
                        Solo puedes eliminar devoluciones pendientes o rechazadas sin nota de crédito.
                      </p>
                      <Button
                        onClick={handleDelete}
                        disabled={loading}
                        variant="outline"
                        className="border-red-300 text-red-700 hover:bg-red-50"
                      >
                        {loading ? 'Eliminando...' : 'Eliminar Devolución'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Sin acciones disponibles */}
              {!canApprove && !canReject && !canComplete && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                  <Clock className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">
                    No hay acciones disponibles para esta devolución en su estado actual.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-4 sm:p-6 border-t bg-gray-50">
          <Button onClick={onClose} variant="outline" className="w-full sm:w-auto">
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  )
}
