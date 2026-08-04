'use client'

import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { createEvent } from '../actions'
import { useActionState } from 'react'

const initialState = {
  error: ''
}

export default function NewEventPage() {
  const [state, formAction, pending] = useActionState(async (prevState: any, formData: FormData) => {
    try {
      const res = await createEvent(formData)
      if (res?.error) {
        return { error: res.error }
      }
      return prevState
    } catch (e) {
      return { error: 'Ocurrió un error inesperado' }
    }
  }, initialState)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nuevo Evento</h1>
          <p className="text-muted-foreground">
            Introduce los datos básicos de la boda.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datos de la boda</CardTitle>
          <CardDescription>
            Podrás configurar el resto de detalles (módulos, diseño, pines de seguridad) más adelante.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bride_name">Nombre de la novia/pareja 1</Label>
                <Input id="bride_name" name="bride_name" placeholder="Ej: María" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="groom_name">Nombre del novio/pareja 2</Label>
                <Input id="groom_name" name="groom_name" placeholder="Ej: Juan" required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="event_date">Fecha del evento</Label>
              <Input id="event_date" name="event_date" type="date" required />
            </div>

            {state.error && (
              <div className="text-sm font-medium text-destructive">
                {state.error}
              </div>
            )}

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={pending}>
                {pending ? 'Creando...' : 'Crear evento'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
