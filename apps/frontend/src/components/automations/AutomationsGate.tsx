'use client'

import { FeatureGate } from '@/components/access/FeatureGate'

/**
 * Client boundary that wraps the automations page content with a plan gate.
 * The page itself is a Server Component so the gate must live in a client file.
 */
export function AutomationsGate({ children }: { children: React.ReactNode }) {
  return (
    <FeatureGate minPlan="scale" featureName="Automatizaciones">
      {children}
    </FeatureGate>
  )
}
