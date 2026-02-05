
import { getSupabase } from './supabase';

export const logError = async (
    feature: string,
    message: string,
    payload?: any,
    userId?: string,
    businessId?: string
) => {
    console.error(`[${feature}] ${message}`, payload);
    try {
        const sb = getSupabase();
        // Fire and forget
        sb.from('app_errors').insert({
            feature,
            message,
            payload,
            user_id: userId,
            business_id: businessId
        }).then(({ error }) => {
            if (error) console.error("Failed to log error remotely", error);
        });
    } catch (e) {
        // ignore
    }
};
