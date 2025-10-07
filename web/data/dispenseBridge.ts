// web/data/dispenseBridge.ts

import { dispenseInventoryFefo } from './inventoryApi'
import { recordDispenseUI } from './dispensingApi' // Sammi's file

type DispenseAndLogInput = {
  inventoryId: string
  qty: number
  patientId: string

  // optional UI fields
  medicationName?: string
  doseInstructions?: string
  unit?: string
  studentName?: string
  preceptorName?: string
  enteredBy?: string
  notes?: string
  logAt?: string | Date | number | null
}

type DispenseAndLogResult = {
  summary: any
  lotPlan: Array<{ lot_number: string; take_qty: number }>
  logErrors: Array<{ lot_number: string; error: string }>
}

/**
 * Calls FEFO dispense on the server, then writes one dispensing_history row
 * per lot consumed (so the log reflects the actual lot breakdown).
 */
export async function dispenseAndLog(input: DispenseAndLogInput): Promise<DispenseAndLogResult> {
  // 1) FEFO dispense (updates inventory & lots)
  const { data, error } = await dispenseInventoryFefo(input.inventoryId, input.qty)
  if (error) throw error

  const summary = (data as any)?.summary ?? null
  const lotPlan = ((data as any)?.lot_plan ?? []) as Array<{ lot_number: string; take_qty: number }>

  // 2) Write logs per lot (best-effort; do not block inventory updates)
  const logErrors: Array<{ lot_number: string; error: string }> = []

  for (const step of lotPlan) {
    const res = await recordDispenseUI({
      patientId: input.patientId,
      medicationName: input.medicationName ?? summary?.medication_name ?? 'Unknown',
      doseInstructions: input.doseInstructions ?? '',
      amount: step.take_qty,
      unit: input.unit ?? 'units',
      lotNumber: step.lot_number,
      expiration: null, // server already decremented correct lot; optional to fill
      studentName: input.studentName ?? null ?? undefined,
      physicianName: input.preceptorName ?? null ?? undefined,
      enteredBy: input.enteredBy ?? input.studentName ?? undefined,
      notes: input.notes ?? 'DISPENSE',
      logAt: input.logAt ?? new Date().toISOString(),
      clinicSiteId: summary?.site_id ?? undefined,
      medicationId: summary?.medication_id ?? undefined,
    })

    if (res.error) {
      logErrors.push({ lot_number: step.lot_number, error: res.error.message })
    }
  }

  return { summary, lotPlan, logErrors }
}