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
  ChevronDown
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
  onStatusChange: (newStatus: OrderStatus) => Promise<void>
}

const statusOptions: { value: OrderStatus; label: string; icon: any; color: string }[] = [
  { value: 'PENDING', label: 'Pendiente', icon: Clock, color: 'text-yellow-600' },
  { value: 'CONFIRMED', label: 'Confirmada', icon: CheckCircle, color: 'text-blue-600' },
  { value: 'PREPARING', label: 'Preparando', icon: Package, color: 'text-indigo-600' },
  { value: 'READY_FOR_PICKUP', label: 'Listo para Recoger', icon: CheckCircle, color: 'text-cyan-600' },
  { value: 'IN_DELIVERY', label: 'En Entrega', icon: Package, color: 'text-purple-600' },
  { value: 'DELIVERED', label: 'Entregado', icon: CheckCircle, color: 'text-teal-600' },
  { value: 'PARTIALLY_DELIVERED', label: 'Entrega Parcial', icon: AlertCircle, color: 'text-orange-600' },
  { value: 'COMPLETED', label: 'Completada', icon: CheckCircle, color: 'text-green-600' },
  { value: 'CANCELED', label: 'Cancelada', icon: XCircle, color: 'text-red-600' },
  { value: 'PAYMENT_PENDING', label: 'Pago Pendiente', icon: DollarSign, color: 'text-amber-600' },
  { value: 'PAID', label: 'Pagado', icon: DollarSign, color: 'text-emerald-600' },
]

export default function OrderStatusChanger({ 
  orderId, 
  currentStatus, 
  onStatusChange 
}: OrderStatusChangerProps) {
  const [isChanging, setIsChanging] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)

  const currentOption = statusOptions.find(opt => opt.value === currentStatus)
  const CurrentIcon = currentOption?.icon || Clock

  const handleStatusChange = async (newStatus: OrderStatus) => {
    if (newStatus === currentStatus) {
      setShowDropdown(false)
      return
    }

    try {
      setIsChanging(true)
      await onStatusChange(newStatus)
      setShowDropdown(false)
    } catch (error) {
      console.error('Error cambiando estado:', error)
      alert('Error al cambiar el estado')
    } finally {
      setIsChanging(false)
    }
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={() => setShowDropdown(!showDropdown)}
        disabled={isChanging}
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
        <ChevronDown className="h-4 w-4" />
      </Button>

      {showDropdown && (
        <>
          {/* Overlay para cerrar al hacer click fuera */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setShowDropdown(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute top-full left-0 mt-2 w-full bg-white border rounded-lg shadow-lg z-20 max-h-80 overflow-y-auto">
            {statusOptions.map((option) => {
              const OptionIcon = option.icon
              const isSelected = option.value === currentStatus
              
              return (
                <button
                  key={option.value}
                  onClick={() => handleStatusChange(option.value)}
                  disabled={isChanging}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left ${
                    isSelected ? 'bg-blue-50' : ''
                  }`}
                >
                  <OptionIcon className={`h-4 w-4 ${option.color}`} />
                  <span className={`flex-1 ${isSelected ? 'font-semibold' : ''}`}>
                    {option.label}
                  </span>
                  {isSelected && (
                    <CheckCircle className="h-4 w-4 text-blue-600" />
                  )}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
