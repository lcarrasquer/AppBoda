import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { createKahootQuiz, addKahootQuestion, deleteKahootQuestion } from '../actions'
import { Trash2 } from 'lucide-react'

export default async function KahootConfigPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params
  const supabase = await createClient()

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

  if (!quiz) {
    // We can auto-create an empty one if not exists, but let's let the form do it
  }

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
      <Card>
        <CardHeader>
          <CardTitle>Configuración de Kahoot</CardTitle>
          <CardDescription>
            Personaliza el título del juego y el premio para el ganador.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createKahootQuiz} className="space-y-4">
            <input type="hidden" name="event_id" value={eventId} />
            <div className="space-y-2">
              <Label htmlFor="quiz_title">Título del Kahoot</Label>
              <Input id="quiz_title" name="title" defaultValue={quiz?.title || '¿Cuánto conoces a los novios?'} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prize_description">Premio al Ganador</Label>
              <Input id="prize_description" name="prize_description" defaultValue={quiz?.prize_description || ''} placeholder="Ej: Una botella de champán" />
            </div>
            <Button type="submit">{quiz ? 'Actualizar Ajustes' : 'Guardar Ajustes'}</Button>
          </form>
        </CardContent>
      </Card>

      {quiz && (
        <Card>
          <CardHeader>
            <CardTitle>Preguntas</CardTitle>
            <CardDescription>Añade preguntas a tu quiz (mínimo recomendado: 5).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Lista de preguntas existentes */}
            {questions.map((question, index) => (
              <div key={question.id} className="p-4 border rounded-md space-y-4 bg-muted/20 relative">
                <form action={deleteKahootQuestion} className="absolute top-4 right-4">
                  <input type="hidden" name="event_id" value={eventId} />
                  <input type="hidden" name="question_id" value={question.id} />
                  <Button type="submit" variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </form>
                
                <h4 className="font-semibold text-lg pr-10">{index + 1}. {question.question_text}</h4>
                
                <div className="pl-4 space-y-2 border-l-2">
                  <p className="text-sm text-muted-foreground font-medium mb-2">Respuestas:</p>
                  {question.kahoot_answers?.map((ans: any) => (
                    <div key={ans.id} className="flex items-center gap-2 text-sm">
                      <span className={ans.is_correct ? 'text-green-600 font-bold' : ''}>
                        {ans.answer_text} {ans.is_correct && '(Correcta)'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Añadir pregunta con respuestas */}
            <div className="pt-4 border-t">
              <h4 className="font-medium mb-4">Añadir Nueva Pregunta</h4>
              <form action={addKahootQuestion} className="space-y-4">
                <input type="hidden" name="event_id" value={eventId} />
                <input type="hidden" name="quiz_id" value={quiz.id} />
                
                <div className="space-y-2">
                  <Label htmlFor="question_text">Pregunta</Label>
                  <Input id="question_text" name="question_text" placeholder="Ej: ¿Dónde se conocieron?" required />
                </div>

                <div className="space-y-4 pt-2">
                  <Label>Respuestas (Marca el círculo de la correcta)</Label>
                  {[1, 2, 3, 4].map((num) => (
                    <div key={num} className="flex items-center gap-3">
                      <input 
                        type="radio" 
                        name="correct_answer" 
                        value={num.toString()} 
                        required 
                        className="w-4 h-4 mt-1" 
                      />
                      <Input 
                        name={`answer_${num}`} 
                        placeholder={`Respuesta ${num}`} 
                        required={num <= 2} // Al menos 2 opciones obligatorias
                      />
                    </div>
                  ))}
                </div>

                <Button type="submit" className="mt-6 w-full">Guardar Pregunta y Respuestas</Button>
              </form>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
