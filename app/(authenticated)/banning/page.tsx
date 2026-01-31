"use client";

import React, { useState, useEffect } from 'react';
import { useApp } from '@/lib/store';
import { BannedPerson, PatronBan, BanAuditLog } from '@/lib/types';
import { Ban, Search, Filter, AlertTriangle, CheckCircle, XCircle, Plus, MapPin, Calendar, User as UserIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function BanningPage() {
    const { patrons, patronBans, venues, createPatronBan, updatePatronBan, currentUser, business, banEnforcementEvents, scanEvents } = useApp();
    const [view, setView] = useState<'LIST' | 'CREATE' | 'LOGS' | 'GUESTS'>('LIST');

    // Filter State
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'EXPIRED' | 'REMOVED'>('ACTIVE');
    const [selectedGuestForBan, setSelectedGuestForBan] = useState<any | null>(null);

    // Create Ban Form State
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        dob: '',
        idType: 'DRIVERS_LICENSE',
        idNumber: '', // Last 4 or full
        issuingState: '',
        banType: 'PERMANENT',
        endDate: '',
        reasonCategory: 'POLICY_VIOLATION',
        reasonNotes: '',
        notesPrivate: '',
        appliesToAll: true,
        selectedLocationIds: [] as string[]
    });

    // Check for URL params on mount to prefill ban form
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('mode') === 'create') {
            setFormData(prev => ({
                ...prev,
                firstName: params.get('fname') || '',
                lastName: params.get('lname') || '',
                dob: params.get('dob') || '',
                idNumber: params.get('id_last4') || '',
                // If we had more fields passed, we'd set them
            }));
            setView('CREATE');
        }
    }, []);

    // Guest Directory Logic
    // Deduplicate scan events to find unique guests
    const uniqueGuests = React.useMemo(() => {
        const guests = new Map();

        // Iterate newest first to get latest data
        [...scanEvents].sort((a, b) => b.timestamp - a.timestamp).forEach(scan => {
            if (!scan.first_name || !scan.last_name) return;

            // Key based on Name + DOB (or fallback if DOB missing, which weakens uniqueness)
            // A robust system uses ID token, but we use what we have.
            const key = `${scan.first_name.toLowerCase()}|${scan.last_name.toLowerCase()}|${scan.dob || 'unknown'}`;

            if (!guests.has(key)) {
                guests.set(key, {
                    ...scan,
                    scanHistory: [scan]
                });
            } else {
                const existing = guests.get(key);
                existing.scanHistory.push(scan);
            }
        });

        return Array.from(guests.values());
    }, [scanEvents]);

    const filteredGuests = uniqueGuests.filter(g => {
        const search = searchTerm.toLowerCase();
        return (g.first_name?.toLowerCase().includes(search) ||
            g.last_name?.toLowerCase().includes(search) ||
            g.zip_code?.includes(search) ||
            g.id_number?.toLowerCase().includes(search) ||
            g.city?.toLowerCase().includes(search) ||
            g.state?.toLowerCase().includes(search) ||
            g.eye_color?.toLowerCase().includes(search)
        );
    });

    const handleBanGuest = (guest: any) => {
        setFormData({
            ...formData,
            firstName: guest.first_name || '',
            lastName: guest.last_name || '',
            dob: guest.dob || '',
            idNumber: guest.id_number_last4 || '',
            issuingState: guest.issuing_state || '',
            idType: guest.id_type || 'DRIVERS_LICENSE'
        });
        setView('CREATE');
    };

    // Helper to join person + ban
    const bansWithPerson = patronBans.map(ban => {
        const person = patrons.find(p => p.id === ban.banned_person_id);
        return { ban, person };
    }).filter(item => item.person !== undefined) as { ban: PatronBan, person: BannedPerson }[];

    // Filtered Bans
    const filteredBans = bansWithPerson.filter(({ ban, person }) => {
        const matchesSearch = (person.first_name + ' ' + person.last_name).toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'ALL' || ban.status === statusFilter;
        return matchesSearch && matchesStatus;
    }).sort((a, b) => new Date(b.ban.created_at).getTime() - new Date(a.ban.created_at).getTime());

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser || !business) return;

        // 1. Create Person Object
        const personId = Math.random().toString(36).substring(7);
        const newPerson: BannedPerson = {
            id: personId,
            first_name: formData.firstName,
            last_name: formData.lastName,
            date_of_birth: formData.dob || undefined,
            id_type: formData.idType as any,
            id_number_last4: formData.idNumber.length <= 4 ? formData.idNumber : formData.idNumber.slice(-4),
            // In a real app we'd encrypt the full number
            issuing_state_or_country: formData.issuingState,
            notes_private: formData.notesPrivate,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        // 2. Create Ban Object
        const banId = Math.random().toString(36).substring(7);
        const newBan: PatronBan = {
            id: banId,
            banned_person_id: personId,
            business_id: business.id,
            status: 'ACTIVE',
            ban_type: formData.banType as any,
            start_datetime: new Date().toISOString(),
            end_datetime: formData.banType === 'TEMPORARY' ? new Date(formData.endDate).toISOString() : null,
            reason_category: formData.reasonCategory as any,
            reason_notes: formData.reasonNotes,
            created_by_user_id: currentUser.id,
            applies_to_all_locations: formData.appliesToAll,
            location_ids: formData.selectedLocationIds,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        // 3. Create Audit Log
        const newLog: BanAuditLog = {
            id: Math.random().toString(36).substring(7),
            ban_id: banId,
            action: 'CREATED',
            performed_by_user_id: currentUser.id,
            timestamp: new Date().toISOString(),
            details_json: { notes: "Initial Ban Creation" }
        };

        await createPatronBan(newPerson, newBan, newLog);
        setView('LIST');
        // Reset Form
        setFormData({
            firstName: '', lastName: '', dob: '', idType: 'DRIVERS_LICENSE', idNumber: '', issuingState: '',
            banType: 'PERMANENT', endDate: '', reasonCategory: 'POLICY_VIOLATION', reasonNotes: '', notesPrivate: '',
            appliesToAll: true, selectedLocationIds: []
        });
    };

    const handleRemoveBan = async (ban: PatronBan) => {
        if (!confirm("Are you sure you want to remove this ban?")) return;

        const updatedBan: PatronBan = {
            ...ban,
            status: 'REMOVED',
            removed_by_user_id: currentUser.id,
            removed_reason: 'Manual removal via dashboard',
            updated_at: new Date().toISOString()
        };

        const log: BanAuditLog = {
            id: Math.random().toString(36).substring(7),
            ban_id: ban.id,
            action: 'REMOVED',
            performed_by_user_id: currentUser.id,
            timestamp: new Date().toISOString(),
            details_json: { reason: 'Manual removal' }
        };

        await updatePatronBan(updatedBan, log);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <Ban className="w-8 h-8 text-red-500" />
                        Patron Banning
                    </h1>
                    <p className="text-slate-400 mt-1">Manage denied entry lists and ID enforcement.</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex bg-slate-900 border border-slate-700 rounded-lg p-1">
                        <button
                            onClick={() => setView('LIST')}
                            className={cn("px-4 py-2 rounded-md text-sm font-medium transition-colors", view === 'LIST' ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white")}
                        >
                            Ban List
                        </button>
                        <button
                            onClick={() => setView('GUESTS')}
                            className={cn("px-4 py-2 rounded-md text-sm font-medium transition-colors", view === 'GUESTS' ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white")}
                        >
                            Guest Directory
                        </button>
                        <button
                            onClick={() => setView('LOGS')}
                            className={cn("px-4 py-2 rounded-md text-sm font-medium transition-colors", view === 'LOGS' ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white")}
                        >
                            Enforcement Logs
                        </button>
                    </div>

                    {view === 'LIST' && (
                        <button
                            onClick={() => setView('CREATE')}
                            className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-red-900/20 transition-all"
                        >
                            <Plus className="w-5 h-5" /> Create Ban
                        </button>
                    )}
                    {(view === 'CREATE' || view === 'GUESTS') && (
                        <button
                            onClick={() => setView('LIST')}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-lg font-bold transition-all"
                        >
                            {view === 'CREATE' ? 'Cancel' : 'Back to List'}
                        </button>
                    )}
                </div>
            </div>

            {view === 'GUESTS' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                    <div className="glass-panel p-4 rounded-xl flex items-center gap-4">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search guests by name..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white focus:ring-2 focus:ring-primary/50 outline-none"
                            />
                        </div>
                    </div>

                    <div className="glass-panel overflow-hidden rounded-xl border border-slate-800">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-900/50 text-slate-400 uppercase tracking-wider font-semibold">
                                <tr>
                                    <th className="p-4">Guest Name</th>
                                    <th className="p-4">DOB</th>
                                    <th className="p-4">Last Scanned</th>
                                    <th className="p-4">Location</th>
                                    <th className="p-4">ID Last 4</th>
                                    <th className="p-4">Total Visits</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {filteredGuests.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center text-slate-500">
                                            No guests found matching criteria.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredGuests.map((guest, idx) => (
                                        <tr key={idx} className="hover:bg-slate-800/20 transition-colors">
                                            <td className="p-4 font-bold text-white">
                                                {guest.first_name || 'N/A'} {guest.last_name || ''}
                                            </td>
                                            <td className="p-4 text-slate-300 font-mono">
                                                {guest.dob || '-'}
                                            </td>
                                            <td className="p-4 text-slate-400">
                                                {new Date(guest.timestamp).toLocaleString()}
                                            </td>
                                            <td className="p-4 text-slate-400 text-sm">
                                                {guest.city ? `${guest.city}, ${guest.state || ''}` : '-'}
                                            </td>
                                            <td className="p-4 text-slate-400 font-mono">
                                                {guest.id_number_last4 ? `••• ${guest.id_number_last4}` : '-'}
                                            </td>
                                            <td className="p-4 text-slate-400">
                                                {guest.scanHistory?.length || 1}
                                            </td>
                                            <td className="p-4 text-right">
                                                <button
                                                    onClick={() => handleBanGuest(guest)}
                                                    className="px-3 py-1 bg-red-950/50 border border-red-900 text-red-400 hover:bg-red-900 hover:text-white rounded-lg text-xs font-bold uppercase transition-colors"
                                                >
                                                    Ban Guest
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {view === 'LIST' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                    {/* Filters */}
                    <div className="glass-panel p-4 rounded-xl flex items-center gap-4">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by name..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white focus:ring-2 focus:ring-primary/50 outline-none"
                            />
                        </div>
                        <div className="flex gap-2">
                            {(['ALL', 'ACTIVE', 'EXPIRED', 'REMOVED'] as const).map(status => (
                                <button
                                    key={status}
                                    onClick={() => setStatusFilter(status)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                                        statusFilter === status
                                            ? "bg-primary text-white"
                                            : "bg-slate-900 text-slate-400 hover:text-white"
                                    )}
                                >
                                    {status.charAt(0) + status.slice(1).toLowerCase()}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Table */}
                    <div className="glass-panel overflow-hidden rounded-xl border border-slate-800">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-900/50 text-slate-400 uppercase tracking-wider font-semibold">
                                <tr>
                                    <th className="p-4">Person</th>
                                    <th className="p-4">ID Details</th>
                                    <th className="p-4">Ban Status</th>
                                    <th className="p-4">Reason</th>
                                    <th className="p-4">Scope</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {filteredBans.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center text-slate-500">
                                            No bans found matching criteria.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredBans.map(({ ban, person }) => (
                                        <tr key={ban.id} className="hover:bg-slate-800/20 transition-colors">
                                            <td className="p-4">
                                                <div className="font-bold text-white text-base">{person.first_name} {person.last_name}</div>
                                                <div className="text-slate-500 text-xs flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" /> DOB: {person.date_of_birth || 'N/A'}
                                                </div>
                                            </td>
                                            <td className="p-4 text-slate-300">
                                                <div className="flex items-center gap-2">
                                                    <span className="bg-slate-800 px-2 py-0.5 rounded text-xs">{person.issuing_state_or_country}</span>
                                                    <span>{person.id_type === 'DRIVERS_LICENSE' ? 'DL' : 'ID'}</span>
                                                </div>
                                                <div className="text-xs text-slate-500 font-mono mt-1">
                                                    {person.id_number_last4 ? `•••• ${person.id_number_last4}` : 'No #'}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className={cn(
                                                    "px-2 py-1 rounded-full text-xs font-bold border",
                                                    ban.status === 'ACTIVE' ? "bg-red-500/10 text-red-500 border-red-500/20" :
                                                        ban.status === 'EXPIRED' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                                                            "bg-slate-500/10 text-slate-500 border-slate-500/20"
                                                )}>
                                                    {ban.status}
                                                </span>
                                                {ban.ban_type === 'TEMPORARY' && ban.end_datetime && (
                                                    <div className="text-xs text-slate-500 mt-1">
                                                        Until {new Date(ban.end_datetime).toLocaleDateString()}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-4 text-slate-300">
                                                <div className="font-medium">{ban.reason_category.replace(/_/g, ' ')}</div>
                                                {ban.reason_notes && <div className="text-xs text-slate-500 truncate max-w-[150px]">{ban.reason_notes}</div>}
                                            </td>
                                            <td className="p-4 text-slate-400 text-xs">
                                                {ban.applies_to_all_locations ? (
                                                    <span className="flex items-center gap-1 text-emerald-400"><MapPin className="w-3 h-3" /> All Locations</span>
                                                ) : (
                                                    <span>{ban.location_ids.length} Locations</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-right">
                                                {ban.status === 'ACTIVE' && (
                                                    <button
                                                        onClick={() => handleRemoveBan(ban)}
                                                        className="text-slate-400 hover:text-red-400 transition-colors text-xs font-semibold uppercase tracking-wider"
                                                    >
                                                        Remove
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {view === 'LOGS' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                    <div className="glass-panel overflow-hidden rounded-xl border border-slate-800">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-900/50 text-slate-400 uppercase tracking-wider font-semibold">
                                <tr>
                                    <th className="p-4">Time</th>
                                    <th className="p-4">Patron</th>
                                    <th className="p-4">Result</th>
                                    <th className="p-4">Venue</th>
                                    <th className="p-4">Notes</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {banEnforcementEvents.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-slate-500">
                                            No enforcement events recorded yet.
                                        </td>
                                    </tr>
                                ) : (
                                    banEnforcementEvents.map(event => (
                                        <tr key={event.id} className="hover:bg-slate-800/20 transition-colors">
                                            <td className="p-4 text-slate-300">
                                                {new Date(event.scan_datetime).toLocaleString()}
                                            </td>
                                            <td className="p-4 font-bold text-white">
                                                {event.person_snapshot_name || 'Unknown'}
                                            </td>
                                            <td className="p-4">
                                                <span className={cn(
                                                    "px-2 py-1 rounded-full text-xs font-bold border",
                                                    event.result === 'BLOCKED' ? "bg-red-500/10 text-red-500 border-red-500/20" :
                                                        event.result === 'WARNED' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                                                            "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                                )}>
                                                    {event.result}
                                                </span>
                                            </td>
                                            <td className="p-4 text-slate-400">
                                                {venues.find(v => v.id === event.location_id)?.name || 'Unknown Venue'}
                                            </td>
                                            <td className="p-4 text-slate-400 italic">
                                                {event.notes || '-'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {view === 'CREATE' && (
                <div className="max-w-2xl mx-auto animate-in fade-in zoom-in-95 duration-300">
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900">
                            <h2 className="text-xl font-bold text-white">Create New Patron Ban</h2>
                        </div>

                        <form onSubmit={handleCreateSubmit} className="p-6 space-y-8">

                            {/* Section 1: Person */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-2">1. Person Details</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-slate-300 mb-1">First Name *</label>
                                        <input required type="text" className="w-full bg-black/50 border border-slate-700 rounded-lg p-3 text-white focus:border-primary"
                                            value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-slate-300 mb-1">Last Name *</label>
                                        <input required type="text" className="w-full bg-black/50 border border-slate-700 rounded-lg p-3 text-white focus:border-primary"
                                            value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-slate-300 mb-1">Date of Birth</label>
                                        <input type="date" className="w-full bg-black/50 border border-slate-700 rounded-lg p-3 text-white focus:border-primary"
                                            value={formData.dob} onChange={e => setFormData({ ...formData, dob: e.target.value })} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm text-slate-300 mb-1">ID Type</label>
                                        <select className="w-full bg-black/50 border border-slate-700 rounded-lg p-3 text-white"
                                            value={formData.idType} onChange={e => setFormData({ ...formData, idType: e.target.value })}>
                                            <option value="DRIVERS_LICENSE">Driver's License</option>
                                            <option value="PASSPORT">Passport</option>
                                            <option value="OTHER">Other</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-slate-300 mb-1">Issuing State/Country *</label>
                                        <input required type="text" placeholder="e.g. CA, NY, USA" className="w-full bg-black/50 border border-slate-700 rounded-lg p-3 text-white"
                                            value={formData.issuingState} onChange={e => setFormData({ ...formData, issuingState: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-slate-300 mb-1">ID Number (Last 4) *</label>
                                        <input required type="text" placeholder="1234" maxLength={20} className="w-full bg-black/50 border border-slate-700 rounded-lg p-3 text-white"
                                            value={formData.idNumber} onChange={e => setFormData({ ...formData, idNumber: e.target.value })} />
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Ban Details */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-2">2. Ban Configuration</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-slate-300 mb-1">Duration</label>
                                        <div className="flex bg-black/50 border border-slate-700 rounded-lg p-1">
                                            <button type="button"
                                                onClick={() => setFormData({ ...formData, banType: 'PERMANENT' })}
                                                className={cn("flex-1 py-2 rounded text-sm font-medium transition-colors", formData.banType === 'PERMANENT' ? "bg-red-600 text-white" : "text-slate-400 hover:text-white")}
                                            >
                                                Permanent
                                            </button>
                                            <button type="button"
                                                onClick={() => setFormData({ ...formData, banType: 'TEMPORARY' })}
                                                className={cn("flex-1 py-2 rounded text-sm font-medium transition-colors", formData.banType === 'TEMPORARY' ? "bg-amber-600 text-white" : "text-slate-400 hover:text-white")}
                                            >
                                                Temporary
                                            </button>
                                        </div>
                                    </div>
                                    {formData.banType === 'TEMPORARY' && (
                                        <div className="animate-in fade-in">
                                            <label className="block text-sm text-slate-300 mb-1">End Date *</label>
                                            <input required type="date" className="w-full bg-black/50 border border-slate-700 rounded-lg p-3 text-white"
                                                value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} />
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm text-slate-300 mb-1">Reason Category</label>
                                    <select className="w-full bg-black/50 border border-slate-700 rounded-lg p-3 text-white"
                                        value={formData.reasonCategory} onChange={e => setFormData({ ...formData, reasonCategory: e.target.value })}>
                                        <option value="POLICY_VIOLATION">Policy Violation</option>
                                        <option value="VIOLENCE_THREATS">Violence / Threats</option>
                                        <option value="HARASSMENT">Harassment</option>
                                        <option value="THEFT">Theft</option>
                                        <option value="FAKE_ID_FRAUD">Fake ID / Fraud</option>
                                        <option value="DRUGS">Drugs / Controlled Substances</option>
                                        <option value="OTHER">Other</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm text-slate-300 mb-1">Reason Notes</label>
                                    <textarea className="w-full bg-black/50 border border-slate-700 rounded-lg p-3 text-white h-24"
                                        placeholder="Specific details about the incident..."
                                        value={formData.reasonNotes} onChange={e => setFormData({ ...formData, reasonNotes: e.target.value })} />
                                </div>
                            </div>

                            {/* Section 3: Scope */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-2">3. Enforcement Scope</h3>

                                <label className="flex items-center gap-3 p-4 bg-slate-800/30 border border-slate-700 rounded-lg cursor-pointer hover:bg-slate-800/50">
                                    <input type="checkbox" className="w-5 h-5 rounded hover:cursor-pointer"
                                        checked={formData.appliesToAll}
                                        onChange={e => setFormData({ ...formData, appliesToAll: e.target.checked })} />
                                    <div>
                                        <div className="font-bold text-white">Apply to All Locations</div>
                                        <div className="text-xs text-slate-400">Ban will automatically apply to all current and future venues.</div>
                                    </div>
                                </label>

                                {!formData.appliesToAll && (
                                    <div className="pl-8 space-y-2 animate-in fade-in slide-in-from-top-2">
                                        <label className="text-sm text-slate-400">Select Specific Venues:</label>
                                        {venues.map(venue => (
                                            <label key={venue.id} className="flex items-center gap-2 text-slate-300 cursor-pointer">
                                                <input type="checkbox"
                                                    checked={formData.selectedLocationIds.includes(venue.id)}
                                                    onChange={e => {
                                                        const newIds = e.target.checked
                                                            ? [...formData.selectedLocationIds, venue.id]
                                                            : formData.selectedLocationIds.filter(id => id !== venue.id);
                                                        setFormData({ ...formData, selectedLocationIds: newIds });
                                                    }}
                                                />
                                                {venue.name}
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="pt-6 border-t border-slate-800 flex justify-end gap-3">
                                <button type="button" onClick={() => setView('LIST')} className="px-6 py-3 text-slate-400 hover:text-white transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" className="px-8 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold shadow-lg shadow-red-900/20 transition-all flex items-center gap-2">
                                    <Ban className="w-5 h-5" />
                                    Confirm Ban
                                </button>
                            </div>

                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
