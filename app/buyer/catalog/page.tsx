'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiCall, getErrorMessage } from '@/lib/api-client'
import {
  ShoppingCart,
  Package,
  Plus,
  Minus,
  Search,
  Loader2,
  Clock,
  AlertCircle,
} from 'lucide-react'
import { ProductCardSkeleton } from '@/components/skeletons'

type Product = {
  id: string
  name: string
  description: string | null
  price: number
  stock: number
  unit: string
  imageUrl: string | null
  sku: string | null
}

export default function CatalogPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [timedOut, setTimedOut] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<{ [key: string]: number }>({})

  useEffect(() => {
    fetchProducts()
  }, [])

  // ✅ fetchProducts CON TIMEOUT
  const fetchProducts = async () => {
    try {
      setLoading(true)
      setTimedOut(false)
      setError(null)

      const result = await apiCall('/api/buyer/products', {
        timeout: 5000,
        onTimeout: () => setTimedOut(true)
      })

      setLoading(false)

      if (result.success) {
        setProducts(result.data.data || [])
      } else {
        setError(result.error || 'Error cargando productos')
      }
    } catch (err) {
      setLoading(false)
      setError(getErrorMessage(err))
    }
  }

  // ✅ addToCart CON TIMEOUT
  const addToCart = async (productId: string, quantity: number) => {
    try {
      const result = await apiCall('/api/buyer/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity }),
        timeout: 5000,
      })

      if (result.success) {
        setCart({ ...cart, [productId]: quantity })
        alert('✅ Agregado al carrito')
      } else {
        alert(result.error || 'Error al agregar al carrito')
      }
    } catch (err) {
      alert(getErrorMessage(err))
    }
  }

  const updateQuantity = (productId: string, change: number) => {
    const current = cart[productId] || 0
    const newQuantity = Math.max(0, current + change)
    setCart({ ...cart, [productId]: newQuantity })
  }

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(search.toLowerCase())
  )

  // ✅ UI States
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
              <Package className="text-purple-600" size={32} />
              Catálogo de Productos
            </h1>
            <p className="text-gray-600 mt-1">Cargando productos...</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <ProductCardSkeleton />
            <ProductCardSkeleton />
            <ProductCardSkeleton />
            <ProductCardSkeleton />
            <ProductCardSkeleton />
            <ProductCardSkeleton />
            <ProductCardSkeleton />
            <ProductCardSkeleton />
          </div>
        </div>
      </div>
    )
  }

  if (timedOut) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 p-6">
        <div className="max-w-md mx-auto mt-8 bg-yellow-50 border border-yellow-200 p-6 rounded-lg">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="h-8 w-8 text-yellow-600" />
            <h2 className="text-xl font-bold text-yellow-900">
              Tiempo de espera excedido
            </h2>
          </div>
          <p className="text-gray-700 mb-4">
            La carga del catálogo está tardando más de lo esperado.
          </p>
          <button
            onClick={fetchProducts}
            className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 p-6">
        <div className="max-w-md mx-auto mt-8 bg-red-50 border border-red-200 p-6 rounded-lg">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="h-8 w-8 text-red-600" />
            <h2 className="text-xl font-bold text-red-900">Error</h2>
          </div>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={fetchProducts}
            className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                <Package className="text-purple-600" size={32} />
                Catálogo de Productos
              </h1>
              <p className="text-gray-600 mt-1">
                {filteredProducts.length} productos disponibles
              </p>
            </div>
            <button
              onClick={() => router.push('/buyer/cart')}
              className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 flex items-center gap-2"
            >
              <ShoppingCart size={20} />
              Ver Carrito ({Object.keys(cart).length})
            </button>
          </div>

          {/* Búsqueda */}
          <div className="mt-6 relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type="text"
              placeholder="Buscar productos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Grid de productos */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-shadow"
            >
              <div className="p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-2">
                  {product.name}
                </h3>
                {product.description && (
                  <p className="text-sm text-gray-600 mb-4">
                    {product.description}
                  </p>
                )}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-2xl font-bold text-purple-600">
                    ${product.price.toFixed(2)}
                  </span>
                  <span className="text-sm text-gray-500">
                    / {product.unit}
                  </span>
                </div>
                <div className="text-sm text-gray-600 mb-4">
                  Stock: {product.stock} {product.unit}
                </div>

                {/* Controles de cantidad */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => updateQuantity(product.id, -1)}
                    disabled={(cart[product.id] || 0) === 0}
                    className="bg-gray-200 p-2 rounded hover:bg-gray-300 disabled:opacity-50"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="w-12 text-center font-bold">
                    {cart[product.id] || 0}
                  </span>
                  <button
                    onClick={() => updateQuantity(product.id, 1)}
                    disabled={(cart[product.id] || 0) >= product.stock}
                    className="bg-gray-200 p-2 rounded hover:bg-gray-300 disabled:opacity-50"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                <button
                  onClick={() =>
                    addToCart(product.id, cart[product.id] || 1)
                  }
                  disabled={(cart[product.id] || 0) === 0}
                  className="w-full mt-4 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Agregar al Carrito
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <Package className="mx-auto text-gray-400 mb-4" size={64} />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              No se encontraron productos
            </h2>
            <p className="text-gray-600">
              Intenta con otra búsqueda
            </p>
          </div>
        )}
      </div>
    </div>
  )
}