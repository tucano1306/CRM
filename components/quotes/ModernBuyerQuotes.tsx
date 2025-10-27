'use client'

import { useEffect, useState } from 'react'
import { 
  FileText, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock,
  Calendar,
  User,
  Package,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Mail,
  Phone,
  DollarSign,
  TrendingUp,
  Filter,
  Search,
  Sparkles,
  Award
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
  DRAFT: { 
    label: 'Borrador', 
    icon: Clock, 
    color: 'text-gray-700',
    bg: 'bg-gray-100',
    gradient: 'from-gray-100 to-gray-200',
    badge: 'bg-gray-500'
  },
  SENT: { 
    label: 'Pendiente', 
    icon: Clock, 
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    gradient: 'from-blue-400 to-cyan-500',
    badge: 'bg-blue-500'
  },
  ACCEPTED: { 
    label: 'Aceptada', 
    icon: CheckCircle, 
    color: 'text-green-700',
    bg: 'bg-green-50',
    gradient: 'from-green-400 to-emerald-500',
    badge: 'bg-green-500'
  },
  REJECTED: { 
    label: 'Rechazada', 
    icon: XCircle, 
    color: 'text-red-700',
    bg: 'bg-red-50',
    gradient: 'from-red-400 to-rose-500',
    badge: 'bg-red-500'
  },
  EXPIRED: { 
    label: 'Expirada', 
    icon: AlertCircle, 
    color: 'text-orange-700',
    bg: 'bg-orange-50',
    gradient: 'from-orange-400 to-amber-500',
    badge: 'bg-orange-500'
  },
}

