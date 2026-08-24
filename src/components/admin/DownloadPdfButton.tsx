'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface DownloadPdfButtonProps {
  elementId: string
  brideName: string
  groomName: string
}

export function DownloadPdfButton({ elementId, brideName, groomName }: DownloadPdfButtonProps) {
  const [generating, setGenerating] = useState(false)

  const handleDownloadPdf = async () => {
    const element = document.getElementById(elementId)
    if (!element) {
      toast.error('No se encontró el contenido del libro.')
      return
    }

    try {
      setGenerating(true)
      
      // Use html2canvas-pro to support Tailwind v4 lab() / oklch() colors
      const html2canvas = (await import('html2canvas-pro')).default
      const { jsPDF } = await import('jspdf')

      // Capture DOM element as high resolution canvas
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      })

      const imgData = canvas.toDataURL('image/jpeg', 0.95)
      
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      })

      const pdfWidth = pdf.internal.pageSize.getWidth() // 210mm
      const pdfHeight = pdf.internal.pageSize.getHeight() // 297mm
      const margin = 10
      const imgWidth = pdfWidth - (margin * 2)
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      let heightLeft = imgHeight
      let position = margin

      // Render first page
      pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight)
      heightLeft -= (pdfHeight - (margin * 2))

      // Multi-page loop if long guestbook
      while (heightLeft > 0) {
        position = heightLeft - imgHeight + margin
        pdf.addPage()
        pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight)
        heightLeft -= (pdfHeight - (margin * 2))
      }

      const cleanBride = (brideName || 'novia').toLowerCase().replace(/\s+/g, '-')
      const cleanGroom = (groomName || 'novio').toLowerCase().replace(/\s+/g, '-')
      const filename = `libro-firmas-${cleanBride}-${cleanGroom}.pdf`

      pdf.save(filename)
      toast.success('¡Libro de firmas descargado en PDF! 📄')
    } catch (err) {
      console.error('Error al generar PDF:', err)
      toast.error('Ocurrió un error al crear el PDF. Inténtalo de nuevo.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Button 
      onClick={handleDownloadPdf}
      disabled={generating}
      className="gap-2 rounded-xl font-bold bg-gradient-to-r from-primary to-sky-600 shadow-md hover:opacity-95 text-white"
    >
      {generating ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" /> Generando PDF...
        </>
      ) : (
        <>
          <Download className="w-4 h-4" /> Descargar Libro en PDF 📄
        </>
      )}
    </Button>
  )
}
