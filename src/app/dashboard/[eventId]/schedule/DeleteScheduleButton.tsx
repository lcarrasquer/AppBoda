'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { deleteScheduleItem } from '../actions'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

export function DeleteScheduleButton({ eventId, itemId }: { eventId: string; itemId: string }) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleConfirmDelete = async () => {
    try {
      setDeleting(true)
      const formData = new FormData()
      formData.append('event_id', eventId)
      formData.append('item_id', itemId)

      await deleteScheduleItem(formData)
      toast.success('Hito eliminado del cronograma 🗑️')
      setShowConfirm(false)
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar hito')
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
        title="Eliminar hito"
      >
        <Trash2 className="w-4 h-4" />
      </Button>

      <ConfirmDialog
        isOpen={showConfirm}
        title="¿Eliminar este momento del cronograma?"
        description="Se eliminará del itinerario en tiempo real que consultan los invitados durante la boda."
        confirmText="Eliminar hito"
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setShowConfirm(false)}
      />
    </>
  )
}
