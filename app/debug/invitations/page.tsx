// app/debug/invitations/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Copy, Mail, ExternalLink, RefreshCw } from 'lucide-react'

interface Invitation {
  id: string
  email: string
  status: string
  createdAt: string
  expiresAt: string
  invitationLink: string
  token: string
}

export default function DebugInvitationsPage() {
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  useEffect(() => {
    fetchInvitations()
  }, [])

  const fetchInvitations = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/debug/invitations')
      const result = await response.json()
      
      if (result.success) {
        setInvitations(result.data)
      } else {
        alert(result.error || 'Error al cargar invitaciones')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al cargar invitaciones')
    } finally {
      setLoading(false)
    }
  }

  const createTestInvitation = async () => {
    if (!newEmail) {
      alert('Ingresa un email')
      return
    }

    try {
      setCreating(true)
      const response = await fetch('/api/debug/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail })
      })
      
      const result = await response.json()
      
      if (result.success) {
        alert('Invitación creada! Link copiado al portapapeles.')
        navigator.clipboard.writeText(result.data.invitationLink)
        setNewEmail('')
        fetchInvitations()
      } else {
        alert(result.error || 'Error al crear invitación')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al crear invitación')
    } finally {
      setCreating(false)
    }
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedToken(id)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  const openInNewTab = (link: string) => {
    window.open(link, '_blank')
  }

  if (process.env.NODE_ENV === 'production') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">⚠️ No Disponible</CardTitle>
            <CardDescription>
              Esta página solo está disponible en desarrollo local.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🔧 Debug de Invitaciones
          </h1>
          <p className="text-gray-600">
            Herramienta para probar el sistema de invitaciones sin enviar emails reales
          </p>
        </div>

        {/* Instrucciones */}
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900">📖 Cómo usar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-blue-800">
            <p><strong>1.</strong> Crea una invitación con cualquier email (puede ser ficticio)</p>
            <p><strong>2.</strong> Copia el link de invitación</p>
            <p><strong>3.</strong> Abre una ventana de incógnito (Ctrl+Shift+N)</p>
            <p><strong>4.</strong> Pega el link y regístrate con un email diferente</p>
            <p><strong>5.</strong> Truco Gmail: usa <code className="bg-white px-1 rounded">tuEmail+test1@gmail.com</code></p>
          </CardContent>
        </Card>

        {/* Crear nueva invitación */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>✉️ Crear Invitación de Prueba</CardTitle>
            <CardDescription>
              El email puede ser ficticio, no se enviará ningún correo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="cliente@ejemplo.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && createTestInvitation()}
              />
              <Button 
                onClick={createTestInvitation}
                disabled={creating || !newEmail}
              >
                <Mail className="h-4 w-4 mr-2" />
                Crear
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Lista de invitaciones */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>📋 Invitaciones Pendientes</CardTitle>
              <CardDescription>
                {invitations.length} invitaciones activas
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={fetchInvitations}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-gray-500">
                Cargando...
              </div>
            ) : invitations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No hay invitaciones pendientes
              </div>
            ) : (
              <div className="space-y-4">
                {invitations.map((inv) => (
                  <div 
                    key={inv.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-gray-900">{inv.email}</p>
                        <p className="text-xs text-gray-500">
                          Creada: {new Date(inv.createdAt).toLocaleString('es')}
                        </p>
                        <p className="text-xs text-gray-500">
                          Expira: {new Date(inv.expiresAt).toLocaleString('es')}
                        </p>
                      </div>
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                        {inv.status}
                      </span>
                    </div>
                    
                    <div className="bg-gray-100 rounded p-2 mb-2">
                      <p className="text-xs text-gray-600 mb-1 font-mono break-all">
                        {inv.invitationLink}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(inv.invitationLink, inv.id)}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        {copiedToken === inv.id ? '¡Copiado!' : 'Copiar Link'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openInNewTab(inv.invitationLink)}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Abrir
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
