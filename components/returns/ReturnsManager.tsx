'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Search, Package, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import CreateReturnModal from './CreateReturnModal'
import ReturnDetailModal from './ReturnDetailModal'

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

interface ReturnsManagerProps {
  role?: 'seller' | 'client'
}

export default function ReturnsManager({ role = 'seller' }: ReturnsManagerProps) {
  const searchParams = useSearchParams()
  const returnIdFromUrl = searchParams?.get('id')
  
  const [returns, setReturns] = useState<Return[]>([])
  const [filteredReturns, setFilteredReturns] = useState<Return[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedReturn, setSelectedReturn] = useState<Return | null>(null)

  const fetchReturns = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/returns?role=${role}`)
      const result = await response.json()
      if (result.success) {
        setReturns(result.data)
      }
    } catch (error) {
      console.error('Error fetching returns:', error)
    } finally {
      setLoading(false)
    }
  }, [role])

  useEffect(() => {
    fetchReturns()
  }, [role, fetchReturns])

  const filterReturns = useCallback(() => {
    let filtered = [...returns]

    // Filtro de búsqueda
    if (searchTerm) {
      filtered = filtered.filter(ret => 
        ret.returnNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ret.order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (ret.client?.name && ret.client.name.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    // Filtro de estado
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(ret => ret.status === statusFilter)
    }

    setFilteredReturns(filtered)
  }, [returns, searchTerm, statusFilter])

  useEffect(() => {
    filterReturns()
  }, [returns, searchTerm, statusFilter, filterReturns])

  // Abrir modal automáticamente si hay un ID en la URL
  useEffect(() => {
    if (returnIdFromUrl && returns.length > 0) {
      const returnToShow = returns.find(r => r.id === returnIdFromUrl)
      if (returnToShow) {
        console.log('📋 [RETURNS] Abriendo devolución desde notificación:', returnIdFromUrl)
        setSelectedReturn(returnToShow)
      }
    }
  }, [returnIdFromUrl, returns])

  

  const handleChangeRefundType = async (returnId: string, newRefundType: 'CREDIT' | 'REFUND') => {
    console.log('🔄 [FRONTEND] Attempting to change refund type:', { returnId, newRefundType })
    
    const confirmMessage = newRefundType === 'CREDIT'
      ? '¿Cambiar a CRÉDITO? El monto estará disponible para tus próximas compras.'
      : '¿Cambiar a REEMBOLSO? El dinero será devuelto a tu método de pago original.'
    
    if (!confirm(confirmMessage)) {
      console.log('❌ [FRONTEND] User cancelled')
      return
    }

    try {
      console.log('📡 [FRONTEND] Sending request to API...')
      const response = await fetch(`/api/returns/${returnId}/change-refund-type`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refundType: newRefundType })
      })

      console.log('📡 [FRONTEND] Response status:', response.status)
      const result = await response.json()
      console.log('📡 [FRONTEND] Response data:', result)

      if (result.success) {
        alert(result.message)
        fetchReturns() // Refrescar la lista
      } else {
        console.error('❌ [FRONTEND] Error from API:', result.error)
        alert(result.error || 'Error al cambiar tipo de reembolso')
      }
    } catch (error) {
      console.error('❌ [FRONTEND] Exception:', error)
      alert('Error al cambiar tipo de reembolso')
    }
  }

  

  const getStatusBadge = (status: string) => {
    const badges = {
      PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pendiente' },
      APPROVED: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Aprobada' },
      REJECTED: { bg: 'bg-red-100', text: 'text-red-800', label: 'Rechazada' },
      COMPLETED: { bg: 'bg-green-100', text: 'text-green-800', label: 'Completada' }
    }
    const badge = badges[status as keyof typeof badges] || badges.PENDING
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    )
  }

  const getRefundTypeBadge = (type: string) => {
    const badges = {
      REFUND: { icon: '💰', label: 'Reembolso' },
      CREDIT: { icon: '🎫', label: 'Crédito' },
      REPLACEMENT: { icon: '🔄', label: 'Reemplazo' }
    }
    const badge = badges[type as keyof typeof badges]
    return badge ? `${badge.icon} ${badge.label}` : type
  }

  const stats = {
    total: returns.length,
    pending: returns.filter(r => r.status === 'PENDING').length,
    approved: returns.filter(r => r.status === 'APPROVED').length,
    rejected: returns.filter(r => r.status === 'REJECTED').length,
    completed: returns.filter(r => r.status === 'COMPLETED').length
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Clock className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-1 p-4 sm:p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-gradient-to-br from-purple-500 to-purple-700 p-2 rounded-xl shadow-md">
              <Package className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
          </div>
          <p className="text-gray-600 text-xs sm:text-sm font-semibold uppercase tracking-wide mb-1">Total</p>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.total}</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-1 p-4 sm:p-6 border-l-4 border-amber-500">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-2 rounded-xl shadow-md">
              <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
          </div>
          <p className="text-gray-600 text-xs sm:text-sm font-semibold uppercase tracking-wide mb-1">Pendientes</p>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.pending}</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-1 p-4 sm:p-6 border-l-4 border-cyan-500">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-2 rounded-xl shadow-md">
              <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
          </div>
          <p className="text-gray-600 text-xs sm:text-sm font-semibold uppercase tracking-wide mb-1">Aprobadas</p>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.approved}</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-1 p-4 sm:p-6 border-l-4 border-rose-500">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-gradient-to-br from-rose-500 to-red-600 p-2 rounded-xl shadow-md">
              <XCircle className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
          </div>
          <p className="text-gray-600 text-xs sm:text-sm font-semibold uppercase tracking-wide mb-1">Rechazadas</p>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.rejected}</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-1 p-4 sm:p-6 border-l-4 border-emerald-500">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-gradient-to-br from-emerald-500 to-green-600 p-2 rounded-xl shadow-md">
              <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
          </div>
          <p className="text-gray-600 text-xs sm:text-sm font-semibold uppercase tracking-wide mb-1">Completadas</p>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.completed}</p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por número de devolución, orden o cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="ALL">Todos los estados</option>
            <option value="PENDING">Pendientes</option>
            <option value="APPROVED">Aprobadas</option>
            <option value="REJECTED">Rechazadas</option>
            <option value="COMPLETED">Completadas</option>
          </select>

          {role === 'client' && (
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              + Nueva Devolución
            </Button>
          )}
        </div>
      </div>

      {/* Returns Grid */}
      {filteredReturns.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No hay devoluciones
          </h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || statusFilter !== 'ALL' 
              ? 'No se encontraron resultados con los filtros aplicados'
              : 'Aún no hay devoluciones registradas'
            }
          </p>
          {role === 'client' && !searchTerm && statusFilter === 'ALL' && (
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Crear Primera Devolución
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReturns.map((returnRecord) => {
            // Log para debugging
            console.log('🔍 [RENDER] Return card:', {
              id: returnRecord.id,
              returnNumber: returnRecord.returnNumber,
              role,
              status: returnRecord.status,
              refundType: returnRecord.refundType,
              shouldShowButtons: role === 'client' && returnRecord.status === 'APPROVED'
            })
            
            return (
              <div
                key={returnRecord.id}
                onClick={() => setSelectedReturn(returnRecord)}
                className="bg-white rounded-lg shadow-sm border hover:border-purple-300 hover:shadow-md transition-all cursor-pointer p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {returnRecord.returnNumber}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Orden: {returnRecord.order.orderNumber}
                    </p>
                    {/* Badge de origen */}
                    {returnRecord.isManual ? (
                      <span className="inline-block mt-1 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                        🛠️ Manual
                      </span>
                    ) : (
                      <span className="inline-block mt-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                        📝 Solicitud
                      </span>
                    )}
                  </div>
                  {getStatusBadge(returnRecord.status)}
                </div>

                {role === 'seller' && returnRecord.client && (
                  <p className="text-sm text-gray-600 mb-2">
                    👤 {returnRecord.client.name}
                  </p>
                )}

                <div className="space-y-2 text-sm">
                  <p className="text-gray-600">
                    <span className="font-semibold">Tipo:</span>{' '}
                    {getRefundTypeBadge(returnRecord.refundType)}
                  </p>
                  <p className="text-gray-600">
                    <span className="font-semibold">Items:</span> {returnRecord.items.length}
                  </p>
                  <p className="text-gray-900 font-semibold">
                    Monto: {formatPrice(returnRecord.finalRefundAmount)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(returnRecord.createdAt).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>

                {/* Botones de cambio de tipo de reembolso para comprador */}
                {role === 'client' && returnRecord.status === 'APPROVED' && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-gray-600 mb-2 font-semibold">Cambiar método de reembolso:</p>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          console.log('🔘 [BUTTON CLICK] Crédito button clicked for', returnRecord.returnNumber)
                          e.stopPropagation()
                          handleChangeRefundType(returnRecord.id, 'CREDIT')
                        }}
                        disabled={returnRecord.refundType === 'CREDIT'}
                        className={`flex-1 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
                          returnRecord.refundType === 'CREDIT'
                            ? 'bg-green-100 text-green-800 cursor-not-allowed'
                            : 'bg-gray-100 text-gray-700 hover:bg-green-50 hover:text-green-700'
                        }`}
                      >
                        🎫 Crédito
                      </button>
                      <button
                        onClick={(e) => {
                          console.log('🔘 [BUTTON CLICK] Reembolso button clicked for', returnRecord.returnNumber)
                          e.stopPropagation()
                          handleChangeRefundType(returnRecord.id, 'REFUND')
                        }}
                        disabled={returnRecord.refundType === 'REFUND'}
                        className={`flex-1 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
                          returnRecord.refundType === 'REFUND'
                            ? 'bg-blue-100 text-blue-800 cursor-not-allowed'
                            : 'bg-gray-100 text-gray-700 hover:bg-blue-50 hover:text-blue-700'
                        }`}
                      >
                        💰 Reembolso
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modals */}
      {isCreateModalOpen && (
        <CreateReturnModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            setIsCreateModalOpen(false)
            fetchReturns()
          }}
        />
      )}

      {selectedReturn && (
        <ReturnDetailModal
          returnRecord={selectedReturn}
          isOpen={!!selectedReturn}
          onClose={() => setSelectedReturn(null)}
          onUpdate={fetchReturns}
          role={role}
        />
      )}
    </div>
  )
}
