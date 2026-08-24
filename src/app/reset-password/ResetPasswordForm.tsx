'use client'

import React, { useState, useTransition } from 'react'
import { Loader2, Eye, EyeOff, Check, ShieldCheck, Lock, KeyRound } from 'lucide-react'
import { updatePassword } from '@/app/login/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { evaluatePassword } from '@/lib/auth/passwordValidation'

interface ResetPasswordFormProps {
  initialError?: string
}

export function ResetPasswordForm({ initialError }: ResetPasswordFormProps) {
  const [isPending, startTransition] = useTransition()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const evaluation = evaluatePassword(password)
  const isMatching = password.length > 0 && confirmPassword.length > 0 && password === confirmPassword
  const hasMismatch = confirmPassword.length > 0 && password !== confirmPassword

  const handleUpdate = (formData: FormData) => {
    startTransition(async () => {
      await updatePassword(formData)
    })
  }

  return (
    <form action={handleUpdate} className="space-y-4">
      {/* New Password input */}
      <div className="space-y-1.5">
        <Label htmlFor="password" className="font-semibold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-primary" />
          <span>Nueva Contraseña</span>
        </Label>

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
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {/* Live Password Strength & Requirements Checklist */}
        {password.length > 0 && (
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
                  {evaluation.strengthLabel}
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
                Requisitos de la nueva contraseña:
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

      {/* Confirm Password input */}
      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword" className="font-semibold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <KeyRound className="w-3.5 h-3.5 text-primary" />
          <span>Confirmar Nueva Contraseña</span>
        </Label>

        <div className="relative">
          <Input 
            id="confirmPassword" 
            name="confirmPassword" 
            type={showConfirm ? 'text' : 'password'} 
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            required 
            disabled={isPending}
            className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border-white/40 dark:border-white/10 focus-visible:ring-primary/50 transition-all rounded-xl disabled:opacity-60 pr-10 h-10 text-sm"
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 cursor-pointer"
            tabIndex={-1}
          >
            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {isMatching && (
          <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 pt-0.5">
            <Check className="w-3.5 h-3.5" />
            <span>Las contraseñas coinciden</span>
          </div>
        )}

        {hasMismatch && (
          <div className="text-[11px] font-bold text-destructive flex items-center gap-1.5 pt-0.5">
            <span>Las contraseñas no coinciden</span>
          </div>
        )}
      </div>

      {initialError && (
        <div className="text-xs font-medium text-destructive mt-2 text-center bg-destructive/10 p-2.5 rounded-xl border border-destructive/20 animate-in fade-in">
          {initialError}
        </div>
      )}

      <div className="pt-2">
        <Button 
          type="submit" 
          disabled={isPending || !evaluation.isValid || !isMatching}
          className="w-full font-bold shadow-lg shadow-primary/20 rounded-xl bg-gradient-to-r from-primary to-sky-600 hover:opacity-95 transition-all cursor-pointer disabled:cursor-not-allowed h-10"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Guardando nueva contraseña...
            </>
          ) : (
            'Guardar Nueva Contraseña'
          )}
        </Button>
      </div>
    </form>
  )
}
