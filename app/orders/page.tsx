'use client'

import { useEffect, useState } from 'react'
import {
  Package,
  Clock,
  Loader2,
  CheckCircle,
  XCircle,
  User,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  Download,
  Eye,
  Search,
  X,
  Filter,
  SlidersHorizontal,
  ChefHat,
  ShoppingBag,
  Truck,
  PackageCheck,
  CreditCard,
  Banknote,
  Box,
} from 'lucide-react'
import MainLayout from '@/components/shared/MainLayout'
import PageHeader from '@/components/shared/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { apiCall } from '@/lib/api-client'
import { downloadInvoice, openInvoiceInNewTab, type InvoiceData } from '@/lib/invoiceGenerator'
import OrderStatusChanger from '@/components/orders/OrderStatusChanger'
import OrderStatusHistory from '@/components/orders/OrderStatusHistory'
import OrderDetailModal from '@/components/orders/OrderDetailModal'

type OrderStatus = 
  | 'PENDING' 
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

interface OrderWithItems {
  id: string
  orderNumber: string
  status: OrderStatus
  totalAmount: number
  notes: string | null
  deliveryInstructions: string | null
  createdAt: string
  client: {
    id: string
    name: string
    businessName?: string
    email: string
    phone: string
    address: string
  }
  seller: {
    id: string
    name: string
    email: string
    phone: string
  }
  orderItems: Array<{
    id: string
    productName: string
    quantity: number
    pricePerUnit: number
    subtotal: number
    itemNote?: string | null
    product: {
      id: string
      sku: string | null
      unit: string
    }
  }>
}

const statusConfig = {
  PENDING: {
    label: 'Pendiente',
    icon: Clock,
    color: 'text-yellow-600',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    buttonColor: 'bg-yellow-600'
  },
  CONFIRMED: {
    label: 'Confirmada',
    icon: CheckCircle,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    buttonColor: 'bg-blue-600'
  },
  PREPARING: {
    label: 'Preparando',
    icon: Box,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    buttonColor: 'bg-indigo-600'
  },
  READY_FOR_PICKUP: {
    label: 'Listo para Recoger',
    icon: Package,
    color: 'text-cyan-600',
    bg: 'bg-cyan-50',
    border: 'border-cyan-200',
    buttonColor: 'bg-cyan-600'
  },
  IN_DELIVERY: {
    label: 'En Entrega',
    icon: Truck,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    buttonColor: 'bg-purple-600'
  },
  DELIVERED: {
    label: 'Entregado',
    icon: CheckCircle,
    color: 'text-teal-600',
    bg: 'bg-teal-50',
    border: 'border-teal-200',
    buttonColor: 'bg-teal-600'
  },
  PARTIALLY_DELIVERED: {
    label: 'Entrega Parcial',
    icon: AlertCircle,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    buttonColor: 'bg-orange-600'
  },
  COMPLETED: {
    label: 'Completada',
    icon: CheckCircle,
    color: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-200',
    buttonColor: 'bg-green-600'
  },
  CANCELED: {
    label: 'Cancelada',
    icon: XCircle,
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
    buttonColor: 'bg-red-600'
  },
  PAYMENT_PENDING: {
    label: 'Pago Pendiente',
    icon: DollarSign,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    buttonColor: 'bg-amber-600'
  },
  PAID: {
    label: 'Pagado',
    icon: DollarSign,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    buttonColor: 'bg-emerald-600'
  },
}

