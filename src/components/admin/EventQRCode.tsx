'use client'

import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { QrCode, Download, Copy, Check, Smartphone } from 'lucide-react'

interface EventQRCodeProps {
  slug: string
  brideName: string
  groomName: string
  appUrl: string
}

export function EventQRCode({ slug, brideName, groomName, appUrl }: EventQRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [copied, setCopied] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)

  const eventUrl = `${appUrl}/e/${slug}`

  useEffect(() => {
    if (!canvasRef.current) return

    QRCode.toCanvas(canvasRef.current, eventUrl, {
      width: 280,
      margin: 2,
      color: {
        dark: '#1a1a2e',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H',
    }, (error) => {
      if (error) console.error('QR generation error:', error)
    })

    // Also generate data URL for download
    QRCode.toDataURL(eventUrl, {
      width: 1024,
      margin: 3,
      color: {
        dark: '#1a1a2e',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H',
    }).then(url => setQrDataUrl(url))
  }, [eventUrl])

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(eventUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const input = document.createElement('input')
      input.value = eventUrl
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDownload = () => {
    if (!qrDataUrl) return

    const link = document.createElement('a')
    link.download = `qr-boda-${brideName}-${groomName}.png`
    link.href = qrDataUrl
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="w-5 h-5 text-primary" />
          Código QR de la Sala
        </CardTitle>
        <CardDescription>
          Imprime o comparte este código QR para que los invitados puedan escanear y entrar directamente a la sala del evento.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* QR Preview */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative bg-white p-6 rounded-2xl shadow-lg border-2 border-dashed border-primary/20">
            {/* Decorative corners */}
            <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-primary/40 rounded-tl-md" />
            <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-primary/40 rounded-tr-md" />
            <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-primary/40 rounded-bl-md" />
            <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-primary/40 rounded-br-md" />

            <canvas ref={canvasRef} className="rounded-lg" />
            
            <p className="text-center text-xs text-muted-foreground mt-3 font-medium">
              Boda de {brideName} & {groomName}
            </p>
          </div>

          {/* Scan instruction */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Smartphone className="w-4 h-4" />
            <span>Escanea con la cámara del móvil</span>
          </div>
        </div>

        {/* Link & Actions */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={eventUrl}
              readOnly
              className="font-mono text-sm bg-muted"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopyLink}
              title="Copiar enlace"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={handleDownload}
              disabled={!qrDataUrl}
            >
              <Download className="w-4 h-4" />
              Descargar QR (PNG)
            </Button>
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={handleCopyLink}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-green-500" />
                  ¡Copiado!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copiar enlace
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Tips */}
        <div className="bg-primary/5 border border-primary/10 rounded-lg p-4 space-y-2">
          <p className="text-sm font-semibold text-primary">💡 Consejos</p>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>Imprímelo en las mesas o en la entrada del evento.</li>
            <li>Compártelo por WhatsApp para que los invitados lo tengan antes.</li>
            <li>Al escanearlo, se abre la sala directamente en el navegador.</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
