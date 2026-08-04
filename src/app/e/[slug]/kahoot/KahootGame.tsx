'use client'

import { useState, useEffect } from 'react'
import { getKahootData, submitKahootQuiz, getKahootLeaderboard } from './actions'
import { Button } from '@/components/ui/button'
import { Loader2, Trophy, Medal } from 'lucide-react'

type GameState = 'loading' | 'intro' | 'playing' | 'submitting' | 'finished' | 'error'

export default function KahootGame({ event }: { event: any }) {
  const [guestId, setGuestId] = useState<string | null>(null)
  const [gameState, setGameState] = useState<GameState>('loading')
  const [quizData, setQuizData] = useState<any>(null)
  const [questions, setQuestions] = useState<any[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [finalScore, setFinalScore] = useState<number | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const stored = localStorage.getItem(`appboda_guest_${event.id}`)
    if (stored) {
      setGuestId(stored)
      loadData(stored)
    } else {
      setErrorMsg('No se encontró tu ID de invitado. Por favor vuelve al muro y regístrate.')
      setGameState('error')
    }
  }, [event.id])

  const loadData = async (gId: string) => {
    const { quiz, questions, attempt, error } = await getKahootData(event.id, gId)
    
    if (error) {
      setErrorMsg(error)
      setGameState('error')
      return
    }

    setQuizData(quiz)
    setQuestions(questions || [])

    if (attempt) {
      // User already played
      setFinalScore(attempt.score)
      await fetchLeaderboard(quiz.id)
      setGameState('finished')
    } else {
      setGameState('intro')
    }
  }

  const fetchLeaderboard = async (qId: string) => {
    const res = await getKahootLeaderboard(qId)
    if (res.leaderboard) {
      setLeaderboard(res.leaderboard)
    }
  }

  const handleAnswer = (questionId: string, answerId: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answerId }))
    
    // Auto advance
    if (currentQuestionIndex < questions.length - 1) {
      setTimeout(() => {
        setCurrentQuestionIndex(prev => prev + 1)
      }, 400) // Small delay for visual feedback
    } else {
      // Finished all questions
      submitGame({ ...answers, [questionId]: answerId })
    }
  }

  const submitGame = async (finalAnswers: Record<string, string>) => {
    setGameState('submitting')
    if (!guestId || !quizData) return

    const res = await submitKahootQuiz(guestId, quizData.id, finalAnswers)
    if (res.error) {
      setErrorMsg(res.error)
      setGameState('error')
    } else {
      setFinalScore(res.score || 0)
      await fetchLeaderboard(quizData.id)
      setGameState('finished')
    }
  }

  if (gameState === 'loading') {
    return <div className="flex justify-center p-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
  }

  if (gameState === 'error') {
    return (
      <div className="p-8 text-center space-y-4">
        <div className="text-4xl">😕</div>
        <h2 className="text-xl font-bold">¡Vaya!</h2>
        <p className="text-muted-foreground">{errorMsg}</p>
      </div>
    )
  }

  if (gameState === 'intro') {
    return (
      <div className="p-8 text-center max-w-md mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500 mt-12">
        <div className="space-y-4">
          <Trophy className="w-24 h-24 mx-auto text-primary" />
          <h1 className="text-3xl font-black text-primary">{quizData?.title}</h1>
          {quizData?.prize_description && (
            <div className="bg-primary/10 border-primary/20 border p-4 rounded-xl">
              <p className="text-sm font-bold uppercase text-primary mb-1">Premio al ganador</p>
              <p className="text-lg">{quizData.prize_description}</p>
            </div>
          )}
          <p className="text-muted-foreground pt-4">
            Responde {questions.length} preguntas. La puntuación se basa en tus aciertos. ¡Solo tienes un intento!
          </p>
        </div>
        {questions.length === 0 ? (
          <div className="bg-destructive/10 border-destructive/20 border p-4 rounded-xl text-destructive">
            <p className="font-bold">Aún no hay preguntas</p>
            <p className="text-sm">El juego está activado pero los novios aún no han añadido preguntas a la trivia.</p>
          </div>
        ) : (
          <Button size="lg" className="w-full text-xl py-8 rounded-2xl shadow-xl" onClick={() => setGameState('playing')}>
            ¡Empezar a Jugar!
          </Button>
        )}
      </div>
    )
  }

  if (gameState === 'playing') {
    const currentQuestion = questions[currentQuestionIndex]
    
    // UI colors mapping for answers like real Kahoot
    const colorClasses = [
      'bg-red-500 hover:bg-red-600',
      'bg-blue-500 hover:bg-blue-600',
      'bg-yellow-500 hover:bg-yellow-600',
      'bg-green-500 hover:bg-green-600'
    ]

    return (
      <div className="flex flex-col min-h-[calc(100vh-60px)]">
        {/* Progress bar */}
        <div className="h-2 bg-muted w-full">
          <div 
            className="h-full bg-primary transition-all duration-300" 
            style={{ width: `${((currentQuestionIndex) / questions.length) * 100}%` }}
          />
        </div>
        
        <div className="flex-1 flex flex-col p-4 sm:p-8 max-w-2xl mx-auto w-full">
          <div className="text-center mb-8 flex-1 flex flex-col justify-center">
            <span className="text-muted-foreground font-bold mb-4">Pregunta {currentQuestionIndex + 1} de {questions.length}</span>
            <h2 className="text-2xl sm:text-4xl font-black leading-tight">
              {currentQuestion.question_text}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-auto">
            {currentQuestion.kahoot_answers.map((answer: any, index: number) => {
              const isSelected = answers[currentQuestion.id] === answer.id
              const hasAnswered = !!answers[currentQuestion.id]

              return (
                <button
                  key={answer.id}
                  disabled={hasAnswered}
                  onClick={() => handleAnswer(currentQuestion.id, answer.id)}
                  className={`
                    ${colorClasses[index % 4]} text-white p-6 sm:p-8 rounded-xl sm:rounded-2xl shadow-md
                    text-left text-lg sm:text-2xl font-bold transition-all
                    active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
                    ${isSelected ? 'ring-4 ring-white ring-inset opacity-100 scale-95' : ''}
                  `}
                >
                  {answer.answer_text}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  if (gameState === 'submitting') {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4 text-center h-[60vh]">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <h2 className="text-2xl font-bold">Calculando puntuación...</h2>
      </div>
    )
  }

  if (gameState === 'finished') {
    return (
      <div className="p-4 sm:p-8 max-w-md mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="text-center space-y-2 mt-4">
          <p className="text-lg font-bold text-muted-foreground uppercase tracking-widest">Tu Puntuación</p>
          <div className="text-6xl font-black text-primary drop-shadow-sm">{finalScore}</div>
        </div>

        <div className="bg-muted/50 rounded-2xl p-6 border shadow-sm">
          <h3 className="font-bold text-xl mb-4 text-center flex justify-center items-center gap-2">
            <Medal className="w-6 h-6 text-yellow-500" /> Leaderboard
          </h3>
          
          <div className="space-y-3">
            {leaderboard.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm">Aún no hay puntuaciones.</p>
            ) : (
              leaderboard.map((entry, idx) => (
                <div 
                  key={idx} 
                  className={`flex justify-between items-center p-3 rounded-lg ${
                    entry.guest_id === guestId ? 'bg-primary text-primary-foreground font-bold shadow-md' : 'bg-background'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm opacity-70 w-4">{idx + 1}.</span>
                    <span>{entry.full_name} {entry.guest_id === guestId && '(Tú)'}</span>
                  </div>
                  <span className="font-bold">{entry.score} pts</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    )
  }

  return null
}
