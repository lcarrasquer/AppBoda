'use client'

import { useState } from 'react'
import { SeatingTable, SeatingAssignment, getAssignmentSeatCount, getTablePeopleCount, getExpandedTableGuests } from '@/lib/seating/types'
import { 
  createOrUpdateTable, 
  deleteTable, 
  addOrUpdateGuest, 
  deleteGuest, 
  bulkImportSeating 
} from './actions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { FloorplanCanvas } from '@/components/seating/FloorplanCanvas'
import { CateringReportModal } from '@/components/seating/CateringReportModal'
import { 
  Users, 
  Plus, 
  Trash2, 
  Edit2, 
  Sparkles, 
  Search, 
  UploadCloud, 
  X, 
  Check, 
  Utensils, 
  UserPlus, 
  ArrowRight,
  Baby,
  Wheat,
  Salad,
  AlertCircle,
  HelpCircle,
  Share2,
  MapPin,
  UserCheck,
  Map,
  LayoutGrid,
  Square,
  Circle,
  ChefHat,
  Filter
} from 'lucide-react'

interface SeatingManagerProps {
  eventId: string
  event: any
  initialTables: SeatingTable[]
}

const DIETARY_PRESETS = [
  { label: '🥗 Vegetariano', value: 'Vegetariano' },
  { label: '🌱 Vegano', value: 'Vegano' },
  { label: '🌾 Celíaco (Sin Gluten)', value: 'Celíaco (Sin Gluten)' },
  { label: '👶 Menú Infantil', value: 'Menú Infantil' },
  { label: '🍤 Alergia Marisco', value: 'Alergia Marisco' },
  { label: '🥜 Alergia Frutos Secos', value: 'Alergia Frutos Secos' },
  { label: '🥛 Sin Lactosa', value: 'Sin Lactosa' },
]

