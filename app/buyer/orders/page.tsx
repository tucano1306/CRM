'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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
  }
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

  useEffect(() => {
    fetchOrders()
  }, [])

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

  return (
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
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-purple-100">
            <Package className="mx-auto text-gray-400 mb-4" size={64} />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              No tienes órdenes
            </h2>
            <p className="text-gray-600 mb-6">
              Comienza a hacer tus pedidos desde el catálogo
            </p>
            <button
              onClick={() => router.push('/buyer/catalog')}
              className="bg-purple-600 text-white px-8 py-3 rounded-lg hover:bg-purple-700 transition-colors font-semibold"
            >
              Ver catálogo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {orders
              .filter(order => {
                if (filterStatus === 'ALL') return true
                if (filterStatus === 'CANCELED') return order.status === 'CANCELED' || order.status === 'CANCELLED'
                if (filterStatus === 'DELIVERED') return order.status === 'DELIVERED' || order.status === 'COMPLETED'
                if (filterStatus === 'PREPARING') return order.status === 'PREPARING' || order.status === 'PROCESSING'
                return order.status === filterStatus
              })
              .map((order) => {
              const config = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.PENDING
              const StatusIcon = config.icon

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all p-6 border-l-4 border-purple-500 cursor-pointer"
                  onClick={() => openOrderModal(order)}
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
                  
                  {/* Total */}
                  <div className="flex items-center justify-between pt-4 border-t">
                    <span className="text-2xl font-bold text-purple-600">
                      ${Number(order.totalAmount).toFixed(2)}
                    </span>
                    <button 
                      className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation()
                        openOrderModal(order)
                      }}
                    >
                      Ver detalles
                    </button>
                  </div>
                </div>
              )
            })}
            {orders.filter(order => {
              if (filterStatus === 'ALL') return true
              if (filterStatus === 'CANCELED') return order.status === 'CANCELED' || order.status === 'CANCELLED'
              if (filterStatus === 'DELIVERED') return order.status === 'DELIVERED' || order.status === 'COMPLETED'
              if (filterStatus === 'PREPARING') return order.status === 'PREPARING' || order.status === 'PROCESSING'
              return order.status === filterStatus
            }).length === 0 && (
              <div className="col-span-full bg-white rounded-2xl shadow-lg p-12 text-center border border-purple-100">
                <Package className="mx-auto text-gray-400 mb-4" size={64} />
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  No hay órdenes en este estado
                </h2>
                <p className="text-gray-600 mb-6">
                  Prueba con otro filtro o haz una nueva orden
                </p>
                <button
                  onClick={() => setFilterStatus('ALL')}
                  className="bg-purple-600 text-white px-8 py-3 rounded-lg hover:bg-purple-700 transition-colors font-semibold"
                >
                  Ver todas
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
                      <h4 className="font-semibold text-gray-900 mb-2">Vendedor:</h4>
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
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                      Historial de la orden
                    </h3>
                    
                    {/* Timeline de estados */}
                    <div className="relative pl-8 space-y-6">
                      {/* Línea vertical */}
                      <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                      
                      {/* Estado actual */}
                      <div className="relative">
                        <div className="absolute -left-6 w-4 h-4 bg-purple-600 rounded-full border-4 border-white"></div>
                        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                          <p className="font-semibold text-purple-900">
                            {statusConfig[selectedOrder.status as keyof typeof statusConfig]?.label || selectedOrder.status}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">Estado actual</p>
                          <p className="text-xs text-gray-500 mt-2">
                            {new Date(selectedOrder.createdAt).toLocaleString('es-ES')}
                          </p>
                        </div>
                      </div>

                      {/* Orden creada */}
                      <div className="relative">
                        <div className="absolute -left-6 w-4 h-4 bg-gray-400 rounded-full border-4 border-white"></div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="font-semibold text-gray-900">Orden creada</p>
                          <p className="text-sm text-gray-600 mt-1">Esperando confirmación</p>
                          <p className="text-xs text-gray-500 mt-2">
                            {new Date(selectedOrder.createdAt).toLocaleString('es-ES')}
                          </p>
                        </div>
                      </div>
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
  )
}