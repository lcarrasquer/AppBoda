const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
})

async function runSeed() {
  console.log('🌱 Iniciando carga completa de datos demo en Supabase...\n')

  // 1. Obtener o crear un evento activo
  let { data: events, error: eventErr } = await supabase
    .from('events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)

  if (eventErr) {
    console.error('❌ Error al consultar eventos:', eventErr)
    return
  }

  let event = events && events[0] ? events[0] : null
  const todayStr = new Date().toISOString().split('T')[0]

  if (!event) {
    console.log('✨ Creando evento demo principal...')
    const { data: users } = await supabase.auth.admin.listUsers()
    const ownerId = users && users.users.length > 0 ? users.users[0].id : '00000000-0000-0000-0000-000000000000'

    const { data: newEvent, error: createErr } = await supabase
      .from('events')
      .insert({
        owner_id: ownerId,
        slug: 'boda-lucia-carlos',
        bride_name: 'Lucía',
        groom_name: 'Carlos',
        event_date: todayStr,
        location: 'Finca El Olivar, Madrid',
        wifi_ssid: 'FincaElOlivar_Invitados',
        wifi_password: 'VivaElAmor2026',
        primary_color: '#D4AF37',
        pin_code: '1234',
        pin_enabled: false,
        plan: 'premium',
        status: 'active'
      })
      .select()
      .single()

    if (createErr) {
      console.error('❌ Error al crear evento demo:', createErr)
      return
    }
    event = newEvent
  } else {
    // Actualizar datos del evento existente para asegurar campos completos
    await supabase.from('events').update({
      event_date: todayStr,
      location: 'Finca El Olivar, Madrid',
      wifi_ssid: 'FincaElOlivar_Invitados',
      wifi_password: 'VivaElAmor2026',
      primary_color: '#D4AF37',
      status: 'active'
    }).eq('id', event.id)
  }

  console.log(`✅ Evento activo: "${event.bride_name} & ${event.groom_name}" (Slug: ${event.slug}, ID: ${event.id})`)

  // 2. Módulos
  await supabase.from('event_modules').upsert([
    { event_id: event.id, module_key: 'photos', is_enabled: true },
    { event_id: event.id, module_key: 'kahoot', is_enabled: true }
  ], { onConflict: 'event_id,module_key' })
  console.log('✅ Módulos activos (Fotos y Kahoot Trivia).')

  // 3. Cronograma del Día (Schedule)
  await supabase.from('event_schedule').delete().eq('event_id', event.id)
  await supabase.from('event_schedule').insert([
    { event_id: event.id, title: 'Llegada de invitados', description: 'Recepción y copa de bienvenida en el jardín', icon: '🥂', scheduled_time: '12:00:00', sort_order: 1 },
    { event_id: event.id, title: 'Ceremonia Civil', description: 'Lecturas, intercambio de anillos y votos nupciales', icon: '💍', scheduled_time: '12:30:00', sort_order: 2 },
    { event_id: event.id, title: 'Cóctel & Photocall', description: 'Degustación de aperitivos y música en vivo', icon: '🍸', scheduled_time: '13:45:00', sort_order: 3 },
    { event_id: event.id, title: 'Banquete Nupcial', description: 'Entrada al salón principal y almuerzo', icon: '🍽️', scheduled_time: '15:00:00', sort_order: 4 },
    { event_id: event.id, title: 'Corte de la Tarta & Brindis', description: 'Momento dulce y agradecimiento de los novios', icon: '🎂', scheduled_time: '17:30:00', sort_order: 5 },
    { event_id: event.id, title: 'Apertura del Baile & Barra Libre', description: 'Primer baile de los novios y fiesta con DJ', icon: '💃', scheduled_time: '18:00:00', sort_order: 6 },
    { event_id: event.id, title: 'Recena & Sorpresas', description: 'Pizzas artesanas, churros y fin de fiesta', icon: '🍕', scheduled_time: '21:30:00', sort_order: 7 }
  ])
  console.log('✅ Cronograma del día (7 hitos con horarios).')

  // 4. Seating Plan (Mesas e Invitados asignados)
  await supabase.from('seating_tables').delete().eq('event_id', event.id)
  const { data: tables } = await supabase.from('seating_tables').insert([
    { event_id: event.id, table_number: '1', table_name: 'Mesa Presidencial', capacity: 8, notes: 'Novios y padres', position_order: 1 },
    { event_id: event.id, table_number: '2', table_name: 'Amigos Universidad', capacity: 10, notes: 'Cerca de la pista de baile', position_order: 2 },
    { event_id: event.id, table_number: '3', table_name: 'Familia Novia', capacity: 10, notes: 'Zona tranquila', position_order: 3 },
    { event_id: event.id, table_number: '4', table_name: 'Familia Novio', capacity: 10, notes: 'Zona tranquila', position_order: 4 },
    { event_id: event.id, table_number: '5', table_name: 'Compañeros de Trabajo', capacity: 8, notes: 'Mesa central', position_order: 5 }
  ]).select()

  if (tables && tables.length > 0) {
    await supabase.from('seating_assignments').insert([
      { event_id: event.id, table_id: tables[0].id, guest_name: 'Lucía (Novia)', companion_names: 'Carlos (Novio)', dietary_requirements: 'Ninguna' },
      { event_id: event.id, table_id: tables[0].id, guest_name: 'Carmen Morales (Madre)', companion_names: 'Antonio Serrano (Padre)', dietary_requirements: 'Sin marisco' },
      { event_id: event.id, table_id: tables[1].id, guest_name: 'Mateo García', companion_names: 'Sofía Fernández', dietary_requirements: 'Vegetariano (Sofía)' },
      { event_id: event.id, table_id: tables[1].id, guest_name: 'Alejandro Martínez', companion_names: '', dietary_requirements: 'Celíaco (Sin gluten)' },
      { event_id: event.id, table_id: tables[1].id, guest_name: 'Elena López', companion_names: 'David Ruiz', dietary_requirements: 'Ninguna' },
      { event_id: event.id, table_id: tables[2].id, guest_name: 'Tía Rosa', companion_names: 'Tío Paco', dietary_requirements: 'Bajo en sal' },
      { event_id: event.id, table_id: tables[4].id, guest_name: 'Javier Navarro', companion_names: 'Marta Gil', dietary_requirements: 'Intolerancia a la lactosa' }
    ])
    console.log('✅ Seating Plan configurado (5 mesas con distribución de invitados y dietas).')
  }

  // 5. Etiquetas de Fotos
  await supabase.from('photo_tags').delete().eq('event_id', event.id)
  await supabase.from('photo_tags').insert([
    { event_id: event.id, name: 'Ceremonia', sort_order: 1 },
    { event_id: event.id, name: 'Cóctel', sort_order: 2 },
    { event_id: event.id, name: 'Banquete', sort_order: 3 },
    { event_id: event.id, name: 'Baile & Fiesta', sort_order: 4 },
    { event_id: event.id, name: 'Photocall', sort_order: 5 },
    { event_id: event.id, name: 'Brindis', sort_order: 6 }
  ])
  console.log('✅ 6 categorías/etiquetas de fotos.')

  // 6. Retos Fotográficos
  await supabase.from('challenges').delete().eq('event_id', event.id)
  await supabase.from('challenges').insert([
    { event_id: event.id, title: 'Selfie con alguien con pajarita 👔', description: 'Encuentra a un invitado elegante y posad juntos.', icon: '📸', sort_order: 1 },
    { event_id: event.id, title: 'El brindis más emotivo 🥂', description: 'Captura las copas arriba celebrando el amor.', icon: '🥂', sort_order: 2 },
    { event_id: event.id, title: 'El mejor paso de baile 🕺', description: 'Fotografía a quien más lo esté dando todo en la pista.', icon: '💃', sort_order: 3 },
    { event_id: event.id, title: 'Beso sorpresa de los novios 💋', description: 'Inmortaliza un momento romántico y espontáneo.', icon: '❤️', sort_order: 4 },
    { event_id: event.id, title: 'Foto de grupo divertida 🤪', description: 'Junta a al menos 4 personas haciendo una mueca graciosa.', icon: '🥳', sort_order: 5 }
  ])
  console.log('✅ 5 retos fotográficos interactivos.')

  // 7. Invitados Demo
  const guestList = [
    'Sofía Fernández',
    'Mateo García',
    'Alejandro Martínez',
    'Elena López',
    'David Ruiz',
    'Marta Gil',
    'Javier Navarro'
  ]
  const insertedGuests = []

  for (const name of guestList) {
    const { data: g } = await supabase
      .from('guests')
      .insert({ event_id: event.id, full_name: name })
      .select()
      .single()
    if (g) insertedGuests.push(g)
  }
  console.log(`✅ ${insertedGuests.length} invitados demo registrados.`)

  // 8. Dedicatorias en el Libro de Firmas (Guestbook)
  if (insertedGuests.length >= 5) {
    await supabase.from('guestbook_entries').delete().eq('event_id', event.id)
    await supabase.from('guestbook_entries').insert([
      {
        event_id: event.id,
        guest_id: insertedGuests[0].id,
        type: 'text',
        content: '¡Que seáis inmensamente felices! Ha sido una ceremonia preciosa y emocionante hasta las lágrimas. ¡Vivan los novios! ❤️✨',
        is_private: false
      },
      {
        event_id: event.id,
        guest_id: insertedGuests[1].id,
        type: 'text',
        content: '¡Enhorabuena pareja! Una organización de 10 y la comida insuperable. ¡A quemar la pista de baile esta noche! 🕺💃',
        is_private: false
      },
      {
        event_id: event.id,
        guest_id: insertedGuests[2].id,
        type: 'text',
        content: 'Lucía y Carlos, qué orgullo veros dar este paso. Os deseamos lo mejor en esta nueva etapa juntos.',
        is_private: false
      },
      {
        event_id: event.id,
        guest_id: insertedGuests[3].id,
        type: 'text',
        content: 'Mensaje secreto para los novios: os hemos dejado una sorpresa en el coche... 🤫 ¡Disfrutad muchísimo de la luna de miel!',
        is_private: true
      },
      {
        event_id: event.id,
        guest_id: insertedGuests[4].id,
        type: 'text',
        content: 'De parte de toda la mesa de los universitarios: ¡Gracias por este fiestón inolvidable! 🥂🎉',
        is_private: false
      }
    ])
    console.log('✅ 5 dedicatorias (públicas y privadas) en el Libro de Firmas.')
  }

  // 9. Trivia Kahoot + Preguntas + Intentos + Ranking
  await supabase.from('kahoot_quizzes').delete().eq('event_id', event.id)
  const { data: quiz } = await supabase
    .from('kahoot_quizzes')
    .insert({
      event_id: event.id,
      title: `¿Cuánto conoces a ${event.bride_name} & ${event.groom_name}?`,
      prize_description: 'Una botella de Champán Gran Reserva y un baile exclusivo con los novios 🍾',
      is_active: true
    })
    .select()
    .single()

  if (quiz) {
    // Q1
    const { data: q1 } = await supabase.from('kahoot_questions').insert({
      quiz_id: quiz.id,
      question_text: `¿Dónde se conocieron ${event.bride_name} y ${event.groom_name}?`,
      points: 10,
      sort_order: 1
    }).select().single()

    if (q1) {
      await supabase.from('kahoot_answers').insert([
        { question_id: q1.id, answer_text: 'En la universidad', is_correct: true, sort_order: 1 },
        { question_id: q1.id, answer_text: 'En un festival de música', is_correct: false, sort_order: 2 },
        { question_id: q1.id, answer_text: 'En un viaje a Roma', is_correct: false, sort_order: 3 },
        { question_id: q1.id, answer_text: 'En una cena de amigos', is_correct: false, sort_order: 4 }
      ])
    }

    // Q2
    const { data: q2 } = await supabase.from('kahoot_questions').insert({
      quiz_id: quiz.id,
      question_text: '¿Quién dijo "te quiero" primero?',
      points: 10,
      sort_order: 2
    }).select().single()

    if (q2) {
      await supabase.from('kahoot_answers').insert([
        { question_id: q2.id, answer_text: 'Carlos', is_correct: true, sort_order: 1 },
        { question_id: q2.id, answer_text: 'Lucía', is_correct: false, sort_order: 2 },
        { question_id: q2.id, answer_text: 'Lo dijeron a la vez', is_correct: false, sort_order: 3 }
      ])
    }

    // Q3
    const { data: q3 } = await supabase.from('kahoot_questions').insert({
      quiz_id: quiz.id,
      question_text: '¿Cuál es el destino de su luna de miel?',
      points: 10,
      sort_order: 3
    }).select().single()

    if (q3) {
      await supabase.from('kahoot_answers').insert([
        { question_id: q3.id, answer_text: 'Bali e Indonesia', is_correct: true, sort_order: 1 },
        { question_id: q3.id, answer_text: 'Japón', is_correct: false, sort_order: 2 },
        { question_id: q3.id, answer_text: 'Islas Maldivas', is_correct: false, sort_order: 3 },
        { question_id: q3.id, answer_text: 'Nueva York y Riviera Maya', is_correct: false, sort_order: 4 }
      ])
    }

    // Q4
    const { data: q4 } = await supabase.from('kahoot_questions').insert({
      quiz_id: quiz.id,
      question_text: '¿Quién tarda más en arreglarse antes de salir?',
      points: 10,
      sort_order: 4
    }).select().single()

    if (q4) {
      await supabase.from('kahoot_answers').insert([
        { question_id: q4.id, answer_text: 'Carlos (indiscutible)', is_correct: true, sort_order: 1 },
        { question_id: q4.id, answer_text: 'Lucía', is_correct: false, sort_order: 2 },
        { question_id: q4.id, answer_text: 'Tardan exactamente lo mismo', is_correct: false, sort_order: 3 }
      ])
    }

    // Ranking demo en Kahoot
    if (insertedGuests.length >= 3) {
      await supabase.from('kahoot_attempts').insert([
        { quiz_id: quiz.id, guest_id: insertedGuests[0].id, score: 40, completed_at: new Date(Date.now() - 3600000).toISOString() },
        { quiz_id: quiz.id, guest_id: insertedGuests[1].id, score: 30, completed_at: new Date(Date.now() - 2400000).toISOString() },
        { quiz_id: quiz.id, guest_id: insertedGuests[2].id, score: 20, completed_at: new Date(Date.now() - 1200000).toISOString() }
      ])
    }

    console.log('✅ Quiz Kahoot configurado con 4 preguntas y ranking de puntuaciones.')
  }

  console.log('\n======================================================')
  console.log('🎉 ¡Base de datos poblada con éxito con todos los datos!')
  console.log(`🌐 Acceso invitado: /e/${event.slug}`)
  console.log(`🛠️ Panel de control: /dashboard/${event.id}`)
  console.log('======================================================\n')
}

runSeed()

