'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import dynamic from 'next/dynamic'
import { 
  Truck, 
  User, 
  Phone, 
  Clock, 
  MapPin, 
  Navigation,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react'

// Definir tipo de props del mapa
interface DeliveryMapProps {
  latitude: number
  longitude: number
  driverName?: string
  showRoute?: boolean
  routeHistory?: Array<{ latitude: number; longitude: number }>
}

// Importar mapa dinámicamente para evitar SSR issues
const DeliveryMap = dynamic<DeliveryMapProps>(() => import('./DeliveryMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] bg-gray-100 rounded-lg flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
    </div>
  )
})

type DeliveryStatus = 
  | 'PENDING'
  | 'ASSIGNED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'NEARBY'
  | 'DELIVERED'
  | 'FAILED'

interface DeliveryTrackingData {
  id: string
  orderId: string
  driverName: string | null
  driverPhone: string | null
  estimatedDeliveryTime: string | null
  actualDeliveryTime: string | null
  currentLatitude: number | null
  currentLongitude: number | null
  lastLocationUpdate: string | null
  status: DeliveryStatus
  deliveryAddress?: string | null  // Solo para vendedor
  deliveryCity?: string | null
  deliveryState?: string | null
  deliveryZipCode?: string | null
}

interface DeliveryTrackingProps {
  orderId: string
  showAddress?: boolean  // true solo para vendedor
}

const statusConfig: Record<DeliveryStatus, {
  label: string
  icon: any
  color: string
  bg: string
}> = {
  PENDING: {
    label: 'Pendiente',
    icon: Clock,
    color: 'text-gray-600',
    bg: 'bg-gray-50'
  },
  ASSIGNED: {
    label: 'Conductor Asignado',
    icon: User,
    color: 'text-blue-600',
    bg: 'bg-blue-50'
  },
  PICKED_UP: {
    label: 'Recogido',
    icon: CheckCircle,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50'
  },
  IN_TRANSIT: {
    label: 'En Camino',
    icon: Truck,
    color: 'text-purple-600',
    bg: 'bg-purple-50'
  },
  NEARBY: {
    label: 'Cerca',
    icon: Navigation,
    color: 'text-orange-600',
    bg: 'bg-orange-50'
  },
  DELIVERED: {
    label: 'Entregado',
    icon: CheckCircle,
    color: 'text-green-600',
    bg: 'bg-green-50'
  },
  FAILED: {
    label: 'Fallido',
    icon: AlertCircle,
    color: 'text-red-600',
    bg: 'bg-red-50'
  }
}

