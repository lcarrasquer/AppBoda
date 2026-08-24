'use client'

import { Button } from '@/components/ui/button'
import { AlertTriangle, Loader2, X } from 'lucide-react'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: 'destructive' | 'default'
  loading?: boolean
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmText = 'Sí, eliminar',
  cancelText = 'Cancelar',
  variant = 'destructive',
  loading = false,
  onConfirm,
  onClose
}: ConfirmDialogProps) {
  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md bg-card border rounded-2xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose} 
          disabled={loading}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-muted text-muted-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-2xl shrink-0 ${
            variant === 'destructive' 
              ? 'bg-destructive/10 text-destructive border border-destructive/20' 
              : 'bg-primary/10 text-primary border border-primary/20'
          }`}>
            <AlertTriangle className="w-6 h-6" />
          </div>

          <div className="space-y-1.5 min-w-0 pr-6">
            <h3 className="font-bold text-lg text-foreground leading-snug">{title}</h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onClose} 
            disabled={loading}
            className="rounded-xl font-semibold text-xs sm:text-sm px-4"
          >
            {cancelText}
          </Button>
          <Button 
            type="button" 
            variant={variant} 
            onClick={onConfirm} 
            disabled={loading}
            className="rounded-xl font-bold text-xs sm:text-sm px-4 shadow-sm"
          >
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  )
}
