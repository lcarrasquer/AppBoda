'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import QRCode from 'qrcode'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  FileDown,
  Share2,
  Loader2,
  Sparkles, 
  QrCode, 
  Heart, 
  MapPin, 
  Calendar, 
  Clock, 
  Lock, 
  Check, 
  Layers, 
  FileText, 
  Scissors,
  ExternalLink,
  Maximize2
} from 'lucide-react'
import { toast } from 'sonner'
import { getGoogleMapsUrl } from '@/lib/utils'
import { LocationAutocomplete } from '@/components/common/LocationAutocomplete'
import { LocationMapModal } from '@/components/common/LocationMapModal'

interface InvitationDesignerProps {
  event: any
  modules: any[]
}

type TemplateStyle = 'classic_gold' | 'botanical_sage' | 'blush_romance' | 'modern_minimal' | 'midnight_gala'
type CardFormat = 'card_a5' | 'table_cards_4' | 'poster_welcome'

const TEMPLATES: { id: TemplateStyle; name: string; description: string; previewBg: string; border: string }[] = [
  { 
    id: 'classic_gold', 
    name: 'Elegancia Clásica', 
    description: 'Oro champán sobre marfil con marco ornamental',
    previewBg: 'bg-[#FCFBF7] text-[#4A3B2C]',
    border: 'border-[#D4AF37]'
  },
  { 
    id: 'botanical_sage', 
    name: 'Botánica & Olivo', 
    description: 'Tonos verde salvia, fresco y natural',
    previewBg: 'bg-[#F7F9F6] text-[#2D3A30]',
    border: 'border-[#2D6A4F]'
  },
  { 
    id: 'blush_romance', 
    name: 'Romance Floral', 
    description: 'Rosa empolvado, blush y acentos de amor',
    previewBg: 'bg-[#FFF9F9] text-[#4A2E35]',
    border: 'border-[#E0A899]'
  },
  { 
    id: 'modern_minimal', 
    name: 'Minimalista Chic', 
    description: 'Diseño limpio, tipografía contemporánea y contrastes',
    previewBg: 'bg-white text-slate-900',
    border: 'border-slate-900'
  },
  { 
    id: 'midnight_gala', 
    name: 'Gala Nocturna', 
    description: 'Azul noche profundo con destellos dorados',
    previewBg: 'bg-[#0F172A] text-slate-100',
    border: 'border-amber-400'
  }
]

