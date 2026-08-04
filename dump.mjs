import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '/Users/germancardiel/Desktop/AppBoda/.env.local' })
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
async function test() {
  const { data: qs, error } = await supabase.from('kahoot_questions').select('*, kahoot_answers(*)')
  console.log('Questions:', JSON.stringify(qs, null, 2))
  console.log('Error:', error)
}
test()
