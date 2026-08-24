'use client'

import { useState, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { createPhotoTag, deletePhotoTag } from '../actions'
import { Trash2, Tag, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

export function TagForm({ eventId, tags }: { eventId: string; tags: any[] }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [tagToDelete, setTagToDelete] = useState<any | null>(null)
  const [deleting, setDeleting] = useState(false)

  const handleCreate = async (formData: FormData) => {
    try {
      await createPhotoTag(formData)
      toast.success('Etiqueta creada con éxito 🏷️')
      formRef.current?.reset()
    } catch (err: any) {
      toast.error(err.message || 'Error al crear la etiqueta')
    }
  }

  const handleConfirmDelete = async () => {
    if (!tagToDelete) return
    try {
      setDeleting(true)
      const formData = new FormData()
      formData.append('event_id', eventId)
      formData.append('tag_id', tagToDelete.id)

      await deletePhotoTag(formData)
      toast.success(`Etiqueta "${tagToDelete.name}" eliminada 🗑️`)
      setTagToDelete(null)
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar la etiqueta')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-primary" /> Etiquetas de Fotos
          </CardTitle>
          <CardDescription>
            Crea categorías para que los invitados puedan clasificar sus fotos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form ref={formRef} action={handleCreate} className="flex gap-2 items-end">
            <input type="hidden" name="event_id" value={eventId} />
            <div className="flex-1 space-y-2">
              <Label htmlFor="tag_name">Nueva Etiqueta</Label>
              <Input id="tag_name" name="name" placeholder="Ej: Ceremonia, Fiesta, Banquete" required />
            </div>
            <Button type="submit" className="font-bold">
              <Plus className="w-4 h-4 mr-1" /> Añadir
            </Button>
          </form>

          <div className="space-y-2 mt-4">
            {tags.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-lg">No hay etiquetas creadas.</p>
            ) : (
              <ul className="space-y-2">
                {tags.map(tag => (
                  <li key={tag.id} className="flex justify-between items-center bg-muted/50 p-2.5 px-3 rounded-lg border">
                    <span className="text-sm font-semibold">{tag.name}</span>
                    <Button 
                      type="button" 
                      onClick={() => setTagToDelete(tag)}
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-destructive hover:bg-destructive/10" 
                      title="Eliminar etiqueta"
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
        isOpen={!!tagToDelete}
        title={`¿Eliminar la etiqueta "${tagToDelete?.name}"?`}
        description="Las fotos existentes mantendrán sus registros pero ya no mostrarán esta categoría."
        confirmText="Eliminar etiqueta"
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setTagToDelete(null)}
      />
    </>
  )
}
