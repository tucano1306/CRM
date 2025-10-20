'use client'

import { useEffect, useState, useRef } from 'react'
import { useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Send, Clock, CheckCheck, AlertCircle } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'

interface Message {
  id: string
  senderId: string
  receiverId: string
  message: string
  isRead: boolean
  createdAt: string
  order?: {
    id: string
    orderNumber: string
    status: string
  }
}

interface ChatWindowProps {
  receiverId: string
  receiverName: string
  orderId?: string
}

export default function ChatWindow({ receiverId, receiverName, orderId }: ChatWindowProps) {
  const { user } = useUser()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (user?.id && receiverId) {
      fetchMessages()
      // Actualizar mensajes cada 5 segundos
      const interval = setInterval(fetchMessages, 5000)
      return () => clearInterval(interval)
    }
  }, [user?.id, receiverId, orderId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchMessages = async () => {
    // ✅ VALIDACIÓN: Verificar que tenemos los datos necesarios
    if (!receiverId || !user?.id) {
      console.log('Esperando receiverId o userId...')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        otherUserId: receiverId
      })
      
      if (orderId) {
        params.append('orderId', orderId)
      }

      const response = await fetch(`/api/chat-messages?${params}`)
      const data = await response.json()

      if (data.success) {
        setMessages(data.messages)
        
        // Marcar mensajes no leídos como leídos
        const unreadIds = data.messages
          .filter((m: Message) => !m.isRead && m.receiverId === user?.id)
          .map((m: Message) => m.id)

        if (unreadIds.length > 0) {
          markAsRead(unreadIds)
        }
      } else {
        setError(data.error || 'Error cargando mensajes')
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (messageIds: string[]) => {
    try {
      await fetch('/api/chat-messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageIds })
      })
    } catch (error) {
      console.error('Error marking as read:', error)
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newMessage.trim() || !user?.id) return

    setSending(true)
    setError(null)

    try {
      const response = await fetch('/api/chat-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId,
          message: newMessage.trim(),
          orderId: orderId || null,
          idempotencyKey: uuidv4()
        })
      })

      const data = await response.json()

      if (data.success) {
        setNewMessage('')
        fetchMessages()
      } else {
        setError(data.error || 'Error enviando mensaje')
        
        // Mostrar error de horario
        if (data.details) {
          alert(`⚠️ ${data.error}\n\n${data.details}`)
        }
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setError('Error de conexión al enviar mensaje')
    } finally {
      setSending(false)
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Hoy'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ayer'
    } else {
      return date.toLocaleDateString('es-ES', { 
        day: '2-digit', 
        month: 'short' 
      })
    }
  }

  return (
    <Card className="flex flex-col h-[600px]">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center justify-between">
          <span>Chat con {receiverName}</span>
          {orderId && (
            <span className="text-sm font-normal text-gray-500">
              Orden relacionada
            </span>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        {/* Mensajes */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading && messages.length === 0 ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <AlertCircle className="h-12 w-12 mb-2" />
              <p>No hay mensajes aún</p>
              <p className="text-sm">Envía el primer mensaje</p>
            </div>
          ) : (
            <>
              {messages.map((msg, index) => {
                const isOwn = msg.senderId === user?.id
                const showDate = index === 0 || 
                  formatDate(msg.createdAt) !== formatDate(messages[index - 1].createdAt)

                return (
                  <div key={msg.id}>
                    {showDate && (
                      <div className="flex justify-center mb-4">
                        <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
                          {formatDate(msg.createdAt)}
                        </span>
                      </div>
                    )}
                    
                    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[70%] rounded-lg px-4 py-2 ${
                          isOwn
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p className="text-sm break-words">{msg.message}</p>
                        <div className={`flex items-center gap-1 mt-1 text-xs ${
                          isOwn ? 'text-blue-100' : 'text-gray-500'
                        }`}>
                          <Clock className="h-3 w-3" />
                          <span>{formatTime(msg.createdAt)}</span>
                          {isOwn && msg.isRead && (
                            <CheckCheck className="h-3 w-3 ml-1" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mx-4 mb-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {error}
            </p>
          </div>
        )}

        {/* Input */}
        <form onSubmit={sendMessage} className="border-t p-4">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Escribe un mensaje..."
              disabled={sending}
              className="flex-1"
            />
            <Button 
              type="submit" 
              disabled={sending || !newMessage.trim()}
              className="px-6"
            >
              {sending ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
