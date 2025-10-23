'use client'

import { useState, useEffect } from 'react'
import { X, User, Package, CheckCircle, ArrowRight, ArrowLeft, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CreateQuoteModalProps {
  isOpen: boolean
  onClose: () => void
}

interface Client {
  id: string
  name: string
  email: string
  phone: string
}

interface Product {
  id: string
  name: string
  price: number
  unit: string
  stock: number
}

interface QuoteItem {
  productId: string
  productName: string
  description: string
  quantity: number
  pricePerUnit: number
  discount: number
  unit: string
}

export default function CreateQuoteModal({ isOpen, onClose }: CreateQuoteModalProps) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [products, setProducts] = useState<Product[]>([])

  // Step 1: Info básica
  const [selectedClientId, setSelectedClientId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [validDays, setValidDays] = useState(30)
  const [discount, setDiscount] = useState(0)
  const [notes, setNotes] = useState('')
  const [termsAndConditions, setTermsAndConditions] = useState('Términos y condiciones estándar')

  // Step 2: Productos
  const [selectedItems, setSelectedItems] = useState<QuoteItem[]>([])

  useEffect(() => {
    if (isOpen) {
      fetchClients()
      fetchProducts()
    }
  }, [isOpen])

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/clients')
      const result = await response.json()
      if (result.success) {
        setClients(result.data)
      }
    } catch (error) {
      console.error('Error fetching clients:', error)
    }
  }

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
      description: '',
      quantity: 1,
      pricePerUnit: product.price,
      discount: 0,
      unit: product.unit
    }])
  }

  const removeProduct = (productId: string) => {
    setSelectedItems(selectedItems.filter(item => item.productId !== productId))
  }

  const updateItem = (productId: string, field: string, value: any) => {
    setSelectedItems(selectedItems.map(item =>
      item.productId === productId ? { ...item, [field]: value } : item
    ))
  }

  const calculateSubtotal = () => {
    return selectedItems.reduce((sum, item) => {
      const itemSubtotal = item.quantity * item.pricePerUnit
      const itemDiscount = itemSubtotal * (item.discount / 100)
      return sum + (itemSubtotal - itemDiscount)
    }, 0)
  }

  const calculateTotal = () => {
    const subtotal = calculateSubtotal()
    const discountAmount = subtotal * (discount / 100)
    const afterDiscount = subtotal - discountAmount
    const tax = afterDiscount * 0.10
    return afterDiscount + tax
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const validUntil = new Date()
      validUntil.setDate(validUntil.getDate() + validDays)

      const response = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClientId,
          title,
          description,
          validUntil: validUntil.toISOString(),
          discount,
          notes,
          termsAndConditions,
          items: selectedItems
        })
      })

      if (response.ok) {
        onClose()
        resetForm()
      } else {
        const error = await response.json()
        alert(error.error || 'Error al crear cotización')
      }
    } catch (error) {
      console.error('Error creating quote:', error)
      alert('Error al crear cotización')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setStep(1)
    setSelectedClientId('')
    setTitle('')
    setDescription('')
    setValidDays(30)
    setDiscount(0)
    setNotes('')
    setSelectedItems([])
  }

  if (!isOpen) return null

  const selectedClient = clients.find(c => c.id === selectedClientId)

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Nueva Cotización</h2>
              <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-purple-500">
                <X className="h-6 w-6" />
              </Button>
            </div>

            {/* Steps */}
            <div className="flex items-center justify-between">
              {[
                { num: 1, label: 'Información', icon: User },
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
            
            {/* STEP 1: Información */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cliente *
                  </label>
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Seleccionar cliente...</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>
                        {client.name} - {client.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Título de la cotización *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ej: Suministro de productos para restaurante"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descripción
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descripción detallada de la cotización..."
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Válida por (días)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={validDays}
                      onChange={(e) => setValidDays(Number(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Válida hasta: {new Date(Date.now() + validDays * 24 * 60 * 60 * 1000).toLocaleDateString('es-ES')}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Descuento general (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={discount}
                      onChange={(e) => setDiscount(Number(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notas internas
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Notas adicionales..."
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Términos y condiciones
                  </label>
                  <textarea
                    value={termsAndConditions}
                    onChange={(e) => setTermsAndConditions(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6 max-h-60 overflow-y-auto">
                    {products.map(product => (
                      <div
                        key={product.id}
                        onClick={() => addProduct(product)}
                        className="p-3 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 cursor-pointer transition-all"
                      >
                        <h4 className="font-semibold text-gray-900 text-sm">{product.name}</h4>
                        <p className="text-xs text-gray-600">${product.price.toFixed(2)} / {product.unit}</p>
                        <p className="text-xs text-gray-500">Stock: {product.stock}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedItems.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Productos en Cotización
                    </h3>
                    <div className="space-y-3">
                      {selectedItems.map(item => (
                        <div key={item.productId} className="bg-purple-50 rounded-lg p-4">
                          <div className="flex items-start gap-4">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900">{item.productName}</h4>
                              <div className="grid grid-cols-3 gap-3 mt-2">
                                <div>
                                  <label className="text-xs text-gray-600">Cantidad</label>
                                  <input
                                    type="number"
                                    min="1"
                                    value={item.quantity}
                                    onChange={(e) => updateItem(item.productId, 'quantity', Number(e.target.value))}
                                    className="w-full px-2 py-1 text-sm border rounded"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-gray-600">Precio/u</label>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={item.pricePerUnit}
                                    onChange={(e) => updateItem(item.productId, 'pricePerUnit', Number(e.target.value))}
                                    className="w-full px-2 py-1 text-sm border rounded"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-gray-600">Desc %</label>
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={item.discount}
                                    onChange={(e) => updateItem(item.productId, 'discount', Number(e.target.value))}
                                    className="w-full px-2 py-1 text-sm border rounded"
                                  />
                                </div>
                              </div>
                              <input
                                type="text"
                                value={item.description}
                                onChange={(e) => updateItem(item.productId, 'description', e.target.value)}
                                placeholder="Descripción adicional..."
                                className="w-full px-2 py-1 text-sm border rounded mt-2"
                              />
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-purple-600">
                                ${((item.quantity * item.pricePerUnit) * (1 - item.discount / 100)).toFixed(2)}
                              </p>
                              <button
                                onClick={() => removeProduct(item.productId)}
                                className="text-xs text-red-600 hover:text-red-700 mt-2"
                              >
                                Eliminar
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 3: Revisión */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="bg-purple-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-purple-900 mb-4">Resumen de Cotización</h3>
                  
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-gray-600">Cliente:</span>
                      <span className="font-semibold">{selectedClient?.name}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-gray-600">Título:</span>
                      <span className="font-semibold">{title}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-gray-600">Productos:</span>
                      <span className="font-semibold">{selectedItems.length}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-gray-600">Válida hasta:</span>
                      <span className="font-semibold">
                        {new Date(Date.now() + validDays * 24 * 60 * 60 * 1000).toLocaleDateString('es-ES')}
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 space-y-2 border-t pt-4">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span>${calculateSubtotal().toFixed(2)}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-sm text-orange-600">
                        <span>Descuento ({discount}%):</span>
                        <span>-${(calculateSubtotal() * discount / 100).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span>Impuesto (10%):</span>
                      <span>${((calculateSubtotal() * (1 - discount / 100)) * 0.10).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                      <span>Total:</span>
                      <span className="text-purple-600">${calculateTotal().toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    ℹ️ La cotización se creará en estado "Borrador". Podrás editarla antes de enviarla al cliente.
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
                disabled={
                  (step === 1 && (!selectedClientId || !title)) ||
                  (step === 2 && selectedItems.length === 0)
                }
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
                {loading ? 'Creando...' : 'Crear Cotización'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
