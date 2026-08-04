import { login, signup } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight text-center">Bienvenido</CardTitle>
          <CardDescription className="text-center">
            Inicia sesión o regístrate para gestionar tu evento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={login} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input id="email" name="email" type="email" placeholder="hola@ejemplo.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            
            {params?.error && (
              <div className="text-sm font-medium text-destructive mt-2">
                {params.error}
              </div>
            )}
            
            <div className="flex flex-col space-y-2 pt-4">
              <Button type="submit" className="w-full">
                Iniciar sesión
              </Button>
              <Button formAction={signup} type="submit" variant="outline" className="w-full">
                Registrarse
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
