import React from 'react'
import { render, screen } from '@testing-library/react'
import { Badge } from '@/components/ui/badge'

describe('Badge Component', () => {
  it('should render badge with text', () => {
    render(<Badge>Test Badge</Badge>)
    
    expect(screen.getByText('Test Badge')).toBeInTheDocument()
  })

  it('should apply default variant styles', () => {
    const { container } = render(<Badge>Default</Badge>)
    const badge = container.firstChild as HTMLElement

    expect(badge.className).toContain('border-transparent')
    expect(badge.className).toContain('bg-primary')
  })

  it('should apply secondary variant', () => {
    const { container } = render(<Badge variant="secondary">Secondary</Badge>)
    const badge = container.firstChild as HTMLElement

    expect(badge.className).toContain('bg-secondary')
  })

  it('should apply destructive variant', () => {
    const { container } = render(<Badge variant="destructive">Destructive</Badge>)
    const badge = container.firstChild as HTMLElement

    expect(badge.className).toContain('bg-destructive')
  })

  it('should apply outline variant', () => {
    const { container } = render(<Badge variant="outline">Outline</Badge>)
    const badge = container.firstChild as HTMLElement

    expect(badge.className).toContain('text-foreground')
  })

  it('should accept and merge custom className', () => {
    const { container } = render(<Badge className="custom-class">Badge</Badge>)
    const badge = container.firstChild as HTMLElement

    expect(badge.className).toContain('custom-class')
    expect(badge.className).toContain('inline-flex')
  })

  it('should forward additional props', () => {
    render(<Badge data-testid="custom-badge" id="test-badge">Badge</Badge>)
    
    const badge = screen.getByTestId('custom-badge')
    expect(badge).toHaveAttribute('id', 'test-badge')
  })

  it('should render as a div element', () => {
    const { container } = render(<Badge>Badge</Badge>)
    const badge = container.firstChild as HTMLElement

    expect(badge.tagName).toBe('DIV')
  })
})
