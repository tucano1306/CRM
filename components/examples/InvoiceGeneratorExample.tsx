/**
 * 📄 Componente de Ejemplo - Generación de Facturas con Workers
 * Demuestra cómo usar el nuevo sistema de workers desde React
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
// import { Progress } from '@/components/ui/progress' // Not available yet
import { usePDFGeneration } from '@/hooks/useBackgroundJob'
import { Download, FileText, Loader2, X, CheckCircle, AlertCircle } from 'lucide-react'

interface InvoiceGeneratorProps {
  readonly orderId: string
  readonly orderNumber?: string
  readonly clientName?: string
}

export function InvoiceGeneratorExample({ 
  orderId, 
  orderNumber = 'ORD-12345',
  clientName = 'Cliente Demo'
}: InvoiceGeneratorProps) {
  const [generationMode, setGenerationMode] = useState<'async' | 'sync'>('async')
  const [syncLoading, setSyncLoading] = useState(false)
  
  const {
    jobs,
    isLoading,
    generatePDF,
    cancelJob,
    downloadJobResult
  } = usePDFGeneration()

  // Filtrar solo trabajos de este orden
  const orderJobs = jobs.filter(job => 
    job.type === 'pdf-generation' && 
    job.result?.orderId === orderId
  )

  /**
   * Generar factura en modo asíncrono (recomendado)
   */
  const handleAsyncGeneration = async () => {
    try {
      const result = await generatePDF(orderId, {
        priority: 2,
        useWorker: true
      })
      
      console.log('🎯 PDF generation job created:', result.jobId)
      
      // Mostrar notificación de éxito
      // toast.success('PDF generation started! You can continue working while it processes.')
    } catch (error) {
      console.error('❌ Failed to start PDF generation:', error)
      // toast.error('Failed to start PDF generation')
    }
  }

  /**
   * Generar factura en modo síncrono (legacy)
   */
  const handleSyncGeneration = async () => {
    setSyncLoading(true)
    
    try {
      const response = await fetch(`/api/orders/${orderId}/invoice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          async: false, // Modo síncrono
          useWorker: true
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      // Descargar PDF directamente
      const blob = await response.blob()
      const url = globalThis.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `factura-${orderNumber}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      globalThis.URL.revokeObjectURL(url)

      console.log('✅ PDF generated and downloaded synchronously')
      
    } catch (error) {
      console.error('❌ Sync PDF generation failed:', error)
    } finally {
      setSyncLoading(false)
    }
  }

  /**
   * Obtener estado visual del trabajo
   */
  const getJobStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">⏱️ Pending</Badge>
      case 'processing':
        return <Badge variant="default">⚡ Processing</Badge>
      case 'completed':
        return <Badge variant="destructive">✅ Completed</Badge>
      case 'failed':
        return <Badge variant="destructive">❌ Failed</Badge>
      case 'retrying':
        return <Badge variant="outline">🔄 Retrying</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Configuración de Generación */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Invoice Generator
          </CardTitle>
          <CardDescription>
            Generate invoice for order {orderNumber} - {clientName}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Mode Selection */}
          <div className="flex gap-2">
            <Button
              variant={generationMode === 'async' ? 'default' : 'outline'}
              onClick={() => setGenerationMode('async')}
              className="flex-1"
            >
              🚀 Async Mode (Recommended)
            </Button>
            <Button
              variant={generationMode === 'sync' ? 'default' : 'outline'}
              onClick={() => setGenerationMode('sync')}
              className="flex-1"
            >
              ⏳ Sync Mode (Legacy)
            </Button>
          </div>

          {/* Generation Buttons */}
          <div className="flex gap-2">
            {generationMode === 'async' ? (
              <Button
                onClick={handleAsyncGeneration}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Job...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Generate PDF (Async)
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleSyncGeneration}
                disabled={syncLoading}
                className="flex-1"
                variant="secondary"
              >
                {syncLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating... (May Block UI)
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Generate PDF (Sync)
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Information */}
          <div className="text-sm text-muted-foreground space-y-1">
            {generationMode === 'async' ? (
              <>
                <p>✅ Non-blocking: You can continue working while PDF generates</p>
                <p>✅ Background processing: Uses worker threads</p>
                <p>✅ Progress tracking: Real-time status updates</p>
              </>
            ) : (
              <>
                <p>⚠️ Blocking: UI will freeze during generation</p>
                <p>⚠️ Main thread: May impact performance</p>
                <p>⚠️ No progress: Wait until completion</p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Active Jobs */}
      {orderJobs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5" />
              Background Jobs
            </CardTitle>
            <CardDescription>
              PDF generation jobs for this order
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {orderJobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium">Job {job.id.slice(-8)}</span>
                      {getJobStatusBadge(job.status)}
                    </div>
                    
                    {job.status === 'processing' && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span>{job.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${job.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                    
                    {job.error && (
                      <div className="flex items-center gap-2 text-sm text-red-600">
                        <AlertCircle className="h-4 w-4" />
                        {job.error}
                      </div>
                    )}
                    
                    <div className="text-xs text-muted-foreground mt-2">
                      Created: {new Date(job.createdAt).toLocaleString()}
                      {job.completedAt && (
                        <> • Completed: {new Date(job.completedAt).toLocaleString()}</>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {job.status === 'completed' && (
                      <Button
                        size="sm"
                        onClick={() => downloadJobResult(job.id)}
                        className="flex items-center gap-1"
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </Button>
                    )}
                    
                    {(job.status === 'pending' || job.status === 'processing') && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => cancelJob(job.id)}
                        className="flex items-center gap-1"
                      >
                        <X className="h-4 w-4" />
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">
                {jobs.filter(j => j.status === 'completed').length}
              </div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {jobs.filter(j => j.status === 'processing' || j.status === 'pending').length}
              </div>
              <div className="text-sm text-muted-foreground">Active</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">
                {jobs.filter(j => j.status === 'failed').length}
              </div>
              <div className="text-sm text-muted-foreground">Failed</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}