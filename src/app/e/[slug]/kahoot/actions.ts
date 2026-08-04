'use server'

import { createClient } from '@/lib/supabase/server'
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

export async function getKahootData(eventId: string, guestId: string) {
  const supabase = await createClient()
  const adminClient = getAdminClient()

  // 1. Get active quiz (treat null as active — only exclude explicitly deactivated)
  const { data: quiz, error: quizError } = await adminClient
    .from('kahoot_quizzes')
    .select('*')
    .eq('event_id', eventId)
    .neq('is_active', false)
    .single()

  if (quizError) {
    console.error('Error fetching quiz:', quizError)
  }

  if (!quiz) return { error: 'No hay Kahoot activo para esta boda.' }

  // 2. Get questions and answers
  const { data: questions, error: qError } = await adminClient
    .from('kahoot_questions')
    .select('*, kahoot_answers(*)')
    .eq('quiz_id', quiz.id)

  if (qError) {
    console.error('Error fetching kahoot questions:', qError)
  }

  // Omit is_correct from payload sent to client to prevent cheating
  const safeQuestions = (questions || []).map(q => ({
    ...q,
    kahoot_answers: (q.kahoot_answers || []).map((a: any) => ({
      id: a.id,
      answer_text: a.answer_text
    }))
  }))

  // 3. Check if guest has attempt
  const { data: attempt } = await adminClient
    .from('kahoot_attempts')
    .select('*')
    .eq('quiz_id', quiz.id)
    .eq('guest_id', guestId)
    .single()

  return { quiz, questions: safeQuestions, attempt }
}

export async function submitKahootQuiz(guestId: string, quizId: string, answers: Record<string, string>) {
  const adminClient = getAdminClient()

  try {
    // 1. Fetch real answers to calculate score
    const { data: questions } = await adminClient
      .from('kahoot_questions')
      .select('id, points, kahoot_answers(id, is_correct)')
      .eq('quiz_id', quizId)

    if (!questions) throw new Error('Quiz not found')

    let score = 0
    const responsesToInsert = []

    // 2. Calculate score and prepare responses
    for (const q of questions) {
      const selectedAnswerId = answers[q.id]
      if (!selectedAnswerId) continue

      const correctAnswer = q.kahoot_answers.find((a: any) => a.is_correct)
      const isCorrect = correctAnswer?.id === selectedAnswerId

      if (isCorrect) score += q.points

      responsesToInsert.push({
        question_id: q.id,
        answer_id: selectedAnswerId,
        is_correct: isCorrect
      })
    }

    // 3. Create Attempt
    const { data: attempt, error: attemptError } = await adminClient
      .from('kahoot_attempts')
      .insert({
        quiz_id: quizId,
        guest_id: guestId,
        score: score,
        completed_at: new Date().toISOString()
      })
      .select()
      .single()

    if (attemptError) {
      if (attemptError.code === '23505') {
        // Unique violation - already played
        return { error: 'Ya has jugado este Kahoot.' }
      }
      throw attemptError
    }

    // 4. Insert responses
    if (responsesToInsert.length > 0) {
      const responsesWithAttemptId = responsesToInsert.map(r => ({
        ...r,
        attempt_id: attempt.id
      }))
      await adminClient.from('kahoot_responses').insert(responsesWithAttemptId)
    }

    return { success: true, score }

  } catch (error) {
    console.error('Error submitting kahoot:', error)
    return { error: 'Ocurrió un error al guardar tus respuestas.' }
  }
}

export async function getKahootLeaderboard(quizId: string) {
  const adminClient = getAdminClient()
  
  // Note: kahoot_leaderboard is a view we created in schema.sql
  const { data } = await adminClient
    .from('kahoot_leaderboard')
    .select('*')
    .eq('quiz_id', quizId)
    .limit(10)

  return { leaderboard: data || [] }
}
