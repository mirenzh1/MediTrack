import { supabase } from '../lib/supabase'
import type { Medication, DispensingRecord } from '../types/medication'
import { OfflineStore, type PendingDispense } from '../utils/offlineStore'

import { toESTDateString } from '../utils/timezone'
import { MedicationService } from './medicationService'


type MedRow = {
  id: string
  name: string
  generic_name?: string
  strength?: string
  dosage_form?: string
  category?: string
  current_stock?: number
  min_stock?: number
  max_stock?: number
  is_active?: boolean
  is_available?: boolean
  last_updated?: string
}

export class SyncService {
  private subscription: ReturnType<typeof supabase.channel> | null = null

  // Load medications from Supabase and cache locally
  // IMPORTANT: Stock is now derived from inventory (sum of qty_units by medication)
  async primeMedicationsCache(): Promise<Medication[]> {
    // Reuse the central logic that already sums inventory by medication
    const meds = await MedicationService.getAllMedications()
    await OfflineStore.setMedications(meds)
    return meds
  }

  // Real-time subscription to medications changes to keep cache fresh while online
  startMedicationsRealtime(): void {
    if (this.subscription) return
    // Listen to inventory changes since stock is derived from inventory rows
    const channel = supabase.channel('rt-inventory')
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, async (payload: any) => {
      try {
        // Determine affected medication_id from new/old row
        const medId = (payload.new?.medication_id || payload.old?.medication_id) as string | undefined
        if (!medId) return

        // Recompute total stock for this medication
        const { data: invRows, error: invErr } = await supabase
          .from('inventory')
          .select('qty_units')
          .eq('medication_id', medId)
        if (invErr) return
        const total = (invRows || []).reduce((sum: number, r: any) => sum + (r.qty_units || 0), 0)
        await OfflineStore.updateMedicationStock(medId, total)
      } catch (e) {
        console.warn('Realtime inventory refresh failed', e)
      }
    })
    channel.subscribe()
    this.subscription = channel
  }

  stopRealtime(): void {
    if (this.subscription) {
      this.subscription.unsubscribe()
      this.subscription = null
    }
  }

  // Queue a dispense while offline: update local stock and add to pending queue
  async queueOfflineDispense(rec: Omit<DispensingRecord, 'id' | 'patientInitials' | 'notes'>): Promise<PendingDispense> {
    await OfflineStore.decrementMedicationStock(rec.medicationId, rec.quantity)
    return OfflineStore.enqueueDispense({
      medicationId: rec.medicationId,
      medicationName: rec.medicationName,
      patientId: rec.patientId,
      quantity: rec.quantity,
      dose: rec.dose,
      lotNumber: rec.lotNumber,
      expirationDate: rec.expirationDate,
      dispensedBy: rec.dispensedBy,
      physicianName: rec.physicianName,
      studentName: rec.studentName,
      dispensedAt: rec.dispensedAt,
      indication: rec.indication,
    })
  }

  // Process pending dispenses: create rows in dispensing_logs and adjust stock server-side
  async flushQueue(): Promise<{ processed: number; failed: number }> {
    const pendings = await OfflineStore.getPendingDispenses()
    if (pendings.length === 0) return { processed: 0, failed: 0 }

    let processed = 0
    let failed = 0
    for (const pending of pendings) {
      try {
        await this.createDispenseRemote(pending)
        await OfflineStore.removePendingDispense(pending.id)
        processed++
      } catch (e) {
        console.error('Failed to sync pending dispense', pending, e)
        failed++
      }
    }
    if (processed > 0) await OfflineStore.setLastSync(new Date())
    return { processed, failed }
  }

  private async createDispenseRemote(p: PendingDispense): Promise<void> {
    // 1) Insert into dispensing_logs (include medication_id when available)
    const { error: insertError } = await supabase.from('dispensing_logs').insert({
      // Store the EST calendar date for log_date
      log_date: toESTDateString(p.dispensedAt),
      patient_id: `offline-${p.dispensedAt.getTime()}`,
      medication_id: p.medicationId,
      medication_name: p.medicationName,
      dose_instructions: p.dose,
      lot_number: p.lotNumber,
      expiration_date: p.expirationDate ? p.expirationDate.toISOString().split('T')[0] : null,
      amount_dispensed: `${p.quantity} tabs`,
      physician_name: p.physicianName,
      student_name: 'Offline Sync',
      entered_by: null,
    })
    if (insertError) throw insertError

    // 2) Decrement stock in inventory on server
    // Try to find matching lot first; if not found, decrement from earliest lots until quantity is consumed
    let remaining = p.quantity
    try {
      // Prefer exact lot match
      if (p.lotNumber) {
        const { data: lot, error: lotErr } = await supabase
          .from('inventory')
          .select('id, qty_units')
          .eq('medication_id', p.medicationId)
          .eq('lot_number', p.lotNumber)
          .limit(1)
          .maybeSingle()
        if (!lotErr && lot) {
          const newQty = Math.max(0, (lot.qty_units || 0) - remaining)
          const { error: updErr } = await supabase
            .from('inventory')
            .update({ qty_units: newQty })
            .eq('id', lot.id)
          if (!updErr) return // Fully handled
          console.warn('Inventory update warning (lot)', updErr)
        }
      }

      // Fallback: decrement from earliest-expiring lots for this medication
      const { data: lots, error: lotsErr } = await supabase
        .from('inventory')
        .select('id, qty_units')
        .eq('medication_id', p.medicationId)
        .order('expiration_date', { ascending: true })
      if (lotsErr || !lots || lots.length === 0) return

      for (const lot of lots) {
        if (remaining <= 0) break
        const take = Math.min(remaining, lot.qty_units || 0)
        if (take <= 0) continue
        const { error: updErr } = await supabase
          .from('inventory')
          .update({ qty_units: Math.max(0, (lot.qty_units || 0) - take) })
          .eq('id', lot.id)
        if (!updErr) remaining -= take
      }
    } catch (e) {
      console.warn('Inventory decrement failed (server)', e)
    }
  }
}

export const syncService = new SyncService()
