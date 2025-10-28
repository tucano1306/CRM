'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Package, 
  DollarSign,
  AlertCircle,
  Loader2,
  ChevronDown,
  Truck,
  Box
} from 'lucide-react'

type OrderStatus = 
  | 'PENDING' 
  | 'CONFIRMED' 
  | 'PREPARING' 
  | 'READY_FOR_PICKUP' 
  | 'IN_DELIVERY' 
  | 'DELIVERED' 
  | 'PARTIALLY_DELIVERED' 
  | 'COMPLETED' 
  | 'CANCELED'
  | 'PAYMENT_PENDING'
  | 'PAID'

interface OrderStatusChangerProps {
  orderId: string
  currentStatus: OrderStatus
  onStatusChange?: (newStatus: OrderStatus, notes?: string) => Promise<void>
  disabled?: boolean
  userRole?: 'seller' | 'buyer' | 'admin'
}

const statusOptions: { value: OrderStatus; label: string; icon: any; color: string; description: string }[] = [
  { 
    value: 'PENDING', 
    label: 'Pendiente', 
    icon: Clock, 
    color: 'text-yellow-600',
    description: 'Orden recibida, esperando confirmación'
  },
  { 
    value: 'CONFIRMED', 
    label: 'Confirmada', 
    icon: CheckCircle, 
    color: 'text-blue-600',
    description: 'Orden confirmada por el vendedor'
  },
  { 
    value: 'PREPARING', 
    label: 'Preparando', 
    icon: Box, 
    color: 'text-indigo-600',
    description: 'Preparando el pedido'
  },
  { 
    value: 'READY_FOR_PICKUP', 
    label: 'Listo para Recoger', 
    icon: Package, 
    color: 'text-cyan-600',
    description: 'Pedido listo para entrega'
  },
  { 
    value: 'IN_DELIVERY', 
    label: 'En Entrega', 
    icon: Truck, 
    color: 'text-purple-600',
    description: 'En camino al cliente'
  },
  { 
    value: 'DELIVERED', 
    label: 'Entregado', 
    icon: CheckCircle, 
    color: 'text-teal-600',
    description: 'Entregado al cliente'
  },
  { 
    value: 'PARTIALLY_DELIVERED', 
    label: 'Entrega Parcial', 
    icon: AlertCircle, 
    color: 'text-orange-600',
    description: 'Entrega parcial del pedido'
  },
  { 
    value: 'COMPLETED', 
    label: 'Completada', 
    icon: CheckCircle, 
    color: 'text-green-600',
    description: 'Orden finalizada exitosamente'
  },
  { 
    value: 'CANCELED', 
    label: 'Cancelada', 
    icon: XCircle, 
    color: 'text-red-600',
    description: 'Orden cancelada'
  },
  { 
    value: 'PAYMENT_PENDING', 
    label: 'Pago Pendiente', 
    icon: DollarSign, 
    color: 'text-amber-600',
    description: 'Esperando confirmación de pago'
  },
  { 
    value: 'PAID', 
    label: 'Pagado', 
    icon: DollarSign, 
    color: 'text-emerald-600',
    description: 'Pago confirmado'
  },
]

