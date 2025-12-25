'use client'

import { useState } from 'react'
import { Upload, CheckCircle, XCircle, Loader2, FileSpreadsheet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function ImportCatalogPage() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    productsCreated?: number
    assignmentsCreated?: number
    clientsCount?: number
    errors?: string[]
    error?: string
  } | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setResult(null)
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/seller/import-catalog', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()
      setResult(data)

      if (data.success) {
        setFile(null)
        // Reset input
        const input = document.getElementById('file-input') as HTMLInputElement
        if (input) input.value = ''
      }
    } catch (error: any) {
      setResult({ success: false, error: error.message })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-xl">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
            <CardTitle className="text-2xl flex items-center gap-2">
              <FileSpreadsheet className="h-6 w-6" />
              Importar Catálogo desde Excel
            </CardTitle>
            <CardDescription className="text-blue-100">
              Sube tu archivo Excel para crear productos y asignarlos a todos tus clientes
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-6 space-y-6">
            {/* Instrucciones */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h3 className="font-semibold text-amber-900 mb-2">📋 Formato del archivo:</h3>
              <ul className="text-sm text-amber-800 space-y-1 ml-4 list-disc">
                <li><strong>Nombre</strong> - Nombre del producto (obligatorio)</li>
                <li><strong>Precio</strong> - Precio del producto (obligatorio)</li>
                <li><strong>Descripción</strong> - Descripción del producto (opcional)</li>
                <li><strong>SKU</strong> o <strong>Código</strong> - Código único (opcional)</li>
                <li><strong>Stock</strong> o <strong>Existencia</strong> - Cantidad disponible (opcional)</li>
              </ul>
            </div>

            {/* Upload */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <input
                id="file-input"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />
              
              {!file ? (
                <label htmlFor="file-input" className="cursor-pointer">
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">Haz clic para seleccionar un archivo Excel</p>
                  <p className="text-sm text-gray-400">.xlsx o .xls</p>
                </label>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-2 text-green-600">
                    <FileSpreadsheet className="h-6 w-6" />
                    <span className="font-medium">{file.name}</span>
                  </div>
                  <div className="flex gap-2 justify-center">
                    <Button
                      onClick={handleUpload}
                      disabled={uploading}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Importando...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Importar Catálogo
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => setFile(null)}
                      variant="outline"
                      disabled={uploading}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Resultado */}
            {result && (
              <div className={`rounded-lg p-4 ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <div className="flex items-start gap-3">
                  {result.success ? (
                    <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <h3 className={`font-semibold mb-2 ${result.success ? 'text-green-900' : 'text-red-900'}`}>
                      {result.success ? '✅ Importación Exitosa' : '❌ Error en la Importación'}
                    </h3>
                    {result.success ? (
                      <div className="text-sm text-green-800 space-y-1">
                        <p>• Productos creados: <strong>{result.productsCreated}</strong></p>
                        <p>• Asignaciones creadas: <strong>{result.assignmentsCreated}</strong></p>
                        <p>• Clientes: <strong>{result.clientsCount}</strong></p>
                        {result.errors && result.errors.length > 0 && (
                          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                            <p className="text-yellow-800 font-medium">Advertencias:</p>
                            {result.errors.map((err, i) => (
                              <p key={i} className="text-xs text-yellow-700">• {err}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-red-800">{result.error}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
