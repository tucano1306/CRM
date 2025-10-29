'use client'

import { useEffect, useState } from 'react'
import { formatPrice } from '@/lib/utils'
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
  DRAFT: { label: 'Borrador', icon: Clock, color: 'bg-gray-100 text-gray-700', borderColor: 'border-gray-300', gradient: 'from-gray-50 to-slate-50' },
  SENT: { label: 'Enviada', icon: Mail, color: 'bg-cyan-100 text-cyan-700', borderColor: 'border-cyan-300', gradient: 'from-cyan-50 to-blue-50' },
  ACCEPTED: { label: 'Aceptada', icon: CheckCircle, color: 'bg-emerald-100 text-emerald-700', borderColor: 'border-emerald-300', gradient: 'from-emerald-50 to-green-50' },
  REJECTED: { label: 'Rechazada', icon: XCircle, color: 'bg-red-100 text-red-700', borderColor: 'border-red-300', gradient: 'from-red-50 to-rose-50' },
  EXPIRED: { label: 'Expirada', icon: AlertCircle, color: 'bg-amber-100 text-amber-700', borderColor: 'border-amber-300', gradient: 'from-amber-50 to-yellow-50' },
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
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-purple-50 p-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-4 rounded-xl shadow-md w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Loader2 className="animate-spin h-8 w-8 text-white" />
            </div>
            <p className="text-gray-600 font-medium">Cargando cotizaciones...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-purple-50 p-6">
        <div className="flex items-center justify-center h-96">
          <Card className="max-w-md border-2 border-red-200 shadow-xl">
            <CardContent className="p-8 text-center">
              <div className="bg-gradient-to-br from-red-100 to-rose-100 p-4 rounded-xl mb-4 inline-flex">
                <div className="bg-gradient-to-br from-red-500 to-rose-600 p-2 rounded-xl shadow-md">
                  <AlertCircle className="h-6 w-6 text-white" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-2 bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent">Error</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button 
                onClick={fetchQuotes}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:shadow-lg transition-all"
              >
                Reintentar
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all p-6 mb-8 border-2 border-purple-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-2 rounded-xl shadow-md">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">Mis Cotizaciones</h1>
          </div>
          <p className="text-gray-600 ml-14">
            Revisa y responde a las cotizaciones que te ha enviado tu vendedor
          </p>
        </div>

        {/* Quotes List */}
        {quotes.length === 0 ? (
          <Card className="border-2 border-purple-200 shadow-lg hover:shadow-xl transition-all">
            <CardContent className="p-12 text-center">
              <div className="bg-gradient-to-br from-purple-100 to-indigo-100 p-6 rounded-full w-32 h-32 mx-auto mb-6 flex items-center justify-center">
                <FileText className="h-16 w-16 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2">
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
                  className={`hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 cursor-pointer border-2 ${actualConfig.borderColor} shadow-lg`}
                  onClick={() => setSelectedQuote(quote)}
                >
                  <CardContent className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-bold text-lg text-purple-600">
                          {quote.quoteNumber}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          <Calendar className="inline h-3 w-3 mr-1" />
                          {new Date(quote.createdAt).toLocaleDateString('es-ES')}
                        </p>
                      </div>
                      <div className={`px-3 py-1 rounded-full ${actualConfig.color} flex items-center gap-1 shadow-sm`}>
                        <ActualIcon className="h-4 w-4" />
                        <span className="text-xs font-semibold">{actualConfig.label}</span>
                      </div>
                    </div>

                    {/* Seller Info */}
                    <div className="mb-4 pb-4 border-b border-purple-100">
                      <p className="text-sm text-gray-600 flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {quote.seller.name}
                      </p>
                    </div>

                    {/* Amount */}
                    <div className="mb-4">
                      <p className="text-sm text-gray-600 mb-1">Monto Total</p>
                      <p className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                        {formatPrice(quote.totalAmount)}
                      </p>
                    </div>

                    {/* Items Count */}
                    <div className="mb-4">
                      <p className="text-sm text-gray-600 flex items-center gap-2">
                        <Package className="h-4 w-4 text-purple-500" />
                        {quote.items.length} producto{quote.items.length !== 1 ? 's' : ''}
                      </p>
                    </div>

                    {/* Valid Until */}
                    <div className={`p-3 rounded-lg bg-gradient-to-br ${expired ? 'from-red-50 to-rose-50 border-2 border-red-200' : 'from-cyan-50 to-blue-50 border-2 border-cyan-200'} mb-4`}>
                      <p className="text-xs text-gray-600 mb-1">Válida hasta:</p>
                      <p className={`text-sm font-semibold ${expired ? 'text-red-700' : 'text-cyan-700'}`}>
                        {new Date(quote.validUntil).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                      {expired && (
                        <p className="text-xs text-red-600 mt-1 font-medium">⚠️ Esta cotización ha expirado</p>
                      )}
                    </div>

                    {/* View Button */}
                    <Button 
                      className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:shadow-lg transform hover:-translate-y-0.5 transition-all"
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
              className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
              onClick={() => setSelectedQuote(null)}
            />

            <div className="absolute right-0 top-0 h-full w-full max-w-2xl">
              <Card className="h-full rounded-none shadow-2xl border-l-4 border-purple-500">
                <CardContent className="p-0 h-full flex flex-col">
                  {/* Header */}
                  <div className="p-6 bg-gradient-to-r from-purple-50 to-indigo-50 border-b-2 border-purple-200">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedQuote(null)}
                      className="mb-4 hover:bg-purple-100"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Volver
                    </Button>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                      {selectedQuote.quoteNumber}
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Creada el {new Date(selectedQuote.createdAt).toLocaleDateString('es-ES')}
                    </p>
                  </div>

                  {/* Content */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Seller Info */}
                    <div className="bg-white rounded-lg shadow-md p-4 border-2 border-purple-200 hover:shadow-lg transition-all">
                      <h3 className="font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-3">Información del Vendedor</h3>
                      <div className="space-y-2 text-sm">
                        <p className="flex items-center gap-2">
                          <div className="bg-gradient-to-br from-purple-100 to-indigo-100 p-1.5 rounded-lg">
                            <User className="h-4 w-4 text-purple-600" />
                          </div>
                          <span className="font-medium">{selectedQuote.seller.name}</span>
                        </p>
                        <p className="flex items-center gap-2">
                          <div className="bg-gradient-to-br from-purple-100 to-indigo-100 p-1.5 rounded-lg">
                            <Mail className="h-4 w-4 text-purple-600" />
                          </div>
                          <span>{selectedQuote.seller.email}</span>
                        </p>
                        {selectedQuote.seller.phone && (
                          <p className="flex items-center gap-2">
                            <div className="bg-gradient-to-br from-purple-100 to-indigo-100 p-1.5 rounded-lg">
                              <Phone className="h-4 w-4 text-purple-600" />
                            </div>
                            <span>{selectedQuote.seller.phone}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Items */}
                    <div className="bg-white rounded-lg shadow-md p-4 border-2 border-purple-200 hover:shadow-lg transition-all">
                      <h3 className="font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-3">Productos</h3>
                      <div className="space-y-3">
                        {selectedQuote.items.map((item, index) => (
                          <div key={item.id} className="flex justify-between items-start p-3 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg border-2 border-purple-200 hover:border-purple-300 transition-all">
                            <div className="flex-1">
                              <p className="font-medium text-purple-600">{item.productName}</p>
                              {item.description && (
                                <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                              )}
                              <p className="text-sm text-gray-600 mt-1">
                                Cantidad: {item.quantity} × {formatPrice(item.pricePerUnit)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-purple-600">{formatPrice(item.subtotal)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Total */}
                    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4 border-2 border-purple-300 shadow-md">
                      <div className="flex justify-between items-center">
                        <p className="text-lg font-semibold text-gray-900">Total</p>
                        <p className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                          {formatPrice(selectedQuote.totalAmount)}
                        </p>
                      </div>
                    </div>

                    {/* Notes */}
                    {selectedQuote.notes && (
                      <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-lg p-4 border-2 border-amber-200 shadow-md">
                        <h3 className="font-semibold text-amber-900 mb-2">Notas</h3>
                        <p className="text-sm text-gray-700">{selectedQuote.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {selectedQuote.status === 'SENT' && !isExpired(selectedQuote.validUntil) && (
                    <div className="p-6 bg-gradient-to-br from-slate-50 to-purple-50 border-t-2 border-purple-200 flex gap-3">
                      <Button
                        onClick={() => handleRejectQuote(selectedQuote.id)}
                        variant="outline"
                        className="flex-1 border-2 border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50 transition-all"
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
                        className="flex-1 bg-gradient-to-r from-emerald-600 to-green-600 hover:shadow-lg transform hover:-translate-y-0.5 transition-all"
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
