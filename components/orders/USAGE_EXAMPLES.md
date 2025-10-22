// components/orders/USAGE_EXAMPLES.md
# Ejemplos de Uso del Componente InvoiceButton

## Ejemplo 1: Botón Simple de Descarga

```tsx
import InvoiceButton from '@/components/orders/InvoiceButton'

<InvoiceButton 
  order={order}
  variant="download"
  size="default"
/>
```

## Ejemplo 2: Botón para Ver Factura (Preview)

```tsx
<InvoiceButton 
  order={order}
  variant="view"
  size="sm"
/>
```

## Ejemplo 3: Ambos Botones (Ver y Descargar)

```tsx
<InvoiceButton 
  order={order}
  variant="both"
  size="default"
/>
```

## Ejemplo 4: En una Lista de Órdenes

```tsx
// app/orders/page.tsx
import InvoiceButton from '@/components/orders/InvoiceButton'

export default function OrdersPage() {
  const orders = await fetchOrders()

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <Card key={order.id}>
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold">{order.orderNumber}</h3>
                <p className="text-sm text-gray-600">{order.client.name}</p>
              </div>
              
              {/* Botones de factura */}
              <InvoiceButton order={order} variant="both" size="sm" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
```

## Ejemplo 5: En Detalle de Orden

```tsx
// app/orders/[id]/page.tsx
import InvoiceButton from '@/components/orders/InvoiceButton'

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const order = await fetchOrderById(params.id)

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <PageHeader title={`Orden ${order.orderNumber}`} />
          
          {/* Botones de factura en header */}
          <InvoiceButton order={order} variant="both" />
        </div>

        {/* Detalles de la orden */}
        <Card>
          <CardHeader>
            <CardTitle>Detalles</CardTitle>
          </CardHeader>
          <CardContent>
            {/* ... contenido ... */}
          </CardContent>
        </Card>

        {/* Sección de factura */}
        <Card>
          <CardHeader>
            <CardTitle>Factura</CardTitle>
            <CardDescription>
              Genera y descarga la factura en formato PDF
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InvoiceButton order={order} variant="both" size="lg" />
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
```

## Ejemplo 6: Con Menú Dropdown

```tsx
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreVertical, FileText, Download, Eye } from 'lucide-react'

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="sm">
      <MoreVertical className="h-4 w-4" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem onClick={() => handleView(order)}>
      <Eye className="h-4 w-4 mr-2" />
      Ver Factura
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => handleDownload(order)}>
      <Download className="h-4 w-4 mr-2" />
      Descargar PDF
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

## Ejemplo 7: Preparar Datos de Orden para el Componente

```tsx
// Función helper para formatear datos de orden
function formatOrderForInvoice(prismaOrder: any) {
  return {
    id: prismaOrder.id,
    orderNumber: prismaOrder.orderNumber,
    createdAt: prismaOrder.createdAt.toISOString(),
    totalAmount: prismaOrder.totalAmount,
    notes: prismaOrder.notes,
    client: {
      name: prismaOrder.client.name,
      businessName: prismaOrder.client.businessName || undefined,
      address: prismaOrder.client.address,
      phone: prismaOrder.client.phone,
      email: prismaOrder.client.email,
    },
    seller: {
      name: prismaOrder.seller?.name || 'Vendedor',
      email: prismaOrder.seller?.email || 'ventas@empresa.com',
      phone: prismaOrder.seller?.phone || '(000) 000-0000',
    },
    orderItems: prismaOrder.orderItems.map((item: any) => ({
      productName: item.product.name,
      quantity: item.quantity,
      pricePerUnit: item.priceAtOrder,
      subtotal: item.quantity * item.priceAtOrder,
      product: {
        sku: item.product.sku,
        unit: item.product.unit,
      },
    })),
  }
}

// Uso:
const prismaOrder = await prisma.order.findUnique({
  where: { id: orderId },
  include: {
    client: true,
    seller: true,
    orderItems: {
      include: {
        product: true,
      },
    },
  },
})

const formattedOrder = formatOrderForInvoice(prismaOrder)

<InvoiceButton order={formattedOrder} variant="both" />
```

## Ejemplo 8: API Route para Generar Factura

```tsx
// app/api/orders/[id]/invoice/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getInvoiceBlob } from '@/lib/invoiceGenerator'
import { convertOrderToInvoice } from '@/lib/orderToInvoice'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        client: true,
        seller: true,
        orderItems: {
          include: {
            product: true
          }
        }
      }
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Orden no encontrada' },
        { status: 404 }
      )
    }

    // Convertir orden a datos de factura
    const invoiceData = convertOrderToInvoice(order, {
      taxRate: 0.10,
      paymentTerms: 'Pago a 30 días',
      sellerAddress: '123 Main Street, Miami, FL',
      sellerTaxId: '12-3456789'
    })

    // Generar PDF
    const pdfBlob = getInvoiceBlob(invoiceData)

    // Retornar PDF
    return new NextResponse(pdfBlob, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Factura-${order.orderNumber}.pdf"`
      }
    })
  } catch (error) {
    console.error('Error generando factura:', error)
    return NextResponse.json(
      { error: 'Error al generar factura' },
      { status: 500 }
    )
  }
}
```

## Personalización

### Cambiar Tasa de Impuestos

```tsx
// En InvoiceButton.tsx, línea ~46
const taxRate = 0.16 // Cambiar a 16% (IVA México)
```

### Cambiar Información del Vendedor

```tsx
// En InvoiceButton.tsx, líneas ~56-61
sellerName: 'Tu Empresa S.A.',
sellerAddress: 'Tu Dirección Completa',
sellerPhone: 'Tu Teléfono',
sellerEmail: order.seller.email,
sellerTaxId: 'Tu RFC o Tax ID',
```

### Cambiar Días de Vencimiento

```tsx
// En InvoiceButton.tsx, línea ~53
dueDate.setDate(dueDate.getDate() + 15) // 15 días en lugar de 30
```

### Términos y Condiciones Personalizados

```tsx
// En InvoiceButton.tsx, líneas ~88-91
paymentTerms: 'Tus términos de pago personalizados',
termsAndConditions: 'Tus términos y condiciones personalizados',
```

## Props del Componente

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `order` | `OrderData` | requerido | Datos de la orden |
| `variant` | `'download' \| 'view' \| 'both'` | `'both'` | Tipo de botón(es) a mostrar |
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | Tamaño de los botones |

## Estados del Componente

- **Normal**: Botones listos para usar
- **Generando**: Muestra spinner mientras se genera el PDF
- **Error**: Muestra alerta si hay error en la generación

## Características

- ✅ Genera PDF profesional con logo y diseño moderno
- ✅ Calcula automáticamente subtotales e impuestos
- ✅ Incluye información completa del vendedor y cliente
- ✅ Tabla detallada de productos con SKU
- ✅ Términos y condiciones personalizables
- ✅ Descarga directa o preview en nueva pestaña
- ✅ Loading state durante generación
- ✅ Manejo de errores
- ✅ Responsive y accesible
