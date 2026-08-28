import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PlusCircle, CalendarHeart } from 'lucide-react'
import Link from 'next/link'
import { EventCard } from './EventCard'

export const metadata: Metadata = {
  title: 'Mis Eventos',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Fetch events where user is owner
  const { data: events, error } = await supabase
    .from('events')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mis Eventos</h1>
          <p className="text-muted-foreground">
            Gestiona tus bodas y eventos desde aquí.
          </p>
        </div>
        <Link href="/dashboard/new" className={buttonVariants({ variant: "default", className: "gap-2 font-bold" })}>
          <PlusCircle className="w-4 h-4" />
          Crear evento
        </Link>
      </div>

      {events && events.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed">
          <div className="rounded-full bg-primary/10 p-4 mb-4">
            <CalendarHeart className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Aún no tienes eventos</h2>
          <p className="text-muted-foreground max-w-sm mb-6">
            Empieza creando tu primer evento para configurar la sala de invitados, el módulo de fotos y más.
          </p>
          <Link href="/dashboard/new" className={buttonVariants({ variant: "default" })}>
            <PlusCircle className="w-4 h-4 mr-2" />
            Crear primer evento
          </Link>
        </Card>
      )}
    </div>
  )
}

