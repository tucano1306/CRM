'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Store, ShoppingCart, ArrowRight, AlertCircle, Loader2, Lock } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { apiCall } from '@/lib/api-client'

type UserRoles = {
  exists: boolean
  isSeller: boolean
  isClient: boolean
  roles: string[]
  needsRegistration: boolean
  roleConflict?: {
    type: string
    currentRole: string
    blockedRole: string
    message: string
  } | null
  userData?: {
    name: string
    email: string
    roleInDB: string
  }
}

// ============ Helper Components ============

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="text-center">
        <Loader2 className="animate-spin h-12 w-12 text-purple-600 mx-auto mb-4" />
        <p className="text-gray-600">Verificando permisos...</p>
      </div>
    </div>
  )
}

function ErrorScreen({ error, onRetry }: { readonly error: string | null; readonly onRetry: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="text-red-600 flex items-center gap-2">
            <AlertCircle className="w-6 h-6" />
            Error de verificación
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 mb-4">
            {error || 'No se pudieron verificar tus permisos'}
          </p>
          <Button onClick={onRetry} className="w-full">
            Reintentar
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function RegistrationNeededScreen({ roles }: { readonly roles: UserRoles }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="text-orange-600 flex items-center gap-2">
            <AlertCircle className="w-6 h-6" />
            Cuenta no configurada
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 mb-4">
            Tu cuenta existe pero no está configurada como vendedor ni comprador.
            Por favor contacta al administrador para completar tu registro.
          </p>
          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
            <p><strong>Email:</strong> {roles.userData?.email}</p>
            <p><strong>Nombre:</strong> {roles.userData?.name}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function RoleConflictBanner({ roleConflict }: { readonly roleConflict: NonNullable<UserRoles['roleConflict']> }) {
  const roleLabel = roleConflict.currentRole === 'SELLER' ? '🏪 Vendedor' : '🛒 Comprador'
  
  return (
    <div className="mb-8 mx-auto max-w-2xl">
      <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-5 flex items-start gap-4 shadow-md">
        <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
          <Lock className="w-6 h-6 text-orange-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-orange-900 text-lg mb-2">
            ⚠️ Cuenta con rol asignado
          </h3>
          <p className="text-orange-800 mb-3">{roleConflict.message}</p>
          <div className="bg-orange-100 rounded p-3 text-sm">
            <p className="text-orange-900">
              <strong>Tu rol actual:</strong> {roleLabel}
            </p>
            <p className="text-orange-700 mt-1">
              Solo puedes acceder con las opciones disponibles para tu rol.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function ErrorBanner({ error }: { readonly error: string }) {
  const getErrorTitle = () => {
    if (error === 'not_seller') return 'No tienes permisos de vendedor'
    if (error === 'not_buyer') return 'No tienes permisos de comprador'
    return 'Acceso no autorizado'
  }

  const getErrorMessage = () => {
    if (error === 'not_seller') return 'Tu cuenta está registrada como comprador. Selecciona la opción de comprador para continuar.'
    if (error === 'not_buyer') return 'Tu cuenta está registrada como vendedor. Selecciona la opción de vendedor para continuar.'
    return 'Por favor, selecciona el tipo de acceso que corresponde a tu cuenta.'
  }

  return (
    <div className="mb-8 mx-auto max-w-2xl">
      <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-red-900 mb-1">{getErrorTitle()}</h3>
          <p className="text-sm text-red-700">{getErrorMessage()}</p>
        </div>
      </div>
    </div>
  )
}

interface RoleCardProps {
  readonly isEnabled: boolean
  readonly roleConflict?: UserRoles['roleConflict']
  readonly blockedRole: 'SELLER' | 'CLIENT'
  readonly href: string
  readonly icon: React.ReactNode
  readonly iconBgClass: string
  readonly title: string
  readonly description: string
  readonly features: string[]
  readonly buttonText: string
  readonly buttonClass: string
  readonly checkColor: string
}

// ============ Role Card Helper Functions ============

const ROLE_LABELS: Record<'SELLER' | 'CLIENT', { current: string; target: string; lower: string; display: string }> = {
  SELLER: { current: 'Comprador', target: 'Vendedor', lower: 'vendedor', display: 'Vendedor' },
  CLIENT: { current: 'Vendedor', target: 'Comprador', lower: 'comprador', display: 'Comprador' }
}

function getBlockedCardStyles(isBlocked: boolean) {
  return {
    card: isBlocked ? 'border-orange-300 bg-orange-50/30' : 'border-gray-300',
    iconBg: isBlocked ? 'bg-orange-100' : 'bg-gray-100',
    iconColor: isBlocked ? 'text-orange-500' : 'text-gray-400',
    titleColor: isBlocked ? 'text-orange-600' : 'text-gray-500',
    descColor: isBlocked ? 'text-orange-500' : 'text-gray-500',
    contentBg: isBlocked ? 'bg-orange-50 border border-orange-200' : 'bg-gray-50',
    textColor: isBlocked ? 'text-orange-700 font-medium' : 'text-gray-600'
  }
}

function getBlockedMessage(blockedRole: 'SELLER' | 'CLIENT', isBlocked: boolean): string {
  const labels = ROLE_LABELS[blockedRole]
  return isBlocked
    ? `Tu cuenta ya está registrada como ${labels.current}. No puedes acceder como ${labels.target}.`
    : `No tienes permisos de ${labels.lower}`
}

function EnabledRoleCard({ href, iconBgClass, icon, title, description, features, buttonText, buttonClass, checkColor }: Omit<RoleCardProps, 'isEnabled' | 'roleConflict' | 'blockedRole'>) {
  return (
    <Link href={href} className="transform transition-transform hover:scale-105">
      <Card className={`h-full cursor-pointer border-2 border-transparent hover:border-${checkColor}-500 hover:shadow-2xl`}>
        <CardHeader className="text-center pb-4">
          <div className={`mx-auto mb-4 w-20 h-20 ${iconBgClass} rounded-full flex items-center justify-center`}>
            {icon}
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">{title}</CardTitle>
          <CardDescription className="text-base text-gray-600">{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ul className="space-y-2 text-gray-700">
            {features.map((feature, idx) => (
              <li key={`feature-${idx}`} className="flex items-start">
                <span className={`text-${checkColor}-500 mr-2`}>✓</span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
          <div className="pt-4">
            <Button className={`w-full ${buttonClass}`}>
              {buttonText}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function DisabledRoleCard({ blockedRole, isBlocked }: { readonly blockedRole: 'SELLER' | 'CLIENT'; readonly isBlocked: boolean }) {
  const styles = getBlockedCardStyles(isBlocked)
  const blockedLabel = isBlocked ? '🔒 Bloqueado' : 'No disponible'
  const blockedMessage = getBlockedMessage(blockedRole, isBlocked)
  const displayTitle = ROLE_LABELS[blockedRole].display

  return (
    <Card className={`h-full cursor-not-allowed border-2 ${styles.card} opacity-50`}>
      <CardHeader className="text-center pb-4">
        <div className={`mx-auto mb-4 w-20 h-20 ${styles.iconBg} rounded-full flex items-center justify-center`}>
          <Lock className={`w-10 h-10 ${styles.iconColor}`} />
        </div>
        <CardTitle className={`text-2xl font-bold ${styles.titleColor}`}>{displayTitle}</CardTitle>
        <CardDescription className={`text-base ${styles.descColor}`}>{blockedLabel}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className={`${styles.contentBg} p-4 rounded-lg text-center`}>
          <p className={`text-sm ${styles.textColor}`}>{blockedMessage}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function RoleCard(props: RoleCardProps) {
  const { isEnabled, roleConflict, blockedRole, ...enabledProps } = props
  const isBlocked = roleConflict?.blockedRole === blockedRole

  if (isEnabled) {
    return <EnabledRoleCard {...enabledProps} />
  }

  return <DisabledRoleCard blockedRole={blockedRole} isBlocked={isBlocked} />
}

// Helper data for role features
const SELLER_FEATURES = [
  'Administra productos y catálogo',
  'Gestiona clientes y pedidos',
  'Revisa y confirma órdenes',
  'Reportes y estadísticas'
]

const BUYER_FEATURES = [
  'Explora productos disponibles',
  'Realiza pedidos en línea',
  'Seguimiento de tus órdenes',
  'Historial de compras'
]

function FooterInfo({ roles }: { readonly roles: UserRoles }) {
  const availableRoles = roles.roles.join(', ') || 'Ninguno'
  const hasRoleConflict = Boolean(roles.roleConflict)
  
  return (
    <div className="mt-12 text-center">
      <p className="text-sm text-gray-600 mb-2">
        Accediendo como: <strong>{roles.userData?.name}</strong> ({roles.userData?.email})
      </p>
      <p className="text-xs text-gray-400">
        Roles disponibles: {availableRoles}
      </p>
      {hasRoleConflict && (
        <p className="text-xs text-orange-500 mt-1">
          ⚠️ Tu cuenta tiene restricción de rol único
        </p>
      )}
      <p className="text-xs text-gray-400 mt-2">
        Versión de prueba - Deployment en Vercel
      </p>
    </div>
  )
}

// ============ Main Content Component ============

function SelectModeContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const [loading, setLoading] = useState(true)
  const [roles, setRoles] = useState<UserRoles | null>(null)
  const [checkError, setCheckError] = useState<string | null>(null)

  useEffect(() => {
    const checkRoles = async () => {
      try {
        const result = await apiCall('/api/auth/check-roles')
        
        if (result.success && result.data) {
          setRoles(result.data)
        } else {
          setCheckError('No se pudo verificar tus permisos')
        }
      } catch (err) {
        console.error('Error checking roles:', err)
        setCheckError('Error al verificar permisos')
      } finally {
        setLoading(false)
      }
    }

    checkRoles()
  }, [])

  if (loading) {
    return <LoadingScreen />
  }

  if (checkError || !roles) {
    return <ErrorScreen error={checkError} onRetry={() => globalThis.location.reload()} />
  }

  if (roles.needsRegistration) {
    return <RegistrationNeededScreen roles={roles} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">Bargain CRM</h1>
          <p className="text-xl text-gray-600">Sistema de gestión de pedidos de comida</p>
          <p className="text-md text-gray-500 mt-2">Selecciona tu tipo de acceso</p>
        </div>

        {roles.roleConflict && <RoleConflictBanner roleConflict={roles.roleConflict} />}
        {error && <ErrorBanner error={error} />}

        {/* Role Selection Cards */}
        <div className="grid md:grid-cols-2 gap-8">
          <RoleCard
            isEnabled={roles.isSeller}
            roleConflict={roles.roleConflict}
            blockedRole="SELLER"
            href="/?mode=seller"
            icon={<Store className="w-10 h-10 text-violet-600" />}
            iconBgClass="bg-violet-100"
            title="Soy Vendedor"
            description="Gestiona tu negocio y ventas"
            features={SELLER_FEATURES}
            buttonText="Acceder como Vendedor"
            buttonClass="bg-violet-600 hover:bg-violet-700 text-white"
            checkColor="violet"
          />

          <RoleCard
            isEnabled={roles.isClient}
            roleConflict={roles.roleConflict}
            blockedRole="CLIENT"
            href="/?mode=buyer"
            icon={<ShoppingCart className="w-10 h-10 text-blue-600" />}
            iconBgClass="bg-blue-100"
            title="Soy Comprador"
            description="Realiza pedidos fácilmente"
            features={BUYER_FEATURES}
            buttonText="Acceder como Comprador"
            buttonClass="bg-blue-600 hover:bg-blue-700 text-white"
            checkColor="blue"
          />
        </div>

        <FooterInfo roles={roles} />
      </div>
    </div>
  )
}

export default function SelectModePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    }>
      <SelectModeContent />
    </Suspense>
  )
}

