import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { QuizBuilderShell } from '@/components/quiz-builder/QuizBuilderShell'

interface EditPageProps {
  params: { funnelId: string }
}

/**
 * Server component — resolves session, then hands off to the client shell.
 * The client shell handles data loading, layout, and all interactivity.
 */
export default async function EditPage({ params }: EditPageProps) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <QuizBuilderShell
      funnelId={params.funnelId}
      accessToken={session.accessToken}
    />
  )
}
