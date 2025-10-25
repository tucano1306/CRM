'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { v4 as uuidv4 } from 'uuid'
import { apiCall, getErrorMessage } from '@/lib/api-client'
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
    label: 'Entregado',
    description: 'Tu pedido fue entregado',
    icon: PackageCheck,
    color: 'text-teal-600',
    bg: 'bg-teal-50',
    border: 'border-teal-200',
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
  const [ratingOrder, setRatingOrder] = useState<string | null>(null)
  const [selectedRating, setSelectedRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastStatus, setToastStatus] = useState('')

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
    const total = subtotal + taxAmount

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
      const result = await apiCall(`/api/orders/${orderId}/cancel`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          idempotencyKey: uuidv4(),
          reason 
        }),
        timeout: 5000,
      })

      if (result.success) {
        alert('✅ Orden cancelada')
        fetchOrders()
      } else {
        alert(result.error || 'Error cancelando orden')
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
      router.push(`/chat?seller=${order.seller.id}&order=${order.id}`)
    } else {
      alert('No se puede contactar al vendedor en este momento')
    }
  }

  const handleRateOrder = async (orderId: string, rating: number) => {
    try {
      const result = await apiCall(`/api/orders/${orderId}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating }),
        timeout: 5000,
      })

      if (result.success) {
        alert('✅ Gracias por tu calificación!')
        setRatingOrder(null)
        setSelectedRating(0)
        fetchOrders()
      } else {
        alert(result.error || 'Error al calificar la orden')
      }
    } catch (err) {
      alert(getErrorMessage(err))
    }
  }

  // ✅ ESTADO DE LOADING
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
              <ShoppingBag className="text-purple-600" size={32} />
              Mis Órdenes
            </h1>
            <p className="text-gray-600 mt-1">Cargando órdenes...</p>
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
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 p-6 flex items-center justify-center">
        <div className="max-w-md bg-white rounded-2xl shadow-lg p-8 border border-yellow-200">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="h-8 w-8 text-yellow-600" />
            <h2 className="text-xl font-bold text-yellow-900">
              Tiempo de espera excedido
            </h2>
          </div>
          <p className="text-gray-700 mb-6">
            La carga de órdenes está tardando más de lo esperado.
          </p>
          <button
            onClick={fetchOrders}
            className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition-colors font-semibold"
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
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 p-6 flex items-center justify-center">
        <div className="max-w-md bg-white rounded-2xl shadow-lg p-8 border border-red-200">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="h-8 w-8 text-red-600" />
            <h2 className="text-xl font-bold text-red-900">Error</h2>
          </div>
          <p className="text-gray-700 mb-6">{error}</p>
          <button
            onClick={fetchOrders}
            className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition-colors font-semibold"
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

      // Filtro por rango de fechas
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

  return (
    <>
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg z-50 animate-slide-in">
          <p className="font-medium">{toastMessage}</p>
          <p className="text-sm">Estado: {toastStatus}</p>
        </div>
      )}

      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-purple-100">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                <ShoppingBag className="text-purple-600" size={32} />
                Mis Órdenes
              </h1>
              <p className="text-gray-600 mt-1">
                {orders.length} {orders.length === 1 ? 'orden' : 'órdenes'}
              </p>
            </div>
            <button
              onClick={() => router.push('/buyer/catalog')}
              className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors font-semibold"
            >
              Nueva orden
            </button>
          </div>
        </div>

        {/* Resumen Financiero */}
        {orders.length > 0 && (() => {
          const stats = getMonthlyStats()
          return (
            <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl shadow-lg p-6 mb-6 border border-purple-200">
              <h3 className="font-bold text-lg mb-4 text-gray-800">Resumen del mes</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                <div className="bg-white/50 rounded-lg p-4">
                  <p className="text-3xl font-bold text-purple-600">{stats.totalOrders}</p>
                  <p className="text-sm text-gray-600 mt-1">Órdenes</p>
                </div>
                <div className="bg-white/50 rounded-lg p-4">
                  <p className="text-3xl font-bold text-green-600">${stats.totalSpent.toFixed(2)}</p>
                  <p className="text-sm text-gray-600 mt-1">Gastado</p>
                </div>
                <div className="bg-white/50 rounded-lg p-4">
                  <p className="text-3xl font-bold text-blue-600">${stats.estimatedSavings.toFixed(2)}</p>
                  <p className="text-sm text-gray-600 mt-1">Ahorrado</p>
                </div>
                <div className="bg-white/50 rounded-lg p-4">
                  <p className="text-3xl font-bold text-orange-600">${stats.averageOrder.toFixed(2)}</p>
                  <p className="text-sm text-gray-600 mt-1">Promedio</p>
                </div>
              </div>
            </div>
          )
        })()}

        {/* Buscador y Filtros */}
        <div className="bg-white rounded-2xl shadow-lg p-4 mb-6 border border-purple-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-700">Filtros de búsqueda</h3>
            {/* Toggle Vista Grid/List */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 mr-2">Vista:</span>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'grid' 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title="Vista en cuadrícula"
              >
                <Grid3x3 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por número de orden..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              />
            </div>
            
            {/* Rango de fechas */}
            <div className="flex gap-2">
              <input 
                type="date" 
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none" 
                placeholder="Desde"
              />
              <input 
                type="date" 
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none" 
                placeholder="Hasta"
              />
            </div>
            
            {/* Ordenar por */}
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none bg-white"
            >
              <option value="newest">Más recientes</option>
              <option value="oldest">Más antiguos</option>
              <option value="highest">Mayor monto</option>
              <option value="lowest">Menor monto</option>
            </select>
          </div>

          {/* Indicador de resultados filtrados */}
          {(searchQuery || dateFrom || dateTo || filterStatus !== 'ALL') && (
            <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Mostrando <strong>{filteredAndSortedOrders.length}</strong> de <strong>{orders.length}</strong> órdenes
              </p>
              <button
                onClick={() => {
                  setSearchQuery('')
                  setDateFrom('')
                  setDateTo('')
                  setFilterStatus('ALL')
                  setSortBy('newest')
                }}
                className="text-sm text-purple-600 hover:text-purple-700 font-medium"
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
              className={`px-6 py-3 rounded-lg font-medium transition-colors whitespace-nowrap ${
                filterStatus === 'ALL'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Todas ({orders.length})
            </button>
            <button
              onClick={() => setFilterStatus('PENDING')}
              className={`px-6 py-3 rounded-lg font-medium transition-colors whitespace-nowrap ${
                filterStatus === 'PENDING'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Pendientes ({orders.filter(o => o.status === 'PENDING').length})
            </button>
            <button
              onClick={() => setFilterStatus('CONFIRMED')}
              className={`px-6 py-3 rounded-lg font-medium transition-colors whitespace-nowrap ${
                filterStatus === 'CONFIRMED'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Confirmadas ({orders.filter(o => o.status === 'CONFIRMED').length})
            </button>
            <button
              onClick={() => setFilterStatus('PREPARING')}
              className={`px-6 py-3 rounded-lg font-medium transition-colors whitespace-nowrap ${
                filterStatus === 'PREPARING'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              En Preparación ({orders.filter(o => o.status === 'PREPARING' || o.status === 'PROCESSING').length})
            </button>
            <button
              onClick={() => setFilterStatus('DELIVERED')}
              className={`px-6 py-3 rounded-lg font-medium transition-colors whitespace-nowrap ${
                filterStatus === 'DELIVERED'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Entregadas ({orders.filter(o => o.status === 'DELIVERED' || o.status === 'COMPLETED').length})
            </button>
            <button
              onClick={() => setFilterStatus('CANCELED')}
              className={`px-6 py-3 rounded-lg font-medium transition-colors whitespace-nowrap ${
                filterStatus === 'CANCELED'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Canceladas ({orders.filter(o => o.status === 'CANCELED' || o.status === 'CANCELLED').length})
            </button>
          </div>
        </div>

        {/* Lista de órdenes */}
        {orders.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-lg border border-purple-100">
            <ShoppingBag className="w-24 h-24 mx-auto text-gray-300 mb-4" />
            <h3 className="text-2xl font-bold text-gray-700 mb-2">
              No tienes órdenes aún
            </h3>
            <p className="text-gray-500 mb-6">
              Explora el catálogo y realiza tu primera compra
            </p>
            <Link href="/buyer/catalog">
              <button className="bg-purple-600 text-white px-8 py-3 rounded-lg hover:bg-purple-700 transition-colors font-semibold inline-flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                Ir al Catálogo
              </button>
            </Link>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 lg:grid-cols-2 gap-6' : 'space-y-4'}>
            {filteredAndSortedOrders.map((order) => {
              const config = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.PENDING
              const StatusIcon = config.icon

              return viewMode === 'grid' ? (
                // Vista GRID (Card)
                <div
                  key={order.id}
                  className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all p-6 border-l-4 border-purple-500"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-lg text-gray-900">
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
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.color}`}>
                      {config.label}
                    </span>
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
                          className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${getProgressPercentage(order.status)}%` }}
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Total */}
                  <div className="mb-4 pt-4 border-t">
                    <span className="text-2xl font-bold text-purple-600">
                      ${Number(order.totalAmount).toFixed(2)}
                    </span>
                  </div>

                  {/* Acciones rápidas */}
                  <div className="flex gap-2">
                    {order.status === 'PENDING' && (
                      <button 
                        onClick={(e) => handleQuickCancel(order.id, e)}
                        className="flex-1 bg-red-100 text-red-600 py-2 rounded-lg hover:bg-red-200 transition-colors font-medium text-sm flex items-center justify-center gap-2"
                      >
                        <XCircle className="w-4 h-4" />
                        Cancelar
                      </button>
                    )}
                    
                    {(order.status === 'CONFIRMED' || order.status === 'PREPARING' || order.status === 'IN_DELIVERY') && (
                      <button 
                        onClick={(e) => handleQuickTrack(order, e)}
                        className="flex-1 bg-blue-100 text-blue-600 py-2 rounded-lg hover:bg-blue-200 transition-colors font-medium text-sm flex items-center justify-center gap-2"
                      >
                        <MapPin className="w-4 h-4" />
                        Rastrear
                      </button>
                    )}
                    
                    {(order.status === 'DELIVERED' || order.status === 'COMPLETED') && (
                      <>
                        <button 
                          onClick={(e) => handleQuickReorder(order, e)}
                          className="flex-1 bg-green-100 text-green-600 py-2 rounded-lg hover:bg-green-200 transition-colors font-medium text-sm flex items-center justify-center gap-2"
                        >
                          <RotateCcw className="w-4 h-4" />
                          Reordenar
                        </button>
                        <button 
                          onClick={(e) => handleQuickInvoice(order, e)}
                          className="flex-1 bg-purple-100 text-purple-600 py-2 rounded-lg hover:bg-purple-200 transition-colors font-medium text-sm flex items-center justify-center gap-2"
                        >
                          <FileText className="w-4 h-4" />
                          Factura
                        </button>
                      </>
                    )}

                    <button 
                      onClick={() => openOrderModal(order)}
                      className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors font-medium text-sm"
                    >
                      Detalles
                    </button>
                  </div>

                  {/* Botón contactar vendedor */}
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <button 
                      onClick={(e) => handleContactSeller(order, e)}
                      className="w-full flex items-center justify-center gap-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 py-2 rounded-lg transition-colors font-medium text-sm"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Contactar vendedor
                    </button>
                  </div>

                  {/* Sistema de calificación */}
                  {(order.status === 'DELIVERED' || order.status === 'COMPLETED') && !order.rating && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                      <p className="font-medium mb-3 text-gray-900">¿Cómo fue tu experiencia?</p>
                      <div className="flex gap-2 justify-center">
                        {[1, 2, 3, 4, 5].map(star => (
                          <button 
                            key={star}
                            onClick={() => handleRateOrder(order.id, star)}
                            onMouseEnter={() => setHoveredRating(star)}
                            onMouseLeave={() => setHoveredRating(0)}
                            className="text-3xl hover:scale-110 transition-transform"
                          >
                            {star <= (hoveredRating || selectedRating) ? '⭐' : '☆'}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-gray-600 text-center mt-2">
                        Haz clic en las estrellas para calificar
                      </p>
                    </div>
                  )}

                  {/* Mostrar calificación existente */}
                  {order.rating && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-4">
                      <p className="text-sm text-gray-700 text-center">
                        Tu calificación: {Array(order.rating).fill('⭐').join('')}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                // Vista LIST (Fila)
                <div
                  key={order.id}
                  className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all p-4 border-l-4 border-purple-500"
                >
                  <div className="flex items-center justify-between gap-4">
                    {/* Izquierda: Info básica */}
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`p-3 rounded-lg ${config.bg} flex-shrink-0`}>
                        <StatusIcon className={`${config.color} w-6 h-6`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900">
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
                                className="bg-gradient-to-r from-purple-500 to-pink-500 h-1.5 rounded-full transition-all duration-500"
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
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color} block mb-2`}>
                        {config.label}
                      </span>
                      <span className="text-xl font-bold text-purple-600">
                        ${Number(order.totalAmount).toFixed(2)}
                      </span>
                    </div>

                    {/* Derecha: Acciones */}
                    <div className="flex gap-2 flex-shrink-0">
                      {order.status === 'PENDING' && (
                        <button 
                          onClick={(e) => handleQuickCancel(order.id, e)}
                          className="bg-red-100 text-red-600 p-2 rounded-lg hover:bg-red-200 transition-colors"
                          title="Cancelar orden"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      )}
                      
                      {(order.status === 'CONFIRMED' || order.status === 'PREPARING' || order.status === 'IN_DELIVERY') && (
                        <button 
                          onClick={(e) => handleQuickTrack(order, e)}
                          className="bg-blue-100 text-blue-600 p-2 rounded-lg hover:bg-blue-200 transition-colors"
                          title="Rastrear orden"
                        >
                          <MapPin className="w-5 h-5" />
                        </button>
                      )}
                      
                      {(order.status === 'DELIVERED' || order.status === 'COMPLETED') && (
                        <>
                          <button 
                            onClick={(e) => handleQuickReorder(order, e)}
                            className="bg-green-100 text-green-600 p-2 rounded-lg hover:bg-green-200 transition-colors"
                            title="Reordenar"
                          >
                            <RotateCcw className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={(e) => handleQuickInvoice(order, e)}
                            className="bg-purple-100 text-purple-600 p-2 rounded-lg hover:bg-purple-200 transition-colors"
                            title="Ver factura"
                          >
                            <FileText className="w-5 h-5" />
                          </button>
                        </>
                      )}

                      <button 
                        onClick={() => openOrderModal(order)}
                        className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors font-medium text-sm"
                      >
                        Detalles
                      </button>

                      <button 
                        onClick={(e) => handleContactSeller(order, e)}
                        className="bg-purple-50 text-purple-600 p-2 rounded-lg hover:bg-purple-100 transition-colors"
                        title="Contactar vendedor"
                      >
                        <MessageCircle className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Rating en vista lista (más compacto) */}
                  {(order.status === 'DELIVERED' || order.status === 'COMPLETED') && !order.rating && (
                    <div className="bg-yellow-50 border-t border-yellow-200 px-4 py-3 mt-2">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm text-gray-900">¿Cómo fue tu experiencia?</p>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map(star => (
                            <button 
                              key={star}
                              onClick={() => handleRateOrder(order.id, star)}
                              onMouseEnter={() => setHoveredRating(star)}
                              onMouseLeave={() => setHoveredRating(0)}
                              className="text-xl hover:scale-110 transition-transform"
                            >
                              {star <= (hoveredRating || selectedRating) ? '⭐' : '☆'}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {order.rating && (
                    <div className="bg-green-50 border-t border-green-200 px-4 py-2 mt-2">
                      <p className="text-xs text-gray-700 text-center">
                        Calificación: {Array(order.rating).fill('⭐').join('')}
                      </p>
                    </div>
                  )}
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
                          <p className="text-sm text-gray-600">
                            {item.quantity} {item.product?.unit || 'und'} × ${Number(item.pricePerUnit).toFixed(2)}
                          </p>
                          {item.itemNote && (
                            <p className="text-xs text-gray-500 mt-1">
                              Nota: {item.itemNote}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-purple-600">
                            ${Number(item.subtotal).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                    
                    {/* Resumen de totales */}
                    <div className="mt-6 pt-4 border-t space-y-2">
                      <div className="flex justify-between text-gray-600">
                        <span>Subtotal:</span>
                        <span>
                          ${(selectedOrder.orderItems?.reduce((sum, item) => sum + Number(item.subtotal), 0) || 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Impuestos (10%):</span>
                        <span>
                          ${((selectedOrder.orderItems?.reduce((sum, item) => sum + Number(item.subtotal), 0) || 0) * 0.1).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-xl font-bold text-purple-600 pt-2 border-t">
                        <span>Total:</span>
                        <span>${Number(selectedOrder.totalAmount).toFixed(2)}</span>
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
                              <div className="flex-shrink-0">
                                <StatusIcon className={`w-12 h-12 ${config.color}`} />
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

                    {/* Sistema de calificación en modal */}
                    {(selectedOrder.status === 'DELIVERED' || selectedOrder.status === 'COMPLETED') && !selectedOrder.rating && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                        <p className="font-medium mb-3 text-gray-900">¿Cómo fue tu experiencia con esta orden?</p>
                        <div className="flex gap-2 justify-center">
                          {[1, 2, 3, 4, 5].map(star => (
                            <button 
                              key={star}
                              onClick={() => handleRateOrder(selectedOrder.id, star)}
                              onMouseEnter={() => setHoveredRating(star)}
                              onMouseLeave={() => setHoveredRating(0)}
                              className="text-4xl hover:scale-110 transition-transform"
                            >
                              {star <= (hoveredRating || selectedRating) ? '⭐' : '☆'}
                            </button>
                          ))}
                        </div>
                        <p className="text-xs text-gray-600 text-center mt-2">
                          Tu opinión nos ayuda a mejorar el servicio
                        </p>
                      </div>
                    )}

                    {selectedOrder.rating && (
                      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                        <p className="text-center text-gray-700">
                          <span className="font-semibold">Tu calificación:</span> {Array(selectedOrder.rating).fill('⭐').join('')}
                        </p>
                        {selectedOrder.ratingComment && (
                          <p className="text-sm text-gray-600 text-center mt-2">
                            "{selectedOrder.ratingComment}"
                          </p>
                        )}
                      </div>
                    )}

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
    </div>
    </>
  )
}