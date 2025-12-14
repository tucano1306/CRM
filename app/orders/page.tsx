'use client'

import { Suspense, useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2, AlertCircle, AlertTriangle, Clock, Bell } from 'lucide-react'
import { useUser } from '@clerk/nextjs'
import MainLayout from '@/components/shared/MainLayout'
import PageHeader from '@/components/shared/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { apiCall } from '@/lib/api-client'
import { downloadInvoice, openInvoiceInNewTab, type InvoiceData } from '@/lib/invoiceGenerator'
import ClientsViewWithOrders from '@/components/orders/ClientsViewWithOrders'
import { useRealtimeSubscription, RealtimeEvents } from '@/lib/supabase-realtime'

type OrderStatus = 
  | 'PENDING' 
  | 'REVIEWING'
  | 'ISSUE_REPORTED'
  | 'LOCKED'
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
  hasIssues?: boolean
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
    confirmed?: boolean
    itemNote?: string | null
    availableQty?: number | null
    issueNote?: string | null
    isDeleted?: boolean
    deletedReason?: string | null
    deletedAt?: string | null
    substitutedWith?: string | null
    substituteName?: string | null
    product: {
      id: string
      sku: string | null
      unit: string
    }
  }>
  issues?: Array<{
    id: string
    productName: string
    issueType: string
    requestedQty: number
    availableQty: number
    status: string
  }>
  creditNoteUsages?: Array<{
    id: string
    amountUsed: number
    creditNote: {
      id: string
      creditNoteNumber: string
      amount: number
      balance: number  // Cambiado de remainingAmount a balance
    }
  }>
}

