'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { DailyEntry } from '@/lib/types'
import {
  CheckCircle2,
  XCircle,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PiggyBank,
  Calendar,
} from 'lucide-react'

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 2,
  }).format(amount)
}

function formatShort(amount: number): string {
  const abs = Math.abs(amount)
  const sign = amount < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}฿${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${sign}฿${(abs / 1_000).toFixed(1)}K`
  return `${sign}฿${abs.toLocaleString('th-TH', { minimumFractionDigits: 0 })}`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('th-TH', {
    month: 'short',
    day: 'numeric',
    year: '2-digit',
  })
}

function StatCard({
  label,
  value,
  icon,
  highlight = false,
  negative = false,
}: {
  label: string
  value: number
  icon: React.ReactNode
  highlight?: boolean
  negative?: boolean
}) {
  return (
    <div
      className={`rounded-xl border shadow-sm p-3 ${
        highlight
          ? 'border-green-200 bg-green-50'
          : negative
          ? 'border-orange-100 bg-orange-50'
          : 'border-gray-100 bg-white'
      }`}
    >
      <div className="mb-2">{icon}</div>
      <p className="text-xs text-gray-500 leading-tight mb-1">{label}</p>
      <p
        className={`font-bold text-sm ${
          highlight ? 'text-green-700' : negative ? 'text-orange-700' : 'text-gray-800'
        }`}
      >
        {formatShort(value)}
      </p>
    </div>
  )
}

export default function OwnerDashboard() {
  const [entries, setEntries] = useState<DailyEntry[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const today = new Date().toISOString().split('T')[0]

  const fetchEntries = useCallback(async () => {
    const { data } = await supabase
      .from('daily_entries')
      .select('*')
      .order('date', { ascending: false })
    if (data) setEntries(data)
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchEntries()

    const channel = supabase
      .channel('daily_entries_owner')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'daily_entries' },
        () => fetchEntries()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchEntries, supabase])

  const todayEntry = entries.find((e) => e.date === today)
  const totalSales = entries.reduce((s, e) => s + e.sales, 0)
  const totalCost = entries.reduce((s, e) => s + e.cost, 0)
  const accumulatedProfit = totalSales - totalCost

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* ── Today's status ── */}
      <div
        className={`rounded-2xl p-5 flex items-center gap-4 border ${
          todayEntry
            ? 'bg-green-50 border-green-200'
            : 'bg-red-50 border-red-200'
        }`}
      >
        {todayEntry ? (
          <CheckCircle2 className="h-10 w-10 text-green-600 flex-shrink-0" />
        ) : (
          <XCircle className="h-10 w-10 text-red-500 flex-shrink-0" />
        )}
        <div className="flex-1">
          <p
            className={`font-bold text-lg leading-tight ${
              todayEntry ? 'text-green-800' : 'text-red-700'
            }`}
          >
            {todayEntry ? 'บันทึกข้อมูลวันนี้แล้ว' : 'ยังไม่มีข้อมูลวันนี้'}
          </p>
          <p className={`text-sm ${todayEntry ? 'text-green-600' : 'text-red-500'}`}>
            {todayEntry
              ? `บันทึกเมื่อ ${new Date(todayEntry.submitted_at).toLocaleTimeString('th-TH', {
                  hour: '2-digit',
                  minute: '2-digit',
                })} น.`
              : 'รอพนักงานกรอกข้อมูล'}
          </p>
        </div>
        <span
          className={`text-xs font-semibold px-3 py-1.5 rounded-full ${
            todayEntry
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'
          }`}
        >
          {new Date().toLocaleDateString('th-TH', { month: 'short', day: 'numeric' })}
        </span>
      </div>

      {/* ── Summary stats ── */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="ยอดขายรวม"
          value={totalSales}
          icon={<TrendingUp className="h-5 w-5 text-blue-500" />}
        />
        <StatCard
          label="ต้นทุนรวม"
          value={totalCost}
          icon={<TrendingDown className="h-5 w-5 text-orange-500" />}
          negative
        />
        <StatCard
          label="กำไรรวม"
          value={accumulatedProfit}
          icon={<BarChart3 className="h-5 w-5 text-green-600" />}
          highlight
        />
      </div>

      {/* ── Accumulated profit / salary fund ── */}
      <div className="bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl p-5 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-white/20 p-2 rounded-xl">
            <PiggyBank className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-purple-200 text-xs uppercase tracking-wider">กองทุนเงินเดือน</p>
            <p className="text-white font-semibold text-sm">กำไรสะสมทั้งหมด</p>
          </div>
        </div>
        <p className="text-4xl font-bold tracking-tight">
          {formatCurrency(accumulatedProfit)}
        </p>
        <div className="flex items-center justify-between mt-3">
          <p className="text-purple-300 text-xs">คำนวณจากข้อมูลทั้งหมด {entries.length} วัน</p>
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              accumulatedProfit >= 0
                ? 'bg-green-500/30 text-green-200'
                : 'bg-red-400/30 text-red-200'
            }`}
          >
            {accumulatedProfit >= 0 ? 'กำไร' : 'ขาดทุน'}
          </span>
        </div>
      </div>

      {/* ── Daily entries table ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-400" />
            <h3 className="font-semibold text-gray-800">ประวัติรายวัน</h3>
          </div>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {entries.length} รายการ
          </span>
        </div>

        {entries.length === 0 ? (
          <div className="py-14 text-center text-gray-400">
            <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-25" />
            <p className="text-sm">ยังไม่มีข้อมูล</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    วันที่
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    ยอดขาย
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    ต้นทุน
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    กำไร
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {entries.map((entry) => {
                  const profit = entry.sales - entry.cost
                  const isToday = entry.date === today
                  return (
                    <tr
                      key={entry.id}
                      className={isToday ? 'bg-blue-50' : 'hover:bg-gray-50 transition-colors'}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-medium ${
                              isToday ? 'text-blue-700' : 'text-gray-800'
                            }`}
                          >
                            {formatDate(entry.date)}
                          </span>
                          {isToday && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">
                              วันนี้
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700">
                        {formatShort(entry.sales)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700">
                        {formatShort(entry.cost)}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-semibold ${
                          profit >= 0 ? 'text-green-600' : 'text-red-500'
                        }`}
                      >
                        {profit >= 0 ? '+' : ''}
                        {formatShort(profit)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>

              {/* Footer totals row */}
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-200">
                  <td className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">
                    รวมทั้งหมด
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-gray-800">
                    {formatShort(totalSales)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-gray-800">
                    {formatShort(totalCost)}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-bold ${
                      accumulatedProfit >= 0 ? 'text-green-700' : 'text-red-600'
                    }`}
                  >
                    {accumulatedProfit >= 0 ? '+' : ''}
                    {formatShort(accumulatedProfit)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
