'use client'

import { useEffect, useState } from 'react'
import { Loader2, AlertCircle } from 'lucide-react'
import MainLayout from '@/components/shared/MainLayout'
import PageHeader from '@/components/shared/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { apiCall } from '@/lib/api-client'
import { downloadInvoice, openInvoiceInNewTab, type InvoiceData } from '@/lib/invoiceGenerator'
import OrderDetailModal from '@/components/orders/OrderDetailModal'
import ClientsViewWithOrders from '@/components/orders/ClientsViewWithOrders'

type OrderStatus = 
  | 'PENDING' 
  | 'CONFIRMED' 
  | 'PREPARING'
  | 'READY_FOR_PICKUP'
  | 'IN_DELIVERY'
  | 'DELIVERED'
  | 'PARTIALLY_DELIVERED'
  | 'COMPLETED' 
  | 'CANCELED'
  | 'PAYMENT_PENDING'
  | 'PAID'

interface OrderWithItems {
  id: string
  orderNumber: string
  status: OrderStatus
  totalAmount: number
  notes: string | null
  deliveryInstructions: string | null
  createdAt: string
  clientId: string  // Agregado para compatibilidad con ClientsViewWithOrders
  client: {
    id: string
    name: string
    businessName?: string
    email: string
    phone: string
    address: string
  }
  seller: {
    id: string
    name: string
    email: string
    phone: string
  }
  orderItems: Array<{
    id: string
    productName: string
    quantity: number
    pricePerUnit: number
    subtotal: number
    itemNote?: string | null
    product: {
      id: string
      sku: string | null
      unit: string
    }
  }>
}

export default function OrdersManagementPage() {
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null)
  const [generatingInvoice, setGeneratingInvoice] = useState<string | null>(null)

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const result = await apiCall('/api/orders', { timeout: 10000 })
      
      if (result.success) {
        // El API devuelve { success: true, orders: [], stats: {} }
        // Mapear las órdenes para agregar clientId desde client.id
        const ordersWithClientId = (result.data?.orders || []).map((order: any) => ({
          ...order,
          clientId: order.client?.id || ''
        }))
        setOrders(ordersWithClientId)
      } else {
        setError(result.error || 'Error al cargar órdenes')
      }
    } catch (err) {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const prepareInvoiceData = (order: OrderWithItems): InvoiceData => {
    const subtotal = order.orderItems.reduce((sum, item) => sum + Number(item.subtotal), 0)
    const taxRate = 0.10
    const taxAmount = subtotal * taxRate
    const total = subtotal + taxAmount

    const invoiceDate = new Date(order.createdAt)
    const dueDate = new Date(invoiceDate)
    dueDate.setDate(dueDate.getDate() + 30)

    return {
      invoiceNumber: order.orderNumber,
      invoiceDate,
      dueDate,
      
      // ACTUALIZA ESTOS DATOS CON TU EMPRESA
      sellerName: 'Food Orders CRM',
      sellerAddress: '123 Main Street, Miami, FL 33139',
      sellerPhone: '(305) 555-0123',
      sellerEmail: order.seller.email,
      sellerTaxId: '12-3456789',
      
      clientName: order.client.name,
      clientBusinessName: order.client.businessName,
      clientAddress: order.client.address,
      clientPhone: order.client.phone,
      clientEmail: order.client.email,
      
      items: order.orderItems.map(item => ({
        sku: item.product.sku,
        name: item.productName,
        quantity: item.quantity,
        unit: item.product.unit,
        pricePerUnit: item.pricePerUnit,
        subtotal: item.subtotal
      })),
      
      subtotal,
      taxRate,
      taxAmount,
      total,
      
      paymentMethod: 'Transferencia Bancaria',
      paymentTerms: 'Pago a 30 días. Se aceptan transferencias bancarias, cheques o efectivo.',
      notes: order.notes || undefined,
      termsAndConditions: 'Los productos entregados son responsabilidad del comprador una vez firmada la entrega. Las devoluciones deben realizarse dentro de las 24 horas siguientes a la entrega.'
    }
  }

  const handleDownloadInvoice = async (order: OrderWithItems) => {
    try {
      setGeneratingInvoice(order.id)
      const invoiceData = prepareInvoiceData(order)
      downloadInvoice(invoiceData, `Factura-${order.orderNumber}.pdf`)
    } catch (error) {
      console.error('Error generando factura:', error)
      alert('Error al generar la factura')
    } finally {
      setGeneratingInvoice(null)
    }
  }

  const handleViewInvoice = async (order: OrderWithItems) => {
    try {
      setGeneratingInvoice(order.id)
      const invoiceData = prepareInvoiceData(order)
      openInvoiceInNewTab(invoiceData)
    } catch (error) {
      console.error('Error generando factura:', error)
      alert('Error al generar la factura')
    } finally {
      setGeneratingInvoice(null)
    }
  }

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus, notes?: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, notes })
      })

      const result = await response.json()

      if (result.success) {
        // Actualizar la orden en el estado local
        setOrders(prevOrders =>
          prevOrders.map(order =>
            order.id === orderId
              ? { ...order, status: newStatus }
              : order
          )
        )
        
        // Si hay una orden seleccionada, actualizarla también
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder({ ...selectedOrder, status: newStatus })
        }
        
        // Recargar órdenes para obtener datos frescos
        await fetchOrders()
      } else {
        alert(result.error || 'Error al actualizar el estado')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error de conexión al actualizar el estado')
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <Loader2 className="animate-spin h-12 w-12 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-4 text-gray-600">Cargando órdenes...</p>
          </div>
        </div>
      </MainLayout>
    )
  }

  if (error) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-screen">
          <Card className="max-w-md">
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Error</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={fetchOrders}>Reintentar</Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader 
          title="Gestión de Órdenes por Cliente" 
          description="Visualiza y administra órdenes organizadas por cliente"
        />

        {/* Componente principal de vista por clientes */}
        <ClientsViewWithOrders 
          orders={orders}
          userRole="SELLER"
          onOrderClick={(order) => setSelectedOrder(order as OrderWithItems)}
        />

        {/* Modal de Detalle de Orden */}
        {selectedOrder && (
          <OrderDetailModal
            order={selectedOrder}
            isOpen={!!selectedOrder}
            onClose={() => setSelectedOrder(null)}
            userRole="seller"
            onStatusChange={handleStatusChange}
            onDownloadInvoice={(order) => handleDownloadInvoice(order as OrderWithItems)}
            onViewInvoice={(order) => handleViewInvoice(order as OrderWithItems)}
            isGeneratingInvoice={generatingInvoice === selectedOrder.id}
          />
        )}
      </div>
    </MainLayout>
  )
}
