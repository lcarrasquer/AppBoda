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
    <div className="min-h-screen bg-muted/20 pb-20" style={themeStyle}>
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 py-2 flex flex-col items-center justify-center relative">
          <h1 className="font-semibold text-lg text-primary truncate px-12">
            {event.bride_name} & {event.groom_name}
          </h1>
          <span className="text-[10px] text-muted-foreground font-mono tracking-wide opacity-70">
            Código: {slug}
          </span>
          {isOwner && (
            <Link 
              href={`/dashboard/${event.id}/settings`}
              className="absolute right-4 text-muted-foreground hover:text-primary transition-colors"
              title="Panel de Control"
            >
              <Settings className="w-5 h-5" />
            </Link>
          )}
        </div>
      </header>
      <main className="container mx-auto p-4">
        <GuestFlow event={event} />
      </main>
    </div>
  )
}
