'use client'

import { UserCog, Loader2, ArrowRight, RefreshCw } from 'lucide-react'
import { useRoleSwitch } from '@/hooks/useRoleSwitch'

export default function RoleSwitcher() {
  const { currentRole, switching, error, switchRole, switchRoleWithReauth, clearError } = useRoleSwitch()

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="bg-white rounded-xl shadow-2xl border-2 border-purple-200 p-4 min-w-[280px]">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-200">
          <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-2 rounded-lg">
            <UserCog className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">Cambiar Vista</h3>
            <p className="text-xs text-gray-500">Rol actual: <span className="font-semibold text-purple-600">{currentRole}</span></p>
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
                ? 'bg-purple-100 text-purple-600 cursor-default'
                : 'bg-gradient-to-r from-purple-50 to-indigo-50 text-purple-700 hover:from-purple-100 hover:to-indigo-100 border border-purple-200'
            }`}
          >
            <span>🛒 Vista Comprador</span>
            {switching && currentRole !== 'CLIENT' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : currentRole === 'CLIENT' ? (
              <span className="text-xs">Activo</span>
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
          </button>

          <button
            onClick={() => switchRole('SELLER')}
            disabled={switching || currentRole === 'SELLER'}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
              currentRole === 'SELLER'
                ? 'bg-blue-100 text-blue-600 cursor-default'
                : 'bg-gradient-to-r from-blue-50 to-cyan-50 text-blue-700 hover:from-blue-100 hover:to-cyan-100 border border-blue-200'
            }`}
          >
            <span>📊 Vista Vendedor</span>
            {switching && currentRole !== 'SELLER' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : currentRole === 'SELLER' ? (
              <span className="text-xs">Activo</span>
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
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
            className="w-full flex items-center justify-center gap-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 py-1 px-2 rounded transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Cambiar con re-login (más seguro)</span>
          </button>
        </div>
      </div>
    </div>
  )
}
