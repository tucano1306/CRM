'use client'

import { Button } from '@/components/ui/button'
import { Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from '@/lib/use-theme'

function getThemeLabel(theme: string): string {
  if (theme === 'system') return 'Sistema';
  if (theme === 'light') return 'Claro';
  return 'Oscuro';
}

export default function ThemeToggle() {
  const { theme, setTheme, mounted } = useTheme()

  if (!mounted) {
    return <div className="w-9 h-9" /> // Placeholder to prevent layout shift
  }

  const cycleTheme = () => {
    if (theme === 'light') {
      setTheme('dark')
    } else if (theme === 'dark') {
      setTheme('system')
    } else {
      setTheme('light')
    }
  }

  const getIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun className="h-4 w-4" />
      case 'dark':
        return <Moon className="h-4 w-4" />
      case 'system':
        return <Monitor className="h-4 w-4" />
      default:
        return <Sun className="h-4 w-4" />
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={cycleTheme}
      className="w-9 h-9 p-0 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
      title={`Tema actual: ${getThemeLabel(theme)}`}
    >
      {getIcon()}
    </Button>
  )
}