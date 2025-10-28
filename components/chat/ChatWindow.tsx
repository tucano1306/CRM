'use client'

import { useEffect, useState, useRef } from 'react'
import { useUser } from '@clerk/nextjs'
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
  const [loading, setLoading] = useState(false)
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

  const fetchMessages = async () => {
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
        setError(data.error || 'Error cargando mensajes')
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
      setError('Error de conexión')
    } finally {
      isFetchingRef.current = false
      setLoading(false)
    }
  }

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

    // Configurar polling cada 5 segundos
    fetchIntervalRef.current = setInterval(() => {
      fetchMessages()
    }, 5000)

    // Cleanup al desmontar o cuando cambien las dependencias
    return () => {
      if (fetchIntervalRef.current) {
        clearInterval(fetchIntervalRef.current)
        fetchIntervalRef.current = null
      }
    }
  }, [user?.id, receiverId, orderId])

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
    <Card className="flex flex-col h-[600px] md:h-[700px] overflow-hidden">
      {/* Header estilo WhatsApp */}
      <CardHeader className="border-b bg-gradient-to-r from-purple-600 to-blue-600 text-white p-2 md:p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
            {/* Avatar */}
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm md:text-base flex-shrink-0">
              {receiverName.charAt(0).toUpperCase()}
            </div>
            
            {/* Info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate text-sm md:text-base">{receiverName}</h3>
              {otherUserTyping ? (
                <p className="text-xs text-white/80 italic">escribiendo...</p>
              ) : (
                <p className="text-xs text-white/70">
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
              className="text-white hover:bg-white/20 h-7 w-7 md:h-8 md:w-8 p-0"
            >
              <Search className="h-3 w-3 md:h-4 md:w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 h-7 w-7 md:h-8 md:w-8 p-0 hidden sm:flex"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Barra de búsqueda */}
        {showSearch && (
          <div className="mt-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar mensajes..."
              className="bg-white/20 border-white/30 text-white placeholder:text-white/60 focus:bg-white/30 text-sm"
            />
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 bg-gray-50"
        style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0h100v100H0z\' fill=\'%23f3f4f6\'/%3E%3Cpath d=\'M20 20l10 10-10 10zm30 0l10 10-10 10zm30 0l10 10-10 10z\' fill=\'%23e5e7eb\' opacity=\'.1\'/%3E%3C/svg%3E")',
          backgroundSize: '100px 100px'
        }}
      >
        {/* Mensajes */}
        <div className="flex-1 overflow-y-auto p-2 md:p-4 space-y-2">
          {loading && messages.length === 0 ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Search className="h-12 w-12 mb-2" />
              <p>No se encontraron mensajes</p>
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
                          <div className="mb-2">
                            <img 
                              src={msg.attachmentUrl} 
                              alt={msg.attachmentName || 'Imagen'}
                              className="rounded-lg max-w-full h-auto max-h-64 cursor-pointer hover:opacity-90 transition"
                              onClick={() => window.open(msg.attachmentUrl, '_blank')}
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
        <form onSubmit={sendMessage} className="border-t bg-gray-50 p-2 md:p-4">
          {/* Indicador de subida de archivo */}
          {uploadingFile && (
            <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent" />
                <p className="text-sm text-blue-700">Subiendo archivo...</p>
              </div>
            </div>
          )}

          <div className="flex items-end gap-1 md:gap-2 relative">
            {/* Emoji Picker Button */}
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-1.5 md:p-2 text-gray-500 hover:text-gray-700 transition-colors mb-1 flex-shrink-0"
              title="Emoji"
              disabled={uploadingFile}
            >
              <Smile className="h-4 w-4 md:h-5 md:w-5" />
            </button>

            {/* Emoji Picker Dropdown */}
            {showEmojiPicker && (
              <div className="emoji-picker-container absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-xl border p-2 md:p-3 z-10 w-64 md:w-72">
                <div className="flex items-center justify-between mb-2 pb-2 border-b">
                  <h4 className="text-xs md:text-sm font-medium text-gray-700">Selecciona un emoji</h4>
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-3 w-3 md:h-4 md:w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-6 md:grid-cols-8 gap-1 md:gap-2 max-h-40 md:max-h-48 overflow-y-auto">
                  {EMOJIS.map((emoji, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => insertEmoji(emoji)}
                      className="text-xl md:text-2xl hover:bg-gray-100 rounded p-0.5 md:p-1 transition-colors"
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
              className="p-1.5 md:p-2 text-gray-500 hover:text-gray-700 transition-colors mb-1 flex-shrink-0 hidden sm:block disabled:opacity-50"
              title="Adjuntar archivo"
              disabled={uploadingFile}
            >
              <Paperclip className="h-4 w-4 md:h-5 md:w-5" />
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
                className="rounded-full bg-white text-sm md:text-base h-9 md:h-10"
              />
            </div>

            {/* Send Button */}
            <Button 
              type="submit" 
              disabled={sending || uploadingFile || !newMessage.trim()}
              className="rounded-full h-9 w-9 md:h-10 md:w-10 p-0 bg-purple-600 hover:bg-purple-700 flex-shrink-0"
              title="Enviar"
            >
              {sending ? (
                <div className="animate-spin rounded-full h-3 w-3 md:h-4 md:w-4 border-2 border-white border-t-transparent" />
              ) : (
                <Send className="h-3 w-3 md:h-4 md:w-4" />
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
