import { createClient as createSupabaseClient } from '@/utils/supabase/client';

export const supabase = createSupabaseClient(); // Single instance or factory? better factory for SSR safety
export const getSupabase = () => createSupabaseClient();
