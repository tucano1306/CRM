/**
 * 🎯 Jobs API - Gestión de trabajos en segundo plano
 * API para crear, consultar y gestionar trabajos asíncronos
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { jobQueue, queuePDFGeneration } from '@/lib/workers/job-queue'
import { RateLimiter } from '@/lib/rateLimit'

/**
 * POST /api/jobs - Crear nuevo trabajo
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimiter = new RateLimiter({ 
      windowMs: 60 * 1000, 
      maxRequests: 10,
      blockDurationMs: 60 * 1000
    })
    const clientId = request.headers.get('x-forwarded-for') || 'unknown'
    const rateLimitResult = rateLimiter.check(clientId)
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      )
    }

    // Verificar autenticación
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { type, data, options = {} } = body

    if (!type || !data) {
      return NextResponse.json(
        { error: 'Missing required fields: type, data' },
        { status: 400 }
      )
    }

    // Validar tipos de trabajo permitidos
    const allowedTypes = ['pdf-generation', 'data-export', 'report-generation']
    if (!allowedTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid job type. Allowed: ${allowedTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Agregar metadata del usuario
    const jobData = {
      ...data,
      userId,
      requestedAt: new Date().toISOString()
    }

    // Crear trabajo según el tipo
    let jobId: string

    switch (type) {
      case 'pdf-generation':
        jobId = await queuePDFGeneration(jobData, options)
        break
      
      default:
        jobId = await jobQueue.addJob(type, jobData, options)
        break
    }

    return NextResponse.json({
      success: true,
      data: {
        jobId,
        status: 'pending',
        message: 'Job queued successfully'
      }
    })

  } catch (error) {
    console.error('❌ Error creating job:', error)
    return NextResponse.json(
      { error: 'Failed to create job' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/jobs - Obtener lista de trabajos del usuario
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const limit = Number.parseInt(searchParams.get('limit') || '20', 10)

    // Obtener trabajos con filtros
    const filters: any = { limit }
    if (status) filters.status = status
    if (type) filters.type = type

    const allJobs = jobQueue.getJobs(filters)
    
    // Filtrar solo trabajos del usuario actual
    const userJobs = allJobs.filter(job => 
      job.data?.userId === userId
    ).map(job => ({
      id: job.id,
      type: job.type,
      status: job.status,
      progress: job.progress,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      error: job.error
    }))

    return NextResponse.json({
      success: true,
      data: {
        jobs: userJobs,
        total: userJobs.length
      }
    })

  } catch (error) {
    console.error('❌ Error fetching jobs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    )
  }
}