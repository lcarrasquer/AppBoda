'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { SeatingTable, getTablePeopleCount, getExpandedTableGuests } from '@/lib/seating/types'
import { updateTablePositions } from '@/app/dashboard/[eventId]/seating/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { 
  Move, 
  RotateCw, 
  Maximize2, 
  Sparkles, 
  Save, 
  Layers, 
  Users, 
  Circle, 
  Square, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Eye, 
  Grid, 
  X,
  MapPin,
  Utensils,
  Salad,
  Wheat,
  Baby,
  AlertCircle,
  Music,
  Camera,
  Plus,
  Sliders,
  Check,
  Trash2,
  Copy,
  PlusCircle,
  Minus,
  Scaling
} from 'lucide-react'

export type LandmarkType = 'dancefloor' | 'stage' | 'bar' | 'entrance' | 'dj' | 'photocall' | 'buffet' | 'chillout' | 'custom'

export interface FloorplanLandmark {
  id: string
  type: LandmarkType
  name: string
  subtitle?: string
  x: number
  y: number
  width: number
  height: number
  rotation?: number
  visible: boolean
}

export interface LandmarkTemplate {
  type: LandmarkType
  name: string
  subtitle?: string
  width: number
  height: number
  icon: string
  color: string
}

export const LANDMARK_TEMPLATES: LandmarkTemplate[] = [
  { type: 'dancefloor', name: '💃 PISTA DE BAILE 🕺', subtitle: 'Zona de Baile', width: 180, height: 120, icon: '💃', color: 'sky' },
  { type: 'bar', name: '🍸 BARRA LIBRE', width: 160, height: 40, icon: '🍸', color: 'emerald' },
  { type: 'stage', name: '🎪 PRESIDENCIA / ESCENARIO', width: 280, height: 44, icon: '🎪', color: 'primary' },
  { type: 'dj', name: '🎧 CABINA DJ', width: 100, height: 60, icon: '🎧', color: 'purple' },
  { type: 'photocall', name: '📸 PHOTOCALL', width: 120, height: 70, icon: '📸', color: 'amber' },
  { type: 'buffet', name: '🍽️ BUFFET / CÓCTEL', width: 180, height: 48, icon: '🍽️', color: 'rose' },
  { type: 'chillout', name: '🛋️ ZONA CHILL OUT', width: 150, height: 90, icon: '🛋️', color: 'indigo' },
  { type: 'entrance', name: '🚪 ENTRADA PRINCIPAL', width: 150, height: 38, icon: '🚪', color: 'slate' }
]

const DEFAULT_LANDMARKS: FloorplanLandmark[] = [
  {
    id: 'landmark_stage',
    type: 'stage',
    name: '🎪 PRESIDENCIA / ESCENARIO',
    x: 300,
    y: 20,
    width: 300,
    height: 44,
    rotation: 0,
    visible: true
  },
  {
    id: 'landmark_dancefloor',
    type: 'dancefloor',
    name: '💃 PISTA DE BAILE 🕺',
    subtitle: 'Zona de Baile',
    x: 360,
    y: 260,
    width: 180,
    height: 120,
    rotation: 0,
    visible: true
  },
  {
    id: 'landmark_entrance',
    type: 'entrance',
    name: '🚪 ENTRADA PRINCIPAL',
    x: 50,
    y: 580,
    width: 160,
    height: 38,
    rotation: 0,
    visible: true
  },
  {
    id: 'landmark_bar',
    type: 'bar',
    name: '🍸 BARRA LIBRE',
    x: 680,
    y: 580,
    width: 160,
    height: 38,
    rotation: 0,
    visible: true
  }
]

interface FloorplanCanvasProps {
  eventId: string
  tables: SeatingTable[]
  readOnly?: boolean
  highlightTableId?: string
  onEditTable?: (table: SeatingTable) => void
  onAddGuest?: (tableId: string) => void
}

const CANVAS_WIDTH = 900
const CANVAS_HEIGHT = 650

