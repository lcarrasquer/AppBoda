'use server'

import { revalidatePath } from 'next/cache'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { SeatingTable, SeatingAssignment } from '@/lib/seating/types'

function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// 1. Get all tables and their seated guests
export async function getSeatingPlan(eventId: string): Promise<{
  tables: SeatingTable[]
  error?: string
}> {
  try {
    const supabase = getAdminClient()

    const { data: tablesData, error: tablesError } = await supabase
      .from('seating_tables')
      .select('*')
      .eq('event_id', eventId)
      .order('position_order', { ascending: true })

    if (tablesError) {
      console.error('Error fetching tables from Supabase:', tablesError)
      return { tables: [], error: tablesError.message }
    }

    const { data: assignmentsData, error: assignmentsError } = await supabase
      .from('seating_assignments')
      .select('*')
      .eq('event_id', eventId)

    if (assignmentsError) {
      console.error('Error fetching assignments from Supabase:', assignmentsError)
    }

    const assignments = assignmentsData || []
    const tables: SeatingTable[] = (tablesData || []).map(t => ({
      ...t,
      assignments: assignments.filter(a => a.table_id === t.id)
    }))

    return { tables }
  } catch (err: any) {
    console.error('Error in getSeatingPlan:', err)
    return { tables: [], error: err.message || 'Error al obtener las mesas' }
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
    const supabase = getAdminClient()

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

      if (error) throw error
    } else {
      const { error } = await supabase
        .from('seating_tables')
        .insert({
          ...payload,
          position_order: Date.now()
        })

      if (error) throw error
    }

    revalidatePath(`/dashboard/${eventId}/seating`)
    return { success: true }
  } catch (err: any) {
    console.error('Error in createOrUpdateTable:', err)
    return { error: err.message || 'Error al guardar la mesa' }
  }
}

// 2.1 Update multiple table positions in bulk from 2D canvas
export async function updateTablePositions(
  eventId: string,
  positions: { id: string; pos_x: number; pos_y: number; shape?: 'round' | 'rectangle'; rotation?: number }[]
) {
  try {
    const supabase = getAdminClient()

    for (const p of positions) {
      const { error } = await supabase
        .from('seating_tables')
        .update({
          pos_x: p.pos_x,
          pos_y: p.pos_y,
          ...(p.shape ? { shape: p.shape } : {}),
          ...(p.rotation !== undefined ? { rotation: p.rotation } : {})
        })
        .eq('id', p.id)
        .eq('event_id', eventId)

      if (error) {
        console.error('Error updating position for table:', p.id, error)
      }
    }

    revalidatePath(`/dashboard/${eventId}/seating`)
    return { success: true }
  } catch (err: any) {
    console.error('Error in updateTablePositions:', err)
    return { error: err.message || 'Error al guardar posiciones del plano' }
  }
}

// 3. Delete a Table
export async function deleteTable(eventId: string, tableId: string) {
  try {
    const supabase = getAdminClient()

    // Delete assignments first to avoid FK constraint issues
    await supabase
      .from('seating_assignments')
      .delete()
      .eq('table_id', tableId)
      .eq('event_id', eventId)

    const { error } = await supabase
      .from('seating_tables')
      .delete()
      .eq('id', tableId)
      .eq('event_id', eventId)

    if (error) throw error

    revalidatePath(`/dashboard/${eventId}/seating`)
    return { success: true }
  } catch (err: any) {
    console.error('Error in deleteTable:', err)
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
    const supabase = getAdminClient()

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

      if (error) throw error
    } else {
      const { error } = await supabase
        .from('seating_assignments')
        .insert(payload)

      if (error) throw error
    }

    revalidatePath(`/dashboard/${eventId}/seating`)
    return { success: true }
  } catch (err: any) {
    console.error('Error in addOrUpdateGuest:', err)
    return { error: err.message || 'Error al asignar el invitado' }
  }
}

// 5. Delete a Seated Guest
export async function deleteGuest(eventId: string, assignmentId: string) {
  try {
    const supabase = getAdminClient()

    const { error } = await supabase
      .from('seating_assignments')
      .delete()
      .eq('id', assignmentId)
      .eq('event_id', eventId)

    if (error) throw error

    revalidatePath(`/dashboard/${eventId}/seating`)
    return { success: true }
  } catch (err: any) {
    console.error('Error in deleteGuest:', err)
    return { error: err.message || 'Error al eliminar el comensal' }
  }
}

// 6. Bulk Import Seating List (Directly into Supabase Database)
export async function bulkImportSeating(eventId: string, rawText: string) {
  try {
    const supabase = getAdminClient()
    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean)
    if (lines.length === 0) return { error: 'El texto está vacío' }

    // Fetch existing tables from Supabase
    const { data: existingTables } = await supabase
      .from('seating_tables')
      .select('*')
      .eq('event_id', eventId)

    const tablesMap = new Map<string, string>()
    ;(existingTables || []).forEach(t => {
      tablesMap.set(t.table_number.toLowerCase(), t.id)
    })

    const newAssignments: any[] = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const colonIndex = line.indexOf(':')
      if (colonIndex === -1) continue

      const tablePart = line.substring(0, colonIndex).trim()
      const guestsPart = line.substring(colonIndex + 1).trim()

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

      let tableId = tablesMap.get(tableNumber.toLowerCase())
      if (!tableId) {
        // Create table in Supabase
        const { data: insertedTable, error: tErr } = await supabase
          .from('seating_tables')
          .insert({
            event_id: eventId,
            table_number: tableNumber,
            table_name: tableName || undefined,
            capacity: 10,
            shape: 'round',
            position_order: Date.now() + i
          })
          .select('id')
          .single()

        if (tErr || !insertedTable) {
          console.error('Error inserting table during bulk import:', tErr)
          continue
        }

        tableId = insertedTable.id
        if (tableId) {
          tablesMap.set(tableNumber.toLowerCase(), tableId)
        }
      }

      // Parse individual guests
      const guests = guestsPart.split(',').map(g => g.trim()).filter(Boolean)
      for (const guestItem of guests) {
        let guestName = guestItem
        let dietary = ''

        const match = guestItem.match(/^(.*?)\((.*?)\)$/)
        if (match) {
          guestName = match[1].trim()
          dietary = match[2].trim()
        }

        if (guestName && tableId) {
          newAssignments.push({
            event_id: eventId,
            table_id: tableId,
            guest_name: guestName,
            seats_count: 1,
            dietary_requirements: dietary || null
          })
        }
      }
    }

    if (newAssignments.length > 0) {
      const { error: aErr } = await supabase
        .from('seating_assignments')
        .insert(newAssignments)

      if (aErr) throw aErr
    }

    revalidatePath(`/dashboard/${eventId}/seating`)
    return { success: true }
  } catch (err: any) {
    console.error('Error in bulkImportSeating:', err)
    return { error: err.message || 'Error en la importación masiva' }
  }
}