export default function DeliveryTracking({ 
  orderId, 
  showAddress = false 
}: DeliveryTrackingProps) {
  const [tracking, setTracking] = useState<DeliveryTrackingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [locationHistory, setLocationHistory] = useState<Array<{ latitude: number; longitude: number }>>([])

  useEffect(() => {
    fetchTracking()
    fetchLocationHistory()
    // Actualizar cada 30 segundos
    const interval = setInterval(() => {
      fetchTracking()
      fetchLocationHistory()
    }, 30000)
    return () => clearInterval(interval)
  }, [orderId])

  const fetchTracking = async () => {
    try {
      setError(null)
      const response = await fetch(`/api/delivery/tracking/${orderId}`)
      
      // Intentar parsear la respuesta JSON primero
      const result = await response.json()

      if (!response.ok) {
        // Si hay un mensaje de error del servidor, usarlo
        if (response.status === 404) {
          setError('No hay información de tracking disponible')
          setLoading(false)
          return
        }
        setError(result.error || 'Error al cargar tracking')
        setLoading(false)
        return
      }

      if (result.success && result.tracking) {
        setTracking(result.tracking)
        setError(null)
      } else {
        setError(result.error || 'No hay información de tracking')
      }
    } catch (err) {
      console.error('Error fetching tracking:', err)
      setError('Error de conexión al cargar tracking')
    } finally {
      setLoading(false)
    }
  }

  const fetchLocationHistory = async () => {
    try {
      const response = await fetch(`/api/delivery/tracking/${orderId}/history`)
      
      if (!response.ok) {
        console.warn('No hay historial de ubicaciones disponible')
        return
      }

      const result = await response.json()

      if (result.success && result.history) {
        setLocationHistory(result.history)
      }
    } catch (err) {
      console.error('Error cargando historial:', err)
    }
  }

  const formatTime = (dateString: string | null) => {
    if (!dateString) return 'No disponible'
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('es-ES', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  const getTimeUntilDelivery = (estimatedTime: string | null) => {
    if (!estimatedTime) return null
    
    const now = new Date()
    const estimated = new Date(estimatedTime)
    const diffMs = estimated.getTime() - now.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 0) return 'Retrasado'
    if (diffMins < 60) return `${diffMins} minutos`
    
    const hours = Math.floor(diffMins / 60)
    const mins = diffMins % 60
    return `${hours}h ${mins}m`
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

  if (!tracking) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <Truck className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600">
              Información de entrega no disponible
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const config = statusConfig[tracking.status]
  const StatusIcon = config.icon

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Header con estado */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg ${config.bg}`}>
                <StatusIcon className={`h-6 w-6 ${config.color}`} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  Estado de Entrega
                </h3>
                <p className={`text-sm font-medium ${config.color}`}>
                  {config.label}
                </p>
              </div>
            </div>

            {/* Tiempo estimado destacado */}
            {tracking.estimatedDeliveryTime && tracking.status !== 'DELIVERED' && (
              <div className="text-right">
                <p className="text-xs text-gray-500">Llegada estimada en</p>
                <p className="text-2xl font-bold text-purple-600">
                  {getTimeUntilDelivery(tracking.estimatedDeliveryTime)}
                </p>
              </div>
            )}
          </div>

          {/* Timeline de progreso */}
          <div className="relative">
            <div className="flex justify-between">
              {['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED'].map((status, index) => {
                const isCompleted = ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'NEARBY', 'DELIVERED'].indexOf(tracking.status) >= index
                const isCurrent = tracking.status === status
                
                return (
                  <div key={status} className="flex flex-col items-center flex-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isCompleted ? 'bg-purple-600' : 'bg-gray-200'
                    } ${isCurrent ? 'ring-4 ring-purple-200' : ''}`}>
                      {isCompleted ? (
                        <CheckCircle className="h-5 w-5 text-white" />
                      ) : (
                        <div className="w-3 h-3 rounded-full bg-white" />
                      )}
                    </div>
                    <p className={`text-xs mt-2 text-center ${
                      isCompleted ? 'text-gray-900 font-medium' : 'text-gray-500'
                    }`}>
                      {statusConfig[status as DeliveryStatus].label}
                    </p>
                  </div>
                )
              })}
            </div>
            {/* Línea de progreso */}
            <div className="absolute top-5 left-0 right-0 h-1 bg-gray-200 -z-10 mx-5">
              <div 
                className="h-full bg-purple-600 transition-all duration-500"
                style={{ 
                  width: `${(['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'NEARBY', 'DELIVERED'].indexOf(tracking.status) / 3) * 100}%` 
                }}
              />
            </div>
          </div>

          {/* Información del conductor */}
          {tracking.driverName && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                <User className="h-5 w-5" />
                Conductor Asignado
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-blue-600 font-medium">Nombre:</p>
                  <p className="text-blue-900">{tracking.driverName}</p>
                </div>
                {tracking.driverPhone && (
                  <div>
                    <p className="text-blue-600 font-medium flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      Teléfono:
                    </p>
                    <a 
                      href={`tel:${tracking.driverPhone}`}
                      className="text-blue-900 hover:underline"
                    >
                      {tracking.driverPhone}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Dirección de entrega (solo para vendedor) */}
          {showAddress && tracking.deliveryAddress && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h4 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Dirección de Entrega
              </h4>
              <p className="text-sm text-purple-900">
                {tracking.deliveryAddress}
              </p>
              {tracking.deliveryCity && (
                <p className="text-sm text-purple-700">
                  {tracking.deliveryCity}, {tracking.deliveryState} {tracking.deliveryZipCode}
                </p>
              )}
            </div>
          )}

          {/* Hora estimada */}
          <div className="grid grid-cols-2 gap-4">
            {tracking.estimatedDeliveryTime && (
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-gray-600 mb-1">
                  <Clock className="h-4 w-4" />
                  <p className="text-xs font-medium">Hora Estimada</p>
                </div>
                <p className="text-sm font-semibold text-gray-900">
                  {formatTime(tracking.estimatedDeliveryTime)}
                </p>
              </div>
            )}
            {tracking.actualDeliveryTime && (
              <div className="bg-green-50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-green-600 mb-1">
                  <CheckCircle className="h-4 w-4" />
                  <p className="text-xs font-medium">Entregado</p>
                </div>
                <p className="text-sm font-semibold text-green-900">
                  {formatTime(tracking.actualDeliveryTime)}
                </p>
              </div>
            )}
          </div>

          {/* Ubicación en tiempo real */}
          {tracking.currentLatitude && tracking.currentLongitude && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h4 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                <Navigation className="h-5 w-5" />
                Ubicación en Tiempo Real
              </h4>
              <DeliveryMap
                latitude={tracking.currentLatitude}
                longitude={tracking.currentLongitude}
                driverName={tracking.driverName || 'Conductor'}
                showRoute={locationHistory.length > 0}
                routeHistory={locationHistory}
              />
              {tracking.lastLocationUpdate && (
                <p className="text-xs text-purple-600 mt-3 flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  Última actualización: {formatTime(tracking.lastLocationUpdate)}
                </p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
