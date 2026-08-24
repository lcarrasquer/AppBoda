import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getGoogleMapsUrl(location?: string | null): string {
  if (!location || !location.trim()) return ''
  const trimmed = location.trim()
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trimmed)}`
}

export function getLocationDisplayName(location?: string | null): string {
  if (!location || !location.trim()) return ''
  const trimmed = location.trim()
  const placeMatch = trimmed.match(/\/place\/([^/@]+)/i)
  if (placeMatch && placeMatch[1]) {
    try {
      return decodeURIComponent(placeMatch[1].replace(/\+/g, ' '))
    } catch {
      return placeMatch[1]
    }
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return 'Ver ubicación en Google Maps'
  }
  return trimmed
}

export function getGoogleMapsEmbedUrl(location?: string | null): string {
  if (!location || !location.trim()) return ''
  const trimmed = location.trim()
  let query = trimmed

  const placeMatch = trimmed.match(/\/place\/([^/@]+)/i)
  if (placeMatch && placeMatch[1]) {
    try {
      query = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '))
    } catch {
      query = placeMatch[1]
    }
  } else {
    const coordMatch = trimmed.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
    if (coordMatch) {
      query = `${coordMatch[1]},${coordMatch[2]}`
    }
  }

  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&t=&z=15&ie=UTF8&iwloc=&output=embed`
}

export function parseScheduleLocation(item?: { description?: string | null } | string | null): { location: string; notes: string } {
  if (!item) return { location: '', notes: '' }
  const text = typeof item === 'string' ? item.trim() : (item.description || '').trim()
  if (!text) return { location: '', notes: '' }

  if (text.startsWith('{') && text.endsWith('}')) {
    try {
      const parsed = JSON.parse(text)
      return {
        location: (parsed.location || '').trim(),
        notes: (parsed.notes || '').trim()
      }
    } catch {
      // ignore
    }
  }

  if (text.startsWith('📍 ')) {
    const parts = text.substring(2).trim().split('\n')
    return {
      location: parts[0]?.trim() || '',
      notes: parts.slice(1).join('\n').trim()
    }
  }

  const pipeParts = text.split(' | ')
  if (pipeParts.length === 2 && (pipeParts[0].includes('Finca') || pipeParts[0].includes('Castell') || pipeParts[0].includes('Iglesia') || pipeParts[0].includes('Jardín') || pipeParts[0].includes('Salón') || pipeParts[0].includes('Terraza'))) {
    return { location: pipeParts[0].trim(), notes: pipeParts[1].trim() }
  }

  // Otherwise return full text as location if it looks like a place, or notes
  return { location: text, notes: '' }
}

export function formatScheduleDescription(location?: string, notes?: string): string {
  const loc = (location || '').trim()
  const n = (notes || '').trim()
  if (loc && n) {
    return JSON.stringify({ location: loc, notes: n })
  }
  if (loc) {
    return JSON.stringify({ location: loc, notes: '' })
  }
  return n
}



