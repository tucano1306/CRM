'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useUser } from '@clerk/nextjs'
import MainLayout from '@/components/shared/MainLayout'
import PageHeader from '@/components/shared/PageHeader'
import { apiCall } from '@/lib/api-client'
import ClientProfileCard from '@/components/clients/ClientProfileCard'
import ManageCatalogModal from '@/components/clients/ManageCatalogModal'
import ConnectionRequestsPanel from '@/components/clients/ConnectionRequestsPanel'
import { formatPrice } from '@/lib/utils'
import { 
  Plus, 
  Clock, 
  AlertCircle,
  Search,
  X,
  Users,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Link2,
  Copy,
  CheckCircle,
  History,
  Download
} from 'lucide-react'
import { exportClientHistory } from '@/lib/excelExport'

interface ClientWithStats {
  id: string
  name: string
  email: string
  phone: string | null
  address: string
  zipCode: string | null
  clerkUserId: string
  createdAt: string
  stats?: {
    totalOrders: number
    totalSpent: number
  }
}

export default function ClientsPage() {
  const { user } = useUser()
  const sellerName = user?.fullName || user?.firstName || 'El vendedor'

  const [clients, setClients] = useState<ClientWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timedOut, setTimedOut] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [showInvitationModal, setShowInvitationModal] = useState(false)
  const [invitationLink, setInvitationLink] = useState<string | null>(null)
  const [generatingLink, setGeneratingLink] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [sendingInvitation, setSendingInvitation] = useState(false)
  const [invitationMethod, setInvitationMethod] = useState<'email' | 'whatsapp' | 'sms'>('email')
  const [invitationValue, setInvitationValue] = useState('')
  
  // Estados para modal de historial
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [historyClientId, setHistoryClientId] = useState<string | null>(null)
  const [historyClientName, setHistoryClientName] = useState<string>('')
  const [clientOrders, setClientOrders] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  
  // Estados para modal de catálogo
  const [showCatalogModal, setShowCatalogModal] = useState(false)
  const [catalogClientId, setCatalogClientId] = useState<string | null>(null)
  const [catalogClientName, setCatalogClientName] = useState<string>('')
  
  // 🐛 DEBUG: Monitorear estado del modal
  useEffect(() => {
    console.log('🔍 Estado modal:', { showInvitationModal, invitationLink, shouldShow: showInvitationModal && invitationLink })
  }, [showInvitationModal, invitationLink])
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    zipCode: '',
  })

  const fetchClients = useCallback(async () => {
    setLoading(true)
    setError(null)
    setTimedOut(false)

    const timeoutId = setTimeout(() => {
      setTimedOut(true)
    }, 5000)

    try {
      console.log('🔍 Llamando a /api/clients...')
      
      // Agregar parámetros de paginación requeridos por el endpoint
      const result = await apiCall('/api/clients?page=1&limit=100', {
        timeout: 10000,
      })

      console.log('📦 Respuesta completa del API:', result)
      console.log('✅ result.success:', result.success)
      console.log('📊 result.data:', result.data)
      console.log('📊 Tipo de result.data:', typeof result.data)
      console.log('📊 Es array?', Array.isArray(result.data))

      clearTimeout(timeoutId)

      if (result.success) {
        // Manejar diferentes estructuras de respuesta
        let clientsArray = []
        if (Array.isArray(result.data)) {
          // Caso 1: result.data es directamente un array
          clientsArray = result.data
        } else if (result.data?.data && Array.isArray(result.data.data)) {
          // Caso 2: result.data tiene una propiedad data que es array (con paginación)
          clientsArray = result.data.data
        } else if (result.data && typeof result.data === 'object') {
          // Caso 3: result.data es un objeto, intentar extraer array
          console.warn('⚠️ Estructura de respuesta inesperada:', result.data)
          clientsArray = []
        }
        
        console.log('✅ Clientes a guardar:', clientsArray)
        console.log('✅ Cantidad de clientes:', clientsArray.length)
        setClients(clientsArray)
      } else {
        console.error('❌ Error del API:', result.error)
        setError(result.error || 'Error al cargar clientes')
      }
    } catch (err) {
      console.error('❌ Error de conexión:', err)
      clearTimeout(timeoutId)
      setError('Error de conexión')
    } finally {
      setLoading(false)
      setTimedOut(false)
    }
  }, [])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  const startEdit = (client: ClientWithStats) => {
    setEditingId(client.id)
    setFormData({
      name: client.name,
      email: client.email,
      phone: client.phone || '',
      address: client.address,
      zipCode: client.zipCode || '',
    })
    setShowForm(true)
  }

  const cancelEdit = () => {
    setShowForm(false)
    setEditingId(null)
    setFormData({ name: '', email: '', phone: '', address: '', zipCode: '' })
  }

  const saveClient = async () => {
    const url = editingId ? `/api/clients/${editingId}` : '/api/clients'
    const method = editingId ? 'PUT' : 'POST'

    const result = await apiCall(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
      timeout: 5000,
    })

    if (result.success) {
      fetchClients()
      cancelEdit()
    } else {
      alert(result.error || 'Error al guardar cliente')
    }
  }

  const deleteClient = async (id: string) => {
    if (!confirm('¿Eliminar este cliente?')) return

    try {
      const result = await apiCall(`/api/clients/${id}`, {
        method: 'DELETE',
        timeout: 5000,
      })

      if (result.success) {
        fetchClients()
      } else {
        alert(result.error || 'Error al eliminar cliente')
      }
    } catch (err) {
      alert('Error al eliminar cliente')
    }
  }

  const generateInvitationLink = async () => {
    console.log('🚀 Botón clickeado - abriendo modal inmediatamente')
    
    // Abrir modal INMEDIATAMENTE
    setShowInvitationModal(true)
    setGeneratingLink(true)
    setError(null)
    
    try {
      console.log('🔗 Generando link de invitación...')

      const result = await apiCall('/api/seller/invitation-link', {
        method: 'POST',
        timeout: 10000
      })

      if (result.success) {
        console.log('✅ Link generado:', result.data)
        console.log('✅ Link completo:', result.data.data?.link)
        
        // El API devuelve {success: true, data: {link: ...}}
        // pero apiCall lo envuelve en {success: true, data: {...}}
        const linkData = result.data.data || result.data
        const link = linkData.link
        
        console.log('✅ Link extraído:', link)
        setInvitationLink(link)
        console.log('📤 Modal actualizado con link:', link)
      } else {
        alert(result.error || 'Error al generar link de invitación')
        setShowInvitationModal(false) // Cerrar si falla
      }
    } catch (err) {
      console.error('❌ Error generando link:', err)
      alert('Error al generar link de invitación')
      setShowInvitationModal(false) // Cerrar si falla
    } finally {
      setGeneratingLink(false)
    }
  }

  const copyInvitationLink = () => {
    if (invitationLink) {
      navigator.clipboard.writeText(invitationLink)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    }
  }

  // Ver historial de un cliente
  const viewClientHistory = async (clientId: string, clientName: string) => {
    setHistoryClientId(clientId)
    setHistoryClientName(clientName)
    setShowHistoryModal(true)
    setLoadingHistory(true)
    
    try {
      const result = await apiCall(`/api/clients/${clientId}/orders`, {
        timeout: 10000,
      })
      
      if (result.success) {
        setClientOrders(result.data || [])
      } else {
        alert(result.error || 'Error al cargar historial')
      }
    } catch (err) {
      console.error('Error loading history:', err)
      alert('Error al cargar historial')
    } finally {
      setLoadingHistory(false)
    }
  }

  const closeHistoryModal = () => {
    setShowHistoryModal(false)
    setHistoryClientId(null)
    setHistoryClientName('')
    setClientOrders([])
  }

  const exportClientHistoryToExcel = () => {
    if (clientOrders.length > 0 && historyClientName) {
      exportClientHistory(historyClientName, clientOrders)
    }
  }

  const openCatalogModal = (clientId: string, clientName: string) => {
    setCatalogClientId(clientId)
    setCatalogClientName(clientName)
    setShowCatalogModal(true)
  }

  const closeCatalogModal = () => {
    setShowCatalogModal(false)
    setCatalogClientId(null)
    setCatalogClientName('')
  }

  const closeInvitationModal = () => {
    setShowInvitationModal(false)
    setInvitationLink(null)
    setLinkCopied(false)
    setInvitationMethod('email')
    setInvitationValue('')
  }

  const sendInvitation = async () => {
    if (!invitationLink) return
    
    if (!invitationValue.trim()) {
      alert('Por favor ingresa un valor para el método seleccionado')
      return
    }

    // Para WhatsApp y SMS, abrir directamente la app
    if (invitationMethod === 'whatsapp') {
      // Limpiar el número (solo dígitos)
      const cleanNumber = invitationValue.replace(/\D/g, '')
      
      // Mensaje prellenado
      const message = encodeURIComponent(
        `¡Hola! 👋\n\n` +
        `${sellerName} te invita a conectarte como cliente.\n\n` +
        `Haz click en el siguiente enlace para registrarte:\n` +
        `${invitationLink}\n\n` +
        `¡Te esperamos! 🛒`
      )
      
      // Abrir WhatsApp (funciona en móvil y web)
      const whatsappUrl = `https://wa.me/${cleanNumber}?text=${message}`
      window.open(whatsappUrl, '_blank')
      
      alert('✅ Se abrió WhatsApp con el mensaje. Solo presiona enviar.')
      closeInvitationModal()
      return
    }

    if (invitationMethod === 'sms') {
      // Limpiar el número (solo dígitos)
      const cleanNumber = invitationValue.replace(/\D/g, '')
      
      // Mensaje prellenado (más corto para SMS)
      const message = encodeURIComponent(
        `${sellerName} te invita a conectarte: ${invitationLink}`
      )
      
      // Abrir app de SMS (funciona en móvil)
      const smsUrl = `sms:${cleanNumber}?body=${message}`
      window.open(smsUrl, '_blank')
      
      alert('✅ Se abrió la app de mensajes. Solo presiona enviar.')
      closeInvitationModal()
      return
    }

    // Para Email, usar el API de Mailersend
    try {
      setSendingInvitation(true)
      
      const payload = {
        invitationLink,
        sellerName,
        email: invitationValue,
        whatsapp: null,
        sms: null
      }
      
      const result = await apiCall('/api/seller/send-invitation', {
        method: 'POST',
        body: JSON.stringify(payload),
        timeout: 15000
      })

      // apiCall envuelve la respuesta
      const apiData = result.data

      if (result.success && apiData?.success) {
        alert(`✅ Invitación enviada por Email a ${invitationValue}`)
        closeInvitationModal()
      } else {
        alert(apiData?.error || result.error || 'Error al enviar la invitación')
      }
    } catch (err) {
      console.error('Error enviando invitación:', err)
      alert('Error al enviar la invitación')
    } finally {
      setSendingInvitation(false)
    }
  }

  // Filtrar clientes por búsqueda
  console.log('🔎 Estado de clients antes de filtrar:', clients)
  console.log('🔎 Cantidad en state:', clients.length)
  console.log('🔎 Query de búsqueda actual:', searchQuery)
  
  const filteredClients = Array.isArray(clients) 
    ? clients.filter((client) => {
        const searchLower = searchQuery.toLowerCase().trim()
        if (!searchLower) return true

        // Buscar en todos los campos, manejando valores null/undefined
        const name = (client.name || '').toLowerCase()
        const email = (client.email || '').toLowerCase()
        const phone = (client.phone || '').toLowerCase()
        const address = (client.address || '').toLowerCase()
        const zipCode = (client.zipCode || '').toLowerCase()

        const match = (
          name.includes(searchLower) ||
          email.includes(searchLower) ||
          phone.includes(searchLower) ||
          address.includes(searchLower) ||
          zipCode.includes(searchLower)
        )

        console.log('🔍 Comparando:', {
          searchLower,
          clientData: { name, email, phone, address, zipCode },
          match
        })

        return match
      })
    : []

  console.log('✅ Clientes filtrados:', filteredClients.length)

  const clearSearch = () => {
    setSearchQuery('')
    setSelectedClientId(null)
  }

  const handleSelectClient = (clientId: string) => {
    setSelectedClientId(clientId)
  }

  const handleBackToList = () => {
    setSelectedClientId(null)
  }

  // Si hay un cliente seleccionado, mostrar solo ese cliente
  const displayClients = selectedClientId 
    ? filteredClients.filter(c => c.id === selectedClientId)
    : filteredClients

  // Loading state
  if (loading) {
    return (
      <MainLayout>
        <PageHeader
          title="Clientes"
          description="Cargando clientes..."
        />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="animate-pulse bg-white rounded-2xl shadow-lg p-6 border-2 border-gray-200">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-gray-200 rounded-full" />
                <div className="flex-1">
                  <div className="h-6 bg-gray-200 rounded mb-2 w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded" />
                <div className="h-4 bg-gray-200 rounded" />
                <div className="h-4 bg-gray-200 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </MainLayout>
    )
  }

  // Timeout state
  if (timedOut) {
    return (
      <MainLayout>
        <div className="max-w-md mx-auto mt-8 bg-yellow-50 border border-yellow-200 p-6 rounded-lg">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="h-8 w-8 text-yellow-600" />
            <h2 className="text-xl font-bold text-yellow-900">
              Tiempo de espera excedido
            </h2>
          </div>
          <p className="text-gray-700 mb-4">
            La carga de clientes está tardando más de lo esperado.
          </p>
          <button
            onClick={fetchClients}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
          >
            Reintentar
          </button>
        </div>
      </MainLayout>
    )
  }

  // Error state
  if (error) {
    return (
      <MainLayout>
        <div className="max-w-md mx-auto mt-8 bg-red-50 border border-red-200 p-6 rounded-lg">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="h-8 w-8 text-red-600" />
            <h2 className="text-xl font-bold text-red-900">Error</h2>
          </div>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={fetchClients}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
          >
            Reintentar
          </button>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="page-transition">
      <PageHeader
        title="Clientes"
        description={`${clients.length} clientes registrados`}
        action={
          <div className="flex gap-3">
            <button
              onClick={generateInvitationLink}
              disabled={generatingLink}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 flex items-center gap-2 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generatingLink ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  Generando...
                </>
              ) : (
                <>
                  <Link2 size={20} />
                  Invitar Comprador
                </>
              )}
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-700 flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
            >
              <Plus size={20} />
              Nuevo Cliente
            </button>
          </div>
        }
      />

      {/* Estadísticas - Dinámicas según búsqueda o cliente seleccionado */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium mb-1">
                {selectedClientId ? 'Cliente Seleccionado' : searchQuery ? 'Clientes Filtrados' : 'Total Clientes'}
              </p>
              <p className="text-4xl font-bold">{displayClients.length}</p>
            </div>
            <Users className="w-12 h-12 text-blue-200 opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-700 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium mb-1">
                {selectedClientId || searchQuery ? 'Órdenes del Cliente' : 'Órdenes Totales'}
              </p>
              <p className="text-4xl font-bold">
                {displayClients.reduce((sum, c) => sum + (c.stats?.totalOrders || 0), 0)}
              </p>
            </div>
            <ShoppingBag className="w-12 h-12 text-green-200 opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium mb-1">
                {selectedClientId || searchQuery ? 'Ingresos del Cliente' : 'Ingresos Totales'}
              </p>
              <p className="text-4xl font-bold">
                {formatPrice(displayClients.reduce((sum, c) => sum + (c.stats?.totalSpent || 0), 0))}
              </p>
            </div>
            <DollarSign className="w-12 h-12 text-purple-200 opacity-80" />
          </div>
        </div>
      </div>

      {/* 🔔 Panel de Solicitudes de Conexión Pendientes */}
      {typeof window !== 'undefined' && (
        <div className="mb-6">
          <Suspense fallback={null}>
            <ConnectionRequestsPanel
              onRequestAccepted={(clientId, clientName) => {
                // Recargar clientes cuando se acepte una solicitud
                fetchClients()
              }}
            />
          </Suspense>
        </div>
      )}

      {/* Barra de búsqueda moderna */}
      <div className="mb-6">
        <div className="relative max-w-2xl">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar por nombre, email, teléfono o dirección..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-12 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all text-lg"
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
        
        {/* Indicador de resultados */}
        {searchQuery && (
          <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
            <Users className="h-4 w-4" />
            <span>
              {filteredClients.length === 0 ? (
                'No se encontraron clientes'
              ) : (
                <>
                  Mostrando {filteredClients.length} de {clients.length} cliente
                  {filteredClients.length !== 1 ? 's' : ''}
                </>
              )}
            </span>
            {filteredClients.length > 0 && searchQuery && (
              <button
                onClick={clearSearch}
                className="ml-2 text-blue-600 hover:text-blue-700 font-medium"
              >
                Ver todos
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modal de Formulario de cliente */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div id="client-form" className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-800">
                {editingId ? '✏️ Editar Cliente' : '➕ Nuevo Cliente'}
              </h3>
              <button
                onClick={cancelEdit}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nombre completo</label>
                <input
                  type="text"
                  placeholder="Ej: Juan Pérez"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  placeholder="ejemplo@correo.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Teléfono</label>
                <input
                  type="tel"
                  placeholder="123-456-7890"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Código Postal</label>
                <input
                  type="text"
                  placeholder="12345"
                  value={formData.zipCode}
                  onChange={(e) =>
                    setFormData({ ...formData, zipCode: e.target.value })
                  }
                  maxLength={10}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Dirección completa</label>
                <input
                  type="text"
                  placeholder="Calle, número, colonia, ciudad"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={saveClient}
                className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-xl hover:from-green-600 hover:to-green-700 font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                {editingId ? '💾 Actualizar' : '✅ Guardar'}
              </button>
              <button
                onClick={cancelEdit}
                className="px-8 bg-gray-200 text-gray-700 py-3 rounded-xl hover:bg-gray-300 font-semibold transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vista de tarjetas de clientes */}
      {selectedClientId && (
        <div className="mb-6 animate-slideIn">
          <button
            onClick={handleBackToList}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl transition-all shadow-lg hover:shadow-xl font-semibold"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver a todos los clientes
          </button>
        </div>
      )}

      <div className={`transition-all duration-300 ${
        selectedClientId 
          ? 'grid grid-cols-1 max-w-4xl mx-auto' 
          : 'grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3'
      }`}>
        {displayClients.length === 0 ? (
          <div className="col-span-full">
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center border-2 border-gray-100">
              <Search className="h-20 w-20 text-gray-300 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-700 mb-2">
                {searchQuery ? 'No se encontraron clientes' : 'No hay clientes registrados'}
              </h3>
              <p className="text-gray-500 mb-6 text-lg">
                {searchQuery
                  ? 'Intenta con otro término de búsqueda'
                  : 'Comienza agregando tu primer cliente haciendo clic en "Nuevo Cliente"'}
              </p>
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="text-blue-600 hover:text-blue-700 font-semibold text-lg"
                >
                  🔄 Limpiar búsqueda
                </button>
              )}
            </div>
          </div>
        ) : (
          displayClients.map((client, index) => (
            <div
              key={client.id}
              className={`${
                selectedClientId 
                  ? 'animate-fadeInUp' 
                  : ''
              }`}
            >
              <ClientProfileCard
                client={client}
                onEdit={startEdit}
                onDelete={deleteClient}
                onSelect={selectedClientId ? undefined : handleSelectClient}
                onManageCatalog={() => openCatalogModal(client.id, client.name)}
                colorIndex={index}
                isExpanded={selectedClientId === client.id}
              />
            </div>
          ))
        )}
      </div>

      {/* 🚀 MODAL ACTIVO - Formulario de envío con dropdown selector */}
      {showInvitationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 animate-fadeIn">
            {!invitationLink ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4" />
                <p className="text-gray-600 text-lg">Generando link de invitación...</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 p-3 rounded-xl">
                      <Link2 className="h-6 w-6 text-blue-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">🎯 Enviar Invitación</h3>
                  </div>
                  <button
                    onClick={closeInvitationModal}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="space-y-4">
              <p className="text-gray-600 text-lg font-medium">
                Selecciona el método de envío y completa la información del comprador.
              </p>

              {/* 📧 Formulario de envío con dropdown selector */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-200">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2 text-lg">
                  📤 Método de envío
                </h4>
                <div className="space-y-4">
                  {/* Dropdown para seleccionar método */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Selecciona el método de envío
                    </label>
                    <select
                      value={invitationMethod}
                      onChange={(e) => {
                        setInvitationMethod(e.target.value as 'email' | 'whatsapp' | 'sms')
                        setInvitationValue('') // Limpiar el valor al cambiar método
                      }}
                      className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-base bg-white"
                    >
                      <option value="email">📧 Email</option>
                      <option value="whatsapp">💬 WhatsApp</option>
                      <option value="sms">📱 SMS</option>
                    </select>
                  </div>

                  {/* Campo de entrada dinámico según el método */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {invitationMethod === 'email' && 'Correo electrónico'}
                      {invitationMethod === 'whatsapp' && 'Número de WhatsApp'}
                      {invitationMethod === 'sms' && 'Número de teléfono'}
                    </label>
                    <input
                      type={invitationMethod === 'email' ? 'email' : 'tel'}
                      placeholder={
                        invitationMethod === 'email' ? 'ejemplo@correo.com' :
                        invitationMethod === 'whatsapp' ? '7862585427' :
                        '786 2585427'
                      }
                      value={invitationValue}
                      onChange={(e) => setInvitationValue(e.target.value)}
                      className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-base"
                    />
                  </div>

                  {/* Botón de envío */}
                  <button
                    onClick={sendInvitation}
                    disabled={sendingInvitation || !invitationValue.trim()}
                    className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-xl hover:from-green-600 hover:to-green-700 font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {sendingInvitation ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        ✉️ Enviar Invitación por {invitationMethod === 'email' ? 'Email' : invitationMethod === 'whatsapp' ? 'WhatsApp' : 'SMS'}
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Link manual */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <p className="text-sm text-gray-500 mb-2 font-medium">O copia el link manualmente:</p>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={invitationLink}
                    readOnly
                    className="flex-1 bg-white border border-gray-300 rounded-lg px-4 py-3 text-sm font-mono text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={copyInvitationLink}
                    className={`${
                      linkCopied 
                        ? 'bg-green-600 hover:bg-green-700' 
                        : 'bg-blue-600 hover:bg-blue-700'
                    } text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-all shadow-md hover:shadow-lg`}
                  >
                    {linkCopied ? (
                      <>
                        <CheckCircle size={20} />
                        ¡Copiado!
                      </>
                    ) : (
                      <>
                        <Copy size={20} />
                        Copiar
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  <AlertCircle size={18} />
                  ¿Cómo funciona?
                </h4>
                <ul className="space-y-2 text-sm text-blue-800">
                  <li className="flex items-start gap-2">
                    <span className="font-bold mt-0.5">1.</span>
                    <span>El comprador recibe el link por email, WhatsApp o SMS</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold mt-0.5">2.</span>
                    <span>Si no tiene cuenta, se registra con Clerk</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold mt-0.5">3.</span>
                    <span>Al aceptar, quedará conectado contigo y podrá hacer pedidos</span>
                  </li>
                </ul>
              </div>

                  <div className="flex gap-3">
                    <button
                      onClick={closeInvitationModal}
                      className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-xl hover:bg-gray-300 font-semibold transition-all"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal de Historial de Cliente */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full animate-fadeIn my-8 max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header fijo */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-3 rounded-xl">
                    <History className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold">
                      Historial de Pedidos
                    </h3>
                    <p className="text-purple-100 text-sm">{historyClientName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {clientOrders && clientOrders.length > 0 && (
                    <button
                      onClick={exportClientHistoryToExcel}
                      className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all text-sm font-semibold"
                    >
                      <Download className="h-4 w-4" />
                      <span className="hidden sm:inline">Exportar</span>
                    </button>
                  )}
                  <button
                    onClick={closeHistoryModal}
                    className="bg-white/20 hover:bg-white/30 p-2 rounded-xl transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Contenido scrolleable */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingHistory ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200 border-t-purple-600 mx-auto mb-4" />
                  <p className="text-gray-600 text-lg">Cargando historial...</p>
                </div>
              ) : !clientOrders || clientOrders.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <ShoppingBag className="h-10 w-10 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-700 mb-2">
                    Sin órdenes registradas
                  </h3>
                  <p className="text-gray-500">
                    Este cliente aún no ha realizado ninguna compra
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Resumen */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 text-white">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-blue-100 text-xs font-medium mb-1">Total Órdenes</p>
                          <p className="text-3xl font-black">{clientOrders.length}</p>
                        </div>
                        <ShoppingBag className="w-10 h-10 text-blue-200/50" />
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-4 text-white">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-green-100 text-xs font-medium mb-1">Total Gastado</p>
                          <p className="text-2xl font-black">
                            {formatPrice(clientOrders.reduce((sum, order) => sum + (Number(order?.totalAmount) || 0), 0))}
                          </p>
                        </div>
                        <DollarSign className="w-10 h-10 text-green-200/50" />
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-4 text-white">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-purple-100 text-xs font-medium mb-1">Promedio</p>
                          <p className="text-2xl font-black">
                            {formatPrice(clientOrders.length > 0 ? clientOrders.reduce((sum, order) => sum + (Number(order?.totalAmount) || 0), 0) / clientOrders.length : 0)}
                          </p>
                        </div>
                        <TrendingUp className="w-10 h-10 text-purple-200/50" />
                      </div>
                    </div>
                  </div>

                  {/* Lista de órdenes */}
                  <div className="space-y-3">
                    <h4 className="text-lg font-bold text-gray-900">Órdenes Recientes</h4>
                    {clientOrders.map((order) => order && (
                      <div
                        key={order.id || Math.random()}
                        className="bg-gray-50 border border-gray-200 rounded-2xl p-4 hover:shadow-md transition-all"
                      >
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-3">
                          <div>
                            <h5 className="text-lg font-bold text-gray-900">
                              {order.orderNumber || 'Sin número'}
                            </h5>
                            <p className="text-sm text-gray-500">
                              {order.createdAt ? new Date(order.createdAt).toLocaleDateString('es-ES', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric'
                              }) : 'Fecha no disponible'}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`px-3 py-1.5 rounded-lg text-sm font-bold ${
                              order.status === 'COMPLETED' || order.status === 'DELIVERED' 
                                ? 'bg-green-100 text-green-700'
                                : order.status === 'PENDING'
                                ? 'bg-yellow-100 text-yellow-700'
                                : order.status === 'CANCELED'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {order.status || 'N/A'}
                            </span>
                            <p className="text-xl font-black text-gray-900">
                              {formatPrice(Number(order.totalAmount) || 0)}
                            </p>
                          </div>
                        </div>
                        
                        {/* Items de la orden */}
                        {order.orderItems && Array.isArray(order.orderItems) && order.orderItems.length > 0 && (
                          <div className="space-y-1.5 pt-3 border-t border-gray-200">
                            <p className="font-semibold text-gray-600 text-xs uppercase tracking-wide">
                              {order.orderItems.length} productos
                            </p>
                            {order.orderItems.slice(0, 5).map((item: any, idx: number) => item && (
                              <div key={item.id || idx} className="flex justify-between text-sm bg-white p-2.5 rounded-lg">
                                <span className="text-gray-700">
                                  {item.productName || item.product?.name || 'Producto'}{' '}
                                  <span className="text-gray-400">x{item.quantity || 1}</span>
                                </span>
                                <span className="font-bold text-gray-800">
                                  {formatPrice(Number(item.subtotal) || 0)}
                                </span>
                              </div>
                            ))}
                            {order.orderItems.length > 5 && (
                              <p className="text-xs text-gray-500 text-center py-1">
                                +{order.orderItems.length - 5} productos más...
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Gestión de Catálogo */}
      {showCatalogModal && catalogClientId && (
        <ManageCatalogModal
          isOpen={showCatalogModal}
          onClose={closeCatalogModal}
          clientId={catalogClientId}
          clientName={catalogClientName}
          onSuccess={() => {
            console.log('✅ Catálogo actualizado')
          }}
        />
      )}
      </div>
    </MainLayout>
  )
}