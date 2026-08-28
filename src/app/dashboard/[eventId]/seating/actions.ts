'use server'

import { revalidatePath } from 'next/cache'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { SeatingTable, SeatingAssignment, FloorplanLandmark, UnassignedGuest, SeatingAffinityRule } from '@/lib/seating/types'

function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// 1. Get all tables, their seated guests, room landmarks, and unassigned guests
export async function getSeatingPlan(eventId: string): Promise<{
  tables: SeatingTable[]
  landmarks?: FloorplanLandmark[]
  unassignedGuests?: UnassignedGuest[]
  affinityRules?: SeatingAffinityRule[]
  error?: string
}> {
  try {
    const supabase = getAdminClient()

    const [tablesRes, assignmentsRes, landmarksRes, guestsRes] = await Promise.all([
      supabase
        .from('seating_tables')
        .select('*')
        .eq('event_id', eventId)
        .order('position_order', { ascending: true }),
      supabase
        .from('seating_assignments')
        .select('*')
        .eq('event_id', eventId),
      (async () => {
        try {
          return await supabase
            .from('seating_landmarks')
            .select('*')
            .eq('event_id', eventId)
            .order('created_at', { ascending: true })
        } catch {
          return { data: null, error: null }
        }
      })(),
      (async () => {
        try {
          return await supabase
            .from('guests')
            .select('*')
            .eq('event_id', eventId)
            .order('created_at', { ascending: true })
        } catch {
          return { data: null, error: null }
        }
      })()
    ])

    if (tablesRes.error) {
      console.error('Error fetching tables from Supabase:', tablesRes.error)
      return { tables: [], error: tablesRes.error.message }
    }

    if (assignmentsRes.error) {
      console.error('Error fetching assignments from Supabase:', assignmentsRes.error)
    }

    const assignments = (assignmentsRes.data || []) as SeatingAssignment[]
    const rawTables = (tablesRes.data || []) as any[]

    // Extract landmarks from database (either seating_landmarks table or seating_tables metadata row)
    let landmarks: FloorplanLandmark[] = (landmarksRes?.data as FloorplanLandmark[]) || []
    const landmarkMetaRow = rawTables.find(t => t.table_number === '__floorplan_landmarks__')
    if (landmarkMetaRow?.notes) {
      try {
        const parsed = JSON.parse(landmarkMetaRow.notes)
        if (Array.isArray(parsed) && parsed.length > 0) {
          landmarks = parsed
        }
      } catch (e) {
        console.error('Error parsing stored landmarks:', e)
      }
    }

    // Extract affinity rules from database
    let affinityRules: SeatingAffinityRule[] = []
    const affinityMetaRow = rawTables.find(t => t.table_number === '__affinity_rules__')
    if (affinityMetaRow?.notes) {
      try {
        const parsed = JSON.parse(affinityMetaRow.notes)
        if (Array.isArray(parsed)) {
          affinityRules = parsed
        }
      } catch (e) {
        console.error('Error parsing stored affinity rules:', e)
      }
    }

    const tables: SeatingTable[] = rawTables
      .filter((t: any) => !t.table_number?.startsWith('__'))
      .map((t: any) => ({
        ...t,
        assignments: assignments.filter((a: any) => a.table_id === t.id)
      }))

    // Calculate unassigned guests from registered guests
    const assignedNamesSet = new Set<string>()
    for (const a of assignments) {
      if (a.guest_name) assignedNamesSet.add(a.guest_name.toLowerCase().trim())
      if (a.companion_names) {
        a.companion_names.split(',').forEach(c => assignedNamesSet.add(c.toLowerCase().trim()))
      }
    }

    const registeredGuests = (guestsRes.data || []) as any[]
    const unassignedGuests: UnassignedGuest[] = registeredGuests
      .filter(g => g.full_name && !assignedNamesSet.has(g.full_name.toLowerCase().trim()))
      .map(g => ({
        id: g.id,
        name: g.full_name,
        companionCount: 0,
        dietary: null
      }))

    return { tables, landmarks, unassignedGuests, affinityRules }
  } catch (err: any) {
    console.error('Error in getSeatingPlan:', err)
    return { tables: [], error: err.message || 'Error al obtener las mesas' }
  }
}

