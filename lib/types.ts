export type Role = 'staff' | 'owner'

export interface Profile {
  id: string
  role: Role
  name: string | null
  created_at: string
}

export interface DailyEntry {
  id: string
  date: string
  sales: number
  cost: number
  cash_on_hand: number
  bank_balance: number
  borrow_profit: number
  return_profit: number
  submitted_by: string | null
  submitted_at: string
  is_locked: boolean
  created_at: string
}
