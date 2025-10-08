import { supabase } from '../lib/supabase'
import { Medication, InventoryItem, DispensingRecord, User } from '../types/medication'

export class MedicationService {

  // Medications
  static async getAllMedications(): Promise<Medication[]> {
    const { data, error } = await supabase
      .from('medications')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (error) {
      console.error('Error fetching medications:', error)
      throw new Error('Failed to fetch medications')
    }

    return data?.map(med => ({
      id: med.id,
      name: med.name,
      genericName: med.name, // Using name as generic name for imported data
      strength: med.strength || '',
      dosageForm: med.dosage_form || 'tablet',
      category: 'General', // Default category
      currentStock: med.current_stock || 0, // Use actual stock from database
      minStock: 20,
      maxStock: 100,
      isAvailable: med.is_active && (med.current_stock || 0) > 0,
      lastUpdated: new Date(med.created_at || new Date()),
      alternatives: [],
      commonUses: [],
      contraindications: []
    })) || []
  }

  static async getMedicationById(id: string): Promise<Medication | null> {
    const { data, error } = await supabase
      .from('medications')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching medication:', error)
      return null
    }

    if (!data) return null

    return {
      id: data.id,
      name: data.name,
      genericName: data.generic_name,
      strength: data.strength,
      dosageForm: data.dosage_form,
      category: data.category,
      currentStock: data.current_stock,
      minStock: data.min_stock,
      maxStock: data.max_stock,
      isAvailable: data.is_available,
      lastUpdated: new Date(data.last_updated),
      alternatives: data.alternatives || [],
      commonUses: data.common_uses || [],
      contraindications: data.contraindications || []
    }
  }

  static async updateMedicationStock(medicationId: string, newStock: number): Promise<void> {
    const { error } = await supabase
      .from('medications')
      .update({
        current_stock: newStock,
        is_available: newStock > 0,
        last_updated: new Date().toISOString()
      })
      .eq('id', medicationId)

    if (error) {
      console.error('Error updating medication stock:', error)
      throw new Error('Failed to update medication stock')
    }
  }

  // Inventory
  static async getInventoryByMedicationId(medicationId: string): Promise<InventoryItem[]> {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('medication_id', medicationId)
      .order('expiration_date')

    if (error) {
      console.error('Error fetching inventory:', error)
      throw new Error('Failed to fetch inventory')
    }

    return data?.map(item => ({
      id: item.id,
      medicationId: item.medication_id,
      lotNumber: item.lot_number,
      expirationDate: new Date(item.expiration_date),
      quantity: item.quantity,
      isExpired: new Date(item.expiration_date) < new Date()
    })) || []
  }

  static async getAllInventory(): Promise<InventoryItem[]> {
    // TODO: inventory_items table doesn't exist yet
    // Return empty array for now
    console.warn('inventory_items table not yet implemented')
    return []
  }

  // Dispensing Records
  static async getAllDispensingRecords(): Promise<DispensingRecord[]> {
    const { data, error } = await supabase
      .from('dispensing_logs')
      .select('*')
      .order('log_date', { ascending: false })

    if (error) {
      console.error('Error fetching dispensing records:', error)
      throw new Error('Failed to fetch dispensing records')
    }

    return data?.map(record => ({
      id: record.id,
      medicationId: record.medication_name || '',
      medicationName: record.medication_name,
      patientInitials: record.patient_id?.split('-')[0] + '.' + (record.patient_id?.split('-')[1]?.slice(0,1) || '') + '.',
      quantity: parseInt(record.amount_dispensed?.replace(/\D/g, '') || '1'),
  lotNumber: record.lotNumber || '',
      dispensedBy: record.physician_name || '',
      dispensedAt: new Date(record.log_date),
      indication: record.dose_instructions || '',
      notes: `Student: ${record.student_name || 'N/A'}`
    })) || []
  }

  static async createDispensingRecord(record: Omit<DispensingRecord, 'id'>): Promise<DispensingRecord> {
    const { data, error } = await supabase
      .from('dispensing_logs')
      .insert({
        log_date: record.dispensedAt.toISOString().split('T')[0],
        patient_id: `2025-${Math.floor(Math.random() * 1000)}`,
        medication_name: record.medicationName,
        dose_instructions: record.indication,
        lot_number: record.lotNumber,
        expiration_date: record.expirationDate ? record.expirationDate.toISOString().split('T')[0] : null,
        amount_dispensed: `${record.quantity} tabs`,
        physician_name: record.dispensedBy,
        student_name: 'New Entry',
        clinic_site_id: 'f906640b-be89-4beb-9639-888538010c54',
        entered_by: '80a027c2-b810-4ba3-8f40-87a067ab53be'
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating dispensing record:', error)
      throw new Error('Failed to create dispensing record')
    }

    return {
      id: data.id,
      medicationId: record.medicationId,
      medicationName: data.medication_name,
      patientInitials: data.patient_id?.split('-')[0] + '.' + (data.patient_id?.split('-')[1]?.slice(0,1) || '') + '.',
      quantity: record.quantity,
  lotNumber: record.lotNumber || '',
      expirationDate: record.expirationDate,
      dispensedBy: data.physician_name,
      dispensedAt: new Date(data.log_date),
      indication: data.dose_instructions,
      notes: `Student: ${data.student_name || 'N/A'}`
    }
  }

  // Users
  static async getAllUsers(): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('first_name')

    if (error) {
      console.error('Error fetching users:', error)
      throw new Error('Failed to fetch users')
    }

    return data?.map(user => ({
      id: user.id,
      name: `${user.first_name} ${user.last_name}`.trim(),
      role: user.role === 'pharmacy_staff' ? 'pharmacy_staff' : 'provider',
      initials: user.first_name?.charAt(0) + user.last_name?.charAt(0) || user.first_name?.substring(0, 2) || 'XX'
    })) || []
  }

  // Bulk Import for Inventory
  static async bulkImportInventory(items: Array<{
    name: string
    strength: string
    quantity: number
    lotNumber?: string
    expirationDate?: string
    dosageForm?: string
  }>, siteId: string, userId: string): Promise<{ success: number; failed: number; errors: string[] }> {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    }

    // Get default clinic site if not provided
    let clinicSiteId = siteId
    if (!clinicSiteId) {
      const { data: sites } = await supabase
        .from('clinic_sites')
        .select('id')
        .eq('is_active', true)
        .limit(1)
        .single()

      clinicSiteId = sites?.id || ''
    }

    if (!clinicSiteId) {
      throw new Error('No active clinic site found')
    }

    // Process each item
    for (const item of items) {
      try {
        // 1. Check if medication exists in medications_new table
        const { data: existingMed, error: searchError } = await supabase
          .from('medications_new')
          .select('id')
          .eq('name', item.name)
          .eq('strength', item.strength)
          .eq('dosage_form', item.dosageForm || 'tablet')
          .single()

        let medicationId: string

        if (existingMed) {
          // Medication exists, use existing ID
          medicationId = existingMed.id
        } else {
          // Medication doesn't exist, create new one
          const { data: newMed, error: createError } = await supabase
            .from('medications_new')
            .insert({
              name: item.name,
              strength: item.strength,
              dosage_form: item.dosageForm || 'tablet',
              is_active: true
            })
            .select('id')
            .single()

          if (createError || !newMed) {
            results.failed++
            results.errors.push(`Failed to create medication ${item.name}: ${createError?.message}`)
            continue
          }

          medicationId = newMed.id
        }

        // 2. Generate lot number and expiration date if not provided
        const lotNumber = item.lotNumber || `BULK-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`
        const expirationDate = item.expirationDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // +1 year

        // 3. Create inventory record in inventory_new
        const { error: inventoryError } = await supabase
          .from('inventory_new')
          .insert({
            medication_id: medicationId,
            site_id: clinicSiteId,
            lot_number: lotNumber,
            expiration_date: expirationDate,
            qty_units: item.quantity,
            low_stock_threshold: 10,
            notes: item.lotNumber ? 'Imported from formulary' : 'Bulk import - placeholder lot number, please update'
          })

        if (inventoryError) {
          results.failed++
          results.errors.push(`Failed to create inventory for ${item.name}: ${inventoryError.message}`)
        } else {
          results.success++
        }

      } catch (error) {
        results.failed++
        results.errors.push(`Error processing ${item.name}: ${error}`)
      }
    }

    return results
  }
}