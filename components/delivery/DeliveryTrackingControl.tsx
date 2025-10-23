'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Save, 
  Truck, 
  User, 
  Phone, 
  Clock, 
  MapPin,
  Navigation,
  Loader2
} from 'lucide-react'

type DeliveryStatus = 
  | 'PENDING'
  | 'ASSIGNED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'NEARBY'
  | 'DELIVERED'
  | 'FAILED'

interface DeliveryTrackingControlProps {
  orderId: string
  currentTracking?: any
  onUpdate: () => void
}

export default function DeliveryTrackingControl({ 
  orderId, 
  currentTracking,
  onUpdate 
}: DeliveryTrackingControlProps) {
  const [formData, setFormData] = useState({
    driverName: currentTracking?.driverName || '',
    driverPhone: currentTracking?.driverPhone || '',
    estimatedDeliveryTime: currentTracking?.estimatedDeliveryTime 
      ? new Date(currentTracking.estimatedDeliveryTime).toISOString().slice(0, 16)
      : '',
    status: currentTracking?.status || 'PENDING',
    deliveryAddress: currentTracking?.deliveryAddress || '',
    deliveryCity: currentTracking?.deliveryCity || '',
    deliveryState: currentTracking?.deliveryState || '',
    deliveryZipCode: currentTracking?.deliveryZipCode || ''
  })

  const [isSaving, setIsSaving] = useState(false)

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)

      const response = await fetch(`/api/delivery/tracking/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          estimatedDeliveryTime: formData.estimatedDeliveryTime 
            ? new Date(formData.estimatedDeliveryTime).toISOString()
            : null
        })
      })

      const result = await response.json()

      if (result.success) {
        alert('Tracking actualizado correctamente')
        onUpdate()
      } else {
        alert(result.error || 'Error al actualizar')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error de conexión')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Truck className="h-5 w-5 text-purple-600" />
              Control de Entrega
            </h3>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Guardar Cambios
                </>
              )}
            </Button>
          </div>

          {/* Estado de la entrega */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estado de Entrega
            </label>
            <select
              value={formData.status}
              onChange={(e) => handleChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="PENDING">Pendiente</option>
              <option value="ASSIGNED">Conductor Asignado</option>
              <option value="PICKED_UP">Recogido</option>
              <option value="IN_TRANSIT">En Camino</option>
              <option value="NEARBY">Cerca</option>
              <option value="DELIVERED">Entregado</option>
              <option value="FAILED">Fallido</option>
            </select>
          </div>

          {/* Información del conductor */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
            <h4 className="font-semibold text-blue-900 flex items-center gap-2">
              <User className="h-5 w-5" />
              Información del Conductor
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del Conductor
                </label>
                <input
                  type="text"
                  value={formData.driverName}
                  onChange={(e) => handleChange('driverName', e.target.value)}
                  placeholder="Juan Pérez"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Phone className="h-4 w-4 inline mr-1" />
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={formData.driverPhone}
                  onChange={(e) => handleChange('driverPhone', e.target.value)}
                  placeholder="(305) 555-0123"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Tiempo estimado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Clock className="h-4 w-4 inline mr-1" />
              Hora Estimada de Entrega
            </label>
            <input
              type="datetime-local"
              value={formData.estimatedDeliveryTime}
              onChange={(e) => handleChange('estimatedDeliveryTime', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Dirección de entrega */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-4">
            <h4 className="font-semibold text-purple-900 flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Dirección de Entrega
            </h4>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dirección Completa
                </label>
                <input
                  type="text"
                  value={formData.deliveryAddress}
                  onChange={(e) => handleChange('deliveryAddress', e.target.value)}
                  placeholder="123 Main Street"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ciudad
                  </label>
                  <input
                    type="text"
                    value={formData.deliveryCity}
                    onChange={(e) => handleChange('deliveryCity', e.target.value)}
                    placeholder="Miami"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estado
                  </label>
                  <input
                    type="text"
                    value={formData.deliveryState}
                    onChange={(e) => handleChange('deliveryState', e.target.value)}
                    placeholder="FL"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Código Postal
                  </label>
                  <input
                    type="text"
                    value={formData.deliveryZipCode}
                    onChange={(e) => handleChange('deliveryZipCode', e.target.value)}
                    placeholder="33139"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Help text */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="text-xs text-gray-600">
              <strong>💡 Nota:</strong> La ubicación GPS en tiempo real se actualiza automáticamente desde la aplicación móvil del conductor. 
              Aquí puedes gestionar el estado, conductor y dirección de entrega.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
