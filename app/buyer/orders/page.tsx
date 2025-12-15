'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { v4 as uuidv4 } from 'uuid'
import { apiCall, getErrorMessage } from '@/lib/api-client'
import { useRealtimeSubscription, RealtimeEvents } from '@/lib/supabase-realtime'
import { formatPrice } from '@/lib/utils'
import { openInvoiceInNewTab, type InvoiceData } from '@/lib/invoiceGenerator'
import {
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Loader,
  ShoppingBag,
  DollarSign,
  Loader2,
  AlertCircle,
  AlertTriangle,
  Truck,
  PackageCheck,
  X,
  Search,
  Grid3x3,
  List,
  FileText,
  RotateCcw,
  MapPin,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  BarChart3,
  RefreshCw,
  Plus,
  Minus,
  Trash2,
  RefreshCcw,
  Check,
} from 'lucide-react'
import OrderCountdown from '@/components/buyer/OrderCountdown'
import { OrderCardSkeleton } from '@/components/skeletons'

type OrderStatus = 
  | 'PENDING' 
  | 'REVIEWING'
  | 'ISSUE_REPORTED'
  | 'LOCKED'
  | 'CONFIRMED' 
  | 'PREPARING'
  | 'PROCESSING'
  | 'READY_FOR_PICKUP'
  | 'IN_DELIVERY'
  | 'DELIVERED'
  | 'PARTIALLY_DELIVERED'
  | 'COMPLETED' 
  | 'CANCELED'
  | 'CANCELLED'
  | 'PAYMENT_PENDING'
  | 'PAID'

type OrderItem = {
  id: string
  productName: string
  quantity: number
  pricePerUnit: number
  subtotal: number
  productId: string
  itemNote?: string | null
  // Campos de eliminación/sustitución
  isDeleted?: boolean
  deletedReason?: string | null
  deletedAt?: string | null
  substitutedWith?: string | null
  substituteName?: string | null
  product: {
    sku?: string | null
    unit: string
  }
}

type OrderHistoryItem = {
  id: string
  type: 'STATUS_CHANGE' | 'PRODUCT_DELETED' | 'PRODUCT_ADDED' | 'ORDER_CREATED'
  previousStatus: string | null
  newStatus: string | null
  changedBy: string
  changedByName: string
  changedByRole: string
  notes: string | null
  createdAt: string
  description: string
}

type Order = {
  id: string
  orderNumber: string
  status: OrderStatus
  totalAmount: number
  notes: string | null
  deliveryInstructions: string | null
  createdAt: string
  confirmationDeadline?: string
  hasIssues?: boolean
  orderItems: OrderItem[]
  client: {
    name: string
    email: string
    phone: string
    address: string
  }
  seller: {
    name: string
    email: string
    id?: string
    phone?: string | null
  }
  rating?: number | null
  ratingComment?: string | null
  issues?: Array<{
    id: string
    productName: string
    issueType: string
    requestedQty: number
    availableQty: number
    status: string
  }>
  creditNoteUsages?: Array<{  // ← Agregar créditos usados
    id: string
    amountUsed: number
    creditNote: {
      id: string
      creditNoteNumber: string
      amount: number
      balance: number
    }
  }>
}

