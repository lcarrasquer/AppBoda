import { SeatingTable, FloorplanLandmark } from './types'

export interface SnapGuide {
  type: 'horizontal' | 'vertical'
  pos: number // x or y coordinate
  start: number
  end: number
  matchedWith: string
}

export interface CollisionWarning {
  id1: string
  id2: string
  name1: string
  name2: string
}

export interface FloorplanSnapshot {
  tables: SeatingTable[]
  landmarks: FloorplanLandmark[]
}

/**
 * Calculates magnetic snapping lines and adjustments for tables and landmarks.
 */
export function calculateSnappingGuides({
  activeType,
  activeId,
  currentX,
  currentY,
  currentWidth = 84, // default round table diameter roughly
  currentHeight = 84,
  tables,
  landmarks,
  snapThreshold = 8,
  canvasWidth = 900,
  canvasHeight = 650
}: {
  activeType: 'table' | 'landmark'
  activeId: string
  currentX: number
  currentY: number
  currentWidth?: number
  currentHeight?: number
  tables: SeatingTable[]
  landmarks: FloorplanLandmark[]
  snapThreshold?: number
  canvasWidth?: number
  canvasHeight?: number
}): {
  snappedX: number
  snappedY: number
  guides: SnapGuide[]
} {
  let snappedX = currentX
  let snappedY = currentY
  const guides: SnapGuide[] = []

  const activeCenterX = activeType === 'table' ? currentX : currentX + currentWidth / 2
  const activeCenterY = activeType === 'table' ? currentY : currentY + currentHeight / 2

  let closestXDiff = snapThreshold + 1
  let closestYDiff = snapThreshold + 1
  let matchedGuideX: SnapGuide | null = null
  let matchedGuideY: SnapGuide | null = null

  // 1. Center of canvas snapping
  const midCanvasX = canvasWidth / 2
  const midCanvasY = canvasHeight / 2

  if (Math.abs(activeCenterX - midCanvasX) <= snapThreshold) {
    closestXDiff = Math.abs(activeCenterX - midCanvasX)
    if (activeType === 'table') {
      snappedX = midCanvasX
    } else {
      snappedX = midCanvasX - currentWidth / 2
    }
    matchedGuideX = {
      type: 'vertical',
      pos: midCanvasX,
      start: 0,
      end: canvasHeight,
      matchedWith: 'Centro del Salón'
    }
  }

  if (Math.abs(activeCenterY - midCanvasY) <= snapThreshold) {
    closestYDiff = Math.abs(activeCenterY - midCanvasY)
    if (activeType === 'table') {
      snappedY = midCanvasY
    } else {
      snappedY = midCanvasY - currentHeight / 2
    }
    matchedGuideY = {
      type: 'horizontal',
      pos: midCanvasY,
      start: 0,
      end: canvasWidth,
      matchedWith: 'Centro del Salón'
    }
  }

  // 2. Compare against other tables
  for (const table of tables) {
    if (activeType === 'table' && table.id === activeId) continue
    const tx = table.pos_x || 0
    const ty = table.pos_y || 0

    // X Alignment (vertical guideline)
    const diffX = Math.abs(activeCenterX - tx)
    if (diffX <= snapThreshold && diffX < closestXDiff) {
      closestXDiff = diffX
      if (activeType === 'table') {
        snappedX = tx
      } else {
        snappedX = tx - currentWidth / 2
      }
      matchedGuideX = {
        type: 'vertical',
        pos: tx,
        start: Math.min(activeCenterY, ty) - 40,
        end: Math.max(activeCenterY, ty) + 40,
        matchedWith: `Mesa ${table.table_number}`
      }
    }

    // Y Alignment (horizontal guideline)
    const diffY = Math.abs(activeCenterY - ty)
    if (diffY <= snapThreshold && diffY < closestYDiff) {
      closestYDiff = diffY
      if (activeType === 'table') {
        snappedY = ty
      } else {
        snappedY = ty - currentHeight / 2
      }
      matchedGuideY = {
        type: 'horizontal',
        pos: ty,
        start: Math.min(activeCenterX, tx) - 40,
        end: Math.max(activeCenterX, tx) + 40,
        matchedWith: `Mesa ${table.table_number}`
      }
    }
  }

  // 3. Compare against landmarks
  for (const lm of landmarks) {
    if (!lm.visible || (activeType === 'landmark' && lm.id === activeId)) continue
    const lmCenterX = lm.x + lm.width / 2
    const lmCenterY = lm.y + lm.height / 2

    // X Alignment
    const diffX = Math.abs(activeCenterX - lmCenterX)
    if (diffX <= snapThreshold && diffX < closestXDiff) {
      closestXDiff = diffX
      if (activeType === 'table') {
        snappedX = lmCenterX
      } else {
        snappedX = lmCenterX - currentWidth / 2
      }
      matchedGuideX = {
        type: 'vertical',
        pos: lmCenterX,
        start: Math.min(activeCenterY, lmCenterY) - 40,
        end: Math.max(activeCenterY, lmCenterY) + 40,
        matchedWith: lm.name
      }
    }

    // Y Alignment
    const diffY = Math.abs(activeCenterY - lmCenterY)
    if (diffY <= snapThreshold && diffY < closestYDiff) {
      closestYDiff = diffY
      if (activeType === 'table') {
        snappedY = lmCenterY
      } else {
        snappedY = lmCenterY - currentHeight / 2
      }
      matchedGuideY = {
        type: 'horizontal',
        pos: lmCenterY,
        start: Math.min(activeCenterX, lmCenterX) - 40,
        end: Math.max(activeCenterX, lmCenterX) + 40,
        matchedWith: lm.name
      }
    }
  }

  if (matchedGuideX) guides.push(matchedGuideX)
  if (matchedGuideY) guides.push(matchedGuideY)

  return { snappedX, snappedY, guides }
}

