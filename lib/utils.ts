import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formatea un número con separador de miles (punto) y decimales (coma)
 * Ejemplo: 2345 -> "2.345" | 2345.90 -> "2.345,90"
 */
export function formatNumber(value: number | string, decimals: number = 2): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  
  if (isNaN(num)) return '0'
  
  // Separar parte entera y decimal
  const parts = num.toFixed(decimals).split('.')
  
  // Formatear parte entera con separador de miles (punto)
  parts[0] = parts[0].replaceAll(/\B(?=(\d{3})+(?!\d))/g, '.')
  
  // Unir con coma como separador decimal
  return decimals > 0 ? parts.join(',') : parts[0]
}

/**
 * Formatea un precio con símbolo de moneda
 * Ejemplo: 2345.90 -> "$2.345,90"
 */
export function formatPrice(value: number | string, currency: string = '$'): string {
  return `${currency}${formatNumber(value, 2)}`
}

// ==================== FUNCIONES DE FECHA ====================

/**
 * Formatea una fecha en formato legible
 * Ejemplo: "12/12/2025" o "12 dic 2025"
 */
export function formatDate(
  date: Date | string | null | undefined, 
  options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' }
): string {
  if (!date) return '-'
  const dateObj = typeof date === 'string' ? new Date(date) : date
  if (isNaN(dateObj.getTime())) return '-'
  return dateObj.toLocaleDateString('es-ES', options)
}

/**
 * Formatea una fecha con hora
 * Ejemplo: "12/12/2025 14:30"
 */
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '-'
  const dateObj = typeof date === 'string' ? new Date(date) : date
  if (isNaN(dateObj.getTime())) return '-'
  return dateObj.toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Obtiene tiempo relativo desde una fecha
 * Ejemplo: "Hace 5 min", "Hace 2h", "Ayer", "Hace 3 días"
 */
export function getRelativeTime(date: Date | string | null | undefined): string {
  if (!date) return '-'
  const dateObj = typeof date === 'string' ? new Date(date) : date
  if (isNaN(dateObj.getTime())) return '-'
  
  const now = new Date()
  const diffMs = now.getTime() - dateObj.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffSecs < 30) return 'Ahora'
  if (diffMins < 1) return 'Hace menos de 1 min'
  if (diffMins < 60) return `Hace ${diffMins} min`
  if (diffHours < 24) return `Hace ${diffHours}h`
  if (diffDays === 1) return 'Ayer'
  if (diffDays < 7) return `Hace ${diffDays} días`
  if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semanas`
  return dateObj.toLocaleDateString('es-ES')
}

/**
 * Verifica si una fecha es hoy
 */
export function isToday(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const today = new Date()
  return dateObj.toDateString() === today.toDateString()
}

/**
 * Verifica si una fecha es ayer
 */
export function isYesterday(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return dateObj.toDateString() === yesterday.toDateString()
}