'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { SeatingTable, SeatingAssignment } from '@/lib/seating/types'
import fs from 'fs/promises'
import path from 'path'

// Helper for resilient fallback file-based storage if tables aren't yet in Supabase schema cache
const DATA_DIR = path.join(process.cwd(), '.data', 'seating')

async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true })
  } catch (err) {
    // ignore if exists
  }
}

async function getLocalSeating(eventId: string): Promise<{ tables: SeatingTable[]; assignments: SeatingAssignment[] }> {
  try {
    await ensureDataDir()
    const filePath = path.join(DATA_DIR, `${eventId}.json`)
    const raw = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(raw)
  } catch (err) {
    return { tables: [], assignments: [] }
  }
}

async function saveLocalSeating(eventId: string, data: { tables: SeatingTable[]; assignments: SeatingAssignment[] }) {
  await ensureDataDir()
  const filePath = path.join(DATA_DIR, `${eventId}.json`)
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

// 1. Get all tables and their seated guests
export async function getSeatingPlan(eventId: string): Promise<{
  tables: SeatingTable[]
  error?: string
}> {
  try {
    const supabase = await createClient()

    // Try Supabase first
    const { data: tablesData, error: tablesError } = await supabase
      .from('seating_tables')
      .select('*')
      .eq('event_id', eventId)
      .order('position_order', { ascending: true })

    if (tablesError) {
      // Fallback to local storage
      const local = await getLocalSeating(eventId)
      const tablesWithAssignments = local.tables.map(t => ({
        ...t,
        assignments: local.assignments.filter(a => a.table_id === t.id)
      }))
      return { tables: tablesWithAssignments }
    }

    const { data: assignmentsData } = await supabase
      .from('seating_assignments')
      .select('*')
      .eq('event_id', eventId)

    const assignments = assignmentsData || []
    const tables: SeatingTable[] = (tablesData || []).map(t => ({
      ...t,
      assignments: assignments.filter(a => a.table_id === t.id)
    }))

    return { tables }
  } catch (err: any) {
    console.error('Error fetching seating plan:', err)
    const local = await getLocalSeating(eventId)
    const tablesWithAssignments = local.tables.map(t => ({
      ...t,
      assignments: local.assignments.filter(a => a.table_id === t.id)
    }))
    return { tables: tablesWithAssignments }
  }
}

// 2. Create or Update a Table
export async function createOrUpdateTable(
  eventId: string,
  table: {
    id?: string
    table_number: string
    table_name?: string
    capacity?: number
    shape?: 'round' | 'rectangle'
    pos_x?: number
    pos_y?: number
    rotation?: number
    notes?: string
  }
) {
  try {
    const supabase = await createClient()

    const payload = {
      event_id: eventId,
      table_number: table.table_number.trim(),
      table_name: table.table_name?.trim() || null,
      capacity: Number(table.capacity) || 10,
      shape: table.shape || 'round',
      pos_x: table.pos_x !== undefined ? Number(table.pos_x) : null,
      pos_y: table.pos_y !== undefined ? Number(table.pos_y) : null,
      rotation: table.rotation !== undefined ? Number(table.rotation) : 0,
      notes: table.notes?.trim() || null,
    }

    if (table.id) {
      const { error } = await supabase
        .from('seating_tables')
        .update(payload)
        .eq('id', table.id)
        .eq('event_id', eventId)

      if (error) {
        // Fallback local update
        const local = await getLocalSeating(eventId)
        local.tables = local.tables.map(t => t.id === table.id ? { ...t, ...payload } : t)
        await saveLocalSeating(eventId, local)
      }
    } else {
      const { error } = await supabase
        .from('seating_tables')
        .insert({
          ...payload,
          position_order: Date.now()
        })

      if (error) {
        // Fallback local insert
        const local = await getLocalSeating(eventId)
        const newTable: SeatingTable = {
          id: `tbl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          ...payload,
          position_order: local.tables.length + 1,
          created_at: new Date().toISOString(),
          assignments: []
        }
        local.tables.push(newTable)
        await saveLocalSeating(eventId, local)
      }
    }

    revalidatePath(`/dashboard/${eventId}/seating`)
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Error al guardar la mesa' }
  }
}

// 2.1 Update multiple table positions in bulk from 2D canvas
export async function updateTablePositions(
  eventId: string,
  positions: { id: string; pos_x: number; pos_y: number; shape?: 'round' | 'rectangle'; rotation?: number }[]
) {
  try {
    const supabase = await createClient()

    // Try Supabase updates
    for (const p of positions) {
      await supabase
        .from('seating_tables')
        .update({
          pos_x: p.pos_x,
          pos_y: p.pos_y,
          ...(p.shape ? { shape: p.shape } : {}),
          ...(p.rotation !== undefined ? { rotation: p.rotation } : {})
        })
        .eq('id', p.id)
        .eq('event_id', eventId)
    }

    // Always keep local storage in sync as fallback
    const local = await getLocalSeating(eventId)
    local.tables = local.tables.map(t => {
      const found = positions.find(p => p.id === t.id)
      if (found) {
        return {
          ...t,
          pos_x: found.pos_x,
          pos_y: found.pos_y,
          shape: found.shape || t.shape || 'round',
          rotation: found.rotation !== undefined ? found.rotation : (t.rotation || 0)
        }
      }
      return t
    })
    await saveLocalSeating(eventId, local)

    revalidatePath(`/dashboard/${eventId}/seating`)
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Error al guardar posiciones del plano' }
  }
}

// 3. Delete a Table
export async function deleteTable(eventId: string, tableId: string) {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('seating_tables')
      .delete()
      .eq('id', tableId)
      .eq('event_id', eventId)

    if (error) {
      const local = await getLocalSeating(eventId)
      local.tables = local.tables.filter(t => t.id !== tableId)
      local.assignments = local.assignments.filter(a => a.table_id !== tableId)
      await saveLocalSeating(eventId, local)
    }

    revalidatePath(`/dashboard/${eventId}/seating`)
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Error al eliminar la mesa' }
  }
}

// 4. Add or Update a Seated Guest
export async function addOrUpdateGuest(
  eventId: string,
  guest: {
    id?: string
    table_id: string
    guest_name: string
    companion_names?: string
    seats_count?: number
    dietary_requirements?: string
    notes?: string
  }
) {
  try {
    const supabase = await createClient()

    const payload = {
      event_id: eventId,
      table_id: guest.table_id,
      guest_name: guest.guest_name.trim(),
      companion_names: guest.companion_names?.trim() || null,
      seats_count: Number(guest.seats_count) || 1,
      dietary_requirements: guest.dietary_requirements?.trim() || null,
      notes: guest.notes?.trim() || null
    }

    if (guest.id) {
      const { error } = await supabase
        .from('seating_assignments')
        .update(payload)
        .eq('id', guest.id)
        .eq('event_id', eventId)

      if (error) {
        const local = await getLocalSeating(eventId)
        local.assignments = local.assignments.map(a => a.id === guest.id ? { ...a, ...payload } : a)
        await saveLocalSeating(eventId, local)
      }
    } else {
      const { error } = await supabase
        .from('seating_assignments')
        .insert(payload)

      if (error) {
        const local = await getLocalSeating(eventId)
        const newAssignment: SeatingAssignment = {
          id: `asg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          ...payload,
          created_at: new Date().toISOString()
        }
        local.assignments.push(newAssignment)
        await saveLocalSeating(eventId, local)
      }
    }

    revalidatePath(`/dashboard/${eventId}/seating`)
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Error al asignar el invitado' }
  }
}

// 5. Delete a Seated Guest
export async function deleteGuest(eventId: string, assignmentId: string) {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('seating_assignments')
      .delete()
      .eq('id', assignmentId)
      .eq('event_id', eventId)

    if (error) {
      const local = await getLocalSeating(eventId)
      local.assignments = local.assignments.filter(a => a.id !== assignmentId)
      await saveLocalSeating(eventId, local)
    }

    revalidatePath(`/dashboard/${eventId}/seating`)
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Error al eliminar el comensal' }
  }
}

