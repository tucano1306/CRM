// components/recurring-orders/CreateRecurringOrderModal.tsx
'use client'

import { useState, useEffect } from 'react'
import { X, Calendar, Package, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CreateRecurringOrderModalProps {
  isOpen: boolean
  onClose: () => void
  clientId?: string
}

interface Product {
  id: string
  name: string
  price: number
  unit: string
  stock: number
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

export default function CreateRecurringOrderModal({
  isOpen,
  onClose,
  clientId
}: CreateRecurringOrderModalProps) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  
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
      if (result.success) {
        setProducts(result.data)
      }
    } catch (error) {
      console.error('Error fetching products:', error)
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
      const response = await fetch('/api/recurring-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          name,
          frequency,
          dayOfWeek: frequency === 'WEEKLY' ? dayOfWeek : null,
          dayOfMonth: frequency === 'MONTHLY' ? dayOfMonth : null,
          customDays: frequency === 'CUSTOM' ? customDays : null,
          startDate,
          notes,
          deliveryInstructions,
          items: selectedItems
        })
      })

      if (response.ok) {
        onClose()
        resetForm()
      }
    } catch (error) {
      console.error('Error creating recurring order:', error)
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
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Seleccionar Productos
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {products.map(product => (
                      <div
                        key={product.id}
                        onClick={() => addProduct(product)}
                        className="p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 cursor-pointer transition-all"
                      >
                        <h4 className="font-semibold text-gray-900">{product.name}</h4>
                        <p className="text-sm text-gray-600">${product.price.toFixed(2)} / {product.unit}</p>
                        <p className="text-xs text-gray-500">Stock: {product.stock}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedItems.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Productos Seleccionados
                    </h3>
                    <div className="space-y-3">
                      {selectedItems.map(item => (
                        <div key={item.productId} className="flex items-center gap-4 p-4 bg-purple-50 rounded-lg">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{item.productName}</h4>
                            <p className="text-sm text-gray-600">${item.pricePerUnit.toFixed(2)} / {item.unit}</p>
                          </div>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateQuantity(item.productId, Number(e.target.value))}
                            className="w-20 px-3 py-2 border border-gray-300 rounded-lg"
                          />
                          <button
                            onClick={() => removeProduct(item.productId)}
                            className="text-red-600 hover:text-red-700 font-medium"
                          >
                            Eliminar
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 p-4 bg-green-50 rounded-lg">
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
