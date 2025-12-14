'use client'

import { useState } from 'react'
import { 
  CheckCircle, 
  AlertTriangle, 
  Loader2, 
  Package, 
  Lock,
  Eye,
  MessageSquare,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatPrice } from '@/lib/utils'

interface OrderItem {
  id: string
  productName: string
  quantity: number
  pricePerUnit: number
  subtotal: number
  availableQty?: number | null
  issueNote?: string | null
  product: {
    id: string
    name: string
    stock: number
    sku?: string
  }
}

interface Order {
  id: string
  orderNumber: string
  status: string
  totalAmount: number
  createdAt: string
  hasIssues?: boolean
  client: {
    id: string
    name: string
    email: string
    phone?: string
  }
  seller: {
    id: string
    name: string
  }
  orderItems: OrderItem[]
}

interface OrderIssue {
  id: string
  issueType: string
  description: string
  productId?: string
  productName?: string
  requestedQty?: number
  availableQty?: number
  proposedSolution?: string
  status: string
  buyerResponse?: string
  buyerAccepted?: boolean
}

interface OrderReviewPanelProps {
  readonly order: Order
  readonly onStartReview: () => Promise<void>
  readonly onLockOrder: () => Promise<void>
  readonly onReportIssue: (issue: {
    issueType: string
    description: string
    productId?: string
    productName?: string
    requestedQty?: number
    availableQty?: number
    proposedSolution?: string
  }) => Promise<void>
  readonly issues?: OrderIssue[]
  readonly isLoading?: boolean
  readonly onClose?: () => void
}

const ISSUE_TYPES = [
  { value: 'OUT_OF_STOCK', label: 'Sin stock', icon: '❌' },
  { value: 'PARTIAL_STOCK', label: 'Stock parcial', icon: '⚠️' },
  { value: 'DISCONTINUED', label: 'Descontinuado', icon: '🚫' },
  { value: 'PRICE_CHANGE', label: 'Cambio de precio', icon: '💰' },
  { value: 'OTHER', label: 'Otro', icon: '📝' }
]