const statusConfig = {
  PENDING: {
    label: 'Pendiente',
    description: 'Esperando confirmación del vendedor',
    icon: Clock,
    color: 'text-yellow-600',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
  },
  REVIEWING: {
    label: 'En Revisión',
    description: 'El vendedor está revisando tu pedido',
    icon: Package,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
  ISSUE_REPORTED: {
    label: '⚠️ Atención Requerida',
    description: 'Hay productos con problemas de stock',
    icon: AlertTriangle,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
  LOCKED: {
    label: 'Bloqueada',
    description: 'Orden bloqueada para procesamiento',
    icon: Package,
    color: 'text-gray-600',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
  },
  CONFIRMED: {
    label: 'Confirmada',
    description: 'El vendedor confirmó tu orden',
    icon: CheckCircle,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
  PREPARING: {
    label: 'Preparando',
    description: 'Tu pedido está siendo preparado',
    icon: Package,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
  },
  READY_FOR_PICKUP: {
    label: 'Listo para Recoger',
    description: 'Tu pedido está listo',
    icon: ShoppingBag,
    color: 'text-cyan-600',
    bg: 'bg-cyan-50',
    border: 'border-cyan-200',
  },
  IN_DELIVERY: {
    label: 'En Entrega',
    description: 'Tu pedido está en camino',
    icon: Truck,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
  },
  DELIVERED: {
    label: 'Recibida',
    description: 'Confirmaste que recibiste tu pedido',
    icon: PackageCheck,
    color: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-200',
  },
  PARTIALLY_DELIVERED: {
    label: 'Entrega Parcial',
    description: 'Algunos productos fueron entregados',
    icon: AlertCircle,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
  },
  COMPLETED: {
    label: 'Completada',
    description: 'Orden finalizada exitosamente',
    icon: CheckCircle,
    color: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-200',
  },
  CANCELED: {
    label: 'Cancelada',
    description: 'La orden fue cancelada',
    icon: XCircle,
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
  },
  PAYMENT_PENDING: {
    label: 'Pago Pendiente',
    description: 'Esperando confirmación de pago',
    icon: DollarSign,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
  PAID: {
    label: 'Pagado',
    description: 'Pago confirmado',
    icon: DollarSign,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
  },
  // Mantener compatibilidad con estados legacy
  PROCESSING: {
    label: 'En Proceso',
    description: 'Tu orden está siendo procesada',
    icon: Loader,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
  CANCELLED: {
    label: 'Cancelada',
    description: 'La orden fue cancelada',
    icon: XCircle,
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
  },
}

// Componente que usa useSearchParams - necesita Suspense
function OrdersPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderIdFromUrl = searchParams.get('orderId') || searchParams.get('id')
  
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [timedOut, setTimedOut] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 🔥 TIEMPO REAL: Escuchar actualizaciones de órdenes
  useRealtimeSubscription(
    'buyer-orders',
    RealtimeEvents.ORDER_UPDATED,
    (payload) => {
      console.log('🔥 [BUYER] Actualización de orden recibida:', payload)
      
      // Actualizar la orden en el estado local
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === payload.orderId 
            ? { ...order, ...payload.order }
            : order
        )
      )
      
      // También actualizar si está seleccionada en el modal
      setSelectedOrder(prev => 
        prev?.id === payload.orderId 
          ? { ...prev, ...payload.order }
          : prev
      )
      
      // Refrescar para asegurar consistencia
      fetchOrders()
    }
  )

  // 🔥 TIEMPO REAL: Escuchar cuando el vendedor agrega un producto
  useRealtimeSubscription(
    'buyer-orders',
    RealtimeEvents.ORDER_ITEM_ADDED,
    (payload) => {
      console.log('🔥 [BUYER] Producto agregado a orden:', payload)
      
      // Mostrar notificación toast
      setToastMessage(`📦 ${payload.sellerName} agregó "${payload.productName}" a tu orden #${payload.orderNumber}`)
      setToastStatus('success')
      setShowToast(true)
      
      // Refrescar órdenes para obtener los datos actualizados
      fetchOrders()
      
      // Si el modal está abierto con esta orden, actualizarla
      if (selectedOrder?.id === payload.orderId) {
        fetchOrders().then(() => {
          // Volver a cargar la orden seleccionada después de actualizar
        })
      }
    }
  )

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [filterStatus, setFilterStatus] = useState<'ALL' | OrderStatus>('ALL')
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'productos' | 'estado' | 'seguimiento'>('productos')
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastStatus, setToastStatus] = useState('')
  
  // Estados para acciones del comprador sobre productos con issues
  const [removingItem, setRemovingItem] = useState<string | null>(null)
  
  // Estado para el historial de la orden
  const [orderHistory, setOrderHistory] = useState<OrderHistoryItem[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  
  // Modal de eliminación con motivo
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteItemInfo, setDeleteItemInfo] = useState<{itemId: string, productName: string} | null>(null)
  const [deleteReason, setDeleteReason] = useState('')
  
  // Modal de sustitución de producto
  const [showSubstituteSelector, setShowSubstituteSelector] = useState(false)
  const [substituteItemInfo, setSubstituteItemInfo] = useState<{itemId: string, productName: string, productId: string, originalQty?: number} | null>(null)
  const [catalogProducts, setCatalogProducts] = useState<any[]>([])
  const [loadingCatalog, setLoadingCatalog] = useState(false)
  const [catalogSearch, setCatalogSearch] = useState('')
  const [selectedSubstituteProduct, setSelectedSubstituteProduct] = useState<any | null>(null)
  const [substituteQuantity, setSubstituteQuantity] = useState(1)
  
  // Modal de opciones de contacto
  const [showContactModal, setShowContactModal] = useState(false)
  const [contactOrderInfo, setContactOrderInfo] = useState<Order | null>(null)
  
  // Modal de reordenar con selección de productos
  const [showReorderModal, setShowReorderModal] = useState(false)
  const [reorderOrder, setReorderOrder] = useState<Order | null>(null)
  const [selectedReorderItems, setSelectedReorderItems] = useState<Set<string>>(new Set())
  const [reordering, setReordering] = useState(false)
  
  // Paginación y filtro por fecha
  const [currentPage, setCurrentPage] = useState(1)
  const [dateRange, setDateRange] = useState<'7days' | '30days' | '90days' | 'all'>('30days')
  const ordersPerPage = 10

  useEffect(() => {
    fetchOrders()
  }, [])

  // Abrir orden automáticamente si viene en la URL
  useEffect(() => {
    if (orderIdFromUrl && orders.length > 0 && !selectedOrder) {
      const orderToOpen = orders.find(o => o.id === orderIdFromUrl)
      if (orderToOpen) {
        openOrderModal(orderToOpen)
        // Limpiar el parámetro de la URL sin recargar
        globalThis.history.replaceState({}, '', '/buyer/orders')
      }
    }
  }, [orderIdFromUrl, orders, selectedOrder])

  // Auto-hide toast after 5 seconds
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [showToast])

  // Resetear a página 1 cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1)
  }, [filterStatus, searchQuery, dateRange, sortBy])

  // Función para calcular porcentaje de progreso según el estado
  const getProgressPercentage = (status: OrderStatus): number => {
    const progressMap: Record<string, number> = {
      'PENDING': 0,
      'CONFIRMED': 25,
      'PREPARING': 50,
      'PROCESSING': 50,
      'READY_FOR_PICKUP': 65,
      'IN_DELIVERY': 75,
      'DELIVERED': 100,
      'COMPLETED': 100,
      'CANCELED': 0,
      'CANCELLED': 0,
    }
    return progressMap[status] || 0
  }

  // Calcular estadísticas financieras del mes actual
  const getMonthlyStats = () => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    const monthlyOrders = orders.filter(order => {
      const orderDate = new Date(order.createdAt)
      return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear
    })

    const totalSpent = monthlyOrders.reduce((sum, order) => sum + Number(order.totalAmount), 0)
    const totalOrders = monthlyOrders.length
    const averageOrder = totalOrders > 0 ? totalSpent / totalOrders : 0

    // Simulación de ahorros (podría calcularse desde descuentos reales)
    const estimatedSavings = totalSpent * 0.1

    return {
      totalOrders,
      totalSpent,
      estimatedSavings,
      averageOrder
    }
  }

  const _showUpdateToast = (status: string) => {
    setToastStatus(status)
    setToastMessage('¡Tu orden ha sido actualizada!')
    setShowToast(true)
  }

  // ✅ fetchOrders CON TIMEOUT
  const fetchOrders = async () => {
    try {
      setLoading(true)
      setTimedOut(false)
      setError(null)

      const result = await apiCall('/api/buyer/orders', {
        timeout: 5000,
        onTimeout: () => setTimedOut(true)
      })

      setLoading(false)

      if (result.success) {
        setOrders(result.data.orders)
      } else {
        setError(result.error || 'Error cargando órdenes')
      }
    } catch (err) {
      setLoading(false)
      setError(getErrorMessage(err))
    }
  }

  const prepareInvoiceData = (order: Order): InvoiceData => {
    const subtotal = order.orderItems.reduce((sum, item) => sum + Number(item.subtotal), 0)
    const taxRate = 0.1
    const taxAmount = subtotal * taxRate
    const totalBeforeCredits = subtotal + taxAmount
    
    // Calcular créditos aplicados
    const creditNotesUsed = order.creditNoteUsages?.map(usage => ({
      creditNoteId: usage.creditNote.id,
      creditNoteNumber: usage.creditNote.creditNoteNumber,
      amountUsed: Number(usage.amountUsed),
      originalAmount: Number(usage.creditNote.amount),
      remainingAmount: Number(usage.creditNote.balance)
    })) || []
    
    const totalCreditApplied = creditNotesUsed.reduce((sum, credit) => sum + credit.amountUsed, 0)
    
    const total = totalBeforeCredits - totalCreditApplied

    const invoiceDate = new Date(order.createdAt)
    const dueDate = new Date(invoiceDate)
    dueDate.setDate(dueDate.getDate() + 30)

    return {
      invoiceNumber: order.orderNumber,
      invoiceDate,
      dueDate,
      
      // Información del vendedor
      sellerName: order.seller?.name || 'Food Orders CRM',
      sellerAddress: '123 Main Street, Miami, FL 33139',
      sellerPhone: '(305) 555-0123',
      sellerEmail: order.seller?.email || 'ventas@foodorders.com',
      sellerTaxId: '12-3456789',
      
      // Información del comprador (yo como buyer)
      clientName: order.client?.name || 'Cliente',
      clientAddress: order.client?.address || '',
      clientPhone: order.client?.phone || '',
      clientEmail: order.client?.email || '',
      clientTaxId: '',
      
      items: order.orderItems.map(item => ({
        sku: item.product?.sku || '',
        name: item.productName,
        description: item.productName,
        quantity: item.quantity,
        unit: item.product?.unit || 'und',
        unitPrice: Number(item.pricePerUnit),
        pricePerUnit: Number(item.pricePerUnit),
        subtotal: Number(item.subtotal),
        total: Number(item.subtotal)
      })),
      
      subtotal,
      taxRate,
      taxAmount,
      totalBeforeCredits,
      creditNotesUsed: creditNotesUsed.length > 0 ? creditNotesUsed : undefined,
      totalCreditApplied: totalCreditApplied > 0 ? totalCreditApplied : undefined,
      total,
      
      paymentMethod: 'Transferencia Bancaria',
      paymentTerms: 'Pago a 30 días.',
      notes: order.notes || undefined,
      termsAndConditions: 'Productos sujetos a disponibilidad. Devoluciones dentro de 24 horas.'
    }
  }

  const handleViewInvoice = async (order: Order) => {
    try {
      const invoiceData = prepareInvoiceData(order)
      openInvoiceInNewTab(invoiceData)
    } catch (error) {
      console.error('Error generando factura:', error)
      alert('Error al generar la factura')
    }
  }

  // Función para cargar el historial de una orden
  const fetchOrderHistory = async (orderId: string) => {
    try {
      setLoadingHistory(true)
      const result = await apiCall(`/api/orders/${orderId}/history`, {
        timeout: 5000
      })
      if (result.success && result.data?.history) {
        setOrderHistory(result.data.history)
      } else {
        setOrderHistory([])
      }
    } catch (error) {
      console.error('Error cargando historial:', error)
      setOrderHistory([])
    } finally {
      setLoadingHistory(false)
    }
  }

  const openOrderModal = (order: Order) => {
    setSelectedOrder(order)
    setShowOrderModal(true)
    setActiveTab('productos')
    setOrderHistory([]) // Limpiar historial anterior
  }

  const closeOrderModal = () => {
    setShowOrderModal(false)
    setSelectedOrder(null)
    setOrderHistory([])
  }

  // Función auxiliar para obtener el issue de un producto
  const getProductIssue = (productName: string) => {
    return selectedOrder?.issues?.find(issue => issue.productName === productName)
  }

  // Abrir modal para eliminar producto (con motivo)
  const openDeleteModal = (itemId: string, productName: string) => {
    setDeleteItemInfo({ itemId, productName })
    setDeleteReason('')
    setShowDeleteModal(true)
  }

  // Confirmar eliminación con motivo
  const handleConfirmDelete = async () => {
    if (!selectedOrder || !deleteItemInfo) return
    if (!deleteReason.trim()) {
      alert('Por favor, escribe el motivo de la eliminación')
      return
    }
    
    try {
      setRemovingItem(deleteItemInfo.itemId)
      
      const result = await apiCall(`/api/buyer/orders/${selectedOrder.id}/items/${deleteItemInfo.itemId}`, {
        method: 'DELETE',
        body: JSON.stringify({ reason: deleteReason }),
        timeout: 5000,
      })
      
      if (result.success) {
        setToastMessage(`✅ "${deleteItemInfo.productName}" eliminado de la orden`)
        setToastStatus('success')
        setShowToast(true)
        
        // Actualizar la orden localmente - marcar como eliminado en vez de filtrar
        setSelectedOrder(prev => prev ? {
          ...prev,
          orderItems: prev.orderItems.map(item => 
            item.id === deleteItemInfo.itemId 
              ? { ...item, isDeleted: true, deletedReason: deleteReason, deletedAt: new Date().toISOString() }
              : item
          ),
          totalAmount: result.data?.newTotal || prev.totalAmount
        } : null)
        
        // Cerrar modal y limpiar
        setShowDeleteModal(false)
        setDeleteItemInfo(null)
        setDeleteReason('')
        
        // Refrescar órdenes
        fetchOrders()
      } else {
        alert(result.error || 'Error al eliminar el producto')
      }
    } catch (error) {
      console.error('Error removing product:', error)
      alert('Error al eliminar el producto')
    } finally {
      setRemovingItem(null)
    }
  }

  // Abrir selector de sustitución
  const openSubstituteSelector = async (itemId: string, productName: string, productId: string, originalQty: number = 1) => {
    setSubstituteItemInfo({ itemId, productName, productId, originalQty })
    setShowSubstituteSelector(true)
    setCatalogSearch('')
    setSelectedSubstituteProduct(null)
    setSubstituteQuantity(originalQty)
    
    // Cargar productos del catálogo del vendedor
    try {
      setLoadingCatalog(true)
      const result = await apiCall(`/api/sellers/${selectedOrder?.seller?.id}/products`, {
        timeout: 10000,
      })
      if (result.success && result.data) {
        // La API devuelve { success, data: [...products], count }
        // result.data contiene el objeto completo, así que products están en result.data.data o directamente result.data
        const products = Array.isArray(result.data) ? result.data : (result.data.data || [])
        // Filtrar el producto actual y solo con stock
        setCatalogProducts(products.filter((p: any) => p.id !== productId && (p.stock > 0 || p.stock === undefined)))
      } else {
        console.error('Error loading products:', result.error)
        setCatalogProducts([])
      }
    } catch (error) {
      console.error('Error loading catalog:', error)
      setCatalogProducts([])
    } finally {
      setLoadingCatalog(false)
    }
  }

  // Seleccionar producto para sustitución (muestra control de cantidad)
  const handleSelectSubstituteProduct = (product: any) => {
    setSelectedSubstituteProduct(product)
    // Usar la cantidad original del item como valor inicial
    setSubstituteQuantity(substituteItemInfo?.originalQty || 1)
  }

  // Confirmar sustitución con cantidad
  const handleConfirmSubstitute = async () => {
    if (!selectedOrder || !substituteItemInfo || !selectedSubstituteProduct) return
    
    try {
      setRemovingItem(substituteItemInfo.itemId)
      
      const result = await apiCall(`/api/buyer/orders/${selectedOrder.id}/items/${substituteItemInfo.itemId}/substitute`, {
        method: 'POST',
        body: JSON.stringify({ 
          newProductId: selectedSubstituteProduct.id,
          newProductName: selectedSubstituteProduct.name,
          quantity: substituteQuantity,
          reason: `Sustituido por: ${selectedSubstituteProduct.name} (${substituteQuantity} ${selectedSubstituteProduct.unit || 'und'})`
        }),
        timeout: 5000,
      })
      
      if (result.success) {
        setToastMessage(`✅ "${substituteItemInfo.productName}" sustituido por "${selectedSubstituteProduct.name}" (${substituteQuantity} ${selectedSubstituteProduct.unit || 'und'})`)
        setToastStatus('success')
        setShowToast(true)
        
        // Cerrar modal y limpiar estados
        setShowSubstituteSelector(false)
        setSubstituteItemInfo(null)
        setSelectedSubstituteProduct(null)
        setSubstituteQuantity(1)
        
        // Refrescar órdenes y actualizar la orden seleccionada
        const ordersResult = await apiCall('/api/buyer/orders', { timeout: 10000 })
        if (ordersResult.success && ordersResult.data?.orders) {
          setOrders(ordersResult.data.orders)
          // Actualizar el modal con la orden actualizada
          const updatedOrder = ordersResult.data.orders.find((o: Order) => o.id === selectedOrder.id)
          if (updatedOrder) {
            setSelectedOrder(updatedOrder)
          }
        }
      } else {
        alert(result.error || 'Error al sustituir el producto')
      }
    } catch (error) {
      console.error('Error substituting product:', error)
      alert('Error al sustituir el producto')
    } finally {
      setRemovingItem(null)
    }
  }

  // Productos del catálogo filtrados
  const filteredCatalogProducts = catalogProducts.filter(p => 
    p.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
    p.sku?.toLowerCase().includes(catalogSearch.toLowerCase())
  )

  // Aceptar cantidad parcial de un producto
  const handleAcceptPartial = async (itemId: string, productName: string, newQty: number) => {
    if (!selectedOrder) return
    
    const confirmed = confirm(`¿Aceptar solo ${newQty} unidades de "${productName}"?`)
    if (!confirmed) return
    
    try {
      setRemovingItem(itemId)
      
      const result = await apiCall(`/api/buyer/orders/${selectedOrder.id}/items/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity: newQty }),
        timeout: 5000,
      })
      
      if (result.success) {
        setToastMessage(`✅ Cantidad ajustada a ${newQty} unidades`)
        setToastStatus('success')
        setShowToast(true)
        
        // Refrescar órdenes
        fetchOrders()
        
        // Actualizar el modal
        if (result.data?.order) {
          setSelectedOrder(result.data.order)
        }
      } else {
        alert(result.error || 'Error al ajustar la cantidad')
      }
    } catch (error) {
      console.error('Error adjusting quantity:', error)
      alert('Error al ajustar la cantidad')
    } finally {
      setRemovingItem(null)
    }
  }

  // Contactar al vendedor sobre un producto con problema de stock
  const handleContactSellerAboutIssue = async (productName: string, issueType: string) => {
    if (!selectedOrder?.seller?.id) {
      alert('No se puede contactar al vendedor')
      return
    }
    
    // Redirigir al chat con contexto
    router.push(`/chat?sellerId=${selectedOrder.seller.id}&orderId=${selectedOrder.id}&context=stock_issue&product=${encodeURIComponent(productName)}`)
  }

  // ✅ confirmOrder CON TIMEOUT
  const _confirmOrder = async (orderId: string) => {
    if (!confirm('¿Confirmar esta orden?')) return

    try {
      const result = await apiCall(`/api/orders/${orderId}/placed`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idempotencyKey: uuidv4() }),
        timeout: 5000,
      })

      if (result.success) {
        alert('✅ Orden confirmada exitosamente')
        fetchOrders()
      } else {
        alert(result.error || 'Error confirmando orden')
      }
    } catch (err) {
      alert(getErrorMessage(err))
    }
  }

  // ✅ cancelOrder CON TIMEOUT
  const cancelOrder = async (orderId: string) => {
    const reason = prompt('Motivo de cancelación (opcional):')
    if (reason === null) return

    try {
      const result = await apiCall(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'CANCELED',
          notes: reason || 'Cancelada por el cliente'
        }),
        timeout: 5000,
      })

      if (result.success) {
        alert('✅ Orden cancelada')
        // Cerrar el modal si está abierto con esta orden
        if (selectedOrder?.id === orderId) {
          closeOrderModal()
        }
        // Recargar las órdenes para actualizar la vista
        await fetchOrders()
      } else {
        alert(result.error || 'Error cancelando orden')
      }
    } catch (err) {
      alert(getErrorMessage(err))
    }
  }

  // ✅ markAsReceived - Marcar orden como recibida por el comprador
  const markAsReceived = async (orderId: string) => {
    if (!confirm('¿Confirmas que recibiste todos los productos de esta orden?')) return

    try {
      const result = await apiCall(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'DELIVERED',
          notes: 'Mercancía recibida por el cliente'
        }),
        timeout: 5000,
      })

      if (result.success) {
        alert('✅ Orden marcada como recibida. ¡Gracias por confirmar!')
        fetchOrders()
        closeOrderModal()
      } else {
        alert(result.error || 'Error al marcar como recibida')
      }
    } catch (err) {
      alert(getErrorMessage(err))
    }
  }

  const handleQuickCancel = async (orderId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await cancelOrder(orderId)
  }

  const handleQuickTrack = (order: Order, e: React.MouseEvent) => {
    e.stopPropagation()
    openOrderModal(order)
    setActiveTab('seguimiento')
  }

  const handleQuickReorder = async (order: Order, e: React.MouseEvent) => {
    e.stopPropagation()
    
    // Abrir modal para seleccionar productos
    setReorderOrder(order)
    // Seleccionar todos los productos por defecto (solo los no eliminados)
    const activeItems = order.orderItems.filter(item => !item.isDeleted)
    setSelectedReorderItems(new Set(activeItems.map(item => item.id)))
    setShowReorderModal(true)
  }

  // Confirmar reorden con productos seleccionados
  const handleConfirmReorder = async () => {
    if (!reorderOrder || selectedReorderItems.size === 0) {
      alert('Selecciona al menos un producto para reordenar')
      return
    }
    
    try {
      setReordering(true)
      let addedCount = 0
      
      // Agregar solo los productos seleccionados al carrito
      for (const item of reorderOrder.orderItems) {
        if (selectedReorderItems.has(item.id) && !item.isDeleted) {
          try {
            await apiCall('/api/buyer/cart/items', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                productId: item.productId,
                quantity: item.quantity
              }),
            })
            addedCount++
          } catch (error) {
            console.error(`Error adding product ${item.productName}:`, error)
          }
        }
      }
      
      // Cerrar modal
      setShowReorderModal(false)
      setReorderOrder(null)
      setSelectedReorderItems(new Set())
      
      if (addedCount > 0) {
        setToastMessage(`✅ ${addedCount} productos agregados al carrito`)
        setToastStatus('success')
        setShowToast(true)
        // Esperar un momento y redirigir al carrito
        setTimeout(() => {
          router.push('/buyer/cart')
        }, 1500)
      } else {
        setToastMessage('No se pudieron agregar los productos')
        setToastStatus('error')
        setShowToast(true)
      }
    } catch (error) {
      setToastMessage('Error al reordenar')
      setToastStatus('error')
      setShowToast(true)
      console.error('Error reordering:', error)
    } finally {
      setReordering(false)
    }
  }

  // Toggle selección de item para reordenar
  const toggleReorderItem = (itemId: string) => {
    setSelectedReorderItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }

  // Seleccionar/deseleccionar todos para reordenar
  const toggleAllReorderItems = () => {
    if (!reorderOrder) return
    const activeItems = reorderOrder.orderItems.filter(item => !item.isDeleted)
    
    if (selectedReorderItems.size === activeItems.length) {
      setSelectedReorderItems(new Set())
    } else {
      setSelectedReorderItems(new Set(activeItems.map(item => item.id)))
    }
  }

  const handleQuickInvoice = async (order: Order, e: React.MouseEvent) => {
    e.stopPropagation()
    await handleViewInvoice(order)
  }

  // Abrir modal de opciones de contacto
  const handleContactSeller = (order: Order, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    if (!order.seller?.id) {
      alert('No se puede contactar al vendedor en este momento')
      return
    }
    setContactOrderInfo(order)
    setShowContactModal(true)
  }

  // Contactar por chat interno
  const handleContactViaChat = () => {
    if (contactOrderInfo?.seller?.id) {
      router.push(`/buyer/chat?seller=${contactOrderInfo.seller.id}&order=${contactOrderInfo.id}`)
    }
    setShowContactModal(false)
    setContactOrderInfo(null)
  }

  // Contactar por WhatsApp
  const handleContactViaWhatsApp = () => {
    if (!contactOrderInfo) {
      alert('Error: No hay información de la orden')
      return
    }
    
    // Debug: ver qué datos del seller tenemos
    console.log('Seller data:', contactOrderInfo.seller)
    console.log('Seller phone:', contactOrderInfo.seller?.phone)
    
    const sellerPhone = contactOrderInfo.seller?.phone
    
    if (sellerPhone && sellerPhone.trim() !== '') {
      // Limpiar caracteres no numéricos excepto el +
      let phone = sellerPhone.replaceAll(/[^\d+]/g, '')
      // Si no tiene código de país, agregar uno por defecto (ajustar según país)
      if (!phone.startsWith('+') && !phone.startsWith('1')) {
        phone = '1' + phone // Asume código de USA/Canadá, ajustar según necesidad
      }
      // Remover el + para la URL de WhatsApp
      phone = phone.replaceAll('+', '')
      
      const message = encodeURIComponent(
        `Hola! Soy ${contactOrderInfo.client?.name || 'tu cliente'}. Tengo una consulta sobre mi orden #${contactOrderInfo.orderNumber}`
      )
      
      // Usar window.location para mejor compatibilidad
      const whatsappUrl = `https://wa.me/${phone}?text=${message}`
      
      console.log('WhatsApp URL:', whatsappUrl)
      
      // Cerrar modal primero
      setShowContactModal(false)
      setContactOrderInfo(null)
      
      // Abrir WhatsApp en nueva pestaña
      const newWindow = window.open(whatsappUrl, '_blank', 'noopener,noreferrer')
      
      // Fallback si el popup fue bloqueado
      if (!newWindow || newWindow.closed || newWindow.closed === undefined) {
        // Intentar con location.href como alternativa
        globalThis.location.href = whatsappUrl
      }
    } else {
      console.warn('No phone found for seller:', contactOrderInfo.seller)
      alert(`El vendedor "${contactOrderInfo.seller?.name || 'desconocido'}" no tiene número de WhatsApp registrado (phone: ${sellerPhone || 'null'}). Por favor, usa el chat de la aplicación.`)
      setShowContactModal(false)
      setContactOrderInfo(null)
    }
  }

  // ✅ ESTADO DE LOADING
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-purple-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all p-6 mb-6 border-2 border-purple-200">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-3">
              <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-2 rounded-xl shadow-md">
                <ShoppingBag className="text-white" size={32} />
              </div>
              Mis Órdenes
            </h1>
            <p className="text-gray-600 mt-1 ml-14">Cargando órdenes...</p>
          </div>
          <div className="space-y-4">
            <OrderCardSkeleton />
            <OrderCardSkeleton />
            <OrderCardSkeleton />
            <OrderCardSkeleton />
          </div>
        </div>
      </div>
    )
  }

  // ✅ ESTADO DE TIMEOUT
  if (timedOut) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-purple-50 p-6 flex items-center justify-center">
        <div className="max-w-md bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all p-8 border-2 border-amber-200">
          <div className="bg-gradient-to-br from-amber-100 to-yellow-100 p-4 rounded-xl mb-4 flex items-center gap-3">
            <div className="bg-gradient-to-br from-amber-500 to-yellow-600 p-2 rounded-xl shadow-md">
              <Clock className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text text-transparent">
              Tiempo de espera excedido
            </h2>
          </div>
          <p className="text-gray-700 mb-6">
            La carga de órdenes está tardando más de lo esperado.
          </p>
          <button
            onClick={fetchOrders}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-lg hover:shadow-lg transform hover:-translate-y-0.5 transition-all font-semibold"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  // ✅ ESTADO DE ERROR
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-purple-50 p-6 flex items-center justify-center">
        <div className="max-w-md bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all p-8 border-2 border-red-200">
          <div className="bg-gradient-to-br from-red-100 to-rose-100 p-4 rounded-xl mb-4 flex items-center gap-3">
            <div className="bg-gradient-to-br from-red-500 to-rose-600 p-2 rounded-xl shadow-md">
              <AlertCircle className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent">Error</h2>
          </div>
          <p className="text-gray-700 mb-6">{error}</p>
          <button
            onClick={fetchOrders}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-lg hover:shadow-lg transform hover:-translate-y-0.5 transition-all font-semibold"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  // Filtrado y ordenamiento de órdenes
  const filteredAndSortedOrders = orders
    .filter(order => {
      // Filtro por estado
      if (filterStatus !== 'ALL') {
        if (filterStatus === 'CANCELED' && order.status !== 'CANCELED' && order.status !== 'CANCELLED') return false
        if (filterStatus === 'DELIVERED' && order.status !== 'DELIVERED' && order.status !== 'COMPLETED') return false
        if (filterStatus === 'PREPARING' && order.status !== 'PREPARING' && order.status !== 'PROCESSING') return false
        if (filterStatus !== 'CANCELED' && filterStatus !== 'DELIVERED' && filterStatus !== 'PREPARING' && order.status !== filterStatus) return false
      }

      // Filtro por búsqueda
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesOrderNumber = (order.orderNumber || '').toLowerCase().includes(query)
        const matchesId = order.id.toLowerCase().includes(query)
        const matchesTotal = order.totalAmount.toString().includes(query)
        if (!matchesOrderNumber && !matchesId && !matchesTotal) return false
      }

      // Filtro por rango de fechas predefinido
      if (dateRange !== 'all') {
        const orderDate = new Date(order.createdAt)
        const now = new Date()
        const daysAgoMap: Record<string, number> = { '7days': 7, '30days': 30, '90days': 90 }
        const daysAgo = daysAgoMap[dateRange] || 90
        const cutoffDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000))
        if (orderDate < cutoffDate) return false
      }

      // Filtro por rango de fechas manual
      if (dateFrom) {
        const orderDate = new Date(order.createdAt)
        const fromDate = new Date(dateFrom)
        if (orderDate < fromDate) return false
      }
      if (dateTo) {
        const orderDate = new Date(order.createdAt)
        const toDate = new Date(dateTo)
        toDate.setHours(23, 59, 59, 999) // Incluir el día completo
        if (orderDate > toDate) return false
      }

      return true
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        case 'highest':
          return Number(b.totalAmount) - Number(a.totalAmount)
        case 'lowest':
          return Number(a.totalAmount) - Number(b.totalAmount)
        default:
          return 0
      }
    })

  // Paginación
  const totalPages = Math.ceil(filteredAndSortedOrders.length / ordersPerPage)
  const startIndex = (currentPage - 1) * ordersPerPage
  const endIndex = startIndex + ordersPerPage
  const paginatedOrders = filteredAndSortedOrders.slice(startIndex, endIndex)

  return (
    <>
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-4 right-4 bg-gradient-to-r from-emerald-500 to-green-600 text-white px-6 py-4 rounded-lg shadow-xl border-2 border-emerald-300 z-50 animate-slide-in">
          <p className="font-medium">{toastMessage}</p>
          <p className="text-sm opacity-90">Estado: {toastStatus}</p>
        </div>
      )}

      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-purple-50 p-6 page-transition">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all p-6 mb-6 border-2 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-3">
                <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-2 rounded-xl shadow-md">
                  <ShoppingBag className="text-white" size={32} />
                </div>
                Mis Órdenes
              </h1>
              <p className="text-gray-600 mt-1 ml-14">
                {orders.length} {orders.length === 1 ? 'orden' : 'órdenes'}
              </p>
            </div>
            <button
              onClick={() => router.push('/buyer/catalog')}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-3 py-2 sm:px-6 sm:py-3 rounded-lg hover:shadow-lg transform hover:-translate-y-0.5 transition-all font-semibold text-sm sm:text-base flex items-center gap-1 sm:gap-2"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nueva orden</span>
              <span className="sm:hidden">Nuevo</span>
            </button>
          </div>
        </div>

        {/* Resumen Financiero */}
        {orders.length > 0 && (() => {
          const stats = getMonthlyStats()
          return (
            <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all p-6 mb-6 border-2 border-purple-200">
              <h3 className="font-bold text-lg mb-4 bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">Resumen del mes</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg p-4 border-2 border-purple-200 hover:border-purple-300 hover:shadow-lg transition-all">
                  <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-2 rounded-xl shadow-md w-12 h-12 mx-auto mb-2 flex items-center justify-center">
                    <ShoppingBag className="text-white" size={24} />
                  </div>
                  <p className="text-2xl font-bold text-purple-600">{stats.totalOrders}</p>
                  <p className="text-sm text-gray-600 mt-1">Órdenes</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-lg p-4 border-2 border-emerald-200 hover:border-emerald-300 hover:shadow-lg transition-all">
                  <div className="bg-gradient-to-br from-emerald-500 to-green-600 p-2 rounded-xl shadow-md w-12 h-12 mx-auto mb-2 flex items-center justify-center">
                    <TrendingUp className="text-white" size={24} />
                  </div>
                  <p className="text-xl font-bold text-emerald-600">{formatPrice(stats.totalSpent)}</p>
                  <p className="text-sm text-gray-600 mt-1">Gastado</p>
                </div>
                <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-lg p-4 border-2 border-cyan-200 hover:border-cyan-300 hover:shadow-lg transition-all">
                  <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-2 rounded-xl shadow-md w-12 h-12 mx-auto mb-2 flex items-center justify-center">
                    <DollarSign className="text-white" size={24} />
                  </div>
                  <p className="text-xl font-bold text-cyan-600">{formatPrice(stats.estimatedSavings)}</p>
                  <p className="text-sm text-gray-600 mt-1">Ahorrado</p>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-4 border-2 border-amber-200 hover:border-amber-300 hover:shadow-lg transition-all">
                  <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-2 rounded-xl shadow-md w-12 h-12 mx-auto mb-2 flex items-center justify-center">
                    <BarChart3 className="text-white" size={24} />
                  </div>
                  <p className="text-xl font-bold text-amber-600">{formatPrice(stats.averageOrder)}</p>
                  <p className="text-sm text-gray-600 mt-1">Promedio</p>
                </div>
              </div>
            </div>
          )
        })()}

        {/* Buscador y Filtros */}
        <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all p-4 mb-6 border-2 border-purple-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">Filtros de búsqueda</h3>
            {/* Toggle Vista Grid/List */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 mr-2">Vista:</span>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all ${
                  viewMode === 'grid' 
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md' 
                    : 'border-2 border-purple-200 text-gray-600 hover:border-purple-400 hover:bg-purple-50'
                }`}
                title="Vista en cuadrícula"
              >
                <Grid3x3 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all ${
                  viewMode === 'list' 
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md' 
                    : 'border-2 border-purple-200 text-gray-600 hover:border-purple-400 hover:bg-purple-50'
                }`}
                title="Vista en lista"
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Búsqueda */}
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-purple-400" />
              <input
                type="text"
                placeholder="Buscar por número de orden..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border-2 border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none transition-all"
              />
            </div>
            
            {/* Rango de fechas */}
            <div className="flex gap-2">
              <input 
                type="date" 
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="flex-1 px-3 py-2 border-2 border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none transition-all" 
                placeholder="Desde"
              />
              <input 
                type="date" 
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="flex-1 px-3 py-2 border-2 border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none transition-all" 
                placeholder="Hasta"
              />
            </div>
            
            {/* Ordenar por */}
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'highest' | 'lowest')}
              className="px-4 py-2 border-2 border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none bg-white transition-all"
            >
              <option value="newest">Más recientes</option>
              <option value="oldest">Más antiguos</option>
              <option value="highest">Mayor monto</option>
              <option value="lowest">Menor monto</option>
            </select>

            {/* Filtro por rango de fecha */}
            <select 
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as '7days' | '30days' | '90days' | 'all')}
              className="px-4 py-2 border-2 border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none bg-white transition-all"
            >
              <option value="7days">Últimos 7 días</option>
              <option value="30days">Últimos 30 días</option>
              <option value="90days">Últimos 3 meses</option>
              <option value="all">Todo el historial</option>
            </select>
          </div>

          {/* Indicador de resultados filtrados */}
          {(searchQuery || dateFrom || dateTo || filterStatus !== 'ALL') && (
            <div className="mt-4 pt-4 border-t border-purple-100 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Mostrando <strong className="text-purple-600">{filteredAndSortedOrders.length}</strong> de <strong className="text-purple-600">{orders.length}</strong> órdenes
              </p>
              <button
                onClick={() => {
                  setSearchQuery('')
                  setDateFrom('')
                  setDateTo('')
                  setFilterStatus('ALL')
                  setSortBy('newest')
                }}
                className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1 px-3 py-1 rounded-lg hover:bg-purple-50 transition-all"
              >
                Limpiar filtros
              </button>
            </div>
          )}
        </div>

        {/* Tabs de filtrado */}
        <div className="bg-white rounded-2xl shadow-lg p-4 mb-6 border border-purple-100">
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setFilterStatus('ALL')}
              className={`px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap ${
                filterStatus === 'ALL'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
                  : 'border-2 border-purple-200 text-gray-700 hover:border-purple-400 hover:bg-purple-50'
              }`}
            >
              Todas ({orders.length})
            </button>
            <button
              onClick={() => setFilterStatus('PENDING')}
              className={`px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap ${
                filterStatus === 'PENDING'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
                  : 'border-2 border-purple-200 text-gray-700 hover:border-purple-400 hover:bg-purple-50'
              }`}
            >
              Pendientes ({orders.filter(o => o.status === 'PENDING').length})
            </button>
            <button
              onClick={() => setFilterStatus('CONFIRMED')}
              className={`px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap ${
                filterStatus === 'CONFIRMED'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
                  : 'border-2 border-purple-200 text-gray-700 hover:border-purple-400 hover:bg-purple-50'
              }`}
            >
              Confirmadas ({orders.filter(o => o.status === 'CONFIRMED').length})
            </button>
            <button
              onClick={() => setFilterStatus('DELIVERED')}
              className={`px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap ${
                filterStatus === 'DELIVERED'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
                  : 'border-2 border-purple-200 text-gray-700 hover:border-purple-400 hover:bg-purple-50'
              }`}
            >
              Recibidas ({orders.filter(o => o.status === 'DELIVERED' || o.status === 'COMPLETED').length})
            </button>
            <button
              onClick={() => setFilterStatus('CANCELED')}
              className={`px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap ${
                filterStatus === 'CANCELED'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
                  : 'border-2 border-purple-200 text-gray-700 hover:border-purple-400 hover:bg-purple-50'
              }`}
            >
              Canceladas ({orders.filter(o => o.status === 'CANCELED' || o.status === 'CANCELLED').length})
            </button>
          </div>
        </div>

        {/* Lista de órdenes */}
        {orders.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all border-2 border-purple-200">
            <div className="bg-gradient-to-br from-purple-100 to-indigo-100 p-6 rounded-full w-32 h-32 mx-auto mb-6 flex items-center justify-center">
              <ShoppingBag className="w-16 h-16 text-purple-400" />
            </div>
            <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2">
              No tienes órdenes aún
            </h3>
            <p className="text-gray-500 mb-6">
              Explora el catálogo y realiza tu primera compra
            </p>
            <Link href="/buyer/catalog">
              <button className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-8 py-3 rounded-lg hover:shadow-lg transform hover:-translate-y-0.5 transition-all font-semibold inline-flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                Ir al Catálogo
              </button>
            </Link>
          </div>
        ) : (
          <>
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 lg:grid-cols-2 gap-6' : 'space-y-4'}>
            {paginatedOrders.map((order) => {
              const config = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.PENDING
              const StatusIcon = config.icon
              
              // Determinar si necesita animación (órdenes no completadas ni canceladas)
              const needsAttention = !['COMPLETED', 'DELIVERED', 'CANCELED', 'CANCELLED'].includes(order.status)
              const isCompleted = order.status === 'COMPLETED' || order.status === 'DELIVERED'
              
              // Solo mostrar warning de stock si la orden está en ISSUE_REPORTED
              // Una vez CONFIRMED o LOCKED, ya no mostrar el warning
              const isConfirmedOrLater = ['CONFIRMED', 'LOCKED', 'PREPARING', 'READY_FOR_PICKUP', 'IN_DELIVERY', 'DELIVERED', 'COMPLETED'].includes(order.status)
              const hasStockIssues = !isConfirmedOrLater && (order.hasIssues || (order.issues && order.issues.length > 0) || order.status === 'ISSUE_REPORTED')

              return viewMode === 'grid' ? (
                // Vista GRID (Card)
                <div
                  key={order.id}
                  className={`bg-white rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all p-6 border-2 relative ${
                    hasStockIssues ? 'border-amber-400 bg-amber-50/30' : 'border-purple-200 hover:border-purple-300'
                  }`}
                  style={needsAttention ? {
                    animation: 'orderPulse 3s ease-in-out infinite',
                  } : {}}
                >
                  {/* Banner de Problemas de Stock */}
                  {hasStockIssues && (
                    <div className="absolute top-0 left-0 right-0 z-10">
                      <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 rounded-t-xl flex items-center justify-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="font-medium text-sm">⚠️ Algunos productos tienen problemas de stock - Revisa los detalles</span>
                      </div>
                    </div>
                  )}
                  {/* Sticker de Recibida */}
                  {isCompleted && !hasStockIssues && (
                    <div className="absolute top-0 right-0 z-10"
                      style={{
                        animation: 'stickerBounce 0.8s ease-out',
                      }}
                    >
                      <div className="bg-gradient-to-br from-emerald-500 to-green-600 text-white px-4 py-2 rounded-bl-2xl shadow-lg flex items-center gap-2">
                        <CheckCircle className="h-5 w-5" />
                        <span className="font-bold text-sm">✅ Recibida</span>
                      </div>
                    </div>
                  )}
                  {/* Header */}
                  <div className={`flex items-start justify-between mb-4 ${hasStockIssues ? 'mt-8' : ''}`}>
                    <div>
                      <h3 className="font-bold text-lg text-purple-600">
                        {order.orderNumber || `#${order.id.slice(0, 8)}`}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {new Date(order.createdAt).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className="relative">
                      {needsAttention && (
                        <div 
                          className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full"
                          style={{
                            animation: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite',
                          }}
                        />
                      )}
                      <span 
                        className={`px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.color}`}
                        style={needsAttention ? {
                          animation: 'statusPulse 2s ease-in-out infinite',
                        } : {}}
                      >
                        {config.label}
                      </span>
                    </div>
                  </div>

                  {/* Animaciones según estado */}
                  <div className="mb-4 flex justify-center">
                    {order.status === 'CONFIRMED' && (
                      <div className="relative w-20 h-20">
                        <svg viewBox="0 0 100 100" className="w-full h-full">
                          {/* Clipboard/Lista */}
                          <rect x="25" y="15" width="50" height="70" fill="#fff" stroke="#3b82f6" strokeWidth="2" rx="3" />
                          <rect x="35" y="10" width="30" height="8" fill="#3b82f6" rx="2" />
                          
                          {/* Items de la lista con checkmarks animados */}
                          {/* Item 1 - Ya marcado */}
                          <circle cx="35" cy="30" r="4" fill="#10b981" />
                          <path d="M 33 30 L 35 32 L 38 28" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                          <line x1="42" y1="30" x2="65" y2="30" stroke="#d1d5db" strokeWidth="2" />
                          
                          {/* Item 2 - Marcándose (animado) */}
                          <circle cx="35" cy="45" r="4" fill="#10b981">
                            <animate attributeName="fill" values="#e5e7eb;#10b981" dur="2s" begin="0s" fill="freeze" />
                          </circle>
                          <path d="M 33 45 L 35 47 L 38 43" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round">
                            <animate attributeName="stroke-dasharray" values="0,20;20,0" dur="2s" begin="0s" fill="freeze" />
                            <animate attributeName="stroke-dashoffset" values="20;0" dur="2s" begin="0s" fill="freeze" />
                          </path>
                          <line x1="42" y1="45" x2="65" y2="45" stroke="#d1d5db" strokeWidth="2" />
                          
                          {/* Item 3 - Por marcar */}
                          <circle cx="35" cy="60" r="4" fill="#e5e7eb">
                            <animate attributeName="fill" values="#e5e7eb;#e5e7eb;#10b981" dur="4s" begin="0s" repeatCount="indefinite" />
                          </circle>
                          <path d="M 33 60 L 35 62 L 38 58" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round">
                            <animate attributeName="stroke-dasharray" values="0,20;0,20;20,0" dur="4s" begin="0s" repeatCount="indefinite" />
                          </path>
                          <line x1="42" y1="60" x2="65" y2="60" stroke="#d1d5db" strokeWidth="2" />
                          
                          {/* Item 4 - Por marcar */}
                          <circle cx="35" cy="75" r="4" fill="#e5e7eb" />
                          <line x1="42" y1="75" x2="65" y2="75" stroke="#d1d5db" strokeWidth="2" />
                          
                          {/* Estrella de confirmación */}
                          <text x="72" y="25" fontSize="14" fill="#fbbf24" className="animate-ping">⭐</text>
                        </svg>
                      </div>
                    )}

                    {order.status === 'IN_DELIVERY' && (
                      <div className="relative w-20 h-20">
                        <svg viewBox="0 0 100 100" className="w-full h-full">
                          {/* Road */}
                          <line x1="0" y1="70" x2="100" y2="70" stroke="#9ca3af" strokeWidth="2" strokeDasharray="5,5">
                            <animate attributeName="stroke-dashoffset" from="0" to="10" dur="0.5s" repeatCount="indefinite" />
                          </line>
                          {/* Truck */}
                          <g className="animate-truck-move">
                            <rect x="10" y="50" width="15" height="15" fill="#8b5cf6" rx="2" />
                            <rect x="12" y="52" width="5" height="6" fill="#ddd6fe" rx="1" />
                            <rect x="25" y="45" width="25" height="20" fill="#a78bfa" rx="2" />
                            <line x1="35" y1="45" x2="35" y2="65" stroke="#8b5cf6" strokeWidth="1" />
                            <line x1="42" y1="45" x2="42" y2="65" stroke="#8b5cf6" strokeWidth="1" />
                            <circle cx="18" cy="68" r="4" fill="#374151">
                              <animateTransform attributeName="transform" type="rotate" from="0 18 68" to="360 18 68" dur="0.5s" repeatCount="indefinite" />
                            </circle>
                            <circle cx="43" cy="68" r="4" fill="#374151">
                              <animateTransform attributeName="transform" type="rotate" from="0 43 68" to="360 43 68" dur="0.5s" repeatCount="indefinite" />
                            </circle>
                            <line x1="5" y1="55" x2="0" y2="55" stroke="#8b5cf6" strokeWidth="2" opacity="0.5">
                              <animate attributeName="x1" values="5;0;5" dur="0.3s" repeatCount="indefinite" />
                            </line>
                          </g>
                          {/* Clouds */}
                          <ellipse cx="70" cy="20" rx="10" ry="6" fill="#e0e7ff" opacity="0.7">
                            <animate attributeName="cx" values="70;75;70" dur="3s" repeatCount="indefinite" />
                          </ellipse>
                        </svg>
                      </div>
                    )}

                    {(order.status === 'DELIVERED' || order.status === 'COMPLETED') && (
                      <div className="relative w-20 h-20">
                        <svg viewBox="0 0 100 100" className="w-full h-full">
                          <rect x="30" y="35" width="40" height="40" fill="#10b981" rx="2" className="animate-wiggle" />
                          <line x1="30" y1="55" x2="70" y2="55" stroke="#059669" strokeWidth="3" />
                          <line x1="50" y1="35" x2="50" y2="75" stroke="#059669" strokeWidth="3" />
                          <circle cx="50" cy="55" r="18" fill="#fff" className="animate-scale-in" />
                          <path d="M 42 55 L 48 62 L 60 48" stroke="#10b981" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" className="animate-draw-check" />
                          <circle cx="25" cy="20" r="2" fill="#fbbf24" className="animate-confetti-1" />
                          <circle cx="75" cy="25" r="2" fill="#ec4899" className="animate-confetti-2" />
                          <circle cx="20" cy="80" r="2" fill="#3b82f6" className="animate-confetti-3" />
                          <circle cx="80" cy="75" r="2" fill="#8b5cf6" className="animate-confetti-4" />
                        </svg>
                      </div>
                    )}
                  </div>
                  
                  {/* Productos */}
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      {order.orderItems?.length || 0} {order.orderItems?.length === 1 ? 'producto' : 'productos'}
                    </p>
                  </div>

                  {/* Barra de progreso visual */}
                  {order.status !== 'CANCELED' && order.status !== 'CANCELLED' && (
                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-gray-500 mb-2">
                        <span className={getProgressPercentage(order.status) >= 0 ? 'font-medium text-purple-600' : ''}>Pendiente</span>
                        <span className={getProgressPercentage(order.status) >= 50 ? 'font-medium text-purple-600' : ''}>Preparando</span>
                        <span className={getProgressPercentage(order.status) >= 75 ? 'font-medium text-purple-600' : ''}>En camino</span>
                        <span className={getProgressPercentage(order.status) >= 100 ? 'font-medium text-purple-600' : ''}>Entregado</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-purple-600 to-indigo-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${getProgressPercentage(order.status)}%` }}
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Total */}
                  <div className="mb-4 pt-4 border-t border-purple-100">
                    <span className="text-xl font-bold text-purple-600">
                      {formatPrice(order.totalAmount)}
                    </span>
                  </div>

                  {/* Acciones rápidas */}
                  <div className="flex gap-2 flex-wrap">
                    {/* Botón cancelar para PENDING, CONFIRMED, REVIEWING, ISSUE_REPORTED */}
                    {(order.status === 'PENDING' || order.status === 'CONFIRMED' || order.status === 'REVIEWING' || order.status === 'ISSUE_REPORTED') && (
                      <button 
                        onClick={(e) => handleQuickCancel(order.id, e)}
                        className="flex-1 min-w-[100px] bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-200 text-red-600 py-2 rounded-lg hover:border-red-300 hover:shadow-lg transition-all font-medium text-sm flex items-center justify-center gap-2"
                      >
                        <XCircle className="w-4 h-4" />
                        Cancelar
                      </button>
                    )}
                    
                    {/* Botón reordenar siempre visible */}
                    <button 
                      onClick={(e) => handleQuickReorder(order, e)}
                      className="flex-1 min-w-[100px] bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 text-emerald-600 py-2 rounded-lg hover:border-emerald-300 hover:shadow-lg transition-all font-medium text-sm flex items-center justify-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Reordenar
                    </button>
                    
                    {(order.status === 'CONFIRMED' || order.status === 'PREPARING' || order.status === 'IN_DELIVERY') && (
                      <button 
                        onClick={(e) => handleQuickTrack(order, e)}
                        className="flex-1 min-w-[100px] bg-gradient-to-br from-cyan-50 to-blue-50 border-2 border-cyan-200 text-cyan-600 py-2 rounded-lg hover:border-cyan-300 hover:shadow-lg transition-all font-medium text-sm flex items-center justify-center gap-2"
                      >
                        <MapPin className="w-4 h-4" />
                        Rastrear
                      </button>
                    )}
                    
                    {(order.status === 'DELIVERED' || order.status === 'COMPLETED') && (
                      <button 
                        onClick={(e) => handleQuickInvoice(order, e)}
                        className="flex-1 min-w-[100px] bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-200 text-purple-600 py-2 rounded-lg hover:border-purple-300 hover:shadow-lg transition-all font-medium text-sm flex items-center justify-center gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        Factura
                      </button>
                    )}

                    <button 
                      onClick={() => openOrderModal(order)}
                      className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-lg hover:shadow-lg transform hover:-translate-y-0.5 transition-all font-medium text-sm"
                    >
                      Detalles
                    </button>
                  </div>

                  {/* Botón contactar vendedor */}
                  <div className="mt-4 pt-4 border-t border-purple-100">
                    <button 
                      onClick={(e) => handleContactSeller(order, e)}
                      className="w-full flex items-center justify-center gap-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 py-2 rounded-lg border-2 border-purple-200 hover:border-purple-300 transition-all font-medium text-sm"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Contactar vendedor
                    </button>
                  </div>
                </div>
              ) : (
                // Vista LIST (Fila)
                <div
                  key={order.id}
                  className="bg-white rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all p-4 border-2 border-purple-200 hover:border-purple-300 relative"
                  style={needsAttention ? {
                    animation: 'orderPulse 3s ease-in-out infinite',
                  } : {}}
                >
                  {/* Sticker de Completada (también en lista) */}
                  {/* Sticker de Recibida (vista lista) */}
                  {isCompleted && (
                    <div className="absolute top-0 right-0 z-10"
                      style={{
                        animation: 'stickerBounce 0.8s ease-out',
                      }}
                    >
                      <div className="bg-gradient-to-br from-emerald-500 to-green-600 text-white px-3 py-1 rounded-bl-xl shadow-lg flex items-center gap-1">
                        <CheckCircle className="h-4 w-4" />
                        <span className="font-bold text-xs">✅ Recibida</span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-4">
                    {/* Izquierda: Info básica con animación */}
                    <div className="flex items-center gap-4 flex-1">
                      {/* Animaciones según estado */}
                      <div className="flex-shrink-0">
                        {order.status === 'CONFIRMED' && (
                          <div className="relative w-16 h-16">
                            <svg viewBox="0 0 100 100" className="w-full h-full">
                              {/* Clipboard/Lista */}
                              <rect x="25" y="15" width="50" height="70" fill="#fff" stroke="#3b82f6" strokeWidth="2" rx="3" />
                              <rect x="35" y="10" width="30" height="8" fill="#3b82f6" rx="2" />
                              
                              {/* Items con checkmarks animados */}
                              <circle cx="35" cy="30" r="4" fill="#10b981" />
                              <path d="M 33 30 L 35 32 L 38 28" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                              <line x1="42" y1="30" x2="65" y2="30" stroke="#d1d5db" strokeWidth="2" />
                              
                              <circle cx="35" cy="45" r="4" fill="#10b981">
                                <animate attributeName="fill" values="#e5e7eb;#10b981" dur="2s" begin="0s" fill="freeze" />
                              </circle>
                              <path d="M 33 45 L 35 47 L 38 43" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round">
                                <animate attributeName="stroke-dasharray" values="0,20;20,0" dur="2s" begin="0s" fill="freeze" />
                              </path>
                              <line x1="42" y1="45" x2="65" y2="45" stroke="#d1d5db" strokeWidth="2" />
                              
                              <circle cx="35" cy="60" r="4" fill="#e5e7eb">
                                <animate attributeName="fill" values="#e5e7eb;#e5e7eb;#10b981" dur="4s" begin="0s" repeatCount="indefinite" />
                              </circle>
                              <path d="M 33 60 L 35 62 L 38 58" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round">
                                <animate attributeName="stroke-dasharray" values="0,20;0,20;20,0" dur="4s" begin="0s" repeatCount="indefinite" />
                              </path>
                              <line x1="42" y1="60" x2="65" y2="60" stroke="#d1d5db" strokeWidth="2" />
                              
                              <circle cx="35" cy="75" r="4" fill="#e5e7eb" />
                              <line x1="42" y1="75" x2="65" y2="75" stroke="#d1d5db" strokeWidth="2" />
                              
                              <text x="72" y="25" fontSize="12" fill="#fbbf24" className="animate-ping">⭐</text>
                            </svg>
                          </div>
                        )}

                        {order.status === 'IN_DELIVERY' && (
                          <div className="relative w-16 h-16">
                            <svg viewBox="0 0 100 100" className="w-full h-full">
                              <line x1="0" y1="70" x2="100" y2="70" stroke="#9ca3af" strokeWidth="2" strokeDasharray="5,5">
                                <animate attributeName="stroke-dashoffset" from="0" to="10" dur="0.5s" repeatCount="indefinite" />
                              </line>
                              <g className="animate-truck-move">
                                <rect x="10" y="50" width="15" height="15" fill="#8b5cf6" rx="2" />
                                <rect x="12" y="52" width="5" height="6" fill="#ddd6fe" rx="1" />
                                <rect x="25" y="45" width="25" height="20" fill="#a78bfa" rx="2" />
                                <circle cx="18" cy="68" r="4" fill="#374151">
                                  <animateTransform attributeName="transform" type="rotate" from="0 18 68" to="360 18 68" dur="0.5s" repeatCount="indefinite" />
                                </circle>
                                <circle cx="43" cy="68" r="4" fill="#374151">
                                  <animateTransform attributeName="transform" type="rotate" from="0 43 68" to="360 43 68" dur="0.5s" repeatCount="indefinite" />
                                </circle>
                              </g>
                              <ellipse cx="70" cy="20" rx="10" ry="6" fill="#e0e7ff" opacity="0.7">
                                <animate attributeName="cx" values="70;75;70" dur="3s" repeatCount="indefinite" />
                              </ellipse>
                            </svg>
                          </div>
                        )}

                        {(order.status === 'DELIVERED' || order.status === 'COMPLETED') && (
                          <div className="relative w-16 h-16">
                            <svg viewBox="0 0 100 100" className="w-full h-full">
                              <rect x="30" y="35" width="40" height="40" fill="#10b981" rx="2" className="animate-wiggle" />
                              <line x1="30" y1="55" x2="70" y2="55" stroke="#059669" strokeWidth="3" />
                              <line x1="50" y1="35" x2="50" y2="75" stroke="#059669" strokeWidth="3" />
                              <circle cx="50" cy="55" r="18" fill="#fff" className="animate-scale-in" />
                              <path d="M 42 55 L 48 62 L 60 48" stroke="#10b981" strokeWidth="4" fill="none" strokeLinecap="round" className="animate-draw-check" />
                              <circle cx="25" cy="20" r="2" fill="#fbbf24" className="animate-confetti-1" />
                              <circle cx="75" cy="25" r="2" fill="#ec4899" className="animate-confetti-2" />
                            </svg>
                          </div>
                        )}

                        {!['CONFIRMED', 'IN_DELIVERY', 'DELIVERED', 'COMPLETED'].includes(order.status) && (
                          <div className={`p-3 rounded-lg ${config.bg}`}>
                            <StatusIcon className={`${config.color} w-6 h-6`} />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <h3 className="font-bold text-purple-600">
                          {order.orderNumber || `#${order.id.slice(0, 8)}`}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {new Date(order.createdAt).toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })} • {order.orderItems?.length || 0} productos
                        </p>
                        
                        {/* Barra de progreso en lista (compacta) */}
                        {order.status !== 'CANCELED' && order.status !== 'CANCELLED' && (
                          <div className="mt-2 max-w-xs">
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div
                                className="bg-gradient-to-r from-purple-600 to-indigo-600 h-1.5 rounded-full transition-all duration-500"
                                style={{ width: `${getProgressPercentage(order.status)}%` }}
                              />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              Progreso: {getProgressPercentage(order.status)}%
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Centro: Estado y Total */}
                    <div className="text-center flex-shrink-0">
                      <div className="relative inline-block mb-2">
                        {needsAttention && (
                          <div 
                            className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full"
                            style={{
                              animation: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite',
                            }}
                          />
                        )}
                        <span 
                          className={`px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}
                          style={needsAttention ? {
                            animation: 'statusPulse 2s ease-in-out infinite',
                          } : {}}
                        >
                          {config.label}
                        </span>
                      </div>
                      <span className="text-lg font-bold text-purple-600 block">
                        {formatPrice(order.totalAmount)}
                      </span>
                    </div>

                    {/* Derecha: Acciones */}
                    <div className="flex gap-2 flex-shrink-0 flex-wrap">
                      {/* Botón cancelar para PENDING, CONFIRMED, REVIEWING, ISSUE_REPORTED */}
                      {(order.status === 'PENDING' || order.status === 'CONFIRMED' || order.status === 'REVIEWING' || order.status === 'ISSUE_REPORTED') && (
                        <button 
                          onClick={(e) => handleQuickCancel(order.id, e)}
                          className="bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-200 text-red-600 p-2 rounded-lg hover:border-red-300 hover:shadow-lg transition-all"
                          title="Cancelar orden"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      )}
                      
                      {/* Botón reordenar siempre visible */}
                      <button 
                        onClick={(e) => handleQuickReorder(order, e)}
                        className="bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 text-emerald-600 p-2 rounded-lg hover:border-emerald-300 hover:shadow-lg transition-all"
                        title="Reordenar"
                      >
                        <RotateCcw className="w-5 h-5" />
                      </button>
                      
                      {/* Botón para confirmar recepción (EN_DELIVERY) */}
                      {order.status === 'IN_DELIVERY' && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation()
                            markAsReceived(order.id)
                          }}
                          className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 rounded-lg hover:shadow-lg transform hover:-translate-y-0.5 transition-all font-medium text-sm flex items-center gap-2"
                          title="Confirmar recepción"
                        >
                          <PackageCheck className="w-4 h-4" />
                          Confirmar Recepción
                        </button>
                      )}

                      {(order.status === 'CONFIRMED' || order.status === 'PREPARING' || order.status === 'IN_DELIVERY') && (
                        <button 
                          onClick={(e) => handleQuickTrack(order, e)}
                          className="bg-gradient-to-br from-cyan-50 to-blue-50 border-2 border-cyan-200 text-cyan-600 p-2 rounded-lg hover:border-cyan-300 hover:shadow-lg transition-all"
                          title="Rastrear orden"
                        >
                          <MapPin className="w-5 h-5" />
                        </button>
                      )}

                      <button 
                        onClick={() => openOrderModal(order)}
                        className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-lg hover:shadow-lg transform hover:-translate-y-0.5 transition-all font-medium text-sm"
                      >
                        Detalles
                      </button>

                      <button 
                        onClick={(e) => handleContactSeller(order, e)}
                        className="bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-200 text-purple-600 p-2 rounded-lg hover:border-purple-300 hover:shadow-lg transition-all"
                        title="Contactar vendedor"
                      >
                        <MessageCircle className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
            {filteredAndSortedOrders.length === 0 && (
              <div className="col-span-full bg-white rounded-2xl shadow-lg p-12 text-center border border-purple-100">
                <Package className="mx-auto text-gray-400 mb-4" size={64} />
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  No hay órdenes que coincidan
                </h2>
                <p className="text-gray-600 mb-6">
                  Intenta ajustar los filtros de búsqueda
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('')
                    setDateFrom('')
                    setDateTo('')
                    setFilterStatus('ALL')
                  }}
                  className="bg-purple-600 text-white px-8 py-3 rounded-lg hover:bg-purple-700 transition-colors font-semibold"
                >
                  Limpiar filtros
                </button>
              </div>
            )}
          </div>

          {/* Controles de paginación */}
          {filteredAndSortedOrders.length > ordersPerPage && (
            <div className="mt-8 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all p-4 md:p-6 border-2 border-purple-200">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                {/* Info de página */}
                <div className="text-sm text-gray-600 text-center md:text-left">
                  Mostrando <strong className="text-purple-600">{startIndex + 1}</strong> - <strong className="text-purple-600">{Math.min(endIndex, filteredAndSortedOrders.length)}</strong> de <strong className="text-purple-600">{filteredAndSortedOrders.length}</strong> órdenes
                </div>

                {/* Botones de navegación */}
                <div className="flex items-center gap-2 flex-wrap justify-center">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className={`px-3 md:px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-1 md:gap-2 text-sm md:text-base ${
                      currentPage === 1
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'border-2 border-purple-200 text-purple-600 hover:border-purple-400 hover:bg-purple-50'
                    }`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Anterior</span>
                  </button>

                  {/* Números de página */}
                  <div className="flex gap-1 overflow-x-auto max-w-[200px] md:max-w-none">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-8 h-8 md:w-10 md:h-10 rounded-lg font-medium transition-all flex-shrink-0 text-sm md:text-base ${
                          currentPage === page
                            ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                            : 'border-2 border-purple-200 text-gray-600 hover:border-purple-400 hover:bg-purple-50'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className={`px-3 md:px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-1 md:gap-2 text-sm md:text-base ${
                      currentPage === totalPages
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'border-2 border-purple-200 text-purple-600 hover:border-purple-400 hover:bg-purple-50'
                    }`}
                  >
                    <span className="hidden sm:inline">Siguiente</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
          </>
        )}

        {/* Order Detail Modal */}
        {showOrderModal && selectedOrder && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            role="button"
            tabIndex={0}
            onClick={closeOrderModal}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') closeOrderModal(); }}
          >
            <div 
              className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              {/* Header - Compacto */}
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-3 rounded-t-2xl sticky top-0 z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">📦</span>
                    <div>
                      <h2 className="text-base font-bold">
                        #{selectedOrder.orderNumber?.replace('ORD-', '').slice(-6) || selectedOrder.id.slice(0, 6)}
                      </h2>
                      <p className="text-xs text-purple-200">
                        {new Date(selectedOrder.createdAt).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={closeOrderModal} 
                    className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              {/* Banner destacado para confirmar recepción (visible en todas las pestañas) */}
              {selectedOrder.status === 'IN_DELIVERY' && (
                <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-4 animate-pulse">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 text-white">
                      <PackageCheck className="w-6 h-6" />
                      <div>
                        <p className="font-bold">¿Ya recibiste tu pedido?</p>
                        <p className="text-sm text-green-50">Confirma la recepción para notificar al vendedor</p>
                      </div>
                    </div>
                    <button
                      onClick={() => markAsReceived(selectedOrder.id)}
                      className="bg-white text-green-600 px-6 py-2 rounded-lg font-bold hover:bg-green-50 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center gap-2 whitespace-nowrap"
                    >
                      <CheckCircle className="w-5 h-5" />
                      Confirmar Recepción
                    </button>
                  </div>
                </div>
              )}

              {/* Tabs */}
              <div className="flex border-b sticky top-[120px] bg-white z-10">
                <button 
                  onClick={() => setActiveTab('productos')}
                  className={`px-6 py-3 font-medium transition-colors ${
                    activeTab === 'productos' 
                      ? 'border-b-2 border-purple-600 text-purple-600' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Productos
                </button>
                <button 
                  onClick={() => setActiveTab('estado')}
                  className={`px-6 py-3 font-medium transition-colors ${
                    activeTab === 'estado' 
                      ? 'border-b-2 border-purple-600 text-purple-600' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Estado
                </button>
                <button 
                  onClick={() => {
                    setActiveTab('seguimiento')
                    if (selectedOrder && orderHistory.length === 0) {
                      fetchOrderHistory(selectedOrder.id)
                    }
                  }}
                  className={`px-6 py-3 font-medium transition-colors ${
                    activeTab === 'seguimiento' 
                      ? 'border-b-2 border-purple-600 text-purple-600' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Seguimiento
                </button>
              </div>
              
              {/* Contenido */}
              <div className="p-6">
                {/* Tab: Productos */}
                {activeTab === 'productos' && (
                  <div className="space-y-4">
                    {/* Banner de alerta si hay issues - Solo mostrar si NO está confirmada/locked */}
                    {(selectedOrder.hasIssues || (selectedOrder.issues && selectedOrder.issues.length > 0)) && 
                     !['CONFIRMED', 'LOCKED', 'PREPARING', 'READY_FOR_PICKUP', 'IN_DELIVERY', 'DELIVERED', 'COMPLETED'].includes(selectedOrder.status) && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <h4 className="font-bold text-amber-800">⚠️ Algunos productos tienen problemas de stock</h4>
                            <p className="text-sm text-amber-700 mt-1">
                              El vendedor ha reportado problemas con algunos productos. 
                              Revisa los productos marcados abajo y elige qué hacer:
                            </p>
                            <ul className="text-sm text-amber-700 mt-2 space-y-1">
                              <li>• <strong>Eliminar:</strong> Quitar el producto de tu orden</li>
                              <li>• <strong>Aceptar parcial:</strong> Recibir la cantidad disponible</li>
                              <li>• <strong>Contactar:</strong> Hablar con el vendedor para buscar alternativas</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                      Productos de la orden
                    </h3>
                    {selectedOrder.orderItems?.map((item) => {
                      const issue = getProductIssue(item.productName)
                      const hasIssue = !!issue
                      const isOutOfStock = issue?.issueType === 'OUT_OF_STOCK'
                      const isPartialStock = issue?.issueType === 'PARTIAL_STOCK'
                      const isDeleted = item.isDeleted
                      const wasSubstituted = item.substitutedWith
                      
                      // Si el item fue eliminado, mostrar versión especial
                      if (isDeleted) {
                        return (
                          <div 
                            key={item.id} 
                            className="rounded-xl border bg-gray-100 border-gray-300 opacity-75"
                          >
                            <div className="flex items-center gap-4 p-4">
                              <div className="flex-shrink-0 w-16 h-16 rounded-lg flex items-center justify-center bg-gray-200">
                                <Trash2 className="w-8 h-8 text-gray-500" />
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-500 line-through">
                                  {item.productName}
                                </h4>
                                <p className="text-xs text-gray-500 line-through">
                                  {item.quantity} {item.product?.unit || 'und'} × {formatPrice(item.pricePerUnit)}
                                </p>
                                <div className="mt-2 p-2 rounded-lg text-sm bg-gray-200 text-gray-700">
                                  <span>🗑️ <strong>Eliminado por ti</strong></span>
                                  {item.deletedReason && (
                                    <p className="mt-1 text-xs italic">Motivo: "{item.deletedReason}"</p>
                                  )}
                                </div>
                                {wasSubstituted && item.substituteName && (
                                  <div className="mt-2 p-2 rounded-lg text-sm bg-green-100 text-green-800">
                                    <span>🔄 Sustituido por: <strong>{item.substituteName}</strong></span>
                                  </div>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-sm text-gray-400 line-through">
                                  {formatPrice(item.quantity * Number(item.pricePerUnit))}
                                </p>
                                <span className="text-xs text-red-500 font-medium">ELIMINADO</span>
                              </div>
                            </div>
                          </div>
                        )
                      }
                      
                      return (
                        <div 
                          key={item.id} 
                          className={`rounded-xl border transition-all ${
                            isOutOfStock ? 'bg-red-50 border-red-300' :
                            isPartialStock ? 'bg-amber-50 border-amber-300' :
                            'bg-gray-50 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          <div className="flex items-center gap-4 p-4">
                            <div className={`flex-shrink-0 w-16 h-16 rounded-lg flex items-center justify-center ${
                              isOutOfStock ? 'bg-red-100' :
                              isPartialStock ? 'bg-amber-100' :
                              'bg-purple-100'
                            }`}>
                              {hasIssue ? (
                                isOutOfStock ? (
                                  <XCircle className="w-8 h-8 text-red-600" />
                                ) : (
                                  <AlertTriangle className="w-8 h-8 text-amber-600" />
                                )
                              ) : (
                                <Package className="w-8 h-8 text-purple-600" />
                              )}
                            </div>
                            <div className="flex-1">
                              <h4 className={`font-semibold ${hasIssue ? 'text-gray-700' : 'text-gray-900'}`}>
                                {item.productName}
                              </h4>
                              <p className="text-xs text-gray-600">
                                {item.quantity} {item.product?.unit || 'und'} × {formatPrice(item.pricePerUnit)}
                              </p>
                              {item.itemNote && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Nota: {item.itemNote}
                                </p>
                              )}
                              
                              {/* Mostrar el problema */}
                              {hasIssue && (
                                <div className={`mt-2 p-2 rounded-lg text-sm ${
                                  isOutOfStock ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {isOutOfStock ? (
                                    <span>❌ <strong>Sin stock</strong> - Este producto no está disponible</span>
                                  ) : (
                                    <span>⚠️ <strong>Stock parcial</strong> - Solo hay {issue?.availableQty} de {issue?.requestedQty} disponibles</span>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="text-right">
                              <p className={`font-bold text-sm ${hasIssue ? 'text-gray-400 line-through' : 'text-purple-600'}`}>
                                {formatPrice(item.subtotal)}
                              </p>
                              {!hasIssue && (
                                <CheckCircle className="w-5 h-5 text-green-500 mt-1 ml-auto" />
                              )}
                            </div>
                          </div>
                          
                          {/* Opciones para productos con problemas */}
                          {hasIssue && (
                            <div className="border-t border-gray-200 p-3 bg-white/50 rounded-b-xl">
                              <p className="text-xs text-gray-600 mb-2 font-medium">¿Qué deseas hacer?</p>
                              <div className="flex flex-wrap gap-2">
                                {isPartialStock && (
                                  <button
                                    onClick={() => handleAcceptPartial(item.id, item.productName, issue?.availableQty || 0)}
                                    disabled={removingItem === item.id}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-100 text-amber-800 hover:bg-amber-200 rounded-lg transition-colors disabled:opacity-50"
                                  >
                                    {removingItem === item.id ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <RefreshCcw className="w-3 h-3" />
                                    )}
                                    Aceptar {issue?.availableQty} unidades
                                  </button>
                                )}
                                <button
                                  onClick={() => openSubstituteSelector(item.id, item.productName, item.productId, item.quantity)}
                                  disabled={removingItem === item.id}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 rounded-lg transition-colors disabled:opacity-50"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                  Sustituir producto
                                </button>
                                <button
                                  onClick={() => openDeleteModal(item.id, item.productName)}
                                  disabled={removingItem === item.id}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-100 text-red-800 hover:bg-red-200 rounded-lg transition-colors disabled:opacity-50"
                                >
                                  {removingItem === item.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-3 h-3" />
                                  )}
                                  Eliminar producto
                                </button>
                                <button
                                  onClick={() => handleContactSellerAboutIssue(item.productName, issue?.issueType || '')}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-purple-100 text-purple-800 hover:bg-purple-200 rounded-lg transition-colors"
                                >
                                  <MessageCircle className="w-3 h-3" />
                                  Contactar vendedor
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                    
                    {/* Resumen de totales - solo contar items activos */}
                    <div className="mt-6 pt-4 border-t space-y-2 text-sm">
                      <div className="flex justify-between text-gray-600">
                        <span>Subtotal:</span>
                        <span>
                          {formatPrice(selectedOrder.orderItems?.filter(i => !i.isDeleted).reduce((sum, item) => sum + Number(item.subtotal), 0) || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Impuestos (10%):</span>
                        <span>
                          {formatPrice((selectedOrder.orderItems?.filter(i => !i.isDeleted).reduce((sum, item) => sum + Number(item.subtotal), 0) || 0) * 0.1)}
                        </span>
                      </div>
                      
                      {/* Mostrar total antes de créditos si hay créditos aplicados */}
                      {selectedOrder.creditNoteUsages && selectedOrder.creditNoteUsages.length > 0 && (
                        <>
                          <div className="flex justify-between text-gray-900 font-semibold pt-2 border-t">
                            <span>Total Orden:</span>
                            <span>
                              {formatPrice((selectedOrder.orderItems?.filter(i => !i.isDeleted).reduce((sum, item) => sum + Number(item.subtotal), 0) || 0) * 1.1)}
                            </span>
                          </div>
                          
                          {/* Créditos aplicados */}
                          <div className="bg-green-50 rounded-lg p-3 space-y-2 border border-green-200">
                            <div className="font-semibold text-green-800 text-sm">Créditos Aplicados:</div>
                            {selectedOrder.creditNoteUsages.map((usage) => (
                              <div key={usage.id} className="flex justify-between text-xs">
                                <span className="text-green-700">{usage.creditNote.creditNoteNumber}:</span>
                                <span className="text-green-700 font-semibold">
                                  -{formatPrice(usage.amountUsed)}
                                </span>
                              </div>
                            ))}
                            <div className="flex justify-between text-green-800 font-bold pt-2 border-t border-green-300 text-xs">
                              <span>Total Crédito:</span>
                              <span>
                                -{formatPrice(selectedOrder.creditNoteUsages.reduce((sum, usage) => sum + Number(usage.amountUsed), 0))}
                              </span>
                            </div>
                          </div>
                        </>
                      )}
                      
                      <div className="flex justify-between text-lg font-bold text-purple-600 pt-2 border-t">
                        <span>Total {selectedOrder.creditNoteUsages && selectedOrder.creditNoteUsages.length > 0 ? 'a Pagar' : ''}:</span>
                        <span>{formatPrice(selectedOrder.totalAmount)}</span>
                      </div>
                    </div>

                    {/* Notas de la orden */}
                    {selectedOrder.notes && (
                      <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                        <h4 className="font-semibold text-yellow-900 mb-2">Notas:</h4>
                        <p className="text-yellow-800 text-sm">{selectedOrder.notes}</p>
                      </div>
                    )}

                    {/* Instrucciones de entrega */}
                    {selectedOrder.deliveryInstructions && (
                      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <h4 className="font-semibold text-blue-900 mb-2">Instrucciones de entrega:</h4>
                        <p className="text-blue-800 text-sm">{selectedOrder.deliveryInstructions}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab: Estado */}
                {activeTab === 'estado' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-4">
                        Estado actual
                      </h3>
                      {(() => {
                        const config = statusConfig[selectedOrder.status as keyof typeof statusConfig] || statusConfig.PENDING
                        const StatusIcon = config.icon
                        return (
                          <div className={`p-6 rounded-xl ${config.bg} border ${config.border}`}>
                            <div className="flex items-center gap-4">
                              {/* Animación personalizada según el estado */}
                              <div className="flex-shrink-0">
                                {selectedOrder.status === 'CONFIRMED' && (
                                  <div className="relative w-24 h-24">
                                    <svg viewBox="0 0 100 100" className="w-full h-full">
                                      {/* Clipboard/Lista */}
                                      <rect x="25" y="15" width="50" height="70" fill="#fff" stroke="#3b82f6" strokeWidth="2" rx="3" />
                                      <rect x="35" y="10" width="30" height="8" fill="#3b82f6" rx="2" />
                                      
                                      {/* Items de la lista con checkmarks animados */}
                                      {/* Item 1 - Ya marcado */}
                                      <circle cx="35" cy="30" r="4" fill="#10b981" />
                                      <path d="M 33 30 L 35 32 L 38 28" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                                      <line x1="42" y1="30" x2="65" y2="30" stroke="#d1d5db" strokeWidth="2" />
                                      
                                      {/* Item 2 - Marcándose (animado) */}
                                      <circle cx="35" cy="45" r="4" fill="#10b981">
                                        <animate attributeName="fill" values="#e5e7eb;#10b981" dur="2s" begin="0s" fill="freeze" />
                                      </circle>
                                      <path d="M 33 45 L 35 47 L 38 43" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round">
                                        <animate attributeName="stroke-dasharray" values="0,20;20,0" dur="2s" begin="0s" fill="freeze" />
                                        <animate attributeName="stroke-dashoffset" values="20;0" dur="2s" begin="0s" fill="freeze" />
                                      </path>
                                      <line x1="42" y1="45" x2="65" y2="45" stroke="#d1d5db" strokeWidth="2" />
                                      
                                      {/* Item 3 - Por marcar (loop) */}
                                      <circle cx="35" cy="60" r="4" fill="#e5e7eb">
                                        <animate attributeName="fill" values="#e5e7eb;#e5e7eb;#10b981" dur="4s" begin="0s" repeatCount="indefinite" />
                                      </circle>
                                      <path d="M 33 60 L 35 62 L 38 58" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round">
                                        <animate attributeName="stroke-dasharray" values="0,20;0,20;20,0" dur="4s" begin="0s" repeatCount="indefinite" />
                                      </path>
                                      <line x1="42" y1="60" x2="65" y2="60" stroke="#d1d5db" strokeWidth="2" />
                                      
                                      {/* Item 4 - Por marcar */}
                                      <circle cx="35" cy="75" r="4" fill="#e5e7eb" />
                                      <line x1="42" y1="75" x2="65" y2="75" stroke="#d1d5db" strokeWidth="2" />
                                      
                                      {/* Estrella de confirmación */}
                                      <text x="72" y="25" fontSize="14" fill="#fbbf24" className="animate-ping">⭐</text>
                                    </svg>
                                  </div>
                                )}
                                
                                {selectedOrder.status === 'IN_DELIVERY' && (
                                  <div className="relative w-24 h-24">
                                    {/* Animación de camión moviéndose */}
                                    <svg viewBox="0 0 100 100" className="w-full h-full">
                                      {/* Carretera */}
                                      <line x1="0" y1="70" x2="100" y2="70" stroke="#9ca3af" strokeWidth="2" strokeDasharray="5,5">
                                        <animate attributeName="stroke-dashoffset" from="0" to="10" dur="0.5s" repeatCount="indefinite" />
                                      </line>
                                      
                                      {/* Camión animado */}
                                      <g className="animate-truck-move">
                                        {/* Cabina */}
                                        <rect x="10" y="50" width="15" height="15" fill="#8b5cf6" stroke="#6d28d9" strokeWidth="1.5" rx="2" />
                                        <rect x="12" y="52" width="5" height="5" fill="#ddd6fe" />
                                        {/* Contenedor */}
                                        <rect x="25" y="45" width="25" height="20" fill="#a78bfa" stroke="#6d28d9" strokeWidth="1.5" rx="2" />
                                        <line x1="32" y1="45" x2="32" y2="65" stroke="#6d28d9" strokeWidth="1" />
                                        <line x1="40" y1="45" x2="40" y2="65" stroke="#6d28d9" strokeWidth="1" />
                                        {/* Ruedas */}
                                        <circle cx="18" cy="68" r="4" fill="#374151" stroke="#1f2937" strokeWidth="1">
                                          <animateTransform attributeName="transform" type="rotate" from="0 18 68" to="360 18 68" dur="0.5s" repeatCount="indefinite" />
                                        </circle>
                                        <circle cx="42" cy="68" r="4" fill="#374151" stroke="#1f2937" strokeWidth="1">
                                          <animateTransform attributeName="transform" type="rotate" from="0 42 68" to="360 42 68" dur="0.5s" repeatCount="indefinite" />
                                        </circle>
                                        {/* Líneas de velocidad */}
                                        <line x1="5" y1="55" x2="0" y2="55" stroke="#8b5cf6" strokeWidth="2" opacity="0.5">
                                          <animate attributeName="x1" values="5;0;5" dur="0.3s" repeatCount="indefinite" />
                                          <animate attributeName="x2" values="0;-5;0" dur="0.3s" repeatCount="indefinite" />
                                        </line>
                                        <line x1="5" y1="60" x2="0" y2="60" stroke="#8b5cf6" strokeWidth="2" opacity="0.5">
                                          <animate attributeName="x1" values="5;0;5" dur="0.3s" repeatCount="indefinite" begin="0.1s" />
                                          <animate attributeName="x2" values="0;-5;0" dur="0.3s" repeatCount="indefinite" begin="0.1s" />
                                        </line>
                                      </g>
                                      
                                      {/* Nubes de fondo */}
                                      <ellipse cx="70" cy="20" rx="10" ry="6" fill="#e0e7ff" opacity="0.6">
                                        <animate attributeName="cx" values="70;75;70" dur="3s" repeatCount="indefinite" />
                                      </ellipse>
                                      <ellipse cx="85" cy="25" rx="8" ry="5" fill="#e0e7ff" opacity="0.6">
                                        <animate attributeName="cx" values="85;90;85" dur="4s" repeatCount="indefinite" />
                                      </ellipse>
                                    </svg>
                                  </div>
                                )}

                                {selectedOrder.status === 'DELIVERED' && (
                                  <div className="relative w-24 h-24">
                                    {/* Animación de paquete con check */}
                                    <svg viewBox="0 0 100 100" className="w-full h-full">
                                      {/* Paquete */}
                                      <rect x="30" y="35" width="40" height="40" fill="#10b981" stroke="#059669" strokeWidth="2" rx="4" className="animate-wiggle" />
                                      <line x1="50" y1="35" x2="50" y2="75" stroke="#059669" strokeWidth="2" />
                                      <line x1="30" y1="55" x2="70" y2="55" stroke="#059669" strokeWidth="2" />
                                      
                                      {/* Check grande animado */}
                                      <circle cx="50" cy="55" r="18" fill="#fff" opacity="0.9" className="animate-scale-in" />
                                      <path d="M 42 55 L 48 62 L 60 48" stroke="#10b981" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" className="animate-draw-check" />
                                      
                                      {/* Confeti */}
                                      <circle cx="25" cy="20" r="2" fill="#fbbf24" className="animate-confetti-1" />
                                      <circle cx="75" cy="25" r="2" fill="#ec4899" className="animate-confetti-2" />
                                      <circle cx="20" cy="80" r="2" fill="#3b82f6" className="animate-confetti-3" />
                                      <circle cx="80" cy="75" r="2" fill="#8b5cf6" className="animate-confetti-4" />
                                      <rect x="30" y="15" width="3" height="3" fill="#ef4444" className="animate-confetti-1" transform="rotate(45 31.5 16.5)" />
                                      <rect x="70" y="80" width="3" height="3" fill="#10b981" className="animate-confetti-2" transform="rotate(45 71.5 81.5)" />
                                    </svg>
                                  </div>
                                )}

                                {/* Para otros estados, mostrar el ícono normal */}
                                {!['CONFIRMED', 'IN_DELIVERY', 'DELIVERED'].includes(selectedOrder.status) && (
                                  <StatusIcon className={`w-12 h-12 ${config.color}`} />
                                )}
                              </div>
                              
                              <div>
                                <h4 className={`text-xl font-bold ${config.color}`}>
                                  {config.label}
                                </h4>
                                <p className="text-gray-700 mt-1">
                                  {config.description}
                                </p>
                              </div>
                            </div>
                          </div>
                        )
                      })()}
                    </div>

                    {/* Botón para marcar como recibida (solo si está EN_DELIVERY) */}
                    {selectedOrder.status === 'IN_DELIVERY' && (
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-6 animate-pulse">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0">
                            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                              <PackageCheck className="w-7 h-7 text-white" />
                            </div>
                          </div>
                          <div className="flex-1">
                            <h4 className="text-lg font-bold text-green-900 mb-2">
                              ¿Ya recibiste tu pedido?
                            </h4>
                            <p className="text-sm text-green-800 mb-4">
                              Una vez que confirmes que recibiste todos los productos, el vendedor será notificado automáticamente.
                            </p>
                            <button
                              onClick={() => markAsReceived(selectedOrder.id)}
                              className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-lg font-bold hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center gap-2"
                            >
                              <CheckCircle className="w-5 h-5" />
                              Confirmar que Recibí el Pedido
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Countdown para órdenes pendientes */}
                    {selectedOrder.status === 'PENDING' && selectedOrder.confirmationDeadline && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                        <OrderCountdown
                          orderId={selectedOrder.id}
                          deadline={selectedOrder.confirmationDeadline}
                          onCancel={cancelOrder}
                          onExpired={() => {
                            fetchOrders()
                            closeOrderModal()
                          }}
                        />
                      </div>
                    )}

                    {/* Información del vendedor */}
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-gray-900">Vendedor:</h4>
                        <button
                          onClick={() => handleContactSeller(selectedOrder)}
                          className="flex items-center gap-2 text-purple-600 hover:text-purple-700 text-sm font-medium"
                        >
                          <MessageCircle className="w-4 h-4" />
                          Contactar
                        </button>
                      </div>
                      <p className="text-gray-700">{selectedOrder.seller?.name}</p>
                      <p className="text-sm text-gray-600">{selectedOrder.seller?.email}</p>
                    </div>
                  </div>
                )}

                {/* Tab: Seguimiento */}
                {activeTab === 'seguimiento' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-gray-900">
                        Historial de la orden
                      </h3>
                      <button
                        onClick={() => fetchOrderHistory(selectedOrder.id)}
                        className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
                        disabled={loadingHistory}
                      >
                        <RefreshCw className={`w-4 h-4 ${loadingHistory ? 'animate-spin' : ''}`} />
                        Actualizar
                      </button>
                    </div>
                    
                    {/* Loading state */}
                    {loadingHistory && (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                        <span className="ml-2 text-gray-500">Cargando historial...</span>
                      </div>
                    )}

                    {/* Historial real de la base de datos */}
                    {!loadingHistory && orderHistory.length > 0 && (
                      <div className="relative">
                        {/* Línea vertical conectora */}
                        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                        
                        <div className="space-y-4">
                          {orderHistory.map((event, index) => {
                            // Determinar icono y color según el tipo de evento
                            let Icon = Clock
                            let bgColor = 'bg-gray-500'
                            let label = event.description
                            
                            if (event.type === 'STATUS_CHANGE') {
                              switch (event.newStatus) {
                                case 'PENDING':
                                  Icon = Clock
                                  bgColor = 'bg-yellow-500'
                                  break
                                case 'REVIEWING':
                                  Icon = Package
                                  bgColor = 'bg-blue-500'
                                  break
                                case 'ISSUE_REPORTED':
                                  Icon = AlertTriangle
                                  bgColor = 'bg-amber-500'
                                  break
                                case 'LOCKED':
                                  Icon = Package
                                  bgColor = 'bg-gray-600'
                                  break
                                case 'CONFIRMED':
                                  Icon = CheckCircle
                                  bgColor = 'bg-green-500'
                                  break
                                case 'PREPARING':
                                case 'PROCESSING':
                                  Icon = Package
                                  bgColor = 'bg-indigo-500'
                                  break
                                case 'READY_FOR_PICKUP':
                                  Icon = ShoppingBag
                                  bgColor = 'bg-cyan-500'
                                  break
                                case 'IN_DELIVERY':
                                  Icon = Truck
                                  bgColor = 'bg-purple-500'
                                  break
                                case 'DELIVERED':
                                case 'COMPLETED':
                                  Icon = PackageCheck
                                  bgColor = 'bg-green-600'
                                  break
                                case 'CANCELED':
                                case 'CANCELLED':
                                  Icon = XCircle
                                  bgColor = 'bg-red-500'
                                  break
                                default:
                                  Icon = Clock
                              }
                            } else if (event.type === 'PRODUCT_DELETED') {
                              Icon = Trash2
                              bgColor = 'bg-red-400'
                            } else if (event.type === 'PRODUCT_ADDED') {
                              Icon = Plus
                              bgColor = 'bg-green-400'
                            } else if (event.type === 'ORDER_CREATED') {
                              Icon = ShoppingBag
                              bgColor = 'bg-purple-500'
                            }

                            return (
                              <div key={event.id} className="flex items-start gap-4 relative">
                                <div className={`w-10 h-10 ${bgColor} rounded-full flex items-center justify-center text-white flex-shrink-0 z-10 shadow-md`}>
                                  <Icon className="w-5 h-5" />
                                </div>
                                <div className="flex-1 bg-gray-50 rounded-lg p-3 border border-gray-100">
                                  <p className="font-semibold text-gray-900">{label}</p>
                                  {event.notes && (
                                    <p className="text-sm text-gray-600 mt-1 italic">"{event.notes}"</p>
                                  )}
                                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                                    <span>
                                      {new Date(event.createdAt).toLocaleString('es-ES', {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </span>
                                    <span>•</span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                                      event.changedByRole === 'SELLER' ? 'bg-blue-100 text-blue-700' :
                                      event.changedByRole === 'CLIENT' || event.changedByRole === 'BUYER' ? 'bg-purple-100 text-purple-700' :
                                      'bg-gray-100 text-gray-700'
                                    }`}>
                                      {event.changedByRole === 'SELLER' ? '👤 Vendedor' :
                                       event.changedByRole === 'CLIENT' || event.changedByRole === 'BUYER' ? '🛒 Comprador' :
                                       '⚙️ Sistema'}
                                    </span>
                                    {event.changedByName && (
                                      <span className="text-gray-400">({event.changedByName})</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Sin historial */}
                    {!loadingHistory && orderHistory.length === 0 && (
                      <div className="text-center py-8">
                        <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">No hay actualizaciones registradas aún</p>
                        <p className="text-sm text-gray-400 mt-1">Las actualizaciones aparecerán aquí cuando el vendedor o tú realicen cambios</p>
                      </div>
                    )}

                    {/* Información de entrega */}
                    <div className="mt-6 bg-blue-50 rounded-xl p-4 border border-blue-200">
                      <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                        <Truck className="w-5 h-5" />
                        Información de entrega
                      </h4>
                      <p className="text-sm text-blue-800">
                        <strong>Dirección:</strong> {selectedOrder.client?.address || 'No especificada'}
                      </p>
                      <p className="text-sm text-blue-800 mt-1">
                        <strong>Teléfono:</strong> {selectedOrder.client?.phone || 'No especificado'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes orderPulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
          }
          50% {
            transform: scale(1.02);
            box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
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

        @keyframes statusPulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }

        @keyframes ping {
          75%, 100% {
            transform: scale(2);
            opacity: 0;
          }
        }

        /* Animaciones personalizadas para estados de orden */
        @keyframes truck-move {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(5px); }
        }

        .animate-truck-move {
          animation: truck-move 0.5s ease-in-out infinite;
        }

        @keyframes wiggle {
          0%, 100% { transform: rotate(-3deg); }
          50% { transform: rotate(3deg); }
        }

        .animate-wiggle {
          animation: wiggle 1s ease-in-out infinite;
        }

        @keyframes scale-in {
          0% { 
            transform: scale(0);
            opacity: 0;
          }
          50% {
            transform: scale(1.2);
          }
          100% { 
            transform: scale(1);
            opacity: 1;
          }
        }

        .animate-scale-in {
          animation: scale-in 0.8s ease-out;
        }

        @keyframes draw-check {
          0% {
            stroke-dasharray: 0, 100;
          }
          100% {
            stroke-dasharray: 100, 0;
          }
        }

        .animate-draw-check {
          stroke-dasharray: 100;
          animation: draw-check 0.8s ease-out 0.3s forwards;
        }

        @keyframes confetti-1 {
          0% { 
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% { 
            transform: translateY(-30px) rotate(180deg);
            opacity: 0;
          }
        }

        @keyframes confetti-2 {
          0% { 
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% { 
            transform: translateY(-40px) rotate(-180deg);
            opacity: 0;
          }
        }

        @keyframes confetti-3 {
          0% { 
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% { 
            transform: translateY(30px) rotate(90deg);
            opacity: 0;
          }
        }

        @keyframes confetti-4 {
          0% { 
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% { 
            transform: translateY(35px) rotate(-90deg);
            opacity: 0;
          }
        }

        .animate-confetti-1 {
          animation: confetti-1 2s ease-out infinite;
        }

        .animate-confetti-2 {
          animation: confetti-2 2.2s ease-out infinite;
        }

        .animate-confetti-3 {
          animation: confetti-3 1.8s ease-out infinite;
        }

        .animate-confetti-4 {
          animation: confetti-4 2.5s ease-out infinite;
        }
      `}</style>
    </div>
    
    {/* Modal de eliminación con motivo */}
    {showDeleteModal && deleteItemInfo && (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Eliminar producto</h3>
                <p className="text-sm text-gray-500">"{deleteItemInfo.productName}"</p>
              </div>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              Por favor, escribe el motivo por el que deseas eliminar este producto. 
              Este mensaje será enviado al vendedor.
            </p>
            
            <textarea
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="Ej: Ya no lo necesito, prefiero otro producto, precio muy alto..."
              className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
              rows={3}
            />
            
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setDeleteItemInfo(null)
                  setDeleteReason('')
                }}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={!deleteReason.trim() || removingItem === deleteItemInfo.itemId}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {removingItem === deleteItemInfo.itemId ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Eliminando...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Confirmar eliminación
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    
    {/* Modal de sustitución de producto */}
    {showSubstituteSelector && substituteItemInfo && (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {selectedSubstituteProduct ? (
                  <button
                    onClick={() => {
                      setSelectedSubstituteProduct(null)
                      setSubstituteQuantity(substituteItemInfo.originalQty || 1)
                    }}
                    className="p-2 hover:bg-gray-100 rounded-full"
                  >
                    <ChevronLeft className="w-6 h-6 text-gray-600" />
                  </button>
                ) : (
                  <div className="p-3 bg-blue-100 rounded-full">
                    <RefreshCw className="w-6 h-6 text-blue-600" />
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {selectedSubstituteProduct ? 'Seleccionar cantidad' : 'Sustituir producto'}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {selectedSubstituteProduct 
                      ? `${selectedSubstituteProduct.name}` 
                      : `Reemplazar "${substituteItemInfo.productName}"`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowSubstituteSelector(false)
                  setSubstituteItemInfo(null)
                  setCatalogSearch('')
                  setSelectedSubstituteProduct(null)
                  setSubstituteQuantity(1)
                }}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Buscador - solo visible si no hay producto seleccionado */}
            {!selectedSubstituteProduct && (
              <div className="mt-4 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  placeholder="Buscar producto alternativo..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}
          </div>
          
          {/* Contenido del modal */}
          <div className="flex-1 overflow-y-auto p-4">
            {selectedSubstituteProduct ? (
              /* Vista de selección de cantidad */
              <div className="space-y-6">
                {/* Info del producto seleccionado */}
                <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Package className="w-8 h-8 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900">{selectedSubstituteProduct.name}</h4>
                    <p className="text-sm text-gray-500">
                      SKU: {selectedSubstituteProduct.sku || 'N/A'} • Stock disponible: {selectedSubstituteProduct.stock} {selectedSubstituteProduct.unit || 'und'}
                    </p>
                    <p className="text-lg font-bold text-blue-600 mt-1">
                      {formatPrice(selectedSubstituteProduct.price)} <span className="text-sm font-normal text-gray-500">/{selectedSubstituteProduct.unit || 'und'}</span>
                    </p>
                  </div>
                </div>

                {/* Control de cantidad */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <label htmlFor="substitute-quantity-input" className="block text-sm font-semibold text-gray-700 mb-3">
                    ¿Cuántas unidades deseas?
                  </label>
                  <div className="flex items-center justify-center gap-4">
                    <button
                      onClick={() => setSubstituteQuantity(Math.max(1, substituteQuantity - 1))}
                      disabled={substituteQuantity <= 1}
                      className="w-12 h-12 rounded-xl bg-white border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Minus className="w-5 h-5 text-gray-600" />
                    </button>
                    <input
                      id="substitute-quantity-input"
                      type="number"
                      value={substituteQuantity}
                      onChange={(e) => {
                        const val = Number.parseInt(e.target.value) || 1
                        const maxStock = selectedSubstituteProduct.stock || 999
                        setSubstituteQuantity(Math.min(Math.max(1, val), maxStock))
                      }}
                      className="w-24 h-12 text-center text-xl font-bold border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      min="1"
                      max={selectedSubstituteProduct.stock || 999}
                    />
                    <button
                      onClick={() => setSubstituteQuantity(Math.min(substituteQuantity + 1, selectedSubstituteProduct.stock || 999))}
                      disabled={substituteQuantity >= (selectedSubstituteProduct.stock || 999)}
                      className="w-12 h-12 rounded-xl bg-white border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-5 h-5 text-gray-600" />
                    </button>
                  </div>
                  <p className="text-center text-sm text-gray-500 mt-2">
                    {selectedSubstituteProduct.unit || 'unidades'}
                  </p>
                </div>

                {/* Resumen */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Subtotal:</span>
                    <span className="text-xl font-bold text-blue-600">
                      {formatPrice(selectedSubstituteProduct.price * substituteQuantity)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {substituteQuantity} × {formatPrice(selectedSubstituteProduct.price)}
                  </p>
                </div>
              </div>
            ) : (
              /* Vista de lista de productos */
              <>
                {loadingCatalog ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  </div>
                ) : filteredCatalogProducts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                    <p>No se encontraron productos disponibles</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {filteredCatalogProducts.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => handleSelectSubstituteProduct(product)}
                        disabled={removingItem === substituteItemInfo.itemId}
                        className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all text-left disabled:opacity-50"
                      >
                        <div className="w-14 h-14 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Package className="w-7 h-7 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 truncate">{product.name}</h4>
                          <p className="text-xs text-gray-500">
                            SKU: {product.sku || 'N/A'} • Stock: {product.stock} {product.unit || 'und'}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-blue-600">{formatPrice(product.price)}</p>
                          <p className="text-xs text-gray-500">/{product.unit || 'und'}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer con botón de confirmar - solo visible cuando hay producto seleccionado */}
          {selectedSubstituteProduct && (
            <div className="p-4 border-t bg-gray-50">
              <button
                onClick={handleConfirmSubstitute}
                disabled={removingItem === substituteItemInfo.itemId || substituteQuantity < 1}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {removingItem === substituteItemInfo.itemId ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Check className="w-5 h-5" />
                )}
                Confirmar sustitución
              </button>
            </div>
          )}
        </div>
      </div>
    )}
    
    {/* Modal de reordenar con selección de productos */}
    {showReorderModal && reorderOrder && (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col">
          <div className="p-6 border-b">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-100 rounded-full">
                <RotateCcw className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Reordenar Productos</h3>
                <p className="text-sm text-gray-500">Orden #{reorderOrder.orderNumber}</p>
              </div>
            </div>
          </div>
          
          {/* Verificar si hay productos activos */}
          {reorderOrder.orderItems.filter(i => !i.isDeleted).length === 0 ? (
            /* No hay productos - mostrar mensaje y opción de ir al catálogo */
            <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
              <div className="p-4 bg-amber-100 rounded-full mb-4">
                <Package className="w-12 h-12 text-amber-600" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                No hay productos disponibles
              </h4>
              <p className="text-gray-600 mb-6">
                Esta orden no tiene productos activos para reordenar. 
                Todos los productos fueron eliminados o están agotados.
              </p>
              <div className="space-y-3 w-full max-w-xs">
                <button
                  onClick={() => {
                    setShowReorderModal(false)
                    setReorderOrder(null)
                    router.push(`/buyer/catalog?seller=${reorderOrder.seller?.id || ''}`)
                  }}
                  className="w-full px-4 py-3 text-sm font-bold text-white bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <ShoppingBag className="w-4 h-4" />
                  Ir al Catálogo
                </button>
                <button
                  onClick={() => {
                    setShowReorderModal(false)
                    setReorderOrder(null)
                  }}
                  className="w-full px-4 py-3 text-sm font-medium text-gray-600 bg-white border-2 border-gray-200 hover:bg-gray-50 rounded-xl transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          ) : (
            /* Hay productos - mostrar lista normal */
            <>
              <div className="p-4 border-b bg-gray-50">
                <label htmlFor="select-all-reorder-items" className="flex items-center gap-3 cursor-pointer">
                  <input
                    id="select-all-reorder-items"
                    type="checkbox"
                    checked={selectedReorderItems.size === reorderOrder.orderItems.filter(i => !i.isDeleted).length}
                    onChange={toggleAllReorderItems}
                    className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="font-medium text-gray-700">
                    Seleccionar todos ({selectedReorderItems.size} de {reorderOrder.orderItems.filter(i => !i.isDeleted).length})
                  </span>
                </label>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-2">
                  {reorderOrder.orderItems.map(item => {
                    if (item.isDeleted) return null
                    const isSelected = selectedReorderItems.has(item.id)
                    
                    return (
                      <label 
                        key={item.id}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                          isSelected 
                            ? 'border-emerald-300 bg-emerald-50' 
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleReorderItem(item.id)}
                          className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium truncate ${isSelected ? 'text-emerald-800' : 'text-gray-900'}`}>
                            {item.productName}
                          </p>
                          <p className="text-sm text-gray-500">
                            {item.quantity} {item.product?.unit || 'unid.'} • {formatPrice(item.pricePerUnit)} c/u
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold ${isSelected ? 'text-emerald-600' : 'text-gray-700'}`}>
                            {formatPrice(item.subtotal)}
                          </p>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>
              
              <div className="p-4 border-t bg-gray-50">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-gray-600">Productos seleccionados:</span>
                  <span className="font-bold text-lg text-emerald-600">
                    {selectedReorderItems.size} productos
                  </span>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowReorderModal(false)
                      setReorderOrder(null)
                      setSelectedReorderItems(new Set())
                    }}
                    className="flex-1 px-4 py-3 text-sm font-medium text-gray-600 bg-white border-2 border-gray-200 hover:bg-gray-50 rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmReorder}
                    disabled={selectedReorderItems.size === 0 || reordering}
                    className="flex-1 px-4 py-3 text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {reordering ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Agregando...
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="w-4 h-4" />
                        Agregar al Carrito
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    )}
    
    {/* Modal de opciones de contacto */}
    {showContactModal && contactOrderInfo && (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-purple-100 rounded-full">
                <MessageCircle className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Contactar vendedor</h3>
                <p className="text-sm text-gray-500">{contactOrderInfo.seller?.name}</p>
              </div>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              Orden #{contactOrderInfo.orderNumber}
            </p>
            
            <div className="space-y-3">
              {/* Opción Chat interno */}
              <button
                onClick={handleContactViaChat}
                className="w-full flex items-center gap-3 p-4 border-2 border-purple-200 rounded-xl hover:border-purple-400 hover:bg-purple-50 transition-all"
              >
                <div className="p-2 bg-purple-100 rounded-lg">
                  <MessageCircle className="w-5 h-5 text-purple-600" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">Chat dentro de la app</p>
                  <p className="text-xs text-gray-500">Mensajes internos con el vendedor</p>
                </div>
              </button>
              
              {/* Opción WhatsApp */}
              <button
                onClick={handleContactViaWhatsApp}
                className="w-full flex items-center gap-3 p-4 border-2 border-green-200 rounded-xl hover:border-green-400 hover:bg-green-50 transition-all"
              >
                <div className="p-2 bg-green-100 rounded-lg">
                  <svg className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">WhatsApp</p>
                  <p className="text-xs text-gray-500">
                    {contactOrderInfo.seller?.phone || 'Número no disponible'}
                  </p>
                </div>
              </button>
            </div>
            
            <button
              onClick={() => {
                setShowContactModal(false)
                setContactOrderInfo(null)
              }}
              className="w-full mt-4 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}

// Loading fallback para Suspense
function OrdersPageLoading() {
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={`skeleton-${i}`} className="bg-white rounded-lg p-4 h-48">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Export default con Suspense para useSearchParams
export default function OrdersPage() {
  return (
    <Suspense fallback={<OrdersPageLoading />}>
      <OrdersPageContent />
    </Suspense>
  )
}