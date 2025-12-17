'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import { X, Search, Plus, Package, DollarSign, Eye, EyeOff, Save, Trash2, Edit3, Image as ImageIcon, Upload, FileSpreadsheet, Download, CheckCircle, Loader2 } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface ClientProduct {
  clientProductId: string
  productId: string
  name: string
  description: string | null
  basePrice: number
  customPrice: number
  stock: number
  unit: string
  category: string
  imageUrl: string | null
  sku: string | null
  isActive: boolean
  isVisible: boolean
  notes: string | null
}

interface ManageCatalogModalProps {
  readonly isOpen: boolean
  readonly onClose: () => void
  readonly clientId: string
  readonly clientName: string
  readonly onSuccess?: () => void
}

const CATEGORIES = [
  'CARNES',
  'EMBUTIDOS',
  'SALSAS',
  'LACTEOS',
  'GRANOS',
  'VEGETALES',
  'CONDIMENTOS',
  'BEBIDAS',
  'OTROS'
]

const UNITS = [
  { value: 'unit', label: 'Unidad' },
  { value: 'kg', label: 'Kilogramo' },
  { value: 'lb', label: 'Libra' },
  { value: 'case', label: 'Caja' },
  { value: 'pack', label: 'Paquete' },
  { value: 'dozen', label: 'Docena' },
  { value: 'liter', label: 'Litro' },
  { value: 'gallon', label: 'Galón' },
]

// --- Helper Components to reduce cognitive complexity ---

function LoadingState() {
  return (
    <div className="text-center py-12">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
      <p className="text-gray-500 mt-4">Cargando catálogo...</p>
    </div>
  )
}

function EmptyState({ searchTerm, onCreateClick }: Readonly<{ searchTerm: string; onCreateClick: () => void }>) {
  return (
    <div className="text-center py-12">
      <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <p className="text-gray-500 text-lg mb-2">
        {searchTerm ? 'No se encontraron productos' : 'Sin productos asignados'}
      </p>
      <p className="text-gray-400 text-sm mb-4">
        Crea productos para este cliente en la pestaña &ldquo;Crear Producto&rdquo;
      </p>
      <Button
        onClick={onCreateClick}
        className="bg-purple-600 hover:bg-purple-700"
      >
        <Plus className="w-4 h-4 mr-2" />
        Crear Primer Producto
      </Button>
    </div>
  )
}

