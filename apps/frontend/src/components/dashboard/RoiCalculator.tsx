'use client'

/**
 * RoiCalculator — Interactive ROI projection widget for the Overview page.
 *
 * Users adjust sliders for ad budget, CPL, conversion rate and deal size.
 * Results update in real-time showing projected leads, deals, revenue and ROAS.
 *
 * CRO Impact: makes the platform's value tangible by letting users model
 * their own numbers — turns abstract metrics into personal investment decisions.
 */

import { useState } from 'react'
import { Calculator, TrendingUp, Users, DollarSign, Target } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Slider input ──────────────────────────────────────────────────────────────

function SliderField({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label:    string
  value:    number
  min:      number
  max:      number
  step:     number
  format:   (v: number) => string
  onChange: (v: number) => void
}) {
  const pct = ((value - min) / (max - min)) * 100

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-slate-700">{label}</label>
        <span className="text-sm font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-lg">
          {format(value)}
        </span>
      </div>
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${pct}%, #e2e8f0 ${pct}%, #e2e8f0 100%)`,
          }}
        />
      </div>
    </div>
  )
}

// ── Result stat ───────────────────────────────────────────────────────────────

function ResultStat({
  label,
  value,
  sub,
  icon: Icon,
  highlight,
}: {
  label:      string
  value:      string
  sub?:       string
  icon:       React.ComponentType<{ className?: string }>
  highlight?: boolean
}) {
  return (
    <div className={cn(
      'rounded-2xl p-4 flex items-start gap-3',
      highlight ? 'bg-brand-600 text-white' : 'bg-slate-50',
    )}>
      <div className={cn(
        'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
        highlight ? 'bg-white/20' : 'bg-white',
      )}>
        <Icon className={cn('w-4.5 h-4.5 w-[18px] h-[18px]', highlight ? 'text-white' : 'text-brand-600')} />
      </div>
      <div className="min-w-0">
        <p className={cn('text-xs font-semibold uppercase tracking-wide', highlight ? 'text-brand-100' : 'text-slate-500')}>
          {label}
        </p>
        <p className={cn('text-xl font-extrabold leading-tight', highlight ? 'text-white' : 'text-slate-900')}>
          {value}
        </p>
        {sub && (
          <p className={cn('text-xs mt-0.5', highlight ? 'text-brand-200' : 'text-slate-400')}>{sub}</p>
        )}
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtCLP(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `$${Math.round(n / 1000)}K`
  return `$${Math.round(n)}`
}

function fmtPct(n: number): string {
  return `${n}%`
}

// ── Main component ────────────────────────────────────────────────────────────

export function RoiCalculator() {
  const [budget,     setBudget]     = useState(500_000)   // CLP/month
  const [cpl,        setCpl]        = useState(5_000)     // CLP per lead
  const [convRate,   setConvRate]   = useState(10)        // % leads → deals
  const [dealValue,  setDealValue]  = useState(200_000)   // avg CLP per deal

  // Derived metrics
  const leadsPerMonth  = budget > 0 && cpl > 0 ? Math.round(budget / cpl) : 0
  const dealsPerMonth  = Math.round(leadsPerMonth * (convRate / 100))
  const revenueMonth   = dealsPerMonth * dealValue
  const profit         = revenueMonth - budget
  const roas           = budget > 0 ? revenueMonth / budget : 0
  const roiPct         = budget > 0 ? ((profit / budget) * 100) : 0

  return (
    <div className="kpi-card space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center">
          <Calculator className="w-5 h-5 text-brand-600" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-900">Calculadora de ROI</h2>
          <p className="text-xs text-slate-500">Proyecta el retorno de tus campañas</p>
        </div>
      </div>

      {/* Inputs */}
      <div className="space-y-5">
        <SliderField
          label="Presupuesto mensual en ads"
          value={budget}
          min={50_000}
          max={5_000_000}
          step={50_000}
          format={fmtCLP}
          onChange={setBudget}
        />
        <SliderField
          label="Costo por lead (CPL)"
          value={cpl}
          min={1_000}
          max={50_000}
          step={500}
          format={fmtCLP}
          onChange={setCpl}
        />
        <SliderField
          label="Tasa de conversión lead → deal"
          value={convRate}
          min={1}
          max={40}
          step={1}
          format={fmtPct}
          onChange={setConvRate}
        />
        <SliderField
          label="Valor promedio por deal"
          value={dealValue}
          min={10_000}
          max={5_000_000}
          step={10_000}
          format={fmtCLP}
          onChange={setDealValue}
        />
      </div>

      {/* Divider */}
      <div className="h-px bg-slate-100" />

      {/* Results */}
      <div className="grid grid-cols-2 gap-3">
        <ResultStat
          label="Leads/mes"
          value={leadsPerMonth.toLocaleString('es-CL')}
          sub={`con CPL de ${fmtCLP(cpl)}`}
          icon={Users}
        />
        <ResultStat
          label="Deals/mes"
          value={dealsPerMonth.toLocaleString('es-CL')}
          sub={`${convRate}% de conversión`}
          icon={Target}
        />
        <ResultStat
          label="Revenue proyectado"
          value={fmtCLP(revenueMonth)}
          sub={`${fmtCLP(dealValue)} × ${dealsPerMonth}`}
          icon={DollarSign}
        />
        <ResultStat
          label="ROAS"
          value={`${roas.toFixed(1)}×`}
          sub={`ROI: ${roiPct >= 0 ? '+' : ''}${Math.round(roiPct)}%`}
          icon={TrendingUp}
          highlight={roas >= 2}
        />
      </div>

      {/* Insight */}
      {roas > 0 && (
        <div className={cn(
          'rounded-xl px-4 py-3 text-xs',
          roas >= 3  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
          roas >= 1  ? 'bg-amber-50   text-amber-700   border border-amber-100'   :
                       'bg-red-50     text-red-700     border border-red-100',
        )}>
          {roas >= 3 ? (
            <><strong>Excelente.</strong> Por cada ${Math.round(budget / 1000)}K invertido recuperas {fmtCLP(revenueMonth)} en revenue. Considera escalar el presupuesto.</>
          ) : roas >= 1 ? (
            <><strong>Rentable.</strong> Estás generando retorno positivo. Optimiza el CPL o la tasa de conversión para alcanzar ROAS ≥ 3×.</>
          ) : (
            <><strong>Atención.</strong> Con estos números el canal no es rentable. Revisa el CPL o el valor del deal antes de escalar.</>
          )}
        </div>
      )}
    </div>
  )
}
