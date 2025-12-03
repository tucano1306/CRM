'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import MainLayout from '@/components/shared/MainLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Upload, 
  FileSpreadsheet, 
  Download, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Loader2,
  ArrowLeft,
  FileUp,
  Package,
  RefreshCw
} from 'lucide-react'
import Link from 'next/link'

interface ImportResult {
  success: boolean
  message: string
  stats: {
    total: number
    created: number
    updated: number
    skipped: number
    errors: number
  }
  errors: string[]
  headers?: string[]
  columnMapping?: Record<string, number>
}

export default function ImportProductsPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [updateExisting, setUpdateExisting] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0]
      if (isValidFile(droppedFile)) {
        setFile(droppedFile)
        setError(null)
        setResult(null)
      } else {
        setError('Por favor selecciona un archivo Excel (.xlsx, .xls) o CSV')
      }
    }
  }

  const isValidFile = (file: File) => {
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ]
    const validExtensions = ['.xlsx', '.xls', '.csv']
    return validTypes.includes(file.type) || 
           validExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      if (isValidFile(selectedFile)) {
        setFile(selectedFile)
        setError(null)
        setResult(null)
      } else {
        setError('Por favor selecciona un archivo Excel (.xlsx, .xls) o CSV')
      }
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setError(null)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('updateExisting', updateExisting.toString())

      const response = await fetch('/api/products/import', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al importar productos')
      }

      setResult(data)

    } catch (err: any) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const downloadTemplate = async () => {
    try {
      const response = await fetch('/api/products/import')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'plantilla_productos.xlsx'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      a.remove()
    } catch (err) {
      console.error('Error descargando plantilla:', err)
    }
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link href="/products" className="inline-flex items-center text-purple-600 hover:text-purple-700 mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Productos
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
            <FileSpreadsheet className="w-8 h-8 text-purple-600" />
            Importar Productos desde Excel
          </h1>
          <p className="text-gray-600 mt-2">
            Sube un archivo Excel con tus productos para agregarlos automáticamente al catálogo.
          </p>
        </div>

        {/* Instrucciones */}
        <Card className="mb-6 border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50">
          <CardHeader>
            <CardTitle className="text-lg text-purple-800">📋 Formato del archivo</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 mb-4">
              Tu archivo debe tener columnas como estas (el orden no importa):
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              <div className="bg-white rounded-lg p-2 text-center border border-purple-200">
                <span className="text-sm font-semibold text-purple-700">Item #</span>
                <p className="text-xs text-gray-500">Código/SKU</p>
              </div>
              <div className="bg-white rounded-lg p-2 text-center border border-purple-200">
                <span className="text-sm font-semibold text-purple-700">Description</span>
                <p className="text-xs text-gray-500">Nombre</p>
              </div>
              <div className="bg-white rounded-lg p-2 text-center border border-purple-200">
                <span className="text-sm font-semibold text-purple-700">Brand</span>
                <p className="text-xs text-gray-500">Marca</p>
              </div>
              <div className="bg-white rounded-lg p-2 text-center border border-purple-200">
                <span className="text-sm font-semibold text-purple-700">Price</span>
                <p className="text-xs text-gray-500">Precio</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={downloadTemplate}
              className="border-purple-300 text-purple-700 hover:bg-purple-100"
            >
              <Download className="w-4 h-4 mr-2" />
              Descargar plantilla de ejemplo
            </Button>
          </CardContent>
        </Card>

        {/* Zona de carga */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                dragActive 
                  ? 'border-purple-500 bg-purple-50' 
                  : file 
                    ? 'border-green-400 bg-green-50' 
                    : 'border-gray-300 hover:border-purple-400 hover:bg-gray-50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />
              
              {file ? (
                <div className="space-y-4">
                  <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                    <FileSpreadsheet className="w-8 h-8 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{file.name}</p>
                    <p className="text-sm text-gray-500">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setFile(null)
                      setResult(null)
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }}
                  >
                    Cambiar archivo
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="w-16 h-16 mx-auto bg-purple-100 rounded-full flex items-center justify-center">
                    <FileUp className="w-8 h-8 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      Arrastra tu archivo Excel aquí
                    </p>
                    <p className="text-sm text-gray-500">
                      o haz clic para seleccionar
                    </p>
                  </div>
                  <Button 
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Seleccionar archivo
                  </Button>
                </div>
              )}
            </div>

            {/* Opciones */}
            {file && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={updateExisting}
                    onChange={(e) => setUpdateExisting(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                  />
                  <div>
                    <span className="font-medium text-gray-900">
                      Actualizar productos existentes
                    </span>
                    <p className="text-sm text-gray-500">
                      Si un producto con el mismo SKU ya existe, se actualizará con los nuevos datos
                    </p>
                  </div>
                </label>
              </div>
            )}

            {/* Botón de importar */}
            {file && !result && (
              <Button
                onClick={handleUpload}
                disabled={uploading}
                className="w-full mt-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-6 text-lg"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Importando productos...
                  </>
                ) : (
                  <>
                    <Package className="w-5 h-5 mr-2" />
                    Importar Productos
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Error */}
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-red-800">Error al importar</p>
                  <p className="text-red-700">{error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Resultado */}
        {result && (
          <Card className={`mb-6 ${result.success ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {result.success ? (
                  <>
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <span className="text-green-800">Importación completada</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-6 h-6 text-yellow-600" />
                    <span className="text-yellow-800">Importación con advertencias</span>
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Estadísticas */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                  <p className="text-2xl font-bold text-gray-900">{result.stats.total}</p>
                  <p className="text-sm text-gray-600">Total filas</p>
                </div>
                <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                  <p className="text-2xl font-bold text-green-600">{result.stats.created}</p>
                  <p className="text-sm text-gray-600">Creados</p>
                </div>
                <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                  <p className="text-2xl font-bold text-blue-600">{result.stats.updated}</p>
                  <p className="text-sm text-gray-600">Actualizados</p>
                </div>
                <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                  <p className="text-2xl font-bold text-gray-500">{result.stats.skipped}</p>
                  <p className="text-sm text-gray-600">Omitidos</p>
                </div>
              </div>

              {/* Errores si los hay */}
              {result.errors && result.errors.length > 0 && (
                <div className="mt-4 p-4 bg-yellow-100 rounded-lg">
                  <p className="font-semibold text-yellow-800 mb-2">
                    ⚠️ Algunas filas tuvieron problemas:
                  </p>
                  <ul className="text-sm text-yellow-700 space-y-1 max-h-40 overflow-y-auto">
                    {result.errors.map((err, i) => (
                      <li key={i}>• {err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Acciones */}
              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <Button
                  onClick={() => {
                    setFile(null)
                    setResult(null)
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Importar otro archivo
                </Button>
                <Link href="/products" className="flex-1">
                  <Button className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700">
                    <Package className="w-4 h-4 mr-2" />
                    Ver productos
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  )
}
