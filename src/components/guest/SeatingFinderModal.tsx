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

  if (!isOpen) return null

  // Find matches across guest names AND companion names
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
    if (lower.includes('veg')) return <Salad className="w-3 h-3 text-emerald-500 shrink-0" />
    if (lower.includes('cel') || lower.includes('gluten')) return <Wheat className="w-3 h-3 text-amber-500 shrink-0" />
    if (lower.includes('infant') || lower.includes('niñ')) return <Baby className="w-3 h-3 text-sky-500 shrink-0" />
    return <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />
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

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200 cursor-pointer"
      onClick={onClose}
    >
      <div 
        className="bg-card text-card-foreground border border-white/40 dark:border-white/10 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border/80 flex items-center justify-between gap-3 bg-muted/40 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-xl shadow-inner shrink-0">
              🪑
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-base sm:text-lg leading-tight text-foreground flex items-center gap-1.5 truncate">
                <span>Buscador de Mesas</span>
              </h2>
              <p className="text-xs text-muted-foreground truncate">
                Encuentra tu mesa y descubre con quién te sientas
              </p>
            </div>
          </div>

          {/* Large touch-friendly close button (44px min touch target) */}
          <button
            type="button"
            onClick={onClose}
            className="w-11 h-11 sm:w-10 sm:h-10 rounded-2xl bg-muted/90 hover:bg-muted active:scale-90 text-foreground flex items-center justify-center border border-border shadow-xs transition-all cursor-pointer shrink-0"
            aria-label="Cerrar ventana de mesas"
            title="Cerrar (Esc)"
          >
            <X className="w-5 h-5 text-foreground" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="px-5 pt-3 shrink-0 flex items-center gap-2 border-b border-border/60 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('search')}
            className={`pb-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'search'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Buscar Mesa</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('floorplan')}
            className={`pb-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'floorplan'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Map className="w-3.5 h-3.5" />
            <span>Plano 2D 🗺️</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`pb-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'all'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Todas ({tables.length})</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          
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
              
              {/* Search input */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Escribe tu nombre, apellidos o mesa..."
                  className="pl-10 h-11 rounded-2xl bg-muted/30 border-border shadow-inner text-base sm:text-sm"
                />
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground font-semibold cursor-pointer"
                  >
                    Borrar
                  </button>
                )}
              </div>

              {/* Search results */}
              {cleanQuery.length < 2 ? (
                <div className="py-8 text-center space-y-2 text-muted-foreground">
                  <p className="text-xs">Empieza a escribir para localizar tu mesa al instante 🔍</p>
                </div>
              ) : matchingResults.length === 0 ? (
                <div className="py-8 text-center space-y-2 bg-muted/20 rounded-2xl border border-dashed p-4">
                  <p className="text-2xl">🤔</p>
                  <p className="text-sm font-bold text-foreground">No encontramos a "{query}"</p>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                    Prueba buscando tu nombre de pila, o explora la pestaña "Todas las Mesas".
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {matchingResults.map(({ guest, table, matchedCompanion }) => {
                    const totalTablePeople = getTablePeopleCount(table)
                    const seatCount = getAssignmentSeatCount(guest)

                    return (
                      <div 
                        key={guest.id}
                        className="rounded-2xl border-2 border-primary/40 bg-primary/[0.03] p-4 sm:p-5 shadow-lg space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300"
                      >
                        {/* Hero badge */}
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-sm mb-1.5">
                              <PartyPopper className="w-3.5 h-3.5" />
                              <span>¡Aquí está tu mesa!</span>
                            </div>
                            <h3 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                              Mesa {table.table_number}
                              {table.table_name && (
                                <span className="text-primary block text-base font-bold font-serif mt-0.5">
                                  «{table.table_name}»
                                </span>
                              )}
                            </h3>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                              {matchedCompanion ? 'Acompañante de' : 'Invitado'}
                            </span>
                            <span className="font-extrabold text-sm text-foreground">{guest.guest_name}</span>
                            {guest.companion_names && (
                              <span className="text-[11px] text-primary block font-semibold">
                                {guest.companion_names}
                              </span>
                            )}
                            {seatCount > 1 && (
                              <span className="inline-block px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold mt-1 border border-primary/20">
                                👥 {seatCount} plazas en la mesa
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Dietary note if any */}
                        {guest.dietary_requirements && (
                          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/10 text-amber-900 dark:text-amber-300 border border-amber-500/20 text-xs font-semibold">
                            {renderDietaryIcon(guest.dietary_requirements)}
                            <span>Menú especial registrado: <strong>{guest.dietary_requirements}</strong></span>
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
                        <div className="pt-3 border-t border-border/80 space-y-2">
                          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-primary" />
                            <span>Tus compañeros de mesa ({totalTablePeople} personas en total):</span>
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {table.assignments?.map(comp => {
                              const compSeats = getAssignmentSeatCount(comp)
                              const isCurrent = comp.id === guest.id

                              return (
                                <div
                                  key={comp.id}
                                  className={`p-2 rounded-xl border text-xs flex items-center justify-between gap-1.5 ${
                                    isCurrent
                                      ? 'bg-primary/15 border-primary/40 font-bold text-primary'
                                      : 'bg-background/80 border-border text-foreground font-medium'
                                  }`}
                                >
                                  <div className="min-w-0">
                                    <span className="truncate block">
                                      {comp.guest_name}
                                      {isCurrent ? ' (Tú)' : ''}
                                    </span>
                                    {comp.companion_names && (
                                      <span className="text-[10px] text-muted-foreground block font-normal">
                                        {comp.companion_names}
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    {compSeats > 1 && (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted font-bold text-muted-foreground">
                                        +{compSeats - 1}
                                      </span>
                                    )}
                                    {comp.dietary_requirements && (
                                      <span title={comp.dietary_requirements}>
                                        {renderDietaryIcon(comp.dietary_requirements)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>

                        {/* Button to Locate on 2D Floorplan */}
                        <div className="pt-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setHighlightedTableId(table.id)
                              setActiveTab('floorplan')
                            }}
                            className="w-full text-xs font-bold rounded-xl gap-2 border-primary/40 text-primary hover:bg-primary/10 cursor-pointer shadow-xs"
                          >
                            <Map className="w-3.5 h-3.5" />
                            <span>Ver ubicación exacta en el Plano 2D 🗺️</span>
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
              <div className="p-3 bg-muted/40 rounded-2xl border border-border flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-semibold flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>Haz clic en cualquier mesa para ver quién se sienta en ella</span>
                </span>
                {highlightedTableId && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-extrabold text-[10px] border border-rose-500/20 animate-pulse">
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
            /* All tables accordion */
            <div className="space-y-3">
              {tables.map(table => {
                const isExpanded = expandedTableId === table.id
                const totalPeople = getTablePeopleCount(table)

                return (
                  <div
                    key={table.id}
                    className="border border-border/80 rounded-2xl bg-muted/20 overflow-hidden transition-all shadow-sm"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedTableId(isExpanded ? null : table.id)}
                      className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-muted/40 transition-colors cursor-pointer select-none"
                    >
                      <div className="min-w-0 flex items-center gap-3">
                        <span className="px-2.5 py-1 rounded-xl bg-primary/10 text-primary font-mono text-xs font-black shrink-0 border border-primary/20">
                          Mesa {table.table_number}
                        </span>
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm text-foreground truncate">
                            {table.table_name || `Mesa ${table.table_number}`}
                          </h4>
                          <p className="text-[11px] text-muted-foreground">
                            {totalPeople} {totalPeople === 1 ? 'persona' : 'personas'} sentadas
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 text-muted-foreground">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="p-4 pt-0 border-t border-border/60 bg-background/50 space-y-2">
                        {table.notes && (
                          <p className="text-xs text-muted-foreground italic py-1">
                            📍 {table.notes}
                          </p>
                        )}
                        <div className="space-y-1">
                          {table.assignments && table.assignments.length > 0 ? (
                            table.assignments.map((guest, idx) => {
                              const seatCount = getAssignmentSeatCount(guest)

                              return (
                                <div
                                  key={guest.id}
                                  className="p-2 rounded-xl bg-muted/40 border border-border/40 text-xs flex items-center justify-between gap-2"
                                >
                                  <div className="min-w-0">
                                    <span className="font-semibold text-foreground truncate block">
                                      {idx + 1}. {guest.guest_name}
                                    </span>
                                    {guest.companion_names && (
                                      <span className="text-[10px] text-muted-foreground block font-normal">
                                        ({guest.companion_names})
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {seatCount > 1 && (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold">
                                        👥 {seatCount} plazas
                                      </span>
                                    )}
                                    {guest.dietary_requirements && (
                                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-800 dark:text-amber-300 font-semibold shrink-0">
                                        {guest.dietary_requirements}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )
                            })
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

        {/* Footer */}
        <div className="p-3.5 sm:p-4 bg-muted/40 border-t border-border flex items-center justify-between text-xs text-muted-foreground shrink-0">
          <span className="flex items-center gap-1.5 font-medium">
            <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
            <span>¡Que disfrutéis del banquete!</span>
          </span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onClose} 
            className="rounded-2xl h-10 px-5 font-bold text-xs sm:text-sm bg-background hover:bg-muted active:scale-95 transition-all cursor-pointer shadow-xs border-border/80"
          >
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  )
}