function OrdersPageContent() {
  const { user } = useUser()
  const searchParams = useSearchParams()
  const orderIdFromUrl = searchParams.get('orderId') || searchParams.get('id')
  
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [generatingInvoice, setGeneratingInvoice] = useState<string | null>(null)

  // Calcular órdenes pendientes
  const pendingOrdersStats = useMemo(() => {
    const pending = orders.filter(order => order.status === 'PENDING')
    const oldestPending = pending.length > 0 
      ? Math.max(...pending.map(o => Date.now() - new Date(o.createdAt).getTime()))
      : 0
    
    return {
      count: pending.length,
      orders: pending,
      hasOldOrders: oldestPending > 24 * 60 * 60 * 1000, // Más de 24 horas
      oldestAgeHours: Math.floor(oldestPending / (60 * 60 * 1000))
    }
  }, [orders])

  // Tiempo real: escuchar cambios en órdenes vía Supabase
  useRealtimeSubscription(
    `seller-${user?.id || 'unknown'}`,
    RealtimeEvents.ORDER_STATUS_CHANGED,
    (payload) => {
      console.log('🔄 Order updated in realtime:', payload)
      // Refrescar órdenes cuando hay cambios
      fetchOrders()
    },
    !!user?.id // Solo activar si hay userId
  )

  // Tiempo real: escuchar cuando se agregan productos a órdenes
  useRealtimeSubscription(
    `seller-${user?.id || 'unknown'}`,
    RealtimeEvents.ORDER_ITEM_ADDED,
    (payload) => {
      console.log('🔄 Product added to order in realtime:', payload)
      // Refrescar órdenes cuando hay cambios
      fetchOrders()
    },
    !!user?.id
  )

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
    const totalBeforeCredits = subtotal + taxAmount
    
    // Calcular créditos aplicados
    const creditNotesUsed = order.creditNoteUsages?.map(usage => ({
      creditNoteId: usage.creditNote.id,
      creditNoteNumber: usage.creditNote.creditNoteNumber,
      amountUsed: Number(usage.amountUsed),
      originalAmount: Number(usage.creditNote.amount),
      remainingAmount: Number(usage.creditNote.balance)  // Cambiado de remainingAmount a balance
    })) || []
    
    const totalCreditApplied = creditNotesUsed.reduce((sum, credit) => sum + credit.amountUsed, 0)
    const total = totalBeforeCredits - totalCreditApplied

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
      totalBeforeCredits,
      creditNotesUsed: creditNotesUsed.length > 0 ? creditNotesUsed : undefined,
      totalCreditApplied: totalCreditApplied > 0 ? totalCreditApplied : undefined,
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
      <div className="space-y-6 page-transition">
        <PageHeader 
          title="Gestión de Órdenes por Cliente" 
          description="Visualiza y administra órdenes organizadas por cliente"
        />

        {/* Alerta de Órdenes Pendientes */}
        {pendingOrdersStats.count > 0 && (
          <div className={`
            ${pendingOrdersStats.hasOldOrders 
              ? 'bg-red-50 border-red-200 text-red-900' 
              : 'bg-yellow-50 border-yellow-200 text-yellow-900'
            } 
            border-2 rounded-lg p-3 sm:p-4 shadow-lg animate-pulse overflow-hidden
          `}>
            <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
              <div className={`
                flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center
                ${pendingOrdersStats.hasOldOrders ? 'bg-red-100' : 'bg-yellow-100'}
              `}>
                {pendingOrdersStats.hasOldOrders ? (
                  <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
                ) : (
                  <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600 animate-bounce" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-sm sm:text-lg font-bold leading-tight">
                    {pendingOrdersStats.hasOldOrders 
                      ? '⚠️ ATENCIÓN: Órdenes Urgentes' 
                      : '📋 Órdenes pendientes'}
                  </h3>
                </div>
                
                <p className="text-xs sm:text-sm mb-3">
                  Tienes <strong className="font-bold text-lg sm:text-xl">{pendingOrdersStats.count}</strong> {pendingOrdersStats.count === 1 ? 'orden pendiente' : 'órdenes pendientes'} 
                  {pendingOrdersStats.hasOldOrders && (
                    <span className="block sm:inline sm:ml-2 text-red-700 font-semibold text-xs">
                      (La más antigua: {pendingOrdersStats.oldestAgeHours}h sin revisar)
                    </span>
                  )}
                </p>

                <div className="bg-white rounded-lg p-2 sm:p-3 shadow-sm overflow-hidden">
                  <p className="text-xs sm:text-sm font-medium mb-2">Órdenes que requieren tu atención:</p>
                  <div className="space-y-1">
                    {pendingOrdersStats.orders.slice(0, 5).map(order => {
                      const ageHours = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / (60 * 60 * 1000))
                      const isOld = ageHours > 24
                      
                      return (
                        <div 
                          key={order.id} 
                          className={`
                            flex flex-col sm:flex-row sm:items-center sm:justify-between p-2 rounded text-xs gap-1
                            ${isOld ? 'bg-red-50' : 'bg-gray-50'}
                          `}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Clock className={`w-3 h-3 flex-shrink-0 ${isOld ? 'text-red-600' : 'text-gray-500'}`} />
                            <span className="font-semibold">{order.orderNumber}</span>
                            <span className="text-gray-600 hidden sm:inline">-</span>
                            <span className="truncate">{order.client.name}</span>
                          </div>
                          <span className={`font-medium whitespace-nowrap ${isOld ? 'text-red-700' : 'text-gray-600'}`}>
                            {ageHours < 1 
                              ? 'Hace <1h' 
                              : `Hace ${ageHours}h`
                            }
                          </span>
                        </div>
                      )
                    })}
                  </div>
                  {pendingOrdersStats.count > 5 && (
                    <p className="text-xs text-gray-600 mt-2 text-center">
                      ... y {pendingOrdersStats.count - 5} órdenes más
                    </p>
                  )}
                </div>

                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    className={`
                      ${pendingOrdersStats.hasOldOrders 
                        ? 'bg-red-600 hover:bg-red-700' 
                        : 'bg-yellow-600 hover:bg-yellow-700'
                      } 
                      text-white
                    `}
                    onClick={() => {
                      // Buscar el primer cliente con órdenes pendientes y hacer click
                      const firstClientWithPending = document.querySelector('[data-client-has-pending="true"]') as HTMLElement
                      if (firstClientWithPending) {
                        firstClientWithPending.scrollIntoView({ behavior: 'smooth', block: 'center' })
                        // Dar tiempo al scroll y luego hacer click para abrir el modal
                        setTimeout(() => {
                          firstClientWithPending.click()
                        }, 500)
                      }
                    }}
                  >
                    Revisar Órdenes Pendientes
                  </Button>
                  
                  <div className="text-xs text-gray-600 flex items-center">
                    💡 Las órdenes pendientes necesitan ser confirmadas para procesar
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Componente principal de vista por clientes */}
        <ClientsViewWithOrders 
          orders={orders}
          userRole="seller"
          onStatusChange={handleStatusChange}
          initialOrderId={orderIdFromUrl || undefined}
        />
      </div>
    </MainLayout>
  )
}

// Loading fallback para Suspense
function OrdersPageLoading() {
  return (
    <MainLayout userRole="seller">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg p-4 h-32">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  )
}

// Export default con Suspense para useSearchParams
export default function OrdersPage() {
  return (
    <Suspense fallback={<OrdersPageLoading />}>
      <OrdersPageContent />
    </Suspense>
  )
}
