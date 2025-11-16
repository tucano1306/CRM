/**
 * 🔍 Individual Job Status API
 * GET /api/jobs/[jobId] - Obtener estado específico de un trabajo
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
 * GET /api/jobs/[jobId] - Obtener estado de trabajo específico
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

    // Preparar respuesta
    const response: any = {
      id: job.id,
      type: job.type,
      status: job.status,
      progress: job.progress,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      error: job.error,
      retryCount: job.retryCount,
      maxRetries: job.maxRetries
    }

    // Si está completado, incluir resultado si es seguro
    if (job.status === 'completed' && job.result) {
      if (job.type === 'pdf-generation') {
        // Para PDFs, solo incluir metadata, no el buffer completo
        response.result = {
          filename: job.result.filename,
          mimeType: job.result.mimeType,
          size: job.result.buffer?.length || 0,
          downloadReady: true
        }
      } else {
        response.result = job.result
      }
    }

    return NextResponse.json({
      success: true,
      data: response
    })

  } catch (error) {
    const { jobId } = await params
    console.error(`❌ Error fetching job ${jobId}:`, error)
    return NextResponse.json(
      { error: 'Failed to fetch job status' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/jobs/[jobId] - Cancelar trabajo
 */
export async function DELETE(
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

    // Intentar cancelar
    const cancelled = jobQueue.cancelJob(jobId)

    if (!cancelled) {
      return NextResponse.json(
        { error: 'Job cannot be cancelled (already processing or completed)' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Job cancelled successfully'
    })

  } catch (error) {
    const { jobId } = await params
    console.error(`❌ Error cancelling job ${jobId}:`, error)
    return NextResponse.json(
      { error: 'Failed to cancel job' },
      { status: 500 }
    )
  }
}