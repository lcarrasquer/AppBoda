'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Camera, CalendarHeart, ArrowRight } from 'lucide-react'

export default function HomePage() {
  const router = useRouter()
  const [slug, setSlug] = useState('')

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault()
    if (slug.trim()) {
      router.push(`/e/${slug.trim()}`)
    }
  }

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      <header className="px-6 py-4 flex items-center justify-between bg-background border-b">
        <div className="flex items-center gap-2 text-primary font-bold text-xl">
          <CalendarHeart className="w-6 h-6" />
          <span>AppBoda</span>
        </div>
        <Link href="/login" className={buttonVariants({ variant: "outline", size: "sm" })}>
          Acceso Novios
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full space-y-8">
          <div className="space-y-4">
            <div className="mx-auto w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mb-6">
              <Camera className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight">
              Captura cada momento
            </h1>
            <p className="text-muted-foreground text-lg">
              La plataforma para que tus invitados compartan las fotos de tu boda al instante, sin necesidad de registrarse.
            </p>
          </div>

          <div className="bg-card p-6 rounded-2xl shadow-sm border space-y-4 mt-8">
            <h2 className="font-semibold text-lg">¿Tienes un código de boda?</h2>
            <form onSubmit={handleJoin} className="flex gap-2">
              <Input 
                placeholder="Ej. maria-juan-2026" 
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="flex-1"
              />
              <Button type="submit">
                Entrar <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>
            <p className="text-sm text-muted-foreground mt-2">
              También puedes pedir acceso creando tu propio evento en el panel de novios.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
