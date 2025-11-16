import { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

// Esta página utiliza ISR (Incremental Static Regeneration)
export const revalidate = 1800 // Revalidar cada 30 minutos

// Cache tags para invalidación on-demand - comentado para evitar errores de TypeScript
// export const tags = ['products', 'catalog']

export const metadata: Metadata = {
  title: 'Catálogo Público - Food Orders CRM',
  description: 'Explora nuestro catálogo de productos disponibles. Catálogo actualizado automáticamente.',
  keywords: ['catálogo', 'productos', 'comida', 'menú', 'delivery'],
  openGraph: {
    title: 'Catálogo de Productos',
    description: 'Explora nuestro catálogo de productos disponibles',
    type: 'website',
  },
}

// Esta función se ejecuta en build time y en intervalos de revalidación
async function getPublicProducts() {
  try {
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        category: true,
        imageUrl: true,
        updatedAt: true,
      },
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ]
    })

    return products
  } catch (error) {
    console.error('Error fetching products:', error)
    return []
  }
}

type Product = Awaited<ReturnType<typeof getPublicProducts>>[number]

export default async function PublicCatalogPage() {
  const products = await getPublicProducts()
  const lastUpdated = new Date().toLocaleString('es-ES')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Catálogo de Productos
              </h1>
              <p className="text-gray-600 mt-2">
                Explora nuestros productos disponibles
              </p>
            </div>
            <Link href="/">
              <Button variant="outline">
                Ir al Sistema
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        
        {/* Stats */}
        <div className="mb-8 flex justify-between items-center">
          <p className="text-sm text-gray-500">
            {products.length} productos disponibles
          </p>
          <p className="text-sm text-gray-500">
            Última actualización: {lastUpdated}
          </p>
        </div>

        {/* Products Grid */}
        {products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              No hay productos disponibles en este momento
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product: Product) => (
              <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="aspect-square relative bg-gray-100">
                  {product.imageUrl ? (
                    <Image
                      src={product.imageUrl}
                      alt={product.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <span className="text-4xl">📦</span>
                    </div>
                  )}
                </div>
                
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-lg line-clamp-2">
                      {product.name}
                    </CardTitle>
                    <Badge variant="secondary" className="shrink-0">
                      {product.category}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent>
                  {product.description && (
                    <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                      {product.description}
                    </p>
                  )}
                  
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-bold text-green-600">
                      ${product.price.toFixed(2)}
                    </span>
                    <Button size="sm" disabled>
                      Ver Detalles
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Footer Note */}
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500">
            Para realizar pedidos, por favor{' '}
            <Link href="/" className="text-blue-600 hover:underline">
              inicia sesión en el sistema
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}