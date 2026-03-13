import { createSupabaseServer } from '@/lib/supabase-server'
import GlossaryClient from './GlossaryClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function GlossaryPage() {
  const supabase = await createSupabaseServer()
  const { data } = await supabase
    .from('twi_glossary')
    .select('id, kjv_term, twi_term, locked, notes, category, strongs_number, book_introduced')
    .order('category')
    .order('kjv_term')

  return <GlossaryClient terms={data ?? []} />
}
