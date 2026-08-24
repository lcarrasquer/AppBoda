'use client'

import Image from 'next/image'
import Link from 'next/link'

interface AppLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showText?: boolean
  href?: string
  className?: string
  textClassName?: string
}

export function AppLogo({
  size = 'md',
  showText = true,
  href,
  className = '',
  textClassName = ''
}: AppLogoProps) {
  const sizeMap = {
    sm: { icon: 26, wrapper: 'w-7 h-7 rounded-lg p-0.5', text: 'text-lg' },
    md: { icon: 34, wrapper: 'w-9 h-9 rounded-xl p-1', text: 'text-xl' },
    lg: { icon: 44, wrapper: 'w-12 h-12 rounded-2xl p-1.5', text: 'text-2xl' },
    xl: { icon: 60, wrapper: 'w-16 h-16 rounded-3xl p-2', text: 'text-3xl' }
  }

  const { icon, wrapper, text } = sizeMap[size] || sizeMap.md

  const content = (
    <div className={`flex items-center gap-2.5 group select-none ${className}`}>
      <div className={`${wrapper} bg-white dark:bg-slate-900/90 shadow-md shadow-amber-500/10 border border-amber-500/20 group-hover:border-amber-500/40 group-hover:scale-105 transition-all duration-300 flex items-center justify-center overflow-hidden shrink-0`}>
        <Image
          src="/app-logo.png"
          alt="AppBoda Logo"
          width={icon}
          height={icon}
          className="w-full h-full object-contain rounded-[inherit]"
          priority
        />
      </div>

      {showText && (
        <span className={`font-extrabold tracking-tight bg-gradient-to-r from-amber-600 via-rose-500 to-amber-500 bg-clip-text text-transparent group-hover:opacity-90 transition-opacity ${text} ${textClassName}`}>
          AppBoda
        </span>
      )}
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center">
        {content}
      </Link>
    )
  }

  return content
}
