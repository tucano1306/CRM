'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { v4 as uuidv4 } from 'uuid'
import { apiCall, getErrorMessage } from '@/lib/api-client'
import { useRealtimeSubscription, RealtimeEvents } from '@/lib/supabase-realtime'
import { formatPrice, formatNumber } from '@/lib/utils'
import { downloadInvoice, openInvoiceInNewTab, type InvoiceData } from '@/lib/invoiceGenerator'
import {
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Loader,
  ShoppingBag,
  DollarSign,
  Calendar,
  Loader2,
  AlertCircle,
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
  Star,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  BarChart3,
} from 'lucide-react'
import OrderCountdown from '@/components/buyer/OrderCountdown'
import { OrderCardSkeleton } from '@/components/skeletons'

type OrderStatus = 
  | 'PENDING' 
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
  product: {
    sku?: string | null
    unit: string
  }
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
  }
  rating?: number | null
  ratingComment?: string | null
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

export default function OrdersPage() {
  const router = useRouter()
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

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [generatingInvoice, setGeneratingInvoice] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<'ALL' | OrderStatus>('ALL')
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'productos' | 'estado' | 'seguimiento'>('productos')
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [hoveredRating, setHoveredRating] = useState(0)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastStatus, setToastStatus] = useState('')
  
  // Paginación y filtro por fecha
  const [currentPage, setCurrentPage] = useState(1)
  const [dateRange, setDateRange] = useState<'7days' | '30days' | '90days' | 'all'>('30days')
  const ordersPerPage = 10

  useEffect(() => {
    fetchOrders()
  }, [])

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

  const showUpdateToast = (status: string) => {
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
    const taxRate = 0.10
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

  const handleDownloadInvoice = async (order: Order) => {
    try {
      setGeneratingInvoice(order.id)
      const invoiceData = prepareInvoiceData(order)
      downloadInvoice(invoiceData, `Factura-${order.orderNumber}.pdf`)
    } catch (error) {
      console.error('Error generando factura:', error)
      alert('Error al generar la factura')
    } finally {
      setGeneratingInvoice(null)
    }
  }

  const handleViewInvoice = async (order: Order) => {
    try {
      setGeneratingInvoice(order.id)
      const invoiceData = prepareInvoiceData(order)
      openInvoiceInNewTab(invoiceData)
    } catch (error) {
      console.error('Error generando factura:', error)
      alert('Error al generar la factura')
    } finally {
      setGeneratingInvoice(null)
    }
  }

  const openOrderModal = (order: Order) => {
    setSelectedOrder(order)
    setShowOrderModal(true)
    setActiveTab('productos')
  }

  const closeOrderModal = () => {
    setShowOrderModal(false)
    setSelectedOrder(null)
  }

  // ✅ confirmOrder CON TIMEOUT
  const confirmOrder = async (orderId: string) => {
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
    
    if (confirm('¿Quieres agregar todos los productos de esta orden al carrito?')) {
      try {
        let addedCount = 0
        
        // Agregar cada producto de la orden al carrito
        for (const item of order.orderItems) {
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
      }
    }
  }

  const handleQuickInvoice = async (order: Order, e: React.MouseEvent) => {
    e.stopPropagation()
    await handleViewInvoice(order)
  }

  const handleContactSeller = (order: Order, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    // Redirigir al chat con el vendedor
    if (order.seller?.id) {
      router.push(`/buyer/chat?seller=${order.seller.id}&order=${order.id}`)
    } else {
      alert('No se puede contactar al vendedor en este momento')
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
        const daysAgo = dateRange === '7days' ? 7 : dateRange === '30days' ? 30 : 90
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
        toDate.setHours(23, 59, 59, 999) // Incluir todo el día
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

      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-purple-50 p-6">
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
              className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-lg hover:shadow-lg transform hover:-translate-y-0.5 transition-all font-semibold"
            >
              Nueva orden
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
              onChange={(e) => setSortBy(e.target.value as any)}
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
              onChange={(e) => setDateRange(e.target.value as any)}
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

              return viewMode === 'grid' ? (
                // Vista GRID (Card)
                <div
                  key={order.id}
                  className="bg-white rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all p-6 border-2 border-purple-200 hover:border-purple-300 relative"
                  style={needsAttention ? {
                    animation: 'orderPulse 3s ease-in-out infinite',
                  } : {}}
                >
                  {/* Sticker de Recibida */}
                  {isCompleted && (
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
                  <div className="flex items-start justify-between mb-4">
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
                  <div className="flex gap-2">
                    {/* Botón cancelar para PENDING y CONFIRMED */}
                    {(order.status === 'PENDING' || order.status === 'CONFIRMED') && (
                      <button 
                        onClick={(e) => handleQuickCancel(order.id, e)}
                        className="flex-1 bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-200 text-red-600 py-2 rounded-lg hover:border-red-300 hover:shadow-lg transition-all font-medium text-sm flex items-center justify-center gap-2"
                      >
                        <XCircle className="w-4 h-4" />
                        Cancelar
                      </button>
                    )}
                    
                    {(order.status === 'CONFIRMED' || order.status === 'PREPARING' || order.status === 'IN_DELIVERY') && (
                      <button 
                        onClick={(e) => handleQuickTrack(order, e)}
                        className="flex-1 bg-gradient-to-br from-cyan-50 to-blue-50 border-2 border-cyan-200 text-cyan-600 py-2 rounded-lg hover:border-cyan-300 hover:shadow-lg transition-all font-medium text-sm flex items-center justify-center gap-2"
                      >
                        <MapPin className="w-4 h-4" />
                        Rastrear
                      </button>
                    )}
                    
                    {(order.status === 'DELIVERED' || order.status === 'COMPLETED') && (
                      <>
                        <button 
                          onClick={(e) => handleQuickReorder(order, e)}
                          className="flex-1 bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 text-emerald-600 py-2 rounded-lg hover:border-emerald-300 hover:shadow-lg transition-all font-medium text-sm flex items-center justify-center gap-2"
                        >
                          <RotateCcw className="w-4 h-4" />
                          Reordenar
                        </button>
                        <button 
                          onClick={(e) => handleQuickInvoice(order, e)}
                          className="flex-1 bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-200 text-purple-600 py-2 rounded-lg hover:border-purple-300 hover:shadow-lg transition-all font-medium text-sm flex items-center justify-center gap-2"
                        >
                          <FileText className="w-4 h-4" />
                          Factura
                        </button>
                      </>
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
                    <div className="flex gap-2 flex-shrink-0">
                      {/* Botón cancelar para PENDING y CONFIRMED */}
                      {(order.status === 'PENDING' || order.status === 'CONFIRMED') && (
                        <button 
                          onClick={(e) => handleQuickCancel(order.id, e)}
                          className="bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-200 text-red-600 p-2 rounded-lg hover:border-red-300 hover:shadow-lg transition-all"
                          title="Cancelar orden"
                        >
                          <XCircle className="w-5 h-5" />
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
                      
                      {(order.status === 'DELIVERED' || order.status === 'COMPLETED') && (
                        <>
                          <button 
                            onClick={(e) => handleQuickReorder(order, e)}
                            className="bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 text-emerald-600 p-2 rounded-lg hover:border-emerald-300 hover:shadow-lg transition-all"
                            title="Reordenar"
                          >
                            <RotateCcw className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={(e) => handleQuickInvoice(order, e)}
                            className="bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-200 text-purple-600 p-2 rounded-lg hover:border-purple-300 hover:shadow-lg transition-all"
                            title="Ver factura"
                          >
                            <FileText className="w-5 h-5" />
                          </button>
                        </>
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
            onClick={closeOrderModal}
          >
            <div 
              className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 rounded-t-2xl sticky top-0 z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">
                      {selectedOrder.orderNumber || `#${selectedOrder.id.slice(0, 8)}`}
                    </h2>
                    <p className="text-purple-100">
                      {new Date(selectedOrder.createdAt).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <button 
                    onClick={closeOrderModal} 
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
              
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
                  onClick={() => setActiveTab('seguimiento')}
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
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                      Productos de la orden
                    </h3>
                    {selectedOrder.orderItems?.map((item) => (
                      <div 
                        key={item.id} 
                        className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex-shrink-0 w-16 h-16 bg-purple-100 rounded-lg flex items-center justify-center">
                          <Package className="w-8 h-8 text-purple-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">
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
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-purple-600 text-sm">
                            {formatPrice(item.subtotal)}
                          </p>
                        </div>
                      </div>
                    ))}
                    
                    {/* Resumen de totales */}
                    <div className="mt-6 pt-4 border-t space-y-2 text-sm">
                      <div className="flex justify-between text-gray-600">
                        <span>Subtotal:</span>
                        <span>
                          {formatPrice(selectedOrder.orderItems?.reduce((sum, item) => sum + Number(item.subtotal), 0) || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Impuestos (10%):</span>
                        <span>
                          {formatPrice((selectedOrder.orderItems?.reduce((sum, item) => sum + Number(item.subtotal), 0) || 0) * 0.1)}
                        </span>
                      </div>
                      
                      {/* Mostrar total antes de créditos si hay créditos aplicados */}
                      {selectedOrder.creditNoteUsages && selectedOrder.creditNoteUsages.length > 0 && (
                        <>
                          <div className="flex justify-between text-gray-900 font-semibold pt-2 border-t">
                            <span>Total Orden:</span>
                            <span>
                              {formatPrice((selectedOrder.orderItems?.reduce((sum, item) => sum + Number(item.subtotal), 0) || 0) * 1.1)}
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

                    {/* Acciones */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleViewInvoice(selectedOrder)}
                        disabled={generatingInvoice === selectedOrder.id}
                        className="flex-1 bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 transition-colors font-semibold disabled:opacity-50"
                      >
                        {generatingInvoice === selectedOrder.id ? 'Generando...' : 'Ver Factura'}
                      </button>
                      <button
                        onClick={() => handleDownloadInvoice(selectedOrder)}
                        disabled={generatingInvoice === selectedOrder.id}
                        className="flex-1 bg-gray-600 text-white px-4 py-3 rounded-lg hover:bg-gray-700 transition-colors font-semibold disabled:opacity-50"
                      >
                        Descargar PDF
                      </button>
                    </div>
                  </div>
                )}

                {/* Tab: Seguimiento */}
                {activeTab === 'seguimiento' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                      Historial de la orden
                    </h3>
                    
                    {/* Timeline visual mejorado */}
                    <div className="space-y-4">
                      {/* Estado: Orden Confirmada */}
                      {(selectedOrder.status === 'CONFIRMED' || 
                        selectedOrder.status === 'PREPARING' || 
                        selectedOrder.status === 'PROCESSING' ||
                        selectedOrder.status === 'READY_FOR_PICKUP' ||
                        selectedOrder.status === 'IN_DELIVERY' ||
                        selectedOrder.status === 'DELIVERED' ||
                        selectedOrder.status === 'COMPLETED') && (
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white flex-shrink-0">
                            <CheckCircle className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">Orden Confirmada</p>
                            <p className="text-sm text-gray-500">
                              {new Date(selectedOrder.createdAt).toLocaleString('es-ES', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Estado: En Preparación */}
                      {(selectedOrder.status === 'PREPARING' || 
                        selectedOrder.status === 'PROCESSING' ||
                        selectedOrder.status === 'READY_FOR_PICKUP' ||
                        selectedOrder.status === 'IN_DELIVERY' ||
                        selectedOrder.status === 'DELIVERED' ||
                        selectedOrder.status === 'COMPLETED') && (
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white flex-shrink-0">
                            <Package className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">En Preparación</p>
                            <p className="text-sm text-gray-500">Tu pedido está siendo preparado</p>
                          </div>
                        </div>
                      )}

                      {/* Estado: En Camino */}
                      {(selectedOrder.status === 'IN_DELIVERY' ||
                        selectedOrder.status === 'DELIVERED' ||
                        selectedOrder.status === 'COMPLETED') ? (
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white flex-shrink-0">
                            <Truck className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">En Camino</p>
                            <p className="text-sm text-gray-500">Tu pedido está siendo entregado</p>
                          </div>
                        </div>
                      ) : selectedOrder.status !== 'PENDING' && selectedOrder.status !== 'CANCELED' && selectedOrder.status !== 'CANCELLED' && (
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                            <Truck className="w-6 h-6 text-gray-500" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-400">En Camino</p>
                            <p className="text-sm text-gray-400">Estimado: Próximamente</p>
                          </div>
                        </div>
                      )}

                      {/* Estado: Entregado */}
                      {(selectedOrder.status === 'DELIVERED' || selectedOrder.status === 'COMPLETED') ? (
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-white flex-shrink-0">
                            <PackageCheck className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">Entregado</p>
                            <p className="text-sm text-gray-500">Tu pedido fue entregado con éxito</p>
                          </div>
                        </div>
                      ) : selectedOrder.status !== 'PENDING' && selectedOrder.status !== 'CANCELED' && selectedOrder.status !== 'CANCELLED' && (
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                            <PackageCheck className="w-6 h-6 text-gray-500" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-400">Entregado</p>
                            <p className="text-sm text-gray-400">Pendiente de entrega</p>
                          </div>
                        </div>
                      )}

                      {/* Estado: Pendiente */}
                      {selectedOrder.status === 'PENDING' && (
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center text-white flex-shrink-0 animate-pulse">
                            <Clock className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">Esperando Confirmación</p>
                            <p className="text-sm text-gray-500">El vendedor revisará tu orden pronto</p>
                          </div>
                        </div>
                      )}

                      {/* Estado: Cancelado */}
                      {(selectedOrder.status === 'CANCELED' || selectedOrder.status === 'CANCELLED') && (
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center text-white flex-shrink-0">
                            <XCircle className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">Orden Cancelada</p>
                            <p className="text-sm text-gray-500">Esta orden fue cancelada</p>
                          </div>
                        </div>
                      )}
                    </div>

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
    </>
  )
}