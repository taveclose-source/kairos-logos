import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import AdminTabs from './AdminTabs'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const ADMIN_ID = '2f4cc459-6fdd-4f41-be4b-754770b28529'

export default async function AdminPage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/signin?redirect=/admin')
  if (user.id !== ADMIN_ID) redirect('/dashboard')

  // Use service role to fetch all data
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const [usersRes, sponsorsRes] = await Promise.all([
    db.from('users')
      .select('id, email, display_name, username, subscription_tier, subscription_status, missions_status, missions_application, country, created_at')
      .order('created_at', { ascending: false }),
    db.from('missions_sponsorships')
      .select('*')
      .order('created_at', { ascending: false }),
  ])

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <h1 className="text-3xl font-bold mb-1">Admin Panel</h1>
      <p className="text-gray-500 text-sm mb-6">Logos by Kai&rsquo;Ros — Pastor Tave only</p>
      <AdminTabs
        initialUsers={usersRes.data ?? []}
        initialSponsorships={sponsorsRes.data ?? []}
      />
    </main>
  )
}
