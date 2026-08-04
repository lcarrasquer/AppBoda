import React from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { login, signup } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background glowing orb accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-sky-400/20 rounded-full blur-3xl pointer-events-none" />

      <div className="absolute top-4 left-4 md:top-8 md:left-8 z-10">
        <Link href="/" className="inline-flex items-center gap-2">
          <Button variant="ghost" size="sm" className="gap-2 glass-pill text-foreground hover:bg-white/80 dark:hover:bg-slate-800/80 transition-all shadow-sm">
            <ArrowLeft className="w-4 h-4" />
            <span>Volver al inicio</span>
          </Button>
        </Link>
      </div>

      <Card className="w-full max-w-sm liquid-glass liquid-glass-card rounded-2xl border-white/60 dark:border-white/10 shadow-2xl relative z-10 backdrop-blur-xl">
        <CardHeader className="space-y-4 pb-4">
          <div className="space-y-1 text-center">
            <CardTitle className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary via-sky-600 to-primary bg-clip-text text-transparent">
              Bienvenido
            </CardTitle>
            <CardDescription className="text-muted-foreground/90 font-medium">
              Accede a tu cuenta o regístrate para gestionar tu evento
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Correo electrónico</Label>
              <Input 
                id="email" 
                name="email" 
                type="email" 
                placeholder="hola@ejemplo.com" 
                required 
                className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border-white/40 dark:border-white/10 focus-visible:ring-primary/50 transition-all rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Contraseña</Label>
              <Input 
                id="password" 
                name="password" 
                type="password" 
                required 
                className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border-white/40 dark:border-white/10 focus-visible:ring-primary/50 transition-all rounded-xl"
              />
            </div>

            {params?.error && (
              <div className="text-sm font-medium text-destructive mt-2 text-center bg-destructive/10 p-2 rounded-lg border border-destructive/20">
                {params.error}
              </div>
            )}

            <div className="flex flex-col space-y-3 pt-3">
              <Button formAction={login} type="submit" className="w-full font-semibold shadow-lg shadow-primary/20 rounded-xl bg-gradient-to-r from-primary to-sky-600 hover:opacity-95 transition-all">
                Iniciar sesión
              </Button>
              <div className="relative my-2 text-center text-xs text-muted-foreground font-medium uppercase after:absolute after:inset-x-0 after:top-1/2 after:-z-10 after:border-t after:border-white/20">
                <span className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md px-3 py-0.5 rounded-full border border-white/30 dark:border-white/10">¿No tienes cuenta?</span>
              </div>
              <Button formAction={signup} type="submit" variant="outline" className="w-full font-semibold rounded-xl bg-white/40 dark:bg-slate-800/40 backdrop-blur-md border-white/60 dark:border-white/10 hover:bg-white/60 dark:hover:bg-slate-800/60 transition-all">
                Crear cuenta nueva
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
