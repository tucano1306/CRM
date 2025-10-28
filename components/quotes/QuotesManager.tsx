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
  DRAFT: { label: 'Borrador', color: 'gray', icon: FileText },
  SENT: { label: 'Enviada', color: 'blue', icon: Send },
  VIEWED: { label: 'Vista', color: 'purple', icon: Eye },
  ACCEPTED: { label: 'Aceptada', color: 'green', icon: Check },
  REJECTED: { label: 'Rechazada', color: 'red', icon: X },
  EXPIRED: { label: 'Expirada', color: 'orange', icon: Clock },
  CONVERTED: { label: 'Convertida', color: 'emerald', icon: RefreshCw }
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
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-4 text-white">
            <FileText className="h-5 w-5 opacity-80 mb-2" />
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm opacity-90">Total</p>
          </div>
          <div className="bg-gradient-to-br from-gray-500 to-gray-600 rounded-lg p-4 text-white">
            <FileText className="h-5 w-5 opacity-80 mb-2" />
            <p className="text-2xl font-bold">{stats.draft}</p>
            <p className="text-sm opacity-90">Borradores</p>
          </div>
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 text-white">
            <Send className="h-5 w-5 opacity-80 mb-2" />
            <p className="text-2xl font-bold">{stats.sent}</p>
            <p className="text-sm opacity-90">Enviadas</p>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 text-white">
            <Check className="h-5 w-5 opacity-80 mb-2" />
            <p className="text-2xl font-bold">{stats.accepted}</p>
            <p className="text-sm opacity-90">Aceptadas</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg p-4 text-white">
            <RefreshCw className="h-5 w-5 opacity-80 mb-2" />
            <p className="text-2xl font-bold">{stats.converted}</p>
            <p className="text-sm opacity-90">Convertidas</p>
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
                  <div className="flex items-center gap-4">
                    <div className={`bg-${config.color}-100 p-3 rounded-lg`}>
                      <StatusIcon className={`h-6 w-6 text-${config.color}-600`} />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{quote.title}</h3>
                        <span className={`text-xs px-2 py-1 rounded-full bg-${config.color}-100 text-${config.color}-800`}>
                          {config.label}
                        </span>
                        {isExpired && quote.status !== 'CONVERTED' && (
                          <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-800">
                            Expirada
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>#{quote.quoteNumber}</span>
                        <span>•</span>
                        <span>👤 {quote.client.name}</span>
                        <span>•</span>
                        <span>📦 {quote.items?.length || 0} productos</span>
                        <span>•</span>
                        <span>⏰ Válida hasta: {new Date(quote.validUntil).toLocaleDateString('es-ES')}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-2xl font-bold text-purple-600">
                        {formatPrice(Number(quote.totalAmount))}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(quote.createdAt).toLocaleDateString('es-ES')}
                      </p>
                    </div>

                    <ChevronRight className="h-5 w-5 text-gray-400" />
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
