// components/returns/CreditNotesViewer.tsx
'use client'

import { useState, useEffect } from 'react'
import { DollarSign, Calendar, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
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
        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-4 rounded-xl shadow-md">
          <Clock className="h-8 w-8 animate-spin text-white" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header con Total Disponible */}
      <div className="bg-white rounded-xl shadow-xl border-2 border-purple-200 p-8 transition-all hover:shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-br from-emerald-500 to-green-600 p-4 rounded-xl shadow-md">
            <DollarSign className="h-10 w-10 text-white" />
          </div>
          <div>
            <p className="text-sm text-gray-600 font-medium">Crédito Total Disponible</p>
            <p className="text-5xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
              {formatPrice(totalAvailable)}
            </p>
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-4 flex items-center gap-2">
          <span className="bg-gradient-to-br from-purple-100 to-indigo-100 p-1.5 rounded-lg">💡</span>
          Puedes usar tu crédito en tu próxima orden
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-lg border-2 border-purple-200 p-6 transition-all hover:shadow-xl hover:-translate-y-1">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-3 rounded-xl shadow-md">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">{creditNotes.length}</p>
              <p className="text-sm text-gray-600">Total de Créditos</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border-2 border-emerald-200 p-6 transition-all hover:shadow-xl hover:-translate-y-1">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-emerald-500 to-green-600 p-3 rounded-xl shadow-md">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-600">
                {creditNotes.filter(cn => cn.isActive && cn.balance > 0).length}
              </p>
              <p className="text-sm text-gray-600">Activos</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border-2 border-amber-200 p-6 transition-all hover:shadow-xl hover:-translate-y-1">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-3 rounded-xl shadow-md">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600">
                {formatPrice(creditNotes.reduce((sum, cn) => sum + cn.usedAmount, 0))}
              </p>
              <p className="text-sm text-gray-600">Total Usado</p>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Créditos */}
      {creditNotes.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg border-2 border-purple-200 p-12 text-center">
          <div className="bg-gradient-to-br from-purple-100 to-indigo-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <DollarSign className="h-10 w-10 text-purple-600" />
          </div>
          <h3 className="text-lg font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2">
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
                className={`bg-white rounded-xl shadow-lg border-2 p-6 transition-all ${
                  hasBalance && !isExpired
                    ? 'border-emerald-200 hover:border-emerald-300 hover:shadow-xl hover:-translate-y-1'
                    : 'border-gray-200 opacity-75 hover:shadow-xl'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl shadow-md ${
                    hasBalance && !isExpired 
                      ? 'bg-gradient-to-br from-emerald-500 to-green-600' 
                      : 'bg-gradient-to-br from-gray-400 to-gray-500'
                  }`}>
                    <DollarSign className="h-6 w-6 text-white" />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-purple-600 text-lg">
                        {note.creditNoteNumber}
                      </h3>
                      {hasBalance && !isExpired && (
                        <span className="text-xs px-3 py-1 rounded-full bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 text-emerald-700 font-semibold">
                          Disponible
                        </span>
                      )}
                      {isExpired && (
                        <span className="text-xs px-3 py-1 rounded-full bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-200 text-red-700 font-semibold">
                          Expirado
                        </span>
                      )}
                      {!hasBalance && !isExpired && (
                        <span className="text-xs px-3 py-1 rounded-full bg-gradient-to-br from-gray-50 to-slate-50 border-2 border-gray-200 text-gray-700 font-semibold">
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
                        💰 Monto original: {formatPrice(note.amount)} | 
                        Usado: {formatPrice(note.usedAmount)}
                      </p>
                      {note.expiresAt && (
                        <p className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Expira: {new Date(note.expiresAt).toLocaleDateString('es-ES')}
                        </p>
                      )}
                    </div>

                    {/* Historial de uso */}
                    {note.usage && note.usage.length > 0 && (
                      <div className="mt-4 pt-4 border-t-2 border-purple-100">
                        <p className="text-xs font-semibold text-purple-600 mb-2">
                          Historial de uso:
                        </p>
                        <div className="space-y-2">
                          {note.usage.map((use: any) => (
                            <div key={use.id} className="text-xs text-gray-600 bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-200 p-2 rounded-lg">
                              📦 {use.order?.orderNumber || 'N/A'} - {formatPrice(Number(use.amountUsed))} - {new Date(use.usedAt).toLocaleDateString('es-ES')}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    <p className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                      {formatPrice(note.balance)}
                    </p>
                    <p className="text-xs text-gray-500">Disponible</p>
                    
                    {hasBalance && !isExpired && (
                      <Button
                        onClick={() => setSelectedNote(note)}
                        size="sm"
                        className="mt-3 bg-gradient-to-br from-emerald-600 to-green-600 hover:shadow-lg transition-all text-white border-0 text-xs font-semibold"
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
      <div className="bg-white rounded-xl shadow-lg border-2 border-cyan-200 p-6">
        <div className="flex items-start gap-4">
          <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-2 rounded-xl shadow-md flex-shrink-0">
            <AlertCircle className="h-6 w-6 text-white" />
          </div>
          <div className="text-sm text-gray-700">
            <p className="font-semibold text-purple-600 mb-2 flex items-center gap-2">
              <span className="text-lg">💡</span>
              ¿Cómo usar tus créditos?
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-gray-600">
              <li>Los créditos se aplican automáticamente al hacer una nueva orden</li>
              <li>Puedes usar múltiples créditos en una sola orden</li>
              <li>Los créditos expiran después de 1 año</li>
              <li>No se pueden transferir a otra cuenta</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Modal usar crédito */}
      {selectedNote && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border-2 border-purple-200 p-8 max-w-md w-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-3 rounded-xl shadow-md">
                <span className="text-2xl">💳</span>
              </div>
              <h3 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                Usar Crédito
              </h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              Tienes <span className="font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent text-xl">{formatPrice(selectedNote.balance)}</span> disponible.
              Ve al carrito para aplicar este crédito a tu próxima compra.
            </p>
            
            <div className="bg-gradient-to-br from-cyan-50 to-blue-50 border-2 border-cyan-200 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-1.5 rounded-lg flex-shrink-0">
                  <span className="text-sm">💡</span>
                </div>
                <p className="text-sm text-cyan-800">
                  El crédito se aplicará automáticamente al confirmar tu pedido desde el carrito.
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button
                onClick={() => setSelectedNote(null)}
                variant="outline"
                className="flex-1 border-2 border-purple-200 hover:border-purple-300 hover:bg-purple-50 transition-all"
              >
                Cerrar
              </Button>
              <Button
                onClick={async () => {
                  // Verificar si hay productos en el carrito
                  try {
                    const response = await fetch('/api/buyer/cart')
                    const result = await response.json()
                    
                    if (result.success && result.cart?.items?.length > 0) {
                      // Hay productos, ir al carrito
                      window.location.href = `/buyer/cart?useCredit=${selectedNote.id}`
                    } else {
                      // No hay productos, mostrar mensaje
                      alert('⚠️ Tu carrito está vacío.\n\nPor favor agrega productos al carrito antes de usar tus créditos.')
                      setSelectedNote(null)
                    }
                  } catch (error) {
                    console.error('Error checking cart:', error)
                    alert('Error al verificar el carrito. Por favor intenta de nuevo.')
                  }
                }}
                className="flex-1 bg-gradient-to-br from-emerald-600 to-green-600 hover:shadow-lg transition-all text-white border-0"
              >
                Ir al Carrito
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
