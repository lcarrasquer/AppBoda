export interface PasswordRequirement {
  id: string
  label: string
  valid: boolean
}

export interface PasswordEvaluation {
  isValid: boolean
  score: number // 0 to 4
  strengthLabel: string
  strengthColor: string
  requirements: PasswordRequirement[]
}

/**
 * Validates whether an email string is well-formed with a valid domain and TLD
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false
  const trimmed = email.trim()
  if (trimmed.length < 5 || trimmed.length > 254) return false
  
  // RFC 5322 compatible email pattern requiring valid domain and at least 2 char TLD
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/
  return emailRegex.test(trimmed)
}

/**
 * Evaluates password strength against 5 mandatory security rules
 */
export function evaluatePassword(password: string): PasswordEvaluation {
  const requirements: PasswordRequirement[] = [
    { id: 'length', label: 'Mínimo 8 caracteres', valid: password.length >= 8 },
    { id: 'uppercase', label: 'Al menos una letra mayúscula (A-Z)', valid: /[A-Z]/.test(password) },
    { id: 'lowercase', label: 'Al menos una letra minúscula (a-z)', valid: /[a-z]/.test(password) },
    { id: 'number', label: 'Al menos un número (0-9)', valid: /[0-9]/.test(password) },
    { id: 'special', label: 'Un carácter especial (@, $, !, %, *, #...)', valid: /[^A-Za-z0-9]/.test(password) }
  ]

  const passedCount = requirements.filter(r => r.valid).length
  const isValid = requirements.every(r => r.valid)

  let score = 0
  let strengthLabel = 'Muy débil'
  let strengthColor = 'bg-rose-500'

  if (passedCount === 5) {
    score = 4
    strengthLabel = 'Excelente y segura'
    strengthColor = 'bg-emerald-500'
  } else if (passedCount >= 4) {
    score = 3
    strengthLabel = 'Fuerte'
    strengthColor = 'bg-sky-500'
  } else if (passedCount >= 3) {
    score = 2
    strengthLabel = 'Media'
    strengthColor = 'bg-amber-500'
  } else if (passedCount >= 1) {
    score = 1
    strengthLabel = 'Débil'
    strengthColor = 'bg-rose-400'
  }

  return { isValid, score, strengthLabel, strengthColor, requirements }
}
