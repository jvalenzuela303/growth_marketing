import dynamic from 'next/dynamic'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAutomationFlow } from '@/lib/api'

const FlowCanvas = dynamic(
  () => import('@/components/automations/FlowCanvas').then((m) => m.FlowCanvas),
  { ssr: false, loading: () => <div className="flex-1 flex items-center justify-center text-slate-400">Cargando canvas…</div> },
)

export default async function FlowEditorPage({
  params,
}: {
  params: { flowId: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session) return null

  let flow = null
  try {
    flow = await getAutomationFlow(params.flowId, session.accessToken)
  } catch {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <p className="text-lg font-bold">Flujo no encontrado</p>
      </div>
    )
  }

  return (
    <FlowCanvas
      initialFlow={flow}
      token={session.accessToken}
    />
  )
}
