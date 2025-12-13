'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { 
  X, 
  CheckCircle, 
  Package, 
  AlertTriangle, 
  Check, 
  Send, 
  Loader2,
  Lock,
  MessageSquare,
  Mail,
  Trash2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatPrice } from '@/lib/utils'
import Link from 'next/link'

// Icono de WhatsApp personalizado
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
)

type OrderStatus = 
  | 'PENDING' 
  | 'REVIEWING'
  | 'ISSUE_REPORTED'
  | 'LOCKED'
  | 'CONFIRMED' 
  | 'PREPARING'
  | 'READY_FOR_PICKUP'
  | 'IN_DELIVERY'
  | 'DELIVERED'
  | 'PARTIALLY_DELIVERED'
  | 'COMPLETED' 
  | 'CANCELED'
  | 'PAYMENT_PENDING'
  | 'PAID'

type StockIssueType = 'OUT_OF_STOCK' | 'PARTIAL_STOCK' | 'ACCEPTED' | null
type ReportableIssueType = 'OUT_OF_STOCK' | 'PARTIAL_STOCK' | null

interface OrderItem {
  id: string
  productId?: string
  productName: string
  quantity: number
  pricePerUnit: number
  subtotal: number
  product?: {
    id?: string
    sku?: string | null
    unit?: string
    stock?: number
  }
}

interface SelectedOrder {
  id: string
  orderNumber: string
  status: OrderStatus
  totalAmount: number
  clientId: string
  client: {
    id: string
    name: string
    email: string
    phone?: string
  }
  orderItems: OrderItem[]
}

interface ProductIssue {
  productId: string
  productName: string
  issueType: StockIssueType
  requestedQty: number
  availableQty: number
}

// Tipo para los issues que se reportan al API (sin ACCEPTED)
interface ReportableProductIssue {
  productId: string
  productName: string
  issueType: ReportableIssueType
  requestedQty: number
  availableQty: number
}

interface OrderReviewModalProps {
  isOpen: boolean
  onClose: () => void
  selectedCount: number
  currentStatus: OrderStatus | null
  onConfirm: (newStatus: OrderStatus, notes?: string) => Promise<void>
  selectedOrdersData?: SelectedOrder[]
  onReportStockIssues?: (orderId: string, issues: ReportableProductIssue[]) => Promise<void>
  onLockOrder?: (orderId: string) => Promise<void>
}

