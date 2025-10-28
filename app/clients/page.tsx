'use client'

import { useEffect, useState } from 'react'
import MainLayout from '@/components/shared/MainLayout'
import PageHeader from '@/components/shared/PageHeader'
import { apiCall } from '@/lib/api-client'
import ClientProfileCard from '@/components/clients/ClientProfileCard'
import { formatPrice } from '@/lib/utils'
import { 
  Plus, 
  Clock, 
  AlertCircle,
  Search,
  X,
  Users,
  TrendingUp,
  DollarSign,
  ShoppingBag
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timedOut, setTimedOut] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    zipCode: '',
  })

  useEffect(() => {
    fetchClients()
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
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="animate-pulse bg-white rounded-2xl shadow-lg p-6 border-2 border-gray-200">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-gray-200 rounded-full" />
                <div className="flex-1">
                  <div className="h-6 bg-gray-200 rounded mb-2 w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded" />
                <div className="h-4 bg-gray-200 rounded" />
                <div className="h-4 bg-gray-200 rounded w-2/3" />
              </div>
            </div>
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
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
          >
            <Plus size={20} />
            Nuevo Cliente
          </button>
        }
      />

      {/* Estadísticas generales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium mb-1">Total Clientes</p>
              <p className="text-4xl font-bold">{clients.length}</p>
            </div>
            <Users className="w-12 h-12 text-blue-200 opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-700 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium mb-1">Órdenes Totales</p>
              <p className="text-4xl font-bold">
                {clients.reduce((sum, c) => sum + (c.stats?.totalOrders || 0), 0)}
              </p>
            </div>
            <ShoppingBag className="w-12 h-12 text-green-200 opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium mb-1">Ingresos Totales</p>
              <p className="text-4xl font-bold">
                {formatPrice(clients.reduce((sum, c) => sum + (c.stats?.totalSpent || 0), 0))}
              </p>
            </div>
            <DollarSign className="w-12 h-12 text-purple-200 opacity-80" />
          </div>
        </div>
      </div>

      {/* Barra de búsqueda moderna */}
      <div className="mb-6">
        <div className="relative max-w-2xl">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar por nombre, email, teléfono o dirección..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-12 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all text-lg"
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
        {searchQuery && (
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
      </div>

      {/* Formulario de cliente */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-2xl p-8 mb-6 border-2 border-blue-100">
          <h3 className="text-2xl font-bold mb-6 text-gray-800">
            {editingId ? '✏️ Editar Cliente' : '➕ Nuevo Cliente'}
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nombre completo</label>
              <input
                type="text"
                placeholder="Ej: Juan Pérez"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                placeholder="ejemplo@correo.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Teléfono</label>
              <input
                type="tel"
                placeholder="123-456-7890"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Código Postal</label>
              <input
                type="text"
                placeholder="12345"
                value={formData.zipCode}
                onChange={(e) =>
                  setFormData({ ...formData, zipCode: e.target.value })
                }
                maxLength={10}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Dirección completa</label>
              <input
                type="text"
                placeholder="Calle, número, colonia, ciudad"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button
              onClick={saveClient}
              className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-xl hover:from-green-600 hover:to-green-700 font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              {editingId ? '💾 Actualizar' : '✅ Guardar'}
            </button>
            <button
              onClick={cancelEdit}
              className="px-8 bg-gray-200 text-gray-700 py-3 rounded-xl hover:bg-gray-300 font-semibold transition-all"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Vista de tarjetas de clientes */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClients.length === 0 ? (
          <div className="col-span-full">
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center border-2 border-gray-100">
              <Search className="h-20 w-20 text-gray-300 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-700 mb-2">
                {searchQuery ? 'No se encontraron clientes' : 'No hay clientes registrados'}
              </h3>
              <p className="text-gray-500 mb-6 text-lg">
                {searchQuery
                  ? 'Intenta con otro término de búsqueda'
                  : 'Comienza agregando tu primer cliente haciendo clic en "Nuevo Cliente"'}
              </p>
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="text-blue-600 hover:text-blue-700 font-semibold text-lg"
                >
                  🔄 Limpiar búsqueda
                </button>
              )}
            </div>
          </div>
        ) : (
          filteredClients.map((client, index) => (
            <ClientProfileCard
              key={client.id}
              client={client}
              onEdit={startEdit}
              onDelete={deleteClient}
              colorIndex={index}
            />
          ))
        )}
      </div>
    </MainLayout>
  )
}