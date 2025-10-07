import { supabase } from '@/lib/supabaseClient'


export async function listSites() {
  return supabase
    .from('clinic_sites')
    .select('site_name, clinic_date, is_active')
    .eq('is_active', true)
    .order('clinic_date', { ascending: false })
}

export async function listInventoryBySite(siteName: string) {
  return supabase.rpc('list_inventory_by_site', { p_site_name: siteName })
}


export async function receiveLot(
  inventoryId: string,
  lotNumber: string,
  expirationDate: string, // 'YYYY-MM-DD'
  qty: number
) {
  return supabase.rpc('receive_lot', {
    p_inventory_id: inventoryId,
    p_lot_number: lotNumber,
    p_expiration_date: expirationDate,
    p_qty_units: qty,
  })
}

export async function setLotQty(lotId: string, newQty: number) {
  return supabase.rpc('set_lot_qty', { p_lot_id: lotId, p_new_qty: newQty })
}

export async function setLotQtyByNumber(lotNumber: string, newQty: number) {
  return supabase.rpc('set_lot_qty_by_number', {
    p_lot_number: lotNumber,
    p_new_qty: newQty,
  })
}

export async function mergeLotsByNumber(fromLotNumber: string, intoLotNumber: string) {
  const { data, error } = await supabase.rpc('merge_lots_by_number', {
    p_from_lot_number: fromLotNumber,
    p_into_lot_number: intoLotNumber,
  })
  if (error) throw error
  return data as any
}

export async function deleteLotByNumber(lotNumber: string) {
  const { data, error } = await supabase.rpc('delete_lot_by_number', {
    p_lot_number: lotNumber,
  })
  if (error) throw error
  return data as any
}

/** ---- Inventory row ops ------------------------------------------------- */

export async function setLowStockThreshold(inventoryId: string, threshold: number) {
  const { data, error } = await supabase.rpc('set_low_stock_threshold', {
    p_inventory_id: inventoryId,
    p_threshold: threshold,
  })
  if (error) throw error
  return data as any
}

export async function createInventoryRow(siteId: string, medicationId: string, threshold = 0) {
  const { data, error } = await supabase.rpc('create_inventory_row', {
    p_site_id: siteId,
    p_medication_id: medicationId,
    p_threshold: threshold,
  })
  if (error) throw error
  return data as any
}


export async function dispenseInventoryFefo(inventoryId: string, qty: number) {
  return supabase.rpc('dispense_inventory_fefo', {
    p_inventory_id: inventoryId,
    p_qty: qty,
  })
}

export async function dispenseFromLotByNumber(lotNumber: string, qty: number) {
  return supabase.rpc('dispense_from_lot_by_number', {
    p_lot_number: lotNumber,
    p_qty: qty,
  })
}


export async function listLotsForInventory(inventoryId: string) {
  return supabase
    .from('inventory_lot_view')
    .select('lot_number, expiration_date, lot_qty_units')
    .eq('inventory_id', inventoryId)
    .order('expiration_date', { ascending: true })
}

export async function getLotByNumber(lotNumber: string) {
  return supabase
    .from('inventory_lot_view')
    .select('lot_number, expiration_date, lot_qty_units, inventory_id')
    .eq('lot_number', lotNumber)
    .maybeSingle()
}