'use client'

import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon, Laptop } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ThemeToggleProps {
  variant?: 'ghost' | 'outline' | 'default'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
  showLabel?: boolean
}

export function ThemeToggle({
  variant = 'ghost',
  size = 'icon',
  className = '',
  showLabel = false,
}: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button
        variant={variant}
        size={size}
        className={`relative rounded-xl cursor-pointer ${className}`}
        aria-label="Cambiar tema"
        disabled
      >
        <Sun className="w-5 h-5 opacity-40" />
      </Button>
    )
  }

  const isDark = resolvedTheme === 'dark'

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark')
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={toggleTheme}
      className={`relative rounded-xl transition-all duration-300 cursor-pointer group hover:bg-muted/80 ${className}`}
      title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      aria-label="Alternar modo claro y oscuro"
    >
      <div className="relative flex items-center justify-center">
        <Sun className={`w-5 h-5 transition-all duration-500 text-amber-500 ${
          isDark ? 'rotate-90 scale-0 opacity-0 absolute' : 'rotate-0 scale-100 opacity-100'
        }`} />
        <Moon className={`w-5 h-5 transition-all duration-500 text-sky-400 ${
          isDark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0 absolute'
        }`} />
      </div>
      {showLabel && (
        <span className="ml-2 text-xs font-semibold">
          {isDark ? 'Modo Oscuro' : 'Modo Claro'}
        </span>
      )}
    </Button>
  )
}
