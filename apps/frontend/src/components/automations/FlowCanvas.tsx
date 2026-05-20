'use client'

/**
 * FlowCanvas — visual drag-and-drop automation flow builder.
 *
 * Uses @xyflow/react v12 for the canvas. Nodes are saved as JSON graph to
 * the backend on each "Guardar" click. Running triggers a dry-run execution
 * and shows a log panel.
 *
 * Node types:
 *   trigger    — entry point (one per flow, non-deletable)
 *   condition  — if/else branch on lead segment or score
 *   action     — send email | send whatsapp | add tag | wait
 *   end        — terminal node
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
  Panel,
  ReactFlowProvider,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  Save,
  Play,
  ArrowLeft,
  Plus,
  X,
  ChevronDown,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Zap,
  GitBranch,
  Mail,
  MessageCircle,
  Tag,
  Clock,
  Square,
} from 'lucide-react'
import Link from 'next/link'
import { updateAutomationFlow, runAutomationFlow } from '@/lib/api'
import type { AutomationFlowDetail, FlowRun } from '@/lib/api'
import { cn } from '@/lib/utils'

// ── Node palette definition ───────────────────────────────────────────────────

interface NodeDef {
  type:    string
  label:   string
  icon:    React.ComponentType<{ className?: string }>
  color:   string
  bg:      string
  border:  string
}

const NODE_DEFS: NodeDef[] = [
  { type: 'condition', label: 'Condición',     icon: GitBranch,    color: 'text-purple-600', bg: 'bg-purple-50',  border: 'border-purple-300' },
  { type: 'email',     label: 'Enviar Email',  icon: Mail,          color: 'text-blue-600',   bg: 'bg-blue-50',    border: 'border-blue-300'   },
  { type: 'whatsapp',  label: 'WhatsApp',      icon: MessageCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-300'},
  { type: 'tag',       label: 'Añadir Tag',    icon: Tag,           color: 'text-amber-600',  bg: 'bg-amber-50',   border: 'border-amber-300'  },
  { type: 'wait',      label: 'Esperar',       icon: Clock,         color: 'text-slate-600',  bg: 'bg-slate-100',  border: 'border-slate-300'  },
  { type: 'end',       label: 'Fin',           icon: Square,        color: 'text-red-600',    bg: 'bg-red-50',     border: 'border-red-300'    },
]

function getDef(type: string): NodeDef {
  return NODE_DEFS.find((d) => d.type === type) ?? {
    type, label: type, icon: Zap, color: 'text-brand-600', bg: 'bg-brand-50', border: 'border-brand-300',
  }
}

// ── Custom node renderer ──────────────────────────────────────────────────────

function FlowNodeCard({ data }: { data: any }) {
  const def = getDef(data.type ?? 'action')
  const Icon = def.icon
  return (
    <div className={cn('rounded-2xl border-2 px-4 py-3 min-w-[160px] shadow-sm', def.bg, def.border)}>
      <div className="flex items-center gap-2">
        <Icon className={cn('w-4 h-4 flex-shrink-0', def.color)} />
        <span className="text-sm font-semibold text-slate-800">{data.label ?? def.label}</span>
      </div>
      {data.description && (
        <p className="text-xs text-slate-500 mt-1 leading-tight">{data.description}</p>
      )}
    </div>
  )
}

const NODE_TYPES = { custom: FlowNodeCard }

// ── Helpers ───────────────────────────────────────────────────────────────────

function toReactFlowNodes(graph: AutomationFlowDetail['graph']): Node[] {
  return (graph.nodes ?? []).map((n) => ({
    id:       n.id,
    type:     'custom',
    position: n.position,
    data:     n.data,
  }))
}

function toReactFlowEdges(graph: AutomationFlowDetail['graph']): Edge[] {
  return (graph.edges ?? []).map((e) => ({
    id:     e.id,
    source: e.source,
    target: e.target,
  }))
}

let nodeCounter = 100

function makeNode(type: string, position: { x: number; y: number }): Node {
  const def = getDef(type)
  return {
    id:   `node_${++nodeCounter}`,
    type: 'custom',
    position,
    data: { type, label: def.label },
  }
}

// ── Palette sidebar ───────────────────────────────────────────────────────────

function Palette({ onAdd }: { onAdd: (type: string) => void }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-lg p-3 space-y-1.5 w-44">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-1 mb-2">Nodos</p>
      {NODE_DEFS.map((def) => {
        const Icon = def.icon
        return (
          <button
            key={def.type}
            onClick={() => onAdd(def.type)}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors',
              'hover:bg-slate-50 text-slate-700',
            )}
          >
            <Icon className={cn('w-4 h-4', def.color)} />
            {def.label}
          </button>
        )
      })}
    </div>
  )
}

// ── Run log panel ─────────────────────────────────────────────────────────────

function RunLog({
  log,
  onClose,
}: {
  log: FlowRun['log']
  onClose: () => void
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-lg w-80 max-h-96 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <p className="text-sm font-bold text-slate-900">Resultado de ejecución</p>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="overflow-y-auto flex-1 p-3 space-y-1.5">
        {log.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">Sin nodos ejecutados.</p>
        ) : log.map((entry, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            {entry.status === 'ok'
              ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
              : <AlertCircle  className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />}
            <span className="text-slate-700 font-medium">{entry.type}</span>
            <span className="text-slate-400 truncate">{entry.nodeId}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main canvas ───────────────────────────────────────────────────────────────

interface FlowCanvasProps {
  initialFlow: AutomationFlowDetail
  token:       string
}

function FlowCanvasInner({ initialFlow, token }: FlowCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(toReactFlowNodes(initialFlow.graph))
  const [edges, setEdges, onEdgesChange] = useEdgesState(toReactFlowEdges(initialFlow.graph))

  const [saving,  setSaving]  = useState(false)
  const [running, setRunning] = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [runLog,  setRunLog]  = useState<FlowRun['log'] | null>(null)
  const [error,   setError]   = useState('')
  const [showPalette, setShowPalette] = useState(false)

  const rfRef = useRef<{ getViewport: () => { x: number; y: number; zoom: number } } | null>(null)

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges],
  )

  function addNode(type: string) {
    const position = { x: 300 + Math.random() * 100, y: 200 + Math.random() * 100 }
    setNodes((nds) => [...nds, makeNode(type, position)])
    setShowPalette(false)
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      const graph = {
        nodes: nodes.map((n) => ({ id: n.id, position: n.position, data: n.data })),
        edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
      }
      await updateAutomationFlow(initialFlow.id, token, { graph })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      setError('Error al guardar. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  async function handleRun() {
    setRunning(true)
    setError('')
    try {
      const result = await runAutomationFlow(initialFlow.id, token)
      setRunLog(result.log)
    } catch {
      setError('Error al ejecutar el flujo.')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="flex flex-col h-full -mx-6 -my-6">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4 px-6 py-3 bg-white border-b border-slate-100 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/automations"
            className="flex items-center justify-center w-8 h-8 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-sm font-extrabold text-slate-900">{initialFlow.name}</h1>
            <p className="text-xs text-slate-400">Flujo de automatización</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {error && <span className="text-xs text-red-600">{error}</span>}
          {saved && <span className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />Guardado</span>}
          <button
            onClick={() => setShowPalette((v) => !v)}
            className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Añadir nodo
          </button>
          <button
            onClick={handleRun}
            disabled={running}
            className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-emerald-300 bg-emerald-50 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-50"
          >
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Ejecutar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={NODE_TYPES}
          fitView
          className="bg-slate-50"
        >
          <Background color="#cbd5e1" gap={20} />
          <Controls />
          <MiniMap nodeColor="#6366f1" className="!rounded-xl !border !border-slate-200" />

          {/* Palette panel */}
          {showPalette && (
            <Panel position="top-left" className="mt-2 ml-2">
              <Palette onAdd={addNode} />
            </Panel>
          )}

          {/* Run log panel */}
          {runLog !== null && (
            <Panel position="top-right" className="mt-2 mr-2">
              <RunLog log={runLog} onClose={() => setRunLog(null)} />
            </Panel>
          )}
        </ReactFlow>

        {/* Empty state hint */}
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center space-y-2">
              <p className="text-slate-400 text-sm font-medium">Canvas vacío</p>
              <p className="text-slate-300 text-xs">
                Usa &ldquo;Añadir nodo&rdquo; para construir tu flujo
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Export wrapped in ReactFlowProvider
export function FlowCanvas(props: FlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner {...props} />
    </ReactFlowProvider>
  )
}
