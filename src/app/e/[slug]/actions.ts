'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function getEventBySlug(slug: string) {
  const supabase = getAdminClient()
  const { data, error } = await supabase
    .from('events')
    .select('id, slug, owner_id, bride_name, groom_name, event_date, location, primary_color, status')
    .eq('slug', slug)
    .single()
  
  if (error || !data) {
    return null
  }

  const { data: modules } = await supabase
    .from('event_modules')
    .select('module_key, is_enabled')
    .eq('event_id', data.id)

  return { ...data, modules: modules || [] }
}

export async function registerGuest(eventId: string, fullName: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('guests')
    .insert({
      event_id: eventId,
      full_name: fullName
    })
    .select()
    .single()

  if (error) {
    console.error('Error registering guest:', error)
    return { error: 'No se pudo registrar como invitado' }
  }

  return { guest: data }
}

export async function getPhotos(eventId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('photos')
    .select('*, guests(full_name), photo_tag_assignments(tag_id), photo_likes(guest_id)')
    .eq('event_id', eventId)
    .eq('is_hidden', false)
    .order('created_at', { ascending: false })
  
  return { data, error }
}

export async function getEventTagsAndChallenges(eventId: string) {
  const supabase = await createClient()
  
  const { data: tags } = await supabase
    .from('photo_tags')
    .select('*')
    .eq('event_id', eventId)
    .order('sort_order', { ascending: true })

  const { data: challenges } = await supabase
    .from('challenges')
    .select('*')
    .eq('event_id', eventId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  return { tags: tags || [], challenges: challenges || [] }
}

export async function savePhotoRecord(
  eventId: string, 
  guestId: string, 
  storagePath: string,
  challengeId?: string | null,
  tagIds?: string[]
) {
  const supabase = await createClient()
  const { data: photo, error } = await supabase
    .from('photos')
    .insert({
      event_id: eventId,
      guest_id: guestId,
      storage_path: storagePath,
      challenge_id: challengeId || null
    })
    .select()
    .single()
  
  if (error || !photo) {
    console.error('Error saving photo record:', error)
    return { error: 'No se pudo guardar la foto' }
  }

  // Insert tag assignments
  if (tagIds && tagIds.length > 0) {
    const assignments = tagIds.map(tagId => ({
      photo_id: photo.id,
      tag_id: tagId
    }))
    
    await supabase.from('photo_tag_assignments').insert(assignments)
  }

  return { photo }
}

export async function toggleLike(photoId: string, guestId: string) {
  const adminClient = getAdminClient()
  
  // Check if like exists
  const { data: existingLike } = await adminClient
    .from('photo_likes')
    .select('id')
    .eq('photo_id', photoId)
    .eq('guest_id', guestId)
    .maybeSingle()

  if (existingLike) {
    // Remove like
    await adminClient.from('photo_likes').delete().eq('id', existingLike.id)
    // Recalculate exact count
    const { count } = await adminClient
      .from('photo_likes')
      .select('*', { count: 'exact', head: true })
      .eq('photo_id', photoId)
    
    const newCount = count ?? 0
    await adminClient.from('photos').update({ likes_count: newCount }).eq('id', photoId)
    return { liked: false, likesCount: newCount }
  } else {
    // Add like
    await adminClient.from('photo_likes').insert({ photo_id: photoId, guest_id: guestId })
    // Recalculate exact count
    const { count } = await adminClient
      .from('photo_likes')
      .select('*', { count: 'exact', head: true })
      .eq('photo_id', photoId)
    
    const newCount = count ?? 1
    await adminClient.from('photos').update({ likes_count: newCount }).eq('id', photoId)
    return { liked: true, likesCount: newCount }
  }
}

export async function deletePhoto(photoId: string, guestId: string, storagePath: string) {
  const adminClient = getAdminClient()
  
  // Verificamos que la foto pertenece al guest
  const { data: photo } = await adminClient
    .from('photos')
    .select('id')
    .eq('id', photoId)
    .eq('guest_id', guestId)
    .single()

  if (!photo) {
    return { error: 'No tienes permiso para borrar esta foto' }
  }

  // Delete from storage
  await adminClient.storage.from('event-media').remove([storagePath])

  // Delete from DB
  await adminClient.from('photos').delete().eq('id', photoId)

  return { success: true }
}

export async function checkGuestKahootAttempt(eventId: string, guestId: string) {
  const adminClient = getAdminClient()
  const { data: quiz } = await adminClient
    .from('kahoot_quizzes')
    .select('id')
    .eq('event_id', eventId)
    .neq('is_active', false)
    .single()

  if (!quiz) return { hasPlayed: false }

  const { data: attempt } = await adminClient
    .from('kahoot_attempts')
    .select('id')
    .eq('quiz_id', quiz.id)
    .eq('guest_id', guestId)
    .single()

  return { hasPlayed: !!attempt }
}

export async function getEventSchedule(eventId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('event_schedule')
    .select('*')
    .eq('event_id', eventId)
    .order('scheduled_time', { ascending: true })

  return { schedule: data || [] }
}

export async function addGuestbookEntry(
  eventId: string,
  guestId: string,
  content: string,
  isPrivate: boolean = false
) {
  const supabase = await createClient()

  if (!content || !content.trim()) {
    return { error: 'El mensaje no puede estar vacío' }
  }

  const { data, error } = await supabase
    .from('guestbook_entries')
    .insert({
      event_id: eventId,
      guest_id: guestId,
      type: 'text',
      content: content.trim(),
      is_private: isPrivate
    })
    .select()
    .single()

  if (error) {
    console.error('Error adding guestbook entry:', error)
    return { error: 'No se pudo publicar la dedicatoria' }
  }

  revalidatePath(`/dashboard/${eventId}/guestbook`)

  return { entry: data }
}

export async function getGuestbookEntries(eventId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('guestbook_entries')
    .select('*, guests(full_name)')
    .eq('event_id', eventId)
    .eq('is_private', false)
    .order('created_at', { ascending: false })

  return { entries: data || [] }
}

export async function getEventSeatingPlan(eventId: string) {
  const { getSeatingPlan } = await import('@/app/dashboard/[eventId]/seating/actions')
  return await getSeatingPlan(eventId)
}
