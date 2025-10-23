// components/orders/ClientsViewWithOrders.tsx
'use client'

import { useState, useMemo } from 'react'
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
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import OrdersListImproved from './OrdersListImproved'

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
  status: string
  totalAmount: number
  createdAt: string
  clientId: string
  client: Client
  orderItems?: any[]
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
  userRole: 'SELLER' | 'CLIENT'
  onOrderClick?: (order: Order) => void
}

export default function ClientsViewWithOrders({ 
  orders, 
  userRole,
  onOrderClick
}: ClientsViewWithOrdersProps) {
  const [selectedClient, setSelectedClient] = useState<ClientWithOrders | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

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

  return (
    <>
      <div className="space-y-4">
        {/* Estadísticas Globales */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-4 text-white">
            <div className="flex items-center justify-between mb-2">
              <User className="h-5 w-5 opacity-80" />
              <TrendingUp className="h-4 w-4 opacity-60" />
            </div>
            <p className="text-2xl font-bold">{clientsWithOrders.length}</p>
            <p className="text-sm opacity-90">Total Clientes</p>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 text-white">
            <div className="flex items-center justify-between mb-2">
              <Package className="h-5 w-5 opacity-80" />
            </div>
            <p className="text-2xl font-bold">{orders.length}</p>
            <p className="text-sm opacity-90">Total Órdenes</p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 text-white">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="h-5 w-5 opacity-80" />
            </div>
            <p className="text-2xl font-bold">
              ${orders.reduce((sum, o) => sum + Number(o.totalAmount), 0).toFixed(2)}
            </p>
            <p className="text-sm opacity-90">Ventas Totales</p>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-4 text-white">
            <div className="flex items-center justify-between mb-2">
              <Calendar className="h-5 w-5 opacity-80" />
            </div>
            <p className="text-2xl font-bold">
              ${(orders.reduce((sum, o) => sum + Number(o.totalAmount), 0) / clientsWithOrders.length || 0).toFixed(2)}
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
                No se encontraron clientes
              </h3>
              <p className="text-gray-500">
                {searchTerm 
                  ? 'Intenta cambiar los términos de búsqueda' 
                  : 'No hay clientes con órdenes registradas'}
              </p>
            </div>
          ) : (
            filteredClients.map((clientData) => (
              <div
                key={clientData.client.id}
                onClick={() => setSelectedClient(clientData)}
                className="bg-white rounded-lg shadow-sm hover:shadow-lg transition-all cursor-pointer border-2 border-transparent hover:border-purple-300 group"
              >
                <div className="p-6">
                  {/* Header con Avatar */}
                  <div className="flex items-start gap-4 mb-4">
                    <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                      {clientData.client.name.charAt(0).toUpperCase()}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-lg mb-1 truncate">
                        {clientData.client.name}
                      </h3>
                      <div className="flex items-center gap-1 text-sm text-gray-600 mb-1">
                        <Mail className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{clientData.client.email}</span>
                      </div>
                      {clientData.client.phone && (
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Phone className="h-3 w-3 flex-shrink-0" />
                          <span>{clientData.client.phone}</span>
                        </div>
                      )}
                    </div>

                    <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-purple-600 transition-colors flex-shrink-0" />
                  </div>

                  {/* Estadísticas del Cliente */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                      <div className="flex items-center gap-2 mb-1">
                        <Package className="h-4 w-4 text-purple-600" />
                        <span className="text-xs text-purple-600 font-medium">Órdenes</span>
                      </div>
                      <p className="text-2xl font-bold text-purple-900">
                        {clientData.totalOrders}
                      </p>
                    </div>

                    <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                      <div className="flex items-center gap-2 mb-1">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="text-xs text-green-600 font-medium">Total</span>
                      </div>
                      <p className="text-xl font-bold text-green-900">
                        ${clientData.totalSpent.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Última orden */}
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Calendar className="h-3 w-3" />
                      <span>
                        Última orden: {new Date(clientData.lastOrderDate).toLocaleDateString('es-ES')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Contador de resultados */}
        {filteredClients.length > 0 && (
          <div className="text-center text-sm text-gray-500 py-2">
            Mostrando {filteredClients.length} de {clientsWithOrders.length} clientes
          </div>
        )}
      </div>

      {/* Modal con órdenes del cliente seleccionado */}
      {selectedClient && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
            onClick={() => setSelectedClient(null)}
          />

          {/* Modal */}
          <div className="fixed right-0 top-0 h-full w-full md:w-[900px] lg:w-[1100px] bg-gray-50 z-50 shadow-2xl overflow-hidden flex flex-col animate-slide-in-right">
            
            {/* Header del Cliente */}
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold">
                    {selectedClient.client.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold mb-1">
                      {selectedClient.client.name}
                    </h2>
                    <p className="text-purple-100 text-sm flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {selectedClient.client.email}
                    </p>
                    {selectedClient.client.phone && (
                      <p className="text-purple-100 text-sm flex items-center gap-2 mt-1">
                        <Phone className="h-4 w-4" />
                        {selectedClient.client.phone}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedClient(null)}
                  className="text-white hover:bg-purple-500"
                >
                  <X className="h-6 w-6" />
                </Button>
              </div>

              {/* Stats rápidos */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white/10 rounded-lg p-3">
                  <p className="text-purple-100 text-xs mb-1">Total Órdenes</p>
                  <p className="text-2xl font-bold">{selectedClient.totalOrders}</p>
                </div>
                <div className="bg-white/10 rounded-lg p-3">
                  <p className="text-purple-100 text-xs mb-1">Total Gastado</p>
                  <p className="text-2xl font-bold">${selectedClient.totalSpent.toFixed(2)}</p>
                </div>
                <div className="bg-white/10 rounded-lg p-3">
                  <p className="text-purple-100 text-xs mb-1">Promedio</p>
                  <p className="text-2xl font-bold">
                    ${(selectedClient.totalSpent / selectedClient.totalOrders).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            {/* Órdenes del Cliente */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-4">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Órdenes de {selectedClient.client.name}
                </h3>
                <p className="text-sm text-gray-600">
                  Historial completo de todas las órdenes realizadas
                </p>
              </div>

              <OrdersListImproved 
                orders={selectedClient.orders}
                userRole={userRole}
                onOrderClick={onOrderClick}
              />
            </div>
          </div>
        </>
      )}

      <style jsx global>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </>
  )
}
