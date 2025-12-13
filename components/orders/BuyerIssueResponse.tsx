'use client'

import { useState } from 'react'
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Loader2, 
  MessageSquare,
  Package
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatPrice } from '@/lib/utils'

interface OrderIssue {
  id: string
  issueType: string
  description: string
  productId?: string
  productName?: string
  requestedQty?: number
  availableQty?: number
  proposedSolution?: string
  substituteProductName?: string
  status: string
  buyerResponse?: string
  buyerAccepted?: boolean
  createdAt: string
}

interface Order {
  id: string
  orderNumber: string
  status: string
  totalAmount: number
  seller: {
    name: string
    phone?: string
    email?: string
  }
}

interface BuyerIssueResponseProps {
  order: Order
  issues: OrderIssue[]
  onRespond: (issueId: string, accepted: boolean, response: string) => Promise<void>
  isLoading?: boolean
}

const ISSUE_TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  OUT_OF_STOCK: { label: 'Sin stock', icon: '❌' },
  PARTIAL_STOCK: { label: 'Stock parcial', icon: '⚠️' },
  DISCONTINUED: { label: 'Descontinuado', icon: '🚫' },
  PRICE_CHANGE: { label: 'Cambio de precio', icon: '💰' },
  OTHER: { label: 'Otro', icon: '📝' }
}

export default function BuyerIssueResponse({
  order,
  issues,
  onRespond,
  isLoading = false
}: BuyerIssueResponseProps) {
  const [respondingTo, setRespondingTo] = useState<string | null>(null)
  const [response, setResponse] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const pendingIssues = issues.filter(i => !['ACCEPTED', 'REJECTED', 'RESOLVED'].includes(i.status))
  const resolvedIssues = issues.filter(i => ['ACCEPTED', 'REJECTED', 'RESOLVED'].includes(i.status))

  const handleRespond = async (issueId: string, accepted: boolean) => {
    setSubmitting(true)
    try {
      await onRespond(issueId, accepted, response)
      setRespondingTo(null)
      setResponse('')
    } finally {
      setSubmitting(false)
    }
  }

  if (issues.length === 0) {
    return null
  }

  return (
    <Card className="border-yellow-200 bg-yellow-50">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2 text-yellow-800">
          <AlertTriangle className="w-5 h-5" />
          Problemas con tu pedido #{order.orderNumber}
        </CardTitle>
        <p className="text-sm text-yellow-700">
          El vendedor {order.seller.name} ha reportado problemas con algunos productos.
          Por favor revisa y responde.
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Problemas pendientes de respuesta */}
        {pendingIssues.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-gray-700">
              Esperando tu respuesta ({pendingIssues.length})
            </h4>
            
            {pendingIssues.map((issue) => (
              <div 
                key={issue.id} 
                className="bg-white border border-yellow-200 rounded-lg p-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl">
                    {ISSUE_TYPE_LABELS[issue.issueType]?.icon || '📝'}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{issue.productName || 'Producto'}</span>
                      <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded">
                        {ISSUE_TYPE_LABELS[issue.issueType]?.label || 'Problema'}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2">{issue.description}</p>
                    
                    {issue.requestedQty && issue.availableQty !== undefined && (
                      <div className="text-sm bg-gray-50 rounded px-3 py-2 mb-2">
                        <span className="text-gray-500">Solicitado:</span>{' '}
                        <span className="font-medium">{issue.requestedQty}</span>
                        <span className="mx-2">→</span>
                        <span className="text-gray-500">Disponible:</span>{' '}
                        <span className={`font-medium ${issue.availableQty === 0 ? 'text-red-600' : 'text-yellow-600'}`}>
                          {issue.availableQty}
                        </span>
                      </div>
                    )}

                    {issue.proposedSolution && (
                      <div className="text-sm bg-blue-50 border border-blue-100 rounded px-3 py-2 mb-3">
                        <span className="font-medium text-blue-700">💡 Propuesta del vendedor:</span>
                        <p className="text-blue-600 mt-1">{issue.proposedSolution}</p>
                      </div>
                    )}

                    {issue.substituteProductName && (
                      <div className="text-sm bg-green-50 border border-green-100 rounded px-3 py-2 mb-3">
                        <span className="font-medium text-green-700">🔄 Producto sustituto:</span>
                        <p className="text-green-600 mt-1">{issue.substituteProductName}</p>
                      </div>
                    )}

                    {/* Área de respuesta */}
                    {respondingTo === issue.id ? (
                      <div className="mt-3 space-y-3">
                        <textarea
                          value={response}
                          onChange={(e) => setResponse(e.target.value)}
                          placeholder="Escribe tu respuesta o comentario (opcional)"
                          className="w-full border rounded-lg px-3 py-2 text-sm"
                          rows={2}
                        />
                        
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleRespond(issue.id, true)}
                            disabled={submitting}
                          >
                            {submitting ? (
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            ) : (
                              <CheckCircle className="w-4 h-4 mr-1" />
                            )}
                            Aceptar solución
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-300 hover:bg-red-50"
                            onClick={() => handleRespond(issue.id, false)}
                            disabled={submitting}
                          >
                            {submitting ? (
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            ) : (
                              <XCircle className="w-4 h-4 mr-1" />
                            )}
                            Rechazar
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setRespondingTo(null)
                              setResponse('')
                            }}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setRespondingTo(issue.id)}
                        className="mt-2"
                      >
                        <MessageSquare className="w-4 h-4 mr-1" />
                        Responder
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Problemas ya resueltos */}
        {resolvedIssues.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-gray-500">
              Resueltos ({resolvedIssues.length})
            </h4>
            
            {resolvedIssues.map((issue) => (
              <div 
                key={issue.id} 
                className={`
                  bg-white border rounded-lg p-3 opacity-75
                  ${issue.buyerAccepted ? 'border-green-200' : 'border-red-200'}
                `}
              >
                <div className="flex items-center gap-2">
                  {issue.buyerAccepted ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                  <span className="font-medium text-sm">{issue.productName}</span>
                  <span className={`
                    text-xs px-2 py-0.5 rounded
                    ${issue.buyerAccepted ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}
                  `}>
                    {issue.buyerAccepted ? 'Aceptado' : 'Rechazado'}
                  </span>
                </div>
                {issue.buyerResponse && (
                  <p className="text-xs text-gray-500 mt-1 ml-6">
                    Tu respuesta: {issue.buyerResponse}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Info de contacto del vendedor */}
        <div className="border-t pt-3 mt-4">
          <p className="text-xs text-gray-500 text-center">
            ¿Necesitas hablar directamente? Contacta a {order.seller.name}
            {order.seller.phone && ` al ${order.seller.phone}`}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
