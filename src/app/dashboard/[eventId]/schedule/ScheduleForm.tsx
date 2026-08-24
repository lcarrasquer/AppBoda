'use client'

import { useState, useRef } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { createScheduleItem } from '../actions'
import { Clock, Plus, MapPin, Maximize2, ExternalLink } from 'lucide-react'
import { LocationAutocomplete } from '@/components/common/LocationAutocomplete'
import { LocationMapModal } from '@/components/common/LocationMapModal'
import { getGoogleMapsUrl, getGoogleMapsEmbedUrl } from '@/lib/utils'

const ICON_PRESETS = ['💍', '🍸', '🍽️', '🎂', '💃', '🥂', '🎵', '🍕', '📸', '🎉']

export function ScheduleForm({ eventId }: { eventId: string }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [selectedIcon, setSelectedIcon] = useState('💍')
  const [location, setLocation] = useState('')
  const [title, setTitle] = useState('')
  const [showMapModal, setShowMapModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (formData: FormData) => {
    try {
      setIsSubmitting(true)
      await createScheduleItem(formData)
      toast.success('Hito añadido al cronograma ⏰')
      formRef.current?.reset()
      setLocation('')
      setTitle('')
      setSelectedIcon('💍')
    } catch (err: any) {
      toast.error(err.message || 'Error al añadir el hito')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Card className="lg:col-span-1 shadow-md">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" /> Añadir Hito / Momento
          </CardTitle>
          <CardDescription>
            Introduce la hora, título y ubicación del momento (ej: Ceremonia, Banquete).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form ref={formRef} action={handleSubmit} className="space-y-4">
            <input type="hidden" name="event_id" value={eventId} />
            
            <div className="space-y-2">
              <Label htmlFor="title" className="font-semibold">Título del momento *</Label>
              <Input 
                id="title" 
                name="title" 
                placeholder="Ej: Ceremonia civil, Banquete, Primer Baile" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="scheduled_time" className="font-semibold flex items-center gap-1">
                <Clock className="w-4 h-4 text-muted-foreground" /> Hora programada *
              </Label>
              <Input 
                id="scheduled_time" 
                name="scheduled_time" 
                type="time" 
                required 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="icon" className="font-semibold">Icono / Emoji</Label>
              <div className="flex gap-2 items-center">
                <Input 
                  id="icon" 
                  name="icon" 
                  value={selectedIcon}
                  onChange={(e) => setSelectedIcon(e.target.value)}
                  className="w-16 text-center text-xl"
                />
                <div className="flex flex-wrap gap-1 text-lg">
                  {ICON_PRESETS.map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setSelectedIcon(emoji)}
                      className={`p-1 rounded transition-colors cursor-pointer ${selectedIcon === emoji ? 'bg-primary/20 ring-1 ring-primary' : 'hover:bg-muted'}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Location with Google Maps Autocomplete */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="location" className="font-semibold flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-primary" /> Ubicación del hito (opcional)
                </Label>
                {location.trim() && (
                  <button
                    type="button"
                    onClick={() => setShowMapModal(true)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline cursor-pointer"
                  >
                    <Maximize2 className="w-3 h-3" />
                    <span>Ver mapa</span>
                  </button>
                )}
              </div>
              <LocationAutocomplete 
                id="location"
                name="location"
                value={location}
                onChange={setLocation}
                placeholder="Ej: Ermita del Castell, Jardín Norte o dirección..."
              />
              
              {/* Embedded live map preview if location is set */}
              {location.trim() && (
                <div className="mt-2 rounded-xl overflow-hidden border border-border/80 bg-muted/30 shadow-inner animate-in fade-in duration-200">
                  <div className="p-2 px-3 bg-muted/50 border-b border-border/50 flex items-center justify-between text-xs font-semibold">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      Ubicación fijada
                    </span>
                    <a
                      href={getGoogleMapsUrl(location)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      <span>Google Maps</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                  <div className="w-full h-36 relative">
                    <iframe
                      title="Vista previa del hito"
                      src={getGoogleMapsEmbedUrl(location)}
                      className="w-full h-full border-0"
                      loading="lazy"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="font-semibold">Detalles u observaciones (opcional)</Label>
              <Input 
                id="description" 
                name="description" 
                placeholder="Ej: Se ruega puntualidad, Cóctel de bienvenida..." 
              />
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full font-bold">
              {isSubmitting ? 'Guardando...' : 'Guardar en Cronograma'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Full screen Map Modal */}
      {location.trim() && (
        <LocationMapModal
          isOpen={showMapModal}
          onClose={() => setShowMapModal(false)}
          location={location}
          eventName={title ? `Hito: ${title}` : 'Ubicación del hito'}
        />
      )}
    </>
  )
}
