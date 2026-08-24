import type { Metadata } from 'next'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { deleteGuestbookEntry } from '../actions'
import { BookOpen, Lock, MessageSquare, Heart } from 'lucide-react'
import { DeleteGuestbookButton } from './DeleteGuestbookButton'
import { DownloadPdfButton } from '@/components/admin/DownloadPdfButton'

export const metadata: Metadata = {
  title: 'Libro de Firmas Digital',
}

export const revalidate = 0

export default async function GuestbookAdminPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params

  const adminClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { 
      auth: { persistSession: false },
      global: { fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }) }
    }
  )

  // Fetch Event Info
  const { data: event } = await adminClient
    .from('events')
    .select('bride_name, groom_name, event_date')
    .eq('id', eventId)
    .single()

  // Fetch Guestbook Entries
  const { data: entries } = await adminClient
    .from('guestbook_entries')
    .select('*, guests(full_name)')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })

  const publicCount = entries?.filter(e => !e.is_private).length || 0
  const privateCount = entries?.filter(e => e.is_private).length || 0

  const formattedDate = event?.event_date 
    ? new Date(event.event_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
    : ''

  // Sorted chronologically for printable book
  const chronologicalEntries = entries ? [...entries].reverse() : []

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary" /> Libro de Firmas y Dedicatorias
          </h2>
          <p className="text-muted-foreground">
            Aquí puedes leer todos los mensajes y muestras de cariño que tus invitados han dejado para vosotros.
          </p>
        </div>

        {/* Direct 1-Click PDF Download Button */}
        <DownloadPdfButton 
          elementId="guestbook-pdf-document" 
          brideName={event?.bride_name || ''} 
          groomName={event?.groom_name || ''} 
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card shadow-sm border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Dedicatorias</p>
              <p className="text-3xl font-extrabold text-primary mt-1">{entries?.length || 0}</p>
            </div>
            <div className="p-3 bg-primary/10 rounded-xl text-primary">
              <MessageSquare className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-sm border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mensajes Públicos</p>
              <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">{publicCount}</p>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-600 dark:text-emerald-400">
              <Heart className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-sm border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mensajes Privados (Solo Novios)</p>
              <p className="text-3xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">{privateCount}</p>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-xl text-amber-600 dark:text-amber-400">
              <Lock className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Entries List */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">Dedicatorias Registradas</CardTitle>
          <CardDescription>
            Mensajes dejados por los asistentes ordenados del más reciente al más antiguo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {entries && entries.length > 0 ? (
            <div className="space-y-4">
              {entries.map((entry) => (
                <div 
                  key={entry.id}
                  className={`p-4 rounded-xl border transition-all ${
                    entry.is_private 
                      ? 'bg-amber-500/5 border-amber-500/30' 
                      : 'bg-card border-border'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-base text-foreground">
                          {entry.guests?.full_name || 'Invitado anónimo'}
                        </span>
                        {entry.is_private ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/15 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                            <Lock className="w-3 h-3" /> Solo para los novios 🔒
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                            Público 💬
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {new Date(entry.created_at).toLocaleDateString('es-ES', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed pt-1">
                        "{entry.content}"
                      </p>
                    </div>

                    <DeleteGuestbookButton eventId={eventId} entryId={entry.id} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-12 border border-dashed rounded-xl text-muted-foreground">
              <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-semibold text-base">Aún no hay dedicatorias escritas.</p>
              <p className="text-xs mt-1">Los invitados podrán escribir sus firmas y mensajes desde la sala interactiva.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Off-screen formatted printable document element used for instant 1-click PDF download */}
      <div className="fixed top-0 left-[-9999px] pointer-events-none z-[-100]">
        <div 
          id="guestbook-pdf-document"
          className="w-[800px] bg-white p-12 space-y-8 text-slate-900 font-serif"
          style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
        >
          {/* Cover Header */}
          <div className="text-center space-y-3 pb-8 border-b-2 border-slate-200">
            <h1 className="text-4xl font-serif font-bold text-slate-900 tracking-wide">
              Libro de Firmas & Recuerdos
            </h1>
            <h2 className="text-2xl font-serif text-rose-700 font-semibold pt-1">
              {event?.bride_name || 'Novia'} & {event?.groom_name || 'Novio'}
            </h2>
            {formattedDate && (
              <p className="text-xs font-serif font-semibold text-slate-500 uppercase tracking-widest pt-2">
                {formattedDate}
              </p>
            )}
          </div>

          {/* Entries List */}
          {chronologicalEntries.length > 0 ? (
            <div className="space-y-6 pt-2">
              {chronologicalEntries.map((entry) => (
                <div 
                  key={entry.id}
                  className="p-6 rounded-xl border border-slate-200 bg-slate-50 relative overflow-hidden"
                  style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}
                >
                  {/* Decorative Quote Mark */}
                  <span className="absolute top-2 right-4 text-6xl font-serif text-slate-300 select-none pointer-events-none">
                    “
                  </span>

                  <div className="relative z-10 space-y-3">
                    <p className="text-lg font-serif italic text-slate-800 leading-relaxed">
                      "{entry.content}"
                    </p>

                    <div className="flex justify-between items-center pt-3 border-t border-slate-200 text-xs text-slate-500 font-serif">
                      <span className="font-bold text-slate-900 flex items-center gap-1.5">
                        ❤️ {entry.guests?.full_name || 'Invitado'}
                      </span>
                      <div className="flex items-center gap-2">
                        {entry.is_private && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-sans font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                            🔒 Privado
                          </span>
                        )}
                        <span>
                          {new Date(entry.created_at).toLocaleDateString('es-ES', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-slate-400 font-serif">
              <p className="font-semibold text-lg">Aún no hay mensajes grabados en el libro de firmas.</p>
            </div>
          )}

          {/* Footer */}
          <div className="pt-12 text-center text-xs text-slate-400 font-serif border-t border-slate-200">
            <p>Libro de Recuerdos • {event?.bride_name} & {event?.groom_name}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
