'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { updateEventSettings } from '../actions'
import { toast } from 'sonner'
import { 
  Loader2, 
  MapPin, 
  ExternalLink, 
  Maximize2, 
  Heart, 
  Calendar, 
  Palette, 
  Lock, 
  ShieldCheck, 
  Save, 
  Sparkles,
  Check,
  Mail,
  QrCode
} from 'lucide-react'
import { getGoogleMapsUrl, getGoogleMapsEmbedUrl } from '@/lib/utils'
import { LocationMapModal } from '@/components/common/LocationMapModal'
import { LocationAutocomplete } from '@/components/common/LocationAutocomplete'

interface SettingsFormProps {
  event: any
  formattedDate: string
}

const COLOR_PRESETS = [
  { name: 'Oro Champán', hex: '#D4AF37' },
  { name: 'Rosa Empolvado', hex: '#E0A899' },
  { name: 'Borgoña & Vino', hex: '#8B1E3F' },
  { name: 'Verde Esmeralda', hex: '#0F5257' },
  { name: 'Azul Medianoche', hex: '#1E3A8A' },
  { name: 'Lavanda Silvestre', hex: '#7C3AED' },
  { name: 'Terracota Cálido', hex: '#C2410C' },
  { name: 'Negro Elegante', hex: '#18181B' }
]

