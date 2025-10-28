// components/quotes/QuoteDetailModal.tsx
'use client'

import { useState } from 'react'
import { X, FileText, Package, Send, RefreshCw, Trash2, Calendar, DollarSign } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

interface QuoteDetailModalProps {
  quote: any
  isOpen: boolean
  onClose: () => void
}

export default function QuoteDetailModal({ quote, isOpen, onClose }: QuoteDetailModalProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'info' | 'products' | 'actions'>('info')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const tabs = [
    { id: 'info', label: 'Información', icon: FileText },
    { id: 'products', label: 'Productos', icon: Package },
    { id: 'actions', label: 'Acciones', icon: Send }
  ]

  const statusLabels: Record<string, string> = {
    DRAFT: 'Borrador',
    SENT: 'Enviada',
    VIEWED: 'Vista',
    ACCEPTED: 'Aceptada',
    REJECTED: 'Rechazada',
    EXPIRED: 'Expirada',
    CONVERTED: 'Convertida'
  }

  const handleSend = async () => {
    if (!confirm('¿Enviar esta cotización al cliente?')) return

    setLoading(true)
    try {
      const response = await fetch(`/api/quotes/${quote.id}/send`, {
        method: 'POST'
      })

      if (response.ok) {
        alert('Cotización enviada exitosamente')
        onClose()
      } else {
        const error = await response.json()
        alert(error.error || 'Error al enviar')
      }
    } catch (error) {
      console.error('Error sending quote:', error)
      alert('Error al enviar cotización')
    } finally {
      setLoading(false)
    }
  }

  const handleConvert = async () => {
    if (!confirm('¿Convertir esta cotización en orden?')) return

    setLoading(true)
    try {
      const response = await fetch(`/api/quotes/${quote.id}/convert`, {
        method: 'POST'
      })

      if (response.ok) {
        const result = await response.json()
        alert('Cotización convertida en orden exitosamente')
        onClose()
        // Redirigir a la orden creada
        router.push(`/orders`)
      } else {
        const error = await response.json()
        alert(error.error || 'Error al convertir')
      }
    } catch (error) {
      console.error('Error converting quote:', error)
      alert('Error al convertir cotización')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('¿Eliminar esta cotización permanentemente?')) return

    setLoading(true)
    try {
      const response = await fetch(`/api/quotes/${quote.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        alert('Cotización eliminada')
        onClose()
      } else {
        const error = await response.json()
        alert(error.error || 'Error al eliminar')
      }
    } catch (error) {
      console.error('Error deleting quote:', error)
      alert('Error al eliminar cotización')
    } finally {
      setLoading(false)
    }
  }

  const isExpired = new Date() > new Date(quote.validUntil)
  const canSend = quote.status === 'DRAFT'
  const canConvert = ['SENT', 'VIEWED', 'ACCEPTED'].includes(quote.status) && !isExpired
  const canDelete = quote.status !== 'CONVERTED'

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="fixed right-0 top-0 h-full w-full md:w-[800px] lg:w-[1000px] bg-white z-50 shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-2xl font-bold">{quote.title}</h2>
              <p className="text-purple-100 text-sm">#{quote.quoteNumber}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-purple-500">
              <X className="h-6 w-6" />
            </Button>
          </div>
          
          <div className="flex items-center gap-4 text-sm">
            <span className={`px-3 py-1 rounded-full ${
              quote.status === 'CONVERTED' ? 'bg-emerald-500' :
              quote.status === 'ACCEPTED' ? 'bg-green-500' :
              quote.status === 'SENT' ? 'bg-blue-500' :
              'bg-purple-500'
            }`}>
              {statusLabels[quote.status]}
            </span>
            {isExpired && quote.status !== 'CONVERTED' && (
              <span className="px-3 py-1 rounded-full bg-orange-500">
                Expirada
              </span>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b bg-gray-50">
          <div className="flex gap-1 p-2">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`
                    flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all
                    ${isActive ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-600 hover:bg-white/50'}
                  `}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* TAB: Información */}
          {activeTab === 'info' && (
            <div className="space-y-6">
              {/* Cliente */}
              <div className="bg-white rounded-lg border p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-purple-600" />
                  Información del Cliente
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Nombre</p>
                    <p className="font-medium">{quote.client.name}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Email</p>
                    <p className="font-medium">{quote.client.email}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Teléfono</p>
                    <p className="font-medium">{quote.client.phone || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Detalles de Cotización */}
              <div className="bg-white rounded-lg border p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-purple-600" />
                  Detalles de la Cotización
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Creada</p>
                    <p className="font-medium">{new Date(quote.createdAt).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Válida hasta</p>
                    <p className={`font-medium ${isExpired ? 'text-red-600' : 'text-green-600'}`}>
                      {new Date(quote.validUntil).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                  {quote.sentAt && (
                    <div>
                      <p className="text-gray-500">Enviada</p>
                      <p className="font-medium">{new Date(quote.sentAt).toLocaleDateString('es-ES')}</p>
                    </div>
                  )}
                  {quote.convertedOrderId && (
                    <div>
                      <p className="text-gray-500">Orden generada</p>
                      <p className="font-medium text-purple-600">
                        Ver en órdenes
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Descripción */}
              {quote.description && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h3 className="font-semibold text-purple-900 mb-2">Descripción</h3>
                  <p className="text-sm text-purple-800">{quote.description}</p>
                </div>
              )}

              {/* Notas */}
              {quote.notes && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="font-semibold text-yellow-900 mb-2">Notas Internas</h3>
                  <p className="text-sm text-yellow-800">{quote.notes}</p>
                </div>
              )}

              {/* Términos */}
              {quote.termsAndConditions && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Términos y Condiciones</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{quote.termsAndConditions}</p>
                </div>
              )}
            </div>
          )}

          {/* TAB: Productos */}
          {activeTab === 'products' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Package className="h-5 w-5 text-purple-600" />
                Productos Cotizados
              </h3>
              
              {quote.items?.map((item: any) => (
                <div key={item.id} className="bg-white rounded-lg border p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold text-gray-900">{item.productName}</h4>
                      {item.description && (
                        <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-purple-600">
                        {formatPrice(Number(item.subtotal))}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600 mt-3 pt-3 border-t">
                    <span>Cantidad: <strong>{item.quantity}</strong></span>
                    <span>•</span>
                    <span>Precio/u: <strong>{formatPrice(Number(item.pricePerUnit))}</strong></span>
                    {item.discount > 0 && (
                      <>
                        <span>•</span>
                        <span className="text-orange-600">Desc: <strong>{item.discount}%</strong></span>
                      </>
                    )}
                  </div>
                  {item.notes && (
                    <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                      📝 {item.notes}
                    </div>
                  )}
                </div>
              ))}

              {/* Totales */}
              <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4 mt-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>{formatPrice(Number(quote.subtotal))}</span>
                  </div>
                  {quote.discount > 0 && (
                    <div className="flex justify-between text-sm text-orange-600">
                      <span>Descuento ({quote.discount}%):</span>
                      <span>-{formatPrice(((quote.subtotal * quote.discount) / 100))}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span>Impuesto (10%):</span>
                    <span>{formatPrice(Number(quote.tax))}</span>
                  </div>
                  <div className="flex justify-between text-xl font-bold border-t-2 border-purple-300 pt-2">
                    <span>Total:</span>
                    <span className="text-purple-600">{formatPrice(Number(quote.totalAmount))}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: Acciones */}
          {activeTab === 'actions' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Acciones Disponibles</h3>

              {/* Enviar */}
              {canSend && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <div className="flex items-start gap-4">
                    <div className="bg-blue-100 p-3 rounded-lg">
                      <Send className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-blue-900 mb-2">Enviar Cotización</h4>
                      <p className="text-sm text-blue-700 mb-4">
                        Enviar esta cotización al cliente para su revisión.
                      </p>
                      <Button
                        onClick={handleSend}
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Enviar al Cliente
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Convertir */}
              {canConvert && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <div className="flex items-start gap-4">
                    <div className="bg-green-100 p-3 rounded-lg">
                      <RefreshCw className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-green-900 mb-2">Convertir en Orden</h4>
                      <p className="text-sm text-green-700 mb-4">
                        Convertir esta cotización aceptada en una orden de compra.
                      </p>
                      <Button
                        onClick={handleConvert}
                        disabled={loading}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Convertir en Orden
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Eliminar */}
              {canDelete && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                  <div className="flex items-start gap-4">
                    <div className="bg-red-100 p-3 rounded-lg">
                      <Trash2 className="h-6 w-6 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-red-900 mb-2">Eliminar Cotización</h4>
                      <p className="text-sm text-red-700 mb-4">
                        Eliminar permanentemente esta cotización. Esta acción no se puede deshacer.
                      </p>
                      <Button
                        onClick={handleDelete}
                        disabled={loading}
                        variant="outline"
                        className="border-red-300 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar Cotización
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Si no hay acciones disponibles */}
              {!canSend && !canConvert && !canDelete && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                  <p className="text-gray-600">
                    No hay acciones disponibles para esta cotización.
                  </p>
                </div>
              )}

              {/* Info adicional */}
              {isExpired && quote.status !== 'CONVERTED' && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <p className="text-sm text-orange-800">
                    ⚠️ Esta cotización ha expirado. No se puede convertir en orden.
                  </p>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 p-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
        </div>
      </div>
    </>
  )
}
