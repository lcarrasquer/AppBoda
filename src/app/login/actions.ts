'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { evaluatePassword, isValidEmail } from '@/lib/auth/passwordValidation'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const email = (formData.get('email') as string)?.trim()
  const password = formData.get('password') as string

  if (!email || !password) {
    redirect(`/login?error=${encodeURIComponent('Por favor introduce tu correo y contraseña')}`)
  }

  if (!isValidEmail(email)) {
    redirect(`/login?error=${encodeURIComponent('Por favor introduce un correo electrónico válido')}`)
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    let msg = error.message
    if (msg.includes('Invalid login credentials')) {
      msg = 'Credenciales incorrectas. Comprueba tu correo y contraseña.'
    }
    redirect(`/login?error=${encodeURIComponent(msg)}`)
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const email = (formData.get('email') as string)?.trim()
  const password = formData.get('password') as string

  if (!email || !password) {
    redirect(`/login?error=${encodeURIComponent('Por favor introduce tu correo y contraseña')}`)
  }

  if (!isValidEmail(email)) {
    redirect(`/login?error=${encodeURIComponent('El formato del correo electrónico no es válido (ej: nombre@dominio.com)')}`)
  }

  // Enforce password requirements on registration
  const evaluation = evaluatePassword(password)
  if (!evaluation.isValid) {
    const missing = evaluation.requirements.filter(r => !r.valid).map(r => r.label).join(', ')
    redirect(`/login?error=${encodeURIComponent(`La contraseña no es válida. Falta: ${missing}`)}`)
  }

  const { data: authData, error } = await supabase.auth.signUp({ email, password })

  if (error) {
    let msg = error.message
    if (msg.includes('already registered')) {
      msg = 'Ya existe una cuenta con este correo electrónico.'
    }
    redirect(`/login?error=${encodeURIComponent(msg)}`)
  }

  // Supabase returns no session if email confirmation is required
  if (!authData.session) {
    redirect('/login?error=Revisa tu correo para confirmar tu cuenta (o desactiva la confirmación de email en Supabase Auth)')
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function requestPasswordReset(formData: FormData) {
  const supabase = await createClient()

  const email = (formData.get('email') as string)?.trim()

  if (!email || !isValidEmail(email)) {
    return { error: 'Por favor introduce un correo electrónico válido (ej: nombre@dominio.com)' }
  }

  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const redirectTo = `${siteUrl}/auth/callback?next=/reset-password`

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo
  })

  if (error) {
    return { error: error.message }
  }

  return { success: '¡Enlace de recuperación enviado! Revisa tu bandeja de entrada o spam.' }
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient()

  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (!password || !confirmPassword) {
    redirect(`/reset-password?error=${encodeURIComponent('Completa ambos campos de contraseña')}`)
  }

  if (password !== confirmPassword) {
    redirect(`/reset-password?error=${encodeURIComponent('Las contraseñas no coinciden')}`)
  }

  const evaluation = evaluatePassword(password)
  if (!evaluation.isValid) {
    const missing = evaluation.requirements.filter(r => !r.valid).map(r => r.label).join(', ')
    redirect(`/reset-password?error=${encodeURIComponent(`La nueva contraseña debe cumplir: ${missing}`)}`)
  }

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    redirect(`/reset-password?error=${encodeURIComponent(error.message)}`)
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
