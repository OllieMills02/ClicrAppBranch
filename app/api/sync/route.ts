import { NextResponse } from 'next/server';
import { readDB, addEvent, addScan, resetAllCounts, addUser, updateUser, removeUser, writeDB, addClicr, updateClicr, updateArea, factoryResetDB, addBan, revokeBan, isUserBanned, createPatronBan, updatePatronBan, recordBanEnforcement, addVenue, updateVenue, addArea, addDevice, updateDevice, addCapacityOverride, addVenueAuditLog } from '@/lib/db';
import { CountEvent, IDScanEvent, User, Clicr, Area, BanRecord, BanEnforcementEvent } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
    const data = readDB();
    return NextResponse.json(data);
}

export async function POST(request: Request) {
    const body = await request.json();
    console.log("API Sync POST received:", body);
    const { action, payload } = body;

    let updatedData;

    try {
        switch (action) {
            case 'RECORD_EVENT':
                const event = payload as CountEvent;
                if (isUserBanned(event.user_id, event.venue_id)) {
                    console.warn(`Blocked banned user ${event.user_id} from recording event.`);
                    return NextResponse.json({ error: 'User is banned from accessing this venue' }, { status: 403 });
                }
                updatedData = addEvent(event);
                break;
            case 'RECORD_SCAN':
                updatedData = addScan(payload as IDScanEvent);
                break;
            case 'RESET_COUNTS':
                console.log("Triggering FACTORY_RESET for robust clear...");
                // Use factory reset to be 100% sure we are clearing everything on disk
                updatedData = factoryResetDB();
                console.log("FACTORY_RESET complete.");
                break;
            case 'ADD_USER':
                updatedData = addUser(payload as User);
                break;
            case 'UPDATE_USER':
                updatedData = updateUser(payload as User);
                break;
            case 'REMOVE_USER':
                updatedData = removeUser(payload.id);
                break;
            case 'ADD_CLICR':
                updatedData = addClicr(payload as Clicr);
                break;
            case 'UPDATE_CLICR':
                updatedData = updateClicr(payload as Clicr);
                break;
            case 'UPDATE_AREA':
                updatedData = updateArea(payload as Area);
                break;
            case 'CREATE_BAN':
                updatedData = addBan(payload as BanRecord);
                break;
            case 'REVOKE_BAN':
                // Payload: { banId, revokedByUserId, reason }
                updatedData = revokeBan(payload.banId, payload.revokedByUserId, payload.reason);
                break;
            case 'CREATE_PATRON_BAN':
                // Payload: { person, ban, log }
                updatedData = createPatronBan(payload.person, payload.ban, payload.log);
                break;
            case 'UPDATE_PATRON_BAN':
                // Payload: { ban, log }
                updatedData = updatePatronBan(payload.ban, payload.log);
                break;
            case 'RECORD_BAN_ENFORCEMENT':
                updatedData = recordBanEnforcement(payload as BanEnforcementEvent);
                break;

            // --- VENUE FEATURES ---
            case 'ADD_VENUE':
                updatedData = addVenue(payload);
                break;
            case 'UPDATE_VENUE':
                updatedData = updateVenue(payload);
                break;
            case 'ADD_AREA':
                updatedData = addArea(payload);
                break;
            // UPDATE_AREA already exists above
            case 'ADD_DEVICE':
                updatedData = addDevice(payload);
                break;
            case 'UPDATE_DEVICE':
                updatedData = updateDevice(payload);
                break;
            case 'ADD_CAPACITY_OVERRIDE':
                updatedData = addCapacityOverride(payload);
                break;
            case 'ADD_VENUE_AUDIT_LOG':
                updatedData = addVenueAuditLog(payload);
                break;
            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }
        return NextResponse.json(updatedData);
    } catch (error) {
        console.error("API Error", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
