'use client'

import { useEffect, useState } from 'react'
import {
  listInventoryBySite,
  receiveLot,
  setLotQty,            
  listSites,
  setLotQtyByNumber,    
} from '@/data/inventoryApi'

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
      const names = Array.from(
        new Set((data ?? []).map((d: any) => d.site_name)),
      ).filter(Boolean)
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

  async function handleAdjustLotByNumber(inventory_id: string) {
    const lot = window.prompt('Lot number to adjust (e.g., TEST-LOT-1):')
    if (!lot) return
    const qtyStr = window.prompt('New quantity for this lot (integer):', '40')
    if (!qtyStr) return
    const qty = Number(qtyStr)
    const { error } = await setLotQtyByNumber(inventory_id, lot, qty)
    if (error) alert('Adjust lot error: ' + error.message)
    await load()
  }

  return (
    <main className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Inventory</h1>

      <div className="flex items-center gap-3 mb-6">
        <label className="text-sm">Site</label>
        <select
          className="border rounded px-2 py-1"
          value={site}
          onChange={(e) => setSite(e.target.value)}
        >
          {sites.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button
          onClick={() => load()}
          className="ml-2 rounded bg-black text-white px-3 py-1 text-sm"
        >
          Refresh
        </button>
        <button
          onClick={handleAdjustLot}
          className="ml-2 rounded border px-3 py-1 text-sm"
          title="Dev-only: paste a LOT_ID to adjust its quantity"
        >
          Adjust Lot (by LOT_ID)
        </button>
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
                <td className="py-2 pr-3">
                  <button
                    onClick={() => handleReceiveLot(r.inventory_id)}
                    className="rounded bg-blue-600 text-white px-3 py-1 text-xs mr-2"
                  >
                    Receive lot
                  </button>
                  <button
                    onClick={() => handleAdjustLotByNumber(r.inventory_id)}
                    className="rounded border px-3 py-1 text-xs"
                    title="Adjust by lot number (no UUIDs needed)"
                  >
                    Adjust lot (by number)
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}