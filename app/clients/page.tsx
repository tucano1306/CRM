'use client'

import { useEffect, useState } from 'react'
import MainLayout from '@/components/shared/MainLayout'
import PageHeader from '@/components/shared/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { apiCall } from '@/lib/api-client'
import ClientsViewWithOrders from '@/components/orders/ClientsViewWithOrders'
import { 
  Plus, 
  Mail, 
  Phone, 
  MapPin, 
  Edit, 
  Trash2, 
  Clock, 
  AlertCircle,
  Search,
  X,
  Users,
  List,
  Grid
} from 'lucide-react'

interface ClientWithStats {
  id: string
  name: string
  email: string
  phone: string | null
  address: string
  zipCode: string | null
  clerkUserId: string
  createdAt: string
  stats?: {
    totalOrders: number
    totalSpent: number
  }
}

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientWithStats[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timedOut, setTimedOut] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'cards' | 'orders'>('orders')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    zipCode: '',
  })

  useEffect(() => {
    fetchClients()
    fetchOrders()
  }, [])

  const fetchClients = async () => {
    setLoading(true)
    setError(null)
    setTimedOut(false)

    const timeoutId = setTimeout(() => {
      if (loading) setTimedOut(true)
    }, 5000)

    try {
      console.log('🔍 Llamando a /api/clients...')
      
      // Agregar parámetros de paginación requeridos por el endpoint
      const result = await apiCall('/api/clients?page=1&limit=100', {
        timeout: 10000,
      })

      console.log('📦 Respuesta completa del API:', result)
      console.log('✅ result.success:', result.success)
      console.log('📊 result.data:', result.data)
      console.log('📊 Tipo de result.data:', typeof result.data)
      console.log('📊 Es array?', Array.isArray(result.data))

      clearTimeout(timeoutId)

      if (result.success) {
        // El endpoint devuelve { success, data: { success, data: [...], pagination }, pagination }
        // Los clientes están en result.data.data
        const clientsData = result.data?.data || result.data || []
        const clientsArray = Array.isArray(clientsData) ? clientsData : []
        console.log('✅ Clientes a guardar:', clientsArray)
        console.log('✅ Cantidad de clientes:', clientsArray.length)
        setClients(clientsArray)
      } else {
        console.error('❌ Error del API:', result.error)
        setError(result.error || 'Error al cargar clientes')
      }
    } catch (err) {
      console.error('❌ Error de conexión:', err)
      clearTimeout(timeoutId)
      setError('Error de conexión')
    } finally {
      setLoading(false)
      setTimedOut(false)
    }
  }

  const fetchOrders = async () => {
    try {
      console.log('🔍 Obteniendo órdenes...')
      const result = await apiCall('/api/orders', {
        timeout: 10000,
      })

      if (result.success) {
        const ordersData = result.data?.orders || result.data || []
        console.log('✅ Órdenes obtenidas:', ordersData.length)
        setOrders(ordersData)
      } else {
        console.error('❌ Error obteniendo órdenes:', result.error)
      }
    } catch (err) {
      console.error('❌ Error de conexión al obtener órdenes:', err)
    }
  }

  const startEdit = (client: ClientWithStats) => {
    setEditingId(client.id)
    setFormData({
      name: client.name,
      email: client.email,
      phone: client.phone || '',
      address: client.address,
      zipCode: client.zipCode || '',
    })
    setShowForm(true)
  }

  const cancelEdit = () => {
    setShowForm(false)
    setEditingId(null)
    setFormData({ name: '', email: '', phone: '', address: '', zipCode: '' })
  }

  const saveClient = async () => {
    const url = editingId ? `/api/clients/${editingId}` : '/api/clients'
    const method = editingId ? 'PUT' : 'POST'

    const result = await apiCall(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
      timeout: 5000,
    })

    if (result.success) {
      fetchClients()
      cancelEdit()
    } else {
      alert(result.error || 'Error al guardar cliente')
    }
  }

  const deleteClient = async (id: string) => {
    if (!confirm('¿Eliminar este cliente?')) return

    try {
      const result = await apiCall(`/api/clients/${id}`, {
        method: 'DELETE',
        timeout: 5000,
      })

      if (result.success) {
        fetchClients()
      } else {
        alert(result.error || 'Error al eliminar cliente')
      }
    } catch (err) {
      alert('Error al eliminar cliente')
    }
  }

  // Filtrar clientes por búsqueda
  console.log('🔎 Estado de clients antes de filtrar:', clients)
  console.log('🔎 Cantidad en state:', clients.length)
  console.log('🔎 Query de búsqueda actual:', searchQuery)
  
  const filteredClients = Array.isArray(clients) 
    ? clients.filter((client) => {
        const searchLower = searchQuery.toLowerCase().trim()
        if (!searchLower) return true

        // Buscar en todos los campos, manejando valores null/undefined
        const name = (client.name || '').toLowerCase()
        const email = (client.email || '').toLowerCase()
        const phone = (client.phone || '').toLowerCase()
        const address = (client.address || '').toLowerCase()
        const zipCode = (client.zipCode || '').toLowerCase()

        const match = (
          name.includes(searchLower) ||
          email.includes(searchLower) ||
          phone.includes(searchLower) ||
          address.includes(searchLower) ||
          zipCode.includes(searchLower)
        )

        console.log('🔍 Comparando:', {
          searchLower,
          clientData: { name, email, phone, address, zipCode },
          match
        })

        return match
      })
    : []

  console.log('✅ Clientes filtrados:', filteredClients.length)

  const clearSearch = () => {
    setSearchQuery('')
  }

  // Loading state
  if (loading) {
    return (
      <MainLayout>
        <PageHeader
          title="Clientes"
          description="Cargando clientes..."
        />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-6 bg-gray-200 rounded mb-4" />
                <div className="h-4 bg-gray-200 rounded mb-2" />
                <div className="h-4 bg-gray-200 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </MainLayout>
    )
  }

  // Timeout state
  if (timedOut) {
    return (
      <MainLayout>
        <div className="max-w-md mx-auto mt-8 bg-yellow-50 border border-yellow-200 p-6 rounded-lg">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="h-8 w-8 text-yellow-600" />
            <h2 className="text-xl font-bold text-yellow-900">
              Tiempo de espera excedido
            </h2>
          </div>
          <p className="text-gray-700 mb-4">
            La carga de clientes está tardando más de lo esperado.
          </p>
          <button
            onClick={fetchClients}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
          >
            Reintentar
          </button>
        </div>
      </MainLayout>
    )
  }

  // Error state
  if (error) {
    return (
      <MainLayout>
        <div className="max-w-md mx-auto mt-8 bg-red-50 border border-red-200 p-6 rounded-lg">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="h-8 w-8 text-red-600" />
            <h2 className="text-xl font-bold text-red-900">Error</h2>
          </div>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={fetchClients}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
          >
            Reintentar
          </button>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <PageHeader
        title="Clientes"
        description={`${clients.length} clientes registrados`}
        action={
          <div className="flex items-center gap-3">
            {/* Toggle de vista */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('orders')}
                className={`px-4 py-2 rounded-md flex items-center gap-2 transition-colors ${
                  viewMode === 'orders'
                    ? 'bg-white text-purple-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <List className="h-4 w-4" />
                <span className="text-sm font-medium">Con Órdenes</span>
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`px-4 py-2 rounded-md flex items-center gap-2 transition-colors ${
                  viewMode === 'cards'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Grid className="h-4 w-4" />
                <span className="text-sm font-medium">Tarjetas</span>
              </button>
            </div>

            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus size={20} />
              Nuevo Cliente
            </button>
          </div>
        }
      />

      {/* Barra de búsqueda moderna */}
      <div className="mb-6">
        <div className="relative max-w-2xl">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder={viewMode === 'cards' 
              ? "Buscar por nombre, email, teléfono o dirección..." 
              : "Buscar clientes con órdenes (por nombre o email)..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all"
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
        
        {/* Indicador de resultados */}
        {viewMode === 'cards' && searchQuery && (
          <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
            <Users className="h-4 w-4" />
            <span>
              {filteredClients.length === 0 ? (
                'No se encontraron clientes'
              ) : (
                <>
                  Mostrando {filteredClients.length} de {clients.length} cliente
                  {filteredClients.length !== 1 ? 's' : ''}
                </>
              )}
            </span>
            {filteredClients.length > 0 && searchQuery && (
              <button
                onClick={clearSearch}
                className="ml-2 text-blue-600 hover:text-blue-700 font-medium"
              >
                Ver todos
              </button>
            )}
          </div>
        )}
        
        {/* Info sobre vista actual */}
        {viewMode === 'orders' && (
          <div className="mt-3 bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm text-purple-800">
            <div className="flex items-start gap-2">
              <Users className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>
                <strong>Vista "Con Órdenes":</strong> Solo muestra clientes que tienen pedidos realizados. 
                Si buscas un cliente nuevo sin órdenes, cambia a la vista <button 
                  onClick={() => setViewMode('cards')}
                  className="underline font-semibold hover:text-purple-900"
                >"Tarjetas"</button>.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h3 className="text-xl font-bold mb-4">
            {editingId ? 'Editar Cliente' : 'Nuevo Cliente'}
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Nombre"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="border rounded-lg px-4 py-2"
            />
            <input
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="border rounded-lg px-4 py-2"
            />
            <input
              type="tel"
              placeholder="Teléfono"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              className="border rounded-lg px-4 py-2"
            />
            <input
              type="text"
              placeholder="Dirección"
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              className="border rounded-lg px-4 py-2"
            />
            <input
              type="text"
              placeholder="Código Postal (ej: 12345)"
              value={formData.zipCode}
              onChange={(e) =>
                setFormData({ ...formData, zipCode: e.target.value })
              }
              maxLength={10}
              className="border rounded-lg px-4 py-2"
            />
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={saveClient}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
            >
              {editingId ? 'Actualizar' : 'Guardar'}
            </button>
            <button
              onClick={cancelEdit}
              className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Vista de Clientes con Órdenes */}
      {viewMode === 'orders' && (
        <>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Clock className="h-8 w-8 text-gray-400 animate-spin mr-3" />
              <p className="text-gray-600">Cargando órdenes...</p>
            </div>
          ) : orders.length > 0 ? (
            <ClientsViewWithOrders 
              orders={orders}
              userRole="seller"
            />
          ) : (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No hay órdenes disponibles
              </h3>
              <p className="text-gray-500 mb-4">
                Una vez que los clientes realicen pedidos, aparecerán aquí organizados por cliente
              </p>
              <button
                onClick={() => setViewMode('cards')}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Ver lista de clientes
              </button>
            </div>
          )}
        </>
      )}

      {/* Vista de Tarjetas tradicional */}
      {viewMode === 'cards' && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.length === 0 ? (
            <div className="col-span-full">
              <Card>
                <CardContent className="p-12 text-center">
                  <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">
                    {searchQuery ? 'No se encontraron clientes' : 'No hay clientes'}
                  </h3>
                  <p className="text-gray-500">
                  {searchQuery
                    ? 'Intenta con otro término de búsqueda'
                    : 'Comienza agregando tu primer cliente'}
                </p>
                {searchQuery && (
                  <button
                    onClick={clearSearch}
                    className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Limpiar búsqueda
                  </button>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          filteredClients.map((client) => {
            const hasOrders = client.stats && client.stats.totalOrders > 0
            const isActive = hasOrders && client.stats!.totalOrders >= 3

            return (
              <Card
                key={client.id}
                className="shadow-lg hover:shadow-xl transition-all duration-200 border-0"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold mb-1">{client.name}</h3>
                      {isActive && (
                        <span className="inline-block px-2 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded-full">
                          Cliente Activo
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <div className="flex items-center gap-2">
                      <Mail size={16} className="text-blue-600" />
                      <span className="break-all">{client.email}</span>
                    </div>
                    {client.phone && (
                      <div className="flex items-center gap-2">
                        <Phone size={16} className="text-green-600" />
                        <span>{client.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <MapPin size={16} className="text-red-600" />
                      <span className="break-words">{client.address}</span>
                    </div>
                    {client.zipCode && (
                      <div className="flex items-center gap-2">
                        <MapPin size={16} className="text-purple-600" />
                        <span>CP: {client.zipCode}</span>
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  {client.stats && (
                    <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-xs text-gray-500">Órdenes</p>
                        <p className="text-lg font-bold text-blue-600">
                          {client.stats.totalOrders}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Total Gastado</p>
                        <p className="text-lg font-bold text-green-600">
                          ${client.stats.totalSpent.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Botones de Acción */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300"
                      onClick={() => startEdit(client)}
                    >
                      <Edit className="h-3 w-3" />
                      Editar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteClient(client.id)}
                      className="gap-1"
                    >
                      <Trash2 className="h-3 w-3" />
                      Eliminar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
        </div>
      )}
    </MainLayout>
  )
}