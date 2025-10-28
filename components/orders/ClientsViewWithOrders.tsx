'use client'

import { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { 
  User, 
  Mail, 
  Phone, 
  MapPin,
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
import OrdersListImproved from './OrdersListImproved'
import OrdersTimelineView from './OrdersTimelineView'
import OrderDetailModal from './OrderDetailModal'
import BulkStatusChangeModal from './BulkStatusChangeModal'
import { formatPrice } from '@/lib/utils'

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
}

interface ClientWithOrders {
  client: Client
  orders: Order[]
  totalOrders: number
  totalSpent: number
  lastOrderDate: string
}

interface ClientsViewWithOrdersProps {
  orders: Order[]
  userRole: 'seller' | 'buyer'
  onStatusChange?: (orderId: string, newStatus: OrderStatus, notes?: string) => Promise<void>
  onDownloadInvoice?: (order: any) => Promise<void>
  onViewInvoice?: (order: any) => Promise<void>
  isGeneratingInvoice?: string
}

export default function ClientsViewWithOrders({ 
  orders, 
  userRole,
  onStatusChange,
  onDownloadInvoice,
  onViewInvoice,
  isGeneratingInvoice
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
      
      window.scrollTo(0, parseInt(scrollY || '0') * -1)
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

    console.log('📊 Estadísticas filtradas:', {
      searchTerm,
      totalClients,
      totalOrders,
      totalRevenue,
      averagePerClient
    })

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
              // Color distintivo por cliente basado en el índice
              const colors = [
                { bg: 'from-purple-400 to-purple-600', border: 'border-purple-300', stat: 'bg-purple-50 border-purple-200 text-purple-600' },
                { bg: 'from-blue-400 to-blue-600', border: 'border-blue-300', stat: 'bg-blue-50 border-blue-200 text-blue-600' },
                { bg: 'from-green-400 to-green-600', border: 'border-green-300', stat: 'bg-green-50 border-green-200 text-green-600' },
                { bg: 'from-orange-400 to-orange-600', border: 'border-orange-300', stat: 'bg-orange-50 border-orange-200 text-orange-600' },
                { bg: 'from-pink-400 to-pink-600', border: 'border-pink-300', stat: 'bg-pink-50 border-pink-200 text-pink-600' },
                { bg: 'from-indigo-400 to-indigo-600', border: 'border-indigo-300', stat: 'bg-indigo-50 border-indigo-200 text-indigo-600' },
              ]
              const colorScheme = colors[index % colors.length]
              
              return (
                <div
                  key={clientData.client.id}
                  onClick={() => setSelectedClient(clientData)}
                  style={{
                    animation: `fadeInUp 0.4s ease-out ${index * 0.05}s both`
                  }}
                  className={`bg-white rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 cursor-pointer border-2 ${colorScheme.border} hover:scale-[1.02] group overflow-hidden`}
                >
                  {/* Banda superior de color */}
                  <div className={`h-1 bg-gradient-to-r ${colorScheme.bg}`} />
                  
                  <div className="p-6">
                    {/* Header con Avatar */}
                    <div className="flex items-start gap-4 mb-4">
                      <div className={`flex-shrink-0 w-14 h-14 bg-gradient-to-br ${colorScheme.bg} rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg ring-4 ring-white`}>
                        {clientData.client.name.charAt(0).toUpperCase()}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-gray-900 text-lg truncate">
                            {clientData.client.name}
                          </h3>
                          <ShoppingBag className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
                          <Mail className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{clientData.client.email}</span>
                        </div>
                        {clientData.client.phone && (
                          <div className="flex items-center gap-1 text-xs text-gray-600">
                            <Phone className="h-3 w-3 flex-shrink-0" />
                            <span>{clientData.client.phone}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-center gap-1">
                        <ChevronRight className={`h-6 w-6 text-gray-300 group-hover:text-${colorScheme.border.split('-')[1]}-600 group-hover:translate-x-1 transition-all flex-shrink-0`} />
                        <span className="text-xs text-gray-400 font-medium">Ver</span>
                      </div>
                    </div>

                    {/* Estadísticas del Cliente */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className={`${colorScheme.stat} rounded-lg p-3 border transition-all hover:shadow-md`}>
                        <div className="flex items-center gap-2 mb-1">
                          <Package className="h-4 w-4" />
                          <span className="text-xs font-medium">Órdenes</span>
                        </div>
                        <p className="text-lg sm:text-xl md:text-2xl font-bold">
                          {clientData.totalOrders}
                        </p>
                      </div>

                      <div className="bg-green-50 border-green-200 text-green-600 rounded-lg p-3 border transition-all hover:shadow-md">
                        <div className="flex items-center gap-2 mb-1">
                          <DollarSign className="h-4 w-4" />
                          <span className="text-xs font-medium">Total</span>
                        </div>
                        <p className="text-base sm:text-lg md:text-xl font-bold text-green-900 break-words">
                          {formatPrice(clientData.totalSpent)}
                        </p>
                      </div>
                    </div>

                    {/* Última orden con hora */}
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <Calendar className="h-3.5 w-3.5 text-gray-500" />
                          <span className="font-medium">Última orden:</span>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-semibold text-gray-900">
                            {new Date(clientData.lastOrderDate).toLocaleDateString('es-ES', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </p>
                          <p className="text-xs text-gray-500 flex items-center justify-end gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(clientData.lastOrderDate).toLocaleTimeString('es-ES', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
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
          <div 
            className="bg-black/60 backdrop-blur-sm transition-all duration-300 overflow-hidden"
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
            
            {/* Header del Cliente - MEJORADO Y RESPONSIVO */}
            <div className="bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-700 text-white">
              {/* Barra superior con botones */}
              <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-white/20">
                <div className="flex items-center justify-between gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedClient(null)}
                    className="text-white hover:bg-white/20 gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4"
                  >
                    <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Volver a clientes</span>
                    <span className="sm:hidden">Volver</span>
                  </Button>
                  
                  <div className="flex items-center gap-2">
                    <div className="hidden md:flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full">
                      <User className="h-4 w-4" />
                      <span className="text-sm font-medium">Vista de Cliente</span>
                    </div>
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

              {/* Info del cliente - RESPONSIVO */}
              <div className="px-3 sm:px-6 py-4 sm:py-6">
                <div className="flex items-start gap-3 sm:gap-5 mb-4 sm:mb-6">
                  <div className="w-14 h-14 sm:w-20 sm:h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-2xl sm:text-3xl font-bold shadow-lg ring-2 sm:ring-4 ring-white/30 flex-shrink-0">
                    {selectedClient.client.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                      <h2 className="text-xl sm:text-2xl md:text-3xl font-bold truncate">
                        {selectedClient.client.name}
                      </h2>
                      <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-white/20 backdrop-blur-sm rounded-full text-[10px] sm:text-xs font-semibold w-fit">
                        Cliente Activo
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-1.5 sm:gap-2 text-xs sm:text-sm">
                      <p className="text-purple-100 flex items-center gap-2 truncate">
                        <Mail className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{selectedClient.client.email}</span>
                      </p>
                      {selectedClient.client.phone && (
                        <p className="text-purple-100 flex items-center gap-2">
                          <Phone className="h-4 w-4 flex-shrink-0" />
                          {selectedClient.client.phone}
                        </p>
                      )}
                      {selectedClient.client.address && (
                        <p className="text-purple-100 flex items-center gap-2 sm:col-span-2">
                          <MapPin className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">{selectedClient.client.address}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stats mejorados */}
                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                  <div className="bg-white/15 backdrop-blur-sm rounded-xl p-2 sm:p-4 hover:bg-white/20 transition-all">
                    <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                      <Package className="h-4 w-4 sm:h-5 sm:w-5 text-purple-200 flex-shrink-0" />
                      <p className="text-purple-100 text-[10px] sm:text-xs font-medium uppercase tracking-wide">Órdenes</p>
                    </div>
                    <p className="text-xl sm:text-2xl md:text-3xl font-bold break-words">{selectedClient.totalOrders}</p>
                    <p className="text-[10px] sm:text-xs text-purple-200 mt-0.5 sm:mt-1">
                      {selectedClient.orders.filter(o => o.status === 'COMPLETED').length} completas
                    </p>
                  </div>
                  <div className="bg-white/15 backdrop-blur-sm rounded-xl p-2 sm:p-4 hover:bg-white/20 transition-all">
                    <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                      <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-purple-200 flex-shrink-0" />
                      <p className="text-purple-100 text-[10px] sm:text-xs font-medium uppercase tracking-wide">Total</p>
                    </div>
                    <p className="text-base sm:text-xl md:text-2xl lg:text-3xl font-bold break-words">{formatPrice(selectedClient.totalSpent)}</p>
                    <p className="text-[10px] sm:text-xs text-purple-200 mt-0.5 sm:mt-1">Ventas</p>
                  </div>
                  <div className="bg-white/15 backdrop-blur-sm rounded-xl p-2 sm:p-4 hover:bg-white/20 transition-all">
                    <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                      <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-purple-200 flex-shrink-0" />
                      <p className="text-purple-100 text-[10px] sm:text-xs font-medium uppercase tracking-wide">Promedio</p>
                    </div>
                    <p className="text-base sm:text-xl md:text-2xl lg:text-3xl font-bold break-words">
                      {formatPrice(selectedClient.totalSpent / selectedClient.totalOrders)}
                    </p>
                    <p className="text-[10px] sm:text-xs text-purple-200 mt-0.5 sm:mt-1">Por orden</p>
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
                        {filteredClientOrders.length} de {selectedClient.totalOrders} orden{selectedClient.totalOrders !== 1 ? 'es' : ''} de <span className="font-semibold text-purple-600">{selectedClient.client.name}</span>
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
                      <span className="font-bold truncate max-w-[120px] sm:max-w-none">"{orderSearchTerm}"</span>
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

              {/* Barra de herramientas de selección múltiple - MEJORADA Y RESPONSIVA */}
              {userRole === 'seller' && (
                <div className="mb-4 sm:mb-6">
                  <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4 border border-gray-200">
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

                      {selectedOrders.length > 0 && (
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 w-full sm:w-auto sm:ml-auto bg-gradient-to-r from-purple-50 to-purple-100 border-2 border-purple-300 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 animate-scale-in">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm flex-shrink-0">
                              {selectedOrders.length}
                            </div>
                            <span className="text-xs sm:text-sm font-semibold text-purple-900">
                              {selectedOrders.length === 1 ? 'orden seleccionada' : 'órdenes seleccionadas'}
                            </span>
                          </div>
                          <Button
                            onClick={() => setShowBulkStatusModal(true)}
                            size="sm"
                            className="bg-purple-600 hover:bg-purple-700 shadow-lg hover:shadow-xl transition-all text-xs sm:text-sm h-8 sm:h-9 w-full sm:w-auto"
                          >
                            <Package className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-1.5" />
                            Cambiar Estado
                          </Button>
                        </div>
                      )}
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
          onDownloadInvoice={onDownloadInvoice}
          onViewInvoice={onViewInvoice}
          isGeneratingInvoice={isGeneratingInvoice === selectedOrder.id}
        />
      )}

      {/* Modal de Cambio Masivo de Estado */}
      {showBulkStatusModal && (
        <BulkStatusChangeModal
          isOpen={showBulkStatusModal}
          onClose={() => setShowBulkStatusModal(false)}
          selectedCount={selectedOrders.length}
          currentStatus={getCommonStatus()}
          onConfirm={handleBulkStatusChange}
        />
      )}
    </>
  )
}
