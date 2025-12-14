'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

type RevenueData = {
  date: string
  ingresos: number
  ordenes: number
}

type RevenueChartProps = {
  readonly data: RevenueData[]
  readonly period: '7d' | '30d'
}

export default function RevenueChart({ data, period }: RevenueChartProps) {
  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString()}`
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('es-ES', { 
      month: 'short', 
      day: 'numeric' 
    })
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">
            📈 Tendencia de Ingresos
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {period === '7d' ? 'Últimos 7 días' : 'Últimos 30 días'}
          </p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="date" 
            tickFormatter={formatDate}
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            tickFormatter={formatCurrency}
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <Tooltip 
            formatter={(value: number, name: string) => {
              if (name === 'ingresos') return [formatCurrency(value), 'Ingresos']
              return [value, 'Órdenes']
            }}
            labelFormatter={formatDate}
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '8px 12px'
            }}
          />
          <Legend 
            formatter={(value) => value === 'ingresos' ? 'Ingresos' : 'Órdenes'}
          />
          <Line 
            type="monotone" 
            dataKey="ingresos" 
            stroke="#10b981" 
            strokeWidth={3}
            dot={{ fill: '#10b981', r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line 
            type="monotone" 
            dataKey="ordenes" 
            stroke="#3b82f6" 
            strokeWidth={2}
            dot={{ fill: '#3b82f6', r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>

      {data.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No hay datos suficientes para mostrar el gráfico
        </div>
      )}
    </div>
  )
}
