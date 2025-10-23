'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface DeliveryMapProps {
  latitude: number
  longitude: number
  driverName?: string
  showRoute?: boolean
  routeHistory?: Array<{ latitude: number; longitude: number }>
}

export default function DeliveryMap({
  latitude,
  longitude,
  driverName = 'Conductor',
  showRoute = false,
  routeHistory = []
}: DeliveryMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const routeLineRef = useRef<L.Polyline | null>(null)

  useEffect(() => {
    if (!mapRef.current) return

    // Inicializar mapa solo una vez
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current).setView(
        [latitude, longitude],
        15
      )

      // Agregar capa de OpenStreetMap
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(mapInstanceRef.current)

      // Crear icono personalizado para el conductor
      const driverIcon = L.divIcon({
        html: `
          <div style="position: relative;">
            <div style="
              width: 40px;
              height: 40px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              border: 3px solid white;
              box-shadow: 0 4px 8px rgba(0,0,0,0.3);
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              <svg style="
                width: 20px;
                height: 20px;
                transform: rotate(45deg);
                fill: white;
              " viewBox="0 0 24 24">
                <path d="M18 18.5a1.5 1.5 0 0 1-1 1.5H7a1.5 1.5 0 0 1-1-1.5V8a1.5 1.5 0 0 1 1-1.5h10a1.5 1.5 0 0 1 1 1.5v10.5zM7 4a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7z"/>
              </svg>
            </div>
          </div>
        `,
        className: 'custom-driver-marker',
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [0, -40]
      })

      // Agregar marcador del conductor
      markerRef.current = L.marker([latitude, longitude], {
        icon: driverIcon
      })
        .addTo(mapInstanceRef.current)
        .bindPopup(`
          <div style="text-align: center; padding: 8px;">
            <strong style="color: #667eea; font-size: 14px;">🚚 ${driverName}</strong>
            <br/>
            <span style="color: #666; font-size: 12px;">En camino a tu ubicación</span>
          </div>
        `)
        .openPopup()
    }

    // Actualizar posición del marcador
    if (markerRef.current) {
      markerRef.current.setLatLng([latitude, longitude])
      mapInstanceRef.current?.setView([latitude, longitude], 15, {
        animate: true,
        duration: 1
      })
    }

    // Actualizar ruta si existe historial
    if (showRoute && routeHistory.length > 0) {
      const routeCoordinates: L.LatLngExpression[] = routeHistory.map(point => [
        point.latitude,
        point.longitude
      ])

      // Agregar posición actual
      routeCoordinates.push([latitude, longitude])

      // Remover ruta anterior
      if (routeLineRef.current) {
        routeLineRef.current.remove()
      }

      // Dibujar nueva ruta
      routeLineRef.current = L.polyline(routeCoordinates, {
        color: '#667eea',
        weight: 4,
        opacity: 0.7,
        smoothFactor: 1,
        dashArray: '10, 10',
        dashOffset: '0'
      }).addTo(mapInstanceRef.current!)

      // Animar el dash array
      let offset = 0
      const animateDash = () => {
        offset = (offset + 1) % 20
        if (routeLineRef.current) {
          routeLineRef.current.setStyle({ dashOffset: offset.toString() })
        }
        requestAnimationFrame(animateDash)
      }
      animateDash()

      // Ajustar vista para mostrar toda la ruta
      mapInstanceRef.current?.fitBounds(routeLineRef.current.getBounds(), {
        padding: [50, 50]
      })
    }

    // Cleanup
    return () => {
      // No destruir el mapa en cleanup, solo en unmount final
    }
  }, [latitude, longitude, driverName, showRoute, routeHistory])

  // Cleanup final cuando el componente se desmonta
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  return (
    <div className="relative w-full h-full min-h-[400px] rounded-lg overflow-hidden border-2 border-purple-200">
      <div ref={mapRef} className="w-full h-full" />
      
      {/* Badge de actualización en vivo */}
      <div className="absolute top-4 right-4 z-[1000]">
        <div className="bg-white px-3 py-2 rounded-full shadow-lg flex items-center gap-2 border border-purple-200">
          <div className="relative">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <div className="absolute inset-0 w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
          </div>
          <span className="text-xs font-semibold text-gray-700">En vivo</span>
        </div>
      </div>

      {/* Controles de zoom personalizados */}
      <style jsx global>{`
        .custom-driver-marker {
          background: transparent;
          border: none;
        }
        
        .leaflet-container {
          font-family: inherit;
        }

        .leaflet-popup-content-wrapper {
          border-radius: 12px;
          box-shadow: 0 8px 16px rgba(0,0,0,0.15);
        }

        .leaflet-popup-tip {
          box-shadow: 0 4px 8px rgba(0,0,0,0.15);
        }

        .leaflet-control-zoom {
          border: 2px solid #e5e7eb !important;
          border-radius: 8px !important;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1) !important;
        }

        .leaflet-control-zoom a {
          width: 36px !important;
          height: 36px !important;
          line-height: 36px !important;
          font-size: 20px !important;
          border: none !important;
          color: #667eea !important;
        }

        .leaflet-control-zoom a:hover {
          background: #f3f4f6 !important;
          color: #764ba2 !important;
        }
      `}</style>
    </div>
  )
}
