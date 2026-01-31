"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Ban, UserX, ShieldAlert, Calendar, Camera, XCircle, CheckCircle2, AlertTriangle, History } from 'lucide-react';
import { cn } from '@/lib/utils';

// --- MOCK DATA ---
// In production, this comes from 'scan_logs' view
const RECENT_SCANS = [
    { id: 's1', name: 'John Doe', age: 24, gender: 'M', time: '2 mins ago', status: 'ACCEPTED', photo: null },
    { id: 's2', name: 'Jane Smith', age: 21, gender: 'F', time: '5 mins ago', status: 'ACCEPTED', photo: null },
    { id: 's3', name: 'Mike Johnson', age: 19, gender: 'M', time: '12 mins ago', status: 'DENIED', reason: 'Underage', photo: null },
    { id: 's4', name: 'Sarah Wilson', age: 28, gender: 'F', time: '15 mins ago', status: 'ACCEPTED', photo: null },
];

// In production, this comes from 'bans' table
const ACTIVE_BANS = [
    { id: 'b1', name: 'Alex T.', reason: 'Fighting', date: '2023-10-01', expires: '2024-10-01' },
    { id: 'b2', name: 'Chris P.', reason: 'Fake ID / Fraud', date: '2023-11-15', expires: 'Permanent' },
];

