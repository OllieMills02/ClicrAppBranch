
import { getSupabase } from './supabase';
import { getTodayWindow } from './time';
import { logError } from './errors';

export interface TrafficTotals {
    total_in: number;
    total_out: number;
    net_delta: number;
    event_count: number;
}

export const METRICS = {
    getTotals: async (
        businessId: string,
        scope: { venueId?: string; areaId?: string },
        window = getTodayWindow()
    ): Promise<TrafficTotals> => {
        const sb = getSupabase();

        const params = {
            p_business_id: businessId,
            p_venue_id: scope.venueId || null,
            p_area_id: scope.areaId || null,
            p_start_ts: window.start,
            p_end_ts: window.end
        };

        const { data, error } = await sb.rpc('get_traffic_totals', params);

        if (error) {
            logError('metrics:getTotals', error.message, params, undefined, businessId);
            throw error;
        }

        if (data && data.length > 0) {
            return data[0] as TrafficTotals;
        }

        return { total_in: 0, total_out: 0, net_delta: 0, event_count: 0 };
    },

    getCurrentOccupancy: async (businessId: string, areaId: string): Promise<number> => {
        const sb = getSupabase();
        const { data, error } = await sb
            .from('occupancy_snapshots')
            .select('current_occupancy')
            .eq('business_id', businessId)
            .eq('area_id', areaId)
            .single();

        if (error) {
            // It might be missing if no events yet. Return 0.
            if (error.code === 'PGRST116') return 0; // No rows
            logError('metrics:occupancy', error.message, { areaId }, undefined, businessId);
            return 0;
        }
        return data?.current_occupancy || 0;
    }
};