function ImportFileDropzone({
  importFile,
  fileInputRef,
  onFileSelect,
  onFileClear,
}: Readonly<{
  importFile: File | null
  fileInputRef: React.RefObject<HTMLInputElement>
  onFileSelect: (file: File) => void
  onFileClear: () => void
}>) {
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.files?.[0]) {
      const file = e.dataTransfer.files[0]
      if (/\.(xlsx|xls|csv)$/i.test(file.name)) {
        onFileSelect(file)
      }
    }
  }

  return (
    <div
      role="region"
      aria-label="Zona de arrastrar y soltar archivos"
      className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
        importFile
          ? 'border-green-400 bg-green-50'
          : 'border-gray-300 hover:border-purple-400 hover:bg-gray-50'
      }`}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={(e) => {
          if (e.target.files?.[0]) {
            onFileSelect(e.target.files[0])
          }
        }}
        className="hidden"
      />

      {importFile ? (
        <ImportFileSelected file={importFile} onClear={onFileClear} />
      ) : (
        <ImportFileEmpty onSelectClick={() => fileInputRef.current?.click()} />
      )}
    </div>
  )
}

function ImportFileSelected({ file, onClear }: Readonly<{ file: File; onClear: () => void }>) {
  return (
    <div className="space-y-3">
      <div className="w-14 h-14 mx-auto bg-green-100 rounded-full flex items-center justify-center">
        <FileSpreadsheet className="w-7 h-7 text-green-600" />
      </div>
      <div>
        <p className="font-semibold text-gray-900">{file.name}</p>
        <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
      </div>
      <Button variant="outline" size="sm" onClick={onClear}>
        Cambiar archivo
      </Button>
    </div>
  )
}

function ImportFileEmpty({ onSelectClick }: Readonly<{ onSelectClick: () => void }>) {
  return (
    <div className="space-y-3">
      <div className="w-14 h-14 mx-auto bg-purple-100 rounded-full flex items-center justify-center">
        <Upload className="w-7 h-7 text-purple-600" />
      </div>
      <div>
        <p className="font-semibold text-gray-900">Arrastra tu archivo Excel aquí</p>
        <p className="text-sm text-gray-500">o haz clic para seleccionar</p>
      </div>
      <Button variant="outline" onClick={onSelectClick}>
        <Upload className="w-4 h-4 mr-2" />
        Seleccionar archivo
      </Button>
    </div>
  )
}

interface ImportResultData {
  success: boolean
  stats: { created: number; updated: number; skipped: number; errors: number; associatedToClient?: number }
  errors: string[]
}

function ImportResultDisplay({
  result,
  clientName,
  onImportAnother,
  onViewCatalog,
}: Readonly<{
  result: ImportResultData
  clientName: string
  onImportAnother: () => void
  onViewCatalog: () => void
}>) {
  return (
    <div className={`rounded-xl p-4 ${result.success ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'}`}>
      <div className="flex items-center gap-2 mb-3">
        {result.success ? (
          <>
            <CheckCircle className="w-6 h-6 text-green-600" />
            <span className="font-bold text-green-800">¡Importación completada!</span>
          </>
        ) : (
          <>
            <X className="w-6 h-6 text-red-600" />
            <span className="font-bold text-red-800">Error en importación</span>
          </>
        )}
      </div>

      {result.stats.associatedToClient !== undefined && result.stats.associatedToClient > 0 && (
        <div className="bg-purple-100 rounded-lg p-3 mb-3 text-center">
          <p className="text-2xl font-bold text-purple-700">{result.stats.associatedToClient}</p>
          <p className="text-sm text-purple-600 font-medium">Productos agregados al catálogo de {clientName}</p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
        <div className="bg-white rounded-lg p-2 text-center">
          <p className="text-lg font-bold text-green-600">{result.stats.created}</p>
          <p className="text-xs text-gray-600">Nuevos</p>
        </div>
        <div className="bg-white rounded-lg p-2 text-center">
          <p className="text-lg font-bold text-blue-600">{result.stats.updated}</p>
          <p className="text-xs text-gray-600">Actualizados</p>
        </div>
        <div className="bg-white rounded-lg p-2 text-center">
          <p className="text-lg font-bold text-orange-500">{result.stats.skipped}</p>
          <p className="text-xs text-gray-600">Ya existían</p>
        </div>
        <div className="bg-white rounded-lg p-2 text-center">
          <p className="text-lg font-bold text-red-500">{result.stats.errors}</p>
          <p className="text-xs text-gray-600">Errores</p>
        </div>
      </div>

      {result.errors.length > 0 && (
        <div className="text-sm text-red-700 max-h-24 overflow-y-auto">
          {result.errors.map((err) => (
            <p key={err}>• {err}</p>
          ))}
        </div>
      )}

      <div className="flex gap-2 mt-4">
        <Button variant="outline" size="sm" onClick={onImportAnother}>
          Importar otro archivo
        </Button>
        <Button size="sm" onClick={onViewCatalog} className="bg-purple-600 hover:bg-purple-700">
          Ver catálogo
        </Button>
      </div>
    </div>
  )
}

// --- End Helper Components ---

export default function ManageCatalogModal({ 
  isOpen, 
  onClose, 
  clientId, 
  clientName,
  onSuccess 
}: ManageCatalogModalProps) {
  const [activeTab, setActiveTab] = useState<'catalog' | 'create' | 'import'>('catalog')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [clientProducts, setClientProducts] = useState<ClientProduct[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [editingPrices, setEditingPrices] = useState<Record<string, number>>({})
  
  // Estado para importar Excel
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{
    success: boolean
    stats: { created: number; updated: number; skipped: number; errors: number; associatedToClient?: number }
    errors: string[]
  } | null>(null)
  
  // Estado para exportar Excel
  const [exporting, setExporting] = useState(false)
  
  // Estado para editar producto existente
  const [editingProduct, setEditingProduct] = useState<ClientProduct | null>(null)
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    price: '',
    sku: '',
    category: 'OTROS',
    unit: 'unit',
  })
  const [savingEdit, setSavingEdit] = useState(false)
  
  // Estado para crear nuevo producto
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: '',
    stock: '100',
    unit: 'unit',
    category: 'OTROS',
    sku: '',
    imageUrl: '',
  })

  const fetchClientCatalog = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/clients/${clientId}/products`)
      const data = await response.json()

      if (data.success) {
        setClientProducts(data.data.products)
        console.log(`✅ Cargados ${data.data.products.length} productos del catálogo`)
      }
    } catch (error) {
      console.error('Error cargando catálogo:', error)
    } finally {
      setLoading(false)
    }
  }, [clientId])

  // Tab navigation handlers - extracted to reduce nesting depth
  const handleTabCatalog = useCallback(() => setActiveTab('catalog'), [])
  const handleTabCreate = useCallback(() => setActiveTab('create'), [])
  const handleTabImport = useCallback(() => setActiveTab('import'), [])

  // Abrir modal de edición
  const handleOpenEdit = (product: ClientProduct) => {
    setEditingProduct(product)
    setEditForm({
      name: product.name,
      description: product.description || '',
      price: product.customPrice.toString(),
      sku: product.sku || '',
      category: product.category || 'OTROS',
      unit: product.unit || 'unit',
    })
  }

  // Guardar cambios del producto
  const handleSaveEdit = async () => {
    if (!editingProduct) return
    
    setSavingEdit(true)
    try {
      // Actualizar el producto base
      const productResponse = await fetch(`/api/products/${editingProduct.productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name,
          description: editForm.description || null,
          sku: editForm.sku || null,
          category: editForm.category,
          unit: editForm.unit,
        })
      })
      
      if (!productResponse.ok) {
        const errorData = await productResponse.json().catch(() => ({}))
        console.error('❌ Error del servidor:', errorData)
        throw new Error(errorData.error || errorData.details || 'Error actualizando producto')
      }

      // Actualizar precio personalizado del cliente
      const newPrice = Number.parseFloat(editForm.price) || editingProduct.customPrice
      if (newPrice !== editingProduct.customPrice) {
        await fetch(`/api/clients/${clientId}/products`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: editingProduct.productId,
            customPrice: newPrice
          })
        })
      }

      // Actualizar lista local
      setClientProducts(prev => prev.map(p => 
        p.productId === editingProduct.productId
          ? {
              ...p,
              name: editForm.name,
              description: editForm.description || null,
              sku: editForm.sku || null,
              category: editForm.category,
              unit: editForm.unit,
              customPrice: newPrice,
            }
          : p
      ))

      setEditingProduct(null)
      console.log('✅ Producto actualizado')
    } catch (error: any) {
      console.error('Error guardando producto:', error)
      alert(error.message || 'Error al guardar los cambios')
    } finally {
      setSavingEdit(false)
    }
  }

  // Exportar productos del cliente a Excel
  const handleExportProducts = async () => {
    if (clientProducts.length === 0) {
      alert('No hay productos para exportar')
      return
    }
    
    setExporting(true)
    try {
      const response = await fetch(`/api/clients/${clientId}/products/export`)
      
      if (!response.ok) {
        throw new Error('Error al exportar')
      }
      
      const blob = await response.blob()
      const url = globalThis.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      // Limpiar nombre del cliente para el archivo
      const safeClientName = clientName.replaceAll(/[^a-zA-Z0-9]/g, '_').substring(0, 30)
      a.download = `productos_${safeClientName}_${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      globalThis.URL.revokeObjectURL(url)
      console.log('✅ Productos exportados exitosamente')
    } catch (error) {
      console.error('Error exportando productos:', error)
      alert('Error al exportar productos. Intenta de nuevo.')
    } finally {
      setExporting(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchClientCatalog()
      // Reset form when opening
      setNewProduct({
        name: '',
        description: '',
        price: '',
        stock: '100',
        unit: 'unit',
        category: 'OTROS',
        sku: '',
        imageUrl: '',
      })
    }
  }, [isOpen, fetchClientCatalog])

  const handleCreateProduct = async () => {
    if (!newProduct.name || !newProduct.price) {
      alert('Nombre y precio son obligatorios')
      return
    }

    try {
      setSaving(true)

      // 1. Crear el producto en la base de datos
      const createResponse = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProduct.name,
          description: newProduct.description || null,
          price: Number.parseFloat(newProduct.price),
          stock: Number.parseInt(newProduct.stock, 10) || 100,
          unit: newProduct.unit,
          category: newProduct.category,
          sku: newProduct.sku || null,
          imageUrl: newProduct.imageUrl || null,
          isActive: true,
        })
      })

      const createData = await createResponse.json()

      if (!createData.success) {
        throw new Error(createData.error || 'Error creando producto')
      }

      const productId = createData.data.id

      // 2. Asignar el producto a este cliente
      const assignResponse = await fetch(`/api/clients/${clientId}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products: [{
            productId,
            customPrice: Number.parseFloat(newProduct.price),
            isVisible: true,
          }]
        })
      })

      const assignData = await assignResponse.json()

      if (assignData.success) {
        console.log(`✅ Producto "${newProduct.name}" creado y asignado a ${clientName}`)
        
        // Reset form
        setNewProduct({
          name: '',
          description: '',
          price: '',
          stock: '100',
          unit: 'unit',
          category: 'OTROS',
          sku: '',
          imageUrl: '',
        })
        
        // Refresh catalog and switch to catalog tab
        await fetchClientCatalog()
        setActiveTab('catalog')
        
        if (onSuccess) onSuccess()
      } else {
        throw new Error(assignData.error || 'Error asignando producto')
      }
    } catch (error) {
      console.error('Error creando producto:', error)
      alert(error instanceof Error ? error.message : 'Error creando producto')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdatePrice = async (productId: string, newPrice: number) => {
    try {
      const response = await fetch(`/api/clients/${clientId}/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customPrice: newPrice })
      })

      const data = await response.json()

      if (data.success) {
        console.log(`✅ Precio actualizado: ${data.data.name} = $${newPrice}`)
        await fetchClientCatalog()
        setEditingPrices(prev => {
          const updated = { ...prev }
          delete updated[productId]
          return updated
        })
        if (onSuccess) onSuccess()
      } else {
        alert(data.error || 'Error actualizando precio')
      }
    } catch (error) {
      console.error('Error actualizando precio:', error)
      alert('Error actualizando precio')
    }
  }

  const handleToggleVisibility = async (productId: string, currentVisible: boolean) => {
    try {
      const response = await fetch(`/api/clients/${clientId}/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isVisible: !currentVisible })
      })

      const data = await response.json()

      if (data.success) {
        console.log(`✅ Visibilidad cambiada: ${data.data.name}`)
        await fetchClientCatalog()
        if (onSuccess) onSuccess()
      } else {
        alert(data.error || 'Error cambiando visibilidad')
      }
    } catch (error) {
      console.error('Error cambiando visibilidad:', error)
      alert('Error cambiando visibilidad')
    }
  }

  const handleRemoveProduct = async (productId: string, productName: string) => {
    if (!confirm(`¿Eliminar "${productName}" del catálogo de ${clientName}?`)) return

    try {
      const response = await fetch(`/api/clients/${clientId}/products/${productId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        console.log(`✅ Producto eliminado: ${productName}`)
        await fetchClientCatalog()
        if (onSuccess) onSuccess()
      } else {
        alert(data.error || 'Error eliminando producto')
      }
    } catch (error) {
      console.error('Error eliminando producto:', error)
      alert('Error eliminando producto')
    }
  }

  const filteredProducts = clientProducts.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.sku?.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-700 p-4 sm:p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold truncate">Catálogo de Productos</h2>
              <p className="text-purple-100 mt-1 text-sm sm:text-base truncate">Cliente: {clientName}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-4 sm:mt-6 flex-wrap">
            <button
              onClick={handleTabCatalog}
              className={`px-3 sm:px-6 py-2 rounded-lg font-semibold transition-colors text-sm sm:text-base ${
                activeTab === 'catalog'
                  ? 'bg-white text-purple-600'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              📦 Catálogo ({clientProducts.length})
            </button>
            <button
              onClick={handleTabCreate}
              className={`px-3 sm:px-6 py-2 rounded-lg font-semibold transition-colors text-sm sm:text-base ${
                activeTab === 'create'
                  ? 'bg-white text-purple-600'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              <Plus className="w-4 h-4 inline mr-1" />
              <span className="hidden sm:inline">Crear</span>
              <span className="sm:hidden">+</span>
            </button>
            <button
              onClick={handleTabImport}
              className={`px-3 sm:px-6 py-2 rounded-lg font-semibold transition-colors text-sm sm:text-base ${
                activeTab === 'import'
                  ? 'bg-white text-purple-600'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              <Upload className="w-4 h-4 inline mr-1" />
              <span className="hidden sm:inline">Importar Excel</span>
              <span className="sm:hidden">Excel</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(95vh-180px)]">
          {activeTab === 'catalog' && (
            // TAB: Catálogo actual
            <div>
              {/* Search and Export */}
              <div className="mb-4 sm:mb-6 flex gap-2 sm:gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre o SKU..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-sm sm:text-base"
                  />
                </div>
                <Button
                  onClick={handleExportProducts}
                  disabled={exporting || clientProducts.length === 0}
                  variant="outline"
                  className="border-green-500 text-green-700 hover:bg-green-50 px-3 sm:px-4 flex-shrink-0"
                >
                  {exporting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Download className="w-5 h-5 sm:mr-2" />
                      <span className="hidden sm:inline">Exportar</span>
                    </>
                  )}
                </Button>
              </div>

              {loading && <LoadingState />}
              {!loading && filteredProducts.length === 0 && (
                <EmptyState searchTerm={searchTerm} onCreateClick={() => setActiveTab('create')} />
              )}
              {!loading && filteredProducts.length > 0 && (
                <div className="space-y-3">
                  {filteredProducts.map((product) => (
                    <div
                      key={product.productId}
                      className={`border-2 rounded-xl p-3 sm:p-4 transition-all ${
                        product.isVisible
                          ? 'border-gray-200 bg-white'
                          : 'border-gray-200 bg-gray-50 opacity-60'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
                        {/* Image */}
                        <div className="w-full sm:w-16 h-24 sm:h-16 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0 relative">
                          {product.imageUrl ? (
                            <Image
                              src={product.imageUrl}
                              alt={product.name}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          ) : (
                            <Package className="w-8 h-8 text-gray-300" />
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-gray-800 truncate">{product.name}</h4>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {product.sku && (
                                  <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-0.5 rounded">
                                    {product.sku}
                                  </span>
                                )}
                                <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                                  {product.category}
                                </span>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-1 sm:gap-2 flex-shrink-0">
                              <button
                                onClick={() => handleOpenEdit(product)}
                                className="p-1.5 sm:p-2 bg-blue-100 text-blue-600 hover:bg-blue-200 rounded-lg transition-colors"
                                title="Editar producto"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleToggleVisibility(product.productId, product.isVisible)}
                                className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                                  product.isVisible
                                    ? 'bg-green-100 text-green-600 hover:bg-green-200'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                                title={product.isVisible ? 'Ocultar' : 'Mostrar'}
                              >
                                {product.isVisible ? (
                                  <Eye className="w-4 h-4" />
                                ) : (
                                  <EyeOff className="w-4 h-4" />
                                )}
                              </button>
                              <button
                                onClick={() => handleRemoveProduct(product.productId, product.name)}
                                className="p-1.5 sm:p-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg transition-colors"
                                title="Eliminar"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Price Editor */}
                          <div className="mt-3 flex flex-wrap items-center gap-2 sm:gap-3">
                            <div className="flex items-center gap-2">
                              <DollarSign className="w-4 h-4 text-gray-400" />
                              {editingPrices[product.productId] === undefined ? (
                                <button
                                  onClick={() =>
                                    setEditingPrices(prev => ({
                                      ...prev,
                                      [product.productId]: product.customPrice
                                    }))
                                  }
                                  className="text-lg font-bold text-purple-600 hover:text-purple-700 transition-colors flex items-center gap-1"
                                >
                                  {formatPrice(product.customPrice)}
                                  <Edit3 className="w-3 h-3" />
                                </button>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={editingPrices[product.productId]}
                                    onChange={(e) =>
                                      setEditingPrices(prev => ({
                                        ...prev,
                                        [product.productId]: Number.parseFloat(e.target.value) || 0
                                      }))
                                    }
                                    className="w-20 sm:w-24 px-2 py-1 border-2 border-purple-300 rounded-lg text-sm"
                                    autoFocus
                                  />
                                  <button
                                    onClick={() =>
                                      handleUpdatePrice(
                                        product.productId,
                                        editingPrices[product.productId]
                                      )
                                    }
                                    className="p-1 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                                  >
                                    <Save className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() =>
                                      setEditingPrices(prev => {
                                        const updated = { ...prev }
                                        delete updated[product.productId]
                                        return updated
                                      })
                                    }
                                    className="p-1 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </div>
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                              Stock: {product.stock} {product.unit}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {activeTab === 'create' && (
            // TAB: Crear nuevo producto
            <div>
              <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4 mb-6">
                <h3 className="font-bold text-purple-800 mb-1">
                  ✨ Crear Producto para {clientName}
                </h3>
                <p className="text-sm text-purple-600">
                  Este producto será exclusivo para este cliente con el precio que definas.
                </p>
              </div>

              <div className="space-y-4">
                {/* Nombre */}
                <div>
                  <label htmlFor="new-product-name-input" className="block text-sm font-semibold text-gray-700 mb-1">
                    Nombre del Producto *
                  </label>
                  <input
                    id="new-product-name-input"
                    type="text"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ej: Manzana Roja Premium"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>

                {/* Descripción */}
                <div>
                  <label htmlFor="new-product-description-input" className="block text-sm font-semibold text-gray-700 mb-1">
                    Descripción
                  </label>
                  <textarea
                    id="new-product-description-input"
                    value={newProduct.description}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descripción del producto..."
                    rows={2}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                  />
                </div>

                {/* Precio y Stock */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="new-product-price-input" className="block text-sm font-semibold text-gray-700 mb-1">
                      Precio *
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        id="new-product-price-input"
                        type="number"
                        step="0.01"
                        value={newProduct.price}
                        onChange={(e) => setNewProduct(prev => ({ ...prev, price: e.target.value }))}
                        placeholder="0.00"
                        className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="new-product-stock-input" className="block text-sm font-semibold text-gray-700 mb-1">
                      Stock Inicial
                    </label>
                    <input
                      id="new-product-stock-input"
                      type="number"
                      value={newProduct.stock}
                      onChange={(e) => setNewProduct(prev => ({ ...prev, stock: e.target.value }))}
                      placeholder="100"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                </div>

                {/* Categoría y Unidad */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="new-product-category-select" className="block text-sm font-semibold text-gray-700 mb-1">
                      Categoría
                    </label>
                    <select
                      id="new-product-category-select"
                      value={newProduct.category}
                      onChange={(e) => setNewProduct(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="new-product-unit-select" className="block text-sm font-semibold text-gray-700 mb-1">
                      Unidad
                    </label>
                    <select
                      id="new-product-unit-select"
                      value={newProduct.unit}
                      onChange={(e) => setNewProduct(prev => ({ ...prev, unit: e.target.value }))}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
                    >
                      {UNITS.map(unit => (
                        <option key={unit.value} value={unit.value}>{unit.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* SKU e Imagen */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="new-product-sku-input" className="block text-sm font-semibold text-gray-700 mb-1">
                      SKU (Opcional)
                    </label>
                    <input
                      id="new-product-sku-input"
                      type="text"
                      value={newProduct.sku}
                      onChange={(e) => setNewProduct(prev => ({ ...prev, sku: e.target.value }))}
                      placeholder="Ej: MANZ-001"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="new-product-image-url-input" className="block text-sm font-semibold text-gray-700 mb-1">
                      URL de Imagen (Opcional)
                    </label>
                    <div className="relative">
                      <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        id="new-product-image-url-input"
                        type="url"
                        value={newProduct.imageUrl}
                        onChange={(e) => setNewProduct(prev => ({ ...prev, imageUrl: e.target.value }))}
                        placeholder="https://..."
                        className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Botón Crear */}
                <div className="pt-4 border-t">
                  <Button
                    onClick={handleCreateProduct}
                    disabled={saving || !newProduct.name || !newProduct.price}
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 py-3 text-lg font-semibold"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Creando...
                      </>
                    ) : (
                      <>
                        <Plus className="w-5 h-5 mr-2" />
                        Crear Producto para {clientName}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'import' && (
            // TAB: Importar desde Excel
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-xl p-4">
                <h4 className="font-bold text-purple-800 mb-2 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5" />
                  Importar productos desde Excel
                </h4>
                <p className="text-sm text-gray-600 mb-3">
                  Sube un archivo Excel con los productos. El sistema detectará automáticamente las columnas:{' '}
                  <strong>Item #, Description, Brand, Pack, Size, Price</strong>
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      const response = await fetch('/api/products/import')
                      const blob = await response.blob()
                      const url = globalThis.URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = 'plantilla_productos.xlsx'
                      a.click()
                      globalThis.URL.revokeObjectURL(url)
                    } catch (err) {
                      console.error('Error descargando plantilla:', err)
                    }
                  }}
                  className="border-purple-300 text-purple-700 hover:bg-purple-100"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Descargar plantilla
                </Button>
              </div>

              {/* Zona de carga */}
              <ImportFileDropzone
                importFile={importFile}
                fileInputRef={fileInputRef}
                onFileSelect={(file) => {
                  setImportFile(file)
                  setImportResult(null)
                }}
                onFileClear={() => {
                  setImportFile(null)
                  setImportResult(null)
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }}
              />

              {/* Botón de importar */}
              {importFile && !importResult && (
                <Button
                  onClick={async () => {
                    if (!importFile) return
                    setImporting(true)
                    try {
                      const formData = new FormData()
                      formData.append('file', importFile)
                      formData.append('clientId', clientId)
                      formData.append('updateExisting', 'false')

                      const response = await fetch('/api/products/import', {
                        method: 'POST',
                        body: formData
                      })
                      const data = await response.json()

                      if (data.success) {
                        setImportResult({
                          success: true,
                          stats: data.stats,
                          errors: data.errors || []
                        })
                        // Recargar catálogo
                        fetchClientCatalog()
                      } else {
                        setImportResult({
                          success: false,
                          stats: { created: 0, updated: 0, skipped: 0, errors: 1 },
                          errors: [data.error || 'Error al importar']
                        })
                      }
                    } catch (err: any) {
                      setImportResult({
                        success: false,
                        stats: { created: 0, updated: 0, skipped: 0, errors: 1 },
                        errors: [err.message || 'Error al importar']
                      })
                    } finally {
                      setImporting(false)
                    }
                  }}
                  disabled={importing}
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 py-3 text-lg font-semibold"
                >
                  {importing ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Importando productos...
                    </>
                  ) : (
                    <>
                      <Package className="w-5 h-5 mr-2" />
                      Importar Productos para {clientName}
                    </>
                  )}
                </Button>
              )}

              {/* Resultado */}
              {importResult && (
                <ImportResultDisplay
                  result={importResult}
                  clientName={clientName}
                  onImportAnother={() => {
                    setImportFile(null)
                    setImportResult(null)
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                  onViewCatalog={() => setActiveTab('catalog')}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Edición de Producto */}
      {editingProduct && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 sm:p-6 text-white rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Edit3 className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold">Editar Producto</h3>
                    <p className="text-blue-100 text-sm">Modificar información del producto</p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingProduct(null)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>
            </div>

            {/* Form */}
            <div className="p-4 sm:p-6 space-y-4">
              {/* Nombre */}
              <div>
                <label htmlFor="edit-product-name-input" className="block text-sm font-semibold text-gray-700 mb-1">
                  Nombre del Producto *
                </label>
                <input
                  id="edit-product-name-input"
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ej: Manzana Roja Premium"
                />
              </div>

              {/* SKU */}
              <div>
                <label htmlFor="edit-product-sku-input" className="block text-sm font-semibold text-gray-700 mb-1">
                  SKU / Código
                </label>
                <input
                  id="edit-product-sku-input"
                  type="text"
                  value={editForm.sku}
                  onChange={(e) => setEditForm(prev => ({ ...prev, sku: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                  placeholder="Ej: MANZ-001"
                />
              </div>

              {/* Descripción */}
              <div>
                <label htmlFor="edit-product-description-input" className="block text-sm font-semibold text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  id="edit-product-description-input"
                  value={editForm.description}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  rows={2}
                  placeholder="Descripción del producto..."
                />
              </div>

              {/* Precio */}
              <div>
                <label htmlFor="edit-product-price-input" className="block text-sm font-semibold text-gray-700 mb-1">
                  Precio para {clientName} *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="edit-product-price-input"
                    type="number"
                    step="0.01"
                    value={editForm.price}
                    onChange={(e) => setEditForm(prev => ({ ...prev, price: e.target.value }))}
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Categoría y Unidad */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="edit-product-category-select" className="block text-sm font-semibold text-gray-700 mb-1">
                    Categoría
                  </label>
                  <select
                    id="edit-product-category-select"
                    value={editForm.category}
                    onChange={(e) => setEditForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="edit-product-unit-select" className="block text-sm font-semibold text-gray-700 mb-1">
                    Unidad
                  </label>
                  <select
                    id="edit-product-unit-select"
                    value={editForm.unit}
                    onChange={(e) => setEditForm(prev => ({ ...prev, unit: e.target.value }))}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {UNITS.map(u => (
                      <option key={u.value} value={u.value}>{u.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Botones */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setEditingProduct(null)}
                  className="flex-1"
                  disabled={savingEdit}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  disabled={savingEdit || !editForm.name || !editForm.price}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  {savingEdit ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Guardar Cambios
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
