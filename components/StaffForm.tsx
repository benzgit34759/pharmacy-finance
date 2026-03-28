'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { DailyEntry } from '@/lib/types'
import {
  TrendingUp,
  DollarSign,
  Wallet,
  Building2,
  CheckCircle2,
  Lock,
  AlertCircle,
} from 'lucide-react'

interface FormData {
  sales: string
  cost: string
  cash_on_hand: string
  bank_balance: string
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 2,
  }).format(amount)
}

function SummaryRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: number
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm text-gray-600">{label}</span>
      </div>
      <span className="font-semibold text-gray-800">{formatCurrency(value)}</span>
    </div>
  )
}

function FormField({
  icon,
  label,
  placeholder,
  value,
  onChange,
}: {
  icon: React.ReactNode
  label: string
  placeholder: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <label className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-2">
        {icon}
        {label}
      </label>
      <div className="flex items-center gap-1">
        <span className="text-gray-400 text-sm font-medium">฿</span>
        <input
          type="number"
          inputMode="decimal"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          min="0"
          step="0.01"
          className="flex-1 text-right text-xl font-bold text-gray-900 outline-none placeholder:text-gray-200 bg-transparent"
        />
      </div>
    </div>
  )
}

export default function StaffForm({ userId }: { userId: string }) {
  const [formData, setFormData] = useState<FormData>({
    sales: '',
    cost: '',
    cash_on_hand: '',
    bank_balance: '',
  })
  const [todayEntry, setTodayEntry] = useState<DailyEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]
  const displayDate = new Date().toLocaleDateString('th-TH', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  useEffect(() => {
    fetchTodayEntry()
  }, [])

  async function fetchTodayEntry() {
    setLoading(true)
    const { data } = await supabase
      .from('daily_entries')
      .select('*')
      .eq('date', today)
      .maybeSingle()

    if (data) {
      setTodayEntry(data)
      setFormData({
        sales: data.sales.toString(),
        cost: data.cost.toString(),
        cash_on_hand: data.cash_on_hand.toString(),
        bank_balance: data.bank_balance.toString(),
      })
    }
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const { data, error } = await supabase
      .from('daily_entries')
      .insert({
        date: today,
        sales: parseFloat(formData.sales) || 0,
        cost: parseFloat(formData.cost) || 0,
        cash_on_hand: parseFloat(formData.cash_on_hand) || 0,
        bank_balance: parseFloat(formData.bank_balance) || 0,
        submitted_by: userId,
        is_locked: true,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        setError('มีข้อมูลของวันนี้แล้ว ไม่สามารถบันทึกซ้ำได้')
      } else {
        setError('เกิดข้อผิดพลาด: ' + error.message)
      }
    } else {
      setTodayEntry(data)
    }
    setSubmitting(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto">
      {/* Date header */}
      <div className="mb-6 text-center">
        <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">บันทึกประจำวัน</p>
        <h2 className="text-base font-semibold text-gray-700">{displayDate}</h2>
      </div>

      {todayEntry ? (
        /* ── Locked / submitted state ── */
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-green-50 px-5 py-4 flex items-center gap-3 border-b border-green-100">
            <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-green-800">บันทึกข้อมูลแล้ว</p>
              <p className="text-xs text-green-600">
                เวลา{' '}
                {new Date(todayEntry.submitted_at).toLocaleTimeString('th-TH', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                น.
              </p>
            </div>
            <Lock className="h-5 w-5 text-green-400" />
          </div>

          <div className="p-5 space-y-2">
            <SummaryRow
              icon={<TrendingUp className="h-4 w-4 text-blue-500" />}
              label="ยอดขาย"
              value={todayEntry.sales}
            />
            <SummaryRow
              icon={<DollarSign className="h-4 w-4 text-orange-500" />}
              label="ต้นทุนสินค้า"
              value={todayEntry.cost}
            />
            <SummaryRow
              icon={<Wallet className="h-4 w-4 text-green-500" />}
              label="เงินสดในมือ"
              value={todayEntry.cash_on_hand}
            />
            <SummaryRow
              icon={<Building2 className="h-4 w-4 text-purple-500" />}
              label="ยอดโอน/ธนาคาร"
              value={todayEntry.bank_balance}
            />

            <div className="pt-3 mt-3 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">กำไรวันนี้</span>
                <span
                  className={`text-xl font-bold ${
                    todayEntry.sales - todayEntry.cost >= 0
                      ? 'text-green-600'
                      : 'text-red-500'
                  }`}
                >
                  {formatCurrency(todayEntry.sales - todayEntry.cost)}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ── Entry form ── */
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <FormField
            icon={<TrendingUp className="h-4 w-4 text-blue-500" />}
            label="ยอดขาย"
            placeholder="0.00"
            value={formData.sales}
            onChange={(v) => setFormData((p) => ({ ...p, sales: v }))}
          />
          <FormField
            icon={<DollarSign className="h-4 w-4 text-orange-500" />}
            label="ต้นทุนสินค้า"
            placeholder="0.00"
            value={formData.cost}
            onChange={(v) => setFormData((p) => ({ ...p, cost: v }))}
          />
          <FormField
            icon={<Wallet className="h-4 w-4 text-green-500" />}
            label="เงินสดในมือ"
            placeholder="0.00"
            value={formData.cash_on_hand}
            onChange={(v) => setFormData((p) => ({ ...p, cash_on_hand: v }))}
          />
          <FormField
            icon={<Building2 className="h-4 w-4 text-purple-500" />}
            label="ยอดโอน / ธนาคาร"
            placeholder="0.00"
            value={formData.bank_balance}
            onChange={(v) => setFormData((p) => ({ ...p, bank_balance: v }))}
          />

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 text-white font-semibold py-4 rounded-xl transition-colors flex items-center justify-center gap-2 mt-4 text-base"
          >
            {submitting ? (
              <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
            ) : (
              <Lock className="h-5 w-5" />
            )}
            {submitting ? 'กำลังบันทึก...' : 'บันทึกและล็อกข้อมูล'}
          </button>
        </form>
      )}
    </div>
  )
}
