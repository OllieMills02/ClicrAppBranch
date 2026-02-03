
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export async function resolvePostAuthRoute(userId: string) {
    const supabase = await createClient();

    // 1. Get Memberships
    const { data: memberships, error } = await supabase
        .from('business_members')
        .select('business_id, is_default, businesses(onboarding_completed_at)')
        .eq('user_id', userId);

    if (error || !memberships || memberships.length === 0) {
        // No memberships found -> Onboarding
        return '/onboarding';
    }

    // 2. Determine Target Business
    let targetMembership = memberships.find(m => m.is_default) || memberships[0];

    // 3. Check Onboarding Status of that Business
    // 'businesses' is an array or object depending on join, cast safely
    const businessData = targetMembership.businesses as any;

    if (!businessData?.onboarding_completed_at) {
        // Business exists but onboarding not marked done -> Resume Onboarding
        // We could query onboarding_progress here to be specific, but /onboarding handles routing internally too
        return '/onboarding';
    }

    // 4. Success -> Dashboard
    return `/dashboard`;
    // Future: return `/app/${targetMembership.business_id}/dashboard`;
}
