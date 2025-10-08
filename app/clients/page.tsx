'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import MainLayout from '@/components/shared/MainLayout'
import PageHeader from '@/components/shared/PageHeader'
import { Users, Plus, Edit, Trash2, Building, Phone, Mail, MapPin } from 'lucide-react'

interface Client {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  sellerId?: string;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: ''
  })

  useEffect(() => {
    fetchClients()
  }, [])

  const fetchClients = async () => {
  try {
    const response = await fetch('/api/clients')
    if (response.ok) {
      const result = await response.json()
      setClients(result.data || [])  // ← CORRECCIÓN
    }
  } catch (error) {
    console.error('Error al cargar clientes:', error)
    setClients([])  // ← Agregar esto también
  }
}

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        await fetchClients()
        setFormData({ name: '', address: '', phone: '', email: '' })
        setShowForm(false)
      } else {
        alert('Error al crear cliente')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al crear cliente')
    } finally {
      setLoading(false)
    }
  }

  const deleteClient = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este cliente?')) {
      try {
        const response = await fetch(`/api/clients/${id}`, {
          method: 'DELETE',
        })

        if (response.ok) {
          await fetchClients()
        } else {
          alert('Error al eliminar cliente')
        }
      } catch (error) {
        console.error('Error:', error)
        alert('Error al eliminar cliente')
      }
    }
  }

  // Filter clients based on search term
  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone.includes(searchTerm)
  )

  return (
    <MainLayout>
      <div className="space-y-6 sm:space-y-8">
        <PageHeader 
          title="Gestión de Clientes" 
          description="Administra tu base de clientes y sus datos de contacto"
          action={
            <Button 
              onClick={() => setShowForm(!showForm)}
              className="w-full sm:w-auto gap-2"
            >
              <Plus className="h-4 w-4" />
              {showForm ? 'Cancelar' : 'Agregar Cliente'}
            </Button>
          }
        />

        {/* Search bar - responsive */}
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          <div className="relative max-w-xs sm:max-w-md w-full">
            <Input
              type="text"
              placeholder="Buscar clientes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-4 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <div className="text-sm text-gray-600">
            {filteredClients.length} cliente{filteredClients.length !== 1 ? 's' : ''} encontrado{filteredClients.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Responsive form */}
        {showForm && (
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5 text-blue-600" />
                Nuevo Cliente
              </CardTitle>
              <CardDescription>Completa la información del cliente</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                {/* Full width field */}
                <div>
                  <Label htmlFor="name" className="text-sm font-semibold text-gray-700">
                    Nombre de la Empresa
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej: Restaurante La Plaza"
                    className="mt-1 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="address" className="text-sm font-semibold text-gray-700">
                    Dirección Completa
                  </Label>
                  <Input
                    id="address"
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="123 Main St, Miami FL 33101"
                    className="mt-1 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                </div>

                {/* Responsive grid for contact info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone" className="text-sm font-semibold text-gray-700">
                      Teléfono
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="(555) 123-4567"
                      className="mt-1 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="email" className="text-sm font-semibold text-gray-700">
                      Email de Contacto
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="contacto@empresa.com"
                      className="mt-1 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                {/* Responsive button */}
                <Button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full sm:w-auto sm:min-w-[200px] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creando...' : 'Crear Cliente'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Responsive clients grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredClients.map((client) => (
            <Card key={client.id} className="shadow-lg hover:shadow-xl transition-all duration-200 border-0">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <Building className="h-5 w-5 text-blue-600 flex-shrink-0" />
                      <span className="truncate">{client.name}</span>
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {/* Contact info with icons */}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-gray-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700 break-words">{client.address}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-500 flex-shrink-0" />
                      <a 
                        href={`tel:${client.phone}`}
                        className="text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        {client.phone}
                      </a>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-500 flex-shrink-0" />
                      <a 
                        href={`mailto:${client.email}`}
                        className="text-blue-600 hover:text-blue-800 transition-colors truncate"
                      >
                        {client.email}
                      </a>
                    </div>
                  </div>
                  
                  {/* Action buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 gap-1 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300"
                    >
                      <Edit className="h-3 w-3" />
                      <span className="hidden sm:inline">Editar</span>
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => deleteClient(client.id)}
                      className="gap-1"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span className="hidden sm:inline">Eliminar</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty state */}
        {clients.length === 0 && (
          <Card className="shadow-lg border-0">
            <CardContent className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">No hay clientes registrados</p>
              <p className="text-gray-600 mb-4 max-w-md mx-auto">
                Comienza agregando tu primer cliente para gestionar pedidos
              </p>
              <Button onClick={() => setShowForm(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Agregar Primer Cliente
              </Button>
            </CardContent>
          </Card>
        )}

        {/* No search results */}
        {clients.length > 0 && filteredClients.length === 0 && (
          <Card className="shadow-lg border-0">
            <CardContent className="text-center py-8">
              <Users className="h-8 w-8 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No se encontraron clientes que coincidan con "{searchTerm}"</p>
              <Button 
                variant="outline" 
                onClick={() => setSearchTerm('')}
                className="mt-3"
              >
                Limpiar búsqueda
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Mobile-friendly summary */}
        <div className="sm:hidden">
          <Card className="shadow-lg border-0">
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Total: <span className="font-semibold">{clients.length}</span> clientes registrados
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  )
}