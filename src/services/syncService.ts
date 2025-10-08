import { supabase } from '../lib/supabase'
import type { Medication, DispensingRecord } from '../types/medication'
import { OfflineStore, type PendingDispense } from '../utils/offlineStore'

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
  async primeMedicationsCache(): Promise<Medication[]> {
    const { data, error } = await supabase
      .from('medications')
      .select('*')
      .eq('is_active', true)
      .order('name')
    if (error) throw error

    const meds: Medication[] = (data as MedRow[]).map((m) => ({
      id: m.id,
      name: m.name,
      genericName: m.generic_name ?? m.name,
      strength: m.strength || '',
      dosageForm: m.dosage_form || 'tablet',
      category: m.category || 'General',
      currentStock: m.current_stock || 0,
      minStock: m.min_stock ?? 20,
      maxStock: m.max_stock ?? 100,
      isAvailable: (m.is_active ?? true) && ((m.current_stock || 0) > 0),
      lastUpdated: new Date(m.last_updated || new Date()),
      alternatives: [],
      commonUses: [],
      contraindications: [],
    }))
    await OfflineStore.setMedications(meds)
    return meds
  }

  // Real-time subscription to medications changes to keep cache fresh while online
  startMedicationsRealtime(): void {
    if (this.subscription) return
    const channel = supabase.channel('rt-medications')
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'medications' }, async (payload: any) => {
      const evt = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE'
      if (evt === 'DELETE') {
        const oldRow = payload.old as MedRow
        if (!oldRow?.id) return
        // For delete, simply set local stock to 0 to keep a record but mark unavailable
        await OfflineStore.updateMedicationStock(oldRow.id, 0)
        return
      }
      const row = payload.new as MedRow
      if (!row?.id) return
      const med: Medication = {
        id: row.id,
        name: row.name,
        genericName: row.generic_name ?? row.name,
        strength: row.strength || '',
        dosageForm: row.dosage_form || 'tablet',
        category: row.category || 'General',
        currentStock: row.current_stock || 0,
        minStock: row.min_stock ?? 20,
        maxStock: row.max_stock ?? 100,
        isAvailable: ((row.is_active ?? true) && ((row.current_stock || 0) > 0)) || false,
        lastUpdated: new Date(row.last_updated || new Date()),
        alternatives: [],
        commonUses: [],
        contraindications: [],
      }
      // Upsert to offline cache
      await OfflineStore.setMedications([
        ...(await OfflineStore.getAllMedications()).filter((m) => m.id !== med.id),
        med,
      ])
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
      quantity: rec.quantity,
      lotNumber: rec.lotNumber,
      expirationDate: rec.expirationDate,
      dispensedBy: rec.dispensedBy,
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
    // 1) Insert into dispensing_logs
    const { error: insertError } = await supabase.from('dispensing_logs').insert({
      log_date: p.dispensedAt.toISOString().split('T')[0],
      patient_id: `offline-${p.dispensedAt.getTime()}`,
      medication_name: p.medicationName,
      dose_instructions: p.indication,
      lot_number: p.lotNumber,
      expiration_date: p.expirationDate ? p.expirationDate.toISOString().split('T')[0] : null,
      amount_dispensed: `${p.quantity} units`,
      physician_name: p.dispensedBy,
      student_name: 'Offline Sync',
      clinic_site_id: 'f906640b-be89-4beb-9639-888538010c54',
      entered_by: '80a027c2-b810-4ba3-8f40-87a067ab53be',
    })
    if (insertError) throw insertError

    // 2) Decrement stock in medications on server (best-effort; we read current and set)
    // Fetch current stock
    const { data: medRow, error: medErr } = await supabase
      .from('medications')
      .select('id,current_stock')
      .eq('id', p.medicationId)
      .limit(1)
      .maybeSingle()
    if (!medErr && medRow) {
      const newStock = Math.max(0, (medRow.current_stock || 0) - p.quantity)
      const { error: updErr } = await supabase
        .from('medications')
        .update({
          current_stock: newStock,
          is_available: newStock > 0,
          last_updated: new Date().toISOString(),
        })
        .eq('id', medRow.id)
      if (updErr) console.warn('Stock update warning (server)', updErr)
    }
  }
}

export const syncService = new SyncService()
