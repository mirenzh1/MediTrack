import { supabase } from '@/lib/supabaseClient'

// List inventory for sites
export async function listInventoryBySite(siteName: string) {
  return supabase.rpc('list_inventory_by_site', { p_site_name: siteName })
}

// Receive a new lot
export async function receiveLot(inventoryId: string, lotNumber: string, expirationDate: string, qty: number) {
  return supabase.rpc('receive_lot', {
    p_inventory_id: inventoryId,
    p_lot_number: lotNumber,
    p_expiration_date: expirationDate,
    p_qty_units: qty,
  })
}
// Adjust new lot
export async function setLotQty(lotId: string, newQty: number) {
  return supabase.rpc('set_lot_qty', {
    p_lot_id: lotId,
    p_new_qty: newQty,
  })
}

export async function listSites() {
  return supabase
    .from('clinic_sites')
    .select('site_name, clinic_date, is_active')
    .eq('is_active', true)
    .order('clinic_date', { ascending: false })
}

export async function setLotQtyByNumber(inventoryId: string, lotNumber: string, newQty: number) {
  return supabase.rpc('set_lot_qty_by_number', {
    p_inventory_id: inventoryId,
    p_lot_number: lotNumber,
    p_new_qty: newQty,
  })
}