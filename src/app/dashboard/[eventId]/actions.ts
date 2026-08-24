'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false },
      global: { fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }) }
    }
  )
}

export async function updateEventSettings(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const eventId = formData.get('event_id') as string
  const brideName = formData.get('bride_name') as string
  const groomName = formData.get('groom_name') as string
  const eventDate = formData.get('event_date') as string
  const location = formData.get('location') as string
  const pinEnabled = formData.get('pin_enabled') === 'on'
  const pinCode = formData.get('pin_code') as string
  const primaryColor = formData.get('primary_color') as string

  // Check if user owns the event
  const { data: event } = await supabase
    .from('events')
    .select('owner_id')
    .eq('id', eventId)
    .single()

  if (event?.owner_id !== user.id) {
    throw new Error('Unauthorized or event not found')
  }

  const { error } = await supabase
    .from('events')
    .update({
      bride_name: brideName,
      groom_name: groomName,
      event_date: eventDate,
      location,
      pin_enabled: pinEnabled,
      pin_code: pinCode || null,
      primary_color: primaryColor,
      updated_at: new Date().toISOString()
    })
    .eq('id', eventId)

  if (error) {
    console.error('Error updating event settings:', error)
    throw new Error('Error al actualizar los ajustes')
  }

  revalidatePath(`/dashboard/${eventId}/settings`)
}

export async function toggleModule(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const eventId = formData.get('event_id') as string
  const moduleKey = formData.get('module_key') as string
  const isEnabled = formData.get('is_enabled') === 'true'

  const { data: event } = await supabase
    .from('events')
    .select('owner_id')
    .eq('id', eventId)
    .single()

  if (event?.owner_id !== user.id) {
    throw new Error('Unauthorized or event not found')
  }

  const { error } = await supabase
    .from('event_modules')
    .update({ is_enabled: isEnabled })
    .match({ event_id: eventId, module_key: moduleKey })

  if (error) {
    console.error('Error toggling module:', error)
    throw new Error('Error al cambiar estado del módulo')
  }

  revalidatePath(`/dashboard/${eventId}/layout`)
  revalidatePath(`/dashboard/${eventId}/modules`)
}

export async function createPhotoTag(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const eventId = formData.get('event_id') as string
  const name = formData.get('name') as string

  const { error } = await supabase
    .from('photo_tags')
    .insert({ event_id: eventId, name })

  if (error) {
    console.error('Error creating photo tag:', error)
    throw new Error('Error al crear la etiqueta')
  }

  revalidatePath(`/dashboard/${eventId}/photos-config`)
}

export async function deletePhotoTag(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const eventId = formData.get('event_id') as string
  const tagId = formData.get('tag_id') as string

  const { error } = await supabase
    .from('photo_tags')
    .delete()
    .eq('id', tagId)

  if (error) {
    console.error('Error deleting photo tag:', error)
    throw new Error('Error al eliminar la etiqueta')
  }

  revalidatePath(`/dashboard/${eventId}/photos-config`)
}

export async function createChallenge(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const eventId = formData.get('event_id') as string
  const title = formData.get('title') as string
  const description = formData.get('description') as string

  const { error } = await supabase
    .from('challenges')
    .insert({ event_id: eventId, title, description: description || null })

  if (error) {
    console.error('Error creating challenge:', error)
    throw new Error('Error al crear el reto')
  }

  revalidatePath(`/dashboard/${eventId}/photos-config`)
}

export async function deleteChallenge(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const eventId = formData.get('event_id') as string
  const challengeId = formData.get('challenge_id') as string

  const { error } = await supabase
    .from('challenges')
    .delete()
    .eq('id', challengeId)

  if (error) {
    console.error('Error deleting challenge:', error)
    throw new Error('Error al eliminar el reto')
  }

  revalidatePath(`/dashboard/${eventId}/photos-config`)
}

export async function createKahootQuiz(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const adminClient = getAdminClient()

  const eventId = formData.get('event_id') as string
  const title = formData.get('title') as string
  const prizeDescription = formData.get('prize_description') as string

  // UPSERT: check if exists
  const { data: existing } = await adminClient
    .from('kahoot_quizzes')
    .select('id')
    .eq('event_id', eventId)
    .single()

  if (existing) {
    await adminClient.from('kahoot_quizzes').update({
      title, prize_description: prizeDescription
    }).eq('id', existing.id)
  } else {
    await adminClient.from('kahoot_quizzes').insert({
      event_id: eventId,
      title,
      prize_description: prizeDescription,
      is_active: true
    })
  }

  revalidatePath(`/dashboard/${eventId}/kahoot-config`)
}

