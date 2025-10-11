'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import {
  Search,
  ShoppingCart,
  Package,
  DollarSign,
} from 'lucide-react'

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
  const { user } = useUser()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [cartItems, setCartItems] = useState<Record<string, number>>({})

  useEffect(() => {
    fetchProducts()
  }, [search])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (search) params.append('search', search)

      const response = await fetch(`/api/buyer/products?${params}`)
      const data = await response.json()

      if (response.ok) {
        setProducts(data.products)
      }
    } catch (error) {
      console.error('Error cargando productos:', error)
    } finally {
      setLoading(false)
    }
  }

  const addToCart = async (productId: string) => {
    try {
      const response = await fetch('/api/buyer/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity: 1 }),
      })

      const data = await response.json()

      if (response.ok) {
        // Actualizar contador local
        setCartItems((prev) => ({
          ...prev,
          [productId]: (prev[productId] || 0) + 1,
        }))
        alert('✅ Producto agregado al carrito')
      } else {
        alert(data.error || 'Error agregando al carrito')
      }
    } catch (error) {
      console.error('Error agregando al carrito:', error)
      alert('Error agregando al carrito')
    }
  }

  const getCartQuantity = (productId: string): number => {
    return cartItems[productId] || 0
  }

  const totalCartItems = Object.values(cartItems).reduce((a, b) => a + b, 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 p-6">
      <div className="max-w-7xl mx-auto mb-8">
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-purple-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                <Package className="text-purple-600" size={32} />
                Catálogo de Productos
              </h1>
              <p className="text-gray-600 mt-1">
                Encuentra los mejores productos para tu pedido
              </p>
            </div>
            <div className="flex items-center gap-2 bg-purple-100 px-4 py-2 rounded-lg">
              <ShoppingCart className="text-purple-600" size={20} />
              <span className="font-semibold text-purple-700">
                {totalCartItems} {totalCartItems === 1 ? 'item' : 'items'}
              </span>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="text"
                placeholder="Buscar productos por nombre o descripción..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {search && (
              <button
                onClick={() => setSearch('')}
                className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Limpiar búsqueda
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        ) : products.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <Package className="mx-auto text-gray-400 mb-4" size={64} />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No se encontraron productos
            </h3>
            <p className="text-gray-500">
              {search
                ? 'Intenta cambiar la búsqueda'
                : 'No hay productos disponibles en este momento'}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow border border-purple-100 overflow-hidden group"
                >
                  <div className="relative h-48 bg-gradient-to-br from-purple-100 to-pink-100 overflow-hidden">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Package className="text-purple-300" size={64} />
                      </div>
                    )}
                    <div className="absolute top-2 right-2 bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                      {product.unit}
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className="font-bold text-lg text-gray-800 mb-2 line-clamp-1">
                      {product.name}
                    </h3>
                    {product.sku && (
                      <p className="text-xs text-gray-500 mb-2">SKU: {product.sku}</p>
                    )}
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2 h-10">
                      {product.description || 'Sin descripción'}
                    </p>

                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-1 text-purple-600 font-bold text-xl">
                        <DollarSign size={20} />
                        {product.price.toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-500">
                        Stock: <span className="font-semibold">{product.stock}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => addToCart(product.id)}
                      disabled={product.stock === 0}
                      className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
                        product.stock === 0
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                          : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 hover:shadow-lg'
                      }`}
                    >
                      <ShoppingCart size={18} />
                      {product.stock === 0
                        ? 'Sin stock'
                        : getCartQuantity(product.id) > 0
                        ? `En carrito (${getCartQuantity(product.id)})`
                        : 'Agregar al carrito'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 bg-white rounded-2xl shadow-lg p-6 text-center border border-purple-100">
              <p className="text-gray-600">
                Mostrando{' '}
                <span className="font-bold text-purple-600">{products.length}</span>{' '}
                {products.length === 1 ? 'producto' : 'productos'} disponibles
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}