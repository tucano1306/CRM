'use client'

import { useState } from 'react'
import { 
  Mail, 
  Phone, 
  MapPin, 
  Edit, 
  Trash2, 
  Calendar,
  DollarSign,
  ShoppingBag,
  User,
  Award,
  TrendingUp,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { formatPrice } from '@/lib/utils'

interface ClientStats {
  totalOrders: number
  totalSpent: number
}

interface ClientProfileCardProps {
  client: {
    id: string
    name: string
    email: string
    phone: string | null
    address: string
    zipCode: string | null
    clerkUserId: string
    createdAt: string
    stats?: ClientStats
  }
  onEdit: (client: any) => void
  onDelete: (id: string) => void
  onSelect?: (clientId: string) => void
  colorIndex: number
}

export default function ClientProfileCard({ client, onEdit, onDelete, onSelect, colorIndex }: ClientProfileCardProps) {
  // Si hay onSelect, el componente está en modo lista; si no, está en modo detalle
  const [expanded, setExpanded] = useState(!onSelect)

  const handleCardClick = () => {
    if (onSelect) {
      onSelect(client.id)
    } else {
      setExpanded(!expanded)
    }
  }

  const colors = [
    { 
      bg: 'from-purple-500 to-purple-700', 
      border: 'border-purple-300',
      stat: 'bg-purple-50 text-purple-700',
      badge: 'bg-purple-100 text-purple-800',
      icon: 'text-purple-600'
    },
    { 
      bg: 'from-blue-500 to-blue-700', 
      border: 'border-blue-300',
      stat: 'bg-blue-50 text-blue-700',
      badge: 'bg-blue-100 text-blue-800',
      icon: 'text-blue-600'
    },
    { 
      bg: 'from-green-500 to-green-700', 
      border: 'border-green-300',
      stat: 'bg-green-50 text-green-700',
      badge: 'bg-green-100 text-green-800',
      icon: 'text-green-600'
    },
    { 
      bg: 'from-orange-500 to-orange-700', 
      border: 'border-orange-300',
      stat: 'bg-orange-50 text-orange-700',
      badge: 'bg-orange-100 text-orange-800',
      icon: 'text-orange-600'
    },
    { 
      bg: 'from-pink-500 to-pink-700', 
      border: 'border-pink-300',
      stat: 'bg-pink-50 text-pink-700',
      badge: 'bg-pink-100 text-pink-800',
      icon: 'text-pink-600'
    },
    { 
      bg: 'from-indigo-500 to-indigo-700', 
      border: 'border-indigo-300',
      stat: 'bg-indigo-50 text-indigo-700',
      badge: 'bg-indigo-100 text-indigo-800',
      icon: 'text-indigo-600'
    },
  ]

  const colorScheme = colors[colorIndex % colors.length]

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getClientLevel = (totalSpent: number) => {
    if (totalSpent >= 1000) return { label: 'VIP', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' }
    if (totalSpent >= 500) return { label: 'Premium', color: 'bg-purple-100 text-purple-800 border-purple-300' }
    if (totalSpent >= 200) return { label: 'Regular', color: 'bg-blue-100 text-blue-800 border-blue-300' }
    return { label: 'Nuevo', color: 'bg-gray-100 text-gray-800 border-gray-300' }
  }

  const clientLevel = getClientLevel(client.stats?.totalSpent || 0)

  return (
    <div 
      className={`relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border-2 ${colorScheme.border} cursor-pointer`}
      style={{ 
        animation: `fadeInUp 0.5s ease-out ${colorIndex * 0.05}s both`,
      }}
      onClick={handleCardClick}
    >
      {/* Header con gradiente */}
      <div className={`bg-gradient-to-r ${colorScheme.bg} p-6 relative`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center ring-4 ring-white/30">
              <User className="w-8 h-8 text-white" />
            </div>
            
            {/* Nombre y nivel */}
            <div>
              <h3 className="text-xl font-bold text-white mb-1">
                {client.name}
              </h3>
              <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border-2 ${clientLevel.color}`}>
                <Award className="w-3 h-3" />
                {clientLevel.label}
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => onEdit(client)}
              className="p-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg transition-colors"
              title="Editar cliente"
            >
              <Edit className="w-4 h-4 text-white" />
            </button>
            <button
              onClick={() => onDelete(client.id)}
              className="p-2 bg-white/20 hover:bg-red-500/50 backdrop-blur-sm rounded-lg transition-colors"
              title="Eliminar cliente"
            >
              <Trash2 className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50">
        <div className={`${colorScheme.stat} rounded-xl p-4 text-center`}>
          <ShoppingBag className={`w-5 h-5 mx-auto mb-2 ${colorScheme.icon}`} />
          <p className="text-2xl font-bold">{client.stats?.totalOrders || 0}</p>
          <p className="text-xs font-medium opacity-75">Órdenes</p>
        </div>
        <div className={`${colorScheme.stat} rounded-xl p-4 text-center`}>
          <DollarSign className={`w-5 h-5 mx-auto mb-2 ${colorScheme.icon}`} />
          <p className="text-2xl font-bold">{formatPrice(client.stats?.totalSpent || 0)}</p>
          <p className="text-xs font-medium opacity-75">Gastado</p>
        </div>
      </div>

      {/* Información de contacto */}
      <div className="p-6 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3">
          <Mail className={`w-5 h-5 mt-0.5 ${colorScheme.icon}`} />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 font-medium">Email</p>
            <a 
              href={`mailto:${client.email}`}
              className="text-sm text-gray-800 hover:text-blue-600 transition-colors truncate block"
            >
              {client.email}
            </a>
          </div>
        </div>

        {client.phone && (
          <div className="flex items-start gap-3">
            <Phone className={`w-5 h-5 mt-0.5 ${colorScheme.icon}`} />
            <div className="flex-1">
              <p className="text-xs text-gray-500 font-medium">Teléfono</p>
              <a 
                href={`tel:${client.phone}`}
                className="text-sm text-gray-800 hover:text-blue-600 transition-colors"
              >
                {client.phone}
              </a>
            </div>
          </div>
        )}

        <div className="flex items-start gap-3">
          <MapPin className={`w-5 h-5 mt-0.5 ${colorScheme.icon}`} />
          <div className="flex-1">
            <p className="text-xs text-gray-500 font-medium">Dirección</p>
            <p className="text-sm text-gray-800">
              {client.address}
              {client.zipCode && <span className="text-gray-600"> ({client.zipCode})</span>}
            </p>
          </div>
        </div>
      </div>

      {/* Botón de expandir/contraer */}
      <div className="border-t border-gray-100">
        <div className="w-full px-6 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
          <span className="text-sm font-medium text-gray-700">
            {expanded ? 'Ocultar detalles' : 'Ver más detalles'}
          </span>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          )}
        </div>

        {expanded && (
          <div className="px-6 pb-4 space-y-3 animate-fadeIn">
            <div className="flex items-center gap-3 text-sm">
              <Calendar className={`w-4 h-4 ${colorScheme.icon}`} />
              <div>
                <p className="text-xs text-gray-500">Cliente desde</p>
                <p className="text-gray-800 font-medium">{formatDate(client.createdAt)}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <User className={`w-4 h-4 ${colorScheme.icon}`} />
              <div>
                <p className="text-xs text-gray-500">ID de Usuario</p>
                <p className="text-gray-800 font-mono text-xs truncate">{client.clerkUserId}</p>
              </div>
            </div>

            {client.stats && client.stats.totalOrders > 0 && (
              <div className="flex items-center gap-3 text-sm">
                <TrendingUp className={`w-4 h-4 ${colorScheme.icon}`} />
                <div>
                  <p className="text-xs text-gray-500">Promedio por orden</p>
                  <p className="text-gray-800 font-bold">
                    {formatPrice(client.stats.totalSpent / client.stats.totalOrders)}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