export async function addKahootQuestion(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const adminClient = getAdminClient()

  const eventId = formData.get('event_id') as string
  const quizId = formData.get('quiz_id') as string
  const questionText = formData.get('question_text') as string

  const answer1 = formData.get('answer_1') as string
  const answer2 = formData.get('answer_2') as string
  const answer3 = formData.get('answer_3') as string
  const answer4 = formData.get('answer_4') as string
  const correctAnswerIndex = formData.get('correct_answer') as string

  const { data: question, error: qError } = await adminClient.from('kahoot_questions').insert({
    quiz_id: quizId,
    question_text: questionText
  }).select().single()

  if (qError || !question) {
    console.error('Error creating question:', qError)
    throw new Error('Error al crear la pregunta')
  }

  const answersToInsert = [
    { question_id: question.id, answer_text: answer1, is_correct: correctAnswerIndex === '1' },
    { question_id: question.id, answer_text: answer2, is_correct: correctAnswerIndex === '2' },
    { question_id: question.id, answer_text: answer3, is_correct: correctAnswerIndex === '3' },
    { question_id: question.id, answer_text: answer4, is_correct: correctAnswerIndex === '4' }
  ].filter(a => a.answer_text && a.answer_text.trim() !== '')

  if (answersToInsert.length > 0) {
    const { error: aError } = await adminClient.from('kahoot_answers').insert(answersToInsert)
    if (aError) {
      console.error('Error inserting answers:', aError)
      throw new Error('Error al crear las respuestas')
    }
  }

  revalidatePath(`/dashboard/${eventId}/kahoot-config`)
}

export async function deleteKahootQuestion(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const adminClient = getAdminClient()

  const eventId = formData.get('event_id') as string
  const questionId = formData.get('question_id') as string

  await adminClient.from('kahoot_questions').delete().eq('id', questionId)

  revalidatePath(`/dashboard/${eventId}/kahoot-config`)
}

export async function addKahootAnswer(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const adminClient = getAdminClient()

  const eventId = formData.get('event_id') as string
  const questionId = formData.get('question_id') as string
  const answerText = formData.get('answer_text') as string
  const isCorrect = formData.get('is_correct') === 'on'

  await adminClient.from('kahoot_answers').insert({
    question_id: questionId,
    answer_text: answerText,
    is_correct: isCorrect
  })

  revalidatePath(`/dashboard/${eventId}/kahoot-config`)
}

export async function createScheduleItem(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const adminClient = getAdminClient()

  const eventId = formData.get('event_id') as string
  const title = formData.get('title') as string
  const scheduledTime = formData.get('scheduled_time') as string
  const location = formData.get('location') as string
  const rawDescription = formData.get('description') as string
  const icon = formData.get('icon') as string
  const sortOrder = parseInt(formData.get('sort_order') as string || '0', 10)

  if (!eventId || !title || !scheduledTime) {
    throw new Error('Faltan campos obligatorios')
  }

  const { formatScheduleDescription } = await import('@/lib/utils')
  const formattedDesc = formatScheduleDescription(location, rawDescription)

  const { error } = await adminClient.from('event_schedule').insert({
    event_id: eventId,
    title,
    scheduled_time: scheduledTime,
    description: formattedDesc || null,
    icon: icon || '💍',
    sort_order: sortOrder
  })

  if (error) {
    console.error('Error creating schedule item:', error)
    throw new Error('Error al añadir hito al cronograma')
  }

  revalidatePath(`/dashboard/${eventId}/schedule`)
}

export async function deleteScheduleItem(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const adminClient = getAdminClient()

  const eventId = formData.get('event_id') as string
  const itemId = formData.get('item_id') as string

  const { error } = await adminClient.from('event_schedule').delete().eq('id', itemId)

  if (error) {
    console.error('Error deleting schedule item:', error)
    throw new Error('Error al eliminar hito')
  }

  revalidatePath(`/dashboard/${eventId}/schedule`)
}

export async function deleteGuestbookEntry(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const eventId = formData.get('event_id') as string
  const entryId = formData.get('entry_id') as string

  if (!eventId || !entryId) {
    throw new Error('Faltan parámetros')
  }

  // Verificamos que el usuario actual sea el dueño del evento
  const { data: event } = await supabase
    .from('events')
    .select('owner_id')
    .eq('id', eventId)
    .single()

  if (!event || event.owner_id !== user.id) {
    throw new Error('No tienes permisos para realizar esta acción')
  }

  const adminClient = getAdminClient()
  const { error } = await adminClient.from('guestbook_entries').delete().eq('id', entryId)

  if (error) {
    console.error('Error deleting guestbook entry:', error)
    // Fallback: borrar con cliente autenticado
    const { error: userErr } = await supabase.from('guestbook_entries').delete().eq('id', entryId)
    if (userErr) {
      console.error('Fallback delete error:', userErr)
      throw new Error('Error al eliminar mensaje')
    }
  }

  revalidatePath(`/dashboard/${eventId}/guestbook`)
}
