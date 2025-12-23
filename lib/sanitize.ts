/**
 * Server-side text sanitization utility
 * 
 * This replaces isomorphic-dompurify which has ES Module compatibility
 * issues in Vercel serverless environment (parse5/jsdom dependency).
 * 
 * For server-side API routes, we don't need full DOM parsing - simple
 * string sanitization is sufficient and much more performant.
 */

/**
 * Sanitize text input by removing HTML tags and dangerous characters
 * @param text - Raw text input from API request
 * @param maxLength - Maximum allowed length (default: 1000)
 * @returns Sanitized text safe for database storage
 */
export function sanitizeText(text: string, maxLength: number = 1000): string {
  if (!text || typeof text !== 'string') {
    return ''
  }

  return text
    .trim()
    .replaceAll(/<[^>]*>/g, '') // Remove all HTML tags
    .replaceAll(/[<>'"]/g, '') // Remove dangerous characters
    .replaceAll(/javascript:/gi, '') // Remove javascript: protocol
    .replaceAll(/on\w+\s*=/gi, '') // Remove event handlers (onclick=, onerror=, etc.)
    .substring(0, maxLength) // Limit length
}

/**
 * Sanitize HTML content (more permissive, allows some safe tags)
 * Use only when you need to preserve formatting like <b>, <i>, <p>
 */
export function sanitizeHTML(html: string, maxLength: number = 5000): string {
  if (!html || typeof html !== 'string') {
    return ''
  }

  // Allow only safe HTML tags
  const safeTags = ['b', 'i', 'u', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li']
  const tagPattern = new RegExp(String.raw`<(?!/?(${safeTags.join('|')}))[^>]*>`, 'gi')

  return html
    .trim()
    .replaceAll(tagPattern, '') // Remove unsafe HTML tags
    .replaceAll(/javascript:/gi, '') // Remove javascript: protocol
    .replaceAll(/on\w+\s*=/gi, '') // Remove event handlers
    .substring(0, maxLength)
}

/**
 * Sanitize URL to prevent XSS via href/src attributes
 */
export function sanitizeURL(url: string): string {
  if (!url || typeof url !== 'string') {
    return ''
  }

  const trimmed = url.trim()

  // Block dangerous protocols
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:']
  for (const protocol of dangerousProtocols) {
    if (trimmed.toLowerCase().startsWith(protocol)) {
      return ''
    }
  }

  // Only allow http, https, mailto, tel
  if (!/^(https?|mailto|tel):/i.test(trimmed)) {
    return ''
  }

  return trimmed.substring(0, 2000)
}

/**
 * Sanitize object by applying sanitizeText to all string values
 * Useful for bulk sanitization of form data
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized = { ...obj }

  for (const key in sanitized) {
    if (typeof sanitized[key] === 'string') {
      (sanitized as any)[key] = sanitizeText(sanitized[key])
    }
  }

  return sanitized
}
