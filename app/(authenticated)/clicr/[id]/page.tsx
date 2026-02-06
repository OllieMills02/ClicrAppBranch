'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, RotateCcw, User, Users } from 'lucide-react'

type DeviceRow = { id: string; area_id: string; name: string }
type AreaRow = {
  id: string
  name: string
  current_occupancy: number
  count_male?: number
  count_female?: number
}

export default function ClicrDetailPage() {
  const params = useParams()
  const id = typeof params?.id === 'string' ? params.id : ''
  const [device, setDevice] = useState<DeviceRow | null>(null)
  const [area, setArea] = useState<AreaRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!id) return
    const supabase = createClient()
    const { data: dev, error: devErr } = await supabase
      .from('devices')
      .select('id, area_id, name')
      .eq('id', id)
      .single()
    if (devErr || !dev) {
      setError(devErr?.message ?? 'Device not found')
      setDevice(null)
      setArea(null)
      setLoading(false)
      return
    }
    setDevice(dev as DeviceRow)
    const { data: areaData, error: areaErr } = await supabase
      .from('areas')
      .select('id, name, current_occupancy, count_male, count_female')
      .eq('id', (dev as DeviceRow).area_id)
      .single()
    if (areaErr || !areaData) {
      setError(areaErr?.message ?? 'Area not found')
      setArea(null)
      setLoading(false)
      return
    }
    const row = areaData as AreaRow
    setArea({
      ...row,
      count_male: row.count_male ?? 0,
      count_female: row.count_female ?? 0,
    })
    setError(null)
    setLoading(false)
  }, [id])

  useEffect(() => {
    if (!id) {
      setLoading(false)
      setError('Invalid device id')
      return
    }
    fetchData()
  }, [id, fetchData])

  const updateAreaCount = useCallback(
    (kind: 'male' | 'female', delta: number) => {
      if (!area) return
      const male = Math.max(0, (area.count_male ?? 0) + (kind === 'male' ? delta : 0))
      const female = Math.max(0, (area.count_female ?? 0) + (kind === 'female' ? delta : 0))
      // Update UI immediately so taps feel instant
      setArea((prev) =>
        prev
          ? {
              ...prev,
              count_male: male,
              count_female: female,
              current_occupancy: male + female,
            }
          : null
      )
      // Persist in background (no await, no blocking)
      const supabase = createClient()
      const areaId = area.id
      ;(async () => {
        await supabase
          .from('areas')
          .update({
            count_male: male,
            count_female: female,
            updated_at: new Date().toISOString(),
          })
          .eq('id', areaId)
      })()
    },
    [area]
  )

  const clearCount = useCallback(() => {
    if (!area) return
    setArea((prev) =>
      prev
        ? {
            ...prev,
            count_male: 0,
            count_female: 0,
            current_occupancy: 0,
          }
        : null
    )
    const supabase = createClient()
    const areaId = area.id
    ;(async () => {
      await supabase
        .from('areas')
        .update({
          count_male: 0,
          count_female: 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', areaId)
    })()
  }, [area])

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-slate-500">
        Loading…
      </div>
    )
  }

  if (error || !device || !area) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-slate-500 gap-6 p-6">
        <h1 className="text-xl font-bold text-white">Device not found</h1>
        <p className="text-slate-400 text-center max-w-md">
          This device may have been removed or you don&apos;t have access.
        </p>
        <Link href="/clicr" className="text-primary hover:underline font-medium">
          Back to Clicrs
        </Link>
      </div>
    )
  }

  const male = area.count_male ?? 0
  const female = area.count_female ?? 0
  const total = area.current_occupancy ?? male + female

  return (
    <div className="min-h-screen bg-black text-white flex flex-col p-6">
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/clicr"
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Back to Clicrs"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">{area.name}</h1>
          <p className="text-sm text-slate-500">Clicker: {device.name}</p>
        </div>
      </div>

      {/* Total occupancy for this area */}
      <div className="flex flex-col items-center justify-center py-8 mb-10">
        <span className="text-slate-500 text-sm font-medium uppercase tracking-wider mb-2">
          Area occupancy
        </span>
        <span className="text-6xl md:text-7xl font-mono font-bold tabular-nums text-white">
          {total}
        </span>
        <p className="text-slate-500 text-xs mt-2">Shared by all clickers in this area</p>
      </div>

      {/* Male row */}
      <div className="max-w-sm mx-auto w-full mb-6">
        <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-slate-800">
              <User className="w-5 h-5 text-blue-400" />
            </div>
            <span className="font-medium text-white">Male</span>
          </div>
          <span className="text-2xl font-mono font-bold tabular-nums text-white w-12 text-center">
            {male}
          </span>
          <div className="flex gap-3">
            <button
              type="button"
              disabled={male <= 0}
              onClick={() => updateAreaCount('male', -1)}
              className="min-w-[3.5rem] min-h-[3.5rem] w-14 h-14 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 font-bold text-xl disabled:opacity-40 disabled:pointer-events-none active:scale-95 transition-[transform,colors] duration-75 touch-manipulation select-none"
            >
              −
            </button>
            <button
              type="button"
              onClick={() => updateAreaCount('male', 1)}
              className="min-w-[3.5rem] min-h-[3.5rem] w-14 h-14 rounded-xl bg-slate-800 hover:bg-blue-500/20 text-slate-300 hover:text-blue-400 font-bold text-xl active:scale-95 transition-[transform,colors] duration-75 touch-manipulation select-none"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Female row */}
      <div className="max-w-sm mx-auto w-full">
        <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-slate-800">
              <Users className="w-5 h-5 text-pink-400" />
            </div>
            <span className="font-medium text-white">Female</span>
          </div>
          <span className="text-2xl font-mono font-bold tabular-nums text-white w-12 text-center">
            {female}
          </span>
          <div className="flex gap-3">
            <button
              type="button"
              disabled={female <= 0}
              onClick={() => updateAreaCount('female', -1)}
              className="min-w-[3.5rem] min-h-[3.5rem] w-14 h-14 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 font-bold text-xl disabled:opacity-40 disabled:pointer-events-none active:scale-95 transition-[transform,colors] duration-75 touch-manipulation select-none"
            >
              −
            </button>
            <button
              type="button"
              onClick={() => updateAreaCount('female', 1)}
              className="min-w-[3.5rem] min-h-[3.5rem] w-14 h-14 rounded-xl bg-slate-800 hover:bg-pink-500/20 text-slate-300 hover:text-pink-400 font-bold text-xl active:scale-95 transition-[transform,colors] duration-75 touch-manipulation select-none"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Clear count */}
      <div className="max-w-sm mx-auto w-full mt-8">
        <button
          type="button"
          onClick={clearCount}
          disabled={total === 0}
          className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-400 hover:text-white font-medium text-sm disabled:opacity-40 disabled:pointer-events-none active:scale-[0.98] transition-[transform,colors] duration-75 touch-manipulation select-none border border-slate-700/80"
        >
          <RotateCcw className="w-4 h-4 shrink-0" />
          Clear count
        </button>
      </div>
    </div>
  )
}
