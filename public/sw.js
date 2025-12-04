// Service Worker para notificaciones push y badge
const CACHE_NAME = 'bargain-v1'

// Instalar service worker
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker instalado')
  self.skipWaiting()
})

// Activar service worker
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker activado')
  event.waitUntil(clients.claim())
})

// Manejar notificaciones push
self.addEventListener('push', (event) => {
  console.log('📬 Push recibido:', event)
  
  let data = {
    title: 'Bargain',
    body: 'Tienes nuevas actualizaciones',
    icon: '/logo.png',
    badge: '/logo.png',
    tag: 'bargain-notification',
    data: { url: '/' }
  }

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() }
    } catch (e) {
      data.body = event.data.text()
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/logo.png',
    badge: data.badge || '/logo.png',
    tag: data.tag || 'bargain-notification',
    vibrate: [200, 100, 200], // Patrón de vibración
    data: data.data || { url: '/' },
    actions: data.actions || [],
    requireInteraction: data.requireInteraction || false,
    silent: false // Permitir sonido
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

// Manejar click en notificación
self.addEventListener('notificationclick', (event) => {
  console.log('👆 Notificación clickeada:', event)
  
  event.notification.close()

  const urlToOpen = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Buscar si ya hay una ventana abierta
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(urlToOpen)
            return client.focus()
          }
        }
        // Si no hay ventana abierta, abrir una nueva
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen)
        }
      })
  )
})

// Manejar mensajes desde la app
self.addEventListener('message', (event) => {
  console.log('💬 Mensaje recibido en SW:', event.data)
  
  if (event.data.type === 'SET_BADGE') {
    // Actualizar badge del ícono
    if ('setAppBadge' in navigator) {
      if (event.data.count > 0) {
        navigator.setAppBadge(event.data.count)
      } else {
        navigator.clearAppBadge()
      }
    }
  }
})
