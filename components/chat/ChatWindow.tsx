'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Send, Clock, CheckCheck, Check, AlertCircle, Paperclip, Smile, Search, Phone, Video, MoreVertical, Image as ImageIcon, FileText, X, Download } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'

interface Message {
  id: string
  senderId: string
  receiverId: string
  message: string
  isRead: boolean
  createdAt: string
  attachmentUrl?: string
  attachmentType?: 'image' | 'file'
  attachmentName?: string
  attachmentSize?: number
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

// Emojis populares
const EMOJIS = ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '👍', '👎', '👌', '✌️', '🤞', '🤝', '👏', '🙌', '👐', '🤲', '🙏', '✍️', '💪', '🦾', '🦿', '🦵', '🦶', '❤️', '🧡', '💛', '💚', '💙', '💜', '🤎', '🖤', '🤍', '💯', '💢', '💥', '💫', '💦', '💨']

export default function ChatWindow({ receiverId, receiverName, orderId }: ChatWindowProps) {
  const { user } = useUser()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true) // Start with loading=true for initial load
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [otherUserTyping, setOtherUserTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const fetchIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isFetchingRef = useRef(false)
  const previousMessageCountRef = useRef(0) // Para detectar nuevos mensajes
  const consecutiveErrorsRef = useRef(0) // Contador de errores consecutivos
  const hasLoadedOnceRef = useRef(false) // Si ya cargó al menos una vez

  // Log inicial para debugging
  console.log('💬 ChatWindow montado con:', {
    receiverId,
    receiverName,
    orderId,
    currentUserId: user?.id
  })

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

  const fetchMessages = useCallback(async () => {
    if (!user?.id || !receiverId) {
      return
    }

    // Evitar múltiples llamadas simultáneas
    if (isFetchingRef.current) {
      return
    }

    isFetchingRef.current = true

    try {
      setError(null)

      const params = new URLSearchParams({
        otherUserId: receiverId
      })
      
      if (orderId) {
        params.append('orderId', orderId)
      }

      const response = await fetch(`/api/chat-messages?${params}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()

      if (data.success) {
        const newMessages = data.messages
        
        // Reset contador de errores cuando hay éxito
        consecutiveErrorsRef.current = 0
        hasLoadedOnceRef.current = true
        setError(null)
        
        // Detectar si hay mensajes nuevos del otro usuario
        if (previousMessageCountRef.current > 0) {
          const newIncomingMessages = newMessages.filter((m: Message) => 
            m.senderId === receiverId && 
            !messages.find(oldMsg => oldMsg.id === m.id)
          )
          
          if (newIncomingMessages.length > 0) {
            // Reproducir sonido de notificación
            playNotificationSound()
          }
        }
        
        previousMessageCountRef.current = newMessages.length
        setMessages(newMessages)
        
        // Marcar mensajes no leídos como leídos
        const unreadIds = newMessages
          .filter((m: Message) => !m.isRead && m.receiverId === user?.id)
          .map((m: Message) => m.id)

        if (unreadIds.length > 0) {
          markAsRead(unreadIds)
        }
      } else {
        consecutiveErrorsRef.current++
        // Solo mostrar error si falló varias veces seguidas y nunca cargó
        if (consecutiveErrorsRef.current >= 3 && !hasLoadedOnceRef.current) {
          setError(data.error || 'Error cargando mensajes')
        }
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
      consecutiveErrorsRef.current++
      // Solo mostrar error si falló varias veces seguidas y nunca cargó
      if (consecutiveErrorsRef.current >= 3 && !hasLoadedOnceRef.current) {
        setError('Error de conexión. Reintentando...')
      }
    } finally {
      isFetchingRef.current = false
      setLoading(false)
    }
  }, [user?.id, receiverId, orderId, messages])

  useEffect(() => {
    if (!user?.id || !receiverId) {
      return
    }

    // Limpiar intervalo anterior si existe
    if (fetchIntervalRef.current) {
      clearInterval(fetchIntervalRef.current)
      fetchIntervalRef.current = null
    }

    // Cargar mensajes inicialmente
    fetchMessages()

    // Configurar polling cada 15 segundos (reducido para evitar rate limiting)
    fetchIntervalRef.current = setInterval(() => {
      fetchMessages()
    }, 15000)

    // Cleanup al desmontar o cuando cambien las dependencias
    return () => {
      if (fetchIntervalRef.current) {
        clearInterval(fetchIntervalRef.current)
        fetchIntervalRef.current = null
      }
    }
  }, [user?.id, receiverId, orderId, fetchMessages])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    // Cerrar emoji picker al hacer clic fuera
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (showEmojiPicker && !target.closest('.emoji-picker-container')) {
        setShowEmojiPicker(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showEmojiPicker])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Notificar que está escribiendo
  const handleTyping = () => {
    setIsTyping(true)
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
    }, 1000)
  }

  // Insertar emoji
  const insertEmoji = (emoji: string) => {
    console.log('😊 Insertando emoji:', emoji, 'Mensaje actual:', newMessage)
    setNewMessage(prev => {
      const newValue = prev + emoji
      console.log('📝 Nuevo mensaje:', newValue)
      return newValue
    })
    setShowEmojiPicker(false)
  }

  // Adjuntar archivo
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar tamaño (máx 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('El archivo es demasiado grande. Máximo 5MB')
      return
    }

    setUploadingFile(true)
    setUploadProgress(0)

    try {
      // Subir archivo
      const formData = new FormData()
      formData.append('file', file)

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      if (!uploadResponse.ok) {
        throw new Error('Error al subir el archivo')
      }

      const uploadData = await uploadResponse.json()

      if (!uploadData.success) {
        throw new Error(uploadData.error || 'Error al subir el archivo')
      }

      // Enviar mensaje con el archivo adjunto
      const messageResponse = await fetch('/api/chat-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId,
          message: file.name, // Usar nombre del archivo como mensaje
          orderId: orderId || null,
          idempotencyKey: uuidv4(),
          attachmentUrl: uploadData.url,
          attachmentType: uploadData.attachmentType,
          attachmentName: uploadData.fileName,
          attachmentSize: uploadData.fileSize
        })
      })

      const messageData = await messageResponse.json()

      if (messageData.success) {
        // Refrescar mensajes para mostrar el archivo
        fetchMessages()
        alert('✅ Archivo enviado correctamente')
      } else {
        throw new Error(messageData.error || 'Error al enviar el archivo')
      }

    } catch (error) {
      console.error('Error uploading file:', error)
      alert('❌ Error al subir el archivo. Intenta nuevamente.')
    } finally {
      setUploadingFile(false)
      setUploadProgress(0)
      
      // Resetear input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // Reproducir sonido de notificación
  const playNotificationSound = () => {
    try {
      const audio = new Audio('/notification.mp3')
      audio.volume = 0.5
      audio.play().catch(e => console.log('No se pudo reproducir sonido:', e))
    } catch (e) {
      console.log('Sonido no disponible')
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newMessage.trim() || !user?.id) return

    console.log('📤 Enviando mensaje:', {
      receiverId,
      message: newMessage.trim(),
      senderId: user.id
    })

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
      console.log('📥 Respuesta del servidor:', data)

      if (data.success) {
        setNewMessage('')
        fetchMessages()
      } else {
        console.error('❌ Error del servidor:', data.error)
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

  // Filtrar mensajes por búsqueda
  const filteredMessages = searchQuery
    ? messages.filter(m => m.message.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages

  return (
    <Card className="flex flex-col h-[600px] md:h-[700px] overflow-hidden rounded-xl shadow-xl border-2 border-purple-200">
      {/* Header estilo WhatsApp */}
      <CardHeader className="border-b-2 border-purple-300 bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-3 md:p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
            {/* Avatar */}
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center font-bold text-base md:text-lg flex-shrink-0 border-2 border-white/30">
              {receiverName.charAt(0).toUpperCase()}
            </div>
            
            {/* Info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-bold truncate text-base md:text-lg">{receiverName}</h3>
              {otherUserTyping ? (
                <p className="text-xs text-white/90 italic font-medium">escribiendo...</p>
              ) : (
                <p className="text-xs text-white/80">
                  {orderId ? 'Orden relacionada' : 'En línea'}
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSearch(!showSearch)}
              className="text-white hover:bg-white/20 h-8 w-8 md:h-10 md:w-10 p-0 rounded-lg transition-all"
            >
              <Search className="h-4 w-4 md:h-5 md:w-5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 h-8 w-8 md:h-10 md:w-10 p-0 rounded-lg transition-all hidden sm:flex"
            >
              <MoreVertical className="h-4 w-4 md:h-5 md:w-5" />
            </Button>
          </div>
        </div>

        {/* Barra de búsqueda */}
        {showSearch && (
          <div className="mt-3">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar mensajes..."
              className="bg-white/20 border-2 border-white/30 text-white placeholder:text-white/70 focus:bg-white/30 text-sm rounded-lg"
            />
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50"
        style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0h100v100H0z\' fill=\'%23f8fafc\'/%3E%3Cpath d=\'M20 20l10 10-10 10zm30 0l10 10-10 10zm30 0l10 10-10 10z\' fill=\'%23c7d2fe\' opacity=\'.05\'/%3E%3C/svg%3E")',
          backgroundSize: '100px 100px'
        }}
      >
        {/* Mensajes */}
        <div className="flex-1 overflow-y-auto p-2 md:p-4 space-y-2">
          {loading && messages.length === 0 ? (
            <div className="flex justify-center items-center h-full">
              <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-4 rounded-xl shadow-md">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-white border-t-transparent" />
              </div>
            </div>
          ) : messages.length === 0 && !searchQuery ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <div className="bg-gradient-to-br from-purple-100 to-indigo-100 p-4 rounded-full mb-3">
                <Send className="h-12 w-12 text-purple-600" />
              </div>
              <p className="font-semibold text-gray-600">¡Inicia la conversación!</p>
              <p className="text-sm">Envía el primer mensaje a {receiverName}</p>
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <div className="bg-gradient-to-br from-purple-100 to-indigo-100 p-4 rounded-full mb-3">
                <Search className="h-12 w-12 text-purple-600" />
              </div>
              <p className="font-semibold text-gray-600">No se encontraron mensajes</p>
              <p className="text-sm">Intenta con otra búsqueda</p>
            </div>
          ) : (
            <>
              {filteredMessages.map((msg, index) => {
                const isOwn = msg.senderId === user?.id
                const showDate = index === 0 || 
                  formatDate(msg.createdAt) !== formatDate(filteredMessages[index - 1].createdAt)

                return (
                  <div key={msg.id}>
                    {showDate && (
                      <div className="flex justify-center my-2 md:my-4">
                        <span className="text-xs bg-white/80 text-gray-600 px-2 md:px-3 py-1 rounded-full shadow-sm">
                          {formatDate(msg.createdAt)}
                        </span>
                      </div>
                    )}
                    
                    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-1`}>
                      <div
                        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-3 py-2 md:px-4 md:py-2 shadow-sm ${
                          isOwn
                            ? 'bg-purple-600 text-white rounded-br-sm'
                            : 'bg-white text-gray-900 rounded-bl-sm'
                        }`}
                      >
                        {/* Archivo adjunto - Imagen */}
                        {msg.attachmentUrl && msg.attachmentType === 'image' && (
                          <div className="mb-2 relative w-full" style={{ maxWidth: '300px', aspectRatio: '16/9' }}>
                            <Image 
                              src={msg.attachmentUrl} 
                              alt={msg.attachmentName || 'Imagen'}
                              fill
                              className="rounded-lg object-cover cursor-pointer hover:opacity-90 transition"
                              onClick={() => window.open(msg.attachmentUrl, '_blank')}
                              sizes="(max-width: 768px) 85vw, 300px"
                            />
                          </div>
                        )}

                        {/* Archivo adjunto - Documento */}
                        {msg.attachmentUrl && msg.attachmentType === 'file' && (
                          <div className={`mb-2 p-3 rounded-lg flex items-center gap-2 ${
                            isOwn ? 'bg-purple-700' : 'bg-gray-100'
                          }`}>
                            <FileText className={`h-8 w-8 flex-shrink-0 ${
                              isOwn ? 'text-purple-200' : 'text-gray-600'
                            }`} />
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium truncate ${
                                isOwn ? 'text-white' : 'text-gray-900'
                              }`}>
                                {msg.attachmentName || 'Archivo'}
                              </p>
                              <p className={`text-xs ${
                                isOwn ? 'text-purple-200' : 'text-gray-500'
                              }`}>
                                {msg.attachmentSize ? `${(msg.attachmentSize / 1024).toFixed(1)} KB` : 'Archivo'}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => window.open(msg.attachmentUrl, '_blank')}
                              className={`flex-shrink-0 ${
                                isOwn ? 'text-white hover:bg-purple-800' : 'text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        )}

                        {/* Mensaje de texto */}
                        {!msg.attachmentUrl && (
                          <p className="text-sm break-words whitespace-pre-wrap">{msg.message}</p>
                        )}
                        
                        {/* Si hay archivo, mostrar el mensaje como caption */}
                        {msg.attachmentUrl && msg.message !== msg.attachmentName && (
                          <p className="text-sm break-words whitespace-pre-wrap">{msg.message}</p>
                        )}
                        
                        {/* Hora y estado */}
                        <div className={`flex items-center gap-1 mt-1 justify-end text-xs ${
                          isOwn ? 'text-purple-100' : 'text-gray-500'
                        }`}>
                          <span className="text-[10px] sm:text-xs">{formatTime(msg.createdAt)}</span>
                          {isOwn && (
                            msg.isRead ? (
                              <CheckCheck className="h-3 w-3 md:h-4 md:w-4 text-blue-300" />
                            ) : (
                              <Check className="h-3 w-3 md:h-4 md:w-4" />
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
              
              {/* Indicador de "escribiendo..." */}
              {otherUserTyping && (
                <div className="flex justify-start mb-1">
                  <div className="bg-white text-gray-900 rounded-2xl rounded-bl-sm px-4 py-2 shadow-sm">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Error - Solo mostrar si ya estábamos conectados antes y ahora hay error */}
        {error && hasLoadedOnceRef.current && (
          <div className="mx-4 mb-2 p-2 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl shadow-sm">
            <p className="text-xs text-amber-700 flex items-center gap-2">
              <div className="animate-spin rounded-full h-3 w-3 border-2 border-amber-500 border-t-transparent" />
              Reconectando...
            </p>
          </div>
        )}

        {/* Input */}
        <form onSubmit={sendMessage} className="border-t-2 border-purple-200 bg-gradient-to-br from-white to-purple-50 p-3 md:p-4">
          {/* Indicador de subida de archivo */}
          {uploadingFile && (
            <div className="mb-2 p-3 bg-gradient-to-br from-cyan-50 to-blue-50 border-2 border-cyan-200 rounded-xl shadow-sm">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-cyan-600 border-t-transparent" />
                <p className="text-sm text-cyan-700 font-medium">Subiendo archivo...</p>
              </div>
            </div>
          )}

          <div className="flex items-end gap-1 md:gap-2 relative">
            {/* Emoji Picker Button */}
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2 md:p-2.5 text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-all mb-1 flex-shrink-0"
              title="Emoji"
              disabled={uploadingFile}
            >
              <Smile className="h-5 w-5 md:h-6 md:w-6" />
            </button>

            {/* Emoji Picker Dropdown */}
            {showEmojiPicker && (
              <div className="emoji-picker-container absolute bottom-full left-0 mb-2 bg-white rounded-xl shadow-2xl border-2 border-purple-200 p-3 md:p-4 z-10 w-64 md:w-72">
                <div className="flex items-center justify-between mb-3 pb-3 border-b-2 border-purple-100">
                  <h4 className="text-xs md:text-sm font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">Selecciona un emoji</h4>
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(false)}
                    className="text-gray-400 hover:text-purple-600 hover:bg-purple-50 p-1 rounded-lg transition-all"
                  >
                    <X className="h-4 w-4 md:h-5 md:w-5" />
                  </button>
                </div>
                <div className="grid grid-cols-6 md:grid-cols-8 gap-1 md:gap-2 max-h-40 md:max-h-48 overflow-y-auto">
                  {EMOJIS.map((emoji, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => insertEmoji(emoji)}
                      className="text-xl md:text-2xl hover:bg-purple-50 rounded-lg p-1 md:p-1.5 transition-all"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* File Attachment Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 md:p-2.5 text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-all mb-1 flex-shrink-0 hidden sm:block disabled:opacity-50"
              title="Adjuntar archivo"
              disabled={uploadingFile}
            >
              <Paperclip className="h-5 w-5 md:h-6 md:w-6" />
            </button>
            
            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
              className="hidden"
              onChange={handleFileSelect}
              disabled={uploadingFile}
            />

            {/* Message Input */}
            <div className="flex-1 relative">
              <Input
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value)
                  handleTyping()
                }}
                placeholder="Escribe un mensaje..."
                disabled={sending}
                className="rounded-full bg-white border-2 border-purple-200 focus:border-purple-300 text-sm md:text-base h-10 md:h-11"
              />
            </div>

            {/* Send Button */}
            <Button 
              type="submit" 
              disabled={sending || uploadingFile || !newMessage.trim()}
              className="rounded-full h-10 w-10 md:h-11 md:w-11 p-0 bg-gradient-to-br from-purple-600 to-indigo-600 hover:shadow-lg transition-all flex-shrink-0 border-0"
              title="Enviar"
            >
              {sending ? (
                <div className="animate-spin rounded-full h-4 w-4 md:h-5 md:w-5 border-2 border-white border-t-transparent" />
              ) : (
                <Send className="h-4 w-4 md:h-5 md:w-5 text-white" />
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
