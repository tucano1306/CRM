/**
 * Sistema de Logging/Monitoring Centralizado
 * 
 * Proporciona logging estructurado con diferentes niveles, contexto,
 * y preparado para integración con servicios externos (Sentry, Logtail, etc.)
 */

// ============================================================================
// TIPOS Y ENUMS
// ============================================================================

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}

export enum LogCategory {
  API = 'api',
  AUTH = 'auth',
  DATABASE = 'database',
  RATE_LIMIT = 'rate_limit',
  CORS = 'cors',
  EVENTS = 'events',
  CRON = 'cron',
  WEBHOOK = 'webhook',
  VALIDATION = 'validation',
  PERFORMANCE = 'performance',
  SECURITY = 'security',
  SYSTEM = 'system'
}

export interface LogContext {
  userId?: string
  userRole?: string
  ip?: string
  userAgent?: string
  requestId?: string
  endpoint?: string
  method?: string
  duration?: number
  statusCode?: number
  [key: string]: any
}

export interface LogEntry {
  timestamp: string
  level: LogLevel
  category: LogCategory
  message: string
  context?: LogContext
  error?: {
    name: string
    message: string
    stack?: string
    cause?: any
  }
  metadata?: Record<string, any>
}

export interface LoggerConfig {
  minLevel: LogLevel
  enableConsole: boolean
  enableFile: boolean
  enableExternal: boolean
  prettyPrint: boolean
  includeStackTrace: boolean
  externalService?: 'sentry' | 'logtail' | 'datadog' | 'newrelic'
}

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

const DEFAULT_CONFIG: LoggerConfig = {
  minLevel: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
  enableConsole: true,
  enableFile: false, // NOTE: File logging can be implemented if needed
  enableExternal: process.env.NODE_ENV === 'production', // Activar en producción
  prettyPrint: process.env.NODE_ENV !== 'production',
  includeStackTrace: true,
  externalService: (process.env.LOGGING_SERVICE as any) || undefined
}

// Orden de severidad de logs
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  [LogLevel.DEBUG]: 0,
  [LogLevel.INFO]: 1,
  [LogLevel.WARN]: 2,
  [LogLevel.ERROR]: 3,
  [LogLevel.FATAL]: 4
}

// ============================================================================
// LOGGER CLASS
// ============================================================================

