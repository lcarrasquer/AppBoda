import { getEventBySlug } from './actions'
import GuestFlow from './GuestFlow'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Settings } from 'lucide-react'

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const event = await getEventBySlug(slug)

  if (!event || event.status === 'archived') {
    notFound()
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isOwner = user?.id === event.owner_id

  // Build dynamic theme style from event's primary color
  const themeStyle = event.primary_color
    ? {
        '--primary': event.primary_color,
        '--ring': event.primary_color,
      } as React.CSSProperties
    : undefined

  return (
    <div className="min-h-screen pb-20 relative overflow-hidden" style={themeStyle}>
      {/* Background glowing orb accents */}
      <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-primary/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-sky-400/15 rounded-full blur-3xl pointer-events-none" />

      <header className="sticky top-0 z-20 glass-panel backdrop-blur-xl border-b border-white/40 dark:border-white/10 shadow-sm">
        <div className="container mx-auto px-4 py-3 flex flex-col items-center justify-center relative">
          <h1 className="font-extrabold text-lg bg-gradient-to-r from-primary via-sky-600 to-primary bg-clip-text text-transparent truncate px-12">
            {event.bride_name} & {event.groom_name}
          </h1>
          <span className="text-[11px] font-semibold text-muted-foreground/80 font-mono tracking-wide px-2.5 py-0.5 rounded-full glass-pill mt-0.5 border border-white/50 dark:border-white/10">
            Código: {slug}
          </span>
          {isOwner && (
            <Link 
              href={`/dashboard/${event.id}/settings`}
              className="absolute right-4 p-2 rounded-xl glass-pill text-muted-foreground hover:text-primary transition-all hover:scale-105 shadow-sm"
              title="Panel de Control"
            >
              <Settings className="w-5 h-5" />
            </Link>
          )}
        </div>
      </header>
      <main className="container mx-auto p-4 z-10 relative">
        <GuestFlow event={event} />
      </main>
    </div>
  )
}