// 6. Bulk Import Seating List (e.g. from plain text / Excel copy-paste)
export async function bulkImportSeating(eventId: string, rawText: string) {
  try {
    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean)
    if (lines.length === 0) return { error: 'El texto está vacío' }

    const local = await getLocalSeating(eventId)

    // Format parse examples:
    // "Mesa 1 - Los Aventureros: Carlos Gomez (Vegano), Laura Perez, Miguel Angel"
    // or "Mesa 2: Juan, Marta, Sofia"
    // or "1: Juan, Pedro"
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const colonIndex = line.indexOf(':')
      if (colonIndex === -1) continue

      const tablePart = line.substring(0, colonIndex).trim()
      const guestsPart = line.substring(colonIndex + 1).trim()

      // Extract table number and name
      let tableNumber = `${i + 1}`
      let tableName = ''

      const cleanTable = tablePart.replace(/^(mesa|table)\s*/i, '').trim()
      if (cleanTable.includes('-')) {
        const parts = cleanTable.split('-')
        tableNumber = parts[0].trim()
        tableName = parts.slice(1).join('-').trim()
      } else {
        tableNumber = cleanTable
      }

      // Check if table already exists or create new
      let tableObj = local.tables.find(t => t.table_number.toLowerCase() === tableNumber.toLowerCase())
      if (!tableObj) {
        tableObj = {
          id: `tbl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          event_id: eventId,
          table_number: tableNumber,
          table_name: tableName || undefined,
          capacity: 10,
          position_order: local.tables.length + 1,
          created_at: new Date().toISOString()
        }
        local.tables.push(tableObj)
      } else if (tableName && !tableObj.table_name) {
        tableObj.table_name = tableName
      }

      // Parse guests
      const guests = guestsPart.split(',').map(g => g.trim()).filter(Boolean)
      for (const guestItem of guests) {
        let guestName = guestItem
        let dietary = ''
        
        // Extract parenthesized note or diet (e.g. "Carlos (Vegano)")
        const match = guestItem.match(/^(.*?)\((.*?)\)$/)
        if (match) {
          guestName = match[1].trim()
          dietary = match[2].trim()
        }

        if (guestName) {
          local.assignments.push({
            id: `asg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            event_id: eventId,
            table_id: tableObj.id,
            guest_name: guestName,
            dietary_requirements: dietary || undefined,
            created_at: new Date().toISOString()
          })
        }
      }
    }

    await saveLocalSeating(eventId, local)
    revalidatePath(`/dashboard/${eventId}/seating`)
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Error en la importación masiva' }
  }
}
