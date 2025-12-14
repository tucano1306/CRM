'use client'

import { useEffect, useState, useCallback } from 'react'
import { getRelativeTime, formatDateTime } from '@/lib/utils'
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Package, 
  DollarSign,
  AlertCircle,
  User,
  FileText,
  Calendar,
  ArrowRight,
  Loader2,
  Truck,
  Box,
  Eye,
  Lock,
  AlertTriangle,
  Trash2,
  Plus,
  MessageCircle
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

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

type HistoryType = 'STATUS_CHANGE' | 'PRODUCT_DELETED' | 'PRODUCT_ACTION'

interface HistoryEntry {
  id: string
  type?: HistoryType
  previousStatus: OrderStatus | null
  newStatus: OrderStatus | null
  changedBy: string
  changedByName: string
  changedByRole: string
  notes: string | null
  createdAt: string
  description?: string
}

const statusConfig: Record<OrderStatus, { label: string; icon: any; color: string }> = {
  PENDING: { label: 'Pendiente', icon: Clock, color: 'text-yellow-600' },
  REVIEWING: { label: 'En Revisión', icon: Eye, color: 'text-blue-500' },
  ISSUE_REPORTED: { label: 'Con Problemas', icon: AlertTriangle, color: 'text-red-500' },
  LOCKED: { label: 'Confirmada', icon: Lock, color: 'text-green-500' },
  CONFIRMED: { label: 'En Proceso', icon: CheckCircle, color: 'text-blue-600' },
  PREPARING: { label: 'Preparando', icon: Box, color: 'text-indigo-600' },
  READY_FOR_PICKUP: { label: 'Listo para Recoger', icon: Package, color: 'text-cyan-600' },
  IN_DELIVERY: { label: 'En Entrega', icon: Truck, color: 'text-purple-600' },
  DELIVERED: { label: 'Recibida', icon: CheckCircle, color: 'text-green-600' },
  PARTIALLY_DELIVERED: { label: 'Entrega Parcial', icon: AlertCircle, color: 'text-orange-600' },
  COMPLETED: { label: 'Completada', icon: CheckCircle, color: 'text-green-600' },
  CANCELED: { label: 'Cancelada', icon: XCircle, color: 'text-red-600' },
  PAYMENT_PENDING: { label: 'Pago Pendiente', icon: DollarSign, color: 'text-amber-600' },
  PAID: { label: 'Pagado', icon: DollarSign, color: 'text-emerald-600' },
}

interface OrderStatusHistoryProps {
  readonly orderId: string
  readonly refreshTrigger?: number // Prop para forzar refresco desde fuera
}

