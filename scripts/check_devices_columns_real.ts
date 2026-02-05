
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkDevicesSchema() {
    console.log("Checking Devices Schema...");

    // Test 'device_name'
    const { error: err1 } = await sb.from('devices').insert({
        business_id: '00000000-0000-0000-0000-000000000000',
        device_type: 'COUNTER',
        device_name: 'Test'
    });
    if (err1 && err1.message.includes('column "device_name" of relation "devices" does not exist')) {
        console.log("-> device_name DOES NOT exist.");
    } else {
        console.log("-> device_name OK or other error:", err1?.message);
    }

    // Test 'name'
    const { error: err2 } = await sb.from('devices').insert({
        business_id: '00000000-0000-0000-0000-000000000000',
        device_type: 'COUNTER',
        name: 'Test'
    });
    if (err2 && err2.message.includes('column "name" of relation "devices" does not exist')) {
        console.log("-> name DOES NOT exist.");
    } else {
        console.log("-> name OK or other error:", err2?.message);
    }
}

checkDevicesSchema();