class Logger {
  private config: LoggerConfig
  private logBuffer: LogEntry[] = []
  private readonly MAX_BUFFER_SIZE = 100

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Verifica si un log debe ser procesado basado en el nivel mínimo
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.config.minLevel]
  }

  /**
   * Formatea el error para logging
   */
  private formatError(error: any): LogEntry['error'] {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: this.config.includeStackTrace ? error.stack : undefined,
        cause: error.cause
      }
    }
    return {
      name: 'UnknownError',
      message: String(error)
    }
  }

  /**
   * Crea una entrada de log estructurada
   */
  private createLogEntry(
    level: LogLevel,
    category: LogCategory,
    message: string,
    context?: LogContext,
    error?: any,
    metadata?: Record<string, any>
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      context,
      error: error ? this.formatError(error) : undefined,
      metadata
    }
  }

  /**
   * Formatea el log para consola (pretty print)
   */
  private formatForConsole(entry: LogEntry): string {
    const { timestamp, level, category, message, context, error, metadata } = entry

    const timeStr = new Date(timestamp).toLocaleTimeString('es-ES')
    const levelIcon = this.getLevelIcon(level)
    const categoryStr = `[${category.toUpperCase()}]`

    let output = `${timeStr} ${levelIcon} ${categoryStr} ${message}`

    // Agregar contexto si existe
    if (context && Object.keys(context).length > 0) {
      const contextStr = Object.entries(context)
        .filter(([_, value]) => value !== undefined)
        .map(([key, value]) => `${key}=${value}`)
        .join(', ')
      if (contextStr) {
        output += `\n  📋 Context: ${contextStr}`
      }
    }

    // Agregar metadata si existe
    if (metadata && Object.keys(metadata).length > 0) {
      output += `\n  📦 Metadata: ${JSON.stringify(metadata, null, 2)}`
    }

    // Agregar error si existe
    if (error) {
      output += `\n  ❌ Error: ${error.name}: ${error.message}`
      if (error.stack && this.config.prettyPrint) {
        output += `\n${error.stack}`
      }
    }

    return output
  }

  /**
   * Obtiene el icono para cada nivel de log
   */
  private getLevelIcon(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG: return '🔍'
      case LogLevel.INFO: return 'ℹ️'
      case LogLevel.WARN: return '⚠️'
      case LogLevel.ERROR: return '❌'
      case LogLevel.FATAL: return '💀'
      default: return '📝'
    }
  }

  /**
   * Envía el log a la consola
   */
  private logToConsole(entry: LogEntry): void {
    if (!this.config.enableConsole) return

    const output = this.config.prettyPrint
      ? this.formatForConsole(entry)
      : JSON.stringify(entry)

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(output)
        break
      case LogLevel.INFO:
        console.info(output)
        break
      case LogLevel.WARN:
        console.warn(output)
        break
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(output)
        break
    }
  }

  /**
   * Envía el log a servicio externo (Sentry, Logtail, etc.)
   */
  private async logToExternalService(entry: LogEntry): Promise<void> {
    if (!this.config.enableExternal) return

    try {
      switch (this.config.externalService) {
        case 'sentry':
          await this.sendToSentry(entry)
          break
        case 'logtail':
          await this.sendToLogtail(entry)
          break
        case 'datadog':
          await this.sendToDatadog(entry)
          break
        // Agregar más servicios según necesidad
        default:
          // Si no hay servicio configurado, solo guardar en buffer
          this.addToBuffer(entry)
      }
    } catch (error) {
      // No fallar la aplicación si el logging externo falla
      console.error('Failed to send log to external service:', error)
    }
  }

  /**
   * Guarda log en buffer (para batch processing)
   */
  private addToBuffer(entry: LogEntry): void {
    this.logBuffer.push(entry)
    if (this.logBuffer.length >= this.MAX_BUFFER_SIZE) {
      this.flushBuffer()
    }
  }

  /**
   * Envía todos los logs del buffer (implementación futura)
   */
  private flushBuffer(): void {
    // NOTE: Placeholder - can be extended to flush to external service or file
    if (this.logBuffer.length > 0) {
      console.log(`[Logger] Flushing ${this.logBuffer.length} buffered logs`)
      this.logBuffer = []
    }
  }

  /**
   * Envía log a Sentry (implementación placeholder)
   */
  private async sendToSentry(entry: LogEntry): Promise<void> {
    // NOTE: Sentry integration placeholder - uncomment and configure below
    // import * as Sentry from "@sentry/nextjs"
    // if (entry.error) {
    //   Sentry.captureException(entry.error, {
    //     level: entry.level as any,
    //     tags: { category: entry.category },
    //     extra: { ...entry.context, ...entry.metadata }
    //   })
    // } else {
    //   Sentry.captureMessage(entry.message, {
    //     level: entry.level as any,
    //     tags: { category: entry.category },
    //     extra: { ...entry.context, ...entry.metadata }
    //   })
    // }
    this.addToBuffer(entry)
  }

  /**
   * Envía log a Logtail (implementación placeholder)
   */
  private async sendToLogtail(entry: LogEntry): Promise<void> {
    // NOTE: Logtail integration placeholder - uncomment and configure below
    // import { Logtail } from "@logtail/node"
    // const logtail = new Logtail(process.env.LOGTAIL_SOURCE_TOKEN!)
    // await logtail[entry.level](entry.message, {
    //   category: entry.category,
    //   ...entry.context,
    //   ...entry.metadata
    // })
    this.addToBuffer(entry)
  }

  /**
   * Envía log a Datadog (implementación placeholder)
   */
  private async sendToDatadog(entry: LogEntry): Promise<void> {
    // NOTE: Datadog integration placeholder
    this.addToBuffer(entry)
  }

  /**
   * Método principal de logging
   */
  private log(
    level: LogLevel,
    category: LogCategory,
    message: string,
    context?: LogContext,
    error?: any,
    metadata?: Record<string, any>
  ): void {
    if (!this.shouldLog(level)) return

    const entry = this.createLogEntry(level, category, message, context, error, metadata)

    this.logToConsole(entry)
    this.logToExternalService(entry)
  }

  // ============================================================================
  // PUBLIC API - Métodos de logging por nivel
  // ============================================================================

  debug(
    category: LogCategory,
    message: string,
    context?: LogContext,
    metadata?: Record<string, any>
  ): void {
    this.log(LogLevel.DEBUG, category, message, context, undefined, metadata)
  }

  info(
    category: LogCategory,
    message: string,
    context?: LogContext,
    metadata?: Record<string, any>
  ): void {
    this.log(LogLevel.INFO, category, message, context, undefined, metadata)
  }

  warn(
    category: LogCategory,
    message: string,
    context?: LogContext,
    metadata?: Record<string, any>
  ): void {
    this.log(LogLevel.WARN, category, message, context, undefined, metadata)
  }

  error(
    category: LogCategory,
    message: string,
    error?: any,
    context?: LogContext,
    metadata?: Record<string, any>
  ): void {
    this.log(LogLevel.ERROR, category, message, context, error, metadata)
  }

  fatal(
    category: LogCategory,
    message: string,
    error?: any,
    context?: LogContext,
    metadata?: Record<string, any>
  ): void {
    this.log(LogLevel.FATAL, category, message, context, error, metadata)
  }

  // ============================================================================
  // MÉTODOS DE UTILIDAD
  // ============================================================================

  /**
   * Log para inicio de request API
   */
  apiStart(endpoint: string, method: string, context?: LogContext): void {
    this.info(LogCategory.API, `${method} ${endpoint} - Request started`, {
      endpoint,
      method,
      ...context
    })
  }

  /**
   * Log para fin de request API
   */
  apiEnd(
    endpoint: string,
    method: string,
    statusCode: number,
    duration: number,
    context?: LogContext
  ): void {
    const level = statusCode >= 500 ? LogLevel.ERROR : statusCode >= 400 ? LogLevel.WARN : LogLevel.INFO
    this.log(level, LogCategory.API, `${method} ${endpoint} - Request completed`, {
      endpoint,
      method,
      statusCode,
      duration,
      ...context
    })
  }

  /**
   * Log para errores de API
   */
  apiError(
    endpoint: string,
    method: string,
    error: any,
    context?: LogContext
  ): void {
    this.error(LogCategory.API, `${method} ${endpoint} - Request failed`, error, {
      endpoint,
      method,
      ...context
    })
  }

  /**
   * Log para autenticación
   */
  authEvent(
    event: 'login' | 'logout' | 'signup' | 'failed',
    userId?: string,
    context?: LogContext
  ): void {
    const level = event === 'failed' ? LogLevel.WARN : LogLevel.INFO
    this.log(level, LogCategory.AUTH, `Auth event: ${event}`, {
      userId,
      event,
      ...context
    })
  }

  /**
   * Log para queries de base de datos
   */
  dbQuery(
    operation: string,
    model: string,
    duration: number,
    context?: LogContext
  ): void {
    this.debug(LogCategory.DATABASE, `DB ${operation} on ${model}`, {
      operation,
      model,
      duration,
      ...context
    })
  }

  /**
   * Log para eventos del sistema de eventos
   */
  eventEmitted(
    eventType: string,
    context?: LogContext,
    metadata?: Record<string, any>
  ): void {
    this.debug(LogCategory.EVENTS, `Event emitted: ${eventType}`, context, metadata)
  }

  /**
   * Log para performance monitoring
   */
  performance(
    operation: string,
    duration: number,
    threshold?: number,
    context?: LogContext
  ): void {
    const level = threshold && duration > threshold ? LogLevel.WARN : LogLevel.DEBUG
    this.log(level, LogCategory.PERFORMANCE, `Operation: ${operation} took ${duration}ms`, {
      operation,
      duration,
      threshold,
      ...context
    })
  }

  /**
   * Log para eventos de seguridad
   */
  security(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    context?: LogContext,
    metadata?: Record<string, any>
  ): void {
    const level = severity === 'critical' || severity === 'high' 
      ? LogLevel.ERROR 
      : severity === 'medium' 
      ? LogLevel.WARN 
      : LogLevel.INFO

    this.log(level, LogCategory.SECURITY, `Security event: ${event}`, context, undefined, {
      severity,
      ...metadata
    })
  }

  /**
   * Obtiene el buffer de logs actual
   */
  getBuffer(): LogEntry[] {
    return [...this.logBuffer]
  }

  /**
   * Limpia el buffer de logs
   */
  clearBuffer(): void {
    this.logBuffer = []
  }

  /**
   * Actualiza la configuración del logger
   */
  updateConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

