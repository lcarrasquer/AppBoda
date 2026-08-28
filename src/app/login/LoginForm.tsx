'use client'

import React, { useState, useTransition } from 'react'
import { 
  Loader2, 
  Eye, 
  EyeOff, 
  Check, 
  ShieldCheck, 
  Lock, 
  Mail, 
  ArrowLeft, 
  KeyRound, 
  LogIn, 
  UserPlus, 
  Sparkles,
  AlertCircle 
} from 'lucide-react'
import { login, signup, requestPasswordReset } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { evaluatePassword, isValidEmail } from '@/lib/auth/passwordValidation'

interface LoginFormProps {
  initialError?: string
}

export function LoginForm({ initialError }: LoginFormProps) {
  const [isPendingLogin, startLoginTransition] = useTransition()
  const [isPendingSignup, startSignupTransition] = useTransition()
  const [isPendingReset, startResetTransition] = useTransition()

  const [authTab, setAuthTab] = useState<'login' | 'signup'>('login')
  const [isForgotMode, setIsForgotMode] = useState(false)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(initialError || null)
  const [resetMessage, setResetMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const isPending = isPendingLogin || isPendingSignup || isPendingReset
  const evaluation = evaluatePassword(password)

  const handleLogin = (formData: FormData) => {
    setErrorMessage(null)
    startLoginTransition(async () => {
      const res = await login(formData)
      if (res?.error) {
        setErrorMessage(res.error)
      }
    })
  }

  const handleSignup = (formData: FormData) => {
    setErrorMessage(null)
    startSignupTransition(async () => {
      const res = await signup(formData)
      if (res?.error) {
        setErrorMessage(res.error)
      } else if (res?.success) {
        setResetMessage({ type: 'success', text: res.success })
      }
    })
  }

  const handlePasswordReset = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setResetMessage(null)
    const formData = new FormData(e.currentTarget)
    startResetTransition(async () => {
      const res = await requestPasswordReset(formData)
      if (res.error) {
        setResetMessage({ type: 'error', text: res.error })
      } else if (res.success) {
        setResetMessage({ type: 'success', text: res.success })
      }
    })
  }

  // 1. Password Recovery Mode
  if (isForgotMode) {
    return (
      <form onSubmit={handlePasswordReset} className="space-y-4 animate-in fade-in duration-200">
        <div className="text-center space-y-1 pb-1">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2">
            <KeyRound className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-foreground">Recuperar contraseña</h3>
          <p className="text-xs text-muted-foreground">
            Introduce tu correo y te enviaremos un enlace seguro para crear una nueva contraseña.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="reset-email" className="font-semibold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-primary" />
            <span>Correo electrónico</span>
          </Label>
          <Input 
            id="reset-email" 
            name="email" 
            type="email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="hola@ejemplo.com" 
            required 
            disabled={isPending}
            className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border-white/40 dark:border-white/10 focus-visible:ring-primary/50 transition-all rounded-xl disabled:opacity-60 h-10 text-sm"
          />
        </div>

        {resetMessage && (
          <div className={`text-xs font-medium p-2.5 rounded-xl border animate-in fade-in ${
            resetMessage.type === 'success' 
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
              : 'bg-destructive/10 text-destructive border-destructive/20'
          }`}>
            {resetMessage.text}
          </div>
        )}

        <div className="space-y-2 pt-2">
          <Button 
            type="submit" 
            disabled={isPending}
            className="w-full font-bold shadow-lg shadow-primary/20 rounded-xl bg-gradient-to-r from-primary to-sky-600 hover:opacity-95 transition-all cursor-pointer disabled:cursor-not-allowed h-10"
          >
            {isPendingReset ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enviando enlace...
              </>
            ) : (
              'Enviar enlace de recuperación'
            )}
          </Button>

          <Button 
            type="button"
            variant="ghost"
            onClick={() => {
              setIsForgotMode(false)
              setResetMessage(null)
            }}
            disabled={isPending}
            className="w-full text-xs font-semibold rounded-xl text-muted-foreground hover:text-foreground transition-all cursor-pointer h-9 gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver a las opciones de acceso</span>
          </Button>
        </div>
      </form>
    )
  }

  // 2. Tabbed Auth (Iniciar Sesión / Registrarse)
  return (
    <div className="space-y-4">
      
      {/* Segmented Pill Tabs Header */}
      <div className="grid grid-cols-2 p-1 bg-muted/60 dark:bg-muted/30 rounded-2xl border border-border/60 shadow-inner">
        <button
          type="button"
          onClick={() => {
            setAuthTab('login')
            setResetMessage(null)
          }}
          className={`py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none ${
            authTab === 'login'
              ? 'bg-background text-foreground shadow-md font-black ring-1 ring-border/50 scale-[1.02]'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <LogIn className="w-3.5 h-3.5 text-primary" />
          <span>Iniciar sesión</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setAuthTab('signup')
            setResetMessage(null)
          }}
          className={`py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none ${
            authTab === 'signup'
              ? 'bg-background text-foreground shadow-md font-black ring-1 ring-border/50 scale-[1.02]'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <UserPlus className="w-3.5 h-3.5 text-sky-500" />
          <span>Registrarse</span>
        </button>
      </div>

      {/* Main Tab Content */}
      <form className="space-y-3.5">
        {/* Error / Feedback Alert Banner */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {resetMessage && (
          <div className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150 ${
            resetMessage.type === 'success' 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' 
              : 'bg-destructive/10 border-destructive/30 text-destructive'
          }`}>
            {resetMessage.type === 'success' ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{resetMessage.text}</span>
          </div>
        )}

        {/* Email input */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="email" className="font-semibold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Correo electrónico</span>
            </Label>
            {authTab === 'signup' && email.length > 0 && (
              <span className={`text-[10px] font-bold ${isValidEmail(email) ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                {isValidEmail(email) ? '✓ Correo válido' : 'Formato incompleto'}
              </span>
            )}
          </div>
          <Input 
            id="email" 
            name="email" 
            type="email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="hola@ejemplo.com" 
            required 
            disabled={isPending}
            className={`bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border-white/40 dark:border-white/10 focus-visible:ring-primary/50 transition-all rounded-xl disabled:opacity-60 h-10 text-sm ${
              authTab === 'signup' && email.length > 3 && !isValidEmail(email) ? 'border-amber-500/50 focus-visible:ring-amber-500/40' : ''
            }`}
          />
        </div>

        {/* Password input with toggle visibility */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="font-semibold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Contraseña</span>
            </Label>

            {authTab === 'login' && (
              <button
                type="button"
                onClick={() => {
                  setIsForgotMode(true)
                  setResetMessage(null)
                }}
                className="text-[11px] font-bold text-primary hover:underline cursor-pointer transition-colors"
                tabIndex={-1}
              >
                ¿La has olvidado?
              </button>
            )}
          </div>

          <div className="relative">
            <Input 
              id="password" 
              name="password" 
              type={showPassword ? 'text' : 'password'} 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required 
              disabled={isPending}
              className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border-white/40 dark:border-white/10 focus-visible:ring-primary/50 transition-all rounded-xl disabled:opacity-60 pr-10 h-10 text-sm"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 cursor-pointer"
              tabIndex={-1}
              title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Live Password Strength & Requirements (Shown ONLY on Signup) */}
          {authTab === 'signup' && (
            <div className="pt-2 space-y-2 animate-in fade-in duration-200">
              
              {/* Strength meter bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-bold">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-primary" />
                    <span>Seguridad:</span>
                  </span>
                  <span className={
                    evaluation.score === 4 
                      ? 'text-emerald-500 font-extrabold' 
                      : evaluation.score === 3 
                      ? 'text-sky-500 font-bold' 
                      : evaluation.score === 2 
                      ? 'text-amber-500 font-bold' 
                      : 'text-rose-500 font-bold'
                  }>
                    {password.length === 0 ? 'Requerida' : evaluation.strengthLabel}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-1 h-1.5">
                  {[1, 2, 3, 4].map((step) => (
                    <div
                      key={step}
                      className={`rounded-full transition-all duration-300 ${
                        evaluation.score >= step
                          ? evaluation.strengthColor
                          : 'bg-muted/60 dark:bg-muted/30'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Checklist of 5 security requirements */}
              <div className="p-2.5 rounded-xl bg-card/60 border border-border/50 space-y-1 text-xs backdrop-blur-md">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  Requisitos de la contraseña:
                </span>
                <div className="grid grid-cols-1 gap-1">
                  {evaluation.requirements.map((req) => (
                    <div
                      key={req.id}
                      className={`flex items-center gap-1.5 text-[11px] transition-colors duration-150 ${
                        req.valid 
                          ? 'text-emerald-600 dark:text-emerald-400 font-medium' 
                          : 'text-muted-foreground/80'
                      }`}
                    >
                      {req.valid ? (
                        <div className="w-3.5 h-3.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-3" />
                        </div>
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full bg-muted flex items-center justify-center shrink-0 text-muted-foreground/60">
                          <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
                        </div>
                      )}
                      <span>{req.label}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}
        </div>

        {initialError && (
          <div className="text-xs font-medium text-destructive mt-2 text-center bg-destructive/10 p-2.5 rounded-xl border border-destructive/20 animate-in fade-in">
            {initialError}
          </div>
        )}

        {/* Tab-Specific Submit Action */}
        <div className="pt-2">
          {authTab === 'login' ? (
            <Button 
              formAction={handleLogin} 
              type="submit" 
              disabled={isPending}
              className="w-full font-bold shadow-lg shadow-primary/20 rounded-xl bg-gradient-to-r from-primary to-sky-600 hover:opacity-95 transition-all cursor-pointer disabled:cursor-not-allowed h-10 gap-2"
            >
              {isPendingLogin ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Iniciando sesión...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Iniciar sesión</span>
                </>
              )}
            </Button>
          ) : (
            <Button 
              formAction={handleSignup} 
              type="submit" 
              disabled={isPending || !isValidEmail(email) || !evaluation.isValid}
              className="w-full font-bold shadow-lg shadow-sky-500/20 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:opacity-95 transition-all cursor-pointer disabled:cursor-not-allowed h-10 gap-2"
            >
              {isPendingSignup ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creando tu cuenta...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Crear cuenta nueva</span>
                </>
              )}
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}
