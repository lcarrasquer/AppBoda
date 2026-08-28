import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { getSeatingPlan } from './actions'
import { SeatingManager } from './SeatingManager'

export const metadata: Metadata = {
  title: 'Gestor de Mesas (Seating Plan)',
}

export default async function SeatingPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params
  const supabase = await createClient()

  // Verify event existence & ownership
  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single()

  if (!event) {
    notFound()
  }

  // Load existing tables, seated guests, and room landmarks
  const { tables, landmarks } = await getSeatingPlan(eventId)

  return (
    <SeatingManager 
      eventId={eventId}
      event={event}
      initialTables={tables || []}
      initialLandmarks={landmarks || []}
    />
  )
}
