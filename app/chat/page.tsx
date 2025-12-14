'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useUser } from '@clerk/nextjs'
import { useSearchParams } from 'next/navigation'
import MainLayout from '@/components/shared/MainLayout'
import PageHeader from '@/components/shared/PageHeader'
import ChatWindow from '@/components/chat/ChatWindow'
import { Card, CardContent } from '@/components/ui/card'
import { MessageCircle, Users, Inbox, AlertTriangle, Loader2 } from 'lucide-react'

interface Client {
  id: string
  name: string
  email: string
  clerkUserId: string
  unreadCount: number
}

function SellerChatContent() {
  const { user: _user } = useUser() // Keep hook call for auth context
  const searchParams = useSearchParams()
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Obtener parámetros de URL para abrir chat automáticamente
  const clientIdFromUrl = searchParams.get('clientId')
  const orderIdFromUrl = searchParams.get('orderId')
  const [orderContext, setOrderContext] = useState<string | null>(null)

  const fetchClients = useCallback(async () => {
    try {
      const response = await fetch('/api/seller/clients')
      const data = await response.json()

      if (data.success) {
        setClients(data.clients)
        
        // Si hay clientId en URL, seleccionar ese cliente
        if (clientIdFromUrl) {
          const clientFromUrl = data.clients.find((c: Client) => c.id === clientIdFromUrl)
          if (clientFromUrl) {
            setSelectedClient(clientFromUrl)
            // Guardar contexto de orden si existe
            if (orderIdFromUrl) {
              setOrderContext(orderIdFromUrl)
            }
          }
        }
        // Si no hay URL param, seleccionar primer cliente
        else if (data.clients.length > 0 && !selectedClient) {
          setSelectedClient(data.clients[0])
        }
      }
    } catch (error) {
      console.error('Error fetching clients:', error)
    } finally {
      setLoading(false)
    }
  }, [clientIdFromUrl, orderIdFromUrl, selectedClient])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      {/* Header - Responsive */}
      <div className="mb-4 md:mb-0">
        <PageHeader 
          title="Chat con Clientes"
          description="Comunicación directa con tus clientes"
        />
      </div>

      {/* Mobile: Client Selector Dropdown */}
      <div className="md:hidden mb-4">
        <Card>
          <CardContent className="p-3">
            <label htmlFor="mobile-client-selector" className="block text-sm font-medium text-gray-700 mb-2">
              Seleccionar cliente
            </label>
            <select
              id="mobile-client-selector"
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={selectedClient?.id || ''}
              onChange={(e) => {
                const client = clients.find(c => c.id === e.target.value)
                setSelectedClient(client || null)
              }}
            >
              <option value="">-- Selecciona un cliente --</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name} {client.unreadCount > 0 && `(${client.unreadCount})`}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>
      </div>

      {/* Desktop & Tablet: Two Column Layout | Mobile: Single Column */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 mt-4 md:mt-6">
        {/* Lista de Clientes - Hidden on mobile, shown on tablet+ */}
        <div className="hidden md:block md:col-span-4 lg:col-span-3">
          <Card>
            <CardContent className="p-0">
              <div className="p-3 md:p-4 border-b bg-gradient-to-r from-purple-50 to-indigo-50">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 md:h-5 md:w-5 text-purple-600" />
                  <h3 className="text-sm md:text-base font-semibold text-gray-900">
                    Clientes ({clients.length})
                  </h3>
                </div>
              </div>

              {clients.length === 0 ? (
                <div className="p-6 md:p-8 text-center">
                  <Inbox className="h-10 w-10 md:h-12 md:w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm md:text-base text-gray-600">No hay clientes</p>
                </div>
              ) : (
                <div className="divide-y max-h-[500px] md:max-h-[600px] overflow-y-auto">
                  {clients.map((client) => (
                    <button
                      type="button"
                      key={client.id}
                      onClick={() => setSelectedClient(client)}
                      className={`w-full text-left p-3 md:p-4 cursor-pointer hover:bg-purple-50 transition-all bg-transparent border-0 ${
                        selectedClient?.id === client.id
                          ? 'bg-gradient-to-r from-purple-50 to-indigo-50 border-l-4 border-purple-600 shadow-sm'
                          : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm md:text-base font-semibold text-gray-900 truncate">
                            {client.name}
                          </h4>
                          <p className="text-xs md:text-sm text-gray-500 truncate">
                            {client.email}
                          </p>
                        </div>
                        {client.unreadCount > 0 && (
                          <div className="bg-gradient-to-r from-rose-500 to-red-600 text-white text-xs rounded-full h-5 w-5 md:h-6 md:w-6 flex items-center justify-center font-bold flex-shrink-0 ml-2 shadow-md">
                            {client.unreadCount}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Ventana de Chat - Full width on mobile, 8 cols on desktop */}
        <div className="col-span-1 md:col-span-8 lg:col-span-9">
          {/* Banner de contexto si viene de una orden con problema */}
          {orderContext && selectedClient && (
            <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-800">
                  💬 Chat iniciado desde revisión de orden
                </p>
                <p className="text-xs text-amber-600">
                  Resuelve los problemas de stock con {selectedClient.name}
                </p>
              </div>
            </div>
          )}
          
          {selectedClient ? (
            <ChatWindow
              receiverId={selectedClient.clerkUserId}
              receiverName={selectedClient.name}
              orderContext={orderContext}
            />
          ) : (
            <Card className="h-[500px] md:h-[600px] flex items-center justify-center">
              <CardContent className="text-center p-4">
                <MessageCircle className="h-12 w-12 md:h-16 md:w-16 text-gray-400 mx-auto mb-3 md:mb-4" />
                <h3 className="text-lg md:text-xl font-semibold text-gray-700 mb-2">
                  Selecciona un cliente
                </h3>
                <p className="text-sm md:text-base text-gray-500">
                  {clients.length === 0 
                    ? 'No tienes clientes aún'
                    : 'Elige un cliente para iniciar el chat'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </MainLayout>
  )
}

// Componente principal con Suspense boundary
export default function SellerChatPage() {
  return (
    <Suspense fallback={
      <MainLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <Loader2 className="animate-spin h-12 w-12 text-purple-600 mx-auto mb-4" />
            <p className="text-gray-600">Cargando chat...</p>
          </div>
        </div>
      </MainLayout>
    }>
      <SellerChatContent />
    </Suspense>
  )
}