export function SettingsForm({ event, formattedDate }: SettingsFormProps) {
  const [saving, setSaving] = useState(false)
  const [color, setColor] = useState(event.primary_color || '#D4AF37')
  const [location, setLocation] = useState(event.location || '')
  const [pinEnabled, setPinEnabled] = useState(Boolean(event.pin_enabled))
  const [pinCode, setPinCode] = useState(event.pin_code || '')
  const [showMapModal, setShowMapModal] = useState(false)

  const handleSubmit = async (formData: FormData) => {
    try {
      setSaving(true)
      await updateEventSettings(formData)
      toast.success('Ajustes de la boda guardados con éxito ✨')
    } catch (err: any) {
      console.error('Error updating settings:', err)
      toast.error(err.message || 'Error al guardar los cambios')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form action={handleSubmit} className="space-y-8 max-w-4xl mx-auto">
      <input type="hidden" name="event_id" value={event.id} />

      {/* BANNER ACCESO RÁPIDO A INVITACIONES Y MINUTAS */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-primary/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-500/30 text-amber-600 dark:text-amber-400 shadow-sm shrink-0">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <span>💌 Diseñar Invitación & Tarjetas de Mesa</span>
              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                Nuevo
              </span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Crea tarjetas físicas con código QR listas para imprimir (A5 o 4 por A4) o envíalas por WhatsApp a tus invitados.
            </p>
          </div>
        </div>
        <Link 
          href={`/dashboard/${event.id}/invitation`}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md hover:opacity-90 transition-all shrink-0 self-start sm:self-center"
        >
          <Mail className="w-4 h-4" />
          <span>Diseñar Invitación</span>
        </Link>
      </div>
      
      {/* 1. SECCIÓN: PAREJA Y FECHA */}
      <Card className="shadow-sm border-border/80 overflow-hidden">
        <CardHeader className="bg-muted/30 border-b border-border/50 pb-4">
          <CardTitle className="text-lg flex items-center gap-2 font-bold text-foreground">
            <Heart className="w-5 h-5 text-rose-500 fill-rose-500/20" />
            <span>Datos de la Pareja y Fecha</span>
          </CardTitle>
          <CardDescription>
            Los nombres y la fecha que se mostrarán en la portada y cabecera de la boda.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="bride_name" className="text-sm font-semibold flex items-center gap-1.5">
                <span>Nombre de la Novia / Pareja 1</span>
                <span className="text-rose-500">*</span>
              </Label>
              <div className="relative">
                <Input 
                  id="bride_name" 
                  name="bride_name" 
                  defaultValue={event.bride_name} 
                  placeholder="Ej: María"
                  required 
                  className="font-medium pl-3 h-11"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="groom_name" className="text-sm font-semibold flex items-center gap-1.5">
                <span>Nombre del Novio / Pareja 2</span>
                <span className="text-rose-500">*</span>
              </Label>
              <div className="relative">
                <Input 
                  id="groom_name" 
                  name="groom_name" 
                  defaultValue={event.groom_name} 
                  placeholder="Ej: Juan"
                  required 
                  className="font-medium pl-3 h-11"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="event_date" className="text-sm font-semibold flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-primary" />
              <span>Fecha de la Boda</span>
              <span className="text-rose-500">*</span>
            </Label>
            <div className="max-w-md">
              <Input 
                id="event_date" 
                name="event_date" 
                type="date" 
                defaultValue={formattedDate} 
                required 
                className="font-medium h-11"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Utilizada para calcular el cronograma del día y los días restantes.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 2. SECCIÓN: UBICACIÓN Y MAPA */}
      <Card className="shadow-sm border-border/80 overflow-hidden">
        <CardHeader className="bg-muted/30 border-b border-border/50 pb-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-lg flex items-center gap-2 font-bold text-foreground">
                <MapPin className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>Ubicación y Lugar del Evento</span>
              </CardTitle>
              <CardDescription className="mt-1">
                Indica dónde se celebrará la boda para que tus invitados puedan llegar fácilmente con Google Maps.
              </CardDescription>
            </div>
            {location.trim() && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowMapModal(true)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline cursor-pointer bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/20"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Pantalla completa</span>
                </button>
                <a
                  href={getGoogleMapsUrl(location)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Abrir en Maps</span>
                  <ExternalLink className="w-3 h-3 opacity-70" />
                </a>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="location" className="text-sm font-semibold">
              Buscar Lugar, Finca, Iglesia o Dirección
            </Label>
            <LocationAutocomplete 
              id="location" 
              name="location" 
              placeholder="Escribe el nombre del lugar (ej. Castell del Remei, Lleida o Finca El Olivar...)" 
              value={location}
              onChange={setLocation}
              className="h-11"
            />
            <p className="text-xs text-muted-foreground">
              Puedes escribir el nombre para ver sugerencias en directo o pegar directamente un enlace de Google Maps.
            </p>
          </div>

          {/* Vista previa del mapa en ancho completo */}
          {location.trim() && (
            <div className="mt-4 rounded-2xl overflow-hidden border border-border bg-card shadow-sm animate-in fade-in duration-300">
              <div className="p-2.5 px-4 bg-muted/60 border-b border-border flex items-center justify-between text-xs font-semibold">
                <span className="flex items-center gap-2 text-foreground">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-bold">Vista previa con chincheta</span>
                  <span className="text-muted-foreground font-normal hidden sm:inline">• {location}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowMapModal(true)}
                  className="text-primary hover:underline flex items-center gap-1 cursor-pointer font-medium"
                >
                  <span>Ampliar mapa</span>
                  <Maximize2 className="w-3 h-3" />
                </button>
              </div>
              <div className="w-full h-56 sm:h-72 relative bg-muted/20">
                <iframe
                  title="Vista previa del mapa"
                  src={getGoogleMapsEmbedUrl(location)}
                  className="w-full h-full border-0"
                  loading="lazy"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. SECCIÓN: PERSONALIZACIÓN Y COLOR */}
      <Card className="shadow-sm border-border/80 overflow-hidden">
        <CardHeader className="bg-muted/30 border-b border-border/50 pb-4">
          <CardTitle className="text-lg flex items-center gap-2 font-bold text-foreground">
            <Palette className="w-5 h-5 text-amber-500" />
            <span>Color y Estilo Principal</span>
          </CardTitle>
          <CardDescription>
            Personaliza el color de acento que verán tus invitados en los botones, iconos y elementos destacados.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Paletas recomendadas para bodas</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {COLOR_PRESETS.map((preset) => {
                const isSelected = color.toLowerCase() === preset.hex.toLowerCase()
                return (
                  <button
                    key={preset.hex}
                    type="button"
                    onClick={() => setColor(preset.hex)}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer select-none ${
                      isSelected 
                        ? 'border-primary ring-2 ring-primary/30 bg-primary/5 font-bold shadow-sm' 
                        : 'border-border hover:bg-muted/60 hover:border-muted-foreground/30'
                    }`}
                  >
                    <span 
                      className="w-6 h-6 rounded-full shrink-0 shadow-sm border border-black/10 flex items-center justify-center text-white" 
                      style={{ backgroundColor: preset.hex }}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </span>
                    <span className="text-xs truncate">{preset.name}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="space-y-1.5 flex-1">
              <Label htmlFor="primary_color" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                O elige un color personalizado (HEX)
              </Label>
              <div className="flex items-center gap-3">
                <input 
                  id="primary_color" 
                  name="primary_color" 
                  type="color" 
                  value={color} 
                  onChange={(e) => setColor(e.target.value)}
                  className="w-12 h-11 p-1 rounded-xl border border-input cursor-pointer bg-background shrink-0" 
                />
                <Input 
                  type="text" 
                  value={color} 
                  onChange={(e) => setColor(e.target.value)}
                  className="font-mono text-sm uppercase max-w-[140px] h-11" 
                />
                <div 
                  className="h-11 px-4 rounded-xl flex items-center text-white font-semibold text-xs shadow-sm shrink-0"
                  style={{ backgroundColor: color }}
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  Muestra del tema
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. SECCIÓN: SEGURIDAD Y ACCESO (PIN) */}
      <Card className="shadow-sm border-border/80 overflow-hidden">
        <CardHeader className="bg-muted/30 border-b border-border/50 pb-4">
          <CardTitle className="text-lg flex items-center gap-2 font-bold text-foreground">
            <Lock className="w-5 h-5 text-primary" />
            <span>Control de Acceso y Seguridad</span>
          </CardTitle>
          <CardDescription>
            Protege el acceso a las fotos y juegos de tu boda mediante un código PIN de 4 dígitos.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-5">
          <div className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-muted/40 border border-border">
            <div className="space-y-1">
              <label htmlFor="pin_enabled" className="text-sm font-bold flex items-center gap-2 cursor-pointer select-none">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <span>Exigir PIN a los invitados</span>
              </label>
              <p className="text-xs text-muted-foreground">
                Si está activado, nadie podrá ver ni subir fotos sin introducir previamente el código PIN.
              </p>
            </div>
            <input 
              type="checkbox" 
              id="pin_enabled" 
              name="pin_enabled" 
              checked={pinEnabled} 
              onChange={(e) => setPinEnabled(e.target.checked)}
              className="w-5 h-5 rounded text-primary focus:ring-primary cursor-pointer mt-1" 
            />
          </div>

          {pinEnabled && (
            <div className="space-y-2 p-4 rounded-2xl bg-primary/5 border border-primary/20 animate-in fade-in slide-in-from-top-2 duration-200">
              <Label htmlFor="pin_code" className="text-sm font-semibold flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-primary" />
                <span>PIN de 4 dígitos</span>
                <span className="text-rose-500">*</span>
              </Label>
              <div className="max-w-[200px]">
                <Input 
                  id="pin_code" 
                  name="pin_code" 
                  type="text" 
                  maxLength={4} 
                  pattern="[0-9]{4}" 
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="Ej: 1234"
                  className="font-mono text-xl tracking-widest text-center h-12 bg-background"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Comparte este código con tus invitados o colócalo en las minutas del banquete.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* BARRA DE GUARDADO */}
      <div className="flex items-center justify-between pt-4 pb-12">
        <p className="text-xs text-muted-foreground hidden sm:block">
          Todos los cambios se aplicarán inmediatamente en la sala interactiva.
        </p>
        <Button 
          type="submit" 
          disabled={saving} 
          size="lg"
          className="font-bold px-8 h-12 rounded-xl shadow-lg shadow-primary/20 text-base ml-auto"
        >
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Guardando cambios...
            </>
          ) : (
            <>
              <Save className="w-5 h-5 mr-2" />
              Guardar Ajustes
            </>
          )}
        </Button>
      </div>

      {/* Modal de Mapa Interactivo */}
      {location.trim() && (
        <LocationMapModal
          isOpen={showMapModal}
          onClose={() => setShowMapModal(false)}
          location={location}
          eventName={`${event.bride_name} & ${event.groom_name}`}
        />
      )}
    </form>
  )
}
