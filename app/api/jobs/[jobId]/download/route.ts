/**
 * 📥 Job Download API
 * GET /api/jobs/[jobId]/download - Descargar resultado de trabajo completado
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { jobQueue } from '@/lib/workers/job-queue'

interface RouteParams {
  params: Promise<{
    jobId: string
  }>
}

/**
 * GET /api/jobs/[jobId]/download - Descargar resultado del trabajo
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { jobId } = await params

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      )
    }

    // Obtener trabajo
    const job = jobQueue.getJob(jobId)

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    // Verificar que el trabajo pertenece al usuario
    if (job.data?.userId !== userId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Verificar que está completado
    if (job.status !== 'completed') {
      return NextResponse.json(
        { error: 'Job is not completed yet' },
        { status: 400 }
      )
    }

    // Verificar que tiene resultado
    if (!job.result) {
      return NextResponse.json(
        { error: 'Job result not available' },
        { status: 404 }
      )
    }

    // Manejar diferentes tipos de trabajos
    switch (job.type) {
      case 'pdf-generation':
        return handlePDFDownload(job.result)
      
      case 'data-export':
        return handleDataExport(job.result)
      
      default:
        return NextResponse.json(
          { error: 'Download not supported for this job type' },
          { status: 400 }
        )
    }

  } catch (error) {
    const { jobId } = await params
    console.error(`❌ Error downloading job ${jobId}:`, error)
    return NextResponse.json(
      { error: 'Failed to download job result' },
      { status: 500 }
    )
  }
}

/**
 * Manejar descarga de PDF
 */
function handlePDFDownload(result: any) {
  if (!result.buffer || !result.filename) {
    return NextResponse.json(
      { error: 'PDF data not available' },
      { status: 404 }
    )
  }

  // Crear response con el buffer del PDF
  return new NextResponse(result.buffer, {
    status: 200,
    headers: {
      'Content-Type': result.mimeType || 'application/pdf',
      'Content-Disposition': `attachment; filename="${result.filename}"`,
      'Content-Length': result.buffer.length.toString(),
      'Cache-Control': 'private, max-age=3600' // Cache por 1 hora
    }
  })
}

/**
 * Manejar descarga de datos exportados
 */
function handleDataExport(result: any) {
  if (!result.data || !result.filename) {
    return NextResponse.json(
      { error: 'Export data not available' },
      { status: 404 }
    )
  }

  const content = typeof result.data === 'string' 
    ? result.data 
    : JSON.stringify(result.data, null, 2)

  return new NextResponse(content, {
    status: 200,
    headers: {
      'Content-Type': result.mimeType || 'application/json',
      'Content-Disposition': `attachment; filename="${result.filename}"`,
      'Content-Length': Buffer.byteLength(content).toString(),
      'Cache-Control': 'private, max-age=3600'
    }
  })
}