export function InvitationDesigner({ event, modules }: InvitationDesignerProps) {
  const [template, setTemplate] = useState<TemplateStyle>('classic_gold')
  const [format, setFormat] = useState<CardFormat>('card_a5')
  
  // Custom texts
  const [headline, setHeadline] = useState('¡Nos Casamos!')
  const [brideName, setBrideName] = useState(event.bride_name || '')
  const [groomName, setGroomName] = useState(event.groom_name || '')
  const [invitationMessage, setInvitationMessage] = useState(
    'Queremos compartir con vosotros el día más especial de nuestras vidas. ¡Acompáñanos a celebrar nuestro amor!'
  )
  const [eventDate, setEventDate] = useState(
    event.event_date ? new Date(event.event_date).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Fecha del evento'
  )
  const [eventTime, setEventTime] = useState('12:30h')
  const [location, setLocation] = useState(event.location || '')
  const [rsvpText, setRsvpText] = useState('Se ruega confirmación de asistencia')
  
  // Feature flags in invitation
  const [showPin, setShowPin] = useState(Boolean(event.pin_enabled))
  const [showFeaturesList, setShowFeaturesList] = useState(true)
  const [showRsvp, setShowRsvp] = useState(true)
  const [showMapModal, setShowMapModal] = useState(false)
  
  // QR state
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('')
  const [joinUrl, setJoinUrl] = useState<string>('')

  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Generate QR Code on mount and when slug changes
  useEffect(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://weddingapp.com'
    const fullJoinUrl = `${origin}/e/${event.slug}`
    setJoinUrl(fullJoinUrl)

    QRCode.toDataURL(fullJoinUrl, {
      width: 450,
      margin: 1,
      color: {
        dark: template === 'midnight_gala' ? '#000000' : '#1e293b',
        light: '#ffffff'
      }
    }).then(url => {
      setQrCodeDataUrl(url)
    }).catch(err => {
      console.error('Error generating QR code:', err)
    })
  }, [event.slug, template])

  // PDF generation state
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)

  // Download / Print PDF function
  const handleDownloadPdf = () => {
    window.print()
  }

  // Share PDF function
  const handleSharePdf = async () => {
    try {
      setIsGeneratingPdf(true)
      toast.info('Preparando PDF para compartir... ⏳')

      const element = document.getElementById('print-invitation-area')
      if (!element) {
        window.print()
        return
      }

      const html2pdf = (await import('html2pdf.js')).default
      const opt = {
        margin: 0,
        filename: `Invitacion-Boda-${event.slug}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
      }

      const pdfBlob = await html2pdf().from(element).set(opt).output('blob')
      const pdfFile = new File([pdfBlob], `Invitacion-Boda-${event.slug}.pdf`, { type: 'application/pdf' })

      if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          title: `Invitación de Boda - ${brideName} y ${groomName}`,
          text: `💌 ¡Estás invitado a la boda de ${brideName} y ${groomName}! Aquí tienes la invitación en PDF con el código QR.`,
          files: [pdfFile]
        })
        toast.success('¡PDF compartido con éxito! 📲')
      } else if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({
          title: `Invitación de Boda - ${brideName} y ${groomName}`,
          text: `💌 ¡Estás invitado a la boda de ${brideName} y ${groomName}!\n\nEntra en la app interactiva de la boda: ${joinUrl}`,
          url: joinUrl
        })
      } else {
        await html2pdf().from(element).set(opt).save()
        toast.success('PDF descargado. Ya puedes adjuntarlo y enviarlo por WhatsApp o email 📄')
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Error sharing PDF:', err)
        handleDownloadPdf()
      }
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  // Style helpers based on selected template
  const getTemplateStyles = () => {
    switch (template) {
      case 'botanical_sage':
        return {
          cardBg: 'bg-[#F7F9F6] border-[#2D6A4F]/40',
          innerBorder: 'border-[#2D6A4F]/30',
          textColor: 'text-[#243329]',
          mutedText: 'text-[#4A5D50]',
          accentText: 'text-[#2D6A4F]',
          infoBoxBg: 'bg-[#2D6A4F]/[0.06]',
          infoBoxBorder: 'border-[#2D6A4F]/25',
          dateColor: 'text-[#243329]',
          locationBadge: 'bg-[#2D6A4F]/15 text-[#1B4D39] border-[#2D6A4F]/30',
          featureBadge: 'bg-[#2D6A4F]/10 text-[#1B4D39] border-[#2D6A4F]/20',
          divider: 'bg-[#2D6A4F]/30',
          fontSerif: 'font-serif',
          ornament: '🌿'
        }
      case 'blush_romance':
        return {
          cardBg: 'bg-[#FFF9FA] border-[#E0A899]',
          innerBorder: 'border-[#E0A899]/50',
          textColor: 'text-[#4A2E35]',
          mutedText: 'text-[#7A505A]',
          accentText: 'text-[#C86477]',
          infoBoxBg: 'bg-[#C86477]/[0.06]',
          infoBoxBorder: 'border-[#E0A899]/40',
          dateColor: 'text-[#4A2E35]',
          locationBadge: 'bg-[#C86477]/15 text-[#8C3446] border-[#C86477]/30',
          featureBadge: 'bg-[#C86477]/10 text-[#8C3446] border-[#C86477]/20',
          divider: 'bg-[#E0A899]/50',
          fontSerif: 'font-serif',
          ornament: '🌸'
        }
      case 'modern_minimal':
        return {
          cardBg: 'bg-white border-slate-300 shadow-sm',
          innerBorder: 'border-slate-200',
          textColor: 'text-slate-900',
          mutedText: 'text-slate-600',
          accentText: 'text-slate-950',
          infoBoxBg: 'bg-slate-100/70',
          infoBoxBorder: 'border-slate-200',
          dateColor: 'text-slate-900',
          locationBadge: 'bg-slate-100 text-slate-900 border-slate-300',
          featureBadge: 'bg-slate-100 text-slate-800 border-slate-200',
          divider: 'bg-slate-300',
          fontSerif: 'font-sans',
          ornament: '✨'
        }
      case 'midnight_gala':
        return {
          cardBg: 'bg-[#0B1329] border-amber-400/60 shadow-2xl',
          innerBorder: 'border-amber-400/40',
          textColor: 'text-slate-100',
          mutedText: 'text-slate-300',
          accentText: 'text-amber-300',
          infoBoxBg: 'bg-white/[0.08]',
          infoBoxBorder: 'border-amber-400/40',
          dateColor: 'text-white',
          locationBadge: 'bg-amber-400/20 text-amber-200 border-amber-400/40',
          featureBadge: 'bg-white/10 text-amber-200 border-white/20',
          divider: 'bg-amber-400/50',
          fontSerif: 'font-serif',
          ornament: '👑'
        }
      case 'classic_gold':
      default:
        return {
          cardBg: 'bg-[#FCFBF7] border-[#D4AF37]/50 shadow-sm',
          innerBorder: 'border-[#D4AF37]/40',
          textColor: 'text-[#3D3024]',
          mutedText: 'text-[#7A6452]',
          accentText: 'text-[#B88E18]',
          infoBoxBg: 'bg-[#D4AF37]/[0.08]',
          infoBoxBorder: 'border-[#D4AF37]/30',
          dateColor: 'text-[#3D3024]',
          locationBadge: 'bg-emerald-700/10 text-emerald-900 border-emerald-700/25',
          featureBadge: 'bg-[#D4AF37]/15 text-[#7A5B05] border-[#D4AF37]/25',
          divider: 'bg-[#D4AF37]/40',
          fontSerif: 'font-serif',
          ornament: '💍'
        }
    }
  }

  const s = getTemplateStyles()

  // 1. Render Full A5 Invitation Card
  const renderA5Card = () => {
    return (
      <div className={`relative w-full h-full flex flex-col justify-between rounded-2xl border-2 p-6 sm:p-8 text-center transition-all ${s.cardBg} ${s.innerBorder} ${s.textColor}`}>
        {/* Decorative corner accents */}
        <div className="absolute top-3 left-3 text-xs opacity-60 select-none">{s.ornament}</div>
        <div className="absolute top-3 right-3 text-xs opacity-60 select-none">{s.ornament}</div>
        <div className="absolute bottom-3 left-3 text-xs opacity-60 select-none">{s.ornament}</div>
        <div className="absolute bottom-3 right-3 text-xs opacity-60 select-none">{s.ornament}</div>

        {/* Top Header & Names (Prominent Hero) */}
        <div className="space-y-2.5 pt-2">
          <p className="text-xs sm:text-sm font-bold uppercase tracking-[0.3em] opacity-80">
            {headline}
          </p>

          <div className="py-1">
            <h2 className={`${s.fontSerif} text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-tight ${s.accentText}`}>
              {brideName} <span className="text-xl sm:text-2xl font-normal opacity-80">&</span> {groomName}
            </h2>
          </div>

          <div className={`w-20 h-0.5 mx-auto rounded-full ${s.divider}`} />

          {invitationMessage && (
            <p className={`text-xs sm:text-sm font-medium max-w-md mx-auto leading-relaxed pt-1.5 italic ${s.mutedText}`}>
              "{invitationMessage}"
            </p>
          )}
        </div>

        {/* Center: Prominent Date & Location Details */}
        <div className={`my-3 py-3 px-4 space-y-2 rounded-2xl border shadow-sm ${s.infoBoxBg} ${s.infoBoxBorder}`}>
          <div className={`flex items-center justify-center gap-2.5 text-sm sm:text-base font-bold flex-wrap ${s.dateColor}`}>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-primary shrink-0" />
              <span className="capitalize">{eventDate}</span>
            </div>
            <span className="opacity-50">•</span>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 opacity-80 shrink-0" />
              <span>{eventTime}</span>
            </div>
          </div>

          {location ? (
            <div className={`flex items-center justify-center gap-2 text-xs sm:text-sm font-bold px-3 py-1.5 rounded-xl border ${s.locationBadge}`}>
              <MapPin className="w-4 h-4 shrink-0" />
              <span className="break-words font-extrabold text-sm sm:text-base">{location}</span>
            </div>
          ) : null}
        </div>

        {/* Features Bullet Points (Highlights) */}
        {showFeaturesList && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px] sm:text-[11px] font-semibold py-1">
            <span className={`flex items-center justify-center gap-1 p-1 rounded-md border ${s.featureBadge}`}>
              📸 Fotos en directo
            </span>
            <span className={`flex items-center justify-center gap-1 p-1 rounded-md border ${s.featureBadge}`}>
              ⏰ Cronograma
            </span>
            <span className={`flex items-center justify-center gap-1 p-1 rounded-md border ${s.featureBadge}`}>
              🏆 Trivia Kahoot
            </span>
            <span className={`flex items-center justify-center gap-1 p-1 rounded-md border ${s.featureBadge}`}>
              ✍️ Libro de firmas
            </span>
          </div>
        )}

        {/* Sleek, Compact QR Box */}
        <div className="my-2 p-2.5 sm:p-3 rounded-xl bg-white text-slate-900 border border-slate-200/90 shadow-md flex items-center justify-between gap-3 text-left">
          <div className="p-1.5 bg-white rounded-lg border border-slate-200 shadow-inner shrink-0">
            {qrCodeDataUrl ? (
              <img 
                src={qrCodeDataUrl} 
                alt="Código QR de la boda" 
                className="w-16 h-16 sm:w-20 sm:h-20" 
              />
            ) : (
              <div className="w-16 h-16 flex items-center justify-center bg-slate-100 text-[10px] text-muted-foreground">
                QR
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 space-y-0.5">
            <p className="text-[11px] sm:text-xs font-bold text-slate-900 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
              <span>App Interactiva de la Boda</span>
            </p>
            <p className="text-[10px] sm:text-[11px] text-slate-600 leading-tight">
              Apunta con la cámara de tu móvil para subir fotos, consultar el cronograma y participar en los juegos en directo.
            </p>
            {showPin && event.pin_code && (
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-900 border border-amber-500/30 text-[10px] font-bold font-mono mt-0.5">
                <Lock className="w-2.5 h-2.5 text-amber-700" />
                <span>PIN: {event.pin_code}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer RSVP */}
        {showRsvp && rsvpText && (
          <div className={`pt-1 text-[11px] sm:text-xs font-medium ${s.mutedText}`}>
            {rsvpText}
          </div>
        )}
      </div>
    )
  }

  // 2. Render Compact Table Card / Minuta (Customized for 4 cards per A4 sheet)
  const renderTableMinutaCard = (isPrint: boolean = false) => {
    return (
      <div className={`relative w-full h-full flex flex-col justify-between rounded-xl border p-2.5 sm:p-3 text-center transition-all ${s.cardBg} ${s.innerBorder} ${s.textColor}`}>
        {/* Decorative corner accents */}
        <div className="absolute top-1 left-1 text-[8px] opacity-50 select-none">{s.ornament}</div>
        <div className="absolute top-1 right-1 text-[8px] opacity-50 select-none">{s.ornament}</div>
        <div className="absolute bottom-1 left-1 text-[8px] opacity-50 select-none">{s.ornament}</div>
        <div className="absolute bottom-1 right-1 text-[8px] opacity-50 select-none">{s.ornament}</div>

        {/* 1. Encabezado y Nombres Completos */}
        <div className="space-y-0.5 pt-0.5">
          <p className="text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.2em] opacity-80">
            {headline}
          </p>
          <h3 className={`${s.fontSerif} ${isPrint ? 'text-base sm:text-lg' : 'text-xs sm:text-sm'} font-extrabold tracking-tight leading-tight ${s.accentText}`}>
            {brideName} & {groomName}
          </h3>
          <div className={`w-8 h-0.5 mx-auto rounded-full ${s.divider}`} />
        </div>

        {/* 2. Información Completa de Fecha, Hora y Lugar */}
        <div className={`space-y-1 px-1.5 py-1 my-0.5 rounded-lg border ${s.infoBoxBg} ${s.infoBoxBorder}`}>
          <div className={`text-[8px] sm:text-[9.5px] font-bold flex items-center justify-center gap-1 flex-wrap leading-tight ${s.dateColor}`}>
            <Calendar className="w-2.5 h-2.5 shrink-0 text-primary" />
            <span className="capitalize">{eventDate}</span>
            <span className="opacity-50">•</span>
            <span>{eventTime}</span>
          </div>
          {location ? (
            <div className={`text-[8px] sm:text-[9.5px] font-bold px-1.5 py-0.5 rounded-md border flex items-center justify-center gap-1 leading-tight break-words ${s.locationBadge}`}>
              <MapPin className="w-2.5 h-2.5 shrink-0" />
              <span className="break-words font-extrabold">{location}</span>
            </div>
          ) : null}
        </div>

        {/* 3. Código QR Adaptativo en el espacio restante */}
        <div className="my-0.5 p-1.5 rounded-lg bg-white text-slate-900 border border-slate-200 shadow-sm flex items-center justify-center gap-2 text-left">
          <div className="p-0.5 bg-white rounded border border-slate-200 shrink-0">
            {qrCodeDataUrl ? (
              <img 
                src={qrCodeDataUrl} 
                alt="QR Minuta" 
                className={isPrint ? 'w-16 h-16' : 'w-11 h-11 sm:w-13 sm:h-13'} 
              />
            ) : (
              <div className="w-11 h-11 bg-slate-100 flex items-center justify-center text-[8px]">QR</div>
            )}
          </div>

          <div className="min-w-0 space-y-0.5">
            <p className="text-[8px] sm:text-[9px] font-extrabold text-slate-900 leading-tight flex items-center gap-0.5">
              <Sparkles className="w-2 h-2 text-amber-500 shrink-0" />
              <span>App de la Boda</span>
            </p>
            <p className="text-[7px] sm:text-[7.5px] text-slate-600 leading-tight">
              Escanea para fotos en vivo y juegos
            </p>
            {showPin && event.pin_code && (
              <div className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-amber-500/10 text-amber-900 border border-amber-500/30 text-[7px] font-bold font-mono">
                <span>PIN: {event.pin_code}</span>
              </div>
            )}
          </div>
        </div>

        {/* 4. Pie de Agradecimiento */}
        <div className={`text-[8px] sm:text-[9px] font-semibold opacity-80 pt-0.5 ${s.mutedText}`}>
          ¡Gracias por acompañarnos! ❤️
        </div>
      </div>
    )
  }

  // 3. Render Welcome Poster / Cartel de Bienvenida
  const renderPosterWelcomeCard = (isPrint: boolean = false) => {
    return (
      <div className={`relative w-full h-full flex flex-col justify-between rounded-2xl border-2 p-6 sm:p-8 text-center transition-all ${s.cardBg} ${s.innerBorder} ${s.textColor}`}>
        {/* Decorative corner accents */}
        <div className="absolute top-3 left-3 text-xs opacity-60 select-none">{s.ornament}</div>
        <div className="absolute top-3 right-3 text-xs opacity-60 select-none">{s.ornament}</div>
        <div className="absolute bottom-3 left-3 text-xs opacity-60 select-none">{s.ornament}</div>
        <div className="absolute bottom-3 right-3 text-xs opacity-60 select-none">{s.ornament}</div>

        {/* 1. Header & Nombres */}
        <div className="space-y-2 pt-1">
          <p className="text-xs sm:text-sm font-bold uppercase tracking-[0.3em] opacity-80">
            ¡Bienvenidos a la boda de!
          </p>

          <div className="py-1">
            <h2 className={`${s.fontSerif} ${isPrint ? 'text-4xl sm:text-5xl' : 'text-2xl sm:text-3xl md:text-4xl'} font-extrabold tracking-tight leading-tight ${s.accentText}`}>
              {brideName} <span className="text-xl sm:text-2xl font-normal opacity-80">&</span> {groomName}
            </h2>
          </div>

          <div className={`w-20 h-0.5 mx-auto rounded-full ${s.divider}`} />
        </div>

        {/* 2. Fecha y Lugar Completos */}
        <div className={`my-2 py-2 px-3 space-y-1.5 rounded-xl border shadow-sm ${s.infoBoxBg} ${s.infoBoxBorder}`}>
          <div className={`flex items-center justify-center gap-2 text-xs sm:text-sm font-bold ${s.dateColor} flex-wrap`}>
            <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="capitalize">{eventDate}</span>
            <span className="opacity-50">•</span>
            <Clock className="w-3.5 h-3.5 opacity-80 shrink-0" />
            <span>{eventTime}</span>
          </div>

          {location ? (
            <div className={`flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold px-2.5 py-1 rounded-lg border ${s.locationBadge}`}>
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span className="break-words font-extrabold">{location}</span>
            </div>
          ) : null}
        </div>

        {/* 3. QR Box adaptada */}
        <div className="my-2 p-3 sm:p-4 bg-white text-slate-900 rounded-2xl border border-slate-200 shadow-md max-w-xs mx-auto space-y-2">
          <p className="text-xs font-extrabold uppercase tracking-wide text-slate-800 flex items-center justify-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>📸 Comparte tus fotos con nosotros</span>
          </p>

          <div className="p-1 bg-white rounded-lg border border-slate-200 inline-block shadow-inner">
            {qrCodeDataUrl ? (
              <img 
                src={qrCodeDataUrl} 
                alt="QR Bienvenida" 
                className={isPrint ? 'w-44 h-44 mx-auto' : 'w-28 h-28 sm:w-32 sm:h-32 mx-auto'} 
              />
            ) : (
              <div className="w-28 h-28 bg-slate-100 flex items-center justify-center text-xs">QR</div>
            )}
          </div>

          <p className="text-[10px] sm:text-[11px] font-semibold text-slate-600 leading-tight">
            Escanea con la cámara de tu móvil para subir tus fotos en directo
          </p>

          {showPin && event.pin_code && (
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/15 text-amber-900 border border-amber-500/30 text-xs font-bold font-mono">
              <Lock className="w-3 h-3 text-amber-700" />
              <span>PIN: {event.pin_code}</span>
            </div>
          )}
        </div>

        {/* 4. Pie de agradecimiento */}
        <div className={`text-xs font-bold opacity-80 pb-1 ${s.mutedText}`}>
          ¡Gracias por acompañarnos en este día tan especial! ❤️
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/40 p-4 sm:p-6 rounded-2xl border border-border">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <span>💌 Diseñador de Invitaciones y Minutas</span>
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Diseña la tarjeta física o digital con código QR para que tus invitados entren a la sala interactiva el día de la boda.
          </p>
        </div>

        {/* Quick Export Actions: ONLY Descargar PDF & Compartir PDF */}
        <div className="flex items-center gap-3 shrink-0">
          <Button 
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="font-bold gap-2 rounded-xl shadow-md bg-primary hover:opacity-90 cursor-pointer h-11 px-5"
          >
            {isGeneratingPdf ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generando...</span>
              </>
            ) : (
              <>
                <FileDown className="w-4 h-4" />
                <span>Descargar PDF</span>
              </>
            )}
          </Button>

          <Button 
            onClick={handleSharePdf} 
            disabled={isGeneratingPdf}
            variant="outline"
            className="font-bold gap-2 rounded-xl border-primary/40 text-primary hover:bg-primary/10 cursor-pointer h-11 px-5"
          >
            <Share2 className="w-4 h-4" />
            <span>Compartir PDF</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* PANEL IZQUIERDO: CONTROLES Y PERSONALIZACIÓN (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* 1. Selección de Plantilla */}
          <Card className="shadow-sm border-border/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Estilo y Plantilla</span>
              </CardTitle>
              <CardDescription>Elige la estética visual que mejor combine con tu boda.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {TEMPLATES.map((t) => {
                const isSelected = template === t.id
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTemplate(t.id)}
                    className={`w-full p-3 rounded-xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer select-none ${
                      isSelected 
                        ? 'border-primary ring-2 ring-primary/30 bg-primary/5 shadow-sm' 
                        : 'border-border hover:bg-muted/60'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-lg border-2 ${t.border} ${t.previewBg} flex items-center justify-center font-serif text-sm font-bold shadow-inner shrink-0`}>
                        Aa
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm leading-tight text-foreground truncate">{t.name}</p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{t.description}</p>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                  </button>
                )
              })}
            </CardContent>
          </Card>

          {/* 2. Formato de Salida / Impresión */}
          <Card className="shadow-sm border-border/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                <span>Disposición de Impresión</span>
              </CardTitle>
              <CardDescription>Configura cómo se distribuirá el diseño al imprimir.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setFormat('card_a5')}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer select-none ${
                    format === 'card_a5' 
                      ? 'border-primary bg-primary/10 text-primary font-bold shadow-sm ring-1 ring-primary/30' 
                      : 'border-border hover:bg-muted text-muted-foreground'
                  }`}
                >
                  <FileText className="w-5 h-5 mx-auto mb-1 opacity-80" />
                  <p className="text-xs font-semibold leading-tight">Tarjeta A5</p>
                  <p className="text-[10px] opacity-70">1 por página</p>
                </button>

                <button
                  type="button"
                  onClick={() => setFormat('table_cards_4')}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer select-none ${
                    format === 'table_cards_4' 
                      ? 'border-primary bg-primary/10 text-primary font-bold shadow-sm ring-1 ring-primary/30' 
                      : 'border-border hover:bg-muted text-muted-foreground'
                  }`}
                >
                  <div className="grid grid-cols-2 gap-0.5 w-5 h-5 mx-auto mb-1 opacity-80">
                    <div className="border border-current rounded-[1px]" />
                    <div className="border border-current rounded-[1px]" />
                    <div className="border border-current rounded-[1px]" />
                    <div className="border border-current rounded-[1px]" />
                  </div>
                  <p className="text-xs font-semibold leading-tight">4 Minutas A4</p>
                  <p className="text-[10px] opacity-70">Para recortar</p>
                </button>

                <button
                  type="button"
                  onClick={() => setFormat('poster_welcome')}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer select-none ${
                    format === 'poster_welcome' 
                      ? 'border-primary bg-primary/10 text-primary font-bold shadow-sm ring-1 ring-primary/30' 
                      : 'border-border hover:bg-muted text-muted-foreground'
                  }`}
                >
                  <QrCode className="w-5 h-5 mx-auto mb-1 opacity-80" />
                  <p className="text-xs font-semibold leading-tight">Cartel QR</p>
                  <p className="text-[10px] opacity-70">Photocall / Entrada</p>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* 3. Textos y Personalización del Contenido */}
          <Card className="shadow-sm border-border/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-500" />
                <span>Textos de la Tarjeta</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="headline" className="text-xs font-semibold">Encabezado superior</Label>
                <Input 
                  id="headline" 
                  value={headline} 
                  onChange={(e) => setHeadline(e.target.value)} 
                  placeholder="Ej: ¡Nos Casamos!, Bienvenidos a nuestra boda"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="bride" className="text-xs font-semibold">Pareja 1</Label>
                  <Input 
                    id="bride" 
                    value={brideName} 
                    onChange={(e) => setBrideName(e.target.value)} 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="groom" className="text-xs font-semibold">Pareja 2</Label>
                  <Input 
                    id="groom" 
                    value={groomName} 
                    onChange={(e) => setGroomName(e.target.value)} 
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="message" className="text-xs font-semibold">Mensaje para los invitados</Label>
                <textarea
                  id="message"
                  rows={2}
                  value={invitationMessage}
                  onChange={(e) => setInvitationMessage(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-background border border-input text-xs resize-none focus-visible:ring-1 focus-visible:ring-primary outline-none"
                  placeholder="Escribe unas palabras para tus invitados..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="date" className="text-xs font-semibold">Fecha formateada</Label>
                  <Input 
                    id="date" 
                    value={eventDate} 
                    onChange={(e) => setEventDate(e.target.value)} 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="time" className="text-xs font-semibold">Hora</Label>
                  <Input 
                    id="time" 
                    value={eventTime} 
                    onChange={(e) => setEventTime(e.target.value)} 
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="loc" className="text-xs font-semibold flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Lugar / Ubicación de la Celebración</span>
                  </Label>
                  {location.trim() && (
                    <button
                      type="button"
                      onClick={() => setShowMapModal(true)}
                      className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <Maximize2 className="w-3 h-3" />
                      <span>Ver mapa</span>
                    </button>
                  )}
                </div>
                <LocationAutocomplete 
                  id="loc" 
                  name="loc" 
                  placeholder="Ej: Castell del Remei, Lleida o Finca El Olivar..."
                  value={location}
                  onChange={setLocation}
                />
              </div>

              {/* Toggles */}
              <div className="pt-2 border-t space-y-2.5 text-xs font-medium text-muted-foreground">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={showPin} 
                    onChange={(e) => setShowPin(e.target.checked)}
                    className="rounded text-primary focus:ring-primary w-4 h-4"
                  />
                  <span>Mostrar PIN de seguridad en la tarjeta</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={showFeaturesList} 
                    onChange={(e) => setShowFeaturesList(e.target.checked)}
                    className="rounded text-primary focus:ring-primary w-4 h-4"
                  />
                  <span>Mostrar lista de funciones (Fotos, Kahoot, Cronograma)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={showRsvp} 
                    onChange={(e) => setShowRsvp(e.target.checked)}
                    className="rounded text-primary focus:ring-primary w-4 h-4"
                  />
                  <span>Mostrar pie de confirmación (RSVP)</span>
                </label>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* PANEL DERECHO: VISTA PREVIA EN VIVO WYSIWYG (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-primary" />
              Vista Previa en Tiempo Real ({format === 'card_a5' ? 'Tarjeta A5' : format === 'table_cards_4' ? 'Hoja A4 con 4 Minutas' : 'Cartel Bienvenida'})
            </span>
            <span className="text-xs text-muted-foreground">
              {format === 'table_cards_4' ? '4 tarjetas listas para recortar ✂️' : 'Listo para imprimir en papel de alta calidad'}
            </span>
          </div>

          {/* Área de Visualización */}
          <div className="bg-muted/40 p-4 sm:p-6 rounded-2xl border border-border flex items-center justify-center shadow-inner overflow-hidden min-h-[520px]">
            
            {/* 1. FORMATO: TARJETA INDIVIDUAL A5 */}
            {format === 'card_a5' && (
              <div className="w-full max-w-md aspect-[1/1.41] shadow-2xl rounded-2xl overflow-hidden bg-background">
                {renderA5Card()}
              </div>
            )}

            {/* 2. FORMATO: 4 MINUTAS POR HOJA A4 (PROPORCIONES PERFECTAS) */}
            {format === 'table_cards_4' && (
              <div className="w-full max-w-md aspect-[1/1.41] bg-white p-2.5 shadow-2xl rounded-xl border border-slate-200 grid grid-cols-2 grid-rows-2 gap-2 relative">
                {/* Marcas de corte guías */}
                <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 border-r border-dashed border-slate-300 pointer-events-none z-10 flex items-center justify-center">
                  <span className="bg-white px-1 text-[10px] text-slate-400 font-mono">✂️</span>
                </div>
                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 border-b border-dashed border-slate-300 pointer-events-none z-10 flex items-center justify-center">
                  <span className="bg-white py-0.5 text-[10px] text-slate-400 font-mono">✂️</span>
                </div>
                
                <div className="h-full overflow-hidden">{renderTableMinutaCard(false)}</div>
                <div className="h-full overflow-hidden">{renderTableMinutaCard(false)}</div>
                <div className="h-full overflow-hidden">{renderTableMinutaCard(false)}</div>
                <div className="h-full overflow-hidden">{renderTableMinutaCard(false)}</div>
              </div>
            )}

            {/* 3. FORMATO: CARTEL DE BIENVENIDA CON QR GIGANTE */}
            {format === 'poster_welcome' && (
              <div className="w-full max-w-md aspect-[1/1.41] shadow-2xl rounded-2xl overflow-hidden">
                {renderPosterWelcomeCard(false)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CONTENEDOR OCULTO PARA IMPRESIÓN LIMPIA (@media print montado en el body) */}
      {mounted && createPortal(
        <div id="print-invitation-area" className="hidden print:block print:w-full print:h-full print:m-0 print:p-0">
          {format === 'card_a5' && (
            <div className="print-single-page p-8 flex items-center justify-center box-border">
              <div className="w-[148mm] h-[210mm] max-w-full">
                {renderA5Card()}
              </div>
            </div>
          )}

          {format === 'table_cards_4' && (
            <div className="print-single-page p-3 grid grid-cols-2 grid-rows-2 gap-2.5 box-border bg-white">
              <div className="w-full h-full p-1 border border-dashed border-slate-300 rounded-lg overflow-hidden">{renderTableMinutaCard(true)}</div>
              <div className="w-full h-full p-1 border border-dashed border-slate-300 rounded-lg overflow-hidden">{renderTableMinutaCard(true)}</div>
              <div className="w-full h-full p-1 border border-dashed border-slate-300 rounded-lg overflow-hidden">{renderTableMinutaCard(true)}</div>
              <div className="w-full h-full p-1 border border-dashed border-slate-300 rounded-lg overflow-hidden">{renderTableMinutaCard(true)}</div>
            </div>
          )}

          {format === 'poster_welcome' && (
            <div className="print-single-page p-8 flex items-center justify-center box-border">
              <div className="w-[210mm] h-[297mm] max-w-full">
                {renderPosterWelcomeCard(true)}
              </div>
            </div>
          )}
        </div>,
        document.body
      )}

      {/* Print Specific CSS styles */}
      <style jsx global>{`
        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            height: 100% !important;
            min-height: 100% !important;
            overflow: hidden !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Hide all application and dashboard wrapper elements */
          body > *:not(#print-invitation-area) {
            display: none !important;
          }
          #print-invitation-area {
            display: block !important;
            position: relative !important;
            width: 100% !important;
            height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
          }
          .print-single-page {
            width: 100% !important;
            height: 100vh !important;
            max-height: 285mm !important;
            margin: 0 auto !important;
            box-sizing: border-box !important;
            page-break-inside: avoid !important;
            page-break-after: avoid !important;
            page-break-before: avoid !important;
            break-inside: avoid !important;
            break-after: avoid !important;
            overflow: hidden !important;
          }
          @page {
            size: A4 portrait;
            margin: 0mm;
          }
        }
      `}</style>

      {/* Modal de Mapa Interactivo */}
      {location.trim() && (
        <LocationMapModal
          isOpen={showMapModal}
          onClose={() => setShowMapModal(false)}
          location={location}
          eventName={`${brideName} & ${groomName}`}
        />
      )}
    </div>
  )
}
