import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LoginForm } from './LoginForm'
import { AppLogo } from '@/components/common/AppLogo'
import { ThemeToggle } from '@/components/theme/ThemeToggle'

export const metadata: Metadata = {
  title: 'Iniciar Sesión',
}

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

      <div className="absolute top-4 right-4 md:top-8 md:right-8 z-10">
        <ThemeToggle variant="ghost" size="icon" className="glass-pill shadow-sm text-foreground hover:bg-white/80 dark:hover:bg-slate-800/80" />
      </div>

      <Card className="w-full max-w-sm liquid-glass liquid-glass-card rounded-2xl border-white/60 dark:border-white/10 shadow-2xl relative z-10 backdrop-blur-xl">
        <CardHeader className="space-y-4 pb-4 text-center">
          <div className="flex justify-center mb-1">
            <AppLogo size="lg" showText={false} href="/" />
          </div>
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
          <LoginForm initialError={params?.error} />
        </CardContent>
      </Card>
    </div>
  )
}

