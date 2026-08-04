import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { updateEventSettings } from '../actions'
import { EventQRCode } from '@/components/admin/EventQRCode'

export default async function EventSettingsPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params
  const supabase = await createClient()

  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single()

  if (!event) return null

  // Ensure event.event_date is a string and formatted as YYYY-MM-DD for the input type="date"
  const formattedDate = event.event_date ? new Date(event.event_date).toISOString().split('T')[0] : ''

  const appUrl = process.env.NEXT_PUBLIC_APP_URL 
    ? process.env.NEXT_PUBLIC_APP_URL 
    : process.env.NEXT_PUBLIC_VERCEL_URL 
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` 
      : 'http://localhost:3000'

  return (
    <div className="space-y-6">
      {/* QR Code Section */}
      <EventQRCode
        slug={event.slug}
        brideName={event.bride_name}
        groomName={event.groom_name}
        appUrl={appUrl}
      />

      <Card>
        <CardHeader>
          <CardTitle>Ajustes Generales</CardTitle>
          <CardDescription>
            Configura los detalles básicos de la boda y la seguridad.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateEventSettings} className="space-y-6">
            <input type="hidden" name="event_id" value={eventId} />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bride_name">Nombre de la novia/pareja 1</Label>
                <Input id="bride_name" name="bride_name" defaultValue={event.bride_name} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="groom_name">Nombre del novio/pareja 2</Label>
                <Input id="groom_name" name="groom_name" defaultValue={event.groom_name} required />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="event_date">Fecha del evento</Label>
                <Input id="event_date" name="event_date" type="date" defaultValue={formattedDate} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Ubicación (opcional)</Label>
                <Input id="location" name="location" defaultValue={event.location || ''} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pin_enabled" className="flex items-center gap-2">
                  <input type="checkbox" id="pin_enabled" name="pin_enabled" defaultChecked={!!event.pin_enabled} className="w-4 h-4" />
                  Habilitar PIN de seguridad
                </Label>
                <p className="text-xs text-muted-foreground">Si está activo, los invitados deberán introducir el PIN para entrar a la sala.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pin_code">PIN de 4 dígitos (opcional)</Label>
                <Input id="pin_code" name="pin_code" type="text" maxLength={4} pattern="[0-9]{4}" defaultValue={event.pin_code || ''} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primary_color">Color Principal</Label>
                <div className="flex gap-2">
                  <Input id="primary_color" name="primary_color" type="color" className="w-16 h-10 p-1" defaultValue={event.primary_color || '#D4AF37'} />
                  <Input type="text" defaultValue={event.primary_color || '#D4AF37'} disabled className="bg-muted text-muted-foreground" />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit">Guardar cambios</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
