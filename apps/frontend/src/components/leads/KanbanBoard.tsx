'use client'

/**
 * KanbanBoard — Visual pipeline with drag & drop via dnd-kit.
 *
 * Each column maps to a pipelineStage. Cards can be dragged between columns.
 * On drop, fires onStageChange(leadId, newStage) which should call the API.
 */

import { useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { cn, SEGMENT_COLORS, SEGMENT_NAMES, STAGE_NAMES, formatRelativeDate, type SegmentKey } from '@/lib/utils'
import type { LeadRow } from '@/lib/api'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const STAGES = [
  'nuevo',
  'calificado',
  'contactado',
  'propuesta',
  'negociacion',
  'cerrado_ganado',
  'cerrado_perdido',
] as const

type PipelineStage = (typeof STAGES)[number]

const STAGE_COLORS: Record<PipelineStage, string> = {
  nuevo:           'bg-slate-50   border-slate-200',
  calificado:      'bg-blue-50    border-blue-200',
  contactado:      'bg-purple-50  border-purple-200',
  propuesta:       'bg-amber-50   border-amber-200',
  negociacion:     'bg-orange-50  border-orange-200',
  cerrado_ganado:  'bg-emerald-50 border-emerald-200',
  cerrado_perdido: 'bg-red-50     border-red-200',
}

const STAGE_HEADER_COLORS: Record<PipelineStage, string> = {
  nuevo:           'text-slate-600',
  calificado:      'text-blue-700',
  contactado:      'text-purple-700',
  propuesta:       'text-amber-700',
  negociacion:     'text-orange-700',
  cerrado_ganado:  'text-emerald-700',
  cerrado_perdido: 'text-red-700',
}

// ---------------------------------------------------------------------------
// LeadCard
// ---------------------------------------------------------------------------

function LeadCard({
  lead,
  isDragging = false,
  onClick,
}: {
  lead:        LeadRow
  isDragging?: boolean
  onClick?:    (lead: LeadRow) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: lead.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.3 : 1,
  }

  const seg = (lead.segment as SegmentKey) ?? 'sin_clasificar'
  const sc  = SEGMENT_COLORS[seg]

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick?.(lead)}
      className={cn(
        'bg-white rounded-xl border border-slate-100 p-3 shadow-sm',
        'cursor-grab active:cursor-grabbing select-none',
        'hover:shadow-md hover:border-slate-200 transition-all duration-150',
        isDragging && 'rotate-1 shadow-lg',
      )}
    >
      {/* Lead name + score */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-semibold text-slate-800 leading-tight line-clamp-1">
          {lead.firstName ?? '—'} {lead.lastName ?? ''}
        </p>
        <span className={cn('flex-shrink-0 px-1.5 py-0.5 rounded-full text-xs font-bold tabular-nums', sc.badge)}>
          {lead.totalScore}
        </span>
      </div>

      {/* Email */}
      <p className="text-xs text-slate-400 truncate mb-2">{lead.email ?? '—'}</p>

      {/* Segment badge + date */}
      <div className="flex items-center justify-between gap-2">
        <span className={cn('px-1.5 py-0.5 rounded-full text-xs font-semibold', sc.badge)}>
          {SEGMENT_NAMES[seg]}
        </span>
        <span className="text-xs text-slate-300">{formatRelativeDate(lead.createdAt)}</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// KanbanColumn
// ---------------------------------------------------------------------------

function KanbanColumn({
  stage,
  leads,
  onCardClick,
}: {
  stage:       PipelineStage
  leads:       LeadRow[]
  onCardClick: (lead: LeadRow) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage })

  return (
    <div className="flex flex-col min-w-[230px] max-w-[260px] flex-shrink-0">
      {/* Column header */}
      <div className={cn('flex items-center justify-between mb-3 px-1')}>
        <h3 className={cn('text-xs font-bold uppercase tracking-wide', STAGE_HEADER_COLORS[stage])}>
          {STAGE_NAMES[stage]}
        </h3>
        <span className="text-xs font-semibold text-slate-400 tabular-nums">
          {leads.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 rounded-2xl border-2 border-dashed p-2 space-y-2 min-h-[200px] transition-colors duration-150',
          STAGE_COLORS[stage],
          isOver && 'ring-2 ring-brand-400 ring-offset-1',
        )}
      >
        <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
          {leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} onClick={onCardClick} />
          ))}
        </SortableContext>

        {leads.length === 0 && (
          <p className="text-xs text-slate-300 text-center pt-8 select-none">Sin leads</p>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// KanbanBoard (main export)
// ---------------------------------------------------------------------------

interface KanbanBoardProps {
  leads:           LeadRow[]
  onStageChange:   (leadId: string, newStage: string) => Promise<unknown>
  onLeadClick:     (lead: LeadRow) => void
}

export function KanbanBoard({ leads, onStageChange, onLeadClick }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [localLeads, setLocalLeads] = useState<LeadRow[]>(leads)

  // Sync prop changes (re-query) into local state
  useMemo(() => setLocalLeads(leads), [leads])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  const activeLead = localLeads.find((l) => l.id === activeId) ?? null

  // Group leads by stage
  const leadsByStage = useMemo(() => {
    const map: Record<string, LeadRow[]> = {}
    for (const s of STAGES) map[s] = []
    for (const l of localLeads) {
      const stage = l.pipelineStage ?? 'nuevo'
      if (map[stage]) map[stage].push(l)
      else map['nuevo'].push(l)
    }
    return map
  }, [localLeads])

  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as string)
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null)
    if (!over) return

    const leadId   = active.id as string
    const overId   = over.id as string

    // `over.id` can be a column (stage) id or another lead id
    const targetStage = STAGES.includes(overId as PipelineStage)
      ? overId
      : localLeads.find((l) => l.id === overId)?.pipelineStage ?? 'nuevo'

    const lead = localLeads.find((l) => l.id === leadId)
    if (!lead || lead.pipelineStage === targetStage) return

    // Optimistic update
    setLocalLeads((prev) =>
      prev.map((l) =>
        l.id === leadId ? { ...l, pipelineStage: targetStage } : l,
      ),
    )

    // Persist (rolls back on error)
    onStageChange(leadId, targetStage).catch(() => {
      setLocalLeads((prev) =>
        prev.map((l) =>
          l.id === leadId ? { ...l, pipelineStage: lead.pipelineStage } : l,
        ),
      )
    })
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* Horizontal scroll container */}
      <div className="flex gap-4 overflow-x-auto pb-4 pt-1 px-1">
        {STAGES.map((stage) => (
          <KanbanColumn
            key={stage}
            stage={stage}
            leads={leadsByStage[stage] ?? []}
            onCardClick={onLeadClick}
          />
        ))}
      </div>

      {/* Floating drag preview */}
      <DragOverlay>
        {activeLead && <LeadCard lead={activeLead} isDragging />}
      </DragOverlay>
    </DndContext>
  )
}
