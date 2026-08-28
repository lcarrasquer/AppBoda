'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { evaluatePassword, isValidEmail } from '@/lib/auth/passwordValidation'

export async function login(formData: FormData): Promise<{ error?: string } | void> {
  const supabase = await createClient()

  const email = (formData.get('email') as string)?.trim()
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Por favor introduce tu correo y contraseña' }
  }

  if (!isValidEmail(email)) {
    return { error: 'Por favor introduce un correo electrónico válido' }
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    let msg = error.message
    if (msg.includes('Invalid login credentials')) {
      msg = 'Credenciales incorrectas. Comprueba tu correo y contraseña.'
    } else if (msg.includes('Email not confirmed')) {
      msg = 'Tu correo aún no ha sido confirmado. Revisa tu bandeja de entrada o confirma tu email.'
    }
    return { error: msg }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signup(formData: FormData): Promise<{ error?: string; success?: string } | void> {
  const supabase = await createClient()

  const email = (formData.get('email') as string)?.trim()
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Por favor introduce tu correo y contraseña' }
  }

  if (!isValidEmail(email)) {
    return { error: 'El formato del correo electrónico no es válido (ej: nombre@dominio.com)' }
  }

  // Enforce password requirements on registration
  const evaluation = evaluatePassword(password)
  if (!evaluation.isValid) {
    const missing = evaluation.requirements.filter(r => !r.valid).map(r => r.label).join(', ')
    return { error: `La contraseña no es válida. Falta: ${missing}` }
  }

  const { data: authData, error } = await supabase.auth.signUp({ email, password })

  if (error) {
    let msg = error.message
    if (msg.includes('already registered')) {
      msg = 'Ya existe una cuenta con este correo electrónico.'
    }
    return { error: msg }
  }

  // Supabase returns no session if email confirmation is required
  if (!authData.session) {
    return { success: '¡Cuenta creada! Revisa tu correo para confirmar tu registro o inicia sesión si ya confirmaste.' }
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
