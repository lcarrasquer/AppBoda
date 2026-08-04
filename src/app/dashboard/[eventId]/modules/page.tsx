import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import { toggleModule } from '../actions'
import Link from 'next/link'
import { Camera, Gamepad2 } from 'lucide-react'

export default async function ModulesPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params
  const supabase = await createClient()

  const { data: modules } = await supabase
    .from('event_modules')
    .select('*')
    .eq('event_id', eventId)

  const photosModule = modules?.find(m => m.module_key === 'photos')
  const kahootModule = modules?.find(m => m.module_key === 'kahoot')

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Módulo de Fotos */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              <CardTitle>Fotos y Retos</CardTitle>
            </div>
            <CardDescription>
              Muro de fotos colaborativo. Permite a los invitados subir fotos, usar etiquetas y cumplir retos divertidos.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-between items-center">
            <form action={toggleModule}>
              <input type="hidden" name="event_id" value={eventId} />
              <input type="hidden" name="module_key" value="photos" />
              <input type="hidden" name="is_enabled" value={photosModule?.is_enabled ? 'false' : 'true'} />
              <Button type="submit" variant={photosModule?.is_enabled ? 'destructive' : 'default'}>
                {photosModule?.is_enabled ? 'Desactivar' : 'Activar'}
              </Button>
            </form>
            {photosModule?.is_enabled && (
              <Link href={`/dashboard/${eventId}/photos-config`} className={buttonVariants({ variant: 'outline' })}>
                Configurar Fotos
              </Link>
            )}
          </CardContent>
        </Card>

        {/* Módulo Kahoot */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Gamepad2 className="w-5 h-5" />
              <CardTitle>Juego Trivia (Kahoot)</CardTitle>
            </div>
            <CardDescription>
              Un divertido quiz para los invitados. ¡Crea preguntas sobre los novios y ofrece un premio al ganador!
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-between items-center">
            <form action={toggleModule}>
              <input type="hidden" name="event_id" value={eventId} />
              <input type="hidden" name="module_key" value="kahoot" />
              <input type="hidden" name="is_enabled" value={kahootModule?.is_enabled ? 'false' : 'true'} />
              <Button type="submit" variant={kahootModule?.is_enabled ? 'destructive' : 'default'}>
                {kahootModule?.is_enabled ? 'Desactivar' : 'Activar'}
              </Button>
            </form>
            {kahootModule?.is_enabled && (
              <Link href={`/dashboard/${eventId}/kahoot-config`} className={buttonVariants({ variant: 'outline' })}>
                Configurar Kahoot
              </Link>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
