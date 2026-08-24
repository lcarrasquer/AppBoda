import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { TagForm } from './TagForm'
import { ChallengeForm } from './ChallengeForm'

export const metadata: Metadata = {
  title: 'Fotos y Retos',
}

export default async function PhotosConfigPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params
  const supabase = await createClient()

  // Fetch tags
  const { data: tags } = await supabase
    .from('photo_tags')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })

  // Fetch challenges
  const { data: challenges } = await supabase
    .from('challenges')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TagForm eventId={eventId} tags={tags || []} />
        <ChallengeForm eventId={eventId} challenges={challenges || []} />
      </div>
    </div>
  )
}
