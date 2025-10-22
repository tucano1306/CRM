'use client'

import { useEffect, useState } from 'react'
import { apiCall, getErrorMessage } from '@/lib/api-client'
import { Users, Plus, Mail, Phone, Loader2, Clock, AlertCircle } from 'lucide-react'
import MainLayout from '@/components/shared/MainLayout'
import PageHeader from '@/components/shared/PageHeader'
import { ClientCardSkeleton } from '@/components/skeletons'

type Client = {
  id: string
  name: string
  email: string
  phone: string | null
  address: string
  businessName: string
  createdAt: string
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [timedOut, setTimedOut] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  })

  useEffect(() => {
    fetchClients()
  }, [])

  // ✅ fetchClients CON TIMEOUT
  const fetchClients = async () => {
    try {
      setLoading(true)
      setTimedOut(false)
      setError(null)

      const result = await apiCall('/api/clients', {
        timeout: 5000,
        onTimeout: () => setTimedOut(true)
      })

      setLoading(false)

      if (result.success) {
        setClients(result.data.data || [])
      } else {
        setError(result.error || 'Error cargando clientes')
      }
    } catch (err) {
      setLoading(false)
      setError(getErrorMessage(err))
    }
  }

  // ✅ saveClient CON TIMEOUT
  const saveClient = async () => {
    if (!formData.name || !formData.email || !formData.phone || !formData.address) {
      alert('Todos los campos son requeridos')
      return
    }

    try {
      const result = await apiCall('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        timeout: 5000,
      })

      if (result.success) {
        setShowForm(false)
        setFormData({ name: '', email: '', phone: '', address: '' })
        fetchClients()
      } else {
        alert(result.error || 'Error al crear cliente')
      }
    } catch (err) {
      alert(getErrorMessage(err))
    }
  }

  // ✅ deleteClient CON TIMEOUT
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
      alert(getErrorMessage(err))
    }
  }

  // ✅ UI States
  if (loading) {
    return (
      <MainLayout>
        <PageHeader
          title="Clientes"
          description="Cargando clientes..."
        />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          <ClientCardSkeleton />
          <ClientCardSkeleton />
          <ClientCardSkeleton />
          <ClientCardSkeleton />
          <ClientCardSkeleton />
          <ClientCardSkeleton />
        </div>
      </MainLayout>
    )
  }

  if (timedOut) {
    return (
      <MainLayout>
        <div className="max-w-md mx-auto mt-8 bg-yellow-50 border border-yellow-200 p-6 rounded-lg">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="h-8 w-8 text-yellow-600" />
            <h2 className="text-xl font-bold text-yellow-900">Tiempo de espera excedido</h2>
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
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus size={20} />
            Nuevo Cliente
          </button>
        }
      />

      {/* Formulario */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h3 className="text-xl font-bold mb-4">Nuevo Cliente</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Nombre"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="border rounded-lg px-4 py-2"
            />
            <input
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="border rounded-lg px-4 py-2"
            />
            <input
              type="tel"
              placeholder="Teléfono"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="border rounded-lg px-4 py-2"
            />
            <input
              type="text"
              placeholder="Dirección"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="border rounded-lg px-4 py-2"
            />
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={saveClient}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
            >
              Guardar
            </button>
            <button
              onClick={() => {
                setShowForm(false)
                setFormData({ name: '', email: '', phone: '', address: '' })
              }}
              className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista de clientes */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clients.map((client) => (
          <div key={client.id} className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold mb-2">{client.name}</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Mail size={16} />
                <span>{client.email}</span>
              </div>
              {client.phone && (
                <div className="flex items-center gap-2">
                  <Phone size={16} />
                  <span>{client.phone}</span>
                </div>
              )}
              <p className="text-gray-500">{client.address}</p>
            </div>
            <button
              onClick={() => deleteClient(client.id)}
              className="mt-4 text-red-600 text-sm hover:text-red-700"
            >
              Eliminar
            </button>
          </div>
        ))}
      </div>
    </MainLayout>
  )
}