import type { Metadata } from 'next'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { KahootQuizForm, KahootQuestionForm, DeleteKahootQuestionButton } from './KahootForm'

export const metadata: Metadata = {
  title: 'Configuración Trivia / Kahoot',
}

export default async function KahootConfigPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params

  // Use Admin Client to bypass RLS issues for reading Kahoot config
  const adminClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false },
      global: { fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }) }
    }
  )

  // Fetch or create the quiz
  let { data: quiz } = await adminClient
    .from('kahoot_quizzes')
    .select('*')
    .eq('event_id', eventId)
    .single()

  // Fetch questions if quiz exists
  let questions: any[] = []
  if (quiz) {
    const { data: q } = await adminClient
      .from('kahoot_questions')
      .select('*, kahoot_answers(*)')
      .eq('quiz_id', quiz.id)
      .order('sort_order', { ascending: true })
    questions = q || []
  }

  return (
    <div className="space-y-6">
      {/* Quiz Settings Client Component */}
      <KahootQuizForm eventId={eventId} quiz={quiz} />

      {quiz && (
        <Card>
          <CardHeader>
            <CardTitle>Preguntas Configurada ({questions.length})</CardTitle>
            <CardDescription>Añade preguntas a tu quiz (mínimo recomendado: 5).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Lista de preguntas existentes */}
            {questions.map((question, index) => (
              <div key={question.id} className="p-4 border rounded-xl space-y-4 bg-muted/20 relative">
                <DeleteKahootQuestionButton eventId={eventId} questionId={question.id} />
                
                <h4 className="font-bold text-base pr-10">{index + 1}. {question.question_text}</h4>
                
                <div className="pl-4 space-y-1.5 border-l-2 border-primary/40">
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2">Respuestas:</p>
                  {question.kahoot_answers?.map((ans: any) => (
                    <div key={ans.id} className="flex items-center gap-2 text-sm">
                      <span className={ans.is_correct ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-foreground/80'}>
                        {ans.answer_text} {ans.is_correct && '✓ (Correcta)'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Añadir pregunta con respuestas */}
            <KahootQuestionForm eventId={eventId} quizId={quiz.id} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
