export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import OwnerDashboard from '@/components/OwnerDashboard'
import LogoutButton from '@/components/LogoutButton'
import { ShieldCheck } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, name')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'owner') redirect('/staff')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-purple-100 p-1.5 rounded-lg">
              <ShieldCheck className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400">แดชบอร์ดเจ้าของ</p>
              <p className="text-sm font-semibold text-gray-800 leading-tight">
                {profile?.name || user.email}
              </p>
            </div>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <OwnerDashboard />
      </main>
    </div>
  )
}
