'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface UseScrollRevealOptions {
  threshold?: number
  rootMargin?: string
  once?: boolean
}

/**
 * Hook for scrollytelling reveal animations
 * Reveals elements as they enter the viewport
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  options: UseScrollRevealOptions = {}
) {
  const { threshold = 0.1, rootMargin = '0px', once = true } = options
  const ref = useRef<T>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          if (once) {
            observer.unobserve(element)
          }
        } else if (!once) {
          setIsVisible(false)
        }
      },
      { threshold, rootMargin }
    )

    observer.observe(element)

    return () => {
      observer.unobserve(element)
    }
  }, [threshold, rootMargin, once])

  return { ref, isVisible }
}

/**
 * Hook for staggered reveal animations on multiple elements
 */
export function useStaggeredReveal(itemCount: number, baseDelay: number = 100) {
  const [visibleItems, setVisibleItems] = useState<Set<number>>(new Set())
  const containerRef = useRef<HTMLDivElement>(null)

  const revealItem = useCallback((index: number) => {
    setVisibleItems(prev => new Set([...prev, index]))
  }, [])

  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[], observer: IntersectionObserver) => {
      const [entry] = entries
      if (!entry.isIntersecting) return
      
      // Stagger the reveal of each item
      for (let i = 0; i < itemCount; i++) {
        setTimeout(() => revealItem(i), i * baseDelay)
      }
      observer.unobserve(entry.target)
    },
    [itemCount, baseDelay, revealItem]
  )

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new IntersectionObserver(handleIntersection, { threshold: 0.1 })
    observer.observe(container)

    return () => observer.disconnect()
  }, [handleIntersection])

  const isItemVisible = useCallback(
    (index: number) => visibleItems.has(index),
    [visibleItems]
  )

  return { containerRef, isItemVisible, visibleItems }
}

/**
 * Hook for parallax scroll effects
 */
export function useParallax(speed: number = 0.5) {
  const ref = useRef<HTMLDivElement>(null)
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      if (!ref.current) return
      const rect = ref.current.getBoundingClientRect()
      const scrolled = window.scrollY
      const elementTop = rect.top + scrolled
      const relativeScroll = scrolled - elementTop + window.innerHeight
      setOffset(relativeScroll * speed)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()

    return () => window.removeEventListener('scroll', handleScroll)
  }, [speed])

  return { ref, offset, style: { transform: `translateY(${offset}px)` } }
}

/**
 * Hook for progress-based scroll animations
 */
export function useScrollProgress() {
  const [progress, setProgress] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => {
      if (!ref.current) return
      const rect = ref.current.getBoundingClientRect()
      const windowHeight = window.innerHeight
      const elementHeight = rect.height
      
      // Calculate how much of the element is visible
      const visibleTop = Math.max(0, windowHeight - rect.top)
      const visibleBottom = Math.max(0, rect.bottom)
      const totalVisible = Math.min(visibleTop, visibleBottom, elementHeight)
      
      const progressValue = Math.min(1, Math.max(0, totalVisible / elementHeight))
      setProgress(progressValue)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()

    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return { ref, progress }
}
