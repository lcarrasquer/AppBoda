const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
})

async function runSeed() {
  console.log('🌱 Iniciando inserción de datos de prueba en Supabase...')

  // 1. Obtener o crear un evento activo
  let { data: events, error: eventErr } = await supabase
    .from('events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)

  if (eventErr) {
    console.error('Error al consultar eventos:', eventErr)
    return
  }

  let event = events && events[0] ? events[0] : null

  if (!event) {
    console.log('Creando evento demo...')
    const todayStr = new Date().toISOString().split('T')[0]
    
    // Obtener un owner_id si existe usuario
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
        primary_color: '#D4AF37',
        status: 'active'
      })
      .select()
      .single()

    if (createErr) {
      console.error('Error al crear evento demo:', createErr)
      return
    }
    event = newEvent
  }

  console.log(`✅ Evento activo encontrado/creado: "${event.bride_name} & ${event.groom_name}" (ID: ${event.id}, Slug: ${event.slug})`)

  // Actualizar la fecha del evento a HOY para que la línea de tiempo dinámicas marque "En curso" / "Próximo"
  const todayStr = new Date().toISOString().split('T')[0]
  await supabase.from('events').update({ event_date: todayStr, status: 'active' }).eq('id', event.id)

  // 2. Módulos
  await supabase.from('event_modules').upsert([
    { event_id: event.id, module_key: 'photos', is_enabled: true },
    { event_id: event.id, module_key: 'kahoot', is_enabled: true }
  ], { onConflict: 'event_id,module_key' })
  console.log('✅ Módulos (Fotos y Kahoot) activados.')

  // 3. Cronograma del Día (Schedule)
  await supabase.from('event_schedule').delete().eq('event_id', event.id)
  await supabase.from('event_schedule').insert([
    { event_id: event.id, title: 'Ceremonia Civil', description: 'Jardín Principal de la Finca', icon: '💍', scheduled_time: '12:30:00' },
    { event_id: event.id, title: 'Cóctel de Bienvenida', description: 'Terraza Exterior y Photocall', icon: '🍸', scheduled_time: '13:45:00' },
    { event_id: event.id, title: 'Banquete de Boda', description: 'Salón Salón Principal', icon: '🍽️', scheduled_time: '15:00:00' },
    { event_id: event.id, title: 'Corte de la Tarta Nupcial', description: 'Momento dulce y brindis', icon: '🎂', scheduled_time: '17:30:00' },
    { event_id: event.id, title: 'Apertura del Baile y Fiesta', description: 'Zona de Baile con DJ en directo', icon: '💃', scheduled_time: '18:00:00' },
    { event_id: event.id, title: 'Recena y Pizzas', description: 'Recarga de energía nocturna', icon: '🍕', scheduled_time: '21:00:00' }
  ])
  console.log('✅ Cronograma del día insertado (6 hitos).')

  // 4. Etiquetas de Fotos
  await supabase.from('photo_tags').delete().eq('event_id', event.id)
  await supabase.from('photo_tags').insert([
    { event_id: event.id, name: 'Ceremonia', sort_order: 1 },
    { event_id: event.id, name: 'Cóctel', sort_order: 2 },
    { event_id: event.id, name: 'Baile & Fiesta', sort_order: 3 },
    { event_id: event.id, name: 'Photocall', sort_order: 4 },
    { event_id: event.id, name: 'Brindis', sort_order: 5 }
  ])
  console.log('✅ 5 etiquetas de fotos creadas.')

  // 5. Retos Fotográficos
  await supabase.from('challenges').delete().eq('event_id', event.id)
  await supabase.from('challenges').insert([
    { event_id: event.id, title: 'Selfie con alguien con pajarita 👔', description: 'Encuentra a un invitado elegante y sácate una foto.', icon: '📸' },
    { event_id: event.id, title: 'Foto del brindis más divertido 🥂', description: 'Captura las copas arriba celebrando el amor de los novios.', icon: '🥂' },
    { event_id: event.id, title: 'Captura el mejor baile de la noche 💃', description: 'Fotografía a la persona que más lo esté dando todo en la pista.', icon: '💃' }
  ])
  console.log('✅ 3 retos fotográficos creados.')

  // 6. Invitados Demo
  const guestNames = ['Sofía Fernández', 'Mateo García', 'Alejandro Martínez', 'Elena López', 'David Ruiz']
  const insertedGuests = []

  for (const name of guestNames) {
    const { data: g } = await supabase
      .from('guests')
      .insert({ event_id: event.id, full_name: name })
      .select()
      .single()
    if (g) insertedGuests.push(g)
  }
  console.log(`✅ ${insertedGuests.length} invitados demo registrados.`)

  // 7. Dedicatorias del Libro de Firmas
  if (insertedGuests.length >= 5) {
    await supabase.from('guestbook_entries').delete().eq('event_id', event.id)
    await supabase.from('guestbook_entries').insert([
      {
        event_id: event.id,
        guest_id: insertedGuests[0].id,
        type: 'text',
        content: '¡Que seáis superfelices toda la vida! Una boda de ensueño y una organización de 10. Un abrazo enorme para Lucía y Carlos.',
        is_private: false
      },
      {
        event_id: event.id,
        guest_id: insertedGuests[1].id,
        type: 'text',
        content: 'Muchas felicidades parejas, estamos disfrutando muchísimo la fiesta. ¡A darlo todo en el baile!',
        is_private: false
      },
      {
        event_id: event.id,
        guest_id: insertedGuests[2].id,
        type: 'text',
        content: 'Lucía y Carlos, no sabéis lo emocionado que me he sentido durante la ceremonia y los votos. Os quiero muchísimo a los dos.',
        is_private: false
      },
      {
        event_id: event.id,
        guest_id: insertedGuests[3].id,
        type: 'text',
        content: 'Chicos, una sorpresa que os tenemos preparada para la recena: ¡hemos organizado un baile sorpresa! 🤫 No digáis nada a nadie.',
        is_private: true
      },
      {
        event_id: event.id,
        guest_id: insertedGuests[4].id,
        type: 'text',
        content: 'De parte de toda la mesa 4: ¡vivan los novios y viva el amor! 💖🥂 Gracias por invitarnos a compartir este día tan especial.',
        is_private: false
      }
    ])
    console.log('✅ 5 dedicatorias (públicas y privadas) insertadas en el Libro de Firmas.')
  }

  // 8. Trivia Kahoot
  await supabase.from('kahoot_quizzes').delete().eq('event_id', event.id)
  const { data: quiz } = await supabase
    .from('kahoot_quizzes')
    .insert({
      event_id: event.id,
      title: `¿Cuánto conoces a ${event.bride_name} & ${event.groom_name}?`,
      prize_description: 'Una botella de Champán de reserva 🍾',
      is_active: true
    })
    .select()
    .single()

  if (quiz) {
    // Pregunta 1
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
        { question_id: q1.id, answer_text: 'En el trabajo', is_correct: false, sort_order: 4 }
      ])
    }

    // Pregunta 2
    const { data: q2 } = await supabase.from('kahoot_questions').insert({
      quiz_id: quiz.id,
      question_text: '¿Quién dio el primer paso?',
      points: 10,
      sort_order: 2
    }).select().single()

    if (q2) {
      await supabase.from('kahoot_answers').insert([
        { question_id: q2.id, answer_text: `${event.bride_name}`, is_correct: false, sort_order: 1 },
        { question_id: q2.id, answer_text: `${event.groom_name}`, is_correct: true, sort_order: 2 },
        { question_id: q2.id, answer_text: 'Un amigo en común los presentó a ciegas', is_correct: false, sort_order: 3 }
      ])
    }

    // Pregunta 3
    const { data: q3 } = await supabase.from('kahoot_questions').insert({
      quiz_id: quiz.id,
      question_text: '¿Cuál es su destino de luna de miel?',
      points: 10,
      sort_order: 3
    }).select().single()

    if (q3) {
      await supabase.from('kahoot_answers').insert([
        { question_id: q3.id, answer_text: 'Japón', is_correct: false, sort_order: 1 },
        { question_id: q3.id, answer_text: 'Maldivas', is_correct: false, sort_order: 2 },
        { question_id: q3.id, answer_text: 'Bali e Indonesia', is_correct: true, sort_order: 3 },
        { question_id: q3.id, answer_text: 'Costa Rica', is_correct: false, sort_order: 4 }
      ])
    }
    console.log('✅ Quiz Kahoot insertado con 3 preguntas y opciones de respuesta.')
  }

  console.log('🎉 ¡Inserción de datos demo completada con éxito!')
}

runSeed()
