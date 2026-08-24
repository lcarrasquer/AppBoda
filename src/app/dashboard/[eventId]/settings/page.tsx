import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { updateEventSettings } from '../actions'
import { EventQRCode } from '@/components/admin/EventQRCode'
import { DownloadPhotosZip } from '@/components/admin/DownloadPhotosZip'

import { SettingsForm } from './SettingsForm'

export const metadata: Metadata = {
  title: 'Ajustes del Evento',
}

export default async function EventSettingsPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params
  const supabase = await createClient()

  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single()

  if (!event) return null

  // Ensure event.event_date is a string and formatted as YYYY-MM-DD for the input type="date"
  const formattedDate = event.event_date ? new Date(event.event_date).toISOString().split('T')[0] : ''

  const appUrl = process.env.NEXT_PUBLIC_APP_URL 
    ? process.env.NEXT_PUBLIC_APP_URL 
    : process.env.NEXT_PUBLIC_VERCEL_URL 
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` 
      : 'http://localhost:3000'

  return (
    <div className="space-y-6">
      {/* Download All Photos ZIP Section */}
      <DownloadPhotosZip eventId={event.id} eventSlug={event.slug} />

      {/* QR Code Section */}
      <EventQRCode
        slug={event.slug}
        brideName={event.bride_name}
        groomName={event.groom_name}
        appUrl={appUrl}
      />

      {/* General Settings Form Client Component */}
      <SettingsForm event={event} formattedDate={formattedDate} />
    </div>
  )
}
