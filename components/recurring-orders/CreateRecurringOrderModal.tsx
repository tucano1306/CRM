// components/recurring-orders/CreateRecurringOrderModal.tsx
'use client'

import { useState, useEffect } from 'react'
import { X, Calendar, Package, CheckCircle, ArrowRight, ArrowLeft, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CreateRecurringOrderModalProps {
  isOpen: boolean
  onClose: () => void
}

interface Product {
  id: string
  name: string
  price: number
  unit: string
  stock: number
  category: string
}

interface OrderItem {
  productId: string
  productName: string
  quantity: number
  pricePerUnit: number
  unit: string
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' }
]

const CATEGORIES = [
  { value: 'CARNES', label: '🥩 Carnes', icon: '🥩' },
  { value: 'EMBUTIDOS', label: '🌭 Embutidos', icon: '🌭' },
  { value: 'SALSAS', label: '🍅 Salsas', icon: '🍅' },
  { value: 'LACTEOS', label: '🥛 Lácteos', icon: '🥛' },
  { value: 'GRANOS', label: '🌾 Granos', icon: '🌾' },
  { value: 'VEGETALES', label: '🥗 Vegetales', icon: '🥗' },
  { value: 'CONDIMENTOS', label: '🧂 Condimentos', icon: '🧂' },
  { value: 'BEBIDAS', label: '🥤 Bebidas', icon: '🥤' },
  { value: 'OTROS', label: '📦 Otros', icon: '📦' }
]

export default function CreateRecurringOrderModal({
  isOpen,
  onClose
}: CreateRecurringOrderModalProps) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [selectedCategory, setSelectedCategory] = useState('CARNES')
  const [searchTerm, setSearchTerm] = useState('')
  
  // Step 1: Configuración
  const [name, setName] = useState('')
  const [frequency, setFrequency] = useState('WEEKLY')
  const [dayOfWeek, setDayOfWeek] = useState<number>(1)
  const [dayOfMonth, setDayOfMonth] = useState<number>(1)
  const [customDays, setCustomDays] = useState<number>(7)
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [deliveryInstructions, setDeliveryInstructions] = useState('')
  
  // Step 2: Productos
  const [selectedItems, setSelectedItems] = useState<OrderItem[]>([])

  useEffect(() => {
    if (isOpen) {
      fetchProducts()
    }
  }, [isOpen])

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products')
      const result = await response.json()
      
      console.log('🔍 Products API Response:', {
        status: response.status,
        success: result.success,
        dataLength: result.data?.length,
        firstProduct: result.data?.[0],
        error: result.error
      })
      
      if (result.success && Array.isArray(result.data)) {
        setProducts(result.data)
        console.log('✅ Productos cargados:', result.data.length)
      } else {
        console.warn('⚠️ No se recibieron productos:', result)
        setProducts([])
      }
    } catch (error) {
      console.error('❌ Error fetching products:', error)
      setProducts([])
    }
  }

  const addProduct = (product: Product) => {
    if (selectedItems.find(item => item.productId === product.id)) return

    setSelectedItems([...selectedItems, {
      productId: product.id,
      productName: product.name,
      quantity: 1,
      pricePerUnit: product.price,
      unit: product.unit
    }])
  }

  // Filtrar productos por categoría y búsqueda
  const filteredProducts = products.filter(product => {
    const matchesCategory = product.category === selectedCategory
    const matchesSearch = searchTerm === '' || 
      product.name.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCategory && matchesSearch
  })

  // Contar productos por categoría
  const getCategoryCount = (category: string) => {
    return products.filter(p => p.category === category).length
  }

  const removeProduct = (productId: string) => {
    setSelectedItems(selectedItems.filter(item => item.productId !== productId))
  }

  const updateQuantity = (productId: string, quantity: number) => {
    setSelectedItems(selectedItems.map(item =>
      item.productId === productId ? { ...item, quantity } : item
    ))
  }

  const calculateTotal = () => {
    return selectedItems.reduce((sum, item) => sum + (item.quantity * item.pricePerUnit), 0)
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      // Convertir fecha a ISO datetime
      const startDateISO = new Date(startDate).toISOString()
      
      const payload = {
        name,
        frequency,
        dayOfWeek: frequency === 'WEEKLY' ? dayOfWeek : undefined,
        dayOfMonth: frequency === 'MONTHLY' ? dayOfMonth : undefined,
        customDays: frequency === 'CUSTOM' ? customDays : undefined,
        startDate: startDateISO,
        notes: notes || undefined,
        deliveryInstructions: deliveryInstructions || undefined,
        items: selectedItems.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          pricePerUnit: item.pricePerUnit
        }))
      }
      
      console.log('📤 Enviando orden recurrente:', {
        ...payload,
        itemsCount: payload.items.length,
        firstItem: payload.items[0]
      })
      console.log('📋 Validando campos:', {
        nameLength: name.length,
        frequency,
        itemsCount: selectedItems.length,
        startDateValid: !isNaN(new Date(startDate).getTime()),
        hasProducts: selectedItems.length > 0
      })
      
      const response = await fetch('/api/recurring-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const result = await response.json()
      console.log('📥 Respuesta del servidor:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        result
      })
      console.log('📥 Result stringified:', JSON.stringify(result, null, 2))

      if (response.ok) {
        console.log('✅ Orden recurrente creada exitosamente')
        onClose()
        resetForm()
        window.location.reload() // Recargar para ver la nueva orden
      } else {
        console.error('❌ Error del servidor completo:', {
          status: response.status,
          statusText: response.statusText,
          result
        })
        
        // Log cada propiedad del result
        console.log('🔍 Propiedades del error:')
        for (const key in result) {
          console.log(`  ${key}:`, result[key])
        }
        
        // Mostrar error detallado
        let errorMessage = `❌ Error ${response.status}: ${result.error || 'No se pudo crear la orden'}\n`
        if (result.message && result.message !== result.error) {
          errorMessage += `\n💬 Mensaje: ${result.message}\n`
        }
        
        if (result.details) {
          errorMessage += '\n📋 Detalles de validación:\n'
          if (Array.isArray(result.details)) {
            // Los detalles son strings del formato "campo: mensaje"
            result.details.forEach((detail: any, index: number) => {
              console.log(`🔍 Detail ${index}:`, detail, typeof detail)
              if (typeof detail === 'string') {
                errorMessage += `  • ${detail}\n`
              } else if (detail.path && detail.message) {
                const path = Array.isArray(detail.path) ? detail.path.join('.') : detail.path
                errorMessage += `  • ${path}: ${detail.message}\n`
              } else {
                errorMessage += `  • ${JSON.stringify(detail)}\n`
              }
            })
          } else {
            errorMessage += JSON.stringify(result.details, null, 2)
          }
        }
        
        // Si no hay detalles pero hay otras propiedades
        if (!result.details && !result.error && !result.message) {
          errorMessage += '\n📋 Info del error:\n' + JSON.stringify(result, null, 2)
        }
        
        alert(errorMessage)
        console.error('❌ Error del servidor:', errorMessage)
      }
    } catch (error) {
      console.error('❌ Error creando orden recurrente:', error)
      console.error('❌ Error type:', typeof error)
      console.error('❌ Error instanceof:', error instanceof Error)
      if (error instanceof Error) {
        console.error('❌ Error message:', error.message)
        console.error('❌ Error stack:', error.stack)
        alert(`Error de conexión: ${error.message}`)
      } else {
        alert('Error de conexión al crear la orden: ' + JSON.stringify(error))
      }
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setStep(1)
    setName('')
    setFrequency('WEEKLY')
    setDayOfWeek(1)
    setSelectedItems([])
    setNotes('')
  }

  if (!isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Nueva Orden Recurrente</h2>
              <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-purple-500">
                <X className="h-6 w-6" />
              </Button>
            </div>

            {/* Steps */}
            <div className="flex items-center justify-between">
              {[
                { num: 1, label: 'Configuración', icon: Calendar },
                { num: 2, label: 'Productos', icon: Package },
                { num: 3, label: 'Revisión', icon: CheckCircle }
              ].map((s, idx) => (
                <div key={s.num} className="flex items-center flex-1">
                  <div className={`flex items-center gap-2 ${step >= s.num ? 'text-white' : 'text-purple-300'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                      step >= s.num ? 'bg-white text-purple-600' : 'bg-purple-500'
                    }`}>
                      {step > s.num ? '✓' : s.num}
                    </div>
                    <span className="font-medium hidden sm:inline">{s.label}</span>
                  </div>
                  {idx < 2 && (
                    <div className={`flex-1 h-0.5 mx-2 ${step > s.num ? 'bg-white' : 'bg-purple-400'}`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* STEP 1: Configuración */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre de la orden recurrente *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej: Orden Semanal de Verduras"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Frecuencia *
                  </label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="DAILY">📅 Diario</option>
                    <option value="WEEKLY">📆 Semanal</option>
                    <option value="BIWEEKLY">🗓️ Quincenal</option>
                    <option value="MONTHLY">📋 Mensual</option>
                    <option value="CUSTOM">⚙️ Personalizado</option>
                  </select>
                </div>

                {frequency === 'WEEKLY' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Día de la semana
                    </label>
                    <select
                      value={dayOfWeek}
                      onChange={(e) => setDayOfWeek(Number(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                      {DAYS_OF_WEEK.map(day => (
                        <option key={day.value} value={day.value}>{day.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                {frequency === 'MONTHLY' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Día del mes
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={dayOfMonth}
                      onChange={(e) => setDayOfMonth(Number(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                )}

                {frequency === 'CUSTOM' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cada cuántos días
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={customDays}
                      onChange={(e) => setCustomDays(Number(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha de inicio
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Instrucciones de entrega
                  </label>
                  <textarea
                    value={deliveryInstructions}
                    onChange={(e) => setDeliveryInstructions(e.target.value)}
                    placeholder="Información adicional para la entrega..."
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notas
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Notas adicionales..."
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
              </div>
            )}

            {/* STEP 2: Productos */}
            {step === 2 && (
              <div className="space-y-6">
                {/* Header con búsqueda */}
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Seleccionar Productos por Categoría
                  </h3>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar producto..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 w-64"
                    />
                  </div>
                </div>

                {/* Tabs de categorías */}
                <div className="border-b border-gray-200">
                  <div className="flex overflow-x-auto gap-2 pb-2">
                    {CATEGORIES.map((category) => {
                      const count = getCategoryCount(category.value)
                      return (
                        <button
                          key={category.value}
                          onClick={() => {
                            setSelectedCategory(category.value)
                            setSearchTerm('')
                          }}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
                            selectedCategory === category.value
                              ? 'bg-purple-600 text-white shadow-md'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          <span className="text-lg">{category.icon}</span>
                          <span>{category.label.split(' ')[1]}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                            selectedCategory === category.value
                              ? 'bg-purple-500 text-white'
                              : 'bg-gray-200 text-gray-600'
                          }`}>
                            {count}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Grid de productos filtrados */}
                <div className="max-h-96 overflow-y-auto">
                  {filteredProducts.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredProducts.map(product => {
                        const isSelected = selectedItems.find(item => item.productId === product.id)
                        return (
                          <div
                            key={product.id}
                            onClick={() => !isSelected && addProduct(product)}
                            className={`p-4 border-2 rounded-xl transition-all cursor-pointer ${
                              isSelected
                                ? 'border-green-500 bg-green-50'
                                : 'border-gray-200 hover:border-purple-400 hover:bg-purple-50'
                            }`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-semibold text-gray-900 flex-1">{product.name}</h4>
                              {isSelected && (
                                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                              )}
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-purple-600 font-bold">${product.price.toFixed(2)}</span>
                              <span className="text-gray-500">/ {product.unit}</span>
                            </div>
                            <div className="mt-2 text-xs text-gray-500">
                              Stock: {product.stock} {product.unit}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium">
                        {searchTerm 
                          ? `No se encontraron productos que coincidan con "${searchTerm}"`
                          : 'No hay productos en esta categoría'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Productos seleccionados */}
                {selectedItems.length > 0 && (
                  <div className="border-t pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Productos Seleccionados ({selectedItems.length})
                      </h3>
                      <button
                        onClick={() => setSelectedItems([])}
                        className="text-sm text-red-600 hover:text-red-700 font-medium"
                      >
                        Limpiar todo
                      </button>
                    </div>
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {selectedItems.map(item => (
                        <div key={item.productId} className="flex items-center gap-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200 hover:shadow-md transition-shadow">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{item.productName}</h4>
                            <p className="text-sm text-purple-600">${item.pricePerUnit.toFixed(2)} / {item.unit}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-sm text-gray-600">Cant:</label>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateQuantity(item.productId, Number(e.target.value))}
                              className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center font-semibold"
                            />
                          </div>
                          <div className="text-right min-w-[80px]">
                            <p className="text-sm font-bold text-purple-700">
                              ${(item.quantity * item.pricePerUnit).toFixed(2)}
                            </p>
                          </div>
                          <button
                            onClick={() => removeProduct(item.productId)}
                            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-900">Total por ejecución:</span>
                        <span className="text-2xl font-bold text-green-600">${calculateTotal().toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 3: Revisión */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="bg-purple-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-purple-900 mb-4">Resumen de Orden Recurrente</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Nombre:</span>
                      <span className="font-semibold text-gray-900">{name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Frecuencia:</span>
                      <span className="font-semibold text-gray-900">
                        {frequency === 'DAILY' && '📅 Diario'}
                        {frequency === 'WEEKLY' && `📆 Semanal (${DAYS_OF_WEEK.find(d => d.value === dayOfWeek)?.label})`}
                        {frequency === 'BIWEEKLY' && '🗓️ Quincenal'}
                        {frequency === 'MONTHLY' && `📋 Mensual (Día ${dayOfMonth})`}
                        {frequency === 'CUSTOM' && `⚙️ Cada ${customDays} días`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total de productos:</span>
                      <span className="font-semibold text-gray-900">{selectedItems.length}</span>
                    </div>
                    <div className="flex justify-between text-lg border-t pt-2 mt-2">
                      <span className="text-gray-900 font-semibold">Total:</span>
                      <span className="font-bold text-purple-600">${calculateTotal().toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    ℹ️ Esta orden se ejecutará automáticamente según la frecuencia configurada. Puedes pausarla o editarla en cualquier momento.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t bg-gray-50 p-4 flex justify-between">
            <Button
              variant="outline"
              onClick={() => step > 1 ? setStep(step - 1) : onClose()}
              disabled={loading}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {step > 1 ? 'Anterior' : 'Cancelar'}
            </Button>

            {step < 3 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={step === 1 && !name || step === 2 && selectedItems.length === 0}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Siguiente
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700"
              >
                {loading ? 'Creando...' : 'Crear Orden Recurrente'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
