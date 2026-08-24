'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { Calendar, MapPin, Trash2, Loader2, ExternalLink } from 'lucide-react'
import { deleteEvent } from './actions'
import { getGoogleMapsUrl } from '@/lib/utils'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

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
      toast.error(res.error)
      setDeleting(false)
      setShowConfirm(false)
    } else {
      toast.success('Evento eliminado correctamente 🗑️')
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
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide border ${
              event.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' :
              event.status === 'draft' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' :
              'bg-muted text-muted-foreground border-border'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                event.status === 'active' ? 'bg-emerald-500 animate-pulse' :
                event.status === 'draft' ? 'bg-amber-500' :
                'bg-muted-foreground'
              }`} />
              <span>
                {event.status === 'active' ? 'Activo' : event.status === 'draft' ? 'Borrador' : 'Archivado'}
              </span>
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
        {event.location ? (
          <a
            href={getGoogleMapsUrl(event.location)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors group/loc py-1"
            title="Abrir ubicación en Google Maps"
          >
            <MapPin className="w-4 h-4 text-primary shrink-0 group-hover/loc:scale-110 transition-transform" />
            <span className="truncate group-hover/loc:underline">{event.location}</span>
            <ExternalLink className="w-3 h-3 opacity-60 group-hover/loc:opacity-100 shrink-0" />
          </a>
        ) : (
          <div className="text-sm text-muted-foreground/70 flex items-center gap-1.5 py-1">
            <MapPin className="w-4 h-4 opacity-40 shrink-0" />
            <span>Sin ubicación definida</span>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between border-t pt-4">
        <Link href={`/dashboard/${event.id}/settings`} className={buttonVariants({ variant: "outline", size: "sm" })}>
          Configurar
        </Link>
        <Link href={`/e/${event.slug}`} className={buttonVariants({ variant: "default", size: "sm" })}>
          Ver sala
        </Link>
      </CardFooter>

      {/* Visual Confirm Dialog */}
      <ConfirmDialog 
        isOpen={showConfirm}
        title={`¿Eliminar la boda de ${event.bride_name} & ${event.groom_name}?`}
        description="Se eliminarán todas las fotos, invitados, cronograma y firmas registradas. Esta acción no se puede deshacer."
        confirmText="Eliminar boda"
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setShowConfirm(false)}
      />
    </Card>
  )
}
