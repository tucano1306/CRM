'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatPrice } from '@/lib/utils'
import { useSearchParams } from 'next/navigation'
import { 
  Search, 
  Package, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  ArrowLeft,
  Filter,
  TrendingUp,
  RotateCcw,
  DollarSign,
  CreditCard,
  FileText,
  Eye,
  Award,
  ShieldCheck
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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

interface ModernReturnsManagerProps {
  role?: 'seller' | 'client'
}

const statusConfig = {
  PENDING: {
    label: 'Pendiente',
    icon: Clock,
    color: 'text-yellow-700',
    bg: 'bg-yellow-50',
    gradient: 'from-yellow-400 to-amber-500',
    badge: 'bg-yellow-500'
  },
  APPROVED: {
    label: 'Aprobada',
    icon: ShieldCheck,
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    gradient: 'from-blue-400 to-cyan-500',
    badge: 'bg-blue-500'
  },
  REJECTED: {
    label: 'Rechazada',
    icon: XCircle,
    color: 'text-red-700',
    bg: 'bg-red-50',
    gradient: 'from-red-400 to-rose-500',
    badge: 'bg-red-500'
  },
  COMPLETED: {
    label: 'Completada',
    icon: CheckCircle,
    color: 'text-green-700',
    bg: 'bg-green-50',
    gradient: 'from-green-400 to-emerald-500',
    badge: 'bg-green-500'
  }
}

const refundTypeConfig = {
  REFUND: {
    icon: DollarSign,
    label: 'Reembolso',
    color: 'text-green-700',
    bg: 'bg-green-50'
  },
  CREDIT: {
    icon: CreditCard,
    label: 'Crédito',
    color: 'text-purple-700',
    bg: 'bg-purple-50'
  },
  REPLACEMENT: {
    icon: RotateCcw,
    label: 'Reemplazo',
    color: 'text-blue-700',
    bg: 'bg-blue-50'
  }
}

export default function ModernReturnsManager({ role = 'client' }: ModernReturnsManagerProps) {
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

    if (searchTerm) {
      filtered = filtered.filter(ret => 
        ret.returnNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ret.order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (ret.client?.name && ret.client.name.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(ret => ret.status === statusFilter)
    }

    setFilteredReturns(filtered)
  }, [returns, searchTerm, statusFilter])

  useEffect(() => {
    filterReturns()
  }, [returns, searchTerm, statusFilter, filterReturns])

  useEffect(() => {
    if (returnIdFromUrl && returns.length > 0) {
      const returnToShow = returns.find(r => r.id === returnIdFromUrl)
      if (returnToShow) {
        setSelectedReturn(returnToShow)
      }
    }
  }, [returnIdFromUrl, returns])

  

  const handleChangeRefundType = async (returnId: string, newRefundType: 'CREDIT' | 'REFUND') => {
    const confirmMessage = newRefundType === 'CREDIT'
      ? '¿Cambiar a CRÉDITO? El monto estará disponible para tus próximas compras.'
      : '¿Cambiar a REEMBOLSO? El dinero será devuelto a tu método de pago original.'
    
    if (!confirm(confirmMessage)) return

    try {
      const response = await fetch(`/api/returns/${returnId}/change-refund-type`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refundType: newRefundType })
      })

      const result = await response.json()

      if (result.success) {
        alert(result.message)
        fetchReturns()
      } else {
        alert(result.error || 'Error al cambiar tipo de reembolso')
      }
    } catch (error) {
      alert('Error al cambiar tipo de reembolso')
    }
  }

  

  // Estadísticas
  const stats = {
    total: returns.length,
    pending: returns.filter(r => r.status === 'PENDING').length,
    approved: returns.filter(r => r.status === 'APPROVED').length,
    completed: returns.filter(r => r.status === 'COMPLETED').length,
    totalAmount: returns.reduce((sum, r) => sum + (r.status === 'COMPLETED' ? r.finalRefundAmount : 0), 0)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 p-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <RotateCcw className="animate-spin h-12 w-12 text-orange-600 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">Cargando devoluciones...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Moderno */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg">
              <RotateCcw className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Mis Devoluciones</h1>
              <p className="text-gray-600">
                Gestiona tus solicitudes y consulta su estado
              </p>
            </div>
          </div>
        </div>

        {/* Panel de Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center">
                  <Package className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Pendientes</p>
                  <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-xl flex items-center justify-center">
                  <Clock className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Aprobadas</p>
                  <p className="text-3xl font-bold text-blue-600">{stats.approved}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-xl flex items-center justify-center">
                  <ShieldCheck className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Completadas</p>
                  <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Reembolsado</p>
                  <p className="text-2xl font-bold text-orange-600">{formatPrice(stats.totalAmount)}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-pink-500 rounded-xl flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros y Búsqueda */}
        <Card className="mb-6 border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Búsqueda */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por número, orden o cliente..."
                  className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none transition-colors"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Filtros de Estado */}
              <div className="flex gap-2 flex-wrap">
                {[
                  { value: 'ALL', label: 'Todas', icon: Filter },
                  { value: 'PENDING', label: 'Pendientes', icon: Clock },
                  { value: 'APPROVED', label: 'Aprobadas', icon: ShieldCheck },
                  { value: 'COMPLETED', label: 'Completadas', icon: CheckCircle },
                  { value: 'REJECTED', label: 'Rechazadas', icon: XCircle },
                ].map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setStatusFilter(value)}
                    className={`px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-2 ${
                      statusFilter === value
                        ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-lg'
                        : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-orange-300'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>

              {/* Botón crear */}
              {role === 'client' && (
                <Button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white shadow-lg"
                >
                  <Package className="h-4 w-4 mr-2" />
                  Nueva Devolución
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Returns List */}
        {filteredReturns.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-12 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-orange-100 to-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <RotateCcw className="h-10 w-10 text-orange-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {returns.length === 0 ? 'No tienes devoluciones' : 'No se encontraron resultados'}
              </h3>
              <p className="text-gray-600 mb-4">
                {returns.length === 0 
                  ? 'Cuando solicites una devolución, aparecerá aquí'
                  : 'Intenta cambiar los filtros de búsqueda'}
              </p>
              {role === 'client' && returns.length === 0 && (
                <Button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
                >
                  <Package className="h-4 w-4 mr-2" />
                  Crear Primera Devolución
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredReturns.map((returnItem) => {
              const config = statusConfig[returnItem.status]
              const Icon = config.icon
              const refundConfig = refundTypeConfig[returnItem.refundType]
              const RefundIcon = refundConfig.icon
              const needsAttention = returnItem.status === 'PENDING' || returnItem.status === 'APPROVED'
              const isCompleted = returnItem.status === 'COMPLETED'

              return (
                <Card 
                  key={returnItem.id}
                  className="border-0 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer group overflow-hidden"
                  onClick={() => setSelectedReturn(returnItem)}
                  style={needsAttention ? {
                    animation: 'returnPulse 3s ease-in-out infinite',
                  } : {}}
                >
                  {/* Gradient Header */}
                  <div className={`h-2 bg-gradient-to-r ${config.gradient}`} />
                  
                  <CardContent className="p-6">
                    {/* Completed Badge */}
                    {isCompleted && (
                      <div 
                        className="absolute top-4 right-4 z-10"
                        style={{
                          animation: 'stickerBounce 0.8s ease-out',
                        }}
                      >
                        <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
                          <Award className="h-4 w-4" />
                          <span className="font-bold text-xs">Completada</span>
                        </div>
                      </div>
                    )}

                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-bold text-lg text-gray-900 group-hover:text-orange-600 transition-colors">
                          {returnItem.returnNumber}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          Orden: {returnItem.order.orderNumber}
                        </p>
                      </div>
                      <div 
                        className={`w-10 h-10 ${config.bg} rounded-xl flex items-center justify-center`}
                        style={needsAttention ? {
                          animation: 'iconPulse 2s ease-in-out infinite',
                        } : {}}
                      >
                        <Icon className={`h-5 w-5 ${config.color}`} />
                      </div>
                    </div>

                    {/* Status & Refund Type */}
                    <div className="mb-4 space-y-2">
                      <div className={`p-3 ${config.bg} rounded-lg`}>
                        <p className="text-xs text-gray-600 mb-1">Estado</p>
                        <p className={`text-sm font-bold ${config.color}`}>{config.label}</p>
                      </div>
                      <div className={`p-3 ${refundConfig.bg} rounded-lg flex items-center gap-2`}>
                        <RefundIcon className={`h-4 w-4 ${refundConfig.color}`} />
                        <div className="flex-1">
                          <p className="text-xs text-gray-600">Tipo de Devolución</p>
                          <p className={`text-sm font-bold ${refundConfig.color}`}>{refundConfig.label}</p>
                        </div>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="mb-4 bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-4">
                      <p className="text-xs text-gray-600 mb-1">Monto Final</p>
                      <p className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                        {formatPrice(returnItem.finalRefundAmount)}
                      </p>
                      {returnItem.restockFee > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          (Fee: -{formatPrice(returnItem.restockFee)})
                        </p>
                      )}
                    </div>

                    {/* Products List */}
                    <div className="mb-4 bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-3">
                        <Package className="h-4 w-4 text-orange-600" />
                        <span className="font-semibold text-sm text-gray-700">
                          Productos ({returnItem.items.length})
                        </span>
                      </div>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {returnItem.items.map((item) => (
                          <div 
                            key={item.id} 
                            className="flex items-center justify-between p-2 bg-white rounded border border-gray-200"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {item.productName}
                              </p>
                              <p className="text-xs text-gray-500">
                                Cantidad: {item.quantityReturned}
                              </p>
                            </div>
                            <div className="text-right ml-2">
                              <p className="text-sm font-bold text-orange-600">
                                {formatPrice(item.subtotal)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Reason */}
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                      <p className="text-xs text-gray-600 mb-1">Motivo</p>
                      <p className="text-sm font-semibold text-blue-900">{returnItem.reason}</p>
                    </div>

                    {/* View Button */}
                    <Button 
                      className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white shadow-lg"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Ver Detalles
                    </Button>
                  </CardContent>
                </Card>
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

      {/* CSS Animations */}
      <style>{`
        @keyframes returnPulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
          }
          50% {
            transform: scale(1.02);
            box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1);
          }
        }

        @keyframes stickerBounce {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          25% {
            transform: translateY(-10px) rotate(-3deg);
          }
          50% {
            transform: translateY(0) rotate(0deg);
          }
          75% {
            transform: translateY(-5px) rotate(3deg);
          }
        }

        @keyframes iconPulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
        }
      `}</style>
    </div>
  )
}
