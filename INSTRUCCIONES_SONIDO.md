# SONIDO DE NOTIFICACION - INSTRUCCIONES

## Opcion 1: Descarga Directa (Recomendado)

1. Descarga este archivo de sonido:
   https://actions.google.com/sounds/v1/alarms/beep_short.ogg

2. Conviertelo a MP3 (o usa un conversor online como cloudconvert.com)

3. Renombralo a: `notification.mp3`

4. Colocalo en: `public/notification.mp3`

## Opcion 2: Desde NotificationSounds.com

1. Visita: https://notificationsounds.com/notification-sounds

2. Busca un sonido corto (1-2 segundos)

3. Descargalo en formato MP3

4. Renombralo a: `notification.mp3`

5. Colocalo en la carpeta `public/`

## Opcion 3: Usar tu Propio Sonido

Requisitos:
- Formato: MP3
- Duracion: 1-3 segundos
- Tamano: < 100KB
- Nombre: notification.mp3
- Ubicacion: public/notification.mp3

## Verificar que Funciona

1. Coloca el archivo en `public/notification.mp3`
2. Reinicia el servidor Next.js
3. Abre el chat en dos navegadores diferentes
4. Envia un mensaje desde una cuenta
5. Deberia sonar la notificacion en la otra

## Nota Importante

Si no existe el archivo notification.mp3, el chat funciona normalmente pero sin sonido.
El codigo ya esta listo, solo falta agregar el archivo de audio.
