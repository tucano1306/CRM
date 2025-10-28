'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import MainLayout from '@/components/shared/MainLayout'
import PageHeader from '@/components/shared/PageHeader'
import ChatWindow from '@/components/chat/ChatWindow'
import { Card, CardContent } from '@/components/ui/card'
import { MessageCircle, Users, Inbox } from 'lucide-react'

interface Client {
  id: string
  name: string
  email: string
  clerkUserId: string
  unreadCount: number
}

export default function SellerChatPage() {
  const { user } = useUser()
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchClients()
  }, [])

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/seller/clients')
      const data = await response.json()

      if (data.success) {
        setClients(data.clients)
        
        // Seleccionar primer cliente automáticamente
        if (data.clients.length > 0 && !selectedClient) {
          setSelectedClient(data.clients[0])
        }
      }
    } catch (error) {
      console.error('Error fetching clients:', error)
    } finally {
      setLoading(false)
    }
  }

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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Seleccionar cliente
            </label>
            <select
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
              <div className="p-3 md:p-4 border-b bg-gray-50">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />
                  <h3 className="text-sm md:text-base font-semibold">
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
                    <div
                      key={client.id}
                      onClick={() => setSelectedClient(client)}
                      className={`p-3 md:p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedClient?.id === client.id
                          ? 'bg-blue-50 border-l-4 border-blue-600'
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
                          <div className="bg-red-500 text-white text-xs rounded-full h-5 w-5 md:h-6 md:w-6 flex items-center justify-center font-bold flex-shrink-0 ml-2">
                            {client.unreadCount}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Ventana de Chat - Full width on mobile, 8 cols on desktop */}
        <div className="col-span-1 md:col-span-8 lg:col-span-9">
          {selectedClient ? (
            <ChatWindow
              receiverId={selectedClient.clerkUserId}
              receiverName={selectedClient.name}
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
