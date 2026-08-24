import type { Metadata } from 'next'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import { InvitationDesigner } from './InvitationDesigner'

export const metadata: Metadata = {
  title: 'Diseñar Invitación & Tarjetas de Mesa',
}

export default async function InvitationPage({
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

  const { data: event } = await adminClient
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single()

  if (!event) {
    notFound()
  }

  // Fetch modules
  const { data: modules } = await adminClient
    .from('event_modules')
    .select('module_key, is_enabled')
    .eq('event_id', eventId)

  return (
    <div className="space-y-6">
      <InvitationDesigner event={event} modules={modules || []} />
    </div>
  )
}
