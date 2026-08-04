import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '/Users/germancardiel/Desktop/AppBoda/.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function test() {
  const { data: quiz, error: quizError } = await supabase.from('kahoot_quizzes').select('*').limit(1).single()
  console.log('Quiz:', quiz, 'QuizError:', quizError)

  if (quiz) {
    const { data: question, error } = await supabase.from('kahoot_questions').insert({
      quiz_id: quiz.id,
      question_text: 'Test Question 2'
    }).select().single()

    console.log('Question insert result:', question, 'Error:', error)
    
    if (question) {
      const { error: aError } = await supabase.from('kahoot_answers').insert([
        { question_id: question.id, answer_text: 'Answer 1', is_correct: true },
        { question_id: question.id, answer_text: 'Answer 2', is_correct: false }
      ])
      console.log('Answers insert error:', aError)
    }
  }
}

test()
