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
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  
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