import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { createPhotoTag, deletePhotoTag, createChallenge, deleteChallenge } from '../actions'
import { Trash2 } from 'lucide-react'

export default async function PhotosConfigPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params
  const supabase = await createClient()

  // Fetch tags
  const { data: tags } = await supabase
    .from('photo_tags')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })

  // Fetch challenges
  const { data: challenges } = await supabase
    .from('challenges')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Etiquetas */}
        <Card>
          <CardHeader>
            <CardTitle>Etiquetas de Fotos</CardTitle>
            <CardDescription>
              Crea categorías para que los invitados puedan clasificar sus fotos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form action={createPhotoTag} className="flex gap-2 items-end">
              <input type="hidden" name="event_id" value={eventId} />
              <div className="flex-1 space-y-2">
                <Label htmlFor="tag_name">Nueva Etiqueta</Label>
                <Input id="tag_name" name="name" placeholder="Ej: Ceremonia" required />
              </div>
              <Button type="submit">Añadir</Button>
            </form>

            <div className="space-y-2 mt-4">
              {tags?.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4 border rounded-md">No hay etiquetas creadas.</p>
              ) : (
                <ul className="space-y-2">
                  {tags?.map(tag => (
                    <li key={tag.id} className="flex justify-between items-center bg-muted/50 p-2 px-3 rounded-md">
                      <span className="text-sm font-medium">{tag.name}</span>
                      <form action={deletePhotoTag}>
                        <input type="hidden" name="event_id" value={eventId} />
                        <input type="hidden" name="tag_id" value={tag.id} />
                        <Button type="submit" variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Retos */}
        <Card>
          <CardHeader>
            <CardTitle>Retos Fotográficos</CardTitle>
            <CardDescription>
              Propón retos divertidos para que los invitados interactúen y se saquen fotos específicas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form action={createChallenge} className="space-y-4 border-b pb-6">
              <input type="hidden" name="event_id" value={eventId} />
              <div className="space-y-2">
                <Label htmlFor="challenge_title">Título del Reto</Label>
                <Input id="challenge_title" name="title" placeholder="Ej: Selfie con alguien de rojo" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="challenge_desc">Descripción (opcional)</Label>
                <Input id="challenge_desc" name="description" placeholder="Ej: Encuentra a la persona con el vestido rojo y sácate una foto." />
              </div>
              <Button type="submit" className="w-full">Crear Reto</Button>
            </form>

            <div className="space-y-2 mt-4">
              {challenges?.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4 border rounded-md">No hay retos creados.</p>
              ) : (
                <ul className="space-y-2">
                  {challenges?.map(challenge => (
                    <li key={challenge.id} className="flex justify-between items-start bg-muted/50 p-3 rounded-md">
                      <div>
                        <p className="text-sm font-semibold">{challenge.title}</p>
                        {challenge.description && (
                          <p className="text-xs text-muted-foreground mt-1">{challenge.description}</p>
                        )}
                      </div>
                      <form action={deleteChallenge}>
                        <input type="hidden" name="event_id" value={eventId} />
                        <input type="hidden" name="challenge_id" value={challenge.id} />
                        <Button type="submit" variant="ghost" size="icon" className="h-8 w-8 text-destructive ml-2 shrink-0">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
