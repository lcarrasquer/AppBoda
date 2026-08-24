import type { Metadata } from 'next'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { deleteScheduleItem } from '../actions'
import { Clock, Trash2, CalendarCheck, MapPin, ExternalLink } from 'lucide-react'
import { ScheduleForm } from './ScheduleForm'
import { DeleteScheduleButton } from './DeleteScheduleButton'
import { parseScheduleLocation, getGoogleMapsUrl } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Cronograma del Día',
}

export default async function ScheduleConfigPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params

  const adminClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const { data: scheduleItems } = await adminClient
    .from('event_schedule')
    .select('*')
    .eq('event_id', eventId)
    .order('scheduled_time', { ascending: true })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <CalendarCheck className="w-6 h-6 text-primary" /> Cronograma del Día
        </h2>
        <p className="text-muted-foreground">
          Define el itinerario de tu boda. Los invitados podrán consultarlo en tiempo real con indicadores visuales de lo que está ocurriendo en cada momento.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Client Component */}
        <ScheduleForm eventId={eventId} />

        {/* Schedule List */}
        <Card className="lg:col-span-2 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Itinerario Configurado</CardTitle>
            <CardDescription>
              Ordenado cronológicamente por hora.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {scheduleItems && scheduleItems.length > 0 ? (
              <div className="space-y-3">
                {scheduleItems.map((item) => {
                  const { location, notes } = parseScheduleLocation(item)
                  return (
                    <div 
                      key={item.id} 
                      className="p-4 rounded-xl border bg-card flex items-center justify-between gap-4 hover:border-primary/50 transition-all shadow-sm"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="text-3xl bg-muted/50 p-2.5 rounded-xl border border-muted shrink-0 mt-0.5">
                          {item.icon || '💍'}
                        </div>
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                              {item.scheduled_time?.slice(0, 5)}h
                            </span>
                            <h4 className="font-bold text-base truncate">{item.title}</h4>
                          </div>

                          {location && (
                            <div className="flex items-center gap-1.5 pt-0.5">
                              <a
                                href={getGoogleMapsUrl(location)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 max-w-sm truncate"
                                title={`Abrir "${location}" en Google Maps`}
                              >
                                <MapPin className="w-3 h-3 shrink-0" />
                                <span className="truncate">{location}</span>
                                <ExternalLink className="w-2.5 h-2.5 opacity-70 shrink-0" />
                              </a>
                            </div>
                          )}

                          {notes && (
                            <p className="text-xs text-muted-foreground leading-relaxed">{notes}</p>
                          )}
                        </div>
                      </div>

                      <DeleteScheduleButton eventId={eventId} itemId={item.id} />
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center p-8 border border-dashed rounded-xl text-muted-foreground">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="font-medium">No hay hitos añadidos al cronograma.</p>
                <p className="text-xs mt-1">Utiliza el formulario de la izquierda para añadir los momentos de tu boda.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