export default function OrdersManagementPage() {
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null)
  const [generatingInvoice, setGeneratingInvoice] = useState<string | null>(null)
  const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0) // Para refrescar historial

  // Estados de búsqueda y filtros
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [filterAmountMin, setFilterAmountMin] = useState('')
  const [filterAmountMax, setFilterAmountMax] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const result = await apiCall('/api/orders', { timeout: 10000 })
      
      if (result.success) {
        // El API devuelve { success: true, orders: [], stats: {} }
        setOrders(result.data?.orders || [])
      } else {
        setError(result.error || 'Error al cargar órdenes')
      }
    } catch (err) {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const openOrderModal = (order: OrderWithItems) => {
    setSelectedOrder(order)
  }

  const prepareInvoiceData = (order: OrderWithItems): InvoiceData => {
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
      
      // ACTUALIZA ESTOS DATOS CON TU EMPRESA
      sellerName: 'Food Orders CRM',
      sellerAddress: '123 Main Street, Miami, FL 33139',
      sellerPhone: '(305) 555-0123',
      sellerEmail: order.seller.email,
      sellerTaxId: '12-3456789',
      
      clientName: order.client.name,
      clientBusinessName: order.client.businessName,
      clientAddress: order.client.address,
      clientPhone: order.client.phone,
      clientEmail: order.client.email,
      
      items: order.orderItems.map(item => ({
        sku: item.product.sku,
        name: item.productName,
        quantity: item.quantity,
        unit: item.product.unit,
        pricePerUnit: item.pricePerUnit,
        subtotal: item.subtotal
      })),
      
      subtotal,
      taxRate,
      taxAmount,
      total,
      
      paymentMethod: 'Transferencia Bancaria',
      paymentTerms: 'Pago a 30 días. Se aceptan transferencias bancarias, cheques o efectivo.',
      notes: order.notes || undefined,
      termsAndConditions: 'Los productos entregados son responsabilidad del comprador una vez firmada la entrega. Las devoluciones deben realizarse dentro de las 24 horas siguientes a la entrega.'
    }
  }

  const handleDownloadInvoice = async (order: OrderWithItems) => {
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

  const handleViewInvoice = async (order: OrderWithItems) => {
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

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus, notes?: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, notes })
      })

      const result = await response.json()

      if (result.success) {
        // Actualizar la orden en el estado local
        setOrders(prevOrders =>
          prevOrders.map(order =>
            order.id === orderId
              ? { ...order, status: newStatus }
              : order
          )
        )
        
        // Refrescar el historial de la orden expandida
        setHistoryRefreshTrigger(prev => prev + 1)
      } else {
        alert(result.error || 'Error al actualizar el estado')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error de conexión al actualizar el estado')
    }
  }

  // Función de filtrado y búsqueda
  const filteredOrders = orders.filter((order) => {
    const searchLower = searchQuery.toLowerCase().trim()

    // Búsqueda por texto (número de orden, cliente, productos)
    if (searchLower) {
      const matchesOrderNumber = order.orderNumber.toLowerCase().includes(searchLower)
      const matchesClient = order.client.name.toLowerCase().includes(searchLower) ||
                           order.client.email.toLowerCase().includes(searchLower)
      const matchesProduct = order.orderItems.some(item => 
        item.productName.toLowerCase().includes(searchLower) ||
        (item.product.sku && item.product.sku.toLowerCase().includes(searchLower))
      )
      
      if (!matchesOrderNumber && !matchesClient && !matchesProduct) {
        return false
      }
    }

    // Filtro por estado
    if (filterStatus !== 'all' && order.status !== filterStatus) {
      return false
    }

    // Filtro por rango de fechas
    if (filterDateFrom) {
      const orderDate = new Date(order.createdAt)
      const fromDate = new Date(filterDateFrom)
      if (orderDate < fromDate) return false
    }

    if (filterDateTo) {
      const orderDate = new Date(order.createdAt)
      const toDate = new Date(filterDateTo)
      toDate.setHours(23, 59, 59, 999) // Incluir todo el día
      if (orderDate > toDate) return false
    }

    // Filtro por rango de montos
    if (filterAmountMin && Number(order.totalAmount) < parseFloat(filterAmountMin)) {
      return false
    }

    if (filterAmountMax && Number(order.totalAmount) > parseFloat(filterAmountMax)) {
      return false
    }

    return true
  })

  const clearFilters = () => {
    setSearchQuery('')
    setFilterStatus('all')
    setFilterDateFrom('')
    setFilterDateTo('')
    setFilterAmountMin('')
    setFilterAmountMax('')
  }

  const hasActiveFilters = searchQuery || filterStatus !== 'all' || filterDateFrom || 
                          filterDateTo || filterAmountMin || filterAmountMax

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <Loader2 className="animate-spin h-12 w-12 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-4 text-gray-600">Cargando órdenes...</p>
          </div>
        </div>
      </MainLayout>
    )
  }

  if (error) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-screen">
          <Card className="max-w-md">
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Error</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={fetchOrders}>Reintentar</Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader 
          title="Gestión de Órdenes" 
          description="Administra y actualiza el estado de las órdenes"
        />

        {/* Barra de búsqueda y filtros */}
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Búsqueda principal */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar por número de orden, cliente o producto..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  )}
                </div>

                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="gap-2"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  Filtros
                  {hasActiveFilters && (
                    <span className="ml-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                      Activos
                    </span>
                  )}
                </Button>

                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    onClick={clearFilters}
                    className="gap-2"
                  >
                    <X className="h-4 w-4" />
                    Limpiar
                  </Button>
                )}
              </div>

              {/* Panel de filtros expandible */}
              {showFilters && (
                <div className="border-t pt-4 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Filtro por estado */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Estado
                      </label>
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="all">Todos los estados</option>
                        <option value="PENDING">Pendiente</option>
                        <option value="CONFIRMED">Confirmada</option>
                        <option value="PREPARING">En Preparación</option>
                        <option value="READY_FOR_PICKUP">Lista para Recoger</option>
                        <option value="IN_DELIVERY">En Entrega</option>
                        <option value="DELIVERED">Entregada</option>
                        <option value="PARTIALLY_DELIVERED">Entrega Parcial</option>
                        <option value="COMPLETED">Completada</option>
                        <option value="CANCELED">Cancelada</option>
                        <option value="PAYMENT_PENDING">Pago Pendiente</option>
                        <option value="PAID">Pagada</option>
                      </select>
                    </div>

                    {/* Filtro fecha desde */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Fecha desde
                      </label>
                      <input
                        type="date"
                        value={filterDateFrom}
                        onChange={(e) => setFilterDateFrom(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    {/* Filtro fecha hasta */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Fecha hasta
                      </label>
                      <input
                        type="date"
                        value={filterDateTo}
                        onChange={(e) => setFilterDateTo(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    {/* Monto mínimo */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Monto mínimo
                      </label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={filterAmountMin}
                          onChange={(e) => setFilterAmountMin(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    {/* Monto máximo */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Monto máximo
                      </label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="number"
                          step="0.01"
                          placeholder="999999.99"
                          value={filterAmountMax}
                          onChange={(e) => setFilterAmountMax(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Indicador de resultados */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Filter className="h-4 w-4" />
                  <span>
                    Mostrando <strong>{filteredOrders.length}</strong> de <strong>{orders.length}</strong> órdenes
                  </span>
                </div>
                
                {filteredOrders.length === 0 && orders.length > 0 && (
                  <span className="text-orange-600 font-medium">
                    No se encontraron resultados
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-3xl font-bold text-purple-600">{filteredOrders.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <Clock className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Pendiente</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {filteredOrders.filter(o => o.status === 'PENDING').length}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <CheckCircle className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Confirmada</p>
                <p className="text-2xl font-bold text-blue-600">
                  {filteredOrders.filter(o => o.status === 'CONFIRMED').length}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Completada</p>
                <p className="text-2xl font-bold text-green-600">
                  {filteredOrders.filter(o => o.status === 'COMPLETED').length}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Orders List */}
        <div className="space-y-4">
          {orders.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No hay órdenes</h3>
                <p className="text-gray-600">Las órdenes aparecerán aquí</p>
              </CardContent>
            </Card>
          ) : filteredOrders.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Search className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No se encontraron resultados</h3>
                <p className="text-gray-600 mb-4">
                  Intenta ajustar los filtros o la búsqueda
                </p>
                <Button onClick={clearFilters} variant="outline">
                  Limpiar filtros
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredOrders.map((order) => {
              const config = statusConfig[order.status]
              const StatusIcon = config.icon
              const isGenerating = generatingInvoice === order.id

              return (
                <Card key={order.id} className="overflow-hidden">
                  {/* Order Header */}
                  <div 
                    className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => openOrderModal(order)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-lg ${config.bg}`}>
                          <StatusIcon className={config.color} size={24} />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">#{order.orderNumber}</p>
                          <p className={`font-semibold ${config.color}`}>{config.label}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        {/* Cliente */}
                        <div className="text-left hidden md:block">
                          <p className="text-sm text-gray-500">Cliente</p>
                          <p className="font-semibold flex items-center gap-2">
                            <User size={16} className="text-blue-600" />
                            {order.client.name}
                          </p>
                        </div>

                        {/* Fecha */}
                        <div className="text-left hidden md:block">
                          <p className="text-sm text-gray-500">Fecha</p>
                          <p className="font-semibold flex items-center gap-2">
                            <Calendar size={16} className="text-purple-600" />
                            {new Date(order.createdAt).toLocaleDateString('es-ES')}
                          </p>
                        </div>

                        {/* Total */}
                        <div className="text-right">
                          <p className="text-sm text-gray-500">Total</p>
                          <p className="text-2xl font-bold text-purple-600">
                            ${Number(order.totalAmount).toFixed(2)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {order.orderItems.length} producto{order.orderItems.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                </Card>
              )
            })
          )}
        </div>

        {/* Order Detail Modal */}
        {selectedOrder && (
          <OrderDetailModal
            order={selectedOrder}
            isOpen={!!selectedOrder}
            onClose={() => setSelectedOrder(null)}
            userRole="seller"
            onStatusChange={handleStatusChange}
            onDownloadInvoice={(order) => handleDownloadInvoice(order as OrderWithItems)}
            onViewInvoice={(order) => handleViewInvoice(order as OrderWithItems)}
            isGeneratingInvoice={generatingInvoice === selectedOrder.id}
          />
        )}
      </div>
    </MainLayout>
  )
}