// 1.2 Save affinity rules in database
export async function saveAffinityRules(
  eventId: string,
  rules: SeatingAffinityRule[]
): Promise<{ success?: boolean; error?: string }> {
  try {
    const supabase = getAdminClient()

    const { data: existing } = await supabase
      .from('seating_tables')
      .select('id')
      .eq('event_id', eventId)
      .eq('table_number', '__affinity_rules__')
      .limit(1)

    if (existing && existing.length > 0) {
      await supabase
        .from('seating_tables')
        .update({ notes: JSON.stringify(rules) })
        .eq('id', existing[0].id)
    } else {
      await supabase
        .from('seating_tables')
        .insert({
          event_id: eventId,
          table_number: '__affinity_rules__',
          table_name: '__affinity_rules__',
          notes: JSON.stringify(rules),
          capacity: 0,
          position_order: 998
        })
    }

    revalidatePath(`/dashboard/${eventId}/seating`)
    return { success: true }
  } catch (err: any) {
    console.error('Error saving affinity rules to DB:', err)
    return { error: err.message }
  }
}

// 1.1 Save room landmarks in database (persisted directly to Supabase cloud)
export async function saveFloorplanLandmarks(
  eventId: string,
  landmarks: FloorplanLandmark[]
): Promise<{ success?: boolean; error?: string }> {
  try {
    const supabase = getAdminClient()

    // 1. Try to upsert into dedicated seating_landmarks table if present
    try {
      await supabase
        .from('seating_landmarks')
        .delete()
        .eq('event_id', eventId)

      if (landmarks.length > 0) {
        const records = landmarks.map(lm => ({
          id: lm.id,
          event_id: eventId,
          type: lm.type,
          name: lm.name,
          subtitle: lm.subtitle || null,
          x: Math.round(lm.x),
          y: Math.round(lm.y),
          width: Math.round(lm.width),
          height: Math.round(lm.height),
          rotation: lm.rotation || 0,
          visible: lm.visible ?? true
        }))

        await supabase.from('seating_landmarks').insert(records)
      }
    } catch {
      // ignore
    }

    // 2. Persist in cloud seating_tables metadata row for guaranteed cross-device sync
    const { data: existing } = await supabase
      .from('seating_tables')
      .select('id')
      .eq('event_id', eventId)
      .eq('table_number', '__floorplan_landmarks__')
      .limit(1)

    if (existing && existing.length > 0) {
      await supabase
        .from('seating_tables')
        .update({ notes: JSON.stringify(landmarks) })
        .eq('id', existing[0].id)
    } else {
      await supabase
        .from('seating_tables')
        .insert({
          event_id: eventId,
          table_number: '__floorplan_landmarks__',
          table_name: '__floorplan_landmarks__',
          notes: JSON.stringify(landmarks),
          capacity: 0,
          position_order: 999
        })
    }

    revalidatePath(`/dashboard/${eventId}/seating`)
    return { success: true }
  } catch (err: any) {
    console.warn('Error saving landmarks to DB:', err)
    return { error: err.message }
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

// 2.1 Update multiple table positions in bulk in parallel from 2D canvas
export async function updateTablePositions(
  eventId: string,
  positions: { id: string; pos_x: number; pos_y: number; shape?: 'round' | 'rectangle'; rotation?: number }[]
) {
  try {
    const supabase = getAdminClient()

    // Parallelize updates with Promise.all for high performance
    await Promise.all(
      positions.map(p =>
        supabase
          .from('seating_tables')
          .update({
            pos_x: p.pos_x,
            pos_y: p.pos_y,
            ...(p.shape ? { shape: p.shape } : {}),
            ...(p.rotation !== undefined ? { rotation: p.rotation } : {})
          })
          .eq('id', p.id)
          .eq('event_id', eventId)
      )
    )

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
