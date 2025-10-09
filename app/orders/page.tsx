'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { ShoppingCart, Plus, Eye, CheckCircle, XCircle, Clock, DollarSign, Package, User } from 'lucide-react'
import MainLayout from '@/components/shared/MainLayout'
import PageHeader from '@/components/shared/PageHeader'

interface OrderItem {
  id: string
  productId: string
  productName: string
  quantity: number
  pricePerUnit: number
  subtotal: number
  confirmed: boolean
}

interface Order {
  id: string
  clientId: string
  clientName?: string
  sellerId: string
  sellerName?: string
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELED'
  totalAmount: number
  createdAt: string
  updatedAt: string
  items: OrderItem[]
}

interface Client {
  id: string
  name: string
}

interface Product {
  id: string
  name: string
  price: number
  stock: number
}

interface NewOrderItem {
  productId: string
  quantity: number
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('ALL')
  
  const [newOrder, setNewOrder] = useState({
    clientId: '',
    items: [] as NewOrderItem[]
  })

  useEffect(() => {
    fetchOrders()
    fetchClients()
    fetchProducts()
  }, [])

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/orders')
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setOrders(result.data)
        }
      }
    } catch (error) {
      console.error('Error al cargar órdenes:', error)
    } finally {
      setLoading(false)
    }
  }

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
    }
  }

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products')
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setProducts(result.data)
        }
      }
    } catch (error) {
      console.error('Error al cargar productos:', error)
    }
  }

  const addProductToOrder = () => {
    setNewOrder({
      ...newOrder,
      items: [...newOrder.items, { productId: '', quantity: 1 }]
    })
  }

  const updateOrderItem = (index: number, field: 'productId' | 'quantity', value: string | number) => {
    const updatedItems = [...newOrder.items]
    updatedItems[index] = { ...updatedItems[index], [field]: value }
    setNewOrder({ ...newOrder, items: updatedItems })
  }

  const removeOrderItem = (index: number) => {
    setNewOrder({
      ...newOrder,
      items: newOrder.items.filter((_, i) => i !== index)
    })
  }

  const createOrder = async () => {
    if (!newOrder.clientId || newOrder.items.length === 0) {
      alert('Por favor selecciona un cliente y agrega al menos un producto')
      return
    }

    // Validar que todos los items tengan producto seleccionado
    const invalidItems = newOrder.items.some(item => !item.productId || item.quantity <= 0)
    if (invalidItems) {
      alert('Por favor completa todos los productos y cantidades')
      return
    }

    try {
      // Primero, obtener el primer seller disponible
      const sellersResponse = await fetch('/api/sellers')
      let sellerId = 'user-seller-1' // Default fallback

      if (sellersResponse.ok) {
        const sellersResult = await sellersResponse.json()
        if (sellersResult.success && sellersResult.data.length > 0) {
          sellerId = sellersResult.data[0].id
        }
      }

      // Crear la orden con el sellerId
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: newOrder.clientId,
          sellerId: sellerId,
          items: newOrder.items
        })
      })

      if (response.ok) {
        setShowCreateForm(false)
        setNewOrder({ clientId: '', items: [] })
        fetchOrders()
        fetchProducts() // Actualizar stock
        alert('Orden creada exitosamente')
      } else {
        const error = await response.json()
        alert(error.error || 'Error al crear orden')
      }
    } catch (error) {
      console.error('Error al crear orden:', error)
      alert('Error al crear orden')
    }
  }

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        fetchOrders()
        setSelectedOrder(null)
      }
    } catch (error) {
      console.error('Error al actualizar orden:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      PENDING: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Pendiente' },
      CONFIRMED: { color: 'bg-blue-100 text-blue-800', icon: CheckCircle, label: 'Confirmada' },
      COMPLETED: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Completada' },
      CANCELED: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Cancelada' }
    }
    return badges[status as keyof typeof badges] || badges.PENDING
  }

  const filteredOrders = filterStatus === 'ALL' 
    ? orders 
    : orders.filter(order => order.status === filterStatus)

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando órdenes...</p>
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
            title="Gestión de Órdenes" 
            description="Administra todas las órdenes de tus clientes"
          />
          <Button 
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="gap-2 w-full sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            Nueva Orden
          </Button>
        </div>

        {/* Estadísticas Rápidas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="shadow-lg border-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="bg-yellow-100 p-3 rounded-lg">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {orders.filter(o => o.status === 'PENDING').length}
                  </p>
                  <p className="text-xs text-gray-600">Pendientes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {orders.filter(o => o.status === 'CONFIRMED').length}
                  </p>
                  <p className="text-xs text-gray-600">Confirmadas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-3 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {orders.filter(o => o.status === 'COMPLETED').length}
                  </p>
                  <p className="text-xs text-gray-600">Completadas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-100 p-3 rounded-lg">
                  <DollarSign className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    ${orders.filter(o => o.status === 'COMPLETED').reduce((sum, o) => sum + o.totalAmount, 0).toFixed(0)}
                  </p>
                  <p className="text-xs text-gray-600">Total Ventas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="shadow-lg border-0">
          <CardContent className="p-4">
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={filterStatus === 'ALL' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('ALL')}
              >
                Todas
              </Button>
              <Button
                variant={filterStatus === 'PENDING' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('PENDING')}
              >
                Pendientes
              </Button>
              <Button
                variant={filterStatus === 'CONFIRMED' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('CONFIRMED')}
              >
                Confirmadas
              </Button>
              <Button
                variant={filterStatus === 'COMPLETED' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('COMPLETED')}
              >
                Completadas
              </Button>
              <Button
                variant={filterStatus === 'CANCELED' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('CANCELED')}
              >
                Canceladas
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Formulario Crear Orden */}
        {showCreateForm && (
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle>Crear Nueva Orden</CardTitle>
              <CardDescription>Selecciona un cliente y agrega productos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="client">Cliente</Label>
                <select
                  id="client"
                  value={newOrder.clientId}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewOrder({ ...newOrder, clientId: e.target.value })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                  required
                >
                  <option value="">Seleccionar cliente...</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label>Productos</Label>
                  <Button type="button" size="sm" onClick={addProductToOrder} className="gap-1">
                    <Plus className="h-3 w-3" />
                    Agregar Producto
                  </Button>
                </div>

                {newOrder.items.map((item, index) => (
                  <div key={index} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Label className="text-xs">Producto</Label>
                      <select
                        value={item.productId}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateOrderItem(index, 'productId', e.target.value)}
                        className="w-full rounded-md border border-input bg-background px-3 py-2"
                      >
                        <option value="">Seleccionar...</option>
                        {products.map(product => (
                          <option key={product.id} value={product.id}>
                            {product.name} - ${product.price} (Stock: {product.stock})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="w-24">
                      <Label className="text-xs">Cantidad</Label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateOrderItem(index, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-full rounded-md border border-input bg-background px-3 py-2"
                      />
                    </div>

                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeOrderItem(index)}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                {newOrder.items.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No hay productos agregados. Haz clic en "Agregar Producto"
                  </p>
                )}
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => {
                  setShowCreateForm(false)
                  setNewOrder({ clientId: '', items: [] })
                }}>
                  Cancelar
                </Button>
                <Button type="button" onClick={createOrder}>
                  Crear Orden
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lista de Órdenes */}
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const badge = getStatusBadge(order.status)
            const StatusIcon = badge.icon

            return (
              <Card key={order.id} className="shadow-lg hover:shadow-xl transition-all duration-200 border-0">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    {/* Info Principal */}
                    <div className="flex-1">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="bg-blue-100 p-3 rounded-lg">
                          <ShoppingCart className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-lg text-gray-900">
                              Orden #{order.id.slice(0, 8)}
                            </h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${badge.color}`}>
                              <StatusIcon className="h-3 w-3" />
                              {badge.label}
                            </span>
                          </div>
                          <div className="space-y-1 text-sm text-gray-600">
                            <p className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              Cliente: <span className="font-medium">{order.clientName || order.clientId}</span>
                            </p>
                            <p>Fecha: {new Date(order.createdAt).toLocaleDateString('es-ES')}</p>
                            <p className="flex items-center gap-2">
                              <Package className="h-4 w-4" />
                              {order.items.length} producto(s)
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Items */}
                      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex justify-between text-sm">
                            <span className="text-gray-700">
                              {item.productName} × {item.quantity}
                            </span>
                            <span className="font-semibold text-gray-900">
                              ${item.subtotal.toFixed(2)}
                            </span>
                          </div>
                        ))}
                        <div className="border-t pt-2 flex justify-between font-bold text-gray-900">
                          <span>TOTAL:</span>
                          <span className="text-green-600">${order.totalAmount.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex md:flex-col gap-2 md:w-32">
                      {order.status === 'PENDING' && (
                        <>
                          <Button
                            size="sm"
                            className="flex-1 gap-1"
                            onClick={() => updateOrderStatus(order.id, 'CONFIRMED')}
                          >
                            <CheckCircle className="h-3 w-3" />
                            Confirmar
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="flex-1 gap-1"
                            onClick={() => updateOrderStatus(order.id, 'CANCELED')}
                          >
                            <XCircle className="h-3 w-3" />
                            Cancelar
                          </Button>
                        </>
                      )}
                      {order.status === 'CONFIRMED' && (
                        <Button
                          size="sm"
                          className="flex-1 gap-1 bg-green-600 hover:bg-green-700"
                          onClick={() => updateOrderStatus(order.id, 'COMPLETED')}
                        >
                          <CheckCircle className="h-3 w-3" />
                          Completar
                        </Button>
                      )}
                      {(order.status === 'COMPLETED' || order.status === 'CANCELED') && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 gap-1"
                          disabled
                        >
                          <Eye className="h-3 w-3" />
                          Ver Detalles
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}

          {filteredOrders.length === 0 && (
            <Card className="shadow-lg border-0">
              <CardContent className="text-center py-12">
                <ShoppingCart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">
                  {filterStatus === 'ALL' ? 'No hay órdenes registradas' : `No hay órdenes ${filterStatus.toLowerCase()}`}
                </p>
                <p className="text-gray-600 mb-4">
                  {filterStatus === 'ALL' ? 'Comienza creando tu primera orden' : 'Cambia el filtro para ver otras órdenes'}
                </p>
                {filterStatus === 'ALL' && (
                  <Button onClick={() => setShowCreateForm(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Crear Primera Orden
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </MainLayout>
  )
}