'use client'

import { useState, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { createKahootQuiz, addKahootQuestion, deleteKahootQuestion } from '../actions'
import { Trash2, Gamepad2, Plus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export function KahootQuizForm({ eventId, quiz }: { eventId: string; quiz: any }) {
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (formData: FormData) => {
    try {
      setSaving(true)
      await createKahootQuiz(formData)
      toast.success('Ajustes de Kahoot guardados con éxito 🎮')
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar los ajustes de Kahoot')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gamepad2 className="w-5 h-5 text-primary" /> Configuración de Kahoot
        </CardTitle>
        <CardDescription>
          Personaliza el título del juego y el premio para el ganador.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          <input type="hidden" name="event_id" value={eventId} />
          <div className="space-y-2">
            <Label htmlFor="quiz_title">Título del Kahoot *</Label>
            <Input id="quiz_title" name="title" defaultValue={quiz?.title || '¿Cuánto conoces a los novios?'} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prize_description">Premio al Ganador (opcional)</Label>
            <Input id="prize_description" name="prize_description" defaultValue={quiz?.prize_description || ''} placeholder="Ej: Una botella de champán" />
          </div>
          <Button type="submit" disabled={saving} className="font-bold">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            {quiz ? 'Actualizar Ajustes' : 'Guardar Ajustes'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export function KahootQuestionForm({ eventId, quizId }: { eventId: string; quizId: string }) {
  const [saving, setSaving] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const handleSubmit = async (formData: FormData) => {
    try {
      setSaving(true)
      await addKahootQuestion(formData)
      toast.success('Pregunta añadida al quiz ❓')
      formRef.current?.reset()
    } catch (err: any) {
      toast.error(err.message || 'Error al añadir la pregunta')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="pt-4 border-t">
      <h4 className="font-bold text-base mb-4 flex items-center gap-2">
        <Plus className="w-4 h-4 text-primary" /> Añadir Nueva Pregunta
      </h4>
      <form ref={formRef} action={handleSubmit} className="space-y-4">
        <input type="hidden" name="event_id" value={eventId} />
        <input type="hidden" name="quiz_id" value={quizId} />
        
        <div className="space-y-2">
          <Label htmlFor="question_text">Pregunta *</Label>
          <Input id="question_text" name="question_text" placeholder="Ej: ¿Dónde se conocieron?" required />
        </div>

        <div className="space-y-4 pt-2">
          <Label className="font-semibold">Respuestas (Marca el círculo de la opción correcta) *</Label>
          {[1, 2, 3, 4].map((num) => (
            <div key={num} className="flex items-center gap-3">
              <input 
                type="radio" 
                name="correct_answer" 
                value={num.toString()} 
                required 
                className="w-4 h-4 mt-1 accent-primary" 
              />
              <Input 
                name={`answer_${num}`} 
                placeholder={`Respuesta ${num}`} 
                required={num <= 2} // Al menos 2 opciones obligatorias
              />
            </div>
          ))}
        </div>

        <Button type="submit" disabled={saving} className="mt-6 w-full font-bold">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
          Guardar Pregunta y Respuestas
        </Button>
      </form>
    </div>
  )
}

import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

export function DeleteKahootQuestionButton({ eventId, questionId }: { eventId: string; questionId: string }) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleConfirmDelete = async () => {
    try {
      setDeleting(true)
      const formData = new FormData()
      formData.append('event_id', eventId)
      formData.append('question_id', questionId)

      await deleteKahootQuestion(formData)
      toast.success('Pregunta eliminada 🗑️')
      setShowConfirm(false)
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar la pregunta')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <Button 
        type="button" 
        onClick={() => setShowConfirm(true)}
        variant="ghost" 
        size="icon" 
        className="absolute top-4 right-4 h-8 w-8 text-destructive hover:bg-destructive/10" 
        title="Eliminar pregunta"
      >
        <Trash2 className="w-4 h-4" />
      </Button>

      <ConfirmDialog
        isOpen={showConfirm}
        title="¿Eliminar esta pregunta del quiz?"
        description="Se eliminará la pregunta y sus respuestas asociadas del juego de Trivia."
        confirmText="Eliminar pregunta"
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setShowConfirm(false)}
      />
    </>
  )
}
