
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
    console.log("Checking RPCs...");
    const { error } = await sb.rpc('exec_sql', { sql: "SELECT 1" });
    if (error) console.log("exec_sql Error:", error);
    else console.log("exec_sql OK");

    const { error: resetErr } = await sb.rpc('reset_counts', { p_scope: 'BUSINESS', p_business_id: '00000000-0000-0000-0000-000000000000' });
    console.log("reset_counts Error:", resetErr?.message || "Function exists (arg error expected)");
}
check();
