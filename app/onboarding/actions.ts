'use server'

import { createClient } from '@/utils/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function completeOnboarding(formData: FormData) {
    const supabase = await createClient()

    // 1. Get Current User
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return redirect('/login')
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
        return redirect('/onboarding?error=Server Configuration Error');
    }

    const businessName = formData.get('businessName') as string
    const venueName = formData.get('venueName') as string
    const venueCapacity = parseInt(formData.get('venueCapacity') as string) || 500
    const venueTimezone = formData.get('venueTimezone') as string || 'UTC'

    if (!businessName || !venueName) {
        return redirect('/onboarding?error=Please fill in all fields')
    }

    try {
        // 2. Create Business
        const { data: business, error: bizError } = await supabaseAdmin
            .from('businesses')
            .insert({
                name: businessName,
                // Mark complete immediately for this simple flow
                // In a multi-step flow, we'd set this at the very end
                // But since this IS the only step currently:
                // We will set it later to be safe
            })
            .select()
            .single()

        if (bizError) throw new Error(`Business Creation Failed: ${bizError.message}`);

        // 3. Create Membership (CRITICAL: This links User -> Business)
        const { error: memberError } = await supabaseAdmin
            .from('business_members')
            .insert({
                business_id: business.id,
                user_id: user.id,
                role: 'OWNER',
                is_default: true
            });

        if (memberError) throw new Error(`Membership Creation Failed: ${memberError.message}`);

        // 4. Update Legacy Profile (Backwards Compatibility)
        // We still keep business_id on profiles for simpler queries in some legacy components
        await supabaseAdmin
            .from('profiles')
            .upsert({
                id: user.id,
                business_id: business.id, // Legacy pointer
                role: 'OWNER',
                email: user.email,
                full_name: 'Admin User'
            });

        // 5. Create Venue
        const { data: venue, error: venueError } = await supabaseAdmin
            .from('venues')
            .insert({
                business_id: business.id,
                name: venueName,
                total_capacity: venueCapacity,
                timezone: venueTimezone,
                status: 'ACTIVE'
            })
            .select()
            .single();

        if (venueError) throw new Error(`Venue Creation Failed: ${venueError.message}`);

        // 6. Create Default Area
        await supabaseAdmin.from('areas').insert({
            venue_id: venue.id,
            name: 'General Admission',
            capacity: venueCapacity
        });

        // 7. Mark Onboarding Complete
        // Only verify completion if all above succeeded
        await supabaseAdmin
            .from('businesses')
            .update({ settings: { onboarding_completed_at: new Date().toISOString() } }) // storing in settings JSON or dedicated column if schema allows
            // If schema doesn't have onboarding_completed_at column, we rely on membership existence
            .eq('id', business.id);

        // 8. Log Success
        console.log(`[Onboarding] Success for User ${user.id} -> Business ${business.id}`);

    } catch (err: any) {
        console.error("[Onboarding] Error:", err);
        // Log to DB if possible (best effort)
        await supabaseAdmin.from('app_errors').insert({
            user_id: user.id,
            error_message: err.message,
            context: 'completeOnboarding'
        });
        return redirect(`/onboarding?error=${encodeURIComponent(err.message)}`);
    }

    revalidatePath('/', 'layout')
    redirect('/dashboard')
}
