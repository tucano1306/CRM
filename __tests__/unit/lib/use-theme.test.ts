/// <reference types="jest" />
import { renderHook, act } from '@testing-library/react'
import { useTheme } from '@/lib/use-theme'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    }
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: query === '(prefers-color-scheme: dark)',
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock document.documentElement
const mockClassList = {
  add: jest.fn(),
  remove: jest.fn(),
  contains: jest.fn(),
  toggle: jest.fn(),
}

Object.defineProperty(window.document, 'documentElement', {
  value: {
    classList: mockClassList
  },
  writable: true
})

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear()
    mockClassList.add.mockClear()
    mockClassList.remove.mockClear()
    jest.clearAllMocks()
  })

  describe('Initial state', () => {
    it('should initialize with system theme and set mounted to true', async () => {
      const { result } = renderHook(() => useTheme())
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })
      
      expect(result.current.theme).toBe('system')
      expect(result.current.mounted).toBe(true)
    })

    it('should set mounted to true after mount', async () => {
      const { result, rerender } = renderHook(() => useTheme())
      
      // Wait for useEffect to run
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })
      
      rerender()
      expect(result.current.mounted).toBe(true)
    })

    it('should load theme from localStorage if available', async () => {
      localStorage.setItem('theme', 'dark')
      
      const { result } = renderHook(() => useTheme())
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })
      
      expect(result.current.theme).toBe('dark')
    })

    it('should use system theme if localStorage is empty', async () => {
      const { result } = renderHook(() => useTheme())
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })
      
      expect(result.current.theme).toBe('system')
    })
  })

  describe('applyTheme', () => {
    it('should apply light theme to document', async () => {
      const { result } = renderHook(() => useTheme())
      
      await act(async () => {
        result.current.setTheme('light')
      })
      
      expect(mockClassList.remove).toHaveBeenCalledWith('light', 'dark')
      expect(mockClassList.add).toHaveBeenCalledWith('light')
    })

    it('should apply dark theme to document', async () => {
      const { result } = renderHook(() => useTheme())
      
      await act(async () => {
        result.current.setTheme('dark')
      })
      
      expect(mockClassList.remove).toHaveBeenCalledWith('light', 'dark')
      expect(mockClassList.add).toHaveBeenCalledWith('dark')
    })

    it('should apply system theme based on media query', async () => {
      // Mock prefers dark mode
      window.matchMedia = jest.fn().mockImplementation(query => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }))

      const { result } = renderHook(() => useTheme())
      
      await act(async () => {
        result.current.setTheme('system')
      })
      
      expect(mockClassList.remove).toHaveBeenCalledWith('light', 'dark')
      expect(mockClassList.add).toHaveBeenCalledWith('dark')
    })

    it('should apply light system theme when not dark mode', async () => {
      // Mock prefers light mode
      window.matchMedia = jest.fn().mockImplementation(() => ({
        matches: false,
        media: '',
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }))

      const { result } = renderHook(() => useTheme())
      
      await act(async () => {
        result.current.setTheme('system')
      })
      
      expect(mockClassList.add).toHaveBeenCalledWith('light')
    })
  })

  describe('changeTheme', () => {
    it('should update theme state', async () => {
      const { result } = renderHook(() => useTheme())
      
      await act(async () => {
        result.current.setTheme('dark')
      })
      
      expect(result.current.theme).toBe('dark')
    })

    it('should save theme to localStorage', async () => {
      const { result } = renderHook(() => useTheme())
      
      await act(async () => {
        result.current.setTheme('dark')
      })
      
      expect(localStorage.getItem('theme')).toBe('dark')
    })

    it('should apply theme to document when changed', async () => {
      const { result } = renderHook(() => useTheme())
      
      await act(async () => {
        result.current.setTheme('light')
      })
      
      expect(mockClassList.add).toHaveBeenCalledWith('light')
    })

    it('should handle multiple theme changes', async () => {
      const { result } = renderHook(() => useTheme())
      
      await act(async () => {
        result.current.setTheme('dark')
      })
      expect(result.current.theme).toBe('dark')
      expect(localStorage.getItem('theme')).toBe('dark')
      
      await act(async () => {
        result.current.setTheme('light')
      })
      expect(result.current.theme).toBe('light')
      expect(localStorage.getItem('theme')).toBe('light')
      
      await act(async () => {
        result.current.setTheme('system')
      })
      expect(result.current.theme).toBe('system')
      expect(localStorage.getItem('theme')).toBe('system')
    })
  })

  describe('Edge cases', () => {
    it('should handle invalid localStorage value gracefully', async () => {
      localStorage.setItem('theme', 'invalid' as any)
      
      const { result } = renderHook(() => useTheme())
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })
      
      // Should fall back to the stored value
      expect(result.current.theme).toBe('invalid')
    })

    it('should remove old classes before adding new one', async () => {
      const { result } = renderHook(() => useTheme())
      
      await act(async () => {
        result.current.setTheme('dark')
      })
      
      expect(mockClassList.remove).toHaveBeenCalledWith('light', 'dark')
      expect(mockClassList.add).toHaveBeenCalledWith('dark')
    })
  })
})
