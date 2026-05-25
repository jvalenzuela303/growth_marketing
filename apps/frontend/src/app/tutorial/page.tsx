import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Tutorial — Growth Engine',
  description: 'Guia completa de uso de la plataforma Growth Engine.',
}

/**
 * /tutorial — ruta publica que redirige al HTML estatico del tutorial.
 * Accesible desde la pagina de login sin autenticacion.
 */
export default function TutorialPage() {
  redirect('/tutorial.html')
}