const logger = new Logger()

export default logger

// ============================================================================
// HELPER: Request Logger Middleware
// ============================================================================

export interface RequestLoggerContext {
  userId?: string
  userRole?: string
  ip?: string
  userAgent?: string
}

export function createRequestLogger(context: RequestLoggerContext) {
  const startTime = Date.now()
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  return {
    requestId,
    start: (endpoint: string, method: string) => {
      logger.apiStart(endpoint, method, { ...context, requestId })
    },
    end: (endpoint: string, method: string, statusCode: number) => {
      const duration = Date.now() - startTime
      logger.apiEnd(endpoint, method, statusCode, duration, { ...context, requestId })
    },
    error: (endpoint: string, method: string, error: any) => {
      const duration = Date.now() - startTime
      logger.apiError(endpoint, method, error, { ...context, requestId, duration })
    }
  }
}

// ============================================================================
// HELPER: Performance Timer
// ============================================================================

export function createPerformanceTimer(operation: string, threshold?: number) {
  const startTime = Date.now()

  return {
    end: (context?: LogContext) => {
      const duration = Date.now() - startTime
      logger.performance(operation, duration, threshold, context)
      return duration
    }
  }
}

// ============================================================================
// HELPER: Error Logger con contexto automático
// ============================================================================

export function logError(
  error: any,
  category: LogCategory = LogCategory.SYSTEM,
  context?: LogContext
): void {
  logger.error(category, 'An error occurred', error, context)
}