export function SeatingManager({ eventId, event, initialTables }: SeatingManagerProps) {
  const [tables, setTables] = useState<SeatingTable[]>(initialTables)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'grid' | 'floorplan'>('grid')

  // Modals state
  const [showTableModal, setShowTableModal] = useState(false)
  const [editingTable, setEditingTable] = useState<SeatingTable | null>(null)
  const [tableForm, setTableForm] = useState<{
    table_number: string
    table_name: string
    capacity: number
    shape: 'round' | 'rectangle'
    notes: string
  }>({
    table_number: '',
    table_name: '',
    capacity: 10,
    shape: 'round',
    notes: ''
  })

  const [showGuestModal, setShowGuestModal] = useState(false)
  const [editingGuest, setEditingGuest] = useState<{ guest?: SeatingAssignment; targetTableId: string } | null>(null)
  const [guestForm, setGuestForm] = useState({
    guest_name: '',
    companion_names: '',
    seats_count: 1,
    dietary_requirements: '',
    table_id: ''
  })

  const [showImportModal, setShowImportModal] = useState(false)
  const [showCateringModal, setShowCateringModal] = useState(false)
  const [dietFilter, setDietFilter] = useState<'all' | 'special_only' | 'available_only' | 'full_only'>('all')
  const [importText, setImportText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Modern Delete Confirm Dialog States
  const [tableToDelete, setTableToDelete] = useState<SeatingTable | null>(null)
  const [deletingTable, setDeletingTable] = useState(false)

  const [guestToDelete, setGuestToDelete] = useState<{ id: string; name: string } | null>(null)
  const [deletingGuest, setDeletingGuest] = useState(false)

  // Calculate stats taking every single seated person into account (+1, +2, etc.)
  const totalTables = tables.length
  const totalPeopleCount = tables.reduce((acc, t) => acc + getTablePeopleCount(t), 0)
  const totalEntriesCount = tables.reduce((acc, t) => acc + (t.assignments?.length || 0), 0)
  const totalCapacity = tables.reduce((acc, t) => acc + (t.capacity || 10), 0)
  const availableSeats = Math.max(0, totalCapacity - totalPeopleCount)
  const specialDietsCount = tables.reduce((acc, t) => {
    return acc + (t.assignments?.filter(a => a.dietary_requirements && a.dietary_requirements.trim() !== '').length || 0)
  }, 0)

  // 1. Table Handlers
  const handleOpenCreateTable = () => {
    setEditingTable(null)
    setTableForm({
      table_number: `${tables.length + 1}`,
      table_name: '',
      capacity: 10,
      shape: 'round',
      notes: ''
    })
    setShowTableModal(true)
  }

  const handleOpenEditTable = (table: SeatingTable) => {
    setEditingTable(table)
    setTableForm({
      table_number: table.table_number,
      table_name: table.table_name || '',
      capacity: table.capacity || 10,
      shape: table.shape || 'round',
      notes: table.notes || ''
    })
    setShowTableModal(true)
  }

  const handleSaveTable = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tableForm.table_number.trim()) {
      toast.error('Indica un número o identificador de mesa')
      return
    }

    try {
      setIsSubmitting(true)
      const res = await createOrUpdateTable(eventId, {
        id: editingTable?.id,
        table_number: tableForm.table_number,
        table_name: tableForm.table_name,
        capacity: Number(tableForm.capacity),
        shape: tableForm.shape,
        pos_x: editingTable?.pos_x ?? undefined,
        pos_y: editingTable?.pos_y ?? undefined,
        rotation: editingTable?.rotation,
        notes: tableForm.notes
      })

      if (res.error) {
        toast.error(res.error)
        return
      }

      toast.success(editingTable ? 'Mesa actualizada correctamente' : '¡Mesa creada con éxito! 🎉')
      setShowTableModal(false)
      window.location.reload()
    } catch (err: any) {
      toast.error('Error al guardar mesa')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConfirmDeleteTable = async () => {
    if (!tableToDelete) return

    try {
      setDeletingTable(true)
      const res = await deleteTable(eventId, tableToDelete.id)
      if (res.error) {
        toast.error(res.error)
        return
      }
      toast.success(`Mesa ${tableToDelete.table_number} eliminada 🗑️`)
      setTables(prev => prev.filter(t => t.id !== tableToDelete.id))
      setTableToDelete(null)
    } catch (err) {
      toast.error('Error al eliminar mesa')
    } finally {
      setDeletingTable(false)
    }
  }

  // 2. Guest Handlers
  const handleOpenAddGuest = (tableId: string) => {
    setEditingGuest({ targetTableId: tableId })
    setGuestForm({
      guest_name: '',
      companion_names: '',
      seats_count: 1,
      dietary_requirements: '',
      table_id: tableId
    })
    setShowGuestModal(true)
  }

  const handleOpenEditGuest = (guest: SeatingAssignment, tableId: string) => {
    setEditingGuest({ guest, targetTableId: tableId })
    setGuestForm({
      guest_name: guest.guest_name,
      companion_names: guest.companion_names || '',
      seats_count: getAssignmentSeatCount(guest),
      dietary_requirements: guest.dietary_requirements || '',
      table_id: guest.table_id || tableId
    })
    setShowGuestModal(true)
  }

  const handleSaveGuest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!guestForm.guest_name.trim()) {
      toast.error('Introduce el nombre del invitado')
      return
    }

    try {
      setIsSubmitting(true)
      const res = await addOrUpdateGuest(eventId, {
        id: editingGuest?.guest?.id,
        table_id: guestForm.table_id || editingGuest?.targetTableId || '',
        guest_name: guestForm.guest_name,
        companion_names: guestForm.companion_names,
        seats_count: Number(guestForm.seats_count) || 1,
        dietary_requirements: guestForm.dietary_requirements
      })

      if (res.error) {
        toast.error(res.error)
        return
      }

      toast.success(editingGuest?.guest ? 'Comensal actualizado' : 'Invitado sentado en la mesa 🍽️')
      setShowGuestModal(false)
      window.location.reload()
    } catch (err) {
      toast.error('Error al guardar comensal')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConfirmDeleteGuest = async () => {
    if (!guestToDelete) return

    try {
      setDeletingGuest(true)
      const res = await deleteGuest(eventId, guestToDelete.id)
      if (res.error) {
        toast.error(res.error)
        return
      }
      toast.success(`"${guestToDelete.name}" retirado de la mesa`)
      setTables(prev => prev.map(t => ({
        ...t,
        assignments: t.assignments?.filter(a => a.id !== guestToDelete.id)
      })))
      setGuestToDelete(null)
    } catch (err) {
      toast.error('Error al eliminar')
    } finally {
      setDeletingGuest(false)
    }
  }

  // 3. Quick inline add guest directly from table card
  const handleQuickAddGuest = async (tableId: string, name: string) => {
    if (!name.trim()) return
    try {
      const res = await addOrUpdateGuest(eventId, {
        table_id: tableId,
        guest_name: name.trim()
      })
      if (res.error) {
        toast.error(res.error)
        return
      }
      toast.success(`"${name}" sentado en la mesa`)
      window.location.reload()
    } catch (err) {
      toast.error('Error al añadir')
    }
  }

  // 4. Bulk Import Handler
  const handleBulkImport = async () => {
    if (!importText.trim()) {
      toast.error('Pega el listado de mesas e invitados')
      return
    }

    try {
      setIsSubmitting(true)
      const res = await bulkImportSeating(eventId, importText)
      if (res.error) {
        toast.error(res.error)
        return
      }
      toast.success('¡Listado importado con éxito! 🎉')
      setShowImportModal(false)
      window.location.reload()
    } catch (err: any) {
      toast.error('Error en la importación')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Helper dietary icon
  const renderDietaryIcon = (diet: string) => {
    const lower = diet.toLowerCase()
    if (lower.includes('veg')) return <Salad className="w-3 h-3 text-emerald-500 shrink-0" />
    if (lower.includes('cel') || lower.includes('gluten')) return <Wheat className="w-3 h-3 text-amber-500 shrink-0" />
    if (lower.includes('infant') || lower.includes('niñ')) return <Baby className="w-3 h-3 text-sky-500 shrink-0" />
    return <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />
  }

  // Filter tables by search query and diet/occupancy status
  const filteredTables = tables.filter(t => {
    const peopleCount = getTablePeopleCount(t)
    const cap = t.capacity || 10

    if (dietFilter === 'special_only') {
      const hasSpecial = t.assignments?.some(a => a.dietary_requirements && a.dietary_requirements.trim() !== '')
      if (!hasSpecial) return false
    } else if (dietFilter === 'available_only') {
      if (peopleCount >= cap) return false
    } else if (dietFilter === 'full_only') {
      if (peopleCount < cap) return false
    }

    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    const matchTable = t.table_number.toLowerCase().includes(q) || (t.table_name && t.table_name.toLowerCase().includes(q))
    const matchGuest = t.assignments?.some(a => 
      a.guest_name.toLowerCase().includes(q) || 
      (a.companion_names && a.companion_names.toLowerCase().includes(q)) ||
      (a.dietary_requirements && a.dietary_requirements.toLowerCase().includes(q))
    )
    return matchTable || matchGuest
  })

  return (
    <div className="space-y-8">
      
      {/* Top Banner & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/40 p-4 sm:p-6 rounded-2xl border border-border">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <span>🪑 Gestor de Mesas (Seating Plan)</span>
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Organiza las mesas del banquete, comensales y menús especiales. Tus invitados podrán buscar su mesa al instante desde su móvil.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          <Button 
            onClick={() => setShowCateringModal(true)}
            variant="outline"
            className="font-bold gap-2 rounded-xl border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
          >
            <ChefHat className="w-4 h-4" />
            <span>Informe Cocina & Dietas ({specialDietsCount})</span>
          </Button>

          <Button 
            onClick={() => setShowImportModal(true)}
            variant="outline"
            className="font-bold gap-2 rounded-xl border-primary/40 text-primary hover:bg-primary/10 cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Importar Lista</span>
          </Button>

          <Button 
            onClick={handleOpenCreateTable}
            className="font-bold gap-2 rounded-xl shadow-md bg-primary hover:opacity-90 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Mesa</span>
          </Button>
        </div>
      </div>

      {/* Live Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="shadow-sm border-border/80 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Personas Sentadas</p>
              <p className="text-2xl font-extrabold text-foreground tracking-tight">
                {totalPeopleCount}
                <span className="text-xs font-medium text-muted-foreground ml-1.5 font-sans">
                  ({totalEntriesCount} grupos)
                </span>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/80 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Total Mesas</p>
              <p className="text-2xl font-extrabold text-foreground tracking-tight">{totalTables}</p>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="shadow-sm border-border/80 bg-card/60 backdrop-blur-sm cursor-pointer hover:border-emerald-500/50 transition-colors"
          onClick={() => {
            setActiveTab('grid')
            setDietFilter('available_only')
          }}
          title="Ver mesas con plazas libres"
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
              <Check className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Plazas Libres</p>
              <p className="text-2xl font-extrabold text-foreground tracking-tight">{availableSeats}</p>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="shadow-sm border-border/80 bg-card/60 backdrop-blur-sm cursor-pointer hover:border-rose-500/50 transition-colors group"
          onClick={() => setShowCateringModal(true)}
          title="Ver informe completo de catering para cocina"
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 shrink-0 group-hover:scale-110 transition-transform">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <span>Dietas Especiales</span>
                <span className="text-[10px] text-rose-500 underline font-bold">Ver informe</span>
              </p>
              <p className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 tracking-tight">{specialDietsCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View Mode Tabs (Cards Grid vs 2D Floorplan) + Search & Filter Pills */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Switcher buttons */}
          <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-2xl border border-border shrink-0 self-start">
            <button
              type="button"
              onClick={() => setActiveTab('grid')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'grid'
                  ? 'bg-card text-foreground shadow-sm border border-border'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <LayoutGrid className="w-4 h-4 text-primary" />
              <span>Vista Tarjetas ({tables.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('floorplan')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'floorplan'
                  ? 'bg-card text-foreground shadow-sm border border-border'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Map className="w-4 h-4 text-primary" />
              <span>Plano Visual 2D 🗺️</span>
            </button>
          </div>

          {/* Search Bar */}
          {activeTab === 'grid' && (
            <div className="relative max-w-md w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Buscar comensal, mesa o dieta..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-xl bg-background border-border shadow-sm"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground font-semibold"
                >
                  Limpiar
                </button>
              )}
            </div>
          )}
        </div>

        {/* Quick Filter Pills in Grid View */}
        {activeTab === 'grid' && (
          <div className="flex items-center gap-2 flex-wrap text-xs pt-1">
            <span className="text-muted-foreground font-semibold flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Filtrar:
            </span>
            <button
              type="button"
              onClick={() => setDietFilter('all')}
              className={`px-3 py-1 rounded-full font-semibold transition-all cursor-pointer ${
                dietFilter === 'all'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/60 text-muted-foreground hover:text-foreground'
              }`}
            >
              Todas ({tables.length})
            </button>
            <button
              type="button"
              onClick={() => setDietFilter('special_only')}
              className={`px-3 py-1 rounded-full font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                dietFilter === 'special_only'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20'
              }`}
            >
              <Utensils className="w-3 h-3" />
              <span>Con Dietas Especiales ({specialDietsCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setDietFilter('available_only')}
              className={`px-3 py-1 rounded-full font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                dietFilter === 'available_only'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
              }`}
            >
              <Check className="w-3 h-3" />
              <span>Con Plazas Libres</span>
            </button>
            <button
              type="button"
              onClick={() => setDietFilter('full_only')}
              className={`px-3 py-1 rounded-full font-semibold transition-all cursor-pointer ${
                dietFilter === 'full_only'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'bg-muted/60 text-muted-foreground hover:text-foreground'
              }`}
            >
              Completas
            </button>
          </div>
        )}
      </div>

      {/* 2D Floorplan View */}
      {activeTab === 'floorplan' ? (
        <FloorplanCanvas
          eventId={eventId}
          tables={tables}
          onEditTable={handleOpenEditTable}
          onAddGuest={handleOpenAddGuest}
        />
      ) : tables.length === 0 ? (
        <div className="text-center py-16 px-4 border-2 border-dashed border-border rounded-2xl bg-muted/20 space-y-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto text-2xl">
            🪑
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-lg font-bold text-foreground">Aún no has creado ninguna mesa</h3>
            <p className="text-sm text-muted-foreground">
              Comienza creando las mesas del banquete o pega tu listado de comensales para generarlas automáticamente.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button onClick={handleOpenCreateTable} className="rounded-xl font-bold gap-2">
              <Plus className="w-4 h-4" />
              <span>Crear primera mesa</span>
            </Button>
            <Button onClick={() => setShowImportModal(true)} variant="outline" className="rounded-xl font-bold gap-2">
              <UploadCloud className="w-4 h-4" />
              <span>Pegar lista</span>
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTables.map((table) => {
            const peopleInTable = getTablePeopleCount(table)
            const cap = table.capacity || 10
            const isFull = peopleInTable >= cap
            const isOver = peopleInTable > cap

            return (
              <Card 
                key={table.id} 
                className={`shadow-md rounded-2xl border transition-all duration-200 hover:shadow-lg flex flex-col justify-between ${
                  isOver 
                    ? 'border-rose-500/50 bg-rose-500/[0.02]' 
                    : isFull 
                    ? 'border-emerald-500/40 bg-emerald-500/[0.02]' 
                    : 'border-border bg-card'
                }`}
              >
                <CardHeader className="pb-3 border-b border-border/60 space-y-2.5">
                  {/* Top Bar: Table Number Badge + Actions */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary font-mono text-xs font-black border border-primary/20 shadow-xs">
                        MESA {table.table_number}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleOpenEditTable(table)}
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                        title="Editar mesa"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setTableToDelete(table)}
                        className="p-1.5 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600 cursor-pointer transition-colors"
                        title="Eliminar mesa"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Table Theme Name */}
                  <div>
                    <h3 className="font-extrabold text-base sm:text-lg text-foreground tracking-tight leading-snug">
                      {table.table_name || `Mesa ${table.table_number}`}
                    </h3>
                  </div>

                  {/* Table Location / Notes Pill */}
                  {table.notes && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/60 text-muted-foreground text-xs font-medium border border-border/40">
                      <MapPin className="w-3 h-3 text-primary shrink-0" />
                      <span className="truncate">{table.notes}</span>
                    </div>
                  )}

                  {/* Capacity Bar */}
                  <div className="mt-2.5 space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-muted-foreground">Ocupación real</span>
                      <span className={isOver ? 'text-rose-600 font-bold' : isFull ? 'text-emerald-600 font-bold' : 'text-foreground'}>
                        {peopleInTable} / {cap} personas {isFull && !isOver && '• Completa ✨'} {isOver && '• ¡Exceso de plazas! ⚠️'}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${
                          isOver ? 'bg-rose-500' : isFull ? 'bg-emerald-500' : 'bg-primary'
                        }`}
                        style={{ width: `${Math.min(100, (peopleInTable / cap) * 100)}%` }}
                      />
                    </div>
                  </div>
                </CardHeader>

                {/* Seated Guests List (Expanded individually) */}
                <CardContent className="pt-3 pb-3 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5 min-h-[90px]">
                    {(() => {
                      const expanded = getExpandedTableGuests(table)
                      if (expanded.length === 0) {
                        return (
                          <div className="py-6 text-center text-xs text-muted-foreground italic">
                            Mesa vacía. Añade comensales abajo.
                          </div>
                        )
                      }

                      return expanded.map((person, idx) => (
                        <div 
                          key={person.uniqueId}
                          className={`group p-2 rounded-xl border text-xs transition-colors flex items-center justify-between gap-2 ${
                            person.isCompanion
                              ? 'bg-muted/20 border-dashed border-border/60 hover:bg-muted/40'
                              : 'bg-muted/40 border-border/50 hover:bg-muted'
                          }`}
                        >
                          <div className="min-w-0 flex items-center gap-2">
                            <span className="text-muted-foreground font-mono text-[10px] w-3.5 shrink-0 text-right">
                              {idx + 1}.
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className={`truncate ${person.isCompanion ? 'font-medium text-foreground/90' : 'font-semibold text-foreground'}`}>
                                  {person.name}
                                </p>
                                {person.isCompanion && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20 font-bold shrink-0">
                                    Acompañante de {person.parentGuestName}
                                  </span>
                                )}
                              </div>
                              {person.dietary && (
                                <div className="flex items-center gap-1 text-[10px] font-semibold text-amber-700 dark:text-amber-400 mt-0.5">
                                  {renderDietaryIcon(person.dietary)}
                                  <span className="truncate">{person.dietary}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <button
                              onClick={() => handleOpenEditGuest(person.rawAssignment, table.id)}
                              className="p-1 rounded hover:bg-background text-muted-foreground hover:text-foreground cursor-pointer"
                              title="Editar comensal y plazas"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setGuestToDelete({ id: person.assignmentId, name: person.isCompanion ? `${person.name} (Acompañante de ${person.parentGuestName})` : person.name })}
                              className="p-1 rounded hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600 cursor-pointer"
                              title="Quitar de la mesa"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))
                    })()}
                  </div>

                  {/* Inline quick add comensal */}
                  <div className="pt-2 border-t border-border/50">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault()
                        const input = e.currentTarget.elements.namedItem('inline_name') as HTMLInputElement
                        if (input && input.value.trim()) {
                          handleQuickAddGuest(table.id, input.value)
                          input.value = ''
                        }
                      }}
                      className="flex items-center gap-1.5"
                    >
                      <Input
                        name="inline_name"
                        placeholder="+ Nombre comensal..."
                        className="h-8 text-xs rounded-lg bg-background border-border"
                      />
                      <Button type="submit" size="sm" variant="secondary" className="h-8 px-2.5 text-xs rounded-lg shrink-0 cursor-pointer">
                        <Plus className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenAddGuest(table.id)}
                        className="h-8 px-2 text-xs rounded-lg text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                        title="Añadir con dieta o acompañante"
                      >
                        <Utensils className="w-3.5 h-3.5" />
                      </Button>
                    </form>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* MODAL 1: CREAR / EDITAR MESA */}
      {showTableModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card text-card-foreground border border-border rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <span>{editingTable ? '✏️ Editar Mesa' : '➕ Nueva Mesa de Banquete'}</span>
              </h3>
              <button 
                onClick={() => setShowTableModal(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTable} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="table_number" className="text-xs font-semibold">Número / Identificador *</Label>
                  <Input 
                    id="table_number"
                    value={tableForm.table_number}
                    onChange={(e) => setTableForm({ ...tableForm, table_number: e.target.value })}
                    placeholder="Ej: 1, 2, Presidencial..."
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="capacity" className="text-xs font-semibold">Capacidad (Plazas)</Label>
                  <Input 
                    id="capacity"
                    type="number"
                    min={1}
                    max={50}
                    value={tableForm.capacity}
                    onChange={(e) => setTableForm({ ...tableForm, capacity: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="table_name" className="text-xs font-semibold">Nombre Temático de la Mesa (Opcional)</Label>
                <Input 
                  id="table_name"
                  value={tableForm.table_name}
                  onChange={(e) => setTableForm({ ...tableForm, table_name: e.target.value })}
                  placeholder="Ej: Los Viajeros, La Toscana, Colegas de Uni..."
                />
              </div>

              {/* Table Shape Selector */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Forma en el Plano 2D</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTableForm({ ...tableForm, shape: 'round' })}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      tableForm.shape === 'round'
                        ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                        : 'bg-muted/40 hover:bg-muted text-muted-foreground border-border'
                    }`}
                  >
                    <Circle className="w-4 h-4" />
                    <span>🟢 Mesa Redonda</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTableForm({ ...tableForm, shape: 'rectangle' })}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      tableForm.shape === 'rectangle'
                        ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                        : 'bg-muted/40 hover:bg-muted text-muted-foreground border-border'
                    }`}
                  >
                    <Square className="w-4 h-4" />
                    <span>🟦 Mesa Rectangular</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="table_notes" className="text-xs font-semibold">Notas de ubicación / camarero (Opcional)</Label>
                <Input 
                  id="table_notes"
                  value={tableForm.notes}
                  onChange={(e) => setTableForm({ ...tableForm, notes: e.target.value })}
                  placeholder="Ej: Cerca de la barra, frente al jardín..."
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setShowTableModal(false)} className="rounded-xl">
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting} className="rounded-xl font-bold bg-primary hover:opacity-90">
                  {editingTable ? 'Actualizar Mesa' : 'Crear Mesa'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: AÑADIR / EDITAR COMENSAL CON DIETAS */}
      {showGuestModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card text-card-foreground border border-border rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Utensils className="w-5 h-5 text-primary" />
                <span>{editingGuest?.guest ? '✏️ Editar Comensal' : '🍽️ Sentar Invitado en Mesa'}</span>
              </h3>
              <button 
                onClick={() => setShowGuestModal(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGuest} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="guest_name" className="text-xs font-semibold">Nombre y Apellidos del Invitado *</Label>
                <Input 
                  id="guest_name"
                  value={guestForm.guest_name}
                  onChange={(e) => setGuestForm({ ...guestForm, guest_name: e.target.value })}
                  placeholder="Ej: María Gómez"
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="companion" className="text-xs font-semibold">Acompañante / Pareja / Hijos (Opcional)</Label>
                <Input 
                  id="companion"
                  value={guestForm.companion_names}
                  onChange={(e) => {
                    const val = e.target.value
                    let count = guestForm.seats_count
                    // Auto-suggest count if user types + 1, + 2, etc.
                    const plusMatch = val.match(/\+\s*(\d+)/)
                    if (plusMatch) {
                      count = 1 + parseInt(plusMatch[1], 10)
                    } else if (val.trim() && count === 1) {
                      count = 2
                    }
                    setGuestForm({ ...guestForm, companion_names: val, seats_count: count })
                  }}
                  placeholder="Ej: + 1 (Laura), con 2 niños..."
                />
              </div>

              {/* Seats / People Count Input with Presets */}
              <div className="space-y-1.5 p-3 bg-muted/40 rounded-xl border border-border/60">
                <div className="flex items-center justify-between">
                  <Label htmlFor="seats_count" className="text-xs font-bold flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-primary" />
                    <span>Plazas / Personas que ocupa en la mesa *</span>
                  </Label>
                  <span className="text-xs font-black text-primary">
                    {guestForm.seats_count} {guestForm.seats_count === 1 ? 'persona' : 'personas'}
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  <Input 
                    id="seats_count"
                    type="number"
                    min={1}
                    max={20}
                    value={guestForm.seats_count}
                    onChange={(e) => setGuestForm({ ...guestForm, seats_count: Math.max(1, Number(e.target.value)) })}
                    className="w-20 h-8 text-xs font-bold text-center"
                    required
                  />
                  <div className="flex flex-wrap gap-1">
                    {[
                      { label: '👤 1 (Solo)', val: 1 },
                      { label: '👥 2 (+1)', val: 2 },
                      { label: '👨‍👩‍👧 3 (+2)', val: 3 },
                      { label: '👨‍👩‍👧‍👦 4 (+3)', val: 4 },
                    ].map(btn => (
                      <button
                        key={btn.val}
                        type="button"
                        onClick={() => setGuestForm({ ...guestForm, seats_count: btn.val })}
                        className={`text-xs px-2 py-1 rounded-lg border font-bold transition-all cursor-pointer select-none ${
                          guestForm.seats_count === btn.val
                            ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                            : 'bg-background hover:bg-muted text-muted-foreground border-border'
                        }`}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="table_select" className="text-xs font-semibold">Mesa Asignada</Label>
                <select
                  id="table_select"
                  value={guestForm.table_id}
                  onChange={(e) => setGuestForm({ ...guestForm, table_id: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-background border border-input text-xs font-medium focus-visible:ring-1 focus-visible:ring-primary outline-none"
                >
                  {tables.map(t => (
                    <option key={t.id} value={t.id}>
                      Mesa {t.table_number} {t.table_name ? `- ${t.table_name}` : ''} ({t.assignments?.length || 0}/{t.capacity || 10} plazas)
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <Utensils className="w-3.5 h-3.5 text-rose-500" />
                  <span>Dieta, Alergia o Menú Especial</span>
                </Label>
                <Input 
                  value={guestForm.dietary_requirements}
                  onChange={(e) => setGuestForm({ ...guestForm, dietary_requirements: e.target.value })}
                  placeholder="Ej: Celíaco, Vegetariano, Alergia Marisco..."
                />
                
                {/* Presets chips */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {DIETARY_PRESETS.map(p => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setGuestForm({ ...guestForm, dietary_requirements: p.value })}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-muted hover:bg-primary/10 hover:text-primary transition-colors border border-border cursor-pointer select-none"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setShowGuestModal(false)} className="rounded-xl">
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting} className="rounded-xl font-bold bg-primary hover:opacity-90">
                  {editingGuest?.guest ? 'Actualizar' : 'Sentar en la Mesa'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: IMPORTADOR MASIVO DE LISTAS */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card text-card-foreground border border-border rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-primary" />
                <span>⚡ Importar Lista de Mesas e Invitados</span>
              </h3>
              <button 
                onClick={() => setShowImportModal(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Pega tu lista de mesas e invitados. El importador detectará los números de mesa, nombres temáticos, comensales y dietas entre paréntesis automáticamente:
              </p>

              <div className="p-3 bg-muted/60 rounded-xl border font-mono text-[11px] text-muted-foreground space-y-1 select-all">
                <p>Mesa 1 - Presidencial: Lucía, Carlos, Madre de la Novia</p>
                <p>Mesa 2 - Los Viajeros: Alejandro (Vegano), Laura, Marcos</p>
                <p>Mesa 3: Sofía (Celíaco), David, Elena</p>
              </div>

              <textarea
                rows={6}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="Pega aquí tu lista..."
                className="w-full p-3 rounded-xl bg-background border border-input text-xs font-mono resize-none focus-visible:ring-1 focus-visible:ring-primary outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setShowImportModal(false)} className="rounded-xl">
                Cancelar
              </Button>
              <Button 
                onClick={handleBulkImport} 
                disabled={isSubmitting} 
                className="rounded-xl font-bold bg-primary hover:opacity-90 gap-2"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Procesar e Importar</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modern Confirm Modal: Eliminar Mesa */}
      <ConfirmDialog
        isOpen={!!tableToDelete}
        title={`¿Eliminar Mesa ${tableToDelete?.table_number}${tableToDelete?.table_name ? ` - «${tableToDelete.table_name}»` : ''}?`}
        description="Esta acción eliminará la mesa y desasignará a todos los comensales sentados en ella. ¿Deseas continuar?"
        confirmText="Sí, eliminar mesa"
        cancelText="Cancelar"
        variant="destructive"
        loading={deletingTable}
        onConfirm={handleConfirmDeleteTable}
        onClose={() => setTableToDelete(null)}
      />

      {/* Modern Confirm Modal: Retirar Comensal */}
      <ConfirmDialog
        isOpen={!!guestToDelete}
        title="¿Retirar comensal de la mesa?"
        description={`¿Estás seguro de que deseas retirar a "${guestToDelete?.name}" de esta mesa? Podrás volver a sentarlo en cualquier momento.`}
        confirmText="Retirar de la mesa"
        cancelText="Cancelar"
        variant="destructive"
        loading={deletingGuest}
        onConfirm={handleConfirmDeleteGuest}
        onClose={() => setGuestToDelete(null)}
      />

      {/* Modern Catering & Kitchen Report Modal */}
      <CateringReportModal
        isOpen={showCateringModal}
        onClose={() => setShowCateringModal(false)}
        tables={tables}
        eventName={`${event?.bride_name || 'Boda'} & ${event?.groom_name || ''}`}
      />

    </div>
  )
}
