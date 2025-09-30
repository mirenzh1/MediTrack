import { supabase } from '../lib/supabase'
import { Medication, InventoryItem, DispensingRecord, User } from '../types/medication'

export class MedicationService {

  // Medications
  static async getAllMedications(): Promise<Medication[]> {
    const { data, error } = await supabase
      .from('medications')
      .select('*')
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
      currentStock: Math.floor(Math.random() * 100) + 10, // Random stock for demo
      minStock: 20,
      maxStock: 100,
      isAvailable: true,
      lastUpdated: new Date(),
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
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .order('expiration_date')

    if (error) {
      console.error('Error fetching all inventory:', error)
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

  // Dispensing Records
  static async getAllDispensingRecords(): Promise<DispensingRecord[]> {
    const { data, error } = await supabase
      .from('dispensing_logs')
      .select('*')
      .order('date', { ascending: false })

    if (error) {
      console.error('Error fetching dispensing records:', error)
      throw new Error('Failed to fetch dispensing records')
    }

    return data?.map(record => ({
      id: record.id,
      medicationId: record.medication || '',
      medicationName: record.medication,
      patientInitials: record.patient_id.split('-')[0] + '.' + record.patient_id.split('-')[1].slice(0,1) + '.',
      quantity: parseInt(record.amount?.replace(/\D/g, '') || '1'),
      lotNumber: record.lot_exp?.split(',')[0] || '',
      dispensedBy: record.physician,
      dispensedAt: new Date(record.date),
      indication: record.dose || '',
      notes: `Student: ${record.student}, Site: ${record.site}`
    })) || []
  }

  static async createDispensingRecord(record: Omit<DispensingRecord, 'id'>): Promise<DispensingRecord> {
    const { data, error } = await supabase
      .from('dispensing_logs')
      .insert({
        date: record.dispensedAt.toISOString().split('T')[0],
        patient_id: `2025-${Math.floor(Math.random() * 1000)}`,
        medication: record.medicationName,
        dose: record.indication,
        lot_exp: record.lotNumber,
        amount: `${record.quantity} tabs`,
        physician: record.dispensedBy,
        student: 'New Entry',
        site: 'Clinic'
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
      medicationName: data.medication,
      patientInitials: data.patient_id.split('-')[0] + '.' + data.patient_id.split('-')[1].slice(0,1) + '.',
      quantity: record.quantity,
      lotNumber: record.lotNumber,
      dispensedBy: data.physician,
      dispensedAt: new Date(data.date),
      indication: data.dose,
      notes: `Student: ${data.student}, Site: ${data.site}`
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
}