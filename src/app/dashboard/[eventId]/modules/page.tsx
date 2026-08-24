import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { ModuleToggle } from './ModuleToggle'
import Link from 'next/link'
import { Camera, Gamepad2, Users } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Módulos del Evento',
}

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
  const seatingModule = modules?.find(m => m.module_key === 'seating')

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Módulo de Fotos */}
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-primary" />
              <CardTitle>Fotos y Retos</CardTitle>
            </div>
            <CardDescription>
              Muro de fotos colaborativo. Permite a los invitados subir fotos, usar etiquetas y cumplir retos divertidos.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-between items-center pt-2">
            <ModuleToggle eventId={eventId} moduleKey="photos" isEnabled={!!photosModule?.is_enabled} />
            {photosModule?.is_enabled && (
              <Link href={`/dashboard/${eventId}/photos-config`} className={buttonVariants({ variant: 'outline' })}>
                Configurar Fotos
              </Link>
            )}
          </CardContent>
        </Card>

        {/* Módulo Kahoot */}
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Gamepad2 className="w-5 h-5 text-primary" />
              <CardTitle>Juego Trivia (Kahoot)</CardTitle>
            </div>
            <CardDescription>
              Un divertido quiz para los invitados. ¡Crea preguntas sobre los novios y ofrece un premio al ganador!
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-between items-center pt-2">
            <ModuleToggle eventId={eventId} moduleKey="kahoot" isEnabled={!!kahootModule?.is_enabled} />
            {kahootModule?.is_enabled && (
              <Link href={`/dashboard/${eventId}/kahoot-config`} className={buttonVariants({ variant: 'outline' })}>
                Configurar Kahoot
              </Link>
            )}
          </CardContent>
        </Card>

        {/* Módulo Seating Plan */}
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <CardTitle>Buscador de Mesas (Seating)</CardTitle>
            </div>
            <CardDescription>
              Permite a los invitados buscar su mesa por nombre, ver a sus compañeros y explorar la distribución del banquete.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-between items-center pt-2">
            <ModuleToggle eventId={eventId} moduleKey="seating" isEnabled={seatingModule ? seatingModule.is_enabled : true} />
            <Link href={`/dashboard/${eventId}/seating`} className={buttonVariants({ variant: 'outline' })}>
              Gestionar Mesas
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
