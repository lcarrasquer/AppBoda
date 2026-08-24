'use client'

import { Button } from '@/components/ui/button'
import { toggleModule } from '../actions'
import { toast } from 'sonner'
import { useState } from 'react'
import { Loader2 } from 'lucide-react'

interface ModuleToggleProps {
  eventId: string
  moduleKey: string
  isEnabled: boolean
}

export function ModuleToggle({ eventId, moduleKey, isEnabled }: ModuleToggleProps) {
  const [loading, setLoading] = useState(false)

  const handleToggle = async (formData: FormData) => {
    try {
      setLoading(true)
      await toggleModule(formData)
      toast.success(isEnabled ? 'Módulo desactivado 🧩' : 'Módulo activado con éxito 🧩')
    } catch (err: any) {
      toast.error(err.message || 'Error al cambiar estado del módulo')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form action={handleToggle}>
      <input type="hidden" name="event_id" value={eventId} />
      <input type="hidden" name="module_key" value={moduleKey} />
      <input type="hidden" name="is_enabled" value={isEnabled ? 'false' : 'true'} />
      <Button type="submit" disabled={loading} variant={isEnabled ? 'destructive' : 'default'}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
        {isEnabled ? 'Desactivar' : 'Activar'}
      </Button>
    </form>
  )
}