export default function BulkStatusChangeModal({
  isOpen,
  onClose,
  selectedCount,
  currentStatus,
  onConfirm,
  selectedOrdersData = [],
  onReportStockIssues,
  onLockOrder
}: OrderReviewModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'review' | 'issues' | 'confirm'>('review')
  
  // Estado para problemas de stock
  const [productIssues, setProductIssues] = useState<Map<string, ProductIssue>>(new Map())
  const [confirmNotes, setConfirmNotes] = useState('')
  
  // Estado para productos aceptados (confirmados disponibles)
  const [acceptedItems, setAcceptedItems] = useState<Set<string>>(new Set())
  
  // Estado para selección múltiple con checkboxes
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  
  // Estado para eliminación de productos
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteItemInfo, setDeleteItemInfo] = useState<{itemId: string, productName: string} | null>(null)
  const [deleteReason, setDeleteReason] = useState('')
  const [deletingItem, setDeletingItem] = useState<string | null>(null)
  const [deletedItems, setDeletedItems] = useState<Set<string>>(new Set())

  // Reset al cerrar
  useEffect(() => {
    if (!isOpen) {
      setStep('review')
      setProductIssues(new Map())
      setConfirmNotes('')
      setShowDeleteModal(false)
      setDeleteItemInfo(null)
      setDeleteReason('')
      setDeletedItems(new Set())
      setAcceptedItems(new Set())
      setSelectedItems(new Set())
    }
  }, [isOpen])

  if (!isOpen) return null

  // Obtener la orden seleccionada
  const singleOrder = selectedOrdersData.length === 1 ? selectedOrdersData[0] : null
  const orderItems = singleOrder?.orderItems || []
  const hasProducts = orderItems.length > 0

  const toggleProductIssue = (item: OrderItem, issueType: StockIssueType) => {
    const key = item.id
    const newMap = new Map(productIssues)
    
    const existing = newMap.get(key)
    
    // Si es ACCEPTED, manejarlo diferente
    if (issueType === 'ACCEPTED') {
      // Si ya estaba marcado como aceptado, quitarlo
      if (acceptedItems.has(key)) {
        const newAccepted = new Set(acceptedItems)
        newAccepted.delete(key)
        setAcceptedItems(newAccepted)
      } else {
        // Marcar como aceptado y quitar cualquier issue
        const newAccepted = new Set(acceptedItems)
        newAccepted.add(key)
        setAcceptedItems(newAccepted)
        newMap.delete(key)
        setProductIssues(newMap)
      }
      return
    }
    
    // Si se marca un issue, quitar de aceptados
    const newAccepted = new Set(acceptedItems)
    newAccepted.delete(key)
    setAcceptedItems(newAccepted)
    
    if (existing?.issueType === issueType) {
      newMap.delete(key)
    } else {
      newMap.set(key, {
        productId: item.productId || item.id,
        productName: item.productName,
        issueType,
        requestedQty: item.quantity,
        availableQty: issueType === 'OUT_OF_STOCK' ? 0 : Math.floor(item.quantity / 2)
      })
    }
    
    setProductIssues(newMap)
  }

  // Toggle checkbox de selección
  const toggleItemSelection = (itemId: string) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId)
    } else {
      newSelected.add(itemId)
    }
    setSelectedItems(newSelected)
  }

  // Seleccionar/deseleccionar todos
  const toggleAllSelection = () => {
    if (selectedItems.size === orderItems.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(orderItems.map(item => item.id)))
    }
  }

  // Marcar todos los seleccionados como aceptados
  const acceptAllSelected = () => {
    if (selectedItems.size === 0) {
      alert('Selecciona al menos un producto')
      return
    }
    const newAccepted = new Set(acceptedItems)
    const newIssues = new Map(productIssues)
    
    selectedItems.forEach(itemId => {
      newAccepted.add(itemId)
      newIssues.delete(itemId) // Quitar cualquier issue previo
    })
    
    setAcceptedItems(newAccepted)
    setProductIssues(newIssues)
    setSelectedItems(new Set()) // Limpiar selección
  }

  const updateAvailableQty = (itemId: string, qty: number) => {
    const newMap = new Map(productIssues)
    const existing = newMap.get(itemId)
    if (existing) {
      newMap.set(itemId, { ...existing, availableQty: qty })
      setProductIssues(newMap)
    }
  }

  // Abrir modal de eliminación
  const openDeleteModal = (item: OrderItem) => {
    setDeleteItemInfo({ itemId: item.id, productName: item.productName })
    setDeleteReason('')
    setShowDeleteModal(true)
  }

  // Confirmar eliminación de producto
  const handleConfirmDelete = async () => {
    if (!singleOrder || !deleteItemInfo || !deleteReason.trim()) {
      alert('Por favor, escribe el motivo de la eliminación')
      return
    }

    try {
      setDeletingItem(deleteItemInfo.itemId)
      
      const response = await fetch(`/api/orders/${singleOrder.id}/items/${deleteItemInfo.itemId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          reason: deleteReason,
          bySeller: true 
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al eliminar producto')
      }

      // Marcar como eliminado localmente
      setDeletedItems(prev => new Set([...prev, deleteItemInfo.itemId]))
      
      // Cerrar modal
      setShowDeleteModal(false)
      setDeleteItemInfo(null)
      setDeleteReason('')
      
      alert(`✅ "${deleteItemInfo.productName}" eliminado de la orden. El comprador ha sido notificado.`)
    } catch (error) {
      console.error('Error deleting product:', error)
      alert(error instanceof Error ? error.message : 'Error al eliminar el producto')
    } finally {
      setDeletingItem(null)
    }
  }

  const issuesCount = Array.from(productIssues.values()).filter(i => i.issueType !== null && i.issueType !== 'ACCEPTED').length
  const allProductsOk = issuesCount === 0 && acceptedItems.size === orderItems.length
  const someProductsReviewed = acceptedItems.size > 0 || issuesCount > 0
  const pendingReview = orderItems.length - acceptedItems.size - productIssues.size

  // Confirmar orden (Lock) - Todo está disponible
  const handleLockOrder = async () => {
    if (!singleOrder) return

    try {
      setLoading(true)
      
      // Llamar al API de lock
      const response = await fetch(`/api/orders/${singleOrder.id}/lock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: confirmNotes || 'Orden confirmada - todos los productos disponibles' })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al confirmar orden')
      }

      alert(`✅ Orden #${singleOrder.orderNumber} confirmada y notificación enviada al cliente`)
      onClose()
    } catch (error) {
      console.error('Error locking order:', error)
      alert(error instanceof Error ? error.message : 'Error al confirmar la orden')
    } finally {
      setLoading(false)
    }
  }

  // Reportar problemas de stock y notificar al comprador por TODOS los canales
  const handleReportIssues = async () => {
    if (!singleOrder || issuesCount === 0) return

    try {
      setLoading(true)
      // Filtrar solo issues reales (no ACCEPTED ni null)
      const issues = Array.from(productIssues.values())
        .filter(i => i.issueType === 'OUT_OF_STOCK' || i.issueType === 'PARTIAL_STOCK')
        .map(i => ({
          ...i,
          issueType: i.issueType as ReportableIssueType
        }))
      
      // Usar el nuevo endpoint que envía notificaciones multicanal
      const response = await fetch(`/api/orders/${singleOrder.id}/report-stock-issues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issues })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al reportar problemas')
      }

      const result = await response.json()
      
      // Cerrar modal
      onClose()
      
      // Redirigir al chat automáticamente para que el vendedor vea el mensaje enviado
      router.push(`/chat?clientId=${singleOrder.clientId}&orderId=${singleOrder.id}`)
      
    } catch (error) {
      console.error('Error reporting stock issues:', error)
      alert(error instanceof Error ? error.message : 'Error al reportar los problemas de stock')
    } finally {
      setLoading(false)
    }
  }

  // Verificar si estamos en el cliente para el portal
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  const modalContent = (
    <div 
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 9999999 }}
    >
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto relative">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-green-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              📦 Revisar Pedido
            </h2>
            {singleOrder && (
              <div className="mt-1">
                <p className="text-sm font-medium text-gray-700">
                  Orden #{singleOrder.orderNumber}
                </p>
                <p className="text-sm text-gray-500">
                  Cliente: {singleOrder.client?.name || 'Cliente'}
                </p>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          {/* Instrucciones */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-blue-800 mb-2">📋 Instrucciones</h3>
            <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
              <li>Revisa la lista de productos solicitados</li>
              <li>Si <strong>todos están disponibles</strong> → Haz clic en "Confirmar Pedido"</li>
              <li>Si <strong>falta algún producto</strong> → Márcalo y notifica al comprador</li>
            </ol>
          </div>

          {/* Lista de productos */}
          {hasProducts ? (
            <div className="border rounded-lg overflow-hidden mb-6">
              <div className="bg-gray-100 px-4 py-3 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedItems.size === orderItems.length && orderItems.length > 0}
                        onChange={toggleAllSelection}
                        className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Seleccionar todos</span>
                    </label>
                    <h4 className="font-medium text-sm">
                      📋 Productos ({orderItems.length})
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedItems.size > 0 && (
                      <button
                        onClick={acceptAllSelected}
                        className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-medium hover:bg-green-200 transition-all flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" />
                        Aceptar seleccionados ({selectedItems.size})
                      </button>
                    )}
                    <span className="text-sm text-gray-500">
                      Total: {formatPrice(singleOrder?.totalAmount || 0)}
                    </span>
                  </div>
                </div>
                {/* Resumen de estados */}
                <div className="mt-2 flex items-center gap-4 text-xs">
                  <span className="text-green-600">✅ Aceptados: {acceptedItems.size}</span>
                  <span className="text-red-600">❌ Sin stock: {Array.from(productIssues.values()).filter(i => i.issueType === 'OUT_OF_STOCK').length}</span>
                  <span className="text-yellow-600">⚠️ Parciales: {Array.from(productIssues.values()).filter(i => i.issueType === 'PARTIAL_STOCK').length}</span>
                  <span className="text-gray-500">⏳ Pendientes: {orderItems.length - acceptedItems.size - productIssues.size}</span>
                </div>
              </div>
              
              <div className="divide-y max-h-[300px] overflow-y-auto">
                {orderItems.map((item) => {
                  const issue = productIssues.get(item.id)
                  const isOutOfStock = issue?.issueType === 'OUT_OF_STOCK'
                  const isPartialStock = issue?.issueType === 'PARTIAL_STOCK'
                  const isAccepted = acceptedItems.has(item.id)
                  const isSelected = selectedItems.has(item.id)
                  const hasIssue = isOutOfStock || isPartialStock

                  return (
                    <div 
                      key={item.id}
                      className={`p-4 transition-colors ${
                        isAccepted ? 'bg-green-50' :
                        hasIssue ? 'bg-red-50' : 
                        isSelected ? 'bg-purple-50' :
                        'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        {/* Checkbox de selección */}
                        <div className="flex items-center pt-1">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleItemSelection(item.id)}
                            className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                          />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {isAccepted && <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />}
                            {isOutOfStock && <X className="w-4 h-4 text-red-500 flex-shrink-0" />}
                            {isPartialStock && <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" />}
                            {!isAccepted && !hasIssue && <Package className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                            <p className="font-medium text-gray-900 truncate">{item.productName}</p>
                            {isAccepted && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Aceptado</span>}
                          </div>
                          <p className="text-sm text-gray-500 ml-6">
                            Cantidad: {item.quantity} {item.product?.unit || 'unid.'} • {formatPrice(item.subtotal)}
                          </p>
                        </div>

                        <div className="flex gap-1 shrink-0 flex-wrap justify-end">
                          {/* Botón Aceptado */}
                          <button
                            type="button"
                            onClick={() => toggleProductIssue(item, 'ACCEPTED')}
                            className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                              isAccepted
                                ? 'bg-green-600 text-white ring-2 ring-green-300'
                                : 'bg-gray-100 text-gray-700 hover:bg-green-100 hover:text-green-700'
                            }`}
                          >
                            {isAccepted && <Check className="w-3 h-3" />}
                            ✅ OK
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => toggleProductIssue(item, 'OUT_OF_STOCK')}
                            className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                              isOutOfStock
                                ? 'bg-red-600 text-white ring-2 ring-red-300'
                                : 'bg-gray-100 text-gray-700 hover:bg-red-100 hover:text-red-700'
                            }`}
                          >
                            {isOutOfStock && <Check className="w-3 h-3" />}
                            ❌ No hay
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleProductIssue(item, 'PARTIAL_STOCK')}
                            className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                              isPartialStock
                                ? 'bg-yellow-500 text-white ring-2 ring-yellow-300'
                                : 'bg-gray-100 text-gray-700 hover:bg-yellow-100 hover:text-yellow-700'
                            }`}
                          >
                            {isPartialStock && <Check className="w-3 h-3" />}
                            ⚠️ Parcial
                          </button>

                          <button
                            type="button"
                            onClick={() => openDeleteModal(item)}
                            disabled={deletingItem === item.id || deletedItems.has(item.id)}
                            className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                              deletedItems.has(item.id)
                                ? 'bg-gray-400 text-white cursor-not-allowed'
                                : deletingItem === item.id
                                ? 'bg-gray-300 text-gray-500 cursor-wait'
                                : 'bg-gray-100 text-gray-700 hover:bg-red-100 hover:text-red-700'
                            }`}
                          >
                            <Trash2 className="w-3 h-3" />
                            {deletedItems.has(item.id) ? 'Eliminado' : 'Eliminar'}
                          </button>
                        </div>
                      </div>

                      {isPartialStock && (
                        <div className="mt-3 flex items-center gap-3 ml-6 pl-4 border-l-2 border-yellow-400">
                          <label className="text-sm text-gray-600">Disponible:</label>
                          <input
                            type="number"
                            min="0"
                            max={item.quantity - 1}
                            value={issue?.availableQty || 0}
                            onChange={(e) => updateAvailableQty(item.id, parseInt(e.target.value) || 0)}
                            className="w-20 px-2 py-1 border rounded text-sm"
                          />
                          <span className="text-xs text-gray-500">de {item.quantity} solicitados</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>No se encontraron productos en esta orden</p>
            </div>
          )}

          {/* Resumen de problemas */}
          {issuesCount > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <h5 className="font-medium text-amber-800 mb-2">
                ⚠️ Productos con problemas ({issuesCount})
              </h5>
              <ul className="text-sm text-amber-700 space-y-1 mb-4">
                {Array.from(productIssues.values())
                  .filter(i => i.issueType)
                  .map((issue, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <span>{issue.issueType === 'OUT_OF_STOCK' ? '❌' : '⚠️'}</span>
                      <span className="font-medium">{issue.productName}</span>
                      <span className="text-amber-600">
                        {issue.issueType === 'OUT_OF_STOCK' 
                          ? '(Sin stock)'
                          : `(Solo ${issue.availableQty} de ${issue.requestedQty})`}
                      </span>
                    </li>
                  ))}
              </ul>

              {/* Opciones para comunicarse con el comprador */}
              <div className="bg-white rounded-lg p-3 border border-amber-200">
                <p className="text-sm text-gray-700 mb-2 font-medium">
                  💬 Comunícate con el comprador para resolver:
                </p>
                <div className="flex flex-wrap gap-2">
                  {singleOrder && (
                    <>
                      <Link 
                        href={`/chat?clientId=${singleOrder.clientId}&orderId=${singleOrder.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200 transition-colors font-medium"
                      >
                        <MessageSquare className="w-4 h-4" />
                        Abrir Chat
                      </Link>
                      {singleOrder.client?.phone && (
                        <a 
                          href={`https://wa.me/${singleOrder.client.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${singleOrder.client.name}, te escribo sobre tu pedido #${singleOrder.orderNumber}`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200 transition-colors font-medium"
                        >
                          <WhatsAppIcon className="w-4 h-4" />
                          WhatsApp
                        </a>
                      )}
                      {singleOrder.client?.email && (
                        <a 
                          href={`mailto:${singleOrder.client.email}?subject=Pedido ${singleOrder.orderNumber} - Productos no disponibles`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm hover:bg-purple-200 transition-colors font-medium"
                        >
                          <Mail className="w-4 h-4" />
                          Email
                        </a>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Notas de confirmación */}
          {allProductsOk && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notas de confirmación (opcional)
              </label>
              <textarea
                value={confirmNotes}
                onChange={(e) => setConfirmNotes(e.target.value)}
                placeholder="Ej: Pedido preparado, se entregará mañana a las 10am"
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
              />
            </div>
          )}

          {/* Aviso de productos pendientes */}
          {pendingReview > 0 && !allProductsOk && (
            <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                ⏳ Tienes <strong>{pendingReview}</strong> producto(s) sin revisar. 
                Marca cada uno como "OK", "No hay" o "Parcial".
              </p>
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex gap-3 pt-4 border-t">
            <Button 
              type="button" 
              onClick={onClose} 
              variant="outline" 
              className="flex-1" 
              disabled={loading}
            >
              Cancelar
            </Button>
            
            {allProductsOk ? (
              /* Todos los productos aceptados - Confirmar orden */
              <Button
                onClick={handleLockOrder}
                className="flex-1 bg-green-600 hover:bg-green-700"
                disabled={loading || !hasProducts}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Confirmando...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    ✓ Confirmar Pedido
                  </>
                )}
              </Button>
            ) : issuesCount > 0 ? (
              /* Hay productos faltantes - Notificar al comprador */
              <Button
                onClick={handleReportIssues}
                className="flex-1 bg-amber-600 hover:bg-amber-700"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando notificación...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    📱 Notificar Faltantes ({issuesCount})
                  </>
                )}
              </Button>
            ) : (
              /* Productos pendientes de revisar */
              <Button
                disabled={true}
                className="flex-1 bg-gray-400 cursor-not-allowed"
              >
                <Package className="w-4 h-4 mr-2" />
                Revisa todos los productos
              </Button>
            )}
          </div>

          {/* Información adicional */}
          <div className="mt-4 text-xs text-gray-500 text-center">
            {allProductsOk ? (
              <p>✅ Al confirmar, el cliente recibirá notificación por Email y WhatsApp</p>
            ) : (
              <p>📲 Se enviará automáticamente por: <strong>WhatsApp, Email</strong> y notificación en la App</p>
            )}
          </div>
        </div>
      </div>

      {/* Modal de eliminación con motivo */}
      {showDeleteModal && deleteItemInfo && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Eliminar Producto</h3>
                <p className="text-sm text-gray-500">{deleteItemInfo.productName}</p>
              </div>
            </div>

            <p className="text-gray-600 mb-4">
              Por favor, escribe el motivo de la eliminación. El comprador será notificado.
            </p>

            <textarea
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="Ej: Producto agotado temporalmente, Precio incorrecto..."
              className="w-full border rounded-lg p-3 text-sm min-h-[100px] resize-none focus:ring-2 focus:ring-red-200 focus:border-red-400"
              autoFocus
            />

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setDeleteItemInfo(null)
                  setDeleteReason('')
                }}
                className="flex-1 px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={!deleteReason.trim() || deletingItem !== null}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {deletingItem ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Eliminando...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Eliminar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  // Usar portal para renderizar encima de todo
  if (!mounted) return null
  
  return createPortal(modalContent, document.body)
}
