import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { logout } from '../login/actions'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'
import Link from 'next/link'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <header className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center space-x-2 text-primary font-bold text-xl">
            <Image src="/love-logo.png" alt="Logo" width={32} height={32} className="w-8 h-8 object-contain" />
            <span>Adriana & Lorenzo</span>
          </Link>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-muted-foreground hidden md:inline-block">
              {user.email}
            </span>
            <form action={logout}>
              <Button type="submit" variant="ghost" size="icon" title="Cerrar sesión">
                <LogOut className="w-5 h-5" />
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="flex-1 container mx-auto p-4 md:p-8">
        {children}
      </main>
    </div>
  )
}