/**
 * Detects overlapping / colliding tables and landmarks.
 */
export function detectCollisions(tables: SeatingTable[], landmarks: FloorplanLandmark[]): CollisionWarning[] {
  const warnings: CollisionWarning[] = []
  const tableRadius = 50 // Table body + chairs clearance radius

  // 1. Table vs Table
  for (let i = 0; i < tables.length; i++) {
    for (let j = i + 1; j < tables.length; j++) {
      const t1 = tables[i]
      const t2 = tables[j]
      const x1 = t1.pos_x || 0
      const y1 = t1.pos_y || 0
      const x2 = t2.pos_x || 0
      const y2 = t2.pos_y || 0

      const dist = Math.hypot(x1 - x2, y1 - y2)
      if (dist < tableRadius * 1.6) {
        warnings.push({
          id1: t1.id,
          id2: t2.id,
          name1: `Mesa ${t1.table_number}`,
          name2: `Mesa ${t2.table_number}`
        })
      }
    }
  }

  // 2. Table vs Landmark
  for (const t of tables) {
    const tx = t.pos_x || 0
    const ty = t.pos_y || 0

    for (const lm of landmarks) {
      if (!lm.visible) continue
      // Box vs Circle collision
      const closestX = Math.max(lm.x, Math.min(tx, lm.x + lm.width))
      const closestY = Math.max(lm.y, Math.min(ty, lm.y + lm.height))
      const dist = Math.hypot(tx - closestX, ty - closestY)

      if (dist < tableRadius * 0.8) {
        warnings.push({
          id1: t.id,
          id2: lm.id,
          name1: `Mesa ${t.table_number}`,
          name2: lm.name
        })
      }
    }
  }

  return warnings
}

/**
 * Inlines computed CSS styles (Tailwind classes, CSS variables, typography)
 * from the live DOM SVG onto a cloned SVG so it renders independently as image or standalone SVG.
 */