export function FloorplanCanvas({
  eventId,
  tables: initialTables,
  readOnly = false,
  highlightTableId,
  onEditTable,
  onAddGuest
}: FloorplanCanvasProps) {
  // Local state for tables with position coordinates
  const [tables, setTables] = useState<SeatingTable[]>([])
  const [landmarks, setLandmarks] = useState<FloorplanLandmark[]>(DEFAULT_LANDMARKS)
  
  const [selectedTableId, setSelectedTableId] = useState<string | null>(highlightTableId || null)
  const [selectedLandmarkId, setSelectedLandmarkId] = useState<string | null>(null)
  
  // Dragging state supporting both tables and landmarks
  const [draggingItem, setDraggingItem] = useState<{ type: 'table' | 'landmark'; id: string } | null>(null)
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  // Interactive Resizing state for landmarks
  const [resizingLandmark, setResizingLandmark] = useState<{
    id: string
    handle: 'br' | 'r' | 'b'
    startX: number
    startY: number
    startW: number
    startH: number
  } | null>(null)
  
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [saving, setSaving] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState<{ clientX: number; clientY: number; panX: number; panY: number } | null>(null)
  const [pinchDist, setPinchDist] = useState<{ startDist: number; startZoom: number } | null>(null)
  const [showAddElementMenu, setShowAddElementMenu] = useState(false)

  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Calculate dynamic ViewBox dimensions based on zoom & pan
  const viewBoxWidth = CANVAS_WIDTH / zoom
  const viewBoxHeight = CANVAS_HEIGHT / zoom
  const viewBoxX = (CANVAS_WIDTH - viewBoxWidth) / 2 + pan.x
  const viewBoxY = (CANVAS_HEIGHT - viewBoxHeight) / 2 + pan.y

  // Load landmarks from localStorage if available
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`floorplan_landmarks_${eventId}`)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setLandmarks(parsed)
        }
      }
    } catch {
      // ignore JSON parse errors
    }
  }, [eventId])

  // Initialize or auto-assign positions if none exist
  useEffect(() => {
    const updated = initialTables.map((t, idx) => {
      let x = t.pos_x
      let y = t.pos_y

      // Auto-assign nice default grid positions if undefined
      if (x === undefined || x === null || y === undefined || y === null) {
        const cols = 3
        const row = Math.floor(idx / cols)
        const col = idx % cols
        x = 180 + col * 260
        y = 160 + row * 180
      }

      return {
        ...t,
        shape: t.shape || 'round',
        pos_x: x,
        pos_y: y,
        rotation: t.rotation || 0
      }
    })

    setTables(updated)
    if (highlightTableId) {
      setSelectedTableId(highlightTableId)
      setSelectedLandmarkId(null)
      // Mantener escala al 100% para que no se redimensione la pantalla en móvil
      setZoom(1)
      setPan({ x: 0, y: 0 })
    }
  }, [initialTables, highlightTableId])

  // Get SVG coordinate from Mouse/Touch Event (supporting exact zoom & pan transformation)
  const getSVGCoords = useCallback((clientX: number, clientY: number) => {
    if (!svgRef.current) return { x: 0, y: 0 }
    const pt = svgRef.current.createSVGPoint()
    pt.x = clientX
    pt.y = clientY
    const ctm = svgRef.current.getScreenCTM()
    if (ctm) {
      const transformed = pt.matrixTransform(ctm.inverse())
      return { x: transformed.x, y: transformed.y }
    }
    const rect = svgRef.current.getBoundingClientRect()
    return {
      x: viewBoxX + ((clientX - rect.left) / rect.width) * viewBoxWidth,
      y: viewBoxY + ((clientY - rect.top) / rect.height) * viewBoxHeight
    }
  }, [viewBoxX, viewBoxY, viewBoxWidth, viewBoxHeight])

  // Canvas background Pan handlers (drag to move view)
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || draggingItem || resizingLandmark) return
    setIsPanning(true)
    setPanStart({
      clientX: e.clientX,
      clientY: e.clientY,
      panX: pan.x,
      panY: pan.y
    })
  }

  const handleCanvasTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch to Zoom start
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      setPinchDist({ startDist: dist, startZoom: zoom })
      setIsPanning(false)
      setPanStart(null)
      return
    }

    if (e.touches.length === 1 && !draggingItem && !resizingLandmark) {
      const touch = e.touches[0]
      setIsPanning(true)
      setPanStart({
        clientX: touch.clientX,
        clientY: touch.clientY,
        panX: pan.x,
        panY: pan.y
      })
    }
  }

  // 1. Table Drag Handlers
  const handleTableMouseDown = (e: React.MouseEvent, table: SeatingTable) => {
    if (readOnly || resizingLandmark) {
      setSelectedTableId(table.id)
      setSelectedLandmarkId(null)
      return
    }
    e.stopPropagation()
    const coords = getSVGCoords(e.clientX, e.clientY)
    setDraggingItem({ type: 'table', id: table.id })
    setSelectedTableId(table.id)
    setSelectedLandmarkId(null)
    setDragOffset({
      x: coords.x - (table.pos_x || 0),
      y: coords.y - (table.pos_y || 0)
    })
  }

  const handleTableTouchStart = (e: React.TouchEvent, table: SeatingTable) => {
    if (readOnly || resizingLandmark) {
      setSelectedTableId(table.id)
      setSelectedLandmarkId(null)
      return
    }
    const touch = e.touches[0]
    const coords = getSVGCoords(touch.clientX, touch.clientY)
    setDraggingItem({ type: 'table', id: table.id })
    setSelectedTableId(table.id)
    setSelectedLandmarkId(null)
    setDragOffset({
      x: coords.x - (table.pos_x || 0),
      y: coords.y - (table.pos_y || 0)
    })
  }

  // 2. Landmark Drag Handlers
  const handleLandmarkMouseDown = (e: React.MouseEvent, landmark: FloorplanLandmark) => {
    if (readOnly || resizingLandmark) return
    e.stopPropagation()
    const coords = getSVGCoords(e.clientX, e.clientY)
    setDraggingItem({ type: 'landmark', id: landmark.id })
    setSelectedLandmarkId(landmark.id)
    setSelectedTableId(null)
    setDragOffset({
      x: coords.x - landmark.x,
      y: coords.y - landmark.y
    })
  }

  const handleLandmarkTouchStart = (e: React.TouchEvent, landmark: FloorplanLandmark) => {
    if (readOnly || resizingLandmark) return
    const touch = e.touches[0]
    const coords = getSVGCoords(touch.clientX, touch.clientY)
    setDraggingItem({ type: 'landmark', id: landmark.id })
    setSelectedLandmarkId(landmark.id)
    setSelectedTableId(null)
    setDragOffset({
      x: coords.x - landmark.x,
      y: coords.y - landmark.y
    })
  }

  // 3. Interactive Resize Handle Drag Handlers
  const handleStartResize = (e: React.MouseEvent, landmark: FloorplanLandmark, handle: 'br' | 'r' | 'b') => {
    if (readOnly) return
    e.stopPropagation()
    const coords = getSVGCoords(e.clientX, e.clientY)
    setResizingLandmark({
      id: landmark.id,
      handle,
      startX: coords.x,
      startY: coords.y,
      startW: landmark.width,
      startH: landmark.height
    })
    setSelectedLandmarkId(landmark.id)
  }

  const handleStartResizeTouch = (e: React.TouchEvent, landmark: FloorplanLandmark, handle: 'br' | 'r' | 'b') => {
    if (readOnly) return
    e.stopPropagation()
    const touch = e.touches[0]
    const coords = getSVGCoords(touch.clientX, touch.clientY)
    setResizingLandmark({
      id: landmark.id,
      handle,
      startX: coords.x,
      startY: coords.y,
      startW: landmark.width,
      startH: landmark.height
    })
    setSelectedLandmarkId(landmark.id)
  }

  // Global window listeners for drag & drop AND interactive resizing
  useEffect(() => {
    if ((!draggingItem && !resizingLandmark) || readOnly) return

    const handleWindowMouseMove = (e: MouseEvent) => {
      const coords = getSVGCoords(e.clientX, e.clientY)

      // Handle Resizing
      if (resizingLandmark) {
        const deltaX = coords.x - resizingLandmark.startX
        const deltaY = coords.y - resizingLandmark.startY

        setLandmarks(prev => prev.map(lm => {
          if (lm.id !== resizingLandmark.id) return lm

          let nextW = lm.width
          let nextH = lm.height

          if (resizingLandmark.handle === 'br' || resizingLandmark.handle === 'r') {
            nextW = Math.max(60, Math.min(CANVAS_WIDTH - lm.x - 20, Math.round(resizingLandmark.startW + deltaX)))
          }
          if (resizingLandmark.handle === 'br' || resizingLandmark.handle === 'b') {
            nextH = Math.max(30, Math.min(CANVAS_HEIGHT - lm.y - 20, Math.round(resizingLandmark.startH + deltaY)))
          }

          return { ...lm, width: nextW, height: nextH }
        }))
        setHasUnsavedChanges(true)
        return
      }

      // Handle Dragging
      if (draggingItem) {
        const margin = 20
        if (draggingItem.type === 'table') {
          const tableMargin = 50
          const newX = Math.max(tableMargin, Math.min(CANVAS_WIDTH - tableMargin, coords.x - dragOffset.x))
          const newY = Math.max(tableMargin, Math.min(CANVAS_HEIGHT - tableMargin, coords.y - dragOffset.y))

          setTables(prev => prev.map(t => t.id === draggingItem.id ? { ...t, pos_x: newX, pos_y: newY } : t))
          setHasUnsavedChanges(true)
        } else if (draggingItem.type === 'landmark') {
          const item = landmarks.find(l => l.id === draggingItem.id)
          const w = item ? item.width : 100
          const h = item ? item.height : 50
          const newX = Math.max(margin, Math.min(CANVAS_WIDTH - w - margin, coords.x - dragOffset.x))
          const newY = Math.max(margin, Math.min(CANVAS_HEIGHT - h - margin, coords.y - dragOffset.y))

          setLandmarks(prev => prev.map(l => l.id === draggingItem.id ? { ...l, x: newX, y: newY } : l))
          setHasUnsavedChanges(true)
        }
      }
    }

    const handleWindowMouseUp = () => {
      setDraggingItem(null)
      setResizingLandmark(null)
    }

    const handleWindowTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 0) return
      const touch = e.touches[0]
      const coords = getSVGCoords(touch.clientX, touch.clientY)

      // Handle Resizing on Touch
      if (resizingLandmark) {
        const deltaX = coords.x - resizingLandmark.startX
        const deltaY = coords.y - resizingLandmark.startY

        setLandmarks(prev => prev.map(lm => {
          if (lm.id !== resizingLandmark.id) return lm

          let nextW = lm.width
          let nextH = lm.height

          if (resizingLandmark.handle === 'br' || resizingLandmark.handle === 'r') {
            nextW = Math.max(60, Math.min(CANVAS_WIDTH - lm.x - 20, Math.round(resizingLandmark.startW + deltaX)))
          }
          if (resizingLandmark.handle === 'br' || resizingLandmark.handle === 'b') {
            nextH = Math.max(30, Math.min(CANVAS_HEIGHT - lm.y - 20, Math.round(resizingLandmark.startH + deltaY)))
          }

          return { ...lm, width: nextW, height: nextH }
        }))
        setHasUnsavedChanges(true)
        return
      }

      // Handle Dragging on Touch
      if (draggingItem) {
        const margin = 20
        if (draggingItem.type === 'table') {
          const tableMargin = 50
          const newX = Math.max(tableMargin, Math.min(CANVAS_WIDTH - tableMargin, coords.x - dragOffset.x))
          const newY = Math.max(tableMargin, Math.min(CANVAS_HEIGHT - tableMargin, coords.y - dragOffset.y))

          setTables(prev => prev.map(t => t.id === draggingItem.id ? { ...t, pos_x: newX, pos_y: newY } : t))
          setHasUnsavedChanges(true)
        } else if (draggingItem.type === 'landmark') {
          const item = landmarks.find(l => l.id === draggingItem.id)
          const w = item ? item.width : 100
          const h = item ? item.height : 50
          const newX = Math.max(margin, Math.min(CANVAS_WIDTH - w - margin, coords.x - dragOffset.x))
          const newY = Math.max(margin, Math.min(CANVAS_HEIGHT - h - margin, coords.y - dragOffset.y))

          setLandmarks(prev => prev.map(l => l.id === draggingItem.id ? { ...l, x: newX, y: newY } : l))
          setHasUnsavedChanges(true)
        }
      }
    }

    const handleWindowTouchEnd = () => {
      setDraggingItem(null)
      setResizingLandmark(null)
    }

    window.addEventListener('mousemove', handleWindowMouseMove)
    window.addEventListener('mouseup', handleWindowMouseUp)
    window.addEventListener('touchmove', handleWindowTouchMove, { passive: false })
    window.addEventListener('touchend', handleWindowTouchEnd)

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove)
      window.removeEventListener('mouseup', handleWindowMouseUp)
      window.removeEventListener('touchmove', handleWindowTouchMove)
      window.removeEventListener('touchend', handleWindowTouchEnd)
    }
  }, [draggingItem, resizingLandmark, dragOffset, getSVGCoords, readOnly, landmarks])

  // Global listeners for Panning & Pinch-to-Zoom
  useEffect(() => {
    if (!isPanning && !pinchDist) return

    const handleWindowMouseMove = (e: MouseEvent) => {
      if (isPanning && panStart && svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect()
        const deltaX = (e.clientX - panStart.clientX) * (viewBoxWidth / rect.width)
        const deltaY = (e.clientY - panStart.clientY) * (viewBoxHeight / rect.height)
        setPan({
          x: panStart.panX - deltaX,
          y: panStart.panY - deltaY
        })
      }
    }

    const handleWindowMouseUp = () => {
      setIsPanning(false)
      setPanStart(null)
    }

    const handleWindowTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchDist) {
        // Pinch to Zoom
        const currentDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        )
        const scaleFactor = currentDist / pinchDist.startDist
        const nextZoom = Math.min(2.8, Math.max(0.6, +(pinchDist.startZoom * scaleFactor).toFixed(2)))
        setZoom(nextZoom)
        return
      }

      if (isPanning && panStart && e.touches.length === 1 && svgRef.current) {
        const touch = e.touches[0]
        const rect = svgRef.current.getBoundingClientRect()
        const deltaX = (touch.clientX - panStart.clientX) * (viewBoxWidth / rect.width)
        const deltaY = (touch.clientY - panStart.clientY) * (viewBoxHeight / rect.height)
        setPan({
          x: panStart.panX - deltaX,
          y: panStart.panY - deltaY
        })
      }
    }

    const handleWindowTouchEnd = () => {
      setIsPanning(false)
      setPanStart(null)
      setPinchDist(null)
    }

    window.addEventListener('mousemove', handleWindowMouseMove)
    window.addEventListener('mouseup', handleWindowMouseUp)
    window.addEventListener('touchmove', handleWindowTouchMove, { passive: false })
    window.addEventListener('touchend', handleWindowTouchEnd)

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove)
      window.removeEventListener('mouseup', handleWindowMouseUp)
      window.removeEventListener('touchmove', handleWindowTouchMove)
      window.removeEventListener('touchend', handleWindowTouchEnd)
    }
  }, [isPanning, panStart, pinchDist, viewBoxWidth, viewBoxHeight])

  // Wheel zoom handler for direct React and native integration
  const handleWheelZoom = useCallback((deltaY: number) => {
    const factor = deltaY < 0 ? 1.15 : 0.85
    setZoom(prev => Math.min(3.5, Math.max(0.5, +(prev * factor).toFixed(2))))
  }, [])

  // Native desktop mouse wheel & trackpad zoom listener
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleNativeWheel = (e: WheelEvent) => {
      e.preventDefault()
      e.stopPropagation()
      handleWheelZoom(e.deltaY)
    }

    container.addEventListener('wheel', handleNativeWheel, { passive: false })
    return () => {
      container.removeEventListener('wheel', handleNativeWheel)
    }
  }, [handleWheelZoom])

  // Keyboard shortcut listener (+ / - / 0) for desktop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If typing in an input, ignore
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return

      if (e.key === '+' || e.key === '=') {
        e.preventDefault()
        setZoom(prev => Math.min(3.2, +(prev + 0.25).toFixed(2)))
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault()
        setZoom(prev => Math.max(0.5, +(prev - 0.25).toFixed(2)))
      } else if (e.key === '0' || e.key === 'r') {
        e.preventDefault()
        setZoom(1)
        setPan({ x: 0, y: 0 })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Save All Positions
  const handleSavePositions = async () => {
    try {
      setSaving(true)
      const payload = tables.map(t => ({
        id: t.id,
        pos_x: Math.round(t.pos_x || 0),
        pos_y: Math.round(t.pos_y || 0),
        shape: t.shape,
        rotation: t.rotation
      }))

      // Persist landmarks locally
      localStorage.setItem(`floorplan_landmarks_${eventId}`, JSON.stringify(landmarks))

      const res = await updateTablePositions(eventId, payload)
      if (res.error) {
        toast.error(res.error)
        return
      }
      toast.success('¡Distribución del salón y mesas guardada con éxito! 🗺️✨')
      setHasUnsavedChanges(false)
    } catch {
      toast.error('Error al guardar el plano')
    } finally {
      setSaving(false)
    }
  }

  // Add a new Landmark from Template
  const handleAddLandmark = (tpl: LandmarkTemplate) => {
    const countSameType = landmarks.filter(l => l.type === tpl.type).length
    const label = countSameType > 0 ? `${tpl.name} ${countSameType + 1}` : tpl.name

    const newLandmark: FloorplanLandmark = {
      id: `landmark_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: tpl.type,
      name: label,
      subtitle: tpl.subtitle,
      x: 320 + ((landmarks.length * 25) % 180),
      y: 200 + ((landmarks.length * 25) % 180),
      width: tpl.width,
      height: tpl.height,
      rotation: 0,
      visible: true
    }

    setLandmarks(prev => [...prev, newLandmark])
    setSelectedLandmarkId(newLandmark.id)
    setSelectedTableId(null)
    setShowAddElementMenu(false)
    setHasUnsavedChanges(true)
    toast.success(`Se ha añadido ${tpl.name} al salón`)
  }

  // Duplicate Landmark
  const handleDuplicateLandmark = (landmark: FloorplanLandmark) => {
    const dup: FloorplanLandmark = {
      ...landmark,
      id: `landmark_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: `${landmark.name} (Copia)`,
      x: Math.min(CANVAS_WIDTH - landmark.width - 20, landmark.x + 30),
      y: Math.min(CANVAS_HEIGHT - landmark.height - 20, landmark.y + 30)
    }
    setLandmarks(prev => [...prev, dup])
    setSelectedLandmarkId(dup.id)
    setHasUnsavedChanges(true)
    toast.success(`Elemento duplicado`)
  }

  // Delete Landmark
  const handleDeleteLandmark = (landmarkId: string) => {
    setLandmarks(prev => prev.filter(l => l.id !== landmarkId))
    setSelectedLandmarkId(null)
    setHasUnsavedChanges(true)
    toast.info('Elemento eliminado del plano')
  }

  // Update Landmark Name
  const handleUpdateLandmarkName = (landmarkId: string, newName: string) => {
    setLandmarks(prev => prev.map(l => l.id === landmarkId ? { ...l, name: newName } : l))
    setHasUnsavedChanges(true)
  }

  // Toggle Table Shape
  const handleToggleShape = (tableId: string) => {
    setTables(prev => prev.map(t => {
      if (t.id === tableId) {
        const nextShape: 'round' | 'rectangle' = t.shape === 'rectangle' ? 'round' : 'rectangle'
        return { ...t, shape: nextShape }
      }
      return t
    }))
    setHasUnsavedChanges(true)
  }

  // Rotate Table (45 deg)
  const handleRotateTable = (tableId: string) => {
    setTables(prev => prev.map(t => {
      if (t.id === tableId) {
        const nextRot = ((t.rotation || 0) + 45) % 360
        return { ...t, rotation: nextRot }
      }
      return t
    }))
    setHasUnsavedChanges(true)
  }

  // Rotate Landmark (90 deg)
  const handleRotateLandmark = (landmarkId: string) => {
    setLandmarks(prev => prev.map(l => {
      if (l.id === landmarkId) {
        const nextRot = ((l.rotation || 0) + 90) % 360
        return { ...l, rotation: nextRot }
      }
      return l
    }))
    setHasUnsavedChanges(true)
  }

  // Dynamic Auto-Alignment based on the EXACT current positions of all room elements
  const handleAutoGrid = () => {
    const visibleLandmarks = landmarks.filter(l => l.visible)
    const marginAroundLandmarks = 65 // Clearance for table + chairs
    const minTableDistance = 120 // Minimum distance between table centers

    // 1. Helper to check if a point collides with any visible landmark
    const collidesWithLandmarks = (x: number, y: number) => {
      return visibleLandmarks.some(lm => {
        return (
          x >= lm.x - marginAroundLandmarks &&
          x <= lm.x + lm.width + marginAroundLandmarks &&
          y >= lm.y - marginAroundLandmarks &&
          y <= lm.y + lm.height + marginAroundLandmarks
        )
      })
    }

    // 2. Generate Candidate Grid Points across the whole canvas
    const xSteps = [110, 225, 340, 450, 560, 675, 790]
    const ySteps = [100, 210, 320, 430, 540]

    // Create candidate slots prioritized by symmetry (Left & Right balanced)
    const rawCandidates: { x: number; y: number; distFromCenter: number; side: 'left' | 'right' | 'center' }[] = []
    const centerX = CANVAS_WIDTH / 2
    const centerY = CANVAS_HEIGHT / 2

    for (const y of ySteps) {
      for (const x of xSteps) {
        if (!collidesWithLandmarks(x, y)) {
          const side = x < centerX - 40 ? 'left' : x > centerX + 40 ? 'right' : 'center'
          const distFromCenter = Math.hypot(x - centerX, y - centerY)
          rawCandidates.push({ x, y, distFromCenter, side })
        }
      }
    }

    // 3. Select non-overlapping slots with balanced distribution
    const selectedSlots: { x: number; y: number }[] = []
    const leftSlots = rawCandidates.filter(c => c.side === 'left')
    const rightSlots = rawCandidates.filter(c => c.side === 'right')
    const centerSlots = rawCandidates.filter(c => c.side === 'center')

    const maxItems = Math.max(leftSlots.length, rightSlots.length, centerSlots.length)

    // Alternate picking from Left, Right, and Center
    const prioritizedSlots: { x: number; y: number }[] = []
    for (let i = 0; i < maxItems; i++) {
      if (leftSlots[i]) prioritizedSlots.push(leftSlots[i])
      if (rightSlots[i]) prioritizedSlots.push(rightSlots[i])
      if (centerSlots[i]) prioritizedSlots.push(centerSlots[i])
    }

    // Filter to ensure no two chosen slots are closer than minTableDistance
    for (const cand of prioritizedSlots) {
      const tooClose = selectedSlots.some(s => Math.hypot(s.x - cand.x, s.y - cand.y) < minTableDistance)
      if (!tooClose) {
        selectedSlots.push({ x: cand.x, y: cand.y })
      }
    }

    // 4. Assign tables to the calculated free slots
    setTables(prev => prev.map((t, idx) => {
      if (idx < selectedSlots.length) {
        return {
          ...t,
          pos_x: selectedSlots[idx].x,
          pos_y: selectedSlots[idx].y
        }
      }

      // Fallback in case there are more tables than available grid slots
      const fallbackCol = idx % 4
      const fallbackRow = Math.floor(idx / 4)
      return {
        ...t,
        pos_x: 100 + fallbackCol * 220,
        pos_y: 100 + fallbackRow * 150
      }
    }))

    setHasUnsavedChanges(true)
    toast.success('¡Mesas auto-alineadas respetando todos los elementos de la sala! 📐✨')
  }

  // Selected entities
  const selectedTable = useMemo(() => tables.find(t => t.id === selectedTableId), [tables, selectedTableId])
  const selectedLandmark = useMemo(() => landmarks.find(l => l.id === selectedLandmarkId), [landmarks, selectedLandmarkId])

  const selectedTablePeople = useMemo(() => {
    if (!selectedTable) return []
    return getExpandedTableGuests(selectedTable)
  }, [selectedTable])

  const renderDietaryIcon = (diet: string) => {
    const lower = diet.toLowerCase()
    if (lower.includes('veg')) return <Salad className="w-3 h-3 text-emerald-500 inline-block ml-1" />
    if (lower.includes('cel') || lower.includes('gluten')) return <Wheat className="w-3 h-3 text-amber-500 inline-block ml-1" />
    if (lower.includes('infant') || lower.includes('niñ')) return <Baby className="w-3 h-3 text-sky-500 inline-block ml-1" />
    return <AlertCircle className="w-3 h-3 text-rose-500 inline-block ml-1" />
  }

  const isInteracting = Boolean(draggingItem || resizingLandmark)

  return (
    <div className="space-y-4 select-none">
      
      {/* Admin Floorplan Controls Header */}
      {!readOnly && (
        <div className="flex items-center justify-between gap-3 p-3 bg-muted/40 rounded-2xl border border-border flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Scaling className="w-4 h-4 text-primary" />
              <span>Arrastra y redimensiona libremente mesas y pistas de baile</span>
            </span>
            {hasUnsavedChanges && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-extrabold border border-amber-500/20 animate-pulse">
                Cambios pendientes
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            
            {/* Add New Room Element Dropdown */}
            <div className="relative">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAddElementMenu(!showAddElementMenu)}
                className="h-8 text-xs font-bold rounded-xl gap-1.5 cursor-pointer bg-primary/10 text-primary border-primary/30 hover:bg-primary/20 shadow-xs"
                title="Añadir pistas de baile, barras o zonas al salón"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>+ Añadir Elemento</span>
              </Button>

              {showAddElementMenu && (
                <div className="absolute right-0 top-10 z-50 w-64 p-2 rounded-2xl bg-card/95 backdrop-blur-2xl border border-border shadow-2xl space-y-1 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-2 py-1.5 text-[10px] font-black text-muted-foreground uppercase tracking-wider border-b border-border/60">
                    Añadir al Salón:
                  </div>
                  <div className="max-h-72 overflow-y-auto space-y-1 pt-1">
                    {LANDMARK_TEMPLATES.map(tpl => (
                      <button
                        key={tpl.type}
                        type="button"
                        onClick={() => handleAddLandmark(tpl)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold hover:bg-muted transition-colors text-left text-foreground cursor-pointer group"
                      >
                        <span className="text-base group-hover:scale-110 transition-transform">{tpl.icon}</span>
                        <span className="truncate">{tpl.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAutoGrid}
              className="h-8 text-xs font-semibold rounded-xl gap-1.5 cursor-pointer"
              title="Alinear automáticamente en cuadrícula"
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Auto-Alinear</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setZoom(prev => Math.min(3.2, +(prev + 0.25).toFixed(2)))}
              className="h-8 px-2.5 rounded-xl cursor-pointer"
              title="Acercar zoom (+)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setZoom(prev => Math.max(0.5, +(prev - 0.25).toFixed(2)))}
              className="h-8 px-2.5 rounded-xl cursor-pointer"
              title="Alejar zoom (-)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
              className="h-8 px-2.5 rounded-xl cursor-pointer text-xs font-bold"
              title="Reiniciar zoom al 100%"
            >
              100%
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleSavePositions}
              disabled={saving || !hasUnsavedChanges}
              className="h-8 text-xs font-bold rounded-xl gap-1.5 bg-primary text-primary-foreground shadow-md cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Guardando...' : 'Guardar Plano'}</span>
            </Button>
          </div>
        </div>
      )}

      {/* Main Floorplan Canvas Container */}
      <div 
        ref={containerRef}
        onWheel={(e) => {
          e.preventDefault()
          handleWheelZoom(e.deltaY)
        }}
        className="relative rounded-3xl border-2 border-border/80 overflow-hidden shadow-xl bg-slate-950/5 dark:bg-slate-950/40 backdrop-blur-md"
      >
        {/* Floating Zoom & Pan Controls (Always visible in guest and admin view) */}
        <div className="absolute right-3.5 bottom-3.5 z-30 flex items-center gap-1 p-1 rounded-2xl bg-card/90 backdrop-blur-2xl border border-border/80 shadow-2xl shadow-black/20 animate-in fade-in zoom-in-95 duration-200">
          <button
            type="button"
            onClick={() => setZoom(prev => Math.min(3.2, +(prev + 0.25).toFixed(2)))}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-foreground hover:bg-muted active:scale-90 transition-all cursor-pointer shadow-xs"
            title="Acercar zoom (+)"
            aria-label="Acercar zoom"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
            className="px-2.5 h-8 rounded-xl flex items-center justify-center font-mono font-black text-xs text-foreground hover:bg-muted active:scale-95 transition-all cursor-pointer"
            title="Hacer clic para reiniciar al 100% (0)"
          >
            {Math.round(zoom * 100)}%
          </button>

          <button
            type="button"
            onClick={() => setZoom(prev => Math.max(0.5, +(prev - 0.25).toFixed(2)))}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-foreground hover:bg-muted active:scale-90 transition-all cursor-pointer shadow-xs"
            title="Alejar zoom (-)"
            aria-label="Alejar zoom"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-4 bg-border/80 mx-0.5" />

          <button
            type="button"
            onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted active:scale-90 transition-all cursor-pointer"
            title="Centrar plano completo (0)"
            aria-label="Centrar plano"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Zoom & Navigation Hint for Mobile / Desktop */}
        <div className="absolute left-3.5 bottom-3.5 z-20 pointer-events-none hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/85 backdrop-blur-md border border-border text-[11px] font-bold text-muted-foreground shadow-md animate-in fade-in duration-200">
          <Move className="w-3 h-3 text-primary" />
          <span>{zoom > 1 ? 'Arrastra para desplazarte' : 'Rueda del ratón o +/- para hacer zoom'}</span>
        </div>

        <div className="relative w-full overflow-hidden">
          <svg
            ref={svgRef}
            viewBox={`${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`}
            className={`w-full max-w-full h-auto drop-shadow-sm touch-none select-none transition-[viewBox] duration-75 ${
              isPanning ? 'cursor-grabbing' : zoom > 1 ? 'cursor-grab' : readOnly ? 'cursor-default' : 'cursor-crosshair'
            }`}
            onMouseDown={handleCanvasMouseDown}
            onTouchStart={handleCanvasTouchStart}
            onDoubleClick={(e) => {
              e.preventDefault()
              setZoom(prev => prev < 1.8 ? 2 : 1)
              if (zoom >= 1.8) setPan({ x: 0, y: 0 })
            }}
            onClick={() => {
              setSelectedTableId(null)
              setSelectedLandmarkId(null)
              setShowAddElementMenu(false)
            }}
          >
            {/* Background Grid Pattern */}
            <defs>
              <pattern id="floor-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeOpacity="0.06" strokeWidth="1" />
              </pattern>
              <filter id="table-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#D4AF37" floodOpacity="0.35" />
              </filter>
              <filter id="landmark-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="5" floodColor="#38BDF8" floodOpacity="0.4" />
              </filter>
              <filter id="highlight-glow" x="-40%" y="-40%" width="180%" height="180%">
                <feDropShadow dx="0" dy="0" stdDeviation="12" floodColor="#E11D48" floodOpacity="0.6" />
              </filter>
            </defs>

            <rect width={CANVAS_WIDTH} height={CANVAS_HEIGHT} fill="url(#floor-grid)" />

            {/* Draggable & Resizable Hall Landmarks */}
            {landmarks.filter(l => l.visible).map(lm => {
              const isSelected = selectedLandmarkId === lm.id
              const isItemDragging = draggingItem?.type === 'landmark' && draggingItem?.id === lm.id
              const rot = lm.rotation || 0

              let fillClass = 'fill-muted/80 stroke-border'
              let textClass = 'fill-muted-foreground'

              if (lm.type === 'dancefloor') {
                fillClass = isSelected ? 'fill-sky-500/25 stroke-sky-500' : 'fill-sky-500/10 stroke-sky-500/30'
                textClass = 'fill-sky-600 dark:fill-sky-400'
              } else if (lm.type === 'stage') {
                fillClass = isSelected ? 'fill-primary/25 stroke-primary' : 'fill-primary/10 stroke-primary/30'
                textClass = 'fill-primary'
              } else if (lm.type === 'bar') {
                fillClass = isSelected ? 'fill-emerald-500/25 stroke-emerald-500' : 'fill-emerald-500/10 stroke-emerald-500/30'
                textClass = 'fill-emerald-600 dark:fill-emerald-400'
              } else if (lm.type === 'dj') {
                fillClass = isSelected ? 'fill-purple-500/25 stroke-purple-500' : 'fill-purple-500/10 stroke-purple-500/30'
                textClass = 'fill-purple-600 dark:fill-purple-400'
              } else if (lm.type === 'photocall') {
                fillClass = isSelected ? 'fill-amber-500/25 stroke-amber-500' : 'fill-amber-500/10 stroke-amber-500/30'
                textClass = 'fill-amber-600 dark:fill-amber-400'
              } else if (lm.type === 'buffet') {
                fillClass = isSelected ? 'fill-rose-500/25 stroke-rose-500' : 'fill-rose-500/10 stroke-rose-500/30'
                textClass = 'fill-rose-600 dark:fill-rose-400'
              } else if (lm.type === 'chillout') {
                fillClass = isSelected ? 'fill-indigo-500/25 stroke-indigo-500' : 'fill-indigo-500/10 stroke-indigo-500/30'
                textClass = 'fill-indigo-600 dark:fill-indigo-400'
              }

              return (
                <g
                  key={lm.id}
                  transform={`translate(${lm.x}, ${lm.y}) rotate(${rot}, ${lm.width / 2}, ${lm.height / 2})`}
                  className={`${readOnly ? '' : 'cursor-move'} transition-opacity duration-150 ${isItemDragging ? 'opacity-75 scale-[1.01]' : 'opacity-100'}`}
                  onMouseDown={(e) => handleLandmarkMouseDown(e, lm)}
                  onTouchStart={(e) => handleLandmarkTouchStart(e, lm)}
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedLandmarkId(lm.id)
                    setSelectedTableId(null)
                  }}
                  filter={isSelected ? 'url(#landmark-glow)' : undefined}
                >
                  <rect
                    width={lm.width}
                    height={lm.height}
                    rx={lm.type === 'dancefloor' ? 20 : 12}
                    className={`${fillClass} transition-all duration-200`}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                    strokeDasharray={lm.type === 'dancefloor' ? '6 6' : undefined}
                  />

                  <text
                    x={lm.width / 2}
                    y={lm.subtitle ? lm.height / 2 - 4 : lm.height / 2 + 4}
                    textAnchor="middle"
                    className={`${textClass} font-extrabold text-xs tracking-wider uppercase pointer-events-none select-none`}
                  >
                    {lm.name}
                  </text>

                  {lm.subtitle && (
                    <text
                      x={lm.width / 2}
                      y={lm.height / 2 + 14}
                      textAnchor="middle"
                      className="fill-muted-foreground text-[10px] font-medium pointer-events-none select-none"
                    >
                      {lm.subtitle}
                    </text>
                  )}

                  {/* Move indicator in top-right */}
                  {!readOnly && (
                    <g transform={`translate(${lm.width - 20}, 6)`} className="opacity-40 hover:opacity-100">
                      <Move className="w-3.5 h-3.5 text-foreground" />
                    </g>
                  )}

                  {/* Interactive SVG Resize Handles when selected */}
                  {isSelected && !readOnly && (
                    <g>
                      {/* Corner Bottom-Right handle (Resizes both width & height) */}
                      <g
                        transform={`translate(${lm.width - 2}, ${lm.height - 2})`}
                        className="cursor-nwse-resize"
                        onMouseDown={(e) => handleStartResize(e, lm, 'br')}
                        onTouchStart={(e) => handleStartResizeTouch(e, lm, 'br')}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <circle r="8" fill="#0284C7" stroke="#FFFFFF" strokeWidth="2.5" className="hover:scale-125 transition-transform shadow-md" />
                      </g>

                      {/* Right Edge handle (Resizes width) */}
                      <g
                        transform={`translate(${lm.width - 2}, ${lm.height / 2})`}
                        className="cursor-ew-resize"
                        onMouseDown={(e) => handleStartResize(e, lm, 'r')}
                        onTouchStart={(e) => handleStartResizeTouch(e, lm, 'r')}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <circle r="6" fill="#0284C7" stroke="#FFFFFF" strokeWidth="2" className="hover:scale-125 transition-transform" />
                      </g>

                      {/* Bottom Edge handle (Resizes height) */}
                      <g
                        transform={`translate(${lm.width / 2}, ${lm.height - 2})`}
                        className="cursor-ns-resize"
                        onMouseDown={(e) => handleStartResize(e, lm, 'b')}
                        onTouchStart={(e) => handleStartResizeTouch(e, lm, 'b')}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <circle r="6" fill="#0284C7" stroke="#FFFFFF" strokeWidth="2" className="hover:scale-125 transition-transform" />
                      </g>
                    </g>
                  )}
                </g>
              )
            })}

            {/* Render Tables */}
            {tables.map(table => {
              const x = table.pos_x || 200
              const y = table.pos_y || 200
              const isSelected = selectedTableId === table.id
              const isHighlighted = highlightTableId === table.id
              const peopleCount = getTablePeopleCount(table)
              const cap = table.capacity || 10
              const isFull = peopleCount >= cap
              const isOver = peopleCount > cap
              const shape = table.shape || 'round'
              const rot = table.rotation || 0
              const isTableDragging = draggingItem?.type === 'table' && draggingItem?.id === table.id

              // Calculate chairs around the table
              const chairElements = []
              const totalChairs = Math.max(cap, peopleCount)

              if (shape === 'round') {
                const chairDistance = 58
                for (let i = 0; i < totalChairs; i++) {
                  const angle = (i / totalChairs) * 2 * Math.PI - Math.PI / 2
                  const cx = Math.cos(angle) * chairDistance
                  const cy = Math.sin(angle) * chairDistance
                  const isOccupied = i < peopleCount
                  chairElements.push(
                    <circle
                      key={`chair_${i}`}
                      cx={cx}
                      cy={cy}
                      r="6"
                      className={`transition-all duration-300 ${
                        isOccupied 
                          ? 'fill-emerald-500 stroke-emerald-600' 
                          : 'fill-muted stroke-border/80'
                      }`}
                      strokeWidth="1.5"
                    />
                  )
                }
              } else {
                // Rectangle table chairs
                const tableW = 110
                const tableH = 50
                const halfPerSide = Math.ceil(totalChairs / 2)
                
                for (let i = 0; i < halfPerSide; i++) {
                  const cx = -tableW / 2 + (tableW / (halfPerSide + 1)) * (i + 1)
                  const cy = -tableH / 2 - 12
                  const isOccupied = i < peopleCount
                  chairElements.push(
                    <rect
                      key={`chair_t_${i}`}
                      x={cx - 6}
                      y={cy}
                      width="12"
                      height="10"
                      rx="3"
                      className={`transition-all duration-300 ${
                        isOccupied ? 'fill-emerald-500 stroke-emerald-600' : 'fill-muted stroke-border/80'
                      }`}
                      strokeWidth="1"
                    />
                  )
                }
                for (let i = 0; i < halfPerSide; i++) {
                  const cx = -tableW / 2 + (tableW / (halfPerSide + 1)) * (i + 1)
                  const cy = tableH / 2 + 3
                  const isOccupied = (halfPerSide + i) < peopleCount
                  chairElements.push(
                    <rect
                      key={`chair_b_${i}`}
                      x={cx - 6}
                      y={cy}
                      width="12"
                      height="10"
                      rx="3"
                      className={`transition-all duration-300 ${
                        isOccupied ? 'fill-emerald-500 stroke-emerald-600' : 'fill-muted stroke-border/80'
                      }`}
                      strokeWidth="1"
                    />
                  )
                }
              }

              return (
                <g
                  key={table.id}
                  transform={`translate(${x}, ${y}) rotate(${rot})`}
                  className={`${readOnly ? 'cursor-pointer' : 'cursor-move'} transition-opacity duration-150 ${isTableDragging ? 'opacity-75 scale-105' : 'opacity-100'}`}
                  onMouseDown={(e) => handleTableMouseDown(e, table)}
                  onTouchStart={(e) => handleTableTouchStart(e, table)}
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedTableId(table.id)
                    setSelectedLandmarkId(null)
                  }}
                  filter={isHighlighted ? 'url(#highlight-glow)' : isSelected ? 'url(#table-glow)' : undefined}
                >
                  {/* Outer Chairs */}
                  {chairElements}

                  {/* Table Shape Body */}
                  {shape === 'round' ? (
                    <circle
                      r="42"
                      className={`transition-all duration-300 ${
                        isSelected
                          ? 'fill-primary/20 stroke-primary stroke-3'
                          : isHighlighted
                          ? 'fill-rose-500/20 stroke-rose-500 stroke-3 animate-pulse'
                          : isOver
                          ? 'fill-destructive/20 stroke-destructive stroke-2'
                          : isFull
                          ? 'fill-emerald-500/15 stroke-emerald-500 stroke-2'
                          : 'fill-card stroke-border stroke-2 hover:stroke-primary/60'
                      }`}
                    />
                  ) : (
                    <rect
                      x="-55"
                      y="-25"
                      width="110"
                      height="50"
                      rx="14"
                      className={`transition-all duration-300 ${
                        isSelected
                          ? 'fill-primary/20 stroke-primary stroke-3'
                          : isHighlighted
                          ? 'fill-rose-500/20 stroke-rose-500 stroke-3 animate-pulse'
                          : isOver
                          ? 'fill-destructive/20 stroke-destructive stroke-2'
                          : isFull
                          ? 'fill-emerald-500/15 stroke-emerald-500 stroke-2'
                          : 'fill-card stroke-border stroke-2 hover:stroke-primary/60'
                      }`}
                    />
                  )}

                  {/* Content inside table */}
                  <g transform={`rotate(${-rot})`}>
                    <text
                      y="-8"
                      textAnchor="middle"
                      className="fill-foreground font-black text-xs pointer-events-none select-none tracking-tight"
                    >
                      Mesa {table.table_number}
                    </text>

                    {table.table_name && (
                      <text
                        y="6"
                        textAnchor="middle"
                        className="fill-primary font-bold text-[9px] pointer-events-none select-none truncate max-w-[80px]"
                      >
                        {table.table_name.length > 12 ? `${table.table_name.slice(0, 11)}…` : table.table_name}
                      </text>
                    )}

                    <text
                      y="18"
                      textAnchor="middle"
                      className={`text-[9px] font-bold pointer-events-none select-none ${
                        isOver ? 'fill-destructive font-black' : isFull ? 'fill-emerald-600 dark:fill-emerald-400' : 'fill-muted-foreground'
                      }`}
                    >
                      {peopleCount}/{cap} pers.
                    </text>
                  </g>
                </g>
              )
            })}
          </svg>
        </div>

        {/* Floating Inspector Card for Selected Landmark with Full Resize Controls */}
        {selectedLandmark && !readOnly && (
          <div 
            className={`absolute top-4 ${
              selectedLandmark.x > CANVAS_WIDTH * 0.48 ? 'left-4' : 'right-4'
            } z-30 w-84 bg-card/95 backdrop-blur-xl p-4 rounded-3xl border border-border shadow-2xl space-y-3.5 animate-in fade-in duration-200 ${
              isInteracting ? 'pointer-events-none opacity-20' : 'opacity-100'
            }`}
          >
            <div className="flex items-center justify-between border-b border-border pb-2">
              <div className="flex items-center gap-2 flex-1 mr-2">
                <Input
                  value={selectedLandmark.name}
                  onChange={(e) => handleUpdateLandmarkName(selectedLandmark.id, e.target.value)}
                  className="h-8 text-xs font-bold rounded-xl border-border bg-background/50 focus:bg-background"
                  placeholder="Nombre del elemento"
                />
              </div>
              <button
                type="button"
                onClick={() => setSelectedLandmarkId(null)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Resize Hint & Tip */}
            <div className="bg-primary/5 p-2.5 rounded-2xl border border-primary/20 text-xs flex items-center gap-2">
              <Scaling className="w-4 h-4 text-primary shrink-0" />
              <span className="text-muted-foreground text-[11px]">
                Arrastra los <strong className="text-primary font-bold">puntos azules</strong> en las esquinas y bordes del elemento para redimensionarlo directamente con el ratón.
              </span>
            </div>

            {/* Actions: Rotate, Duplicate, Delete */}
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleRotateLandmark(selectedLandmark.id)}
                className="text-xs font-semibold rounded-xl h-8 gap-1 cursor-pointer"
                title="Girar 90 grados"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Girar</span>
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDuplicateLandmark(selectedLandmark)}
                className="text-xs font-semibold rounded-xl h-8 gap-1 cursor-pointer"
                title="Duplicar este elemento"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Duplicar</span>
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDeleteLandmark(selectedLandmark.id)}
                className="text-xs font-bold rounded-xl h-8 gap-1 text-destructive hover:bg-destructive/10 border-destructive/30 cursor-pointer"
                title="Borrar elemento"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Borrar</span>
              </Button>
            </div>
          </div>
        )}

        {/* Floating Table Inspector Drawer (Admin only) */}
        {selectedTable && !readOnly && (
          <div 
            className={`absolute top-4 ${
              (selectedTable.pos_x || 0) > CANVAS_WIDTH * 0.48 ? 'left-4' : 'right-4'
            } z-20 w-80 bg-card/95 backdrop-blur-xl p-4 rounded-3xl border border-border shadow-2xl space-y-3 animate-in fade-in zoom-in-95 duration-200 transition-all ${
              isInteracting ? 'pointer-events-none opacity-20' : 'opacity-100'
            }`}
          >
            <div className="flex items-center justify-between border-b border-border pb-2">
              <div className="flex items-center gap-2">
                <span className="font-black text-base text-foreground">
                  Mesa {selectedTable.table_number}
                </span>
                {selectedTable.table_name && (
                  <span className="text-xs font-bold text-primary truncate max-w-[120px]">
                    ({selectedTable.table_name})
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedTableId(null)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Shape & Rotation Controls */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleToggleShape(selectedTable.id)}
                className="text-xs font-semibold rounded-xl h-8 gap-1.5"
              >
                {selectedTable.shape === 'rectangle' ? <Circle className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                <span>{selectedTable.shape === 'rectangle' ? 'Hacer Redonda' : 'Hacer Rectangular'}</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleRotateTable(selectedTable.id)}
                className="text-xs font-semibold rounded-xl h-8 gap-1.5"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Girar 45°</span>
              </Button>
            </div>

            {/* Capacity Meter */}
            <div className="flex items-center justify-between text-xs font-semibold px-1">
              <span className="text-muted-foreground">Ocupación:</span>
              <span className={`font-mono font-bold ${
                selectedTablePeople.length > (selectedTable.capacity || 10)
                  ? 'text-destructive font-black'
                  : selectedTablePeople.length === (selectedTable.capacity || 10)
                  ? 'text-emerald-500'
                  : 'text-primary'
              }`}>
                {selectedTablePeople.length} de {selectedTable.capacity || 10} plazas
              </span>
            </div>

            {/* Guests list inside table */}
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {selectedTablePeople.length > 0 ? (
                selectedTablePeople.map((p, idx) => (
                  <div
                    key={p.uniqueId}
                    className="p-1.5 rounded-lg bg-muted/30 border border-border/40 text-xs flex items-center justify-between gap-1.5"
                  >
                    <span className="truncate font-medium text-foreground">
                      {idx + 1}. {p.name}
                      {p.isCompanion && <span className="text-[10px] text-muted-foreground ml-1">({p.parentGuestName})</span>}
                    </span>
                    {p.dietary && (
                      <span title={p.dietary}>
                        {renderDietaryIcon(p.dietary)}
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground italic py-1 text-center">Mesa vacía.</p>
              )}
            </div>

            {/* Action Buttons for admin */}
            {onEditTable && (
              <div className="pt-2 border-t border-border">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onEditTable(selectedTable)}
                  className="w-full text-xs font-bold rounded-xl h-8 gap-1.5"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Gestionar Comensales</span>
                </Button>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Guest View: Selected Table Details Card placed cleanly BELOW canvas (so it never covers the map) */}
      {readOnly && selectedTable && (
        <div className="mt-3 p-4 bg-card rounded-2xl border-2 border-primary/40 shadow-lg space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between border-b border-border pb-2.5">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-extrabold px-2.5 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20">
                Mesa {selectedTable.table_number}
              </span>
              <h4 className="font-bold text-base text-foreground">
                {selectedTable.table_name || `Mesa ${selectedTable.table_number}`}
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setSelectedTableId(null)}
              className="text-xs font-bold text-muted-foreground hover:text-foreground px-2.5 py-1 rounded-lg hover:bg-muted cursor-pointer transition-colors"
            >
              Ocultar info ✕
            </button>
          </div>

          <div className="space-y-1.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Users className="w-3 h-3 text-primary" />
              <span>Comensales en esta mesa ({selectedTablePeople.length} personas):</span>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
              {selectedTablePeople.map((p, idx) => (
                <div
                  key={p.uniqueId}
                  className="p-2 rounded-xl bg-muted/40 border border-border/50 text-xs flex items-center justify-between gap-1.5"
                >
                  <span className="font-medium text-foreground truncate">
                    {idx + 1}. {p.name}
                    {p.isCompanion && <span className="text-[10px] text-muted-foreground ml-1">({p.parentGuestName})</span>}
                  </span>
                  {p.dietary && (
                    <span title={p.dietary}>
                      {renderDietaryIcon(p.dietary)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
