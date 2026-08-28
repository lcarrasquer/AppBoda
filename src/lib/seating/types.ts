export interface SeatingAssignment {
  id: string
  event_id: string
  table_id: string
  guest_name: string
  companion_names?: string | null
  seats_count?: number
  dietary_requirements?: string | null
  notes?: string | null
  created_at?: string
}

export interface SeatingTable {
  id: string
  event_id: string
  table_number: string
  table_name?: string | null
  capacity: number
  shape?: 'round' | 'rectangle'
  pos_x?: number | null
  pos_y?: number | null
  rotation?: number
  notes?: string | null
  position_order?: number
  created_at?: string
  assignments?: SeatingAssignment[]
}

export interface SeatingStats {
  totalTables: number
  totalGuests: number
  totalCapacity: number
  specialDietsCount: number
}

export interface ExpandedSeatedPerson {
  uniqueId: string
  assignmentId: string
  tableId: string
  name: string
  isCompanion: boolean
  parentGuestName?: string
  dietary?: string | null
  rawAssignment: SeatingAssignment
}

export function getAssignmentSeatCount(assignment: SeatingAssignment): number {
  if (assignment.seats_count && assignment.seats_count > 0) {
    return Number(assignment.seats_count)
  }
  if (assignment.companion_names) {
    const text = assignment.companion_names.toLowerCase()
    const plusMatch = text.match(/\+\s*(\d+)/)
    if (plusMatch) {
      return 1 + parseInt(plusMatch[1], 10)
    }
    const splitCount = text.split(/,|\by\b|\be\b|\band\b/).map(s => s.trim()).filter(Boolean).length
    if (splitCount > 1) {
      return 1 + splitCount
    }
    if (text.trim().length > 0) {
      return 2
    }
  }
  return 1
}

export function getExpandedTableGuests(table: SeatingTable): ExpandedSeatedPerson[] {
  const result: ExpandedSeatedPerson[] = []

  for (const assignment of table.assignments || []) {
    // 1. Add Main Guest
    result.push({
      uniqueId: `${assignment.id}_main`,
      assignmentId: assignment.id,
      tableId: table.id,
      name: assignment.guest_name,
      isCompanion: false,
      dietary: assignment.dietary_requirements,
      rawAssignment: assignment
    })

    // 2. Extract companions as separate individuals
    const compText = assignment.companion_names?.trim() || ''
    const seatCount = getAssignmentSeatCount(assignment)

    if (compText) {
      // Clean text e.g. "+ 1 (Laura Sanz)" -> "Laura Sanz" or "+ 2 niños"
      let cleanNames = compText.replace(/^\+\s*\d+\s*/, '').replace(/^\(|\)$/g, '').trim()
      const namesList = cleanNames.split(/,|\by\b|\be\b|\band\b/).map(s => s.trim()).filter(Boolean)

      if (namesList.length > 0) {
        for (let i = 0; i < namesList.length; i++) {
          const compName = namesList[i]
          result.push({
            uniqueId: `${assignment.id}_comp_${i}`,
            assignmentId: assignment.id,
            tableId: table.id,
            name: compName,
            isCompanion: true,
            parentGuestName: assignment.guest_name,
            rawAssignment: assignment
          })
        }
      } else {
        const extraCount = Math.max(1, seatCount - 1)
        for (let i = 0; i < extraCount; i++) {
          result.push({
            uniqueId: `${assignment.id}_comp_${i}`,
            assignmentId: assignment.id,
            tableId: table.id,
            name: extraCount === 1 ? `Acompañante de ${assignment.guest_name}` : `Acompañante ${i + 1} de ${assignment.guest_name}`,
            isCompanion: true,
            parentGuestName: assignment.guest_name,
            rawAssignment: assignment
          })
        }
      }
    } else if (seatCount > 1) {
      for (let i = 0; i < seatCount - 1; i++) {
        result.push({
          uniqueId: `${assignment.id}_comp_${i}`,
          assignmentId: assignment.id,
          tableId: table.id,
          name: seatCount === 2 ? `Acompañante de ${assignment.guest_name}` : `Acompañante ${i + 1} de ${assignment.guest_name}`,
          isCompanion: true,
          parentGuestName: assignment.guest_name,
          rawAssignment: assignment
        })
      }
    }
  }

  return result
}

export function getTablePeopleCount(table: SeatingTable): number {
  return getExpandedTableGuests(table).length
}

export type LandmarkType = 'dancefloor' | 'stage' | 'bar' | 'entrance' | 'dj' | 'photocall' | 'buffet' | 'chillout' | 'custom'

export interface FloorplanLandmark {
  id: string
  event_id?: string
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

export const DEFAULT_LANDMARKS: FloorplanLandmark[] = [
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

