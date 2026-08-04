'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface EventNavProps {
  eventId: string
  photosEnabled: boolean
  kahootEnabled: boolean
}

export function EventNav({ eventId, photosEnabled, kahootEnabled }: EventNavProps) {
  const pathname = usePathname()

  const navItems = [
    {
      name: 'Ajustes',
      href: `/dashboard/${eventId}/settings`,
      isActive: pathname === `/dashboard/${eventId}/settings`
    },
    {
      name: 'Módulos',
      href: `/dashboard/${eventId}/modules`,
      isActive: pathname === `/dashboard/${eventId}/modules`
    }
  ]

  if (photosEnabled) {
    navItems.push({
      name: 'Config Fotos',
      href: `/dashboard/${eventId}/photos-config`,
      isActive: pathname === `/dashboard/${eventId}/photos-config`
    })
  }

  if (kahootEnabled) {
    navItems.push({
      name: 'Config Kahoot',
      href: `/dashboard/${eventId}/kahoot-config`,
      isActive: pathname === `/dashboard/${eventId}/kahoot-config`
    })
  }

  return (
    <nav className="flex items-center space-x-4 border-b pb-2 overflow-x-auto">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            'text-sm font-medium transition-colors hover:text-primary whitespace-nowrap',
            item.isActive ? 'text-primary border-b-2 border-primary pb-2 -mb-[9px]' : 'text-muted-foreground'
          )}
        >
          {item.name}
        </Link>
      ))}
    </nav>
  )
}
