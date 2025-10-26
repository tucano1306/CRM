'use client'

import { useEffect, useState } from 'react'
import { 
  FileText, 
  Eye, 
  Download, 
  CheckCircle, 
  XCircle, 
  Clock,
  DollarSign,
  Calendar,
  User,
  Package,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Mail,
  Phone
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { apiCall } from '@/lib/api-client'

type QuoteStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED'

interface QuoteItem {
  id: string
  productName: string
  description?: string | null
  quantity: number
  pricePerUnit: number
  subtotal: number
}

interface Quote {
  id: string
  quoteNumber: string
  status: QuoteStatus
  totalAmount: number
  validUntil: string
  notes: string | null
  createdAt: string
  items: QuoteItem[]
  seller: {
    name: string
    email: string
    phone?: string
  }
}

const statusConfig = {
  DRAFT: { label: 'Borrador', icon: Clock, color: 'bg-gray-100 text-gray-700', borderColor: 'border-gray-300' },
  SENT: { label: 'Enviada', icon: Mail, color: 'bg-blue-100 text-blue-700', borderColor: 'border-blue-300' },
  ACCEPTED: { label: 'Aceptada', icon: CheckCircle, color: 'bg-green-100 text-green-700', borderColor: 'border-green-300' },
  REJECTED: { label: 'Rechazada', icon: XCircle, color: 'bg-red-100 text-red-700', borderColor: 'border-red-300' },
  EXPIRED: { label: 'Expirada', icon: AlertCircle, color: 'bg-orange-100 text-orange-700', borderColor: 'border-orange-300' },
}

export default function BuyerQuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    fetchQuotes()
  }, [])

  const fetchQuotes = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('🔍 [BUYER QUOTES] Obteniendo cotizaciones...')
      const result = await apiCall('/api/quotes', { timeout: 10000 })
      
      console.log('📋 [BUYER QUOTES] Respuesta de API:', result)
      console.log('📋 [BUYER QUOTES] result.data tipo:', typeof result.data)
      console.log('📋 [BUYER QUOTES] result.data es array?:', Array.isArray(result.data))
      console.log('📋 [BUYER QUOTES] result.data contenido:', JSON.stringify(result.data, null, 2))
      
      if (result.success && result.data) {
        // El API devuelve { success: true, data: { success: true, data: [...] } }
        // Necesitamos acceder a result.data.data
        const apiResponse = result.data as any
        const quotesArray = Array.isArray(apiResponse.data) ? apiResponse.data : (Array.isArray(apiResponse) ? apiResponse : [])
        
        console.log(`📊 [BUYER QUOTES] Total cotizaciones recibidas: ${quotesArray.length}`)
        
        // Filtrar solo las cotizaciones que han sido enviadas (no borradores del vendedor)
        const sentQuotes = quotesArray.filter((q: Quote) => q.status !== 'DRAFT')
        console.log(`✅ [BUYER QUOTES] Cotizaciones enviadas (sin DRAFT): ${sentQuotes.length}`)
        
        if (sentQuotes.length > 0) {
          console.log('📋 [BUYER QUOTES] Primera cotización:', sentQuotes[0])
        }
        
        setQuotes(sentQuotes)
      } else {
        console.error('❌ [BUYER QUOTES] Error en respuesta:', result.error)
        setError(result.error || 'Error al cargar cotizaciones')
      }
    } catch (err) {
      console.error('❌ [BUYER QUOTES] Error de conexión:', err)
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptQuote = async (quoteId: string) => {
    try {
      setActionLoading(quoteId)
      
      const result = await apiCall(`/api/quotes/${quoteId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'ACCEPTED' })
      })

      if (result.success) {
        await fetchQuotes()
        setSelectedQuote(null)
        alert('✅ Cotización aceptada exitosamente')
      } else {
        alert(result.error || 'Error al aceptar cotización')
      }
    } catch (error) {
      console.error('Error accepting quote:', error)
      alert('Error de conexión')
    } finally {
      setActionLoading(null)
    }
  }

  const handleRejectQuote = async (quoteId: string) => {
    try {
      setActionLoading(quoteId)
      
      const result = await apiCall(`/api/quotes/${quoteId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'REJECTED' })
      })

      if (result.success) {
        await fetchQuotes()
        setSelectedQuote(null)
        alert('Cotización rechazada')
      } else {
        alert(result.error || 'Error al rechazar cotización')
      }
    } catch (error) {
      console.error('Error rejecting quote:', error)
      alert('Error de conexión')
    } finally {
      setActionLoading(null)
    }
  }

  const isExpired = (validUntil: string) => {
    return new Date(validUntil) < new Date()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Cargando cotizaciones...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
        <div className="flex items-center justify-center h-96">
          <Card className="max-w-md">
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Error</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={fetchQuotes}>Reintentar</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Mis Cotizaciones</h1>
          </div>
          <p className="text-gray-600">
            Revisa y responde a las cotizaciones que te ha enviado tu vendedor
          </p>
        </div>

        {/* Quotes List */}
        {quotes.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No tienes cotizaciones
              </h3>
              <p className="text-gray-600">
                Cuando tu vendedor te envíe una cotización, aparecerá aquí
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {quotes.map((quote) => {
              const config = statusConfig[quote.status]
              const Icon = config.icon
              const expired = isExpired(quote.validUntil)
              const actualStatus = expired && quote.status === 'SENT' ? 'EXPIRED' : quote.status
              const actualConfig = statusConfig[actualStatus]
              const ActualIcon = actualConfig.icon

              return (
                <Card 
                  key={quote.id}
                  className={`hover:shadow-xl transition-all duration-300 cursor-pointer border-2 ${actualConfig.borderColor}`}
                  onClick={() => setSelectedQuote(quote)}
                >
                  <CardContent className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-bold text-lg text-gray-900">
                          {quote.quoteNumber}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          <Calendar className="inline h-3 w-3 mr-1" />
                          {new Date(quote.createdAt).toLocaleDateString('es-ES')}
                        </p>
                      </div>
                      <div className={`px-3 py-1 rounded-full ${actualConfig.color} flex items-center gap-1`}>
                        <ActualIcon className="h-4 w-4" />
                        <span className="text-xs font-semibold">{actualConfig.label}</span>
                      </div>
                    </div>

                    {/* Seller Info */}
                    <div className="mb-4 pb-4 border-b">
                      <p className="text-sm text-gray-600 flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {quote.seller.name}
                      </p>
                    </div>

                    {/* Amount */}
                    <div className="mb-4">
                      <p className="text-sm text-gray-600 mb-1">Monto Total</p>
                      <p className="text-2xl font-bold text-gray-900">
                        ${quote.totalAmount.toFixed(2)}
                      </p>
                    </div>

                    {/* Items Count */}
                    <div className="mb-4">
                      <p className="text-sm text-gray-600 flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        {quote.items.length} producto{quote.items.length !== 1 ? 's' : ''}
                      </p>
                    </div>

                    {/* Valid Until */}
                    <div className={`p-3 rounded-lg ${expired ? 'bg-red-50' : 'bg-blue-50'} mb-4`}>
                      <p className="text-xs text-gray-600 mb-1">Válida hasta:</p>
                      <p className={`text-sm font-semibold ${expired ? 'text-red-700' : 'text-blue-700'}`}>
                        {new Date(quote.validUntil).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                      {expired && (
                        <p className="text-xs text-red-600 mt-1">⚠️ Esta cotización ha expirado</p>
                      )}
                    </div>

                    {/* View Button */}
                    <Button 
                      className="w-full"
                      variant="outline"
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

        {/* Quote Detail Modal */}
        {selectedQuote && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            <div 
              className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
              onClick={() => setSelectedQuote(null)}
            />

            <div className="absolute right-0 top-0 h-full w-full max-w-2xl">
              <Card className="h-full rounded-none shadow-2xl">
                <CardContent className="p-0 h-full flex flex-col">
                  {/* Header */}
                  <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedQuote(null)}
                      className="mb-4"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Volver
                    </Button>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {selectedQuote.quoteNumber}
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Creada el {new Date(selectedQuote.createdAt).toLocaleDateString('es-ES')}
                    </p>
                  </div>

                  {/* Content */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Seller Info */}
                    <div className="bg-white rounded-lg shadow-sm p-4 border">
                      <h3 className="font-semibold text-gray-900 mb-3">Información del Vendedor</h3>
                      <div className="space-y-2 text-sm">
                        <p className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-600" />
                          <span className="font-medium">{selectedQuote.seller.name}</span>
                        </p>
                        <p className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-600" />
                          <span>{selectedQuote.seller.email}</span>
                        </p>
                        {selectedQuote.seller.phone && (
                          <p className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-gray-600" />
                            <span>{selectedQuote.seller.phone}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Items */}
                    <div className="bg-white rounded-lg shadow-sm p-4 border">
                      <h3 className="font-semibold text-gray-900 mb-3">Productos</h3>
                      <div className="space-y-3">
                        {selectedQuote.items.map((item, index) => (
                          <div key={item.id} className="flex justify-between items-start p-3 bg-gray-50 rounded-lg">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{item.productName}</p>
                              {item.description && (
                                <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                              )}
                              <p className="text-sm text-gray-600 mt-1">
                                Cantidad: {item.quantity} × ${item.pricePerUnit.toFixed(2)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-gray-900">${item.subtotal.toFixed(2)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Total */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border-2 border-blue-200">
                      <div className="flex justify-between items-center">
                        <p className="text-lg font-semibold text-gray-900">Total</p>
                        <p className="text-3xl font-bold text-blue-600">
                          ${selectedQuote.totalAmount.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* Notes */}
                    {selectedQuote.notes && (
                      <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                        <h3 className="font-semibold text-gray-900 mb-2">Notas</h3>
                        <p className="text-sm text-gray-700">{selectedQuote.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {selectedQuote.status === 'SENT' && !isExpired(selectedQuote.validUntil) && (
                    <div className="p-6 bg-gray-50 border-t flex gap-3">
                      <Button
                        onClick={() => handleRejectQuote(selectedQuote.id)}
                        variant="outline"
                        className="flex-1"
                        disabled={!!actionLoading}
                      >
                        {actionLoading === selectedQuote.id ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <XCircle className="h-4 w-4 mr-2" />
                        )}
                        Rechazar
                      </Button>
                      <Button
                        onClick={() => handleAcceptQuote(selectedQuote.id)}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        disabled={!!actionLoading}
                      >
                        {actionLoading === selectedQuote.id ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <CheckCircle className="h-4 w-4 mr-2" />
                        )}
                        Aceptar Cotización
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
