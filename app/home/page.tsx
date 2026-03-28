export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import UnifiedView from '@/components/UnifiedView'
import LogoutButton from '@/components/LogoutButton'
import { Building2 } from 'lucide-react'

export default async function HomePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', user.id)
    .single()

  const displayName = profile?.name || user.email

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-blue-100 p-1.5 rounded-lg">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400">ร้านยา — บัญชีรายวัน</p>
              <p className="text-sm font-semibold text-gray-800 leading-tight">{displayName}</p>
            </div>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        <UnifiedView userId={user.id} />
      </main>
    </div>
  )
}
