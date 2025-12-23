'use client'

import React from 'react'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import { cn } from '@/lib/utils'

type AnimationType = 'fade-up' | 'fade' | 'scale' | 'slide-left' | 'slide-right' | '3d-float'

interface ScrollRevealProps {
  readonly children: React.ReactNode
  readonly animation?: AnimationType
  readonly delay?: number
  readonly duration?: number
  readonly className?: string
  readonly once?: boolean
  readonly threshold?: number
}

const animationClasses: Record<AnimationType, { initial: string; visible: string }> = {
  'fade-up': {
    initial: 'opacity-0 translate-y-8',
    visible: 'opacity-100 translate-y-0',
  },
  'fade': {
    initial: 'opacity-0',
    visible: 'opacity-100',
  },
  'scale': {
    initial: 'opacity-0 scale-95',
    visible: 'opacity-100 scale-100',
  },
  'slide-left': {
    initial: 'opacity-0 -translate-x-12',
    visible: 'opacity-100 translate-x-0',
  },
  'slide-right': {
    initial: 'opacity-0 translate-x-12',
    visible: 'opacity-100 translate-x-0',
  },
  '3d-float': {
    initial: 'opacity-0 translate-y-4 rotate-x-12',
    visible: 'opacity-100 translate-y-0 rotate-x-0',
  },
}

/**
 * ScrollReveal - Wrapper component for scrollytelling animations
 * 
 * Usage:
 * <ScrollReveal animation="fade-up" delay={200}>
 *   <YourComponent />
 * </ScrollReveal>
 */
export function ScrollReveal({
  children,
  animation = 'fade-up',
  delay = 0,
  duration = 700,
  className,
  once = true,
  threshold = 0.1,
}: ScrollRevealProps) {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>({ threshold, once })
  const { initial, visible } = animationClasses[animation]

  return (
    <div
      ref={ref}
      className={cn(
        'transition-all ease-out',
        isVisible ? visible : initial,
        className
      )}
      style={{
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  )
}

/**
 * GlassCard - A beautiful glass morphism card with 3D effects
 */
interface GlassCardProps {
  readonly children: React.ReactNode
  readonly className?: string
  readonly hover3D?: boolean
  readonly glow?: boolean
}

export function GlassCard({ children, className, hover3D = true, glow = false }: GlassCardProps) {
  return (
    <div
      className={cn(
        'glass-card rounded-3xl p-6 border border-pastel-beige-200/50',
        hover3D && 'glass-card-hover card-3d',
        glow && 'pulse-ring',
        className
      )}
    >
      {children}
    </div>
  )
}

/**
 * PastelGradientText - Gradient text with pastel colors
 */
interface PastelGradientTextProps {
  readonly children: React.ReactNode
  readonly className?: string
  readonly as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span'
}

export function PastelGradientText({ 
  children, 
  className, 
  as: Component = 'span' 
}: PastelGradientTextProps) {
  return (
    <Component className={cn('gradient-text-pastel', className)}>
      {children}
    </Component>
  )
}

/**
 * FloatingElement - Element with subtle floating animation
 */
interface FloatingElementProps {
  readonly children: React.ReactNode
  readonly className?: string
  readonly intensity?: 'subtle' | 'medium' | 'strong'
}

export function FloatingElement({ 
  children, 
  className,
  intensity = 'medium' 
}: FloatingElementProps) {
  const intensityClass = {
    subtle: 'animate-[float3d_8s_ease-in-out_infinite]',
    medium: 'float-3d',
    strong: 'animate-[float3d_4s_ease-in-out_infinite]',
  }[intensity]

  return (
    <div className={cn(intensityClass, className)}>
      {children}
    </div>
  )
}

/**
 * BlobBackground - Animated blob background decorator
 */
export function BlobBackground({ className }: Readonly<{ className?: string }>) {
  return (
    <div className={cn('blob-bg absolute inset-0 -z-10 overflow-hidden', className)}>
      <div className="absolute top-0 -left-4 w-72 h-72 bg-pastel-blue-200/40 rounded-full blur-3xl animate-[blobMove1_20s_ease-in-out_infinite]" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-pastel-beige-200/50 rounded-full blur-3xl animate-[blobMove2_25s_ease-in-out_infinite]" />
      <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-pastel-cream-200/30 rounded-full blur-3xl animate-[blobMove1_15s_ease-in-out_infinite_reverse]" />
    </div>
  )
}

/**
 * DepthShadowCard - Card with multi-layer depth shadow
 */
interface DepthShadowCardProps {
  readonly children: React.ReactNode
  readonly className?: string
  readonly depth?: 'sm' | 'md' | 'lg'
}

export function DepthShadowCard({ children, className, depth = 'md' }: DepthShadowCardProps) {
  const depthClass = {
    sm: 'shadow-soft',
    md: 'depth-shadow',
    lg: 'depth-shadow-lg',
  }[depth]

  return (
    <div className={cn(
      'bg-card rounded-2xl p-6 border border-pastel-beige-200/30',
      depthClass,
      className
    )}>
      {children}
    </div>
  )
}

export default ScrollReveal