export default function BanningPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedScan, setSelectedScan] = useState<any>(null);
    const [isBanModalOpen, setIsBanModalOpen] = useState(false);

    // Manual Ban State
    const [isManualBan, setIsManualBan] = useState(false);
    const [manualName, setManualName] = useState('');
    const [manualId, setManualId] = useState('');

    // Ban Form State
    const [banReason, setBanReason] = useState('');
    const [banDuration, setBanDuration] = useState('30_DAYS');
    const [banNotes, setBanNotes] = useState('');

    const openManualBan = () => {
        setIsManualBan(true);
        setSelectedScan({ name: 'Manual Entry', id: 'MANUAL' }); // Placeholder
        setManualName('');
        setManualId('');
        setIsBanModalOpen(true);
    };

    const handleBanSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const targetName = isManualBan ? manualName : selectedScan.name;
        // Simulate Supabase Insert
        console.log('Banning user:', targetName, {
            manualId: isManualBan ? manualId : selectedScan.id,
            banReason,
            banDuration,
            banNotes
        });
        setIsBanModalOpen(false);
        setIsManualBan(false);
        setSelectedScan(null);
        alert(`User ${targetName} has been banned.`);
    };

    return (
        <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto pb-24">

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                        <ShieldAlert className="w-8 h-8 text-red-500" />
                        Banning & Security
                    </h1>
                    <p className="text-slate-400">Search recent scans to identify and ban problem guests.</p>
                </div>

                <div className="flex flex-col gap-3 w-full md:w-auto">
                    {/* Manual Ban Button */}
                    <button
                        onClick={openManualBan}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-red-600/10 border border-red-500 text-red-500 font-bold rounded-xl hover:bg-red-600 hover:text-white transition-colors"
                    >
                        <UserX className="w-5 h-5" />
                        Create Manual Ban
                    </button>

                    {/* Search Bar */}
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search Guest Name or ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[#1e2330] border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all outline-none"
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* LEFT: Recent Scans / Search Results */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <History className="w-5 h-5 text-slate-500" /> Recent Scans
                        </h2>
                    </div>

                    <div className="bg-[#1e2330]/50 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-sm">
                        <table className="w-full text-left">
                            <thead className="bg-white/5 text-xs font-bold text-slate-500 uppercase tracking-widest hidden md:table-header-group">
                                <tr>
                                    <th className="p-4">Guest</th>
                                    <th className="p-4">Time</th>
                                    <th className="p-4">Result</th>
                                    <th className="p-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {RECENT_SCANS.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())).map(scan => (
                                    <tr key={scan.id} className="hover:bg-white/5 transition-colors flex flex-col md:table-row p-4 md:p-0">
                                        <td className="p-2 md:p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center">
                                                    <Camera className="w-5 h-5 text-slate-600" />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-white">{scan.name}</div>
                                                    <div className="text-xs text-slate-500">{scan.age} • {scan.gender}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-2 md:p-4 text-slate-400 text-sm font-mono flex justify-between md:table-cell">
                                            <span className="md:hidden text-xs font-bold uppercase tracking-widest">Time</span>
                                            {scan.time}
                                        </td>
                                        <td className="p-2 md:p-4 flex justify-between md:table-cell">
                                            <span className="md:hidden text-xs font-bold uppercase tracking-widest">Status</span>
                                            {scan.status === 'ACCEPTED' ? (
                                                <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded text-xs font-bold border border-emerald-500/20">OK</span>
                                            ) : (
                                                <span className="px-2 py-1 bg-red-500/10 text-red-500 rounded text-xs font-bold border border-red-500/20">{scan.status}</span>
                                            )}
                                        </td>
                                        <td className="p-2 md:p-4 text-right">
                                            <button
                                                onClick={() => { setIsManualBan(false); setSelectedScan(scan); setIsBanModalOpen(true); }}
                                                className="w-full md:w-auto py-2 md:py-0 text-xs font-bold text-red-500 hover:text-red-400 hover:bg-white/5 md:hover:bg-transparent rounded md:underline uppercase tracking-wide border md:border-none border-red-500/30"
                                            >
                                                Ban Guest
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {RECENT_SCANS.length === 0 && (
                            <div className="p-8 text-center text-slate-500">No scans found.</div>
                        )}
                    </div>
                </div>

                {/* RIGHT: Active Bans List */}
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <UserX className="w-5 h-5 text-slate-500" /> Banned List
                    </h2>

                    <div className="space-y-3">
                        {ACTIVE_BANS.map(ban => (
                            <div key={ban.id} className="bg-[#1e2330]/50 border border-white/5 p-4 rounded-xl flex items-start gap-3 hover:border-red-500/30 transition-colors cursor-pointer group">
                                <div className="w-10 h-10 bg-red-900/20 text-red-500 rounded-full flex items-center justify-center shrink-0">
                                    <Ban className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-white group-hover:text-red-400 transition-colors">{ban.name}</div>
                                    <div className="text-xs text-slate-400 mt-1">{ban.reason}</div>
                                    <div className="text-[10px] text-slate-600 font-mono mt-2 uppercase tracking-wide">Expires: {ban.expires}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button className="w-full py-3 border border-white/10 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors text-sm font-bold">
                        View All Bans
                    </button>
                </div>
            </div>

            {/* BAN MODAL */}
            <AnimatePresence>
                {isBanModalOpen && selectedScan && (
                    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-6 overflow-y-auto">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-[#1e2330] border border-red-500/30 rounded-3xl w-full max-w-lg p-8 shadow-2xl relative my-auto"
                        >
                            <button
                                onClick={() => setIsBanModalOpen(false)}
                                className="absolute top-6 right-6 text-slate-500 hover:text-white"
                            >
                                <XCircle className="w-6 h-6" />
                            </button>

                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center text-3xl">
                                    <UserX />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-white">
                                        {isManualBan ? 'Create Manual Ban' : 'Ban Guest'}
                                    </h2>
                                    {!isManualBan && (
                                        <p className="text-red-400 font-mono text-sm">Target: {selectedScan.name} (ID #{selectedScan.id})</p>
                                    )}
                                </div>
                            </div>

                            <form onSubmit={handleBanSubmit} className="space-y-6">
                                {isManualBan && (
                                    <div className="space-y-4 p-4 bg-white/5 rounded-xl border border-white/10">
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Guest Name</label>
                                            <input
                                                autoFocus
                                                type="text"
                                                required
                                                value={manualName}
                                                onChange={(e) => setManualName(e.target.value)}
                                                placeholder="Full Legal Name"
                                                className="w-full bg-black/50 border border-slate-700 rounded-xl p-4 text-white placeholder:text-slate-600 mt-2 focus:border-red-500 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">ID Number / License</label>
                                            <input
                                                type="text"
                                                required
                                                value={manualId}
                                                onChange={(e) => setManualId(e.target.value)}
                                                placeholder="Driver's License or ID #"
                                                className="w-full bg-black/50 border border-slate-700 rounded-xl p-4 text-white placeholder:text-slate-600 mt-2 focus:border-red-500 focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Reason for Ban</label>
                                    <select
                                        value={banReason}
                                        onChange={(e) => setBanReason(e.target.value)}
                                        className="w-full bg-black/50 border border-slate-700 rounded-xl p-4 text-white mt-2 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 appearance-none"
                                        required
                                    >
                                        <option value="">Select Reason...</option>
                                        <option value="FIGHTING">Fighting / Violence</option>
                                        <option value="THEFT">Theft / Destruction of Property</option>
                                        <option value="HARASSMENT">Harassment</option>
                                        <option value="FAKE_ID">Fake ID / Fraud</option>
                                        <option value="OTHER">Other</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Duration</label>
                                    <div className="grid grid-cols-3 gap-3 mt-2">
                                        {[
                                            { label: '24 Hours', val: '24_HOURS' },
                                            { label: '30 Days', val: '30_DAYS' },
                                            { label: 'Permanent', val: 'PERMANENT' }
                                        ].map(opt => (
                                            <button
                                                key={opt.val}
                                                type="button"
                                                onClick={() => setBanDuration(opt.val)}
                                                className={cn(
                                                    "p-3 rounded-xl border text-sm font-bold transition-all",
                                                    banDuration === opt.val
                                                        ? "bg-red-500 text-black border-red-500"
                                                        : "bg-slate-800 border-white/5 text-slate-400 hover:bg-slate-700"
                                                )}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Internal Notes</label>
                                    <textarea
                                        rows={3}
                                        value={banNotes}
                                        onChange={(e) => setBanNotes(e.target.value)}
                                        placeholder="Details about the incident..."
                                        className="w-full bg-black/50 border border-slate-700 rounded-xl p-4 text-white placeholder:text-slate-600 mt-2 focus:border-red-500 focus:outline-none"
                                    />
                                </div>

                                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                                    <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                                    <p className="text-xs text-red-200 leading-relaxed">
                                        This will immediately create a network-wide ban for this ID entity. They will be flagged on all devices if searched or scanned.
                                    </p>
                                </div>

                                <button
                                    type="submit"
                                    className="w-full py-4 bg-red-600 text-white font-bold rounded-xl hover:bg-red-500 transition-colors shadow-lg shadow-red-900/20"
                                >
                                    Confirm Ban
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
