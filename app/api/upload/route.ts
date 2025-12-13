import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { writeFile } from 'fs/promises'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { fileTypeFromBuffer } from 'file-type'
import { sanitizeText } from '@/lib/sanitize'

// Constants
const MAX_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'csv']
const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain', 'text/csv'
]
const EXTENSION_TO_MIME: Record<string, string[]> = {
  'jpg': ['image/jpeg'], 'jpeg': ['image/jpeg'], 'png': ['image/png'],
  'gif': ['image/gif'], 'webp': ['image/webp'], 'pdf': ['application/pdf'],
  'doc': ['application/msword'],
  'docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  'xls': ['application/vnd.ms-excel'],
  'xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  'txt': ['text/plain'], 'csv': ['text/csv', 'text/plain']
}

// Helper: Validate file basics (size, name, extension)
function validateFileBasics(file: File): string | null {
  if (file.size > MAX_SIZE) return 'El archivo es demasiado grande. Máximo 5MB'
  if (file.size < 1) return 'El archivo está vacío'
  
  const sanitizedFileName = sanitizeText(file.name)
  if (!sanitizedFileName || sanitizedFileName.length > 255) return 'Nombre de archivo inválido'
  
  const ext = sanitizedFileName.split('.').pop()?.toLowerCase()
  if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
    return `Extensión no permitida. Permitidas: ${ALLOWED_EXTENSIONS.join(', ')}`
  }
  
  if (!ALLOWED_MIME_TYPES.includes(file.type)) return 'Tipo de archivo no permitido'
  
  return null
}

// Helper: Validate file content matches extension
async function validateFileContent(buffer: Buffer, extension: string): Promise<{ error: string | null; detectedMime?: string }> {
  const textExtensions = ['txt', 'csv']
  if (textExtensions.includes(extension)) return { error: null }
  
  const detectedType = await fileTypeFromBuffer(buffer)
  if (!detectedType) return { error: 'No se pudo detectar el tipo de archivo. Posiblemente corrupto' }
  
  const expectedMimes = EXTENSION_TO_MIME[extension] || []
  if (!expectedMimes.includes(detectedType.mime)) {
    return { error: `El contenido del archivo no coincide con su extensión` }
  }
  
  return { error: null, detectedMime: detectedType.mime }
}

/**
 * POST /api/upload
 * Subir archivos (imágenes, documentos, etc.)
 * Límite: 5MB
 * ✅ CON VALIDACIÓN DE SEGURIDAD MEJORADA
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó ningún archivo' }, { status: 400 })
    }

    // Validate file basics
    const basicError = validateFileBasics(file)
    if (basicError) {
      return NextResponse.json({ error: basicError }, { status: 400 })
    }

    const sanitizedFileName = sanitizeText(file.name)
    const fileExtension = sanitizedFileName.split('.').pop()!.toLowerCase()
    
    // Convert to buffer and validate content
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    const contentValidation = await validateFileContent(buffer, fileExtension)
    if (contentValidation.error) {
      return NextResponse.json({ error: contentValidation.error }, { status: 400 })
    }
    const detectedMime = contentValidation.detectedMime

    // Generate unique filename and save
    const uniqueFileName = `${uuidv4()}.${fileExtension}`
    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    const filePath = path.join(uploadDir, uniqueFileName)

    // Prevent path traversal
    const resolvedPath = path.resolve(filePath)
    const resolvedUploadDir = path.resolve(uploadDir)
    if (!resolvedPath.startsWith(resolvedUploadDir)) {
      return NextResponse.json({ error: 'Ruta de archivo inválida' }, { status: 400 })
    }

    // Create directory if needed and save file
    const fs = require('fs')
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    await writeFile(filePath, buffer)

    const attachmentType = file.type.startsWith('image/') ? 'image' : 'document'

    console.log('📁 [UPLOAD] Archivo subido:', {
      userId, fileName: sanitizedFileName, savedAs: uniqueFileName,
      size: file.size, type: file.type, timestamp: new Date().toISOString()
    })

    // Retornar URL pública
    const publicUrl = `/uploads/${uniqueFileName}`

    return NextResponse.json({
      success: true,
      url: publicUrl,
      attachmentType,
      fileName: sanitizedFileName,
      fileSize: file.size,
      mimeType: detectedMime || file.type
    })

  } catch (error) {
    console.error('❌ [UPLOAD] Error:', error)
    return NextResponse.json(
      { error: 'Error al subir el archivo' },
      { status: 500 }
    )
  }
}

// Route segment config for App Router (Next.js 14+)
export const maxDuration = 60 // seconds
export const dynamic = 'force-dynamic'

