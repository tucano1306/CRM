// app/debug/invitations/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Mail, CheckCircle } from 'lucide-react'

interface Method {
  name: string
  description: string
  examples?: string[]
  services?: string[]
  note?: string
}

export default function DebugInvitationsPage() {
  const [instructions, setInstructions] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchInstructions()
  }, [])

  const fetchInstructions = async () => {
    try {
      const response = await fetch('/api/debug/invitations')
      const result = await response.json()
      if (result.success) {
        setInstructions(result.instructions)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            📧 {instructions?.title || 'Guía de Testing'}
          </h1>
          <p className="text-gray-600">
            Cómo probar el sistema de invitaciones con un solo email
          </p>
        </div>

        {/* Métodos */}
        {instructions?.methods && (
          <div className="space-y-6">
            {instructions.methods.map((method: Method, idx: number) => (
              <Card key={idx} className="border-2 hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-xl text-blue-900">
                    {method.name}
                  </CardTitle>
                  <CardDescription className="text-base">
                    {method.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {method.examples && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="font-semibold text-sm text-gray-700 mb-2">
                        Ejemplos:
                      </p>
                      {method.examples.map((example: string, i: number) => (
                        <div key={i} className="flex items-start gap-2 mb-1">
                          <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <code className="text-sm text-gray-800 break-all">
                            {example}
                          </code>
                        </div>
                      ))}
                    </div>
                  )}
                  {method.services && (
                    <div className="bg-blue-50 rounded-lg p-4">
                      <p className="font-semibold text-sm text-blue-900 mb-2">
                        Servicios:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {method.services.map((service: string, i: number) => (
                          <span 
                            key={i}
                            className="px-3 py-1 bg-white rounded-full text-sm text-blue-700 border border-blue-200"
                          >
                            {service}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {method.note && (
                    <div className="bg-green-50 border-l-4 border-green-500 p-3">
                      <p className="text-sm text-green-800">
                        💡 <strong>Nota:</strong> {method.note}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Pasos para probar */}
        {instructions?.howToTest && (
          <Card className="mt-6 border-2 border-purple-200 bg-purple-50">
            <CardHeader>
              <CardTitle className="text-purple-900">
                🚀 Pasos para Probar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3">
                {instructions.howToTest.map((step: string, i: number) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-600 text-white text-sm flex items-center justify-center font-bold">
                      {i + 1}
                    </span>
                    <span className="text-purple-900 pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        )}

        {/* Tip adicional */}
        <div className="mt-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <div className="flex items-start gap-3">
            <Mail className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <p className="font-semibold text-yellow-900 mb-1">
                💡 Consejo Pro
              </p>
              <p className="text-sm text-yellow-800">
                Si usas Gmail, puedes crear infinitos emails agregando <code className="bg-white px-1 rounded">+cualquiercosa</code> antes del @. 
                Ejemplo: si tu email es <code className="bg-white px-1 rounded">juan@gmail.com</code>, 
                puedes usar <code className="bg-white px-1 rounded">juan+cliente1@gmail.com</code>, 
                <code className="bg-white px-1 rounded">juan+cliente2@gmail.com</code>, etc. 
                Todos llegan a tu bandeja principal.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
