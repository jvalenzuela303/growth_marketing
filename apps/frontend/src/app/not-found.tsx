import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-hero px-4 text-center">
      <div className="space-y-6 max-w-md">
        <p className="text-8xl font-extrabold text-white/20">404</p>
        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-white">Página no encontrada</h1>
          <p className="text-white/60">
            El enlace que seguiste no existe o fue movido.
          </p>
        </div>
        <Link href="/" className="btn-cta inline-flex">
          <ArrowLeft className="w-4 h-4" aria-hidden />
          Volver al inicio
        </Link>
      </div>
    </main>
  )
}
