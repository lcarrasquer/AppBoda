'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AppLogo } from '@/components/common/AppLogo'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Camera, CalendarHeart, ArrowRight } from 'lucide-react'

export default function HomePage() {
  const router = useRouter()
  const [slug, setSlug] = useState('')

  useEffect(() => {
    document.title = 'AppBoda | Tu Evento de Boda Interactivo'
  }, [])

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault()
    if (slug.trim()) {
      router.push(`/e/${slug.trim()}`)
    }
  }

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background glowing orb accents */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-sky-400/20 rounded-full blur-3xl pointer-events-none" />

      <header className="px-6 py-4 flex items-center justify-between glass-panel sticky top-0 z-20 backdrop-blur-xl border-b border-white/40 dark:border-white/10">
        <AppLogo size="md" href="/" />
        <div className="flex items-center gap-3">
          <ThemeToggle variant="outline" className="border-white/60 bg-white/40 dark:bg-slate-800/40 dark:border-white/10 shadow-sm" />
          <Link href="/login" className="inline-flex items-center">
            <Button variant="outline" size="sm" className="glass-pill font-semibold border-white/60 hover:bg-white/80 dark:hover:bg-slate-800/80 transition-all shadow-sm">
              Acceso Novios
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center z-10">
        <div className="max-w-md w-full space-y-8">
          <div className="space-y-4">
            <div className="relative mx-auto w-56 h-56 md:w-64 md:h-64 rounded-3xl p-2 liquid-glass shadow-2xl border border-white/80 dark:border-white/10 mb-6 group transition-all duration-300 hover:scale-105">
              <div className="w-full h-full rounded-2xl overflow-hidden relative">
                <Image 
                  src="/hero-couple.jpg" 
                  alt="Pareja" 
                  width={256} 
                  height={256} 
                  className="w-full h-full object-cover object-top"
                  priority
                />
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-primary to-slate-800 dark:from-white dark:via-sky-300 dark:to-slate-200 bg-clip-text text-transparent">
              Captura cada momento
            </h1>
            <p className="text-muted-foreground text-base max-w-xs mx-auto font-medium">
              Las fotos de tu boda compartidas por tus invitados al instante.
            </p>
          </div>

          <div className="liquid-glass liquid-glass-card p-6 rounded-3xl border-white/60 dark:border-white/10 shadow-2xl space-y-4 mt-8 backdrop-blur-xl">
            <h2 className="font-bold text-lg text-foreground/90">¿Tienes un código de boda?</h2>
            <form onSubmit={handleJoin} className="flex gap-2">
              <Input 
                placeholder="Ej. maria-juan-2026" 
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="flex-1 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border-white/40 dark:border-white/10 focus-visible:ring-primary/50 transition-all rounded-xl"
              />
              <Button type="submit" className="font-semibold shadow-lg shadow-primary/20 rounded-xl bg-gradient-to-r from-primary to-sky-600 hover:opacity-95 transition-all">
                Entrar <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </form>
            <p className="text-xs text-muted-foreground/80 font-medium">
              También puedes pedir acceso creando tu propio evento en el panel de novios.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
