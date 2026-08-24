'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { deleteGuestbookEntry } from '../actions'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

export function DeleteGuestbookButton({ eventId, entryId }: { eventId: string; entryId: string }) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleConfirmDelete = async () => {
    try {
      setDeleting(true)
      const formData = new FormData()
      formData.append('event_id', eventId)
      formData.append('entry_id', entryId)
      
      await deleteGuestbookEntry(formData)
      toast.success('Dedicatoria eliminada correctamente 🗑️')
      setShowConfirm(false)
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar la dedicatoria')
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
        className="text-destructive hover:bg-destructive/10 shrink-0" 
        title="Eliminar mensaje"
      >
        <Trash2 className="w-4 h-4" />
      </Button>

      <ConfirmDialog
        isOpen={showConfirm}
        title="¿Eliminar esta dedicatoria?"
        description="El mensaje se eliminará permanentemente del libro de firmas y de las futuras descargas en PDF."
        confirmText="Eliminar dedicatoria"
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setShowConfirm(false)}
      />
    </>
  )
}
