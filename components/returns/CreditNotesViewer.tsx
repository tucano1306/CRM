// components/returns/CreditNotesViewer.tsx
'use client'

import { useState, useEffect } from 'react'
import { DollarSign, Calendar, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CreditNote {
  id: string
  creditNoteNumber: string
  amount: number
  balance: number
  usedAmount: number
  isActive: boolean
  expiresAt: string | null
  createdAt: string
  return: {
    returnNumber: string
    order: {
      orderNumber: string
    }
  }
  usage: Array<{
    id: string
    amountUsed: number
    usedAt: string
    order: {
      orderNumber: string
    }
  }>
}

export default function CreditNotesViewer() {
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedNote, setSelectedNote] = useState<CreditNote | null>(null)

  useEffect(() => {
    fetchCreditNotes()
  }, [])

  const fetchCreditNotes = async () => {
    try {
      const response = await fetch('/api/credit-notes?role=client')
      const result = await response.json()
      if (result.success) {
        setCreditNotes(result.data)
      }
    } catch (error) {
      console.error('Error fetching credit notes:', error)
    } finally {
      setLoading(false)
    }
  }

  const totalAvailable = creditNotes
    .filter(cn => cn.isActive && cn.balance > 0)
    .reduce((sum, cn) => sum + cn.balance, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Clock className="h-8 w-8 animate-spin text-green-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header con Total Disponible */}
      <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <DollarSign className="h-8 w-8" />
          <div>
            <p className="text-sm opacity-90">Crédito Total Disponible</p>
            <p className="text-4xl font-bold">${totalAvailable.toFixed(2)}</p>
          </div>
        </div>
        <p className="text-sm opacity-90 mt-2">
          Puedes usar tu crédito en tu próxima orden
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-3 rounded-lg">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{creditNotes.length}</p>
              <p className="text-sm text-gray-600">Total de Créditos</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-3 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {creditNotes.filter(cn => cn.isActive && cn.balance > 0).length}
              </p>
              <p className="text-sm text-gray-600">Activos</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="bg-orange-100 p-3 rounded-lg">
              <DollarSign className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                ${creditNotes.reduce((sum, cn) => sum + cn.usedAmount, 0).toFixed(2)}
              </p>
              <p className="text-sm text-gray-600">Total Usado</p>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Créditos */}
      {creditNotes.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <DollarSign className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No tienes créditos disponibles
          </h3>
          <p className="text-gray-600">
            Los créditos aparecerán aquí cuando completes una devolución
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {creditNotes.map((note) => {
            const isExpired = note.expiresAt && new Date() > new Date(note.expiresAt)
            const hasBalance = note.balance > 0

            return (
              <div
                key={note.id}
                className={`bg-white rounded-lg shadow-sm border p-4 transition-all ${
                  hasBalance && !isExpired
                    ? 'border-green-200 hover:border-green-300 hover:shadow-md'
                    : 'border-gray-200 opacity-75'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${
                    hasBalance && !isExpired ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    <DollarSign className={`h-6 w-6 ${
                      hasBalance && !isExpired ? 'text-green-600' : 'text-gray-400'
                    }`} />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">
                        {note.creditNoteNumber}
                      </h3>
                      {hasBalance && !isExpired && (
                        <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">
                          Disponible
                        </span>
                      )}
                      {isExpired && (
                        <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-800">
                          Expirado
                        </span>
                      )}
                      {!hasBalance && !isExpired && (
                        <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-800">
                          Usado completamente
                        </span>
                      )}
                    </div>

                    <div className="text-sm text-gray-600 space-y-1">
                      <p>
                        🔄 Devolución: {note.return.returnNumber} | 
                        Orden: {note.return.order.orderNumber}
                      </p>
                      <p>
                        💰 Monto original: ${note.amount.toFixed(2)} | 
                        Usado: ${note.usedAmount.toFixed(2)}
                      </p>
                      {note.expiresAt && (
                        <p className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Expira: {new Date(note.expiresAt).toLocaleDateString('es-ES')}
                        </p>
                      )}
                    </div>

                    {/* Historial de uso */}
                    {note.usage.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs font-semibold text-gray-700 mb-2">
                          Historial de uso:
                        </p>
                        <div className="space-y-1">
                          {note.usage.map((use) => (
                            <div key={use.id} className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                              📦 {use.order.orderNumber} - ${use.amountUsed.toFixed(2)} - {new Date(use.usedAt).toLocaleDateString('es-ES')}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">
                      ${note.balance.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">Disponible</p>
                    
                    {hasBalance && !isExpired && (
                      <Button
                        onClick={() => setSelectedNote(note)}
                        size="sm"
                        className="mt-2 bg-green-600 hover:bg-green-700 text-xs"
                      >
                        Usar Crédito
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Info adicional */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">💡 ¿Cómo usar tus créditos?</p>
            <ul className="list-disc list-inside space-y-1 text-blue-700">
              <li>Los créditos se aplican automáticamente al hacer una nueva orden</li>
              <li>Puedes usar múltiples créditos en una sola orden</li>
              <li>Los créditos expiran después de 1 año</li>
              <li>No se pueden transferir a otra cuenta</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Modal usar crédito (placeholder - implementar según necesidad) */}
      {selectedNote && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Usar Crédito</h3>
            <p className="text-gray-600 mb-4">
              Para usar este crédito, aplícalo al momento de crear una nueva orden.
              El crédito se descontará automáticamente del total.
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => setSelectedNote(null)}
                variant="outline"
                className="flex-1"
              >
                Cerrar
              </Button>
              <Button
                onClick={() => {
                  window.location.href = '/buyer/catalog'
                }}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                Ir a Catálogo
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
