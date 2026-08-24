import type { Metadata } from 'next'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import { Heart, BookOpen, ArrowLeft, Lock } from 'lucide-react'
import Link from 'next/link'
import { DownloadPdfButton } from '@/components/admin/DownloadPdfButton'

export const metadata: Metadata = {
  title: 'Libro de Recuerdos para Imprimir | AppBoda',
}

export const revalidate = 0

export default async function GuestbookPrintPage({
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

  // Fetch Event details
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
    .order('created_at', { ascending: true })

  const formattedDate = event?.event_date 
    ? new Date(event.event_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
    : ''

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 p-4 sm:p-8 print:p-0 print:bg-white print:text-black">
      {/* Embedded Print CSS to force ultra-clean book print layout */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 1.5cm;
          }
          body {
            background: white !important;
            color: black !important;
            font-family: Georgia, Cambria, "Times New Roman", Times, serif !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .print-card {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            border: 1px solid #e2e8f0 !important;
            background-color: #f8fafc !important;
            box-shadow: none !important;
            margin-bottom: 1.5rem !important;
          }
        }
      `}</style>

      {/* Top Action Bar (Hidden on print) */}
      <div className="max-w-3xl mx-auto mb-8 flex flex-col sm:flex-row justify-between items-center gap-4 no-print">
        <Link href={`/dashboard/${eventId}/guestbook`}>
          <Button variant="outline" className="gap-2 rounded-xl">
            <ArrowLeft className="w-4 h-4" /> Volver al Libro de Firmas
          </Button>
        </Link>

        <DownloadPdfButton 
          elementId="guestbook-pdf-document" 
          brideName={event?.bride_name || ''} 
          groomName={event?.groom_name || ''} 
        />
      </div>

      {/* Printable Book Document */}
      <div 
        id="guestbook-pdf-document"
        className="max-w-3xl mx-auto bg-white border print:border-0 rounded-2xl shadow-xl print:shadow-none p-8 sm:p-12 print:p-0 space-y-8 text-slate-900"
      >
        
        {/* Cover Header */}
        <div className="text-center space-y-3 pb-8 border-b-2 border-slate-200 print:border-slate-300">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-rose-50 text-rose-600 mb-2 no-print">
            <Heart className="w-8 h-8 fill-rose-600" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-slate-900 tracking-wide">
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
        {entries && entries.length > 0 ? (
          <div className="space-y-6 pt-2">
            {entries.map((entry, index) => (
              <div 
                key={entry.id}
                className="print-card p-6 rounded-xl border border-slate-200 bg-slate-50/70 dark:bg-slate-800/40 relative overflow-hidden break-inside-avoid"
              >
                {/* Decorative Quote Mark */}
                <span className="absolute top-2 right-4 text-6xl font-serif text-slate-300/40 select-none pointer-events-none">
                  “
                </span>

                <div className="relative z-10 space-y-3">
                  <p className="text-base sm:text-lg font-serif italic text-slate-800 dark:text-slate-200 leading-relaxed">
                    "{entry.content}"
                  </p>

                  <div className="flex justify-between items-center pt-3 border-t border-slate-200 text-xs text-slate-500 font-serif">
                    <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                      {entry.guests?.full_name || 'Invitado'}
                    </span>
                    <div className="flex items-center gap-2">
                      {entry.is_private && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-sans font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                          <Lock className="w-3 h-3" /> Privado
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
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-semibold text-lg">Aún no hay mensajes grabados en el libro de firmas.</p>
          </div>
        )}

        {/* Footer */}
        <div className="pt-12 text-center text-xs text-slate-400 font-serif border-t border-slate-200">
          <p>Libro de Recuerdos • {event?.bride_name} & {event?.groom_name}</p>
        </div>
      </div>
    </div>
  )
}
