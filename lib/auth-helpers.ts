
import { createClient } from '@/utils/supabase/server';


export async function resolvePostAuthRoute(userId: string) {
    const supabase = await createClient();

    // 1. Get Memberships
    const { data: memberships, error } = await supabase
        .from('business_members')
        .select('business_id, is_default, businesses(settings)')
        .eq('user_id', userId);

    if (error || !memberships || memberships.length === 0) {
        // No memberships found -> Onboarding
        return '/onboarding';
    }

    // 2. Determine Target Business
    const targetMembership = memberships.find(m => m.is_default) || memberships[0];

    // 3. Check Onboarding Status of that Business
    const val = targetMembership.businesses as unknown;
    // Handle Supabase join which can be array or object
    const businessData = (Array.isArray(val) ? val[0] : val) as { settings: { onboarding_completed_at?: string } } | null;
    const isComplete = businessData?.settings?.onboarding_completed_at;

    if (!isComplete) {
        // Business exists but onboarding not marked done -> Resume Onboarding
        return '/onboarding';
    }

    // 4. Success -> Dashboard
    return `/dashboard`;
    // Future: return `/app/${targetMembership.business_id}/dashboard`;
}
