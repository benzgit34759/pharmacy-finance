'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { DailyEntry } from '@/lib/types'
import {
  CheckCircle2,
  XCircle,
  TrendingUp,
  Wallet,
  Building2,
  Lock,
  AlertCircle,
  AlertTriangle,
  BadgeCheck,
  PiggyBank,
  Calendar,
  BarChart3,
  Sparkles,
  Trash2,
  ArrowDownLeft,
  ArrowUpRight,
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

// ── Difference indicator ───────────────────────────────────
function DiffBadge({ diff }: { diff: number }) {
  if (diff === 0) {
    return (
      <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
        <BadgeCheck className="h-5 w-5 text-green-600 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-green-800">ยอดถูกต้อง</p>
          <p className="text-xs text-green-600">เงินสด + โอน ตรงกับยอดขายพอดี</p>
        </div>
      </div>
    )
  }
  if (diff > 0) {
    return (
      <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
        <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-red-700">เงินขาด {formatCurrency(diff)}</p>
          <p className="text-xs text-red-500">ได้รับเงินน้อยกว่ายอดขาย</p>
        </div>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
      <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
      <div>
        <p className="text-sm font-semibold text-amber-700">เงินเกิน {formatCurrency(Math.abs(diff))}</p>
        <p className="text-xs text-amber-500">ได้รับเงินมากกว่ายอดขาย</p>
      </div>
    </div>
  )
}

export default function UnifiedView({ userId }: { userId: string }) {
  const [entries, setEntries]     = useState<DailyEntry[]>([])
  const [loading, setLoading]     = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting]   = useState(false)

  // Form — user inputs sales, profit, cash, transfer
  const [sales,        setSales]        = useState('')
  const [profit,       setProfit]       = useState('')
  const [cash,         setCash]         = useState('')
  const [transfer,     setTransfer]     = useState('')
  const [borrowProfit, setBorrowProfit] = useState('')
  const [returnProfit, setReturnProfit] = useState('')

  const supabase    = createClient()
  const today       = new Date().toISOString().split('T')[0]
  const displayDate = new Date().toLocaleDateString('th-TH', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  // Live preview while filling form
  const salesNum        = parseFloat(sales)        || 0
  const profitNum       = parseFloat(profit)       || 0
  const cashNum         = parseFloat(cash)         || 0
  const transferNum     = parseFloat(transfer)     || 0
  const borrowProfitNum = parseFloat(borrowProfit) || 0
  const returnProfitNum = parseFloat(returnProfit) || 0
  const costPreview     = salesNum - profitNum
  const diffPreview     = salesNum - (cashNum + transferNum)
  const netProfitPreview = profitNum - borrowProfitNum + returnProfitNum

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
    const ch = supabase
      .channel('unified')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_entries' }, fetchEntries)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [fetchEntries, supabase])

  const todayEntry = entries.find((e) => e.date === today)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const cost = salesNum - profitNum  // ต้นทุน = ยอดขาย - กำไร

    const { error } = await supabase.from('daily_entries').insert({
      date:          today,
      sales:         salesNum,
      cost:          cost,
      cash_on_hand:  cashNum,
      bank_balance:  transferNum,
      borrow_profit: borrowProfitNum,
      return_profit: returnProfitNum,
      submitted_by:  userId,
      is_locked:     true,
    })

    if (error) {
      setError(error.code === '23505' ? 'มีข้อมูลของวันนี้แล้ว' : 'เกิดข้อผิดพลาด: ' + error.message)
    } else {
      await fetchEntries()
    }
    setSubmitting(false)
  }

  async function handleDelete(id: string) {
    setDeleting(true)
    await supabase.from('daily_entries').delete().eq('id', id)
    setConfirmDeleteId(null)
    await fetchEntries()
    setDeleting(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-5">

      {/* ── 1. Status ─────────────────────────────────────── */}
      <div className={`rounded-2xl p-5 flex items-center gap-4 border ${
        todayEntry ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
      }`}>
        {todayEntry
          ? <CheckCircle2 className="h-12 w-12 text-green-600 flex-shrink-0" />
          : <XCircle      className="h-12 w-12 text-red-500   flex-shrink-0" />
        }
        <div className="flex-1 min-w-0">
          <p className={`font-bold text-lg leading-tight ${todayEntry ? 'text-green-800' : 'text-red-700'}`}>
            {todayEntry ? 'บันทึกข้อมูลวันนี้แล้ว' : 'ยังไม่ได้บันทึกวันนี้'}
          </p>
          <p className={`text-sm mt-0.5 ${todayEntry ? 'text-green-600' : 'text-red-500'}`}>
            {todayEntry
              ? `บันทึกเมื่อ ${new Date(todayEntry.submitted_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.`
              : displayDate}
          </p>
        </div>
        <span className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full ${
          todayEntry ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {new Date().toLocaleDateString('th-TH', { month: 'short', day: 'numeric' })}
        </span>
      </div>

      {/* ── 2. Form / Locked state ────────────────────────── */}
      {todayEntry ? (
        // Locked view — show stored data
        (() => {
          const storedProfit = todayEntry.sales - todayEntry.cost
          const diff         = todayEntry.sales - (todayEntry.cash_on_hand + todayEntry.bank_balance)
          return (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gray-50 px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                <Lock className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-600">ข้อมูลที่บันทึกวันนี้</span>
              </div>
              <div className="p-5 space-y-3">

                {/* Sales & Profit */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <TrendingUp className="h-4 w-4 text-blue-500" />
                      <span className="text-xs text-blue-600 font-medium">ยอดขาย</span>
                    </div>
                    <p className="text-lg font-bold text-blue-800">{formatShort(todayEntry.sales)}</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Sparkles className="h-4 w-4 text-green-500" />
                      <span className="text-xs text-green-600 font-medium">กำไร</span>
                    </div>
                    <p className="text-lg font-bold text-green-800">{formatShort(storedProfit)}</p>
                  </div>
                </div>

                {/* Cost to keep */}
                <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PiggyBank className="h-5 w-5 text-orange-500" />
                    <span className="text-sm font-medium text-orange-700">เงินที่ต้องเก็บซื้อยา</span>
                  </div>
                  <span className="font-bold text-orange-800 text-lg">{formatCurrency(todayEntry.cost)}</span>
                </div>

                {/* Cash & Transfer */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <Wallet className="h-4 w-4 text-gray-500" />
                      <span className="text-xs text-gray-500">เงินสดรับ</span>
                    </div>
                    <span className="font-semibold text-gray-800 text-sm">{formatShort(todayEntry.cash_on_hand)}</span>
                  </div>
                  <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="h-4 w-4 text-gray-500" />
                      <span className="text-xs text-gray-500">เงินโอนรับ</span>
                    </div>
                    <span className="font-semibold text-gray-800 text-sm">{formatShort(todayEntry.bank_balance)}</span>
                  </div>
                </div>

                {/* Borrow / Return (show only if non-zero) */}
                {(todayEntry.borrow_profit > 0 || todayEntry.return_profit > 0) && (
                  <div className="space-y-2">
                    {todayEntry.borrow_profit > 0 && (
                      <div className="flex items-center justify-between bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <ArrowDownLeft className="h-4 w-4 text-amber-500" />
                          <span className="text-sm text-amber-700">ยืมกำไรซื้อยา</span>
                        </div>
                        <span className="font-semibold text-amber-800">{formatCurrency(todayEntry.borrow_profit)}</span>
                      </div>
                    )}
                    {todayEntry.return_profit > 0 && (
                      <div className="flex items-center justify-between bg-teal-50 border border-teal-100 rounded-xl px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <ArrowUpRight className="h-4 w-4 text-teal-500" />
                          <span className="text-sm text-teal-700">คืนกำไรที่ยืมมา</span>
                        </div>
                        <span className="font-semibold text-teal-800">{formatCurrency(todayEntry.return_profit)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5">
                      <span className="text-sm font-semibold text-gray-700">กำไรสุทธิ</span>
                      <span className={`font-bold text-lg ${storedProfit - todayEntry.borrow_profit + todayEntry.return_profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {formatCurrency(storedProfit - todayEntry.borrow_profit + todayEntry.return_profit)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Difference */}
                <DiffBadge diff={diff} />

              </div>
            </div>
          )
        })()
      ) : (
        // Entry form
        <form onSubmit={handleSubmit} className="space-y-3">
          <p className="text-xs text-gray-400 uppercase tracking-wider text-center pb-1">
            กรอกข้อมูลประจำวัน
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Sales */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              ยอดขาย
            </label>
            <div className="flex items-center gap-1">
              <span className="text-gray-400 text-sm font-medium">฿</span>
              <input
                type="number" inputMode="decimal" placeholder="0.00"
                value={sales} onChange={(e) => setSales(e.target.value)}
                required min="0" step="0.01"
                className="flex-1 text-right text-xl font-bold text-gray-900 outline-none placeholder:text-gray-200 bg-transparent"
              />
            </div>
          </div>

          {/* Profit */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-2">
              <Sparkles className="h-4 w-4 text-green-500" />
              กำไร
            </label>
            <div className="flex items-center gap-1">
              <span className="text-gray-400 text-sm font-medium">฿</span>
              <input
                type="number" inputMode="decimal" placeholder="0.00"
                value={profit} onChange={(e) => setProfit(e.target.value)}
                required min="0" step="0.01"
                className="flex-1 text-right text-xl font-bold text-gray-900 outline-none placeholder:text-gray-200 bg-transparent"
              />
            </div>
          </div>

          {/* Auto-calculated cost preview */}
          {(salesNum > 0 || profitNum > 0) && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PiggyBank className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium text-orange-700">ต้นทุน (คำนวณอัตโนมัติ)</span>
              </div>
              <span className="font-bold text-orange-800">{formatCurrency(costPreview)}</span>
            </div>
          )}

          {/* Cash */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-2">
              <Wallet className="h-4 w-4 text-purple-500" />
              เงินสดรับวันนี้
            </label>
            <div className="flex items-center gap-1">
              <span className="text-gray-400 text-sm font-medium">฿</span>
              <input
                type="number" inputMode="decimal" placeholder="0.00"
                value={cash} onChange={(e) => setCash(e.target.value)}
                required min="0" step="0.01"
                className="flex-1 text-right text-xl font-bold text-gray-900 outline-none placeholder:text-gray-200 bg-transparent"
              />
            </div>
          </div>

          {/* Transfer */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-2">
              <Building2 className="h-4 w-4 text-indigo-500" />
              เงินโอนรับวันนี้
            </label>
            <div className="flex items-center gap-1">
              <span className="text-gray-400 text-sm font-medium">฿</span>
              <input
                type="number" inputMode="decimal" placeholder="0.00"
                value={transfer} onChange={(e) => setTransfer(e.target.value)}
                required min="0" step="0.01"
                className="flex-1 text-right text-xl font-bold text-gray-900 outline-none placeholder:text-gray-200 bg-transparent"
              />
            </div>
          </div>

          {/* Live diff preview */}
          {(cashNum > 0 || transferNum > 0) && salesNum > 0 && (
            <DiffBadge diff={diffPreview} />
          )}

          {/* Borrow / Return section */}
          <div className="pt-2">
            <p className="text-xs text-gray-400 uppercase tracking-wider text-center pb-3">
              ยืม/คืน กำไร (ถ้ามี)
            </p>

            <div className="bg-white rounded-xl border border-amber-200 p-4 shadow-sm">
              <label className="flex items-center gap-2 text-sm font-medium text-amber-600 mb-2">
                <ArrowDownLeft className="h-4 w-4 text-amber-500" />
                ยืมกำไรซื้อยา
              </label>
              <div className="flex items-center gap-1">
                <span className="text-gray-400 text-sm font-medium">฿</span>
                <input
                  type="number" inputMode="decimal" placeholder="0.00"
                  value={borrowProfit} onChange={(e) => setBorrowProfit(e.target.value)}
                  min="0" step="0.01"
                  className="flex-1 text-right text-xl font-bold text-gray-900 outline-none placeholder:text-gray-200 bg-transparent"
                />
              </div>
            </div>

            <div className="mt-3 bg-white rounded-xl border border-teal-200 p-4 shadow-sm">
              <label className="flex items-center gap-2 text-sm font-medium text-teal-600 mb-2">
                <ArrowUpRight className="h-4 w-4 text-teal-500" />
                คืนกำไรที่ยืมมา
              </label>
              <div className="flex items-center gap-1">
                <span className="text-gray-400 text-sm font-medium">฿</span>
                <input
                  type="number" inputMode="decimal" placeholder="0.00"
                  value={returnProfit} onChange={(e) => setReturnProfit(e.target.value)}
                  min="0" step="0.01"
                  className="flex-1 text-right text-xl font-bold text-gray-900 outline-none placeholder:text-gray-200 bg-transparent"
                />
              </div>
            </div>

            {/* Net profit preview */}
            {(borrowProfitNum > 0 || returnProfitNum > 0) && (
              <div className="mt-3 bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">กำไรสุทธิ</span>
                <span className={`font-bold text-lg ${netProfitPreview >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {formatCurrency(netProfitPreview)}
                </span>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 text-white font-semibold py-4 rounded-xl transition-colors flex items-center justify-center gap-2 mt-2 text-base"
          >
            {submitting
              ? <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
              : <Lock className="h-5 w-5" />
            }
            {submitting ? 'กำลังบันทึก...' : 'บันทึกและล็อกข้อมูล'}
          </button>
        </form>
      )}

      {/* ── 3. History table ──────────────────────────────── */}
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
                  <th className="px-4 py-3 text-left   text-xs font-semibold text-gray-500 uppercase tracking-wider">วันที่</th>
                  <th className="px-4 py-3 text-right  text-xs font-semibold text-gray-500 uppercase tracking-wider">ยอดขาย</th>
                  <th className="px-4 py-3 text-right  text-xs font-semibold text-gray-500 uppercase tracking-wider">กำไร</th>
                  <th className="px-4 py-3 text-right  text-xs font-semibold text-gray-500 uppercase tracking-wider">เงินขาด/เกิน</th>
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {entries.map((entry) => {
                  const entryProfit    = entry.sales - entry.cost
                  const entryNetProfit = entryProfit - (entry.borrow_profit ?? 0) + (entry.return_profit ?? 0)
                  const diff           = entry.sales - (entry.cash_on_hand + entry.bank_balance)
                  const isToday        = entry.date === today
                  return (
                    <tr key={entry.id} className={isToday ? 'bg-blue-50' : 'hover:bg-gray-50 transition-colors'}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${isToday ? 'text-blue-700' : 'text-gray-800'}`}>
                            {formatDate(entry.date)}
                          </span>
                          {isToday && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">
                              วันนี้
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700">{formatShort(entry.sales)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-green-600">
                        {formatShort(entryNetProfit)}
                        {(entry.borrow_profit > 0 || entry.return_profit > 0) && (
                          <span className="block text-xs text-gray-400 font-normal">
                            (ก่อนหัก: {formatShort(entryProfit)})
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {diff === 0 ? (
                          <span className="text-green-600 font-semibold">✓</span>
                        ) : (
                          <span className={`font-semibold ${diff > 0 ? 'text-red-500' : 'text-amber-500'}`}>
                            {diff > 0 ? `−${formatShort(diff)}` : `+${formatShort(Math.abs(diff))}`}
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-3 text-right">
                        {confirmDeleteId === entry.id ? (
                          <div className="flex items-center gap-1 justify-end">
                            <button
                              onClick={() => handleDelete(entry.id)}
                              disabled={deleting}
                              className="text-xs bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded-lg font-medium transition-colors"
                            >
                              {deleting ? '...' : 'ลบ'}
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1 rounded-lg font-medium transition-colors"
                            >
                              ยกเลิก
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(entry.id)}
                            className="p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}
