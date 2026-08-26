'use client'

import { useState, useEffect } from 'react'
import { SeatingTable, SeatingAssignment, getAssignmentSeatCount, getTablePeopleCount } from '@/lib/seating/types'
import { getEventSeatingPlan } from '@/app/e/[slug]/actions'
import { FloorplanCanvas } from '@/components/seating/FloorplanCanvas'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { 
  Search, 
  X, 
  Sparkles, 
  Users, 
  Utensils, 
  MapPin, 
  ChevronRight, 
  ChevronDown, 
  Wheat, 
  Salad, 
  Baby, 
  AlertCircle,
  PartyPopper,
  Layers,
  Heart,
  UserCheck,
  Map
} from 'lucide-react'

interface SeatingFinderModalProps {
  isOpen: boolean
  onClose: () => void
  eventId: string
  currentGuestName?: string
}

export function SeatingFinderModal({
  isOpen,
  onClose,
  eventId,
  currentGuestName = ''
}: SeatingFinderModalProps) {
  const [query, setQuery] = useState(currentGuestName)
  const [tables, setTables] = useState<SeatingTable[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'search' | 'all' | 'floorplan'>('search')
  const [highlightedTableId, setHighlightedTableId] = useState<string | null>(null)
  const [expandedTableId, setExpandedTableId] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadSeating()
    }
  }, [isOpen, eventId])

  const loadSeating = async () => {
    try {
      setLoading(true)
      const res = await getEventSeatingPlan(eventId)
      if (res.tables) {
        setTables(res.tables)
      }
    } catch (err) {
      console.error('Error loading seating plan:', err)
    } finally {
      setLoading(false)
    }
  }

  // Close modal on Escape key
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  // Find matches across guest names
  const cleanQuery = query.trim().toLowerCase()
  const matchingResults: { guest: SeatingAssignment; table: SeatingTable; matchedCompanion?: boolean }[] = []

  if (cleanQuery.length >= 2) {
    for (const table of tables) {
      for (const guest of table.assignments || []) {
        const matchName = guest.guest_name.toLowerCase().includes(cleanQuery)
        const matchComp = guest.companion_names?.toLowerCase().includes(cleanQuery)
        if (matchName) {
          matchingResults.push({ guest, table, matchedCompanion: false })
        } else if (matchComp) {
          matchingResults.push({ guest, table, matchedCompanion: true })
        }
      }
    }
  }

  const renderDietaryIcon = (diet: string) => {
    const lower = diet.toLowerCase()
    if (lower.includes('veg')) return <Salad className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
    if (lower.includes('cel') || lower.includes('gluten')) return <Wheat className="w-3.5 h-3.5 text-amber-500 shrink-0" />
    if (lower.includes('infant') || lower.includes('niñ')) return <Baby className="w-3.5 h-3.5 text-sky-500 shrink-0" />
    return <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
  }

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full h-full sm:h-auto sm:max-h-[88vh] sm:max-w-lg bg-background sm:rounded-2xl sm:border sm:border-white/40 dark:sm:border-white/10 sm:shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Matching Cronograma & Guestbook */}
        <div className="bg-background/80 backdrop-blur-md p-4 flex justify-between items-center border-b shrink-0">
          <div>
            <h3 className="font-extrabold text-lg flex items-center gap-2">
              <span className="text-xl shrink-0">🪑</span> Buscador de Mesas
            </h3>
            <p className="text-xs text-muted-foreground font-medium">Encuentra tu mesa y compañeros de banquete</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-muted rounded-full transition-colors active:scale-95 cursor-pointer text-muted-foreground hover:text-foreground"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch - Segmented Pill Control for easy mobile tapping */}
        <div className="p-3 bg-muted/30 border-b border-border/80 shrink-0">
          <div className="grid grid-cols-3 gap-1.5 bg-muted/70 p-1 rounded-2xl border border-border/60">
            <button
              type="button"
              onClick={() => setActiveTab('search')}
              className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none ${
                activeTab === 'search'
                  ? 'bg-background text-primary shadow-sm border border-border/60'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/40'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Buscar</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('floorplan')}
              className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none ${
                activeTab === 'floorplan'
                  ? 'bg-background text-primary shadow-sm border border-border/60'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/40'
              }`}
            >
              <Map className="w-3.5 h-3.5" />
              <span>Plano 2D</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none ${
                activeTab === 'all'
                  ? 'bg-background text-primary shadow-sm border border-border/60'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/40'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Todas ({tables.length})</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-4 space-y-4 flex-1 overflow-y-auto">
          
          {loading ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-semibold text-muted-foreground">Cargando distribución de mesas...</p>
            </div>
          ) : tables.length === 0 ? (
            <div className="py-12 text-center space-y-2 text-muted-foreground">
              <p className="text-3xl">🍽️</p>
              <p className="font-bold text-sm text-foreground">El plan de mesas aún no está disponible</p>
              <p className="text-xs">Los novios publicarán la asignación de mesas en breve.</p>
            </div>
          ) : activeTab === 'search' ? (
            <div className="space-y-4">
              
              {/* Search input form styled like Guestbook */}
              <div className="space-y-2 bg-muted/40 p-4 rounded-xl border">
                <label className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" /> Busca tu nombre o acompañante
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Escribe tu nombre (ej: Mateo, Sofía, Carmen)..."
                    className="pl-10 pr-16 h-11 rounded-xl bg-background border border-input text-base sm:text-sm shadow-xs"
                  />
                  {query && (
                    <button
                      onClick={() => setQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer px-1.5 py-0.5 rounded-md hover:bg-muted"
                    >
                      Borrar
                    </button>
                  )}
                </div>
              </div>

              {/* Search results */}
              {cleanQuery.length < 2 ? (
                <div className="text-center p-8 border border-dashed rounded-xl text-muted-foreground text-xs">
                  Empieza a escribir para localizar tu mesa al instante 🔍
                </div>
              ) : matchingResults.length === 0 ? (
                <div className="text-center p-8 border border-dashed rounded-xl text-muted-foreground text-xs space-y-1">
                  <p className="text-xl">🤔</p>
                  <p className="font-bold text-sm text-foreground">No encontramos a "{query}"</p>
                  <p className="text-xs text-muted-foreground">Prueba buscando tu nombre de pila o explora la pestaña "Todas las Mesas".</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <PartyPopper className="w-3.5 h-3.5 text-primary" /> Resultados encontrados ({matchingResults.length})
                  </h4>

                  {matchingResults.map(({ guest, table }) => {
                    const totalTablePeople = getTablePeopleCount(table)

                    return (
                      <div 
                        key={guest.id}
                        className="p-4 rounded-xl border bg-card shadow-sm space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300"
                      >
                        {/* Hero Header */}
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-extrabold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                                Mesa {table.table_number}
                              </span>
                              <span className="font-bold text-base text-foreground">
                                {table.table_name || `Mesa ${table.table_number}`}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Asignado a: <strong className="text-foreground">{guest.guest_name}</strong>
                            </p>
                          </div>

                          <span className="text-2xl bg-muted/60 p-2 rounded-xl border shrink-0">
                            🍽️
                          </span>
                        </div>

                        {/* Dietary note if any */}
                        {guest.dietary_requirements && (
                          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/10 text-amber-900 dark:text-amber-300 border border-amber-500/20 text-xs font-semibold">
                            {renderDietaryIcon(guest.dietary_requirements)}
                            <span>Menú especial: <strong>{guest.dietary_requirements}</strong></span>
                          </div>
                        )}

                        {/* Table notes */}
                        {table.notes && (
                          <p className="text-xs text-muted-foreground italic flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span>{table.notes}</span>
                          </p>
                        )}

                        {/* Companions in table */}
                        <div className="pt-2 border-t space-y-1.5">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                            <Users className="w-3 h-3 text-primary" />
                            <span>Compañeros de mesa ({totalTablePeople} comensales):</span>
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {table.assignments?.map(comp => {
                              const isCurrent = comp.id === guest.id

                              return (
                                <div
                                  key={comp.id}
                                  className={`p-2 rounded-lg border text-xs flex items-center justify-between gap-1.5 ${
                                    isCurrent
                                      ? 'bg-primary/10 border-primary/30 font-bold text-primary'
                                      : 'bg-muted/40 border-border text-foreground font-medium'
                                  }`}
                                >
                                  <span className="truncate">
                                    {comp.guest_name}
                                    {isCurrent ? ' (Tú)' : ''}
                                  </span>

                                  {comp.dietary_requirements && (
                                    <span title={comp.dietary_requirements}>
                                      {renderDietaryIcon(comp.dietary_requirements)}
                                    </span>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>

                        {/* Button to Locate on 2D Floorplan */}
                        <div className="pt-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setHighlightedTableId(table.id)
                              setActiveTab('floorplan')
                            }}
                            className="w-full text-xs font-bold rounded-xl gap-2 border-primary/30 text-primary hover:bg-primary/10 cursor-pointer py-4"
                          >
                            <Map className="w-3.5 h-3.5" />
                            <span>Ver ubicación en el Plano 2D 🗺️</span>
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ) : activeTab === 'floorplan' ? (
            /* 2D Floorplan View */
            <div className="space-y-3">
              <div className="p-3 bg-muted/40 rounded-xl border flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>Pulsa cualquier mesa para ver sus comensales</span>
                </span>
                {highlightedTableId && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold text-[10px] border border-rose-500/20">
                    Tu mesa resaltada 📍
                  </span>
                )}
              </div>

              <FloorplanCanvas
                eventId={eventId}
                tables={tables}
                readOnly={true}
                highlightTableId={highlightedTableId || undefined}
              />
            </div>
          ) : (
            /* All tables accordion matching Timeline Items List */
            <div className="space-y-3">
              {tables.map(table => {
                const isExpanded = expandedTableId === table.id
                const totalPeople = getTablePeopleCount(table)

                return (
                  <div
                    key={table.id}
                    className="p-4 rounded-xl border bg-card shadow-sm space-y-2"
                  >
                    <div
                      onClick={() => setExpandedTableId(isExpanded ? null : table.id)}
                      className="flex items-center justify-between gap-3 text-left cursor-pointer select-none"
                    >
                      <div className="min-w-0 flex items-center gap-3">
                        <span className="font-mono text-xs font-extrabold px-2 py-0.5 rounded-md bg-muted text-foreground border">
                          Mesa {table.table_number}
                        </span>
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm text-foreground truncate">
                            {table.table_name || `Mesa ${table.table_number}`}
                          </h4>
                          <p className="text-[11px] text-muted-foreground">
                            {totalPeople} {totalPeople === 1 ? 'persona' : 'personas'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 text-muted-foreground">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="pt-2 border-t space-y-2 animate-in fade-in duration-150">
                        {table.notes && (
                          <p className="text-xs text-muted-foreground italic">
                            📍 {table.notes}
                          </p>
                        )}
                        <div className="space-y-1">
                          {table.assignments && table.assignments.length > 0 ? (
                            table.assignments.map((guest, idx) => (
                              <div
                                key={guest.id}
                                className="p-2 rounded-lg bg-muted/40 border text-xs flex items-center justify-between gap-2"
                              >
                                <span className="font-semibold text-foreground truncate">
                                  {idx + 1}. {guest.guest_name}
                                </span>

                                {guest.dietary_requirements && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-800 dark:text-amber-300 font-semibold shrink-0">
                                    {guest.dietary_requirements}
                                  </span>
                                )}
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-muted-foreground italic py-2">Mesa vacía.</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Sticky Footer - Exactly matching Cronograma and Libro de Firmas */}
        <div className="p-4 border-t bg-background shrink-0">
          <Button onClick={onClose} variant="outline" className="w-full font-bold rounded-xl py-5 cursor-pointer">
            Cerrar Buscador de Mesas
          </Button>
        </div>
      </div>
    </div>
  )
}
