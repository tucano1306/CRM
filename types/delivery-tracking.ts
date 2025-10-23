// types/delivery-tracking.ts
// Tipos para el sistema de tracking de entregas

export enum DeliveryTrackingStatus {
  PENDING = 'PENDING',
  ASSIGNED = 'ASSIGNED',
  PICKED_UP = 'PICKED_UP',
  IN_TRANSIT = 'IN_TRANSIT',
  NEARBY = 'NEARBY',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
}

export interface DeliveryLocation {
  latitude: number
  longitude: number
  timestamp: Date
}

export interface DeliveryLocationWithMetadata extends DeliveryLocation {
  speed?: number // km/h
  heading?: number // 0-360 grados
}

export interface DeliveryTracking {
  id: string
  orderId: string
  
  // Conductor
  driverName?: string
  driverPhone?: string
  
  // Timing
  estimatedDeliveryTime?: Date
  actualDeliveryTime?: Date
  departureTime?: Date
  
  // Ubicación actual
  currentLatitude?: number
  currentLongitude?: number
  lastLocationUpdate?: Date
  
  // Dirección (solo para vendedores)
  deliveryAddress?: string
  deliveryCity?: string
  deliveryState?: string
  deliveryZipCode?: string
  deliveryCoordinates?: string // "lat,lng"
  
  // Estado
  status: DeliveryTrackingStatus
  
  createdAt: Date
  updatedAt: Date
}

export interface DeliveryLocationHistory {
  id: string
  trackingId: string
  latitude: number
  longitude: number
  timestamp: Date
  speed?: number
  heading?: number
}

export interface DeliveryTrackingWithHistory extends DeliveryTracking {
  locationHistory: DeliveryLocationHistory[]
}

// Para uso en la UI
export interface TrackingMapMarker {
  position: {
    lat: number
    lng: number
  }
  icon: 'truck' | 'home' | 'warehouse' | 'destination'
  label?: string
}

export interface TrackingRoute {
  points: Array<{
    lat: number
    lng: number
    timestamp: Date
  }>
  distance?: number // en km
  duration?: number // en minutos
}

// Request/Response types para la API
export interface CreateTrackingRequest {
  orderId: string
  deliveryAddress: string
  deliveryCity?: string
  deliveryState?: string
  deliveryZipCode?: string
  estimatedDeliveryTime?: Date
}

export interface UpdateLocationRequest {
  latitude: number
  longitude: number
  speed?: number
  heading?: number
}

export interface AssignDriverRequest {
  driverName: string
  driverPhone: string
}

export interface TrackingResponse {
  success: boolean
  tracking?: DeliveryTracking
  error?: string
}

export interface TrackingRouteResponse {
  success: boolean
  route?: DeliveryLocationHistory[]
  totalDistance?: number
  totalDuration?: number
  error?: string
}

// Para compradores (con información limitada)
export interface BuyerTrackingView {
  id: string
  orderId: string
  status: DeliveryTrackingStatus
  driverName?: string
  currentLocation?: {
    lat: number
    lng: number
  }
  estimatedDeliveryTime?: Date
  lastUpdate?: Date
  deliveryCity?: string // Solo ciudad, no dirección completa
}

// Para vendedores (información completa)
export interface SellerTrackingView extends BuyerTrackingView {
  driverPhone?: string
  deliveryAddress?: string
  deliveryCoordinates?: string
  locationHistory: DeliveryLocationHistory[]
}
