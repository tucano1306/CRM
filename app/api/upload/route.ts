import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { writeFile } from 'fs/promises'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { fileTypeFromBuffer } from 'file-type'
import DOMPurify from 'isomorphic-dompurify'

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
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No se proporcionó ningún archivo' },
        { status: 400 }
      )
    }

    // ✅ VALIDACIÓN 1: Tamaño máximo (5MB)
    const MAX_SIZE = 5 * 1024 * 1024 // 5MB en bytes
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'El archivo es demasiado grande. Máximo 5MB' },
        { status: 400 }
      )
    }

    // ✅ VALIDACIÓN 2: Tamaño mínimo (evitar archivos vacíos)
    if (file.size < 1) {
      return NextResponse.json(
        { error: 'El archivo está vacío' },
        { status: 400 }
      )
    }

    // ✅ VALIDACIÓN 3: Nombre de archivo
    const sanitizedFileName = DOMPurify.sanitize(file.name.trim())
    if (!sanitizedFileName || sanitizedFileName.length > 255) {
      return NextResponse.json(
        { error: 'Nombre de archivo inválido' },
        { status: 400 }
      )
    }

    // ✅ VALIDACIÓN 4: Extensión permitida
    const fileExtension = sanitizedFileName.split('.').pop()?.toLowerCase()
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'csv']
    
    if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
      return NextResponse.json(
        { error: `Extensión no permitida. Permitidas: ${allowedExtensions.join(', ')}` },
        { status: 400 }
      )
    }

    // Convertir File a Buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // ✅ VALIDACIÓN 5: Tipo MIME declarado
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv'
    ]

    if (!allowedMimeTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de archivo no permitido' },
        { status: 400 }
      )
    }

    // ✅ VALIDACIÓN 6: Contenido real del archivo (Magic Bytes)
    const detectedType = await fileTypeFromBuffer(buffer)
    
    // Mapeo de extensiones a MIME types permitidos
    const extensionToMime: Record<string, string[]> = {
      'jpg': ['image/jpeg'],
      'jpeg': ['image/jpeg'],
      'png': ['image/png'],
      'gif': ['image/gif'],
      'webp': ['image/webp'],
      'pdf': ['application/pdf'],
      'doc': ['application/msword'],
      'docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      'xls': ['application/vnd.ms-excel'],
      'xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
      'txt': ['text/plain'],
      'csv': ['text/csv', 'text/plain']
    }

    // Para archivos de texto (txt, csv) que no tienen magic bytes
    const textExtensions = ['txt', 'csv']
    if (!textExtensions.includes(fileExtension)) {
      if (!detectedType) {
        return NextResponse.json(
          { error: 'No se pudo detectar el tipo de archivo. Posiblemente corrupto' },
          { status: 400 }
        )
      }

      const expectedMimes = extensionToMime[fileExtension] || []
      if (!expectedMimes.includes(detectedType.mime)) {
        return NextResponse.json(
          { 
            error: 'El contenido del archivo no coincide con su extensión',
            details: `Extensión: ${fileExtension}, Contenido detectado: ${detectedType.mime}`
          },
          { status: 400 }
        )
      }
    }

    // ✅ VALIDACIÓN 7: Generar nombre único seguro
    const uniqueFileName = `${uuidv4()}.${fileExtension}`

    // ✅ SEGURIDAD: Guardar en /public/uploads con path seguro
    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    const filePath = path.join(uploadDir, uniqueFileName)

    // Prevenir path traversal
    const resolvedPath = path.resolve(filePath)
    const resolvedUploadDir = path.resolve(uploadDir)
    if (!resolvedPath.startsWith(resolvedUploadDir)) {
      return NextResponse.json(
        { error: 'Ruta de archivo inválida' },
        { status: 400 }
      )
    }

    // Crear directorio si no existe
    const fs = require('fs')
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }

    // ✅ Guardar archivo
    await writeFile(filePath, buffer)

    // Determinar tipo de archivo para el frontend
    const attachmentType = file.type.startsWith('image/') ? 'image' : 'document'

    // Log de seguridad
    console.log('📁 [UPLOAD] Archivo subido:', {
      userId,
      fileName: sanitizedFileName,
      savedAs: uniqueFileName,
      size: file.size,
      type: file.type,
      detectedType: detectedType?.mime || 'text',
      timestamp: new Date().toISOString()
    })

    // Retornar URL pública
    const publicUrl = `/uploads/${uniqueFileName}`

    return NextResponse.json({
      success: true,
      url: publicUrl,
      attachmentType,
      fileName: sanitizedFileName,
      fileSize: file.size,
      mimeType: detectedType?.mime || file.type
    })

  } catch (error) {
    console.error('❌ [UPLOAD] Error:', error)
    return NextResponse.json(
      { error: 'Error al subir el archivo' },
      { status: 500 }
    )
  }
}

/**
 * Configuración para permitir archivos grandes
 */
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '5mb',
    },
  },
}
