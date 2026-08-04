'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { Calendar, MapPin, Trash2, Loader2 } from 'lucide-react'
import { deleteEvent } from './actions'

interface EventCardProps {
  event: {
    id: string
    bride_name: string
    groom_name: string
    event_date: string
    location: string | null
    status: string
    slug: string
  }
}

export function EventCard({ event }: EventCardProps) {
  const router = useRouter()
  const [showConfirm, setShowConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    const res = await deleteEvent(event.id)
    if (res?.error) {
      alert(res.error)
      setDeleting(false)
      setShowConfirm(false)
    } else {
      router.refresh()
    }
  }

  return (
    <Card className="hover:border-primary/50 transition-colors relative">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl">
              {event.bride_name} &amp; {event.groom_name}
            </CardTitle>
            <CardDescription className="mt-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(event.event_date).toLocaleDateString()}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className={`px-2 py-1 rounded-full text-xs font-medium uppercase tracking-wider ${
              event.status === 'active' ? 'bg-green-500/10 text-green-600 dark:text-green-400' :
              event.status === 'draft' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
              'bg-muted text-muted-foreground'
            }`}>
              {event.status}
            </div>
            <button
              onClick={() => setShowConfirm(true)}
              className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Eliminar evento"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground flex items-center gap-1">
          <MapPin className="w-4 h-4" />
          {event.location || 'Sin ubicación definida'}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between border-t pt-4">
        <Link href={`/dashboard/${event.id}/settings`} className={buttonVariants({ variant: "outline", size: "sm" })}>
          Configurar
        </Link>
        <Link href={`/e/${event.slug}`} target="_blank" className={buttonVariants({ variant: "default", size: "sm" })}>
          Ver sala
        </Link>
      </CardFooter>

      {/* Confirm Delete Modal */}
      {showConfirm && (
        <div className="absolute inset-0 z-10 bg-background/95 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
          <div className="rounded-full bg-destructive/10 p-3 mb-3">
            <Trash2 className="w-6 h-6 text-destructive" />
          </div>
          <h3 className="font-bold text-lg mb-1">¿Eliminar este evento?</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-[250px]">
            Se borrarán todas las fotos, invitados y datos asociados. Esta acción no se puede deshacer.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowConfirm(false)}
              disabled={deleting}
              className="px-4 py-2 text-sm font-medium rounded-md border hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 text-sm font-medium rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors flex items-center gap-2"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                'Sí, eliminar'
              )}
            </button>
          </div>
        </div>
      )}
    </Card>
  )
}
