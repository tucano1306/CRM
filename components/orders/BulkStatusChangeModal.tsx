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
  Trash2,
  Plus,
  Search,
  ShoppingBag
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
  confirmed?: boolean
  issueNote?: string | null
  availableQty?: number | null
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
  
  // Estado para agregar productos
  const [showAddProductModal, setShowAddProductModal] = useState(false)
  const [sellerProducts, setSellerProducts] = useState<any[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [addQuantity, setAddQuantity] = useState(1)
  const [addNote, setAddNote] = useState('')
  const [addingProduct, setAddingProduct] = useState(false)
  const [addedProducts, setAddedProducts] = useState<Set<string>>(new Set())
  
  // Estado para mostrar/ocultar productos ya confirmados
  const [showConfirmedProducts, setShowConfirmedProducts] = useState(false)
  
  // Estado para guardar confirmaciones pendientes
  const [savingConfirmation, setSavingConfirmation] = useState<string | null>(null)

  // Cargar items ya confirmados de la BD al abrir
  useEffect(() => {
    const order = selectedOrdersData.length === 1 ? selectedOrdersData[0] : null
    if (isOpen && order) {
      // Inicializar acceptedItems con los items que ya tienen confirmed=true
      const confirmedItems = new Set<string>()
      order.orderItems.forEach(item => {
        if (item.confirmed) {
          confirmedItems.add(item.id)
        }
      })
      setAcceptedItems(confirmedItems)
      
      // Inicializar issues de items que tienen issueNote
      const initialIssues = new Map<string, ProductIssue>()
      order.orderItems.forEach(item => {
        if (item.issueNote && item.availableQty !== null && item.availableQty !== undefined) {
          const issueType: StockIssueType = item.availableQty === 0 ? 'OUT_OF_STOCK' : 'PARTIAL_STOCK'
          initialIssues.set(item.id, {
            productId: item.productId || item.id,
            productName: item.productName,
            issueType,
            requestedQty: item.quantity,
            availableQty: item.availableQty
          })
        }
      })
      setProductIssues(initialIssues)
    }
  }, [isOpen, selectedOrdersData])

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
      setShowAddProductModal(false)
      setSellerProducts([])
      setProductSearch('')
      setSelectedProduct(null)
      setAddQuantity(1)
      setAddNote('')
      setAddedProducts(new Set())
    }
  }, [isOpen])

  if (!isOpen) return null

  // Obtener la orden seleccionada
  const singleOrder = selectedOrdersData.length === 1 ? selectedOrdersData[0] : null
  const orderItems = singleOrder?.orderItems || []
  const hasProducts = orderItems.length > 0

  // Guardar confirmación de un item en la BD
  const saveItemConfirmation = async (itemId: string, confirmed: boolean) => {
    if (!singleOrder) return
    
    setSavingConfirmation(itemId)
    try {
      const response = await fetch(`/api/orders/${singleOrder.id}/items/${itemId}/confirm`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmed })
      })
      
      if (!response.ok) {
        console.error('Error guardando confirmación')
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setSavingConfirmation(null)
    }
  }

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
        // Guardar en BD: quitar confirmación
        saveItemConfirmation(key, false)
      } else {
        // Marcar como aceptado y quitar cualquier issue
        const newAccepted = new Set(acceptedItems)
        newAccepted.add(key)
        setAcceptedItems(newAccepted)
        newMap.delete(key)
        setProductIssues(newMap)
        // Guardar en BD: confirmar item
        saveItemConfirmation(key, true)
      }
      return
    }
    
    // Si se marca un issue, quitar de aceptados
    const newAccepted = new Set(acceptedItems)
    newAccepted.delete(key)
    setAcceptedItems(newAccepted)
    // Si tenía confirmación, quitarla
    if (acceptedItems.has(key)) {
      saveItemConfirmation(key, false)
    }
    
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
    // Filtrar items visibles (no confirmados previamente de BD, a menos que showConfirmedProducts=true)
    const visibleItems = orderItems.filter(item => 
      showConfirmedProducts || !item.confirmed || acceptedItems.has(item.id) || productIssues.has(item.id)
    )
    if (selectedItems.size === visibleItems.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(visibleItems.map(item => item.id)))
    }
  }

  // Marcar todos los seleccionados como aceptados
  const acceptAllSelected = async () => {
    if (selectedItems.size === 0) {
      alert('Selecciona al menos un producto')
      return
    }
    
    const newAccepted = new Set(acceptedItems)
    const newIssues = new Map(productIssues)
    const itemsToConfirm: string[] = []
    
    selectedItems.forEach(itemId => {
      newAccepted.add(itemId)
      newIssues.delete(itemId) // Quitar cualquier issue previo
      itemsToConfirm.push(itemId)
    })
    
    setAcceptedItems(newAccepted)
    setProductIssues(newIssues)
    setSelectedItems(new Set()) // Limpiar selección
    
    // Guardar en BD en lote
    if (singleOrder && itemsToConfirm.length > 0) {
      try {
        const response = await fetch(`/api/orders/${singleOrder.id}/items/bulk/confirm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemIds: itemsToConfirm, confirmed: true })
        })
        if (!response.ok) {
          console.error('Error guardando confirmaciones en lote')
        }
      } catch (error) {
        console.error('Error:', error)
      }
    }
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

  // Abrir modal para agregar producto
  const openAddProductModal = async () => {
    if (!singleOrder) return
    
    setShowAddProductModal(true)
    setLoadingProducts(true)
    
    try {
      // Intentar obtener productos activos
      const response = await fetch('/api/products?active=true&limit=100')
      
      if (response.ok) {
        const data = await response.json()
        // La API puede devolver { products: [...] } o { data: [...] } o directamente [...]
        const products = data.products || data.data || (Array.isArray(data) ? data : [])
        setSellerProducts(products.filter((p: any) => p.isActive !== false))
      } else {
        console.error('Error fetching products:', response.status)
        setSellerProducts([])
      }
    } catch (error) {
      console.error('Error loading products:', error)
      setSellerProducts([])
    } finally {
      setLoadingProducts(false)
    }
  }

  // Agregar producto a la orden
  const handleAddProduct = async () => {
    if (!singleOrder || !selectedProduct || addQuantity <= 0) {
      alert('Selecciona un producto y cantidad válida')
      return
    }

    try {
      setAddingProduct(true)
      
      const response = await fetch(`/api/orders/${singleOrder.id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProduct.id,
          quantity: addQuantity,
          note: addNote || undefined
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al agregar producto')
      }

      const result = await response.json()
      
      // Marcar como agregado
      setAddedProducts(prev => new Set([...prev, selectedProduct.id]))
      
      // Limpiar selección
      setSelectedProduct(null)
      setAddQuantity(1)
      setAddNote('')
      
      alert(`✅ ${result.message}. El comprador ha sido notificado.`)
      
    } catch (error) {
      console.error('Error adding product:', error)
      alert(error instanceof Error ? error.message : 'Error al agregar el producto')
    } finally {
      setAddingProduct(false)
    }
  }

  // Filtrar productos por búsqueda
  const filteredProducts = sellerProducts.filter(product => 
    product.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
    product.sku?.toLowerCase().includes(productSearch.toLowerCase())
  )

  const issuesCount = Array.from(productIssues.values()).filter(i => i.issueType !== null && i.issueType !== 'ACCEPTED').length
  const allProductsOk = issuesCount === 0 && acceptedItems.size === orderItems.length
  const someProductsReviewed = acceptedItems.size > 0 || issuesCount > 0
  const pendingReview = orderItems.length - acceptedItems.size - productIssues.size
  
  // Contar productos que ya estaban confirmados en la BD (no en esta sesión)
  const confirmedInDbCount = orderItems.filter(item => 
    item.confirmed && !acceptedItems.has(item.id) && !productIssues.has(item.id)
  ).length
  
  // Filtrar items: mostrar solo los que no están confirmados en BD, a menos que showConfirmedProducts=true
  // o que tengan un issue reportado, o que fueron aceptados en esta sesión
  const filteredOrderItems = orderItems.filter(item => {
    // Si showConfirmedProducts está activo, mostrar todos
    if (showConfirmedProducts) return true
    
    // Si tiene un issue, siempre mostrar
    if (productIssues.has(item.id)) return true
    
    // Si fue aceptado en esta sesión, mostrar
    if (acceptedItems.has(item.id)) return true
    
    // Si NO estaba confirmado previamente en la BD, mostrar
    if (!item.confirmed) return true
    
    // Si estaba confirmado en BD pero no está en acceptedItems (fue cargado del BD), ocultar
    return false
  })

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
      className="fixed inset-0 flex items-center justify-center p-2 sm:p-4"
      style={{ zIndex: 9999999 }}
    >
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal - Más grande y legible */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden relative flex flex-col">
        {/* Header - Compacto */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xl">📦</span>
            {singleOrder && (
              <div className="min-w-0">
                <p className="text-sm font-bold">#{singleOrder.orderNumber}</p>
                <p className="text-xs text-blue-200 truncate">{singleOrder.client?.name || 'Cliente'}</p>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
          >
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Instrucciones - Más grandes */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4 sm:p-5 mb-6">
            <h3 className="font-bold text-blue-800 mb-3 text-base sm:text-lg flex items-center gap-2">
              📋 ¿Qué debes hacer?
            </h3>
            <ol className="text-sm sm:text-base text-blue-700 space-y-2">
              <li className="flex items-start gap-2">
                <span className="font-bold bg-blue-200 px-2 py-0.5 rounded text-xs">1</span>
                <span>Revisa cada producto de la lista</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold bg-blue-200 px-2 py-0.5 rounded text-xs">2</span>
                <span><strong>Disponible</strong> → Marca "✅ OK"</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold bg-blue-200 px-2 py-0.5 rounded text-xs">3</span>
                <span><strong>Sin stock</strong> → Marca "❌ No hay" y notifica</span>
              </li>
            </ol>
          </div>

          {/* Lista de productos - Más grande y legible */}
          {hasProducts ? (
            <div className="border-2 border-gray-200 rounded-xl overflow-hidden mb-6">
              {/* Header de productos */}
              <div className="bg-gray-50 px-4 sm:px-6 py-4 border-b-2 border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedItems.size === filteredOrderItems.length && filteredOrderItems.length > 0}
                        onChange={toggleAllSelection}
                        className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-sm sm:text-base font-medium text-gray-700">Todos</span>
                    </label>
                    <h4 className="font-bold text-base sm:text-lg text-gray-800">
                      📋 {filteredOrderItems.length} de {orderItems.length} Productos
                    </h4>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedItems.size > 0 && (
                      <button
                        onClick={acceptAllSelected}
                        className="px-3 sm:px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-bold hover:bg-green-600 transition-all flex items-center gap-1.5 shadow-sm"
                      >
                        <Check className="w-4 h-4" />
                        Aceptar ({selectedItems.size})
                      </button>
                    )}
                    <button
                      onClick={openAddProductModal}
                      className="px-3 sm:px-4 py-2 bg-purple-500 text-white rounded-lg text-sm font-bold hover:bg-purple-600 transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Agregar
                    </button>
                    <span className="px-3 py-2 bg-gray-200 rounded-lg text-sm sm:text-base font-bold text-gray-700">
                      {formatPrice(singleOrder?.totalAmount || 0)}
                    </span>
                  </div>
                </div>
                
                {/* Toggle para mostrar productos ya confirmados */}
                {confirmedInDbCount > 0 && (
                  <div className="mt-3 flex items-center gap-2">
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={showConfirmedProducts}
                        onChange={() => setShowConfirmedProducts(!showConfirmedProducts)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-gray-600">
                        Mostrar {confirmedInDbCount} productos ya confirmados anteriormente
                      </span>
                    </label>
                  </div>
                )}
                
                {/* Resumen de estados - Más grande */}
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="bg-green-100 rounded-lg px-3 py-2 text-center">
                    <span className="text-lg sm:text-xl font-bold text-green-700">{acceptedItems.size}</span>
                    <p className="text-xs sm:text-sm text-green-600">✅ Aceptados</p>
                  </div>
                  <div className="bg-red-100 rounded-lg px-3 py-2 text-center">
                    <span className="text-lg sm:text-xl font-bold text-red-700">{Array.from(productIssues.values()).filter(i => i.issueType === 'OUT_OF_STOCK').length}</span>
                    <p className="text-xs sm:text-sm text-red-600">❌ Sin stock</p>
                  </div>
                  <div className="bg-yellow-100 rounded-lg px-3 py-2 text-center">
                    <span className="text-lg sm:text-xl font-bold text-yellow-700">{Array.from(productIssues.values()).filter(i => i.issueType === 'PARTIAL_STOCK').length}</span>
                    <p className="text-xs sm:text-sm text-yellow-600">⚠️ Parciales</p>
                  </div>
                  <div className="bg-gray-100 rounded-lg px-3 py-2 text-center">
                    <span className="text-lg sm:text-xl font-bold text-gray-700">{pendingReview}</span>
                    <p className="text-xs sm:text-sm text-gray-600">⏳ Pendientes</p>
                  </div>
                </div>
              </div>
              
              <div className="divide-y-2 divide-gray-100 max-h-[40vh] sm:max-h-[50vh] overflow-y-auto">
                {filteredOrderItems.map((item) => {
                  const issue = productIssues.get(item.id)
                  const isOutOfStock = issue?.issueType === 'OUT_OF_STOCK'
                  const isPartialStock = issue?.issueType === 'PARTIAL_STOCK'
                  const isAccepted = acceptedItems.has(item.id)
                  const isSelected = selectedItems.has(item.id)
                  const hasIssue = isOutOfStock || isPartialStock

                  return (
                    <div 
                      key={item.id}
                      className={`p-4 sm:p-5 transition-colors ${
                        isAccepted ? 'bg-green-50' :
                        hasIssue ? 'bg-red-50' : 
                        isSelected ? 'bg-purple-50' :
                        'hover:bg-gray-50'
                      }`}
                    >
                      {/* Fila principal del producto */}
                      <div className="flex items-start gap-3 sm:gap-4">
                        {/* Checkbox */}
                        <div className="pt-1">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleItemSelection(item.id)}
                            className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                          />
                        </div>
                        
                        {/* Info del producto */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {isAccepted && <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />}
                            {isOutOfStock && <X className="w-5 h-5 text-red-500 flex-shrink-0" />}
                            {isPartialStock && <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0" />}
                            {!isAccepted && !hasIssue && <Package className="w-5 h-5 text-gray-400 flex-shrink-0" />}
                            <p className="font-bold text-base sm:text-lg text-gray-900">{item.productName}</p>
                            {isAccepted && <span className="text-xs sm:text-sm bg-green-200 text-green-800 px-2 py-0.5 rounded-full font-semibold">✓ Aceptado</span>}
                          </div>
                          <div className="mt-1 flex items-center gap-3 text-sm sm:text-base text-gray-600">
                            <span className="font-semibold bg-gray-100 px-2 py-0.5 rounded">
                              {item.quantity} {item.product?.unit || 'unid.'}
                            </span>
                            <span className="font-bold text-gray-800">{formatPrice(item.subtotal)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Botones de acción - En fila separada para móviles */}
                      <div className="mt-3 sm:mt-4 flex flex-wrap gap-2 ml-8 sm:ml-9">
                        {/* Botón Aceptado */}
                        <button
                          type="button"
                          onClick={() => toggleProductIssue(item, 'ACCEPTED')}
                          className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-sm sm:text-base font-bold transition-all flex items-center gap-1.5 ${
                            isAccepted
                              ? 'bg-green-600 text-white shadow-lg ring-2 ring-green-300'
                              : 'bg-white border-2 border-gray-200 text-gray-700 hover:bg-green-50 hover:border-green-300 hover:text-green-700'
                          }`}
                        >
                          {isAccepted && <Check className="w-4 h-4" />}
                          ✅ OK
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => toggleProductIssue(item, 'OUT_OF_STOCK')}
                          className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-sm sm:text-base font-bold transition-all flex items-center gap-1.5 ${
                            isOutOfStock
                              ? 'bg-red-600 text-white shadow-lg ring-2 ring-red-300'
                              : 'bg-white border-2 border-gray-200 text-gray-700 hover:bg-red-50 hover:border-red-300 hover:text-red-700'
                          }`}
                        >
                          {isOutOfStock && <Check className="w-4 h-4" />}
                          ❌ No hay
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleProductIssue(item, 'PARTIAL_STOCK')}
                          className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-sm sm:text-base font-bold transition-all flex items-center gap-1.5 ${
                            isPartialStock
                              ? 'bg-yellow-500 text-white shadow-lg ring-2 ring-yellow-300'
                              : 'bg-white border-2 border-gray-200 text-gray-700 hover:bg-yellow-50 hover:border-yellow-300 hover:text-yellow-700'
                          }`}
                        >
                          {isPartialStock && <Check className="w-4 h-4" />}
                          ⚠️ Parcial
                        </button>

                        <button
                          type="button"
                          onClick={() => openDeleteModal(item)}
                          disabled={deletingItem === item.id || deletedItems.has(item.id)}
                          className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-sm sm:text-base font-bold transition-all flex items-center gap-1.5 ${
                            deletedItems.has(item.id)
                              ? 'bg-gray-400 text-white cursor-not-allowed'
                              : deletingItem === item.id
                              ? 'bg-gray-300 text-gray-500 cursor-wait'
                              : 'bg-white border-2 border-gray-200 text-gray-700 hover:bg-red-50 hover:border-red-300 hover:text-red-700'
                          }`}
                        >
                          <Trash2 className="w-4 h-4" />
                          {deletedItems.has(item.id) ? 'Eliminado' : 'Quitar'}
                        </button>
                      </div>

                      {/* Input de cantidad parcial */}
                      {isPartialStock && (
                        <div className="mt-4 flex items-center gap-3 ml-8 sm:ml-9 p-3 bg-yellow-100 rounded-lg border-2 border-yellow-300">
                          <label className="text-sm sm:text-base font-medium text-yellow-800">Disponibles:</label>
                          <input
                            type="number"
                            min="0"
                            max={item.quantity - 1}
                            value={issue?.availableQty || 0}
                            onChange={(e) => updateAvailableQty(item.id, parseInt(e.target.value) || 0)}
                            className="w-24 px-3 py-2 border-2 border-yellow-400 rounded-lg text-base font-bold text-center focus:ring-2 focus:ring-yellow-500"
                          />
                          <span className="text-sm sm:text-base text-yellow-700">de {item.quantity}</span>
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

      {/* Modal de agregar producto */}
      {showAddProductModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-full">
                  <Plus className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Agregar Producto</h3>
                  <p className="text-sm text-gray-500">Orden #{singleOrder?.orderNumber}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddProductModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Buscador */}
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar producto..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-200 focus:border-purple-400"
                />
              </div>
            </div>

            {/* Lista de productos */}
            <div className="flex-1 overflow-y-auto p-4">
              {loadingProducts ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No se encontraron productos</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredProducts.slice(0, 20).map((product: any) => {
                    const isSelected = selectedProduct?.id === product.id
                    const wasAdded = addedProducts.has(product.id)
                    
                    return (
                      <button
                        key={product.id}
                        onClick={() => setSelectedProduct(product)}
                        disabled={wasAdded}
                        className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                          wasAdded 
                            ? 'border-green-300 bg-green-50 cursor-not-allowed'
                            : isSelected 
                            ? 'border-purple-400 bg-purple-50' 
                            : 'border-gray-200 hover:border-purple-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{product.name}</p>
                            <p className="text-sm text-gray-500">
                              {product.sku && `SKU: ${product.sku} • `}
                              {formatPrice(product.price)} / {product.unit || 'unid.'}
                            </p>
                          </div>
                          {wasAdded && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                              ✓ Agregado
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Formulario de cantidad */}
            {selectedProduct && (
              <div className="p-4 border-t bg-purple-50">
                <div className="flex items-center gap-4 mb-3">
                  <div className="flex-1">
                    <p className="font-medium text-purple-900">{selectedProduct.name}</p>
                    <p className="text-sm text-purple-600">{formatPrice(selectedProduct.price)} / {selectedProduct.unit || 'unid.'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">Cantidad:</label>
                    <input
                      type="number"
                      min="1"
                      value={addQuantity}
                      onChange={(e) => setAddQuantity(parseInt(e.target.value) || 1)}
                      className="w-20 px-2 py-1 border rounded text-center"
                    />
                  </div>
                </div>
                <input
                  type="text"
                  placeholder="Nota (opcional)"
                  value={addNote}
                  onChange={(e) => setAddNote(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm mb-3"
                />
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-purple-800">
                    Subtotal: {formatPrice(selectedProduct.price * addQuantity)}
                  </span>
                  <button
                    onClick={handleAddProduct}
                    disabled={addingProduct}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {addingProduct ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Agregando...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Agregar a la orden
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Botón cerrar */}
            {!selectedProduct && (
              <div className="p-4 border-t">
                <button
                  onClick={() => setShowAddProductModal(false)}
                  className="w-full px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cerrar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )

  // Usar portal para renderizar encima de todo
  if (!mounted) return null
  
  return createPortal(modalContent, document.body)
}
