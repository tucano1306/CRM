/**
 * 🚀 WASM Integration Example
 * Ejemplo simplificado de integración con WebAssembly
 * Compatible con cualquier sistema de UI
 */

'use client'

import { useState } from 'react'
import { useWASM, useMathWASM, useDataAnalysisWASM } from '@/hooks/useWASM'

export default function WASMIntegrationExample() {
  const { isSupported, isLoading, error } = useWASM()
  const { calculatePrimes, calculateStats, isLoading: mathLoading } = useMathWASM()
  const { analyzeDataset, calculateCorrelation } = useDataAnalysisWASM()
  
  const [results, setResults] = useState<{
    primes?: number[]
    stats?: any
    analysis?: any
    times?: { wasm: number, js: number }
  }>({})

  const [isRunning, setIsRunning] = useState(false)

  // Demo: Análizar datos de órdenes del CRM
  const analyzeOrderData = async () => {
    setIsRunning(true)
    
    // Simular datos de órdenes reales
    const orderAmounts = [
      45.50, 123.75, 67.20, 89.90, 156.00, 234.10, 78.30, 192.40,
      56.80, 345.60, 12.90, 167.25, 98.50, 287.15, 134.75, 203.40,
      76.20, 189.30, 145.80, 298.60, 87.40, 156.90, 234.20, 109.80
    ]
    
    try {
      console.log('🔄 Ejecutando análisis WASM...')
      
      // Análisis con WASM
      const wasmStart = performance.now()
      const wasmResult = await analyzeDataset(orderAmounts)
      const wasmTime = performance.now() - wasmStart
      
      // Análisis con JavaScript (para comparación)
      const jsStart = performance.now()
      const jsResult = analyzeJS(orderAmounts)
      const jsTime = performance.now() - jsStart
      
      setResults({
        analysis: wasmResult.success ? wasmResult.data : jsResult,
        times: { wasm: wasmTime, js: jsTime }
      })
      
      console.log(`✅ Análisis completado`)
      console.log(`WASM: ${wasmTime.toFixed(2)}ms | JS: ${jsTime.toFixed(2)}ms`)
      console.log(`Mejora: ${(jsTime / wasmTime).toFixed(2)}x más rápido`)
      
    } catch (error) {
      console.error('❌ Error en análisis:', error)
    } finally {
      setIsRunning(false)
    }
  }

  // Demo: Cálculo de números primos
  const calculatePrimesDemo = async () => {
    setIsRunning(true)
    
    try {
      console.log('🔢 Calculando números primos...')
      
      const result = await calculatePrimes(10000)
      if (result.success) {
        setResults(prev => ({
          ...prev,
          primes: result.data
        }))
        
        console.log(`✅ ${result.data.length} primos encontrados en ${result.executionTime}ms`)
      }
      
    } catch (error) {
      console.error('❌ Error calculando primos:', error)
    } finally {
      setIsRunning(false)
    }
  }

  // Fallback JavaScript para comparación
  const analyzeJS = (data: number[]) => {
    const sorted = [...data].sort((a, b) => a - b)
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length
    
    return {
      mean,
      median: sorted[Math.floor(sorted.length / 2)],
      standardDeviation: Math.sqrt(variance),
      min: Math.min(...data),
      max: Math.max(...data),
      count: data.length
    }
  }

  if (!isSupported) {
    return (
      <div style={{ 
        padding: '1rem', 
        backgroundColor: '#fef3c7', 
        border: '1px solid #f59e0b',
        borderRadius: '0.5rem',
        color: '#92400e'
      }}>
        ⚠️ WebAssembly no está soportado en este navegador
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ 
        padding: '1rem', 
        backgroundColor: '#fee2e2', 
        border: '1px solid #ef4444',
        borderRadius: '0.5rem',
        color: '#dc2626'
      }}>
        ❌ Error: {error}
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>
        🚀 WebAssembly + Food Orders CRM
      </h1>
      
      <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
        Demostración de mejoras de rendimiento con WebAssembly para tareas CPU-intensivas
      </p>

      {/* Status */}
      <div style={{ 
        padding: '1rem', 
        backgroundColor: isLoading ? '#fef3c7' : '#d1fae5',
        border: `1px solid ${isLoading ? '#f59e0b' : '#10b981'}`,
        borderRadius: '0.5rem',
        marginBottom: '2rem'
      }}>
        <strong>Estado:</strong> {isLoading ? '⏳ Cargando módulos WASM...' : '✅ WASM listo'}
      </div>

      {/* Controls */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <button
          onClick={analyzeOrderData}
          disabled={isLoading || isRunning}
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: isLoading || isRunning ? 'not-allowed' : 'pointer',
            opacity: isLoading || isRunning ? 0.5 : 1
          }}
        >
          📊 Analizar Datos de Órdenes
        </button>
        
        <button
          onClick={calculatePrimesDemo}
          disabled={mathLoading || isRunning}
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: mathLoading || isRunning ? 'not-allowed' : 'pointer',
            opacity: mathLoading || isRunning ? 0.5 : 1
          }}
        >
          🔢 Calcular Números Primos
        </button>
      </div>

      {/* Results */}
      {results.analysis && (
        <div style={{ 
          padding: '1.5rem', 
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '0.5rem',
          marginBottom: '1rem'
        }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>
            📊 Análisis de Datos de Órdenes
          </h3>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '1rem',
            marginBottom: '1rem'
          }}>
            <div>
              <strong>Promedio:</strong> ${results.analysis.mean?.toFixed(2)}
            </div>
            <div>
              <strong>Mediana:</strong> ${results.analysis.median?.toFixed(2)}
            </div>
            <div>
              <strong>Mínimo:</strong> ${results.analysis.min?.toFixed(2)}
            </div>
            <div>
              <strong>Máximo:</strong> ${results.analysis.max?.toFixed(2)}
            </div>
            <div>
              <strong>Desv. Estándar:</strong> ${results.analysis.standardDeviation?.toFixed(2)}
            </div>
            <div>
              <strong>Total Órdenes:</strong> {results.analysis.count}
            </div>
          </div>
          
          {results.times && (
            <div style={{ 
              padding: '1rem',
              backgroundColor: '#ecfdf5',
              border: '1px solid #10b981',
              borderRadius: '0.375rem'
            }}>
              <strong style={{ color: '#065f46' }}>Performance:</strong>
              <br />
              WASM: {results.times.wasm.toFixed(2)}ms | 
              JavaScript: {results.times.js.toFixed(2)}ms
              <br />
              <strong style={{ color: '#059669' }}>
                Mejora: {(results.times.js / results.times.wasm).toFixed(2)}x más rápido
              </strong>
            </div>
          )}
        </div>
      )}

      {results.primes && (
        <div style={{ 
          padding: '1.5rem', 
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '0.5rem',
          marginBottom: '1rem'
        }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>
            🔢 Números Primos Calculados
          </h3>
          
          <p><strong>Total encontrados:</strong> {results.primes.length.toLocaleString()}</p>
          <p><strong>Últimos 10:</strong> {results.primes.slice(-10).join(', ')}</p>
          
          <div style={{ 
            padding: '0.75rem',
            backgroundColor: '#eff6ff',
            border: '1px solid #3b82f6',
            borderRadius: '0.375rem',
            marginTop: '1rem'
          }}>
            <strong style={{ color: '#1e40af' }}>
              ℹ️ Uso en CRM: Los números primos pueden usarse para generar IDs únicos 
              o como semillas para algoritmos de hash seguros.
            </strong>
          </div>
        </div>
      )}

      {/* Use Cases */}
      <div style={{ 
        padding: '1.5rem', 
        backgroundColor: '#fefce8',
        border: '1px solid #eab308',
        borderRadius: '0.5rem'
      }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', color: '#a16207' }}>
          💡 Casos de Uso en el CRM
        </h3>
        
        <ul style={{ color: '#a16207', paddingLeft: '1.5rem' }}>
          <li><strong>Analytics Dashboard:</strong> Análisis en tiempo real de grandes datasets</li>
          <li><strong>Reportes Financieros:</strong> Cálculos complejos de ROI e interés compuesto</li>
          <li><strong>Procesamiento de Imágenes:</strong> Optimización de fotos de productos</li>
          <li><strong>Data Mining:</strong> Clustering de clientes y análisis de patrones</li>
          <li><strong>Criptografía:</strong> Generación de hashes y números aleatorios seguros</li>
        </ul>
      </div>

      {/* Code Example */}
      <div style={{ 
        padding: '1.5rem', 
        backgroundColor: '#1e293b',
        color: '#e2e8f0',
        borderRadius: '0.5rem',
        marginTop: '2rem',
        fontFamily: 'monospace',
        fontSize: '0.875rem'
      }}>
        <h4 style={{ marginBottom: '1rem', color: '#38bdf8' }}>
          💻 Ejemplo de Código:
        </h4>
        <pre style={{ margin: 0, overflow: 'auto' }}>{`// Usar WASM en tu componente
import { useDataAnalysisWASM } from '@/hooks/useWASM'

function OrderAnalytics() {
  const { analyzeDataset, isLoading } = useDataAnalysisWASM()
  
  const analyzeOrders = async (orderData) => {
    const result = await analyzeDataset(orderData)
    if (result.success) {
      console.log('Análisis:', result.data)
      console.log('Tiempo:', result.executionTime + 'ms')
    }
  }
  
  return (
    <button onClick={() => analyzeOrders(myData)}>
      Analizar con WASM
    </button>
  )
}`}</pre>
      </div>
    </div>
  )
}

export { WASMIntegrationExample }