import { getEventBySlug } from '../actions'
import { notFound } from 'next/navigation'
import KahootGame from './KahootGame'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function KahootPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const event = await getEventBySlug(slug)

  if (!event) {
    notFound()
  }

  const themeStyle = event.primary_color
    ? {
        '--primary': event.primary_color,
        '--ring': event.primary_color,
      } as React.CSSProperties
    : undefined

  return (
    <div className="min-h-screen bg-background flex flex-col" style={themeStyle}>
      <div className="p-4 flex items-center border-b bg-background/80 backdrop-blur-md sticky top-0 z-10">
        <Link href={`/e/${slug}`} className="flex items-center text-primary font-medium hover:underline">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Volver al muro
        </Link>
      </div>

      <div className="flex-1">
        <KahootGame event={event} />
      </div>
    </div>
  )
}

