'use client'

import { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { 
  User, 
  Mail, 
  Phone, 
  Package,
  DollarSign,
  ChevronRight,
  Search,
  Calendar,
  TrendingUp,
  X,
  CheckSquare,
  Square,
  Clock,
  ShoppingBag,
  ArrowLeft
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import OrdersTimelineView from './OrdersTimelineView'
import OrderDetailModal from './OrderDetailModal'
import BulkStatusChangeModal from './BulkStatusChangeModal'
import { formatPrice } from '@/lib/utils'

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

interface Client {
  id: string
  name: string
  email: string
  phone?: string
  address?: string
}

interface Order {
  id: string
  orderNumber: string
  status: OrderStatus
  totalAmount: number
  createdAt: string
  notes: string | null
  deliveryInstructions: string | null
  clientId: string
  client: Client
  orderItems: any[]
  hasIssues?: boolean
  issues?: Array<{
    id: string
    productName: string
    issueType: string
    requestedQty: number
    availableQty: number
    status: string
  }>
}

interface ClientWithOrders {
  client: Client
  orders: Order[]
  totalOrders: number
  totalSpent: number
  lastOrderDate: string
}

interface ClientsViewWithOrdersProps {
  readonly orders: Order[]
  readonly userRole: 'seller' | 'buyer'
  readonly onStatusChange?: (orderId: string, newStatus: OrderStatus, notes?: string) => Promise<void>
  readonly onRemoveProduct?: (orderId: string, itemId: string) => Promise<void>
  readonly onSubstituteProduct?: (orderId: string, itemId: string, newProductId: string, newQty: number) => Promise<void>
  readonly initialOrderId?: string  // Para abrir una orden específica automáticamente
}

export default function ClientsViewWithOrders({ 
  orders, 
  userRole,
  onStatusChange,
  onRemoveProduct,
  onSubstituteProduct,
  initialOrderId
}: ClientsViewWithOrdersProps) {
  const [selectedClient, setSelectedClient] = useState<ClientWithOrders | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [orderSearchTerm, setOrderSearchTerm] = useState('') // Búsqueda de órdenes en modal
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])
  const [showBulkStatusModal, setShowBulkStatusModal] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  // Detectar cuando el componente está montado en el cliente
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Bloquear scroll del body cuando el modal esté abierto
  useEffect(() => {
    if (selectedClient) {
      // Guardar el scroll actual y los estilos originales
      const scrollY = window.scrollY
      const body = document.body
      const html = document.documentElement
      
      // Bloquear scroll en body y html
      body.style.position = 'fixed'
      body.style.top = `-${scrollY}px`
      body.style.width = '100%'
      body.style.overflow = 'hidden'
      html.style.overflow = 'hidden'
      
    } else {
      // Restaurar el scroll y estilos
      const body = document.body
      const html = document.documentElement
      const scrollY = body.style.top
      
      body.style.position = ''
      body.style.top = ''
      body.style.width = ''
      body.style.overflow = ''
      html.style.overflow = ''
      
      window.scrollTo(0, Number.parseInt(scrollY || '0', 10) * -1)
    }

    // Cleanup al desmontar
    return () => {
      const body = document.body
      const html = document.documentElement
      body.style.position = ''
      body.style.top = ''
      body.style.width = ''
      body.style.overflow = ''
      html.style.overflow = ''
    }
  }, [selectedClient])

  // Agrupar órdenes por cliente
  const clientsWithOrders = useMemo(() => {
    const clientMap = new Map<string, ClientWithOrders>()

    orders.forEach(order => {
      const clientId = order.client.id
      
      if (!clientMap.has(clientId)) {
        clientMap.set(clientId, {
          client: order.client,
          orders: [],
          totalOrders: 0,
          totalSpent: 0,
          lastOrderDate: order.createdAt
        })
      }

      const clientData = clientMap.get(clientId)!
      clientData.orders.push(order)
      clientData.totalOrders++
      clientData.totalSpent += Number(order.totalAmount)
      
      // Actualizar última fecha si es más reciente
      if (new Date(order.createdAt) > new Date(clientData.lastOrderDate)) {
        clientData.lastOrderDate = order.createdAt
      }
    })

    return Array.from(clientMap.values()).sort((a, b) => 
      new Date(b.lastOrderDate).getTime() - new Date(a.lastOrderDate).getTime()
    )
  }, [orders])

  // Abrir orden automáticamente si viene initialOrderId
  useEffect(() => {
    if (initialOrderId && clientsWithOrders.length > 0 && !selectedClient) {
      // Buscar la orden y su cliente
      for (const clientData of clientsWithOrders) {
        const order = clientData.orders.find(o => o.id === initialOrderId)
        if (order) {
          // Abrir el cliente que tiene esa orden
          setSelectedClient(clientData)
          // Seleccionar la orden para que se muestre destacada
          setSelectedOrders([initialOrderId])
          // Limpiar el parámetro de la URL sin recargar
          globalThis.history.replaceState({}, '', '/orders')
          break
        }
      }
    }
  }, [initialOrderId, clientsWithOrders, selectedClient])

  // Filtrar clientes por búsqueda
  const filteredClients = clientsWithOrders.filter(clientData =>
    clientData.client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    clientData.client.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleToggleSelection = (orderId: string) => {
    setSelectedOrders(prev =>
      prev.includes(orderId)
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    )
  }

  const handleSelectAll = () => {
    if (selectedClient) {
      // Seleccionar solo las órdenes filtradas (visibles)
      const visibleOrderIds = filteredClientOrders.map(o => o.id)
      setSelectedOrders(visibleOrderIds)
    }
  }

  const handleDeselectAll = () => {
    setSelectedOrders([])
  }

  const getCommonStatus = (): OrderStatus | null => {
    if (selectedOrders.length === 0) return null
    
    const selectedOrdersData = selectedClient?.orders.filter(o => selectedOrders.includes(o.id)) || []
    if (selectedOrdersData.length === 0) return null
    
    const firstStatus = selectedOrdersData[0].status
    const allSameStatus = selectedOrdersData.every(o => o.status === firstStatus)
    
    return allSameStatus ? firstStatus : null
  }

  const handleBulkStatusChange = async (newStatus: OrderStatus, notes?: string) => {
    if (!onStatusChange) return

    try {
      // Cambiar el status de todas las órdenes seleccionadas
      await Promise.all(
        selectedOrders.map(orderId =>
          onStatusChange(orderId, newStatus, notes)
        )
      )

      // Limpiar selección
      setSelectedOrders([])
      setShowBulkStatusModal(false)
      
      alert(`✅ Se actualizaron ${selectedOrders.length} órdenes exitosamente`)
    } catch (error) {
      console.error('Error en cambio masivo:', error)
      alert('Error al actualizar las órdenes')
    }
  }

  // Función para reportar problemas de stock
  const handleReportStockIssues = async (orderId: string, issues: Array<{
    productId: string
    productName: string
    issueType: 'OUT_OF_STOCK' | 'PARTIAL_STOCK' | null
    requestedQty: number
    availableQty: number
  }>) => {
    try {
      // Reportar cada issue al API
      for (const issue of issues) {
        if (!issue.issueType) continue

        await fetch(`/api/orders/${orderId}/issues`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            issueType: issue.issueType,
            description: issue.issueType === 'OUT_OF_STOCK' 
              ? `Producto "${issue.productName}" sin stock disponible`
              : `Producto "${issue.productName}" con stock parcial: ${issue.availableQty} de ${issue.requestedQty} disponibles`,
            productId: issue.productId,
            productName: issue.productName,
            requestedQty: issue.requestedQty,
            availableQty: issue.availableQty,
            proposedSolution: issue.issueType === 'OUT_OF_STOCK'
              ? 'El vendedor te contactará con alternativas'
              : `Se pueden enviar ${issue.availableQty} unidades ahora`
          })
        })
      }

      // Limpiar selección y cerrar modal
      setSelectedOrders([])
      setShowBulkStatusModal(false)
      
      alert(`✅ Se notificó al comprador sobre ${issues.length} producto(s) con problemas de stock`)
    } catch (error) {
      console.error('Error reportando problemas de stock:', error)
      alert('Error al reportar los problemas de stock')
    }
  }

  // Obtener datos completos de las órdenes seleccionadas
  const getSelectedOrdersData = () => {
    if (!selectedClient) return []
    return selectedClient.orders.filter(o => selectedOrders.includes(o.id))
  }

  // Filtrar órdenes del cliente seleccionado
  const filteredClientOrders = useMemo(() => {
    if (!selectedClient) return []
    if (!orderSearchTerm.trim()) return selectedClient.orders

    const searchLower = orderSearchTerm.toLowerCase().trim()
    
    return selectedClient.orders.filter(order => {
      // Buscar por últimos 4 dígitos del número de orden
      const orderNumberLast4 = order.orderNumber.slice(-4)
      if (orderNumberLast4.includes(searchLower)) return true
      
      // Buscar por número completo
      if (order.orderNumber.toLowerCase().includes(searchLower)) return true
      
      // Buscar por fecha (DD/MM/YYYY)
      const orderDate = new Date(order.createdAt)
      const dateStr = orderDate.toLocaleDateString('es-ES')
      if (dateStr.includes(searchLower)) return true
      
      // Buscar por día (formato DD o D)
      const day = orderDate.getDate().toString()
      if (day === searchLower || day.padStart(2, '0') === searchLower) return true
      
      // Buscar por mes
      const month = (orderDate.getMonth() + 1).toString()
      if (month === searchLower || month.padStart(2, '0') === searchLower) return true
      
      return false
    })
  }, [selectedClient, orderSearchTerm])

  // Calcular estadísticas basadas en clientes filtrados
  const filteredStats = useMemo(() => {
    const totalClients = filteredClients.length
    const totalOrders = filteredClients.reduce((sum, c) => sum + c.totalOrders, 0)
    const totalRevenue = filteredClients.reduce((sum, c) => sum + c.totalSpent, 0)
    const averagePerClient = totalClients > 0 ? totalRevenue / totalClients : 0

    return {
      totalClients,
      totalOrders,
      totalRevenue,
      averagePerClient
    }
  }, [filteredClients, searchTerm])

  return (
    <>
      <div className="space-y-4">
        {/* Estadísticas - Dinámicas según filtro */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-4 text-white">
            <div className="flex items-center justify-between mb-2">
              <User className="h-5 w-5 opacity-80" />
              <TrendingUp className="h-4 w-4 opacity-60" />
            </div>
            <p className="text-2xl font-bold">{filteredStats.totalClients}</p>
            <p className="text-sm opacity-90">
              {searchTerm ? 'Clientes Filtrados' : 'Total Clientes'}
            </p>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 text-white">
            <div className="flex items-center justify-between mb-2">
              <Package className="h-5 w-5 opacity-80" />
            </div>
            <p className="text-2xl font-bold">{filteredStats.totalOrders}</p>
            <p className="text-sm opacity-90">
              {searchTerm ? 'Órdenes del Cliente' : 'Total Órdenes'}
            </p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 text-white">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="h-5 w-5 opacity-80" />
            </div>
            <p className="text-2xl font-bold">
              {formatPrice(filteredStats.totalRevenue)}
            </p>
            <p className="text-sm opacity-90">
              {searchTerm ? 'Ingresos del Cliente' : 'Ventas Totales'}
            </p>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-4 text-white">
            <div className="flex items-center justify-between mb-2">
              <Calendar className="h-5 w-5 opacity-80" />
            </div>
            <p className="text-2xl font-bold">
              {formatPrice(filteredStats.averagePerClient)}
            </p>
            <p className="text-sm opacity-90">Promedio/Cliente</p>
          </div>
        </div>

        {/* Búsqueda */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar cliente por nombre o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
        </div>

        {/* Tarjetas de Clientes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.length === 0 ? (
            <div className="col-span-full bg-white rounded-lg shadow-sm p-12 text-center">
              <User className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchTerm ? 'No se encontraron clientes' : 'No hay clientes con órdenes'}
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm 
                  ? 'Esta vista solo muestra clientes que tienen órdenes. Si buscas un cliente nuevo sin pedidos, cambia a la vista "Tarjetas".' 
                  : 'No hay clientes con órdenes registradas. Los clientes aparecerán aquí una vez que realicen su primera orden.'}
              </p>
              {searchTerm && (
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => setSearchTerm('')}
                    className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors font-medium"
                  >
                    Limpiar búsqueda
                  </button>
                </div>
              )}
            </div>
          ) : (
            filteredClients.map((clientData, index) => {
              // 🎨 Esquemas de colores vibrantes y modernos
              const colors = [
                { 
                  bg: 'from-violet-500 via-purple-500 to-fuchsia-500', 
                  glow: 'shadow-purple-200',
                  accent: 'text-purple-600',
                  light: 'bg-purple-50',
                  border: 'border-purple-100',
                  statBg: 'from-purple-100 to-purple-50',
                  emoji: '💜'
                },
                { 
                  bg: 'from-blue-500 via-cyan-500 to-teal-500', 
                  glow: 'shadow-blue-200',
                  accent: 'text-blue-600',
                  light: 'bg-blue-50',
                  border: 'border-blue-100',
                  statBg: 'from-blue-100 to-blue-50',
                  emoji: '💙'
                },
                { 
                  bg: 'from-emerald-500 via-green-500 to-lime-500', 
                  glow: 'shadow-green-200',
                  accent: 'text-emerald-600',
                  light: 'bg-emerald-50',
                  border: 'border-emerald-100',
                  statBg: 'from-emerald-100 to-emerald-50',
                  emoji: '💚'
                },
                { 
                  bg: 'from-orange-500 via-amber-500 to-yellow-500', 
                  glow: 'shadow-orange-200',
                  accent: 'text-orange-600',
                  light: 'bg-orange-50',
                  border: 'border-orange-100',
                  statBg: 'from-orange-100 to-orange-50',
                  emoji: '🧡'
                },
                { 
                  bg: 'from-rose-500 via-pink-500 to-fuchsia-500', 
                  glow: 'shadow-pink-200',
                  accent: 'text-pink-600',
                  light: 'bg-pink-50',
                  border: 'border-pink-100',
                  statBg: 'from-pink-100 to-pink-50',
                  emoji: '💗'
                },
                { 
                  bg: 'from-indigo-500 via-blue-500 to-purple-500', 
                  glow: 'shadow-indigo-200',
                  accent: 'text-indigo-600',
                  light: 'bg-indigo-50',
                  border: 'border-indigo-100',
                  statBg: 'from-indigo-100 to-indigo-50',
                  emoji: '💜'
                },
              ]
              const colorScheme = colors[index % colors.length]

              // Calcular nivel del cliente basado en total gastado
              const getClientLevel = (spent: number) => {
                if (spent >= 1000) return { emoji: '👑', label: 'VIP', color: 'from-amber-400 to-yellow-500' }
                if (spent >= 500) return { emoji: '💎', label: 'Premium', color: 'from-purple-400 to-pink-500' }
                if (spent >= 200) return { emoji: '⭐', label: 'Frecuente', color: 'from-blue-400 to-cyan-500' }
                return { emoji: '🌱', label: 'Nuevo', color: 'from-green-400 to-emerald-500' }
              }
              const clientLevel = getClientLevel(clientData.totalSpent)

              // Calcular tiempo desde última orden
              const getLastOrderText = () => {
                const days = Math.floor((Date.now() - new Date(clientData.lastOrderDate).getTime()) / (1000 * 60 * 60 * 24))
                if (days === 0) return { text: 'Hoy', emoji: '🔥', hot: true }
                if (days === 1) return { text: 'Ayer', emoji: '✨', hot: true }
                if (days <= 7) return { text: `Hace ${days} días`, emoji: '📅', hot: false }
                return { text: `Hace ${days} días`, emoji: '⏰', hot: false }
              }
              const lastOrder = getLastOrderText()
              
              // Verificar si este cliente tiene órdenes pendientes
              const hasPendingOrders = clientData.orders.some(o => o.status === 'PENDING')
              
              return (
                <button
                  type="button"
                  key={clientData.client.id}
                  data-client-has-pending={hasPendingOrders ? 'true' : 'false'}
                  onClick={() => setSelectedClient(clientData)}
                  style={{
                    animation: `fadeInUp 0.4s ease-out ${index * 0.05}s both`
                  }}
                  className={`w-full text-left relative bg-white rounded-2xl shadow-lg ${colorScheme.glow} hover:shadow-2xl transition-all duration-300 cursor-pointer hover:scale-[1.03] group overflow-hidden border-0 p-0`}
                >
                  {/* 🌈 Banda superior con gradiente vibrante */}
                  <div className={`h-24 bg-gradient-to-r ${colorScheme.bg} relative overflow-hidden`}>
                    {/* Decoración de fondo */}
                    <div className="absolute inset-0 opacity-30 pointer-events-none">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full -translate-y-1/2 translate-x-1/2" />
                      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
                    </div>
                    
                    {/* Badge de nivel del cliente */}
                    <div className={`absolute top-3 right-3 px-3 py-1 bg-gradient-to-r ${clientLevel.color} rounded-full shadow-lg flex items-center gap-1.5`}>
                      <span className="text-sm">{clientLevel.emoji}</span>
                      <span className="text-xs font-bold text-white">{clientLevel.label}</span>
                    </div>

                    {/* Indicador de actividad reciente */}
                    {lastOrder.hot && (
                      <div className="absolute top-3 left-3 px-2 py-1 bg-white/20 backdrop-blur-sm rounded-full flex items-center gap-1">
                        <span className="text-sm">{lastOrder.emoji}</span>
                        <span className="text-xs font-semibold text-white">{lastOrder.text}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Avatar flotante */}
                  <div className="relative px-5 -mt-10">
                    <div className={`w-20 h-20 bg-gradient-to-br ${colorScheme.bg} rounded-2xl flex items-center justify-center text-white font-black text-3xl shadow-xl ring-4 ring-white transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                      {clientData.client.name.charAt(0).toUpperCase()}
                    </div>
                  </div>

                  <div className="p-5 pt-3">
                    {/* Nombre y contacto */}
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-extrabold text-gray-900 text-xl truncate group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-purple-600 group-hover:to-pink-600 transition-all">
                          {clientData.client.name}
                        </h3>
                        <span className="text-lg">{colorScheme.emoji}</span>
                      </div>
                      
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <div className={`p-1.5 ${colorScheme.light} rounded-lg`}>
                            <Mail className={`h-3.5 w-3.5 ${colorScheme.accent}`} />
                          </div>
                          <span className="truncate">{clientData.client.email}</span>
                        </div>
                        {clientData.client.phone && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <div className={`p-1.5 ${colorScheme.light} rounded-lg`}>
                              <Phone className={`h-3.5 w-3.5 ${colorScheme.accent}`} />
                            </div>
                            <span>{clientData.client.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 📊 Estadísticas con diseño moderno */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className={`relative bg-gradient-to-br ${colorScheme.statBg} rounded-xl p-4 border ${colorScheme.border} overflow-hidden group/stat hover:shadow-md transition-all`}>
                        <div className="absolute top-0 right-0 opacity-10 pointer-events-none">
                          <Package className="h-16 w-16 -mt-2 -mr-2" />
                        </div>
                        <div className="relative">
                          <div className="flex items-center gap-2 mb-1">
                            <Package className={`h-4 w-4 ${colorScheme.accent}`} />
                            <span className={`text-xs font-semibold ${colorScheme.accent}`}>Órdenes</span>
                          </div>
                          <p className="text-3xl font-black text-gray-900">
                            {clientData.totalOrders}
                          </p>
                        </div>
                      </div>

                      <div className="relative bg-gradient-to-br from-green-100 to-emerald-50 rounded-xl p-4 border border-green-100 overflow-hidden group/stat hover:shadow-md transition-all">
                        <div className="absolute top-0 right-0 opacity-10 pointer-events-none">
                          <DollarSign className="h-16 w-16 -mt-2 -mr-2" />
                        </div>
                        <div className="relative">
                          <div className="flex items-center gap-2 mb-1">
                            <DollarSign className="h-4 w-4 text-emerald-600" />
                            <span className="text-xs font-semibold text-emerald-600">Total</span>
                          </div>
                          <p className="text-2xl font-black text-gray-900 truncate">
                            {formatPrice(clientData.totalSpent)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 📅 Última orden */}
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-3 border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-white rounded-lg shadow-sm">
                            <Calendar className="h-4 w-4 text-gray-600" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Última orden</p>
                            <p className="text-sm font-bold text-gray-900">
                              {new Date(clientData.lastOrderDate).toLocaleDateString('es-ES', {
                                day: '2-digit',
                                month: 'short'
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <p className="text-xs text-gray-500">Hora</p>
                            <p className="text-sm font-semibold text-gray-700">
                              {new Date(clientData.lastOrderDate).toLocaleTimeString('es-ES', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                          <div className={`p-2 bg-gradient-to-r ${colorScheme.bg} rounded-xl shadow-lg group-hover:scale-110 transition-transform`}>
                            <ChevronRight className="h-5 w-5 text-white" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>

        <style jsx>{`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>

        {/* Contador de resultados */}
        {filteredClients.length > 0 && (
          <div className="text-center text-sm text-gray-500 py-2">
            Mostrando {filteredClients.length} de {clientsWithOrders.length} clientes
          </div>
        )}
      </div>

      {/* Modal con órdenes del cliente seleccionado - RENDERIZADO CON PORTAL */}
      {selectedClient && isMounted && createPortal(
        <>
          {/* Overlay - MEJORADO PARA BLOQUEAR SCROLL Y CUBRIR TODO */}
          <button 
            type="button"
            className="bg-black/60 backdrop-blur-sm transition-all duration-300 overflow-hidden border-0 cursor-default"
            style={{ 
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100vw',
              height: '100vh',
              zIndex: 99999,
              animation: 'fadeIn 0.3s ease-out'
            }}
            onClick={() => setSelectedClient(null)}
            aria-label="Close modal"
          />

          {/* Modal - OVERFLOW CONTROLADO Y Z-INDEX ALTO */}
          <div 
            className="bg-gray-50 shadow-2xl flex flex-col animate-slide-in-right overflow-hidden"
            style={{ 
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: '100%',
              height: '100vh',
              maxWidth: '900px',
              zIndex: 999999
            }}
          >
            
            {/* Header del Cliente - COMPACTO */}
            <div className="bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-700 text-white">
              {/* Barra superior con botones */}
              <div className="px-3 py-2 border-b border-white/20">
                <div className="flex items-center justify-between gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedClient(null)}
                    className="text-white hover:bg-white/20 gap-1 text-xs px-2 h-8"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Volver</span>
                  </Button>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedClient(null)}
                      className="text-white hover:bg-white/20 h-8 w-8 sm:h-10 sm:w-10"
                    >
                      <X className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Info del cliente - COMPACTA */}
              <div className="px-3 py-3">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0">
                    {selectedClient.client.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base font-bold truncate">{selectedClient.client.name}</h2>
                    <p className="text-xs text-purple-200 truncate">{selectedClient.client.email}</p>
                  </div>
                </div>

                {/* Stats compactos */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-white/15 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold">{selectedClient.totalOrders}</p>
                    <p className="text-[10px] text-purple-200">Órdenes</p>
                  </div>
                  <div className="bg-white/15 rounded-lg p-2 text-center">
                    <p className="text-sm font-bold">{formatPrice(selectedClient.totalSpent)}</p>
                    <p className="text-[10px] text-purple-200">Total</p>
                  </div>
                  <div className="bg-white/15 rounded-lg p-2 text-center">
                    <p className="text-sm font-bold">{formatPrice(selectedClient.totalSpent / selectedClient.totalOrders)}</p>
                    <p className="text-[10px] text-purple-200">Promedio</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Órdenes del Cliente */}
            <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-gray-50 to-white">
              {/* Header mejorado - RESPONSIVO */}
              <div className="mb-4 sm:mb-6 bg-white rounded-xl shadow-sm p-3 sm:p-6 border-l-4 border-purple-600">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-2 sm:p-3 bg-purple-100 rounded-lg">
                      <ShoppingBag className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
                        Historial de Órdenes
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1">
                        {filteredClientOrders.length} de {selectedClient.totalOrders} orden{selectedClient.totalOrders === 1 ? '' : 'es'} de <span className="font-semibold text-purple-600">{selectedClient.client.name}</span>
                      </p>
                    </div>
                  </div>
                  <div className="hidden md:flex flex-col items-end gap-1">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="h-4 w-4" />
                      <span>Ordenado por más reciente</span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Mostrando fecha y hora de recepción
                    </p>
                  </div>
                </div>

                {/* Buscador de órdenes - RESPONSIVO */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                  <input
                    type="text"
                    value={orderSearchTerm}
                    onChange={(e) => setOrderSearchTerm(e.target.value)}
                    placeholder="Buscar por # orden, fecha o día..."
                    className="w-full pl-9 sm:pl-10 pr-9 sm:pr-10 py-2 sm:py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-xs sm:text-sm"
                  />
                  {orderSearchTerm && (
                    <button
                      onClick={() => setOrderSearchTerm('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  )}
                </div>

                {/* Indicador de búsqueda activa - RESPONSIVO */}
                {orderSearchTerm && (
                  <div className="mt-2 sm:mt-3 flex items-center gap-2 text-xs sm:text-sm flex-wrap">
                  <div className="px-2 sm:px-3 py-1 bg-purple-100 text-purple-700 rounded-full flex items-center gap-1.5 sm:gap-2">
                    <Search className="h-3 w-3" />
                    <span className="font-medium">Búsqueda:</span>
                    <span className="font-bold truncate max-w-[120px] sm:max-w-none">&quot;{orderSearchTerm}&quot;</span>
                    <button
                      onClick={() => setOrderSearchTerm('')}
                      className="ml-0.5 sm:ml-1 hover:bg-purple-200 rounded-full p-0.5 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    {filteredClientOrders.length === 0 && (
                      <span className="text-gray-500 italic text-xs">Sin resultados</span>
                    )}
                  </div>
                )}
              </div>

              {/* Barra de herramientas de selección múltiple - STICKY PARA VISIBILIDAD */}
              {userRole === 'seller' && (
                <div className="mb-4 sm:mb-6 sticky top-0 z-50">
                  <div className="bg-white rounded-xl shadow-lg p-3 sm:p-4 border border-gray-200 backdrop-blur-sm">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <CheckSquare className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 flex-shrink-0" />
                        <span className="text-xs sm:text-sm font-semibold text-gray-700">Selección:</span>
                      </div>
                      
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          onClick={handleSelectAll}
                          size="sm"
                          variant="outline"
                          className="text-purple-600 border-purple-300 hover:bg-purple-50 hover:border-purple-400 transition-all text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3"
                        >
                          <CheckSquare className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-1.5" />
                          <span className="hidden sm:inline">Todas ({filteredClientOrders.length})</span>
                          <span className="sm:hidden">Todas</span>
                        </Button>
                        <Button
                          onClick={handleDeselectAll}
                          size="sm"
                          variant="outline"
                          disabled={selectedOrders.length === 0}
                          className="hover:bg-gray-50 transition-all text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3"
                        >
                          <Square className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-1.5" />
                          Ninguna
                        </Button>
                      </div>

                      {/* Sección de revisar orden - siempre visible */}
                      <div className={`flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 w-full sm:w-auto sm:ml-auto rounded-xl px-4 sm:px-5 py-3 sm:py-3.5 transition-all duration-300 ${
                        selectedOrders.length > 0 
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-lg shadow-emerald-200' 
                          : 'bg-gradient-to-r from-gray-100 to-gray-200 border-2 border-dashed border-gray-300'
                      }`}>
                        {selectedOrders.length > 0 ? (
                          <>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base flex-shrink-0 border-2 border-white/30">
                                {selectedOrders.length}
                              </div>
                              <span className="text-sm sm:text-base font-semibold text-white">
                                {selectedOrders.length === 1 ? 'orden lista para revisar' : 'órdenes seleccionadas'}
                              </span>
                            </div>
                            <Button
                              onClick={() => setShowBulkStatusModal(true)}
                              size="lg"
                              className="bg-white text-emerald-600 hover:bg-emerald-50 shadow-lg hover:shadow-xl transition-all text-sm sm:text-base h-10 sm:h-11 w-full sm:w-auto font-bold px-6"
                            >
                              <Package className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                              Ver Productos
                            </Button>
                          </>
                        ) : (
                          <div className="flex items-center gap-3 w-full justify-center sm:justify-start">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-300 rounded-full flex items-center justify-center text-gray-500 flex-shrink-0">
                              <CheckSquare className="h-4 w-4 sm:h-5 sm:w-5" />
                            </div>
                            <span className="text-sm sm:text-base font-medium text-gray-500">
                              👆 Selecciona una orden para ver sus productos
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <OrdersTimelineView 
                orders={filteredClientOrders}
                onOrderClick={(order) => setSelectedOrder(order as Order)}
                selectedOrders={selectedOrders}
                onToggleSelection={userRole === 'seller' ? handleToggleSelection : undefined}
                userRole={userRole === 'seller' ? 'SELLER' : 'CLIENT'}
              />
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Modal de Detalles de Orden */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder as any}
          isOpen={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          userRole={userRole}
          onStatusChange={onStatusChange}
          onRemoveProduct={onRemoveProduct}
          onSubstituteProduct={onSubstituteProduct}
        />
      )}

      {/* Modal de Revisar Orden */}
      {showBulkStatusModal && (
        <BulkStatusChangeModal
          isOpen={showBulkStatusModal}
          onClose={() => setShowBulkStatusModal(false)}
          selectedCount={selectedOrders.length}
          currentStatus={getCommonStatus()}
          onConfirm={handleBulkStatusChange}
          selectedOrdersData={getSelectedOrdersData()}
          onReportStockIssues={handleReportStockIssues}
        />
      )}
    </>
  )
}
