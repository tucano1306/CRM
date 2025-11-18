'use client'

import { useState, useEffect } from 'react'
import { formatPrice } from '@/lib/utils'
import { 
  FileText, Plus, Search, Send, Check, X, Eye,
  Clock, DollarSign, RefreshCw, Filter, ChevronRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import CreateQuoteModal from './CreateQuoteModal'
import QuoteDetailModal from './QuoteDetailModal'

interface Quote {
  id: string
  quoteNumber: string
  title: string
  status: string
  totalAmount: number
  validUntil: string
  createdAt: string
  sentAt: string | null
  client: {
    name: string
    email: string
  }
  items: any[]
}

const statusConfig = {
  DRAFT: { label: 'Borrador', color: 'gray', icon: FileText, bgClass: 'bg-gray-100', textClass: 'text-gray-800', iconClass: 'text-gray-600' },
  SENT: { label: 'Enviada', color: 'blue', icon: Send, bgClass: 'bg-blue-100', textClass: 'text-blue-800', iconClass: 'text-blue-600' },
  VIEWED: { label: 'Vista', color: 'purple', icon: Eye, bgClass: 'bg-purple-100', textClass: 'text-purple-800', iconClass: 'text-purple-600' },
  ACCEPTED: { label: 'Aceptada', color: 'green', icon: Check, bgClass: 'bg-green-100', textClass: 'text-green-800', iconClass: 'text-green-600' },
  REJECTED: { label: 'Rechazada', color: 'red', icon: X, bgClass: 'bg-red-100', textClass: 'text-red-800', iconClass: 'text-red-600' },
  EXPIRED: { label: 'Expirada', color: 'orange', icon: Clock, bgClass: 'bg-orange-100', textClass: 'text-orange-800', iconClass: 'text-orange-600' },
  CONVERTED: { label: 'Convertida', color: 'emerald', icon: RefreshCw, bgClass: 'bg-emerald-100', textClass: 'text-emerald-800', iconClass: 'text-emerald-600' }
}

export default function QuotesManager() {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('ALL')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null)

  useEffect(() => {
    fetchQuotes()
  }, [])

  const fetchQuotes = async () => {
    try {
      const response = await fetch('/api/quotes')
      const result = await response.json()
      if (result.success) {
        setQuotes(result.data)
      }
    } catch (error) {
      console.error('Error fetching quotes:', error)
    } finally {
      setLoading(false)
    }
  }

  const deleteQuote = async (quoteId: string) => {
    if (!confirm('¿Eliminar esta cotización?')) return

    try {
      const response = await fetch(`/api/quotes/${quoteId}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        fetchQuotes()
      }
    } catch (error) {
      console.error('Error deleting quote:', error)
    }
  }

  // Filtrar cotizaciones
  const filteredQuotes = quotes.filter(quote => {
    const matchesSearch = 
      quote.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.quoteNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.client.name.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = filterStatus === 'ALL' || quote.status === filterStatus
    
    return matchesSearch && matchesFilter
  })

  // Stats
  const stats = {
    total: quotes.length,
    draft: quotes.filter(q => q.status === 'DRAFT').length,
    sent: quotes.filter(q => q.status === 'SENT').length,
    accepted: quotes.filter(q => q.status === 'ACCEPTED').length,
    converted: quotes.filter(q => q.status === 'CONVERTED').length
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-1 p-3 sm:p-4 border-l-4 border-purple-500">
            <div className="flex items-center justify-between mb-2">
              <div className="bg-gradient-to-br from-purple-500 to-purple-700 p-1.5 sm:p-2 rounded-xl shadow-md">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-xs sm:text-sm text-gray-600 font-semibold uppercase tracking-wide">Total</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-1 p-3 sm:p-4 border-l-4 border-gray-500">
            <div className="flex items-center justify-between mb-2">
              <div className="bg-gradient-to-br from-gray-500 to-gray-700 p-1.5 sm:p-2 rounded-xl shadow-md">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.draft}</p>
            <p className="text-xs sm:text-sm text-gray-600 font-semibold uppercase tracking-wide">Borradores</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-1 p-3 sm:p-4 border-l-4 border-cyan-500">
            <div className="flex items-center justify-between mb-2">
              <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-1.5 sm:p-2 rounded-xl shadow-md">
                <Send className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.sent}</p>
            <p className="text-xs sm:text-sm text-gray-600 font-semibold uppercase tracking-wide">Enviadas</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-1 p-3 sm:p-4 border-l-4 border-emerald-500">
            <div className="flex items-center justify-between mb-2">
              <div className="bg-gradient-to-br from-emerald-500 to-green-600 p-1.5 sm:p-2 rounded-xl shadow-md">
                <Check className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.accepted}</p>
            <p className="text-xs sm:text-sm text-gray-600 font-semibold uppercase tracking-wide">Aceptadas</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-1 p-3 sm:p-4 border-l-4 border-indigo-500">
            <div className="flex items-center justify-between mb-2">
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-1.5 sm:p-2 rounded-xl shadow-md">
                <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.converted}</p>
            <p className="text-xs sm:text-sm text-gray-600 font-semibold uppercase tracking-wide">Convertidas</p>
          </div>
        </div>

        {/* Controles */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar cotización..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="ALL">Todas</option>
              <option value="DRAFT">Borradores</option>
              <option value="SENT">Enviadas</option>
              <option value="ACCEPTED">Aceptadas</option>
              <option value="CONVERTED">Convertidas</option>
            </select>

            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nueva Cotización
            </Button>
          </div>
        </div>

        {/* Lista de Cotizaciones */}
        {filteredQuotes.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No hay cotizaciones
            </h3>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-purple-600 hover:bg-purple-700 mt-4"
            >
              <Plus className="h-4 w-4 mr-2" />
              Crear Primera Cotización
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredQuotes.map((quote) => {
              const config = statusConfig[quote.status as keyof typeof statusConfig]
              const StatusIcon = config.icon
              const isExpired = new Date() > new Date(quote.validUntil)

              return (
                <div
                  key={quote.id}
                  onClick={() => setSelectedQuote(quote)}
                  className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer border border-gray-200 hover:border-purple-300 p-4"
                >
                  {/* Layout responsivo: vertical en móvil, horizontal en desktop */}
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    {/* Ícono de estado */}
                    <div className={`${config.bgClass} p-3 rounded-lg self-start`}>
                      <StatusIcon className={`h-6 w-6 ${config.iconClass}`} />
                    </div>

                    {/* Contenido principal */}
                    <div className="flex-1 min-w-0">
                      {/* Título y badges */}
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900 truncate">{quote.title}</h3>
                        <span className={`text-xs px-2 py-1 rounded-full ${config.bgClass} ${config.textClass} whitespace-nowrap`}>
                          {config.label}
                        </span>
                        {isExpired && quote.status !== 'CONVERTED' && (
                          <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-800 whitespace-nowrap">
                            Expirada
                          </span>
                        )}
                      </div>
                      
                      {/* Información en grid responsivo */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-sm text-gray-600">
                        <span className="truncate">#{quote.quoteNumber}</span>
                        <span className="truncate">👤 {quote.client.name}</span>
                        <span className="whitespace-nowrap">📦 {quote.items?.length || 0} productos</span>
                        <span className="truncate">⏰ {new Date(quote.validUntil).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
                      </div>
                    </div>

                    {/* Precio y fecha - se mueve abajo en móvil */}
                    <div className="flex md:flex-col items-center md:items-end justify-between md:justify-start gap-2 md:text-right">
                      <p className="text-xl md:text-2xl font-bold text-purple-600">
                        {formatPrice(Number(quote.totalAmount))}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(quote.createdAt).toLocaleDateString('es-ES')}
                      </p>
                    </div>

                    {/* Chevron - oculto en móvil */}
                    <ChevronRight className="hidden md:block h-5 w-5 text-gray-400 flex-shrink-0" />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateQuoteModal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false)
            fetchQuotes()
          }}
        />
      )}

      {selectedQuote && (
        <QuoteDetailModal
          quote={selectedQuote}
          isOpen={!!selectedQuote}
          onClose={() => {
            setSelectedQuote(null)
            fetchQuotes()
          }}
        />
      )}
    </>
  )
}
