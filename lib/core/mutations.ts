
import { getSupabase } from './supabase';
import { logError } from './errors';

export const MUTATIONS = {
    applyDelta: async (
        ctx: { businessId: string; venueId: string; areaId: string; userId: string },
        delta: number,
        source: string = 'manual',
        deviceId?: string
    ) => {
        const sb = getSupabase();
        const { data, error } = await sb.rpc('apply_occupancy_delta', {
            p_business_id: ctx.businessId,
            p_venue_id: ctx.venueId,
            p_area_id: ctx.areaId,
            p_delta: delta,
            p_source: source,
            p_device_id: deviceId || null
        });

        if (error) {
            logError('mutations:applyDelta', error.message, { ctx, delta }, ctx.userId, ctx.businessId);
            throw error;
        }
        return data ? data[0] : null; // returns { new_occupancy, event_id }
    },

    resetCounts: async (
        ctx: { businessId: string; userId: string },
        scope: 'BUSINESS' | 'VENUE' | 'AREA',
        targetId: string, // could be businessId, venueId, or areaId
        reason?: string
    ) => {
        const sb = getSupabase();

        let venueId = null;
        let areaId = null;

        if (scope === 'VENUE') venueId = targetId;
        if (scope === 'AREA') areaId = targetId;
        // If BUSINESS, both remain null

        const { data, error } = await sb.rpc('reset_counts', {
            p_scope: scope,
            p_business_id: ctx.businessId,
            p_venue_id: venueId,
            p_area_id: areaId,
            p_reason: reason
        });

        if (error) {
            logError('mutations:resetCounts', error.message, { scope, targetId }, ctx.userId, ctx.businessId);
            throw error;
        }
        return data ? data[0] : null;
    },

    deleteDevice: async (
        ctx: { businessId: string; userId: string },
        deviceId: string
    ) => {
        const sb = getSupabase();
        const { data, error } = await sb.rpc('soft_delete_device', {
            p_business_id: ctx.businessId,
            p_device_id: deviceId
        });

        if (error) {
            logError('mutations:deleteDevice', error.message, { deviceId }, ctx.userId, ctx.businessId);
            throw error; // Re-throw to let UI handle it
        }
        return data;
    },

    recordScan: async (
        ctx: { businessId: string; userId: string; venueId?: string; areaId?: string; deviceId?: string },
        scanData: any,
        autoAdd: boolean = false
    ) => {
        const sb = getSupabase();

        // 1. Insert Scan
        const { data: scan, error: scanError } = await sb
            .from('id_scans')
            .insert({
                business_id: ctx.businessId,
                venue_id: ctx.venueId,
                area_id: ctx.areaId,
                device_id: ctx.deviceId,
                scan_result: scanData.scan_result,
                age: scanData.age,
                is_fake: scanData.is_fake,
                first_name: scanData.first_name, // Should be hashed/encrypted in real prod
                last_name: scanData.last_name,
                dob: scanData.dob
            })
            .select()
            .single();

        if (scanError) throw scanError;

        // 2. Auto Add Traffic (Optional)
        if (autoAdd && ctx.venueId && ctx.areaId && scanData.scan_result === 'ACCEPTED') {
            await MUTATIONS.applyDelta(
                { businessId: ctx.businessId, venueId: ctx.venueId, areaId: ctx.areaId, userId: ctx.userId },
                1,
                'auto_scan',
                ctx.deviceId
            );
        }

        return scan;
    }
};
