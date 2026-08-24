'use client'

import { useMemo } from 'react'
import { SeatingTable, getExpandedTableGuests } from '@/lib/seating/types'
import { Button } from '@/components/ui/button'
import { 
  X, 
  Salad, 
  Wheat, 
  Baby, 
  AlertCircle, 
  ChefHat,
  Utensils
} from 'lucide-react'

interface CateringReportModalProps {
  isOpen: boolean
  onClose: () => void
  tables: SeatingTable[]
  eventName?: string
}

export function CateringReportModal({
  isOpen,
  onClose,
  tables
}: CateringReportModalProps) {
  // Extract and categorize ONLY seated guests with special dietary requirements
  const { 
    specialDietGuests, 
    dietCounts,
    tablesWithSpecialDietsCount
  } = useMemo(() => {
    const special: {
      tableNumber: string
      tableName?: string | null
      guestName: string
      isCompanion: boolean
      parentGuestName?: string
      dietary: string
      notes?: string | null
    }[] = []

    const counts: Record<string, number> = {}
    const tablesSpecialSet = new Set<string>()

    // Sort tables by table number naturally
    const sortedTables = [...tables].sort((a, b) => {
      const numA = parseInt(a.table_number, 10)
      const numB = parseInt(b.table_number, 10)
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB
      return a.table_number.localeCompare(b.table_number)
    })

    sortedTables.forEach(table => {
      const guests = getExpandedTableGuests(table)

      guests.forEach(g => {
        if (g.dietary && g.dietary.trim() !== '') {
          const diet = g.dietary.trim()
          tablesSpecialSet.add(table.id)

          special.push({
            tableNumber: table.table_number,
            tableName: table.table_name,
            guestName: g.name,
            isCompanion: g.isCompanion,
            parentGuestName: g.parentGuestName,
            dietary: diet,
            notes: g.rawAssignment.notes
          })

          // Normalize category for summary
          const lower = diet.toLowerCase()
          let category = 'Otras Alergias / Dietas'
          if (lower.includes('cel') || lower.includes('gluten')) category = '🌾 Celíaco (Sin Gluten)'
          else if (lower.includes('vegano')) category = '🌱 Vegano'
          else if (lower.includes('veg')) category = '🥗 Vegetariano'
          else if (lower.includes('infant') || lower.includes('niñ')) category = '👶 Menú Infantil'
          else if (lower.includes('marisc')) category = '🍤 Alergia al Marisco'
          else if (lower.includes('fruto') || lower.includes('nuez') || lower.includes('cacahuete')) category = '🥜 Frutos Secos'
          else if (lower.includes('lact')) category = '🥛 Sin Lactosa'

          counts[category] = (counts[category] || 0) + 1
        }
      })
    })

    return {
      specialDietGuests: special,
      dietCounts: counts,
      tablesWithSpecialDietsCount: tablesSpecialSet.size
    }
  }, [tables])

  if (!isOpen) return null

  const renderDietIcon = (diet: string) => {
    const lower = diet.toLowerCase()
    if (lower.includes('veg')) return <Salad className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
    if (lower.includes('cel') || lower.includes('gluten')) return <Wheat className="w-3.5 h-3.5 text-amber-600 shrink-0" />
    if (lower.includes('infant') || lower.includes('niñ')) return <Baby className="w-3.5 h-3.5 text-sky-600 shrink-0" />
    return <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-card text-card-foreground border border-border rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between gap-4 bg-muted/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <ChefHat className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg sm:text-xl text-foreground">
                Informe de Dietas Especiales
              </h3>
              <p className="text-xs text-muted-foreground">
                {specialDietGuests.length} {specialDietGuests.length === 1 ? 'comensal con dieta especial' : 'comensales con dietas especiales'} en {tablesWithSpecialDietsCount} mesas
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-5 flex-1 overflow-y-auto">
          
          {/* Summary Box by Diet Type */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Utensils className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>Resumen de Menús Requeridos:</span>
            </h4>

            {Object.keys(dietCounts).length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {Object.entries(dietCounts).map(([diet, count]) => (
                  <div 
                    key={diet} 
                    className="flex items-center justify-between p-2.5 rounded-xl border border-border bg-card text-xs shadow-xs"
                  >
                    <span className="font-bold text-foreground truncate pr-2">{diet}</span>
                    <span className="px-2.5 py-0.5 rounded-md bg-rose-500/10 text-rose-700 dark:text-rose-300 font-mono font-black text-xs border border-rose-500/20 shrink-0">
                      {count} {count === 1 ? 'menú' : 'menús'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic p-3 bg-muted/20 rounded-xl border border-border">
                No hay invitados con requerimientos dietéticos especiales registrados.
              </p>
            )}
          </div>

          {/* Table: Special Diet Guests Only */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Listado de Comensales con Dieta Especial:</span>
              <span className="text-[11px] font-bold text-primary">
                {specialDietGuests.length} comensales
              </span>
            </h4>

            {specialDietGuests.length > 0 ? (
              <div className="rounded-2xl border border-border overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-muted/70 border-b border-border font-bold uppercase tracking-wider text-[10px] text-muted-foreground">
                      <th className="p-3 border-r border-border/60 w-28">Mesa</th>
                      <th className="p-3 border-r border-border/60">Comensal</th>
                      <th className="p-3 border-r border-border/60">Dieta / Alérgeno</th>
                      <th className="p-3">Observaciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-card">
                    {specialDietGuests.map((g, idx) => (
                      <tr 
                        key={idx} 
                        className={idx % 2 === 0 ? 'bg-card' : 'bg-muted/15'}
                      >
                        <td className="p-3 font-black text-primary border-r border-border/60 font-mono text-sm whitespace-nowrap">
                          Mesa {g.tableNumber}
                          {g.tableName && (
                            <span className="block text-[10px] font-normal text-muted-foreground truncate max-w-[110px]">
                              {g.tableName}
                            </span>
                          )}
                        </td>

                        <td className="p-3 font-bold text-foreground border-r border-border/60">
                          {g.guestName}
                          {g.isCompanion && (
                            <span className="text-[10px] text-muted-foreground font-normal block">
                              (Acompañante de {g.parentGuestName})
                            </span>
                          )}
                        </td>

                        <td className="p-3 border-r border-border/60">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20 font-black text-xs">
                            {renderDietIcon(g.dietary)}
                            <span>{g.dietary}</span>
                          </div>
                        </td>

                        <td className="p-3 text-muted-foreground italic">
                          {g.notes ? (
                            <span className="font-medium text-foreground text-xs">{g.notes}</span>
                          ) : (
                            <span className="text-muted-foreground/60 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center p-8 bg-muted/20 rounded-2xl border border-dashed border-border text-xs text-muted-foreground">
                No hay invitados con requerimientos dietéticos especiales registrados.
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-border bg-muted/20 flex justify-end shrink-0">
          <Button onClick={onClose} variant="outline" className="rounded-xl font-bold">
            Cerrar
          </Button>
        </div>

      </div>
    </div>
  )
}
