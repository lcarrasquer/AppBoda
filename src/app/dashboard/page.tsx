import { createClient } from '@/lib/supabase/server'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { PlusCircle, Calendar, MapPin } from 'lucide-react'
import Link from 'next/link'

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
        <Link href="/dashboard/new" className={buttonVariants({ variant: "default", className: "gap-2" })}>
          <PlusCircle className="w-4 h-4" />
          Crear evento
        </Link>
      </div>

      {events && events.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <Card key={event.id} className="hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">
                      {event.bride_name} & {event.groom_name}
                    </CardTitle>
                    <CardDescription className="mt-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(event.event_date).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium uppercase tracking-wider ${
                    event.status === 'active' ? 'bg-green-500/10 text-green-600 dark:text-green-400' :
                    event.status === 'draft' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {event.status}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {event.location || 'Sin ubicación definida'}
                </div>
              </CardContent>
              <CardFooter className="flex justify-between border-t pt-4">
                <Link href={`/dashboard/${event.id}/settings`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                  Configurar
                </Link>
                <Link href={`/e/${event.slug}`} target="_blank" className={buttonVariants({ variant: "default", size: "sm" })}>
                  Ver sala
                </Link>
              </CardFooter>
            </Card>
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

// Temporary icon for empty state
function CalendarHeart(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 10V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h7" />
      <path d="M16 2v4" />
      <path d="M8 2v4" />
      <path d="M3 10h18" />
      <path d="M21.29 14.7a2.43 2.43 0 0 0-2.65-.52c-.3.12-.57.3-.8.53l-.34.34-.35-.34a2.43 2.43 0 0 0-2.65-.53c-.3.12-.56.3-.79.53-.95.94-1 2.53.2 3.74L17.5 22l3.6-3.55c1.2-1.21 1.14-2.8.19-3.74Z" />
    </svg>
  )
}
