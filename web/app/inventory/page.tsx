'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'

import {
  listInventoryBySite,
  listSites,
  receiveLot,
  setLotQty,           
  setLotQtyByNumber,   
} from '@/data/inventoryApi'

import { dispenseAndLog } from '@/data/dispenseBridge' 

type Row = {
  inventory_id: string
  medication_name: string
  medication_strength: string | null
  dosage_form: string | null
  site_name: string
  total_qty_units: number
  low_stock_threshold: number
  is_low_stock: boolean
  is_out_of_stock: boolean
  soonest_expiration: string | null
}

export default function InventoryPage() {
  const [sites, setSites] = useState<string[]>([])
  const [site, setSite] = useState<string>('') 
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const { data, error } = await listSites()
      if (error) {
        setError(error.message)
        return
      }
      const names = Array.from(new Set((data ?? []).map((d: any) => d.site_name))).filter(Boolean)
      setSites(names)
      if (!site && names.length) setSite(names[0])
    })()
    
  }, [])

  useEffect(() => {
    if (site) void load()
    
  }, [site])

  async function load() {
    setLoading(true)
    setError(null)
    const { data, error } = await listInventoryBySite(site)
    if (error) setError(error.message)
    setRows((data as Row[]) ?? [])
    setLoading(false)
  }

  // Receive a new lot
  async function handleReceiveLot(inventory_id: string) {
    const lot = window.prompt('Lot number (e.g., TEST-LOT-2026):')
    if (!lot) return
    const exp = window.prompt('Expiration date (YYYY-MM-DD):', '2026-12-31')
    if (!exp) return
    const qtyStr = window.prompt('Quantity to add (integer):', '50')
    if (!qtyStr) return
    const qty = Number(qtyStr)
    const { error } = await receiveLot(inventory_id, lot, exp, qty)
    if (error) alert('Receive lot error: ' + error.message)
    await load()
  }

  async function handleAdjustLot() {
    const lotId = window.prompt('LOT_ID to adjust:')
    if (!lotId) return
    const qtyStr = window.prompt('New quantity for this lot (integer):', '40')
    if (!qtyStr) return
    const qty = Number(qtyStr)
    const { error } = await setLotQty(lotId, qty)
    if (error) alert('Set lot qty error: ' + error.message)
    await load()
  }

  async function handleAdjustLotByNumber() {
    const lot = window.prompt('Lot number to adjust (e.g., TEST-LOT-1):')
    if (!lot) return
    const qtyStr = window.prompt('New quantity for this lot (integer):', '40')
    if (!qtyStr) return
    const qty = Number(qtyStr)
    const { error } = await setLotQtyByNumber(lot, qty)
    if (error) alert('Adjust lot error: ' + error.message)
    await load()
  }

  async function handleDispenseFEFO(row: Row) {
    const qtyStr = window.prompt(`Dispense how many ${row.medication_name}?`, '1')
    if (!qtyStr) return
    const qty = Number(qtyStr)
    if (!Number.isFinite(qty) || qty <= 0) {
      alert('Quantity must be a positive number')
      return
    }
    const patientId = window.prompt('Patient ID (YYYY_NNNN):', '2025_0001')
    if (!patientId) return
    const studentName = window.prompt('Student name (optional):') || undefined
    const preceptorName = window.prompt('Preceptor name (optional):') || undefined
    const dose = window.prompt('Dose instructions (optional):') || undefined

    try {
      const res = await dispenseAndLog({
        inventoryId: row.inventory_id,
        qty,
        patientId,
        doseInstructions: dose,
        studentName,
        preceptorName,
        unit: 'tabs',
        enteredBy: studentName,
        notes: 'FEFO dispense',
      })
      await load()

      if (res.logErrors?.length) {
        alert(
          `Dispensed, but some logs failed:\n` +
          res.logErrors.map(e => `${e.lot_number}: ${e.error}`).join('\n')
        )
      } else {
        alert('Dispensed successfully.')
      }
    } catch (e: any) {
      alert('Dispense error: ' + (e?.message ?? String(e)))
    }
  }

  return (
    <main className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Inventory</h1>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-6">
        <div className="text-sm">Site</div>
        <Select
          value={site}
          onChange={setSite}
          options={sites.map(s => ({ value: s, label: s }))}
        />
        <Button variant="outline" onClick={() => load()}>Refresh</Button>
        <Button variant="outline" onClick={handleAdjustLot} title="Dev-only: paste a LOT_ID to adjust its quantity">
          Adjust Lot (by LOT_ID)
        </Button>
        <Button variant="outline" onClick={handleAdjustLotByNumber} title="Adjust by lot number (no UUIDs needed)">
          Adjust lot (by number)
        </Button>
      </div>

      {loading && <p>Loading…</p>}
      {error && <p className="text-red-600">{error}</p>}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-3">Medication</th>
              <th className="py-2 pr-3">Form</th>
              <th className="py-2 pr-3">Total Qty</th>
              <th className="py-2 pr-3">Soonest Exp</th>
              <th className="py-2 pr-3">Low stock</th>
              <th className="py-2 pr-3">Out of stock</th>
              <th className="py-2 pr-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading && (
              <tr>
                <td colSpan={7} className="py-6 text-gray-500">
                  No inventory rows for this site.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.inventory_id} className="border-b">
                <td className="py-2 pr-3">
                  <div className="font-medium">{r.medication_name}</div>
                  <div className="text-gray-500">
                    {r.medication_strength ?? ''}{' '}
                    {r.inventory_id ? `· inv ${r.inventory_id.slice(0, 8)}…` : ''}
                  </div>
                </td>
                <td className="py-2 pr-3">{r.dosage_form ?? ''}</td>
                <td className="py-2 pr-3">{r.total_qty_units}</td>
                <td className="py-2 pr-3">{r.soonest_expiration ?? '—'}</td>
                <td className="py-2 pr-3">{r.is_low_stock ? '⚠️' : ''}</td>
                <td className="py-2 pr-3">{r.is_out_of_stock ? '❌' : ''}</td>
                <td className="py-2 pr-3 space-x-2">
                  <Button onClick={() => handleReceiveLot(r.inventory_id)} size="sm">
                    Receive lot
                  </Button>
                  <Button
                    onClick={() => handleDispenseFEFO(r)}
                    className="bg-green-600 text-white hover:bg-green-700"
                    size="sm"
                    title="Dispense using FEFO and log"
                  >
                    Dispense
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}