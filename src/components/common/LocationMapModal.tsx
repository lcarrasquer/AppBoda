'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { MapPin, Navigation, ExternalLink, Copy, Check, X } from 'lucide-react'
import { getGoogleMapsUrl, getGoogleMapsEmbedUrl, getLocationDisplayName } from '@/lib/utils'
import { toast } from 'sonner'

interface LocationMapModalProps {
  isOpen: boolean
  onClose: () => void
  location: string
  eventName?: string
}

export function LocationMapModal({
  isOpen,
  onClose,
  location,
  eventName
}: LocationMapModalProps) {
  const [copied, setCopied] = useState(false)

  if (!isOpen || !location) return null

  const mapsUrl = getGoogleMapsUrl(location)
  const embedUrl = getGoogleMapsEmbedUrl(location)
  const displayName = getLocationDisplayName(location)

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(displayName || location)
    setCopied(true)
    toast.success('Dirección copiada al portapapeles 📋')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div 
      className="fixed inset-0 z-[999] bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl bg-card/95 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border/50 flex items-center justify-between gap-3 bg-muted/30">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0 border border-emerald-500/20">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-extrabold text-base sm:text-lg text-foreground truncate">
                {eventName ? `Ubicación: ${eventName}` : 'Ubicación del evento'}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground truncate font-medium">
                {displayName}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors shrink-0"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Map Body */}
        <div className="relative w-full h-72 sm:h-96 bg-muted/40 overflow-hidden">
          <iframe
            title="Mapa del evento"
            src={embedUrl}
            className="w-full h-full border-0"
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-border/50 bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopyAddress}
            className="w-full sm:w-auto text-xs font-semibold gap-1.5 rounded-xl bg-white/50 dark:bg-slate-800/50"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? '¡Copiado!' : 'Copiar dirección'}</span>
          </Button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-xs font-semibold rounded-xl"
            >
              Cerrar
            </Button>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto"
            >
              <Button
                type="button"
                size="sm"
                className="w-full font-bold text-xs gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md hover:opacity-95"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Cómo llegar (Google Maps)</span>
                <ExternalLink className="w-3 h-3 opacity-70" />
              </Button>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
