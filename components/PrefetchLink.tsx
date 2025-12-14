// components/PrefetchLink.tsx
'use client'

import { useRouter } from 'next/navigation'

interface PrefetchLinkProps {
  readonly href: string
  readonly children: React.ReactNode
  readonly className?: string
  readonly onMouseEnter?: () => void
}

export function PrefetchLink({ 
  href, 
  children, 
  className,
  onMouseEnter 
}: PrefetchLinkProps) {
  const router = useRouter()

  const handleMouseEnter = () => {
    router.prefetch(href)
    onMouseEnter?.()
  }

  return (
    <a
      href={href}
      className={className}
      onMouseEnter={handleMouseEnter}
      onClick={(e) => {
        e.preventDefault()
        router.push(href)
      }}
    >
      {children}
    </a>
  )
}

// Ejemplo de uso:
/*
import { PrefetchLink } from '@/components/PrefetchLink'

// Link con prefetch on hover:
<PrefetchLink href="/orders/123" className="text-blue-600 hover:underline">
  Ver Orden #123
</PrefetchLink>

// Con acción personalizada:
<PrefetchLink 
  href="/products/456"
  className="btn btn-primary"
  onMouseEnter={() => console.log('Prefetching product...')}
>
  Ver Producto
</PrefetchLink>
*/
