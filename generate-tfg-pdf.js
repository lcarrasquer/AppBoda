const fs = require('fs')
const path = require('path')
const { jsPDF } = require('jspdf')

async function generatePdf() {
  console.log('📄 Generando archivo PDF para PRESENTACION_TFG.pdf...')

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 18
  const maxLineWidth = pageWidth - (margin * 2)
  let y = margin

  // Configuración de colores
  const PRIMARY_COLOR = [212, 175, 55] // Gold / Primary #D4AF37
  const TEXT_DARK = [30, 41, 59]      // Slate 800
  const TEXT_MUTED = [100, 116, 139]  // Slate 500
  const ACCENT_COLOR = [225, 29, 72]   // Rose 600

  // Función auxiliar para control de salto de página
  const checkNewPage = (neededHeight = 10) => {
    if (y + neededHeight > pageHeight - margin) {
      doc.addPage()
      y = margin
    }
  }

  // Título Principal
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(...PRIMARY_COLOR)
  doc.text('🎓 Guía de Presentación del TFG: AppBoda', margin, y)
  y += 10

  // Subtítulo / Descripción
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(10)
  doc.setTextColor(...TEXT_MUTED)
  doc.text('Documento resumen preparado para la presentación del proyecto ante el tutor / tribunal evaluador.', margin, y)
  y += 10

  // Línea divisoria
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.5)
  doc.line(margin, y, pageWidth - margin, y)
  y += 10

  // SECCIÓN 1: INTRODUCCIÓN Y PROPUESTA DE VALOR
  checkNewPage(25)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...ACCENT_COLOR)
  doc.text('1. 📌 Introducción y Propuesta de Valor', margin, y)
  y += 8

  // Cita destacada
  doc.setFont('helvetica', 'bolditalic')
  doc.setFontSize(10)
  doc.setTextColor(...TEXT_DARK)
  const quote = '"He desarrollado AppBoda, una plataforma web multi-inquilino (SaaS) e interactiva en tiempo real diseñada para la gestión, animación y recopilación de recuerdos en eventos nupciales."'
  const splitQuote = doc.splitTextToSize(quote, maxLineWidth - 10)
  doc.setFillColor(248, 250, 252)
  doc.rect(margin, y, maxLineWidth, splitQuote.length * 6 + 6, 'F')
  doc.text(splitQuote, margin + 5, y + 6)
  y += splitQuote.length * 6 + 12

  // Puntos clave
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...TEXT_DARK)
  doc.text('• El problema que resuelve:', margin, y)
  doc.setFont('helvetica', 'normal')
  const prob = ' En las bodas tradicionales, las fotos y recuerdos se pierden en chats grupales (donde pierden calidad) o requieren cámaras desechables de alto coste.'
  const splitProb = doc.splitTextToSize(prob, maxLineWidth - 45)
  doc.text(splitProb, margin + 45, y)
  y += Math.max(splitProb.length * 5, 8) + 4

  checkNewPage(15)
  doc.setFont('helvetica', 'bold')
  doc.text('• La solución propuesta:', margin, y)
  doc.setFont('helvetica', 'normal')
  const sol = ' Una Progressive Web App (PWA) accesible mediante Código QR, que permite a los invitados interactuar sin necesidad de descargar apps ni registrar contraseñas, mientras que los novios disponen de un Panel de Administración completo.'
  const splitSol = doc.splitTextToSize(sol, maxLineWidth - 45)
  doc.text(splitSol, margin + 45, y)
  y += Math.max(splitSol.length * 5, 12) + 8

  // SECCIÓN 2: ARQUITECTURA Y STACK TECNOLÓGICO
  checkNewPage(25)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...ACCENT_COLOR)
  doc.text('2. 🏗️ Arquitectura y Stack Tecnológico', margin, y)
  y += 8

  const stackItems = [
    ['Frontend & Framework:', 'Next.js 15+ (App Router con Server Components y Client Components) sobre React 19 y TypeScript con tipado estricto.'],
    ['Diseño y Estilos (UI/UX):', 'Tailwind CSS v4 con variables HSL, estética Glassmorphism moderna, adaptabilidad responsiva (Mobile-First y Desktop) e iconos Lucide.'],
    ['Base de Datos & Serverless:', 'Supabase (PostgreSQL) con aislamiento multi-inquilino mediante Row Level Security (RLS).'],
    ['Compresión de Fotos:', 'browser-image-compression para optimizar fotografías en cliente antes de subirlas a Storage (<500KB).'],
    ['Generación de Documentos:', 'html2canvas-pro + jsPDF para el Libro de Firmas en PDF maquetado, jszip + file-saver para descarga masiva de fotos en ZIP.'],
    ['Notificaciones Flotantes:', 'sonner para notificaciones emergentes Toasts animadas en tiempo real.']
  ]

  for (const [title, desc] of stackItems) {
    checkNewPage(15)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(...TEXT_DARK)
    doc.text(`• ${title}`, margin, y)
    
    doc.setFont('helvetica', 'normal')
    const splitDesc = doc.splitTextToSize(desc, maxLineWidth - 50)
    doc.text(splitDesc, margin + 50, y)
    y += Math.max(splitDesc.length * 4.5, 6) + 3
  }
  y += 6

  // SECCIÓN 3: DEMOSTRACIÓN DE MÓDULOS DESARROLLADOS
  checkNewPage(25)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...ACCENT_COLOR)
  doc.text('3. 🌟 Demostración de Módulos Desarrollados', margin, y)
  y += 8

  const modules = [
    ['A. Acceso de Invitados & Muro Colaborativo:', 'Acceso rápido por QR/enlace, subida por lotes con tira de miniaturas, etiquetas, retos fotográficos y doble toque de me gusta.'],
    ['B. Cronograma Interactivo del Día:', 'Itinerario con insignias de estado automático (En curso, Próximo evento, Finalizado) en tiempo real.'],
    ['C. Libro de Firmas Digital & PDF:', 'Mensajes públicos y privados (solo para novios 🔒), exportables a un documento PDF maquetado en 1-clic.'],
    ['D. Juego Trivia / Kahoot Interactivo:', 'Quiz de preguntas sobre los novios con recuento de puntos y tabla de clasificación.'],
    ['E. Panel de Administración de Novios:', 'Gestión centralizada de boda, módulos, estadísticas, moderación de dedicatorias y descarga masiva de fotos en ZIP.']
  ]

  for (const [modTitle, modDesc] of modules) {
    checkNewPage(15)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(...TEXT_DARK)
    doc.text(`• ${modTitle}`, margin, y)
    
    doc.setFont('helvetica', 'normal')
    const splitMod = doc.splitTextToSize(modDesc, maxLineWidth - 55)
    doc.text(splitMod, margin + 55, y)
    y += Math.max(splitMod.length * 4.5, 6) + 3
  }
  y += 6

  // SECCIÓN 4: PUNTOS FUERTES TÉCNICOS
  checkNewPage(25)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...ACCENT_COLOR)
  doc.text('4. 🚀 Puntos Fuertes Técnicos a Enfatizar', margin, y)
  y += 8

  const highlights = [
    '1. Calidad de Código: TypeScript 100% tipado (compilación limpia con npx tsc --noEmit).',
    '2. Seguridad Multi-inquilino: Políticas RLS en PostgreSQL para aislar los datos entre eventos.',
    '3. Experiencia de Usuario (UX/UI): Responsive Mobile-First, modales flotantes Glassmorphic (ConfirmDialog) y Toasts animadas.'
  ]

  for (const item of highlights) {
    checkNewPage(10)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    doc.setTextColor(...TEXT_DARK)
    doc.text(item, margin, y)
    y += 6
  }

  // Pie de página en todas las páginas
  const totalPages = doc.internal.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...TEXT_MUTED)
    doc.text(`Página ${i} de ${totalPages} • AppBoda TFG`, pageWidth / 2, pageHeight - 10, { align: 'center' })
  }

  const outputPath = path.join(process.cwd(), 'PRESENTACION_TFG.pdf')
  doc.save(outputPath)
  console.log(`✅ Archivo PDF generado con éxito en: ${outputPath}`)
}

generatePdf().catch(err => {
  console.error('Error al generar el PDF:', err)
})
