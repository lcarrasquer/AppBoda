'use client'

import { useState, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { createChallenge, deleteChallenge } from '../actions'
import { Trash2, Trophy, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

export function ChallengeForm({ eventId, challenges }: { eventId: string; challenges: any[] }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [challengeToDelete, setChallengeToDelete] = useState<any | null>(null)
  const [deleting, setDeleting] = useState(false)

  const handleCreate = async (formData: FormData) => {
    try {
      await createChallenge(formData)
      toast.success('Reto fotográfico creado 🎯')
      formRef.current?.reset()
    } catch (err: any) {
      toast.error(err.message || 'Error al crear el reto')
    }
  }

  const handleConfirmDelete = async () => {
    if (!challengeToDelete) return
    try {
      setDeleting(true)
      const formData = new FormData()
      formData.append('event_id', eventId)
      formData.append('challenge_id', challengeToDelete.id)

      await deleteChallenge(formData)
      toast.success(`Reto "${challengeToDelete.title}" eliminado 🗑️`)
      setChallengeToDelete(null)
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar el reto')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" /> Retos Fotográficos
          </CardTitle>
          <CardDescription>
            Propón retos divertidos para que los invitados interactúen y se saquen fotos específicas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form ref={formRef} action={handleCreate} className="space-y-4 border-b pb-6">
            <input type="hidden" name="event_id" value={eventId} />
            <div className="space-y-2">
              <Label htmlFor="challenge_title">Título del Reto *</Label>
              <Input id="challenge_title" name="title" placeholder="Ej: Selfie con alguien de rojo" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="challenge_desc">Descripción (opcional)</Label>
              <Input id="challenge_desc" name="description" placeholder="Ej: Encuentra a la persona con el vestido rojo y sácate una foto." />
            </div>
            <Button type="submit" className="w-full font-bold">
              <Plus className="w-4 h-4 mr-1" /> Crear Reto
            </Button>
          </form>

          <div className="space-y-2 mt-4">
            {challenges.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-lg">No hay retos creados.</p>
            ) : (
              <ul className="space-y-2">
                {challenges.map(challenge => (
                  <li key={challenge.id} className="flex justify-between items-start bg-muted/50 p-3 rounded-lg border">
                    <div>
                      <p className="text-sm font-bold">{challenge.title}</p>
                      {challenge.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{challenge.description}</p>
                      )}
                    </div>
                    <Button 
                      type="button" 
                      onClick={() => setChallengeToDelete(challenge)}
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-destructive hover:bg-destructive/10 ml-2 shrink-0" 
                      title="Eliminar reto"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        isOpen={!!challengeToDelete}
        title={`¿Eliminar el reto "${challengeToDelete?.title}"?`}
        description="Este reto dejará de estar disponible para los invitados en la sala interactiva."
        confirmText="Eliminar reto"
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setChallengeToDelete(null)}
      />
    </>
  )
}
