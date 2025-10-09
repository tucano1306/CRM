'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Users, Plus, Building, MapPin, Phone, Mail, Edit, Trash2, Search, ShoppingCart, DollarSign, TrendingUp, Clock } from 'lucide-react'
import MainLayout from '@/components/shared/MainLayout'
import PageHeader from '@/components/shared/PageHeader'

interface Client {
  id: string
  name: string
  address: string
  phone: string
  email: string
  createdAt: string
  seller?: {
    id: string
    name: string
  }
}

interface ClientStats {
  client: {
    id: string
    name: string
    email: string
  }
  stats: {
    totalOrders: number
    totalSpent: number
    averageOrderValue: number
    lastOrderDate: string | null
  }
}

interface ClientWithStats extends Client {
  stats?: ClientStats['stats']
}

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientWithStats[]>([])
  const [clientsStats, setClientsStats] = useState<ClientStats[]>([])
  const [showForm, setShowForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: ''
  })

  useEffect(() => {
    fetchClients()
    fetchClientsStats()
  }, [])

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/clients')
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setClients(result.data)
        }
      }
    } catch (error) {
      console.error('Error al cargar clientes:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchClientsStats = async () => {
    try {
      const response = await fetch('/api/analytics/clients')
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setClientsStats(result.data.topBySpending || [])
        }
      }
    } catch (error) {
      console.error('Error al cargar estadísticas:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const url = editingId ? `/api/clients/${editingId}` : '/api/clients'
      const method = editingId ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        setShowForm(false)
        setEditingId(null)
        setFormData({ name: '', address: '', phone: '', email: '' })
        fetchClients()
        fetchClientsStats()
      }
    } catch (error) {
      console.error('Error al guardar cliente:', error)
    } finally {
      setLoading(false)
    }
  }

  const startEdit = (client: Client) => {
    setEditingId(client.id)
    setFormData({
      name: client.name,
      address: client.address,
      phone: client.phone,
      email: client.email
    })
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setFormData({ name: '', address: '', phone: '', email: '' })
    setShowForm(false)
  }

  const deleteClient = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este cliente?')) return

    try {
      const response = await fetch(`/api/clients/${id}`, { method: 'DELETE' })
      if (response.ok) {
        fetchClients()
        fetchClientsStats()
      }
    } catch (error) {
      console.error('Error al eliminar cliente:', error)
    }
  }

  const clientsWithStats: ClientWithStats[] = clients.map(client => {
    const statsData = clientsStats.find(cs => cs.client.id === client.id)
    return { ...client, stats: statsData?.stats }
  })

  const filteredClients = clientsWithStats.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading && clients.length === 0) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando clientes...</p>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <PageHeader 
            title="Gestión de Clientes" 
            description="Administra tu cartera de clientes"
          />
          <Button 
            onClick={() => setShowForm(!showForm)}
            className="gap-2 w-full sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            Nuevo Cliente
          </Button>
        </div>

        {/* Búsqueda */}
        {clients.length > 0 && (
          <Card className="shadow-lg border-0">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nombre o email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Formulario */}
        {showForm && (
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle>{editingId ? 'Editar Cliente' : 'Agregar Nuevo Cliente'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Nombre del Cliente</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Nombre del restaurante"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="(555) 123-4567"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="contacto@empresa.com"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="address">Dirección</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="123 Main St, Miami FL"
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={cancelEdit}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Guardando...' : editingId ? 'Actualizar Cliente' : 'Crear Cliente'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Lista de Clientes */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredClients.map((client) => {
            const hasOrders = client.stats && client.stats.totalOrders > 0
            const isActive = hasOrders && client.stats!.totalOrders >= 3

            return (
              <Card key={client.id} className="shadow-lg hover:shadow-xl transition-all duration-200 border-0">
                <CardContent className="p-6">
                  {/* Header del Cliente */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`p-3 rounded-lg ${isActive ? 'bg-green-100' : 'bg-blue-100'}`}>
                        <Building className={`h-5 w-5 ${isActive ? 'text-green-600' : 'text-blue-600'}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-lg text-gray-900 truncate">
                          {client.name}
                        </h3>
                        {isActive && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-semibold">
                            Cliente Activo
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Información de Contacto */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-gray-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{client.address}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-gray-500 flex-shrink-0" />
                      <a href={`tel:${client.phone}`} className="text-blue-600 hover:text-blue-800">
                        {client.phone}
                      </a>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-gray-500 flex-shrink-0" />
                      <a href={`mailto:${client.email}`} className="text-blue-600 hover:text-blue-800 truncate">
                        {client.email}
                      </a>
                    </div>
                  </div>

                  {/* Estadísticas de Órdenes */}
                  {hasOrders ? (
                    <div className="bg-purple-50 rounded-lg p-4 mb-4">
                      <div className="flex items-center gap-2 mb-3">
                        <TrendingUp className="h-4 w-4 text-purple-600" />
                        <p className="text-sm font-semibold text-gray-900">Estadísticas de Compra</p>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-lg font-bold text-purple-600">
                            {client.stats!.totalOrders}
                          </p>
                          <p className="text-xs text-gray-600">Órdenes</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-green-600">
                            ${client.stats!.totalSpent.toFixed(0)}
                          </p>
                          <p className="text-xs text-gray-600">Gastado</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-blue-600">
                            ${client.stats!.averageOrderValue.toFixed(0)}
                          </p>
                          <p className="text-xs text-gray-600">Promedio</p>
                        </div>
                      </div>
                      {client.stats!.lastOrderDate && (
                        <div className="mt-3 pt-3 border-t border-purple-200">
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <Clock className="h-3 w-3" />
                            <span>
                              Última orden: {new Date(client.stats!.lastOrderDate).toLocaleDateString('es-ES')}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-4 mb-4 text-center">
                      <ShoppingCart className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-xs text-gray-500">Sin órdenes registradas</p>
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
          })}
        </div>

        {/* Empty State */}
        {clients.length === 0 && (
          <Card className="shadow-lg border-0">
            <CardContent className="text-center py-12">
              <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">No hay clientes registrados</p>
              <p className="text-gray-600 mb-4">Comienza agregando tu primer cliente para gestionar pedidos</p>
              <Button onClick={() => setShowForm(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Agregar Primer Cliente
              </Button>
            </CardContent>
          </Card>
        )}

        {/* No Search Results */}
        {clients.length > 0 && filteredClients.length === 0 && (
          <Card className="shadow-lg border-0">
            <CardContent className="text-center py-8">
              <Users className="h-8 w-8 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No se encontraron clientes que coincidan con "{searchTerm}"</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 gap-1 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300"
                onClick={() => setSearchTerm('')}
              >
                <Search className="h-3 w-3" />
                Limpiar Búsqueda
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  )
}