export default function OrderStatusHistory({ orderId, refreshTrigger }: OrderStatusHistoryProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/orders/${orderId}/history`)
      const result = await response.json()

      if (result.success) {
        setHistory(result.data)
      } else {
        setError(result.error || 'Error al cargar el historial')
      }
    } catch (err) {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    fetchHistory()
  }, [orderId, refreshTrigger, fetchHistory]) // Refresca cuando cambia refreshTrigger

  const getRoleBadge = (role: string) => {
    const roleConfig: Record<string, { label: string; color: string }> = {
      ADMIN: { label: 'Admin', color: 'bg-purple-100 text-purple-700' },
      SELLER: { label: 'Vendedor', color: 'bg-blue-100 text-blue-700' },
      CLIENT: { label: 'Cliente', color: 'bg-green-100 text-green-700' },
      SYSTEM: { label: 'Sistema', color: 'bg-gray-100 text-gray-700' },
    }

    const config = roleConfig[role] || { label: role, color: 'bg-gray-100 text-gray-700' }

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
            <p className="text-red-600">{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600">No hay cambios de estado registrados</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2 text-base sm:text-lg">
          <FileText className="h-5 w-5 text-blue-600" />
          Historial Completo de la Orden
        </h4>

        <div className="space-y-3 sm:space-y-4">
          {history.map((entry, index) => {
            // Determinar el tipo de entrada
            const entryType = entry.type || 'STATUS_CHANGE'
            const isStatusChange = entryType === 'STATUS_CHANGE' && entry.newStatus
            const isProductDeleted = entryType === 'PRODUCT_DELETED'
            const isProductAction = entryType === 'PRODUCT_ACTION'
            
            // Iconos según el tipo
            const getEntryIcon = () => {
              if (isProductDeleted) return Trash2
              if (isProductAction) {
                if (entry.notes?.includes('agregado') || entry.notes?.includes('actualizado')) return Plus
                return MessageCircle
              }
              if (isStatusChange && entry.newStatus) return statusConfig[entry.newStatus]?.icon || Clock
              return Clock
            }
            
            const getEntryColor = () => {
              if (isProductDeleted) return 'text-red-500'
              if (isProductAction) {
                if (entry.notes?.includes('agregado') || entry.notes?.includes('actualizado')) return 'text-green-500'
                return 'text-blue-500'
              }
              if (isStatusChange && entry.newStatus) return statusConfig[entry.newStatus]?.color || 'text-gray-500'
              return 'text-gray-500'
            }

            const getEntryBgColor = () => {
              if (isProductDeleted) return 'bg-red-50 border-red-200'
              if (isProductAction) return 'bg-green-50 border-green-200'
              if (index === 0 && isStatusChange) return 'bg-blue-50 border-blue-300'
              return 'bg-white border-gray-200'
            }

            const EntryIcon = getEntryIcon()

            return (
              <div 
                key={entry.id}
                className={`relative border-2 rounded-xl p-4 sm:p-5 ${getEntryBgColor()} transition-all`}
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  {/* Icono */}
                  <div className="flex-shrink-0">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center ${
                      isProductDeleted ? 'bg-red-100' :
                      isProductAction ? 'bg-green-100' :
                      index === 0 ? 'bg-blue-100' : 'bg-gray-100'
                    }`}>
                      <EntryIcon className={`h-5 w-5 sm:h-6 sm:w-6 ${getEntryColor()}`} />
                    </div>
                  </div>

                  {/* Contenido */}
                  <div className="flex-1 min-w-0">
                    {/* Título según tipo */}
                    {isStatusChange && entry.newStatus ? (
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        {entry.previousStatus ? (
                          <>
                            <span className={`font-medium text-sm sm:text-base ${
                              statusConfig[entry.previousStatus]?.color || 'text-gray-500'
                            }`}>
                              {statusConfig[entry.previousStatus]?.label || entry.previousStatus}
                            </span>
                            <ArrowRight className="h-4 w-4 text-gray-400" />
                          </>
                        ) : (
                          <span className="text-xs sm:text-sm text-gray-500">Estado inicial:</span>
                        )}
                        <span className={`font-bold text-sm sm:text-base ${
                          statusConfig[entry.newStatus]?.color || 'text-gray-600'
                        }`}>
                          {statusConfig[entry.newStatus]?.label || entry.newStatus}
                        </span>
                        {index === 0 && (
                          <span className="ml-2 px-2 py-0.5 bg-blue-200 text-blue-800 text-xs rounded-full font-bold">
                            Actual
                          </span>
                        )}
                      </div>
                    ) : isProductDeleted ? (
                      <div className="mb-2">
                        <span className="font-bold text-red-700 text-sm sm:text-base flex items-center gap-2">
                          <Trash2 className="h-4 w-4" />
                          Producto Eliminado
                        </span>
                        {entry.description && (
                          <p className="text-sm text-gray-700 mt-1">{entry.description}</p>
                        )}
                      </div>
                    ) : isProductAction ? (
                      <div className="mb-2">
                        <span className="font-bold text-green-700 text-sm sm:text-base flex items-center gap-2">
                          {entry.notes?.includes('agregado') ? <Plus className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
                          {entry.notes?.includes('agregado') ? 'Producto Agregado' : 'Acción en Producto'}
                        </span>
                      </div>
                    ) : null}

                    {/* Usuario y rol */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="text-sm sm:text-base text-gray-700 font-medium">
                        {entry.changedByName}
                      </span>
                      {getRoleBadge(entry.changedByRole)}
                    </div>

                    {/* Fecha */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600 font-medium">
                        {getRelativeTime(entry.createdAt)}
                      </span>
                      <span className="text-xs text-gray-400 hidden sm:inline">
                        ({formatDateTime(entry.createdAt)})
                      </span>
                    </div>

                    {/* Notas */}
                    {entry.notes && (
                      <div className="mt-3 p-3 bg-white/80 rounded-lg border border-gray-200">
                        <div className="flex items-start gap-2">
                          <FileText className="h-4 w-4 text-gray-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs text-gray-500 font-medium mb-1">Detalle:</p>
                            <p className="text-sm sm:text-base text-gray-700">{entry.notes}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
