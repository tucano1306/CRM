'use client'

import { useEffect, useState } from 'react'
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
  Box
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

type OrderStatus = 
  | 'PENDING' 
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

interface HistoryEntry {
  id: string
  previousStatus: OrderStatus | null
  newStatus: OrderStatus
  changedBy: string
  changedByName: string
  changedByRole: string
  notes: string | null
  createdAt: string
}

const statusConfig: Record<OrderStatus, { label: string; icon: any; color: string }> = {
  PENDING: { label: 'Pendiente', icon: Clock, color: 'text-yellow-600' },
  CONFIRMED: { label: 'Confirmada', icon: CheckCircle, color: 'text-blue-600' },
  PREPARING: { label: 'Preparando', icon: Box, color: 'text-indigo-600' },
  READY_FOR_PICKUP: { label: 'Listo para Recoger', icon: Package, color: 'text-cyan-600' },
  IN_DELIVERY: { label: 'En Entrega', icon: Truck, color: 'text-purple-600' },
  DELIVERED: { label: 'Entregado', icon: CheckCircle, color: 'text-teal-600' },
  PARTIALLY_DELIVERED: { label: 'Entrega Parcial', icon: AlertCircle, color: 'text-orange-600' },
  COMPLETED: { label: 'Completada', icon: CheckCircle, color: 'text-green-600' },
  CANCELED: { label: 'Cancelada', icon: XCircle, color: 'text-red-600' },
  PAYMENT_PENDING: { label: 'Pago Pendiente', icon: DollarSign, color: 'text-amber-600' },
  PAID: { label: 'Pagado', icon: DollarSign, color: 'text-emerald-600' },
}

interface OrderStatusHistoryProps {
  orderId: string
  refreshTrigger?: number // Prop para forzar refresco desde fuera
}

export default function OrderStatusHistory({ orderId, refreshTrigger }: OrderStatusHistoryProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchHistory()
  }, [orderId, refreshTrigger]) // Refresca cuando cambia refreshTrigger

  const fetchHistory = async () => {
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
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Hace un momento'
    if (diffMins < 60) return `Hace ${diffMins} minuto${diffMins !== 1 ? 's' : ''}`
    if (diffHours < 24) return `Hace ${diffHours} hora${diffHours !== 1 ? 's' : ''}`
    if (diffDays < 7) return `Hace ${diffDays} día${diffDays !== 1 ? 's' : ''}`
    return formatDate(dateString)
  }

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
      <CardContent className="p-6">
        <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-600" />
          Historial de Cambios de Estado
        </h4>

        <div className="space-y-4">
          {history.map((entry, index) => {
            const NewStatusIcon = statusConfig[entry.newStatus].icon
            const PreviousStatusIcon = entry.previousStatus 
              ? statusConfig[entry.previousStatus].icon 
              : null

            return (
              <div 
                key={entry.id}
                className={`relative border rounded-lg p-4 ${
                  index === 0 ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'
                }`}
              >
                {/* Timeline line */}
                {index < history.length - 1 && (
                  <div className="absolute left-8 top-16 bottom-0 w-0.5 bg-gray-300" />
                )}

                <div className="flex items-start gap-4">
                  {/* Estado visual */}
                  <div className="flex-shrink-0">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      index === 0 ? 'bg-blue-100' : 'bg-gray-100'
                    }`}>
                      <NewStatusIcon 
                        className={`h-6 w-6 ${statusConfig[entry.newStatus].color}`} 
                      />
                    </div>
                  </div>

                  {/* Contenido */}
                  <div className="flex-1 min-w-0">
                    {/* Cambio de estado */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {entry.previousStatus ? (
                        <>
                          <span className={`font-medium ${
                            statusConfig[entry.previousStatus].color
                          }`}>
                            {statusConfig[entry.previousStatus].label}
                          </span>
                          <ArrowRight className="h-4 w-4 text-gray-400" />
                        </>
                      ) : (
                        <span className="text-sm text-gray-500">Estado inicial:</span>
                      )}
                      <span className={`font-semibold ${
                        statusConfig[entry.newStatus].color
                      }`}>
                        {statusConfig[entry.newStatus].label}
                      </span>
                      {index === 0 && (
                        <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                          Actual
                        </span>
                      )}
                    </div>

                    {/* Usuario y rol */}
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-700 font-medium">
                        {entry.changedByName}
                      </span>
                      {getRoleBadge(entry.changedByRole)}
                    </div>

                    {/* Fecha */}
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {getRelativeTime(entry.createdAt)}
                      </span>
                      <span className="text-xs text-gray-400">
                        ({formatDate(entry.createdAt)})
                      </span>
                    </div>

                    {/* Notas */}
                    {entry.notes && (
                      <div className="mt-3 p-3 bg-gray-50 rounded border border-gray-200">
                        <div className="flex items-start gap-2">
                          <FileText className="h-4 w-4 text-gray-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs text-gray-500 font-medium mb-1">Notas:</p>
                            <p className="text-sm text-gray-700">{entry.notes}</p>
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