export default function ModernBuyerQuotes() {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

  useEffect(() => {
    fetchQuotes()
  }, [])

  const fetchQuotes = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const result = await apiCall('/api/quotes', { timeout: 10000 })
      
      if (result.success && result.data) {
        const apiResponse = result.data as any
        const quotesArray = Array.isArray(apiResponse.data) ? apiResponse.data : (Array.isArray(apiResponse) ? apiResponse : [])
        
        // Filtrar solo las cotizaciones que han sido enviadas
        const sentQuotes = quotesArray.filter((q: Quote) => q.status !== 'DRAFT')
        setQuotes(sentQuotes)
      } else {
        setError(result.error || 'Error al cargar cotizaciones')
      }
    } catch (err) {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptQuote = async (quoteId: string) => {
    if (!confirm('¿Estás seguro de aceptar esta cotización?')) return

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
      alert('Error de conexión')
    } finally {
      setActionLoading(null)
    }
  }

  const handleRejectQuote = async (quoteId: string) => {
    if (!confirm('¿Estás seguro de rechazar esta cotización?')) return

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
      alert('Error de conexión')
    } finally {
      setActionLoading(null)
    }
  }

  const isExpired = (validUntil: string) => {
    return new Date(validUntil) < new Date()
  }

  // Estadísticas
  const stats = {
    total: quotes.length,
    pending: quotes.filter(q => q.status === 'SENT' && !isExpired(q.validUntil)).length,
    accepted: quotes.filter(q => q.status === 'ACCEPTED').length,
    totalAmount: quotes.reduce((sum, q) => sum + (q.status === 'ACCEPTED' ? q.totalAmount : 0), 0)
  }

  // Filtros
  const filteredQuotes = quotes.filter(quote => {
    const matchesSearch = quote.quoteNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          quote.seller.name.toLowerCase().includes(searchTerm.toLowerCase())
    
    const actualStatus = isExpired(quote.validUntil) && quote.status === 'SENT' ? 'EXPIRED' : quote.status
    const matchesStatus = statusFilter === 'ALL' || actualStatus === statusFilter
    
    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-cyan-50 p-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="animate-spin h-12 w-12 text-purple-600 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">Cargando cotizaciones...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-cyan-50 p-6">
        <div className="flex items-center justify-center h-96">
          <Card className="max-w-md border-2 border-red-200">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-900">Error</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={fetchQuotes} className="bg-purple-600 hover:bg-purple-700">
                Reintentar
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-cyan-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Moderno */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Mis Cotizaciones</h1>
              <p className="text-gray-600">
                Revisa y responde a las propuestas de tu vendedor
              </p>
            </div>
          </div>
        </div>

        {/* Panel de Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center">
                  <FileText className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Pendientes</p>
                  <p className="text-3xl font-bold text-blue-600">{stats.pending}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-xl flex items-center justify-center">
                  <Clock className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Aceptadas</p>
                  <p className="text-3xl font-bold text-green-600">{stats.accepted}</p>
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
                  <p className="text-sm text-gray-600 mb-1">Total Aceptado</p>
                  <p className="text-2xl font-bold text-purple-600">${stats.totalAmount.toFixed(2)}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-500 rounded-xl flex items-center justify-center">
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
                  placeholder="Buscar por número o vendedor..."
                  className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Filtros de Estado */}
              <div className="flex gap-2 flex-wrap">
                {[
                  { value: 'ALL', label: 'Todas', icon: Filter },
                  { value: 'SENT', label: 'Pendientes', icon: Clock },
                  { value: 'ACCEPTED', label: 'Aceptadas', icon: CheckCircle },
                  { value: 'REJECTED', label: 'Rechazadas', icon: XCircle },
                  { value: 'EXPIRED', label: 'Expiradas', icon: AlertCircle },
                ].map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setStatusFilter(value)}
                    className={`px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-2 ${
                      statusFilter === value
                        ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                        : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-purple-300'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quotes List */}
        {filteredQuotes.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-12 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="h-10 w-10 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {quotes.length === 0 ? 'No tienes cotizaciones' : 'No se encontraron resultados'}
              </h3>
              <p className="text-gray-600">
                {quotes.length === 0 
                  ? 'Cuando tu vendedor te envíe una cotización, aparecerá aquí'
                  : 'Intenta cambiar los filtros de búsqueda'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredQuotes.map((quote) => {
              const expired = isExpired(quote.validUntil)
              const actualStatus = expired && quote.status === 'SENT' ? 'EXPIRED' : quote.status
              const config = statusConfig[actualStatus]
              const Icon = config.icon
              const needsAttention = actualStatus === 'SENT'

              return (
                <Card 
                  key={quote.id}
                  className="border-0 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer group overflow-hidden"
                  onClick={() => setSelectedQuote(quote)}
                  style={needsAttention ? {
                    animation: 'quotePulse 3s ease-in-out infinite',
                  } : {}}
                >
                  {/* Gradient Header */}
                  <div className={`h-2 bg-gradient-to-r ${config.gradient}`} />
                  
                  <CardContent className="p-6">
                    {/* Status Badge */}
                    {actualStatus === 'ACCEPTED' && (
                      <div 
                        className="absolute top-4 right-4 z-10"
                        style={{
                          animation: 'stickerBounce 0.8s ease-out',
                        }}
                      >
                        <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
                          <Award className="h-4 w-4" />
                          <span className="font-bold text-xs">Aceptada</span>
                        </div>
                      </div>
                    )}

                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-bold text-lg text-gray-900 group-hover:text-purple-600 transition-colors">
                          {quote.quoteNumber}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(quote.createdAt).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
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

                    {/* Seller Info */}
                    <div className={`mb-4 pb-4 border-b-2 ${config.bg} rounded-lg p-3`}>
                      <p className="text-xs text-gray-500 mb-1">Vendedor</p>
                      <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                        <User className="h-4 w-4 text-purple-600" />
                        {quote.seller.name}
                      </p>
                    </div>

                    {/* Amount */}
                    <div className="mb-4 bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-4">
                      <p className="text-xs text-gray-600 mb-1">Monto Total</p>
                      <p className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                        ${quote.totalAmount.toFixed(2)}
                      </p>
                    </div>

                    {/* Items Count */}
                    <div className="mb-4 flex items-center justify-between bg-gray-50 rounded-lg p-3">
                      <p className="text-sm text-gray-700 flex items-center gap-2">
                        <Package className="h-4 w-4 text-purple-600" />
                        <span className="font-medium">{quote.items.length} productos</span>
                      </p>
                    </div>

                    {/* Valid Until */}
                    <div className={`p-3 rounded-lg mb-4 ${expired ? 'bg-red-50 border-2 border-red-200' : 'bg-blue-50 border-2 border-blue-200'}`}>
                      <p className="text-xs text-gray-600 mb-1">Válida hasta:</p>
                      <p className={`text-sm font-bold ${expired ? 'text-red-700' : 'text-blue-700'}`}>
                        {new Date(quote.validUntil).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                      {expired && (
                        <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Esta cotización ha expirado
                        </p>
                      )}
                    </div>

                    {/* View Button */}
                    <Button 
                      className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg"
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

            <div className="absolute right-0 top-0 h-full w-full max-w-3xl animate-slideInRight">
              <Card className="h-full rounded-none shadow-2xl border-l-4 border-purple-500">
                <CardContent className="p-0 h-full flex flex-col">
                  {/* Header */}
                  <div className="p-6 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedQuote(null)}
                      className="mb-4 text-white hover:bg-white/20"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Volver
                    </Button>
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="text-2xl font-bold mb-2">
                          {selectedQuote.quoteNumber}
                        </h2>
                        <p className="text-purple-100 text-sm flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Creada el {new Date(selectedQuote.createdAt).toLocaleDateString('es-ES', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                      {(() => {
                        const expired = isExpired(selectedQuote.validUntil)
                        const actualStatus = expired && selectedQuote.status === 'SENT' ? 'EXPIRED' : selectedQuote.status
                        const config = statusConfig[actualStatus]
                        const Icon = config.icon
                        return (
                          <div className={`px-4 py-2 ${config.badge} rounded-full flex items-center gap-2`}>
                            <Icon className="h-4 w-4" />
                            <span className="font-semibold text-sm">{config.label}</span>
                          </div>
                        )
                      })()}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-br from-purple-50/30 to-blue-50/30">
                    {/* Seller Info */}
                    <Card className="border-0 shadow-lg">
                      <CardContent className="p-6">
                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                          <User className="h-5 w-5 text-purple-600" />
                          Información del Vendedor
                        </h3>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center">
                              <User className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Nombre</p>
                              <p className="font-semibold text-gray-900">{selectedQuote.seller.name}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                              <Mail className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Email</p>
                              <p className="font-semibold text-gray-900">{selectedQuote.seller.email}</p>
                            </div>
                          </div>
                          {selectedQuote.seller.phone && (
                            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                              <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
                                <Phone className="h-5 w-5 text-white" />
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Teléfono</p>
                                <p className="font-semibold text-gray-900">{selectedQuote.seller.phone}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Items */}
                    <Card className="border-0 shadow-lg">
                      <CardContent className="p-6">
                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                          <Package className="h-5 w-5 text-purple-600" />
                          Productos ({selectedQuote.items.length})
                        </h3>
                        <div className="space-y-3">
                          {selectedQuote.items.map((item, index) => (
                            <div 
                              key={item.id} 
                              className="p-4 bg-gradient-to-br from-gray-50 to-purple-50 rounded-xl border-2 border-gray-200 hover:border-purple-300 transition-colors"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="w-6 h-6 bg-gradient-to-br from-purple-500 to-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                      {index + 1}
                                    </span>
                                    <p className="font-bold text-gray-900">{item.productName}</p>
                                  </div>
                                  {item.description && (
                                    <p className="text-sm text-gray-600 ml-8">{item.description}</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center justify-between ml-8 pt-3 border-t border-gray-200">
                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                  <span>Cantidad: <span className="font-semibold text-gray-900">{item.quantity}</span></span>
                                  <span>×</span>
                                  <span>${item.pricePerUnit.toFixed(2)}</span>
                                </div>
                                <p className="text-lg font-bold text-purple-600">
                                  ${item.subtotal.toFixed(2)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Total & Notes */}
                    <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-600 to-blue-600 text-white">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-purple-100 text-sm mb-1">Total de la Cotización</p>
                            <p className="text-4xl font-bold">${selectedQuote.totalAmount.toFixed(2)}</p>
                          </div>
                          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                            <DollarSign className="h-8 w-8" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {selectedQuote.notes && (
                      <Card className="border-0 shadow-lg">
                        <CardContent className="p-6">
                          <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-purple-600" />
                            Notas del Vendedor
                          </h3>
                          <p className="text-gray-700 bg-purple-50 p-4 rounded-lg border-l-4 border-purple-500">
                            {selectedQuote.notes}
                          </p>
                        </CardContent>
                      </Card>
                    )}

                    {/* Valid Until Warning */}
                    {(() => {
                      const expired = isExpired(selectedQuote.validUntil)
                      return (
                        <Card className={`border-0 shadow-lg ${expired ? 'bg-red-50' : 'bg-blue-50'}`}>
                          <CardContent className="p-6">
                            <div className="flex items-start gap-4">
                              <div className={`w-12 h-12 ${expired ? 'bg-red-500' : 'bg-blue-500'} rounded-xl flex items-center justify-center flex-shrink-0`}>
                                <Clock className="h-6 w-6 text-white" />
                              </div>
                              <div className="flex-1">
                                <h4 className={`font-bold ${expired ? 'text-red-900' : 'text-blue-900'} mb-1`}>
                                  {expired ? '⚠️ Cotización Expirada' : 'Válida hasta:'}
                                </h4>
                                <p className={`${expired ? 'text-red-700' : 'text-blue-700'} font-semibold`}>
                                  {new Date(selectedQuote.validUntil).toLocaleDateString('es-ES', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  })}
                                </p>
                                {expired && (
                                  <p className="text-sm text-red-600 mt-2">
                                    Esta cotización ha expirado y ya no puede ser aceptada. Contacta al vendedor para solicitar una nueva.
                                  </p>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })()}
                  </div>

                  {/* Actions */}
                  {(() => {
                    const expired = isExpired(selectedQuote.validUntil)
                    const canAccept = selectedQuote.status === 'SENT' && !expired
                    
                    if (selectedQuote.status === 'ACCEPTED') {
                      return (
                        <div className="p-6 bg-green-50 border-t-4 border-green-500">
                          <div className="flex items-center gap-3 text-green-700">
                            <CheckCircle className="h-6 w-6" />
                            <div>
                              <p className="font-bold">Cotización Aceptada</p>
                              <p className="text-sm">Has aceptado esta cotización</p>
                            </div>
                          </div>
                        </div>
                      )
                    }

                    if (selectedQuote.status === 'REJECTED') {
                      return (
                        <div className="p-6 bg-red-50 border-t-4 border-red-500">
                          <div className="flex items-center gap-3 text-red-700">
                            <XCircle className="h-6 w-6" />
                            <div>
                              <p className="font-bold">Cotización Rechazada</p>
                              <p className="text-sm">Has rechazado esta cotización</p>
                            </div>
                          </div>
                        </div>
                      )
                    }

                    if (expired) {
                      return (
                        <div className="p-6 bg-orange-50 border-t-4 border-orange-500">
                          <div className="flex items-center gap-3 text-orange-700">
                            <AlertCircle className="h-6 w-6" />
                            <div>
                              <p className="font-bold">Cotización Expirada</p>
                              <p className="text-sm">Esta cotización ya no está disponible</p>
                            </div>
                          </div>
                        </div>
                      )
                    }

                    return (
                      <div className="p-6 bg-white border-t-4 border-purple-500">
                        <div className="flex gap-3">
                          <Button
                            onClick={() => handleRejectQuote(selectedQuote.id)}
                            disabled={!!actionLoading}
                            variant="outline"
                            className="flex-1 border-2 border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300"
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
                            disabled={!!actionLoading}
                            className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg"
                          >
                            {actionLoading === selectedQuote.id ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <CheckCircle className="h-4 w-4 mr-2" />
                            )}
                            Aceptar Cotización
                          </Button>
                        </div>
                      </div>
                    )
                  })()}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes quotePulse {
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

        @keyframes slideInRight {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  )
}
