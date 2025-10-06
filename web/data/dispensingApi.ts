import { supabase } from '@/lib/supabaseClient'

// ---- helpers: timestamptz + amount -----------------------------------------
function toIsoTimestamp(
  value: string | Date | number | null | undefined,
  opts: { endOfDay?: boolean } = {}
): string | null {
  const { endOfDay = false } = opts
  if (value === null || value === undefined) return null

  if (typeof value === 'string') {
    const v = value.trim()
    if (!v || /^empty$/i.test(v)) return null

    let m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/) // YYYY-MM-DD
    if (m) {
      const [, y, mm, dd] = m
      const d = new Date(Date.UTC(+y, +mm - 1, +dd, 0, 0, 0, 0))
      if (endOfDay) d.setUTCHours(23, 59, 59, 999)
      return d.toISOString()
    }

    m = v.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/) // YYYY/MM/DD
    if (m) {
      const [, y, mm, dd] = m
      const d = new Date(Date.UTC(+y, +mm - 1, +dd, 0, 0, 0, 0))
      if (endOfDay) d.setUTCHours(23, 59, 59, 999)
      return d.toISOString()
    }

    m = v.match(/^(\d{4})[-/](\d{1,2})$/) // YYYY-MM or YYYY/MM -> end of month
    if (m) {
      const [, y, mm] = m
      const end = new Date(Date.UTC(+y, +mm, 1, 0, 0, 0, 0) - 1)
      return end.toISOString()
    }

    m = v.match(/^(\d{1,2})\/(\d{2})$/) // M/YY -> 20YY-MM end of month
    if (m) {
      const [, mm, yy] = m
      const year = 2000 + +yy
      const end = new Date(Date.UTC(year, +mm, 1, 0, 0, 0, 0) - 1)
      return end.toISOString()
    }

    m = v.match(/^(\d{1,2})\/(\d{4})$/) // M/YYYY -> end of month
    if (m) {
      const [, mm, yyyy] = m
      const end = new Date(Date.UTC(+yyyy, +mm, 1, 0, 0, 0, 0) - 1)
      return end.toISOString()
    }

    const d = new Date(v) // fallback
    return isNaN(d as any) ? null : d.toISOString()
  }

  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'number') return new Date(value).toISOString() // epoch ms
  return null
}

function toAmountText(amount: number | string, unit?: string): string {
  if (typeof amount === 'string') return amount
  return unit ? `${amount} ${unit}` : String(amount)
}

// ---- types ------------------------------------------------------------------
export type RecordDispenseInput = {
  patientId: string
  medicationName: string
  doseInstructions: string
  amount: number | string
  unit?: string
  lotNumber?: string
  expiration?: string | Date | number | null
  physicianName?: string
  studentName?: string
  clinicSiteId?: string
  pharmacyLogTeam?: string
  logPage?: number
  enteredBy?: string
  medicationId?: string
  notes?: string
  logAt?: string | Date | number | null
}

export type CancelDispenseInput = {
  patientId: string
  medicationName: string
  doseInstructions: string
  amountToRevert: number | string
  unit?: string
  lotNumber?: string
  reason?: string
  expiration?: string | Date | number | null
  logAt?: string | Date | number | null
}

// ---- API: insert rows into public.dispensing_history -----------------------
export async function recordDispenseUI(input: RecordDispenseInput) {
  const payload = {
    log_date: toIsoTimestamp(input.logAt) ?? new Date().toISOString(), // timestamptz
    patient_id: input.patientId,
    medication_name: input.medicationName,
    dose_instructions: input.doseInstructions,
    lot_number: input.lotNumber ?? null,
    expiration_date: toIsoTimestamp(input.expiration, { endOfDay: true }), // timestamptz
    amount_dispensed: toAmountText(input.amount, input.unit), // TEXT
    physician_name: input.physicianName ?? null,
    student_name: input.studentName ?? null,
    clinic_site_id: input.clinicSiteId ?? null,
    pharmacy_log_team: input.pharmacyLogTeam ?? null,
    log_page: input.logPage ?? null,
    entered_by: input.enteredBy ?? null,
    medication_id: input.medicationId ?? null,
    notes: input.notes ?? 'DISPENSE',
  }

  return supabase.from('dispensing_history').insert([payload]).select('id').single()
}

export async function cancelDispenseUI(input: CancelDispenseInput) {
  const base = toAmountText(input.amountToRevert, input.unit).trim()
  const amountText = base.startsWith('-') ? base : `-${base}`

  const payload = {
    log_date: toIsoTimestamp(input.logAt) ?? new Date().toISOString(),
    patient_id: input.patientId,
    medication_name: input.medicationName,
    dose_instructions: input.doseInstructions,
    lot_number: input.lotNumber ?? null,
    expiration_date: toIsoTimestamp(input.expiration, { endOfDay: true }),
    amount_dispensed: amountText, // e.g. "-2 tabs"
    physician_name: null,
    student_name: null,
    clinic_site_id: null,
    pharmacy_log_team: null,
    log_page: null,
    entered_by: null,
    medication_id: null,
    notes: input.reason ? `[CANCEL] ${input.reason}` : '[CANCEL]',
  }

  return supabase.from('dispensing_history').insert([payload]).select('id').single()
}

export async function listRecentHistory(limit = 10) {
  return supabase
    .from('dispensing_history')
    .select('id, log_date, patient_id, medication_name, expiration_date, amount_dispensed, notes, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)
}
