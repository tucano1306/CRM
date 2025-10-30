// @ts-nocheck
import { render, screen } from '@testing-library/react'
import ErrorBoundary from '@/components/ErrorBoundary'

describe('ErrorBoundary Component', () => {
  // Suppress console.error for these tests
  const originalError = console.error
  beforeAll(() => {
    console.error = jest.fn()
  })
  afterAll(() => {
    console.error = originalError
  })

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test Content</div>
      </ErrorBoundary>
    )

    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('renders error UI when there is an error', () => {
    const ThrowError = () => {
      throw new Error('Test error')
    }

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )

    expect(screen.getByText(/algo salió mal/i)).toBeInTheDocument()
  })

  it('displays error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV
    // Fuerza entorno de desarrollo para mostrar detalles
    // Nota: usamos defineProperty para evitar problemas de readonly
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'development' })

    const ThrowError = () => {
      throw new Error('Detailed test error')
    }

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )

    expect(screen.getByText(/detailed test error/i)).toBeInTheDocument()

    // Restaurar
    Object.defineProperty(process.env, 'NODE_ENV', { value: originalEnv })
  })

  it('shows retry button', () => {
    const ThrowError = () => {
      throw new Error('Test error')
    }

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )

    // El botón en la UI dice "Reintentar"
    const retryButton = screen.getByRole('button', { name: /reintentar/i })
    expect(retryButton).toBeInTheDocument()
  })
})

describe('User Role Debugging', () => {
  it('fetches user role from debug API', async () => {
    const response = await fetch('http://localhost:3000/api/debug/user-role')
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveProperty('role')
  })
})
