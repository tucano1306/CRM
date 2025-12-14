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
  Award,
  TrendingUp,
  ChevronDown,
  Package,
  Sparkles,
  ExternalLink
} from 'lucide-react'
import { formatPrice } from '@/lib/utils'

interface ClientStats {
  totalOrders: number
  totalSpent: number
}

interface ClientProfileCardProps {
  readonly client: {
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
  readonly onEdit: (client: any) => void
  readonly onDelete: (id: string) => void
  readonly onSelect?: (clientId: string) => void
  readonly onManageCatalog?: () => void
  readonly colorIndex: number
  readonly isExpanded?: boolean
}

export default function ClientProfileCard({ client, onEdit, onDelete, onSelect, onManageCatalog, colorIndex, isExpanded = false }: ClientProfileCardProps) {
  const [expanded, setExpanded] = useState(!onSelect || isExpanded)
  const [isHovered, setIsHovered] = useState(false)

  if (isExpanded && !expanded) {
    setExpanded(true)
  }

  const handleCardClick = () => {
    if (onSelect) {
      onSelect(client.id)
    } else {
      setExpanded(!expanded)
    }
  }

  const colors = [
    { 
      bg: 'from-violet-500 via-purple-500 to-fuchsia-500', 
      border: 'border-purple-200',
      light: 'bg-purple-50',
      accent: 'text-purple-600',
      button: 'from-purple-500 to-purple-600',
      glow: 'shadow-purple-200'
    },
    { 
      bg: 'from-blue-500 via-cyan-500 to-teal-500', 
      border: 'border-blue-200',
      light: 'bg-blue-50',
      accent: 'text-blue-600',
      button: 'from-blue-500 to-blue-600',
      glow: 'shadow-blue-200'
    },
    { 
      bg: 'from-emerald-500 via-green-500 to-lime-500', 
      border: 'border-green-200',
      light: 'bg-green-50',
      accent: 'text-green-600',
      button: 'from-green-500 to-green-600',
      glow: 'shadow-green-200'
    },
    { 
      bg: 'from-orange-500 via-amber-500 to-yellow-500', 
      border: 'border-orange-200',
      light: 'bg-orange-50',
      accent: 'text-orange-600',
      button: 'from-orange-500 to-orange-600',
      glow: 'shadow-orange-200'
    },
    { 
      bg: 'from-pink-500 via-rose-500 to-red-500', 
      border: 'border-pink-200',
      light: 'bg-pink-50',
      accent: 'text-pink-600',
      button: 'from-pink-500 to-pink-600',
      glow: 'shadow-pink-200'
    },
    { 
      bg: 'from-indigo-500 via-blue-500 to-violet-500', 
      border: 'border-indigo-200',
      light: 'bg-indigo-50',
      accent: 'text-indigo-600',
      button: 'from-indigo-500 to-indigo-600',
      glow: 'shadow-indigo-200'
    },
  ]

  const colorScheme = colors[colorIndex % colors.length]

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getClientLevel = (totalSpent: number) => {
    if (totalSpent >= 1000) return { label: '⭐ VIP', color: 'bg-gradient-to-r from-yellow-400 to-amber-500 text-white', emoji: '👑' }
    if (totalSpent >= 500) return { label: '💎 Premium', color: 'bg-gradient-to-r from-purple-400 to-pink-500 text-white', emoji: '💎' }
    if (totalSpent >= 200) return { label: '🌟 Regular', color: 'bg-gradient-to-r from-blue-400 to-cyan-500 text-white', emoji: '🌟' }
    return { label: '🌱 Nuevo', color: 'bg-gradient-to-r from-green-400 to-emerald-500 text-white', emoji: '🌱' }
  }

  const clientLevel = getClientLevel(client.stats?.totalSpent || 0)

  return (
    <div 
      className={`relative bg-white rounded-2xl sm:rounded-3xl overflow-hidden transition-all duration-500 w-full max-w-full ${
        isHovered ? 'shadow-2xl sm:scale-[1.02]' : 'shadow-lg'
      } ${colorScheme.glow}`}
      style={{ 
        animation: `fadeInUp 0.5s ease-out ${colorIndex * 0.05}s both`,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Decorative background pattern - pointer-events-none para no bloquear clicks */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-black to-transparent rounded-full -translate-y-20 translate-x-20" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-black to-transparent rounded-full translate-y-16 -translate-x-16" />
      </div>

      {/* Header con gradiente vibrante */}
      <div className={`bg-gradient-to-r ${colorScheme.bg} p-4 sm:p-6 relative overflow-hidden`}>
        {/* Animated sparkles - pointer-events-none */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <Sparkles className="absolute top-2 right-8 w-4 h-4 text-white/30 animate-pulse" />
          <Sparkles className="absolute bottom-3 right-16 w-3 h-3 text-white/20 animate-pulse delay-300" />
          <Sparkles className="absolute top-4 right-24 w-2 h-2 text-white/25 animate-pulse delay-500" />
        </div>

        <div className="flex items-center gap-4 relative z-10">
          {/* Avatar con animación */}
          <div className={`relative group flex-shrink-0 ${isExpanded ? 'w-16 h-16 sm:w-20 sm:h-20' : 'w-12 h-12 sm:w-16 sm:h-16'}`}>
            <div className={`absolute inset-0 bg-white/20 rounded-xl sm:rounded-2xl rotate-6 group-hover:rotate-12 transition-transform duration-300 pointer-events-none`} />
            <div className={`relative w-full h-full rounded-xl sm:rounded-2xl bg-white/30 backdrop-blur-sm flex items-center justify-center border-2 border-white/40`}>
              <span className="text-2xl sm:text-3xl">{clientLevel.emoji}</span>
            </div>
          </div>
          
          {/* Info del cliente */}
          <div className="flex-1 min-w-0 overflow-hidden">
            <h3 className={`${isExpanded ? 'text-xl sm:text-2xl' : 'text-base sm:text-xl'} font-black text-white mb-1 truncate drop-shadow-sm`}>
              {client.name}
            </h3>
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${clientLevel.color} shadow-lg`}>
              <Award className="w-3 h-3" />
              {clientLevel.label}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards - Diseño más visual */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 p-3 sm:p-4 -mt-4 relative z-10">
        <div className={`${colorScheme.light} rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center transform sm:hover:scale-105 transition-transform duration-200 border border-gray-100 shadow-sm`}>
          <div className={`w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-1 sm:mb-2 rounded-lg sm:rounded-xl bg-gradient-to-br ${colorScheme.button} flex items-center justify-center shadow-lg`}>
            <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <p className={`text-xl sm:text-3xl font-black ${colorScheme.accent}`}>
            {client.stats?.totalOrders || 0}
          </p>
          <p className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide">Órdenes</p>
        </div>
        
        <div className={`${colorScheme.light} rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center transform sm:hover:scale-105 transition-transform duration-200 border border-gray-100 shadow-sm`}>
          <div className={`w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-1 sm:mb-2 rounded-lg sm:rounded-xl bg-gradient-to-br ${colorScheme.button} flex items-center justify-center shadow-lg`}>
            <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <p className={`text-lg sm:text-2xl font-black ${colorScheme.accent} truncate`}>
            {formatPrice(client.stats?.totalSpent || 0)}
          </p>
          <p className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide">Gastado</p>
        </div>
      </div>

      {/* 🎯 BOTONES DE ACCIÓN - Más grandes y visibles */}
      <div className="px-3 sm:px-4 pb-3 sm:pb-4 relative z-10">
        <div className="grid grid-cols-2 gap-2">
          {/* Botón Catálogo */}
          {onManageCatalog && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                console.log('📦 Abriendo catálogo para:', client.name)
                onManageCatalog()
              }}
              className="flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 sm:py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm shadow-lg hover:shadow-xl sm:hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
            >
              <Package className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Catálogo</span>
              <span className="sm:hidden">Cat.</span>
            </button>
          )}
          
          {/* Botón Editar */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              console.log('✏️ Editando cliente:', client.name)
              onEdit(client)
            }}
            className="flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 sm:py-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm shadow-lg hover:shadow-xl sm:hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
          >
            <Edit className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Editar</span>
          </button>
          
          {/* Botón Eliminar */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              console.log('🗑️ Eliminando cliente:', client.name)
              onDelete(client.id)
            }}
            className="flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 sm:py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm shadow-lg hover:shadow-xl sm:hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
          >
            <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Eliminar</span>
            <span className="sm:hidden">Borrar</span>
          </button>
        </div>
      </div>

      {/* Información de contacto - Más compacta */}
      <div className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-2" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} role="button" tabIndex={0}>
        <div className="bg-gray-50 rounded-lg sm:rounded-xl p-2 sm:p-3 space-y-1 sm:space-y-2">
          {/* Email */}
          <a 
            href={`mailto:${client.email}`}
            className="flex items-center gap-2 sm:gap-3 hover:bg-white p-1.5 sm:p-2 rounded-lg transition-colors group"
          >
            <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg ${colorScheme.light} flex items-center justify-center flex-shrink-0`}>
              <Mail className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${colorScheme.accent}`} />
            </div>
            <span className="text-xs sm:text-sm text-gray-700 group-hover:text-blue-600 truncate flex-1">
              {client.email}
            </span>
            <ExternalLink className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
          </a>

          {/* Teléfono */}
          {client.phone && (
            <a 
              href={`tel:${client.phone}`}
              className="flex items-center gap-2 sm:gap-3 hover:bg-white p-1.5 sm:p-2 rounded-lg transition-colors group"
            >
              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg ${colorScheme.light} flex items-center justify-center flex-shrink-0`}>
                <Phone className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${colorScheme.accent}`} />
              </div>
              <span className="text-xs sm:text-sm text-gray-700 group-hover:text-blue-600">
                {client.phone}
              </span>
              <ExternalLink className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            </a>
          )}

          {/* Dirección */}
          <div className="flex items-center gap-2 sm:gap-3 p-1.5 sm:p-2">
            <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg ${colorScheme.light} flex items-center justify-center flex-shrink-0`}>
              <MapPin className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${colorScheme.accent}`} />
            </div>
            <span className="text-xs sm:text-sm text-gray-700 truncate">
              {client.address}
              {client.zipCode && <span className="text-gray-400"> ({client.zipCode})</span>}
            </span>
          </div>
        </div>
      </div>

      {/* Footer con info adicional */}
      <div className={`border-t border-gray-100 px-3 sm:px-4 py-2 sm:py-3 bg-gray-50/50 flex items-center justify-between`}>
        <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-gray-500">
          <Calendar className="w-3 h-3" />
          <span className="truncate">Desde {formatDate(client.createdAt)}</span>
        </div>
        
        {client.stats && client.stats.totalOrders > 0 && (
          <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-semibold text-gray-600">
            <TrendingUp className={`w-3 h-3 ${colorScheme.accent}`} />
            <span>~{formatPrice(client.stats.totalSpent / client.stats.totalOrders)}/orden</span>
          </div>
        )}
      </div>

      {/* Ver más (en modo lista) */}
      {!isExpanded && onSelect && (
        <div 
          className="border-t border-gray-100 px-4 py-2 flex items-center justify-center hover:bg-gray-50 transition-colors cursor-pointer"
          onClick={handleCardClick}
          onKeyDown={(e) => e.key === 'Enter' && handleCardClick()}
          role="button"
          tabIndex={0}
        >
          <span className="text-sm font-medium text-gray-500 flex items-center gap-1">
            Ver detalles
            <ChevronDown className="w-4 h-4" />
          </span>
        </div>
      )}

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
      `}</style>
    </div>
  )
}