function inlineComputedStyles(sourceSvg: SVGSVGElement, targetSvg: SVGSVGElement) {
  const sourceElements = Array.from(sourceSvg.querySelectorAll('*'))
  const targetElements = Array.from(targetSvg.querySelectorAll('*'))

  for (let i = 0; i < sourceElements.length; i++) {
    const src = sourceElements[i] as SVGElement
    const tgt = targetElements[i] as SVGElement
    if (!src || !tgt) continue

    const computed = window.getComputedStyle(src)
    const tag = src.tagName.toLowerCase()

    // 1. Fill & Stroke
    if (computed.fill && computed.fill !== 'none') {
      tgt.setAttribute('fill', computed.fill)
    }
    if (computed.stroke && computed.stroke !== 'none') {
      tgt.setAttribute('stroke', computed.stroke)
      if (computed.strokeWidth) tgt.setAttribute('stroke-width', computed.strokeWidth)
      if (computed.strokeDasharray && computed.strokeDasharray !== 'none') {
        tgt.setAttribute('stroke-dasharray', computed.strokeDasharray)
      }
    }
    if (computed.opacity) {
      tgt.setAttribute('opacity', computed.opacity)
    }

    // 2. Text typography & coloring
    if (tag === 'text') {
      tgt.setAttribute('font-family', '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif')
      if (computed.fontSize) tgt.setAttribute('font-size', computed.fontSize)
      if (computed.fontWeight) tgt.setAttribute('font-weight', computed.fontWeight)
      if (computed.textAnchor) tgt.setAttribute('text-anchor', computed.textAnchor)
      if (computed.dominantBaseline) tgt.setAttribute('dominant-baseline', computed.dominantBaseline)
      
      // Text fill resolution
      if (computed.fill && computed.fill !== 'none') {
        tgt.setAttribute('fill', computed.fill)
      } else if (computed.color) {
        tgt.setAttribute('fill', computed.color)
      }
    }
  }
}

/**
 * Exports the SVG floorplan to a pixel-perfect high-resolution PNG image.
 */
export async function exportFloorplanToImage({
  svgElement,
  filename = 'plano-distribucion-boda.png',
  scale = 3,
  backgroundColor = '#0F172A'
}: {
  svgElement: SVGSVGElement
  filename?: string
  scale?: number
  backgroundColor?: string
}): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const clone = svgElement.cloneNode(true) as SVGSVGElement

      // 1. Inline all live computed styles so Tailwind colors & fonts are preserved
      inlineComputedStyles(svgElement, clone)

      // 2. Clean interactive handles and UI overlays
      clone.querySelectorAll('.cursor-nwse-resize, .cursor-ew-resize, .cursor-ns-resize, .opacity-40, .cursor-move').forEach(el => {
        if (el.tagName.toLowerCase() === 'g' && el.querySelector('circle')) {
          el.remove()
        }
      })

      // 3. Normalize dimensions
      clone.setAttribute('viewBox', '0 0 900 650')
      clone.setAttribute('width', '900')
      clone.setAttribute('height', '650')

      // Fix grid pattern stroke color for dark background
      const gridPattern = clone.querySelector('#floor-grid path')
      if (gridPattern) {
        gridPattern.setAttribute('stroke', '#334155')
        gridPattern.setAttribute('stroke-opacity', '0.25')
      }

      const xml = new XMLSerializer().serializeToString(clone)
      const svgBlob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(svgBlob)

      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = 900 * scale
        canvas.height = 650 * scale
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          URL.revokeObjectURL(url)
          reject(new Error('No se pudo inicializar canvas 2D'))
          return
        }

        // Enable high quality image smoothing
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'

        // Fill background
        ctx.fillStyle = backgroundColor
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        // Draw SVG image scaled
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        URL.revokeObjectURL(url)

        canvas.toBlob(blob => {
          if (!blob) {
            reject(new Error('Error al generar archivo PNG'))
            return
          }
          const downloadUrl = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = downloadUrl
          a.download = filename
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(downloadUrl)
          resolve()
        }, 'image/png')
      }

      img.onerror = (e) => {
        URL.revokeObjectURL(url)
        console.error('SVG Image load error:', e)
        reject(new Error('Error al procesar la imagen del plano'))
      }

      img.src = url
    } catch (err) {
      reject(err)
    }
  })
}

/**
 * Exports the clean raw SVG file with all styles inlined.
 */
export function exportFloorplanToSvg(svgElement: SVGSVGElement, filename = 'plano-distribucion-boda.svg') {
  const clone = svgElement.cloneNode(true) as SVGSVGElement
  inlineComputedStyles(svgElement, clone)

  clone.setAttribute('viewBox', '0 0 900 650')
  clone.setAttribute('width', '900')
  clone.setAttribute('height', '650')

  const xml = new XMLSerializer().serializeToString(clone)
  const svgBlob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(svgBlob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Triggers standard browser print for the floorplan.
 */
export function printFloorplan() {
  window.print()
}

