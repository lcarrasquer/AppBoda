'use client'

import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'

export default function PrintButton() {
  return (
    <Button 
      onClick={() => window.print()} 
      className="gap-2 rounded-xl font-bold bg-gradient-to-r from-primary to-sky-600 shadow-md hover:opacity-95"
    >
      <Printer className="w-4 h-4" /> Imprimir / Guardar como PDF
    </Button>
  )
}
