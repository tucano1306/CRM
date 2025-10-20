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
      <PageHeader 
        title="Chat con Clientes"
        description="Comunicación directa con tus clientes"
      />

      <div className="grid grid-cols-12 gap-6 mt-6">
        {/* Lista de Clientes */}
        <div className="col-span-4">
          <Card>
            <CardContent className="p-0">
              <div className="p-4 border-b bg-gray-50">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold">
                    Clientes ({clients.length})
                  </h3>
                </div>
              </div>

              {clients.length === 0 ? (
                <div className="p-8 text-center">
                  <Inbox className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No hay clientes</p>
                </div>
              ) : (
                <div className="divide-y max-h-[600px] overflow-y-auto">
                  {clients.map((client) => (
                    <div
                      key={client.id}
                      onClick={() => setSelectedClient(client)}
                      className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedClient?.id === client.id
                          ? 'bg-blue-50 border-l-4 border-blue-600'
                          : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">
                            {client.name}
                          </h4>
                          <p className="text-sm text-gray-500">
                            {client.email}
                          </p>
                        </div>
                        {client.unreadCount > 0 && (
                          <div className="bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center font-bold">
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

        {/* Ventana de Chat */}
        <div className="col-span-8">
          {selectedClient ? (
            <ChatWindow
              receiverId={selectedClient.clerkUserId}
              receiverName={selectedClient.name}
            />
          ) : (
            <Card className="h-[600px] flex items-center justify-center">
              <CardContent className="text-center">
                <MessageCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  Selecciona un cliente
                </h3>
                <p className="text-gray-500">
                  Elige un cliente de la lista para iniciar el chat
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </MainLayout>
  )
}
