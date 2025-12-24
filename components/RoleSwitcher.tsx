'use client'

import { UserCog, Loader2, ArrowRight, RefreshCw } from 'lucide-react'
import { useRoleSwitch } from '@/hooks/useRoleSwitch'

export default function RoleSwitcher() {
  const { currentRole, switching, error, switchRole, switchRoleWithReauth, clearError } = useRoleSwitch()

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="bg-white rounded-xl shadow-2xl border-2 border-pastel-blue/30 p-4 min-w-[280px]">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-200">
          <div className="bg-gradient-to-br from-pastel-blue to-pastel-beige p-2 rounded-lg">
            <UserCog className="h-4 w-4 text-gray-700" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">Cambiar Vista</h3>
            <p className="text-xs text-gray-500">Rol actual: <span className="font-semibold text-pastel-blue">{currentRole}</span></p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs text-red-600 mb-2">{error}</p>
            <button
              onClick={clearError}
              className="text-xs text-red-500 hover:text-red-700 underline"
            >
              Cerrar
            </button>
          </div>
        )}

        {/* Buttons */}
        <div className="space-y-2">
          <button
            onClick={() => switchRole('CLIENT')}
            disabled={switching || currentRole === 'CLIENT'}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
              currentRole === 'CLIENT'
                ? 'bg-pastel-blue/30 text-pastel-blue cursor-default'
                : 'bg-gradient-to-r from-pastel-blue/20 to-pastel-beige/20 text-gray-700 hover:from-pastel-blue/30 hover:to-pastel-beige/30 border border-pastel-blue/30'
            }`}
          >
            <span>🛒 Vista Comprador</span>
            {(() => {
              if (switching && currentRole !== 'CLIENT') return <Loader2 className="h-4 w-4 animate-spin" />
              if (currentRole === 'CLIENT') return <span className="text-xs">Activo</span>
              return <ArrowRight className="h-4 w-4" />
            })()}
          </button>

          <button
            onClick={() => switchRole('SELLER')}
            disabled={switching || currentRole === 'SELLER'}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
              currentRole === 'SELLER'
                ? 'bg-pastel-beige/30 text-pastel-blue cursor-default'
                : 'bg-gradient-to-r from-pastel-beige/20 to-pastel-sand/20 text-gray-700 hover:from-pastel-beige/30 hover:to-pastel-sand/30 border border-pastel-beige/30'
            }`}
          >
            <span>📊 Vista Vendedor</span>
            {(() => {
              if (switching && currentRole !== 'SELLER') return <Loader2 className="h-4 w-4 animate-spin" />
              if (currentRole === 'SELLER') return <span className="text-xs">Activo</span>
              return <ArrowRight className="h-4 w-4" />
            })()}
          </button>
        </div>

        {/* Info */}
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center mb-2">
            Cambiar entre vistas sin cerrar sesión
          </p>
          <button
            onClick={() => switchRoleWithReauth(currentRole === 'CLIENT' ? 'SELLER' : 'CLIENT')}
            disabled={switching}
            className="w-full flex items-center justify-center gap-1 text-xs text-pastel-blue hover:text-gray-700 hover:bg-pastel-blue/10 py-1 px-2 rounded transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Cambiar con re-login (más seguro)</span>
          </button>
        </div>
      </div>
    </div>
  )
}
