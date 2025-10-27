'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Search, Package, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
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

  useEffect(() => {
    fetchReturns()
  }, [role])

  useEffect(() => {
    filterReturns()
  }, [returns, searchTerm, statusFilter])

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

  const fetchReturns = async () => {
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
  }

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

  const filterReturns = () => {
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
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white">
          <div className="flex items-center gap-3">
            <Package className="h-8 w-8" />
            <div>
              <p className="text-3xl font-bold">{stats.total}</p>
              <p className="text-sm opacity-90">Total</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-100 p-3 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
              <p className="text-sm text-gray-600">Pendientes</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-3 rounded-lg">
              <CheckCircle className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.approved}</p>
              <p className="text-sm text-gray-600">Aprobadas</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="bg-red-100 p-3 rounded-lg">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.rejected}</p>
              <p className="text-sm text-gray-600">Rechazadas</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-3 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
              <p className="text-sm text-gray-600">Completadas</p>
            </div>
          </div>
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
                    Monto: ${returnRecord.finalRefundAmount.toFixed(2)}
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
