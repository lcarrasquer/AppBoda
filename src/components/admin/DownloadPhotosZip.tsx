'use client'

import { useState } from 'react'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, Loader2, Images } from 'lucide-react'

export function DownloadPhotosZip({ eventId, eventSlug }: { eventId: string; eventSlug: string }) {
  const [downloading, setDownloading] = useState(false)
  const [progress, setProgress] = useState('')

  const handleDownloadZip = async () => {
    setDownloading(true)
    setProgress('Obteniendo lista de fotos...')

    try {
      const supabase = createClient()

      // Obtener todas las fotos asociadas a este evento
      const { data: photos, error } = await supabase
        .from('photos')
        .select('*')
        .eq('event_id', eventId)

      if (error) throw error

      if (!photos || photos.length === 0) {
        alert('Aún no hay fotos en esta sala para descargar.')
        setDownloading(false)
        setProgress('')
        return
      }

      const zip = new JSZip()
      const folder = zip.folder(`boda-${eventSlug}-fotos`)

      let downloadedCount = 0

      for (const photo of photos) {
        downloadedCount++
        setProgress(`Descargando foto ${downloadedCount} de ${photos.length}...`)

        try {
          // Obtener la URL pública de la foto en Supabase Storage
          const { data: publicUrlData } = supabase.storage
            .from('event-media')
            .getPublicUrl(photo.storage_path)

          const response = await fetch(publicUrlData.publicUrl)
          if (!response.ok) continue

          const blob = await response.blob()

          // Formatear nombre de archivo
          const fileExt = photo.storage_path.split('.').pop() || 'jpg'
          const dateStr = photo.created_at ? new Date(photo.created_at).toISOString().replace(/[:.]/g, '-') : 'foto'
          const filename = `foto_${dateStr}_${downloadedCount}.${fileExt}`

          folder?.file(filename, blob)
        } catch (err) {
          console.error(`Error al incluir foto ${photo.storage_path} en el zip`, err)
        }
      }

      setProgress('Generando archivo ZIP...')
      const content = await zip.generateAsync({ type: 'blob' })

      saveAs(content, `fotos-boda-${eventSlug}.zip`)
      setProgress('¡Descarga completada!')
    } catch (err) {
      console.error('Error al descargar ZIP', err)
      alert('Ocurrió un error al intentar descargar el archivo ZIP con las fotos.')
    } finally {
      setTimeout(() => {
        setDownloading(false)
        setProgress('')
      }, 1500)
    }
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Images className="w-5 h-5 text-primary" />
          <span>Descargar galería completa</span>
        </CardTitle>
        <CardDescription>
          Descarga un archivo ZIP comprimido con todas las fotos que tus invitados han subido a la sala.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          {progress && (
            <p className="text-sm font-medium text-primary animate-pulse">{progress}</p>
          )}
        </div>
        <Button onClick={handleDownloadZip} disabled={downloading} className="gap-2">
          {downloading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Procesando ZIP...</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span>Descargar ZIP con todas las fotos</span>
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
