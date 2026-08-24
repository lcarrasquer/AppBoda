import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { EventNav } from '@/components/admin/EventNav'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'

export async function generateMetadata({ params }: { params: Promise<{ eventId: string }> }): Promise<Metadata> {
  const { eventId } = await params
  const supabase = await createClient()
  const { data: event } = await supabase
    .from('events')
    .select('bride_name, groom_name')
    .eq('id', eventId)
    .single()

  if (!event) return { title: 'Panel de Evento' }
  return {
    title: `Boda de ${event.bride_name} y ${event.groom_name}`,
  }
}

export default async function EventLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: event } = await supabase
    .from('events')
    .select('id, bride_name, groom_name, status')
    .eq('id', eventId)
    .single()

  if (!event) {
    redirect('/dashboard')
  }

  // Check if modules are enabled
  const { data: modules } = await supabase
    .from('event_modules')
    .select('module_key, is_enabled')
    .eq('event_id', eventId)

  const photosEnabled = modules?.find(m => m.module_key === 'photos')?.is_enabled || false
  const kahootEnabled = modules?.find(m => m.module_key === 'kahoot')?.is_enabled || false

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className={buttonVariants({ variant: 'ghost', size: 'icon' })}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Boda de {event.bride_name} y {event.groom_name}
            </h1>
            <p className="text-muted-foreground">
              {event.status === 'draft' ? 'Borrador' : 'Publicado'}
            </p>
          </div>
        </div>

        <EventNav eventId={eventId} photosEnabled={photosEnabled} kahootEnabled={kahootEnabled} />
      </div>

      <main className="pt-2">
        {children}
      </main>
    </div>
  )
}
