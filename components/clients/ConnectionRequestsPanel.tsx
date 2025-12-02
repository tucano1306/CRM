'use client'

import { useState, useEffect } from 'react'
import { 
  UserPlus, 
  Check, 
  X, 
  Clock, 
  Mail, 
  Phone, 
  Loader2,
  RefreshCw,
  Bell,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { apiCall } from '@/lib/api-client'

interface ConnectionRequest {
  id: string
  buyerName: string
  buyerEmail: string
  buyerPhone: string | null
  buyerAddress: string | null
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED'
  createdAt: string
  expiresAt: string | null
}

interface ConnectionRequestsPanelProps {
  onRequestAccepted?: (clientId: string, clientName: string) => void
}

export default function ConnectionRequestsPanel({ onRequestAccepted }: ConnectionRequestsPanelProps) {
  const [requests, setRequests] = useState<ConnectionRequest[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  // Evitar errores de hidratación
  useEffect(() => {
    setMounted(true)
  }, [])

  const fetchRequests = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiCall('/api/connection-requests?status=PENDING') as any
      
      if (response.success) {
        setRequests(response.data || [])
        setPendingCount(response.pendingCount || response.data?.length || 0)
      } else {
        // Si el API falla, simplemente no mostramos el panel
        console.log('Connection requests API not available:', response.error)
        setRequests([])
        setPendingCount(0)
      }
    } catch (err) {
      // Error silencioso - el sistema de solicitudes puede no estar disponible aún
      console.log('Connection requests not available:', err)
      setRequests([])
      setPendingCount(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
    
    // Refrescar cada 30 segundos
    const interval = setInterval(fetchRequests, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleAccept = async (requestId: string) => {
    try {
      setProcessingId(requestId)
      setError(null)
      
      const response = await apiCall(`/api/connection-requests/${requestId}/accept`, {
        method: 'POST',
        body: JSON.stringify({})
      }) as any

      if (response.success) {
        // Remover de la lista
        setRequests(prev => prev.filter(r => r.id !== requestId))
        setPendingCount(prev => Math.max(0, prev - 1))
        
        // Notificar al padre
        if (onRequestAccepted && response.data?.client) {
          onRequestAccepted(response.data.client.id, response.data.client.name)
        }
        
        // Mostrar mensaje de éxito
        alert(`✅ ${response.message || 'Cliente aceptado correctamente'}`)
      } else {
        throw new Error(response.error || 'Error al aceptar')
      }
    } catch (err: any) {
      console.error('Error accepting request:', err)
      setError(err.message || 'Error al aceptar solicitud')
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (requestId: string) => {
    if (!confirm('¿Estás seguro de rechazar esta solicitud?')) return
    
    try {
      setProcessingId(requestId)
      setError(null)
      
      const response = await apiCall(`/api/connection-requests/${requestId}/reject`, {
        method: 'POST',
        body: JSON.stringify({
          responseNote: 'Rechazado por el vendedor'
        })
      })

      if (response.success) {
        setRequests(prev => prev.filter(r => r.id !== requestId))
        setPendingCount(prev => Math.max(0, prev - 1))
      } else {
        throw new Error(response.error || 'Error al rechazar')
      }
    } catch (err: any) {
      console.error('Error rejecting request:', err)
      setError(err.message || 'Error al rechazar solicitud')
    } finally {
      setProcessingId(null)
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    
    if (minutes < 60) return `Hace ${minutes} min`
    if (hours < 24) return `Hace ${hours}h`
    return `Hace ${days}d`
  }

  // No mostrar antes de montar (evitar errores de hidratación)
  if (!mounted) {
    return null
  }

  // No mostrar si no hay solicitudes pendientes
  if (!loading && requests.length === 0) {
    return null
  }

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl shadow-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-5 py-4 flex items-center justify-between bg-gradient-to-r from-amber-400 to-orange-400 text-white hover:from-amber-500 hover:to-orange-500 transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <Bell className="h-6 w-6" />
            {pendingCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                {pendingCount}
              </span>
            )}
          </div>
          <div className="text-left">
            <h3 className="font-bold text-lg">Solicitudes de Conexión</h3>
            <p className="text-amber-100 text-sm">
              {pendingCount} {pendingCount === 1 ? 'cliente esperando' : 'clientes esperando'} aprobación
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              fetchRequests()
            }}
            className="text-white hover:bg-white/20"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </div>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <p className="text-red-600">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchRequests} className="mt-2">
                Reintentar
              </Button>
            </div>
          ) : (
            requests.map((request) => (
              <div
                key={request.id}
                className="bg-white rounded-xl border border-amber-200 p-4 shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Info del solicitante */}
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
                      {request.buyerName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-900 truncate">
                        {request.buyerName}
                      </h4>
                      <div className="flex items-center gap-1.5 text-sm text-gray-600 mt-1">
                        <Mail className="h-3.5 w-3.5" />
                        <span className="truncate">{request.buyerEmail}</span>
                      </div>
                      {request.buyerPhone && (
                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                          <Phone className="h-3.5 w-3.5" />
                          <span>{request.buyerPhone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-2">
                        <Clock className="h-3 w-3" />
                        <span>{formatTimeAgo(request.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Botones de acción */}
                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleAccept(request.id)}
                      disabled={processingId === request.id}
                      className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-md"
                    >
                      {processingId === request.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-1" />
                          Aceptar
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReject(request.id)}
                      disabled={processingId === request.id}
                      className="border-red-300 text-red-600 hover:bg-red-50"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Rechazar
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
