'use client'

import { useState, useEffect } from 'react'
import { Download, X, Smartphone } from 'lucide-react'
import Image from 'next/image'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [showIOSInstructions, setShowIOSInstructions] = useState(false)

  useEffect(() => {
    // Verificar si ya está instalada
    if (globalThis.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // Detectar iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(globalThis as any).MSStream
    setIsIOS(isIOSDevice)

    // Verificar si ya se mostró el prompt recientemente (últimas 24 horas)
    const lastPrompt = localStorage.getItem('pwa-prompt-dismissed')
    if (lastPrompt) {
      const lastPromptTime = Number.parseInt(lastPrompt, 10)
      if (Date.now() - lastPromptTime < 24 * 60 * 60 * 1000) {
        return // No mostrar si se cerró hace menos de 24 horas
      }
    }

    // Escuchar el evento beforeinstallprompt (Android/Desktop)
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      // Mostrar después de 3 segundos en la página
      setTimeout(() => setShowPrompt(true), 3000)
    }

    globalThis.addEventListener('beforeinstallprompt', handler)

    // Para iOS, mostrar instrucciones después de un tiempo
    if (isIOSDevice && !localStorage.getItem('pwa-ios-shown')) {
      setTimeout(() => setShowPrompt(true), 5000)
    }

    return () => {
      globalThis.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) {
      if (isIOS) {
        setShowIOSInstructions(true)
      }
      return
    }

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      
      if (outcome === 'accepted') {
        setIsInstalled(true)
        setShowPrompt(false)
      }
    } catch (error) {
      console.error('Error installing PWA:', error)
    }
    
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    setShowIOSInstructions(false)
    localStorage.setItem('pwa-prompt-dismissed', Date.now().toString())
    if (isIOS) {
      localStorage.setItem('pwa-ios-shown', 'true')
    }
  }

  if (isInstalled || !showPrompt) {
    return null
  }

  return (
    <>
      {/* Banner de instalación */}
      <div className="fixed bottom-4 left-4 right-4 z-50 animate-slide-up">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl shadow-2xl p-4 mx-auto max-w-md">
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 p-1 text-white/70 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
              <Image src="/logo.png" alt="Bargain" width={40} height={40} className="w-10 h-10" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-bold text-lg">Instalar Bargain</h3>
              <p className="text-purple-100 text-sm">
                Accede más rápido desde tu {isIOS ? 'pantalla de inicio' : 'escritorio'}
              </p>
            </div>
          </div>
          
          <button
            onClick={handleInstall}
            className="mt-3 w-full bg-white text-purple-700 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 hover:bg-purple-50 transition-colors shadow-lg"
          >
            {isIOS ? (
              <>
                <Smartphone className="w-5 h-5" />
                Ver instrucciones
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                Instalar App
              </>
            )}
          </button>
        </div>
      </div>

      {/* Modal de instrucciones para iOS */}
      {showIOSInstructions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-scale-up">
            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 p-1 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Smartphone className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Instalar en iPhone/iPad</h3>
            </div>
            
            <ol className="space-y-4 text-left">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-7 h-7 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-sm">1</span>
                <div>
                  <p className="text-gray-900 font-medium">Toca el botón compartir</p>
                  <p className="text-gray-500 text-sm">El ícono de cuadrado con flecha hacia arriba</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-7 h-7 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-sm">2</span>
                <div>
                  <p className="text-gray-900 font-medium">Desplázate hacia abajo</p>
                  <p className="text-gray-500 text-sm">Busca &ldquo;Añadir a pantalla de inicio&rdquo;</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-7 h-7 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-sm">3</span>
                <div>
                  <p className="text-gray-900 font-medium">Toca &ldquo;Añadir&rdquo;</p>
                  <p className="text-gray-500 text-sm">¡Listo! La app aparecerá en tu pantalla</p>
                </div>
              </li>
            </ol>
            
            <button
              onClick={handleDismiss}
              className="mt-6 w-full bg-purple-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-purple-700 transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(100%);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes scale-up {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
        .animate-scale-up {
          animation: scale-up 0.2s ease-out;
        }
      `}</style>
    </>
  )
}
