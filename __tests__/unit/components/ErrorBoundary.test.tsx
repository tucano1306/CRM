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
    process.env.NODE_ENV = 'development'

    const ThrowError = () => {
      throw new Error('Detailed test error')
    }

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )

    expect(screen.getByText(/detailed test error/i)).toBeInTheDocument()

    process.env.NODE_ENV = originalEnv
  })

  it('shows reload button', () => {
    const ThrowError = () => {
      throw new Error('Test error')
    }

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )

    const reloadButton = screen.getByRole('button', { name: /recargar/i })
    expect(reloadButton).toBeInTheDocument()
  })
})
