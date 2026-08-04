'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createEvent(formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const brideName = formData.get('bride_name') as string
  const groomName = formData.get('groom_name') as string
  const eventDate = formData.get('event_date') as string

  if (!brideName || !groomName || !eventDate) {
    return { error: 'Faltan campos obligatorios' }
  }

  // Generate a basic URL-friendly slug: bride-groom-random
  const baseSlug = `${brideName.trim().toLowerCase()}-${groomName.trim().toLowerCase()}`.replace(/[^a-z0-9]+/g, '-')
  const randomSuffix = Math.random().toString(36).substring(2, 6)
  const slug = `${baseSlug}-${randomSuffix}`

  const { data, error } = await supabase
    .from('events')
    .insert({
      owner_id: user.id,
      bride_name: brideName,
      groom_name: groomName,
      event_date: eventDate,
      slug: slug,
      status: 'draft'
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating event:', error)
    return { error: 'Error al crear el evento en la base de datos' }
  }

  // Also create default modules
  await supabase.from('event_modules').insert([
    { event_id: data.id, module_key: 'photos', is_enabled: false },
    { event_id: data.id, module_key: 'kahoot', is_enabled: false }
  ])

  revalidatePath('/dashboard')
  redirect(`/dashboard/${data.id}/settings`)
}

export async function deleteEvent(eventId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  // Verify ownership
  const { data: event, error: fetchError } = await supabase
    .from('events')
    .select('id, owner_id')
    .eq('id', eventId)
    .single()

  if (fetchError || !event) return { error: 'Evento no encontrado' }
  if (event.owner_id !== user.id) return { error: 'No tienes permiso para eliminar este evento' }

  // Delete all photos from storage (best-effort)
  const { data: photos } = await supabase
    .from('photos')
    .select('storage_path')
    .eq('event_id', eventId)

  if (photos && photos.length > 0) {
    const paths = photos.map(p => p.storage_path)
    await supabase.storage.from('event-media').remove(paths)
  }

  // Delete the event (cascade removes all related rows)
  const { error: deleteError } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId)

  if (deleteError) {
    console.error('Error deleting event:', deleteError)
    return { error: 'Error al eliminar el evento' }
  }

  revalidatePath('/dashboard')
  return { success: true }
}