export default function OrderReviewPanel({
  order,
  onStartReview,
  onLockOrder,
  onReportIssue,
  issues = [],
  isLoading = false,
  onClose
}: OrderReviewPanelProps) {
  const [selectedItem, setSelectedItem] = useState<OrderItem | null>(null)
  const [showIssueForm, setShowIssueForm] = useState(false)
  const [issueForm, setIssueForm] = useState({
    issueType: 'OUT_OF_STOCK',
    description: '',
    availableQty: 0,
    proposedSolution: ''
  })
  const [submittingIssue, setSubmittingIssue] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const isPending = order.status === 'PENDING'
  const isReviewing = order.status === 'REVIEWING'
  const hasIssues = order.status === 'ISSUE_REPORTED'
  const isLocked = order.status === 'LOCKED'

  const pendingIssues = issues.filter(i => !['ACCEPTED', 'RESOLVED'].includes(i.status))
  const canLock = (isReviewing || hasIssues) && pendingIssues.length === 0

  const handleStartReview = async () => {
    setActionLoading('review')
    try {
      await onStartReview()
    } finally {
      setActionLoading(null)
    }
  }

  const handleLockOrder = async () => {
    setActionLoading('lock')
    try {
      await onLockOrder()
    } finally {
      setActionLoading(null)
    }
  }

  const handleReportIssue = async () => {
    if (!selectedItem) return
    
    setSubmittingIssue(true)
    try {
      await onReportIssue({
        issueType: issueForm.issueType,
        description: issueForm.description,
        productId: selectedItem.product.id,
        productName: selectedItem.productName,
        requestedQty: selectedItem.quantity,
        availableQty: issueForm.availableQty,
        proposedSolution: issueForm.proposedSolution
      })
      
      // Reset form
      setIssueForm({
        issueType: 'OUT_OF_STOCK',
        description: '',
        availableQty: 0,
        proposedSolution: ''
      })
      setShowIssueForm(false)
      setSelectedItem(null)
    } finally {
      setSubmittingIssue(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="w-5 h-5" />
            Revisión de Orden #{order.orderNumber}
          </CardTitle>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
        <p className="text-sm text-gray-500">
          Cliente: {order.client.name} • Total: {formatPrice(order.totalAmount)}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Estado actual */}
        <div className={`
          p-3 rounded-lg border
          ${isPending ? 'bg-yellow-50 border-yellow-200' : ''}
          ${isReviewing ? 'bg-blue-50 border-blue-200' : ''}
          ${hasIssues ? 'bg-red-50 border-red-200' : ''}
          ${isLocked ? 'bg-green-50 border-green-200' : ''}
        `}>
          <div className="flex items-center gap-2">
            {isPending && <Eye className="w-5 h-5 text-yellow-600" />}
            {isReviewing && <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />}
            {hasIssues && <AlertTriangle className="w-5 h-5 text-red-600" />}
            {isLocked && <Lock className="w-5 h-5 text-green-600" />}
            
            <span className="font-medium">
              {isPending && 'Pendiente de revisión'}
              {isReviewing && 'En revisión - Verifica los productos'}
              {hasIssues && `Problemas reportados (${pendingIssues.length} pendientes)`}
              {isLocked && 'Orden confirmada y bloqueada'}
            </span>
          </div>
        </div>

        {/* Acciones principales */}
        <div className="flex gap-2 flex-wrap">
          {isPending && (
            <Button
              onClick={handleStartReview}
              disabled={actionLoading === 'review'}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {actionLoading === 'review' ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Eye className="w-4 h-4 mr-2" />
              )}
              Iniciar Revisión
            </Button>
          )}

          {canLock && (
            <Button
              onClick={handleLockOrder}
              disabled={actionLoading === 'lock'}
              className="bg-green-600 hover:bg-green-700"
            >
              {actionLoading === 'lock' ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Lock className="w-4 h-4 mr-2" />
              )}
              Confirmar y Bloquear Orden
            </Button>
          )}

          {!canLock && (isReviewing || hasIssues) && pendingIssues.length > 0 && (
            <div className="text-sm text-red-600 flex items-center">
              <AlertTriangle className="w-4 h-4 mr-1" />
              Resuelve los {pendingIssues.length} problema(s) antes de confirmar
            </div>
          )}
        </div>

        {/* Lista de productos */}
        {(isReviewing || hasIssues) && (
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b">
              <h4 className="font-medium text-sm">Productos a revisar</h4>
            </div>
            <div className="divide-y">
              {order.orderItems.map((item) => {
                const itemIssue = issues.find(i => i.productId === item.product.id)
                const hasItemIssue = !!itemIssue
                
                return (
                  <div 
                    key={item.id} 
                    className={`
                      p-3 flex items-center justify-between
                      ${hasItemIssue ? 'bg-red-50' : 'hover:bg-gray-50'}
                    `}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{item.productName}</span>
                        {hasItemIssue && (
                          <span className={`
                            text-xs px-2 py-0.5 rounded-full
                            ${itemIssue.status === 'ACCEPTED' ? 'bg-green-100 text-green-700' :
                              itemIssue.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                              'bg-yellow-100 text-yellow-700'}
                          `}>
                            {itemIssue.status === 'ACCEPTED' ? '✓ Aceptado' :
                             itemIssue.status === 'REJECTED' ? '✗ Rechazado' :
                             '⏳ Pendiente'}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        Cantidad: {item.quantity} • Stock actual: {item.product.stock}
                      </div>
                      {hasItemIssue && itemIssue.description && (
                        <div className="text-sm text-red-600 mt-1">
                          {itemIssue.description}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {item.product.stock >= item.quantity ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : hasItemIssue ? null : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-300"
                          onClick={() => {
                            setSelectedItem(item)
                            setIssueForm({
                              ...issueForm,
                              availableQty: item.product.stock,
                              description: item.product.stock === 0 
                                ? 'Producto sin stock disponible'
                                : `Solo hay ${item.product.stock} unidades disponibles (se pidieron ${item.quantity})`
                            })
                            setShowIssueForm(true)
                          }}
                        >
                          <AlertTriangle className="w-4 h-4 mr-1" />
                          Reportar
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Formulario de reporte de problema */}
        {showIssueForm && selectedItem && (
          <div className="border-2 border-red-200 rounded-lg p-4 bg-red-50">
            <h4 className="font-medium text-red-800 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Reportar problema con: {selectedItem.productName}
            </h4>
            
            <div className="space-y-3">
              <div>
                <label htmlFor="issue-type-select" className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de problema
                </label>
                <select
                  id="issue-type-select"
                  value={issueForm.issueType}
                  onChange={(e) => setIssueForm({ ...issueForm, issueType: e.target.value })}
                  className="w-full border rounded-md px-3 py-2"
                >
                  {ISSUE_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.icon} {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="issue-available-qty-input" className="block text-sm font-medium text-gray-700 mb-1">
                  Cantidad disponible
                </label>
                <input
                  id="issue-available-qty-input"
                  type="number"
                  min="0"
                  max={selectedItem.quantity}
                  value={issueForm.availableQty}
                  onChange={(e) => setIssueForm({ ...issueForm, availableQty: Number.parseInt(e.target.value, 10) || 0 })}
                  className="w-full border rounded-md px-3 py-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Solicitado: {selectedItem.quantity} | Stock: {selectedItem.product.stock}
                </p>
              </div>

              <div>
                <label htmlFor="issue-description-input" className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción del problema
                </label>
                <textarea
                  id="issue-description-input"
                  value={issueForm.description}
                  onChange={(e) => setIssueForm({ ...issueForm, description: e.target.value })}
                  className="w-full border rounded-md px-3 py-2"
                  rows={2}
                />
              </div>

              <div>
                <label htmlFor="issue-proposed-solution-input" className="block text-sm font-medium text-gray-700 mb-1">
                  Solución propuesta (opcional)
                </label>
                <textarea
                  id="issue-proposed-solution-input"
                  value={issueForm.proposedSolution}
                  onChange={(e) => setIssueForm({ ...issueForm, proposedSolution: e.target.value })}
                  placeholder="Ej: Podemos enviar 5 unidades ahora y el resto mañana"
                  className="w-full border rounded-md px-3 py-2"
                  rows={2}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleReportIssue}
                  disabled={submittingIssue || !issueForm.description}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {submittingIssue ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <MessageSquare className="w-4 h-4 mr-2" />
                  )}
                  Reportar y Notificar al Comprador
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowIssueForm(false)
                    setSelectedItem(null)
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Lista de problemas reportados */}
        {issues.length > 0 && (
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-yellow-50 px-4 py-2 border-b">
              <h4 className="font-medium text-sm">Problemas reportados ({issues.length})</h4>
            </div>
            <div className="divide-y">
              {issues.map((issue) => (
                <div key={issue.id} className="p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {ISSUE_TYPES.find(t => t.value === issue.issueType)?.icon}
                        {issue.productName || 'Problema general'}
                      </div>
                      <p className="text-sm text-gray-600">{issue.description}</p>
                      {issue.proposedSolution && (
                        <p className="text-sm text-blue-600 mt-1">
                          💡 Propuesta: {issue.proposedSolution}
                        </p>
                      )}
                      {issue.buyerResponse && (
                        <p className="text-sm text-green-600 mt-1">
                          📩 Respuesta: {issue.buyerResponse}
                        </p>
                      )}
                    </div>
                    <span className={`
                      text-xs px-2 py-1 rounded-full
                      ${issue.status === 'ACCEPTED' ? 'bg-green-100 text-green-700' :
                        issue.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                        issue.status === 'RESOLVED' ? 'bg-blue-100 text-blue-700' :
                        'bg-yellow-100 text-yellow-700'}
                    `}>
                      {issue.status === 'ACCEPTED' ? '✓ Aceptado' :
                       issue.status === 'REJECTED' ? '✗ Rechazado' :
                       issue.status === 'RESOLVED' ? '✓ Resuelto' :
                       '⏳ Esperando respuesta'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Botón para confirmar cuando ya está en revisión y todo OK */}
        {isLocked && (
          <div className="bg-green-100 border-green-300 border rounded-lg p-4 text-center">
            <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="font-medium text-green-800">
              Orden confirmada y bloqueada
            </p>
            <p className="text-sm text-green-600">
              El cliente ha sido notificado. Puedes proceder con la preparación.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
