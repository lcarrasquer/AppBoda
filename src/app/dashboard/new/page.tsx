'use client'

import { useState, useEffect, useActionState } from 'react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, MapPin, ExternalLink, Maximize2, Heart, Calendar, Sparkles, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { createEvent } from '../actions'
import { getGoogleMapsUrl, getGoogleMapsEmbedUrl } from '@/lib/utils'
import { LocationMapModal } from '@/components/common/LocationMapModal'
import { LocationAutocomplete } from '@/components/common/LocationAutocomplete'

const initialState = {
  error: ''
}

export default function NewEventPage() {
  const [location, setLocation] = useState('')
  const [brideName, setBrideName] = useState('')
  const [groomName, setGroomName] = useState('')
  const [showMapModal, setShowMapModal] = useState(false)

  useEffect(() => {
    document.title = 'Nuevo Evento | AppBoda'
  }, [])

  const [state, formAction, pending] = useActionState(async (prevState: any, formData: FormData) => {
    try {
      const res = await createEvent(formData)
      if (res?.error) {
        toast.error(res.error)
        return { error: res.error }
      }
      toast.success('¡Evento creado con éxito! 🎉')
      return prevState
    } catch (e: any) {
      toast.error('Ocurrió un error inesperado al crear el evento')
      return { error: 'Ocurrió un error inesperado' }
    }
  }, initialState)

  const eventTitle = brideName || groomName ? `${brideName} & ${groomName}` : 'Boda'

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <Link href="/dashboard" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Crear Nuevo Evento</h1>
          <p className="text-muted-foreground">
            Introduce los datos principales de la boda para configurar tu sala interactiva.
          </p>
        </div>
      </div>

      <form action={formAction} className="space-y-6">
        
        {/* SECCIÓN 1: DATOS DE LA PAREJA Y FECHA */}
        <Card className="shadow-sm border-border/80 overflow-hidden">
          <CardHeader className="bg-muted/30 border-b border-border/50 pb-4">
            <CardTitle className="text-lg flex items-center gap-2 font-bold text-foreground">
              <Heart className="w-5 h-5 text-rose-500 fill-rose-500/20" />
              <span>Nombres de la Pareja y Fecha</span>
            </CardTitle>
            <CardDescription>
              Estos nombres aparecerán en la cabecera, invitaciones y portada de la app.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="bride_name" className="text-sm font-semibold flex items-center gap-1.5">
                  <span>Novia / Pareja 1</span>
                  <span className="text-rose-500">*</span>
                </Label>
                <Input 
                  id="bride_name" 
                  name="bride_name" 
                  placeholder="Ej: María" 
                  value={brideName}
                  onChange={(e) => setBrideName(e.target.value)}
                  required 
                  className="font-medium h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="groom_name" className="text-sm font-semibold flex items-center gap-1.5">
                  <span>Novio / Pareja 2</span>
                  <span className="text-rose-500">*</span>
                </Label>
                <Input 
                  id="groom_name" 
                  name="groom_name" 
                  placeholder="Ej: Juan" 
                  value={groomName}
                  onChange={(e) => setGroomName(e.target.value)}
                  required 
                  className="font-medium h-11"
                />
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
                  required 
                  className="font-medium h-11"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SECCIÓN 2: UBICACIÓN DEL EVENTO */}
        <Card className="shadow-sm border-border/80 overflow-hidden">
          <CardHeader className="bg-muted/30 border-b border-border/50 pb-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="text-lg flex items-center gap-2 font-bold text-foreground">
                  <MapPin className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <span>Ubicación y Lugar del Evento (Opcional)</span>
                </CardTitle>
                <CardDescription className="mt-1">
                  Permite a tus invitados consultar el mapa interactivo y obtener la ruta en Google Maps.
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
                Buscar Finca, Castillo, Iglesia o Dirección
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
                Escribe y selecciona una sugerencia o pega directamente un enlace de Google Maps.
              </p>
            </div>

            {/* Vista previa del mapa */}
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
                <div className="w-full h-56 sm:h-64 relative bg-muted/20">
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

        {state.error && (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-sm font-semibold text-destructive">
            {state.error}
          </div>
        )}

        <div className="flex items-center justify-between pt-4">
          <p className="text-xs text-muted-foreground">
            Podrás personalizar colores, fotos, retos y cronograma en cualquier momento.
          </p>
          <Button 
            type="submit" 
            disabled={pending} 
            size="lg"
            className="font-bold px-8 h-12 rounded-xl shadow-lg shadow-primary/20 text-base"
          >
            {pending ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Creando evento...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Crear Evento de Boda
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Interactive Map Modal */}
      {location.trim() && (
        <LocationMapModal
          isOpen={showMapModal}
          onClose={() => setShowMapModal(false)}
          location={location}
          eventName={eventTitle}
        />
      )}
    </div>
  )
}
