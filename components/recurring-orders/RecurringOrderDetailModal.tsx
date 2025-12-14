// components/recurring-orders/RecurringOrderDetailModal.tsx
'use client'

import { useState } from 'react'
import { X, Calendar, Package, History, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface RecurringOrderDetailModalProps {
  readonly order: any
  readonly isOpen: boolean
  readonly onClose: () => void
  readonly userRole: 'SELLER' | 'CLIENT'
}

export default function RecurringOrderDetailModal({
  order,
  isOpen,
  onClose,
  userRole
}: RecurringOrderDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'products' | 'history' | 'settings'>('info')

  if (!isOpen) return null

  const tabs = [
    { id: 'info', label: 'Información', icon: Calendar },
    { id: 'products', label: 'Productos', icon: Package },
    { id: 'history', label: 'Historial', icon: History },
    { id: 'settings', label: 'Configuración', icon: Settings }
  ]

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" onClick={onClose} onKeyDown={(e) => e.key === 'Enter' && onClose()} role="button" tabIndex={0} />
      
      <div className="fixed right-0 top-0 h-full w-full md:w-[800px] lg:w-[1000px] bg-white z-50 shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">{order.name}</h2>
              <p className="text-purple-100 text-sm mt-1">
                Frecuencia: {order.frequency}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-purple-500">
              <X className="h-6 w-6" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b bg-gray-50">
          <div className="flex gap-1 p-2">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'info' | 'products' | 'history' | 'settings')}
                  className={`
                    flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all
                    ${isActive ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-600 hover:bg-white/50'}
                  `}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* TAB: Información */}
          {activeTab === 'info' && (
            <div className="space-y-4">
              <div className="bg-white rounded-lg border p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Detalles Generales</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Próxima ejecución</p>
                    <p className="font-medium">{new Date(order.nextExecutionDate).toLocaleDateString('es-ES')}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Total</p>
                    <p className="font-medium text-green-600">${order.totalAmount.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Ejecuciones</p>
                    <p className="font-medium">{order.executionCount}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Estado</p>
                    <p className={`font-medium ${order.isActive ? 'text-green-600' : 'text-gray-600'}`}>
                      {order.isActive ? 'Activa' : 'Pausada'}
                    </p>
                  </div>
                </div>
              </div>

              {order.deliveryInstructions && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h3 className="font-semibold text-purple-900 mb-2">Instrucciones de Entrega</h3>
                  <p className="text-sm text-purple-800">{order.deliveryInstructions}</p>
                </div>
              )}

              {order.notes && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="font-semibold text-yellow-900 mb-2">Notas</h3>
                  <p className="text-sm text-yellow-800">{order.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* TAB: Productos */}
          {activeTab === 'products' && (
            <div className="space-y-3">
              {order.items?.map((item: any) => (
                <div key={item.id} className="bg-white rounded-lg border p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-gray-900">{item.productName}</h4>
                      <p className="text-sm text-gray-600">
                        {item.quantity} × ${item.pricePerUnit.toFixed(2)}
                      </p>
                    </div>
                    <p className="text-lg font-bold text-purple-600">
                      ${item.subtotal.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
              <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-900">Total:</span>
                  <span className="text-2xl font-bold text-green-600">${order.totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB: Historial */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              {order.executions?.length > 0 ? (
                order.executions.map((execution: any) => (
                  <div key={execution.id} className="bg-white rounded-lg border p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {new Date(execution.executedAt).toLocaleDateString('es-ES', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </p>
                        <p className="text-sm text-gray-600">
                          Orden #{execution.order?.orderNumber || 'N/A'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">${execution.totalAmount.toFixed(2)}</p>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          execution.success 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {execution.success ? 'Exitosa' : 'Fallida'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <History className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No hay ejecuciones registradas aún</p>
                </div>
              )}
            </div>
          )}

          {/* TAB: Configuración */}
          {activeTab === 'settings' && (
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  ⚠️ La edición de órdenes recurrentes estará disponible próximamente. 
                  Por ahora puedes pausar, reanudar o eliminar la orden.
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 p-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
        </div>
      </div>
    </>
  )
}