export default function OrderStatusChanger({ 
  orderId, 
  currentStatus, 
  onStatusChange,
  disabled = false,
  userRole
}: OrderStatusChangerProps) {
  const [isChanging, setIsChanging] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [showNotesModal, setShowNotesModal] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | null>(null)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Filtrar estados disponibles según el rol del usuario
  const getAvailableStatuses = () => {
    if (userRole === 'seller') {
      // Vendedor solo puede cambiar a: Confirmada, En Entrega, Completada
      return statusOptions.filter(opt => 
        opt.value === 'CONFIRMED' || 
        opt.value === 'IN_DELIVERY' || 
        opt.value === 'COMPLETED'
      )
    }
    // Admin o sin rol específico: todos los estados
    return statusOptions
  }

  const availableStatuses = getAvailableStatuses()
  const currentOption = statusOptions.find(opt => opt.value === currentStatus)
  const CurrentIcon = currentOption?.icon || Clock

  const handleStatusSelect = (newStatus: OrderStatus) => {
    if (newStatus === currentStatus) {
      setShowDropdown(false)
      return
    }

    setError(null)
    setSelectedStatus(newStatus)
    setShowDropdown(false)
    setShowNotesModal(true)
  }

  const handleConfirmChange = async () => {
    if (!selectedStatus) return

    try {
      setIsChanging(true)
      setError(null)

      if (onStatusChange) {
        await onStatusChange(selectedStatus, notes || undefined)
      } else {
        const response = await fetch(`/api/orders/${orderId}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: selectedStatus,
            notes: notes || undefined,
          }),
        })

        const data = await response.json()

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Error al cambiar el estado')
        }

        window.location.reload()
      }

      setShowNotesModal(false)
      setNotes('')
      setSelectedStatus(null)
    } catch (error) {
      console.error('Error cambiando estado:', error)
      setError(error instanceof Error ? error.message : 'Error al cambiar el estado')
    } finally {
      setIsChanging(false)
    }
  }

  const handleCancelChange = () => {
    setShowNotesModal(false)
    setNotes('')
    setSelectedStatus(null)
    setError(null)
  }

  const selectedOption = selectedStatus ? statusOptions.find(s => s.value === selectedStatus) : null

  return (
    <>
      <div className="relative">
        <Button
          variant="outline"
          onClick={() => setShowDropdown(!showDropdown)}
          disabled={isChanging || disabled}
          className="gap-2 min-w-[200px] justify-between"
        >
          <div className="flex items-center gap-2">
            {isChanging ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CurrentIcon className={`h-4 w-4 ${currentOption?.color}`} />
            )}
            <span>{currentOption?.label}</span>
          </div>
          <ChevronDown className={`h-4 w-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
        </Button>

        {showDropdown && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setShowDropdown(false)}
            />
            
            <div className="absolute top-full left-0 mt-2 w-72 bg-white border rounded-lg shadow-lg z-20 max-h-96 overflow-y-auto">
              <div className="p-2 border-b bg-gray-50">
                <p className="text-xs font-medium text-gray-600">
                  Estado Actual: {currentOption?.label}
                </p>
              </div>
              {availableStatuses.map((option) => {
                const OptionIcon = option.icon
                const isSelected = option.value === currentStatus
                const isFinalState = option.value === 'COMPLETED' || option.value === 'CANCELED'
                
                return (
                  <button
                    key={option.value}
                    onClick={() => handleStatusSelect(option.value)}
                    disabled={isChanging || isSelected}
                    className={`w-full flex flex-col gap-1 px-4 py-3 hover:bg-gray-50 transition-colors text-left ${
                      isSelected ? 'bg-blue-50 cursor-not-allowed' : ''
                    } ${isFinalState ? 'border-t' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <OptionIcon className={`h-4 w-4 ${option.color}`} />
                      <span className={`flex-1 text-sm ${isSelected ? 'font-semibold' : ''}`}>
                        {option.label}
                      </span>
                      {isSelected && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                          Actual
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 ml-7">
                      {option.description}
                    </p>
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>

      {showNotesModal && selectedOption && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2 rounded-lg bg-gray-100`}>
                {selectedOption.icon && (
                  <selectedOption.icon className={`h-5 w-5 ${selectedOption.color}`} />
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold">
                  Cambiar Estado
                </h3>
                <p className="text-sm text-gray-600">
                  {currentOption?.label}  {selectedOption.label}
                </p>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600 flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  {error}
                </p>
              </div>
            )}
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notas (opcional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej: Cliente confirmó por teléfono, entrega programada para mañana..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm"
                disabled={isChanging}
              />
              <div className="flex items-center gap-1 mt-2">
                <AlertCircle className="h-3 w-3 text-gray-400" />
                <p className="text-xs text-gray-500">
                  Las notas quedarán registradas en el historial de auditoría
                </p>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={handleCancelChange}
                disabled={isChanging}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmChange}
                disabled={isChanging}
                className="gap-2"
              >
                {isChanging ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cambiando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Confirmar Cambio
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
