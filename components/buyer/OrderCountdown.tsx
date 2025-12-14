'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Clock, XCircle, AlertCircle } from 'lucide-react'

interface OrderCountdownProps {
  readonly orderId: string
  readonly deadline: string
  readonly onCancel: (orderId: string) => Promise<void>
  readonly onExpired?: () => void
}

export default function OrderCountdown({ 
  orderId, 
  deadline, 
  onCancel,
  onExpired 
}: OrderCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<string>('')
  const [expired, setExpired] = useState(false)
  const [canceling, setCanceling] = useState(false)

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime()
      const deadlineTime = new Date(deadline).getTime()
      const difference = deadlineTime - now

      if (difference <= 0) {
        setExpired(true)
        setTimeLeft('00:00')
        if (onExpired) onExpired()
        return
      }

      const minutes = Math.floor((difference / 1000 / 60) % 60)
      const seconds = Math.floor((difference / 1000) % 60)

      setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)
    }

    calculateTimeLeft()
    const interval = setInterval(calculateTimeLeft, 1000)

    return () => clearInterval(interval)
  }, [deadline, onExpired])

  const handleCancel = async () => {
    if (!confirm('¿Estás seguro de que deseas cancelar esta orden?')) return
    
    setCanceling(true)
    try {
      await onCancel(orderId)
    } catch (error) {
      console.error('Error cancelando:', error)
      alert('Error al cancelar la orden')
    } finally {
      setCanceling(false)
    }
  }

  if (expired) {
    return (
      <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
        <AlertCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-green-900">
            Orden confirmada automáticamente
          </p>
          <p className="text-xs text-green-700 mt-0.5">
            El tiempo para cancelar ha expirado
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border-2 border-yellow-300 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="bg-yellow-100 p-2 rounded-full">
          <Clock className="h-5 w-5 text-yellow-700 animate-pulse" />
        </div>
        <div>
          <p className="text-sm font-semibold text-yellow-900">
            Tiempo para cancelar:
          </p>
          <p className="text-3xl font-bold text-yellow-700 tabular-nums">
            {timeLeft}
          </p>
        </div>
      </div>
      <Button
        variant="destructive"
        size="sm"
        onClick={handleCancel}
        disabled={canceling}
        className="ml-4"
      >
        {canceling ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
            Cancelando...
          </>
        ) : (
          <>
            <XCircle className="h-4 w-4 mr-2" />
            Cancelar Orden
          </>
        )}
      </Button>
    </div>
  )
}
