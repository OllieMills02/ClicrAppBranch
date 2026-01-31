"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useApp } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Settings2, Plus, Minus, ScanFace, CheckCircle2, XCircle, ArrowUpCircle, ArrowDownCircle, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IDScanEvent } from '@/lib/types';
import { parseAAMVA } from '@/lib/aamva';

// Mock data generator for simulation
const generateMockID = () => {
    const isUnderage = Math.random() < 0.15; // 15% chance of underage
    const age = isUnderage ? Math.floor(Math.random() * (20 - 16 + 1) + 16) : Math.floor(Math.random() * (65 - 21 + 1) + 21);
    const sex = Math.random() > 0.5 ? 'M' : 'F';
    const zip = Math.floor(Math.random() * 90000 + 10000).toString();

    let age_band = '21-25';
    if (age < 21) age_band = 'Under 21';
    else if (age > 25 && age <= 30) age_band = '26-30';
    else if (age > 30 && age <= 40) age_band = '31-40';
    else if (age > 40) age_band = '41+';

    return { age, sex, zip, age_band };
};


export default function ClicrCounterPage() {
    const { id } = useParams();
    const router = useRouter();
    const { clicrs, areas, events, recordEvent, recordScan, resetCounts, isLoading } = useApp();
    const clicr = clicrs.find((c) => c.id === id);

    // Calculate total area occupancy for live count
    const areaClicrs = clicrs.filter(c => c.area_id === clicr?.area_id);
    const totalAreaCount = areaClicrs.reduce((acc, c) => acc + c.current_count, 0);

    // Calculate aggregated stats for the ENTIRE VENUE (as requested)
    // 1. Find the venue ID for this clicr
    const currentArea = areas.find(a => a.id === clicr?.area_id);
    const venueId = currentArea?.venue_id;

    // 2. Filter all events for this venue to get global totals
    const venueEvents = events.filter(e => e.venue_id === venueId);

    // FIX: Total In should sum the actual deltas (allowing negatives to subtract), not Math.abs
    const globalIn = venueEvents.reduce((acc, e) => e.flow_type === 'IN' ? acc + e.delta : acc, 0);
    // FIX: Total Out sums the magnitude of OUT events (which are negative)
    const globalOut = venueEvents.reduce((acc, e) => e.flow_type === 'OUT' ? acc + Math.abs(e.delta) : acc, 0);

    const [showBulkModal, setShowBulkModal] = useState(false);
    const [bulkValue, setBulkValue] = useState(0);

    // Scanner State
    const [lastScan, setLastScan] = useState<IDScanEvent | null>(null);
    const [scannerInput, setScannerInput] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    // Focus management for hardware scanner
    useEffect(() => {
        // Global keydown listener to catch hardware scans even if focus is lost
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if user is typing in a real input field (like bulk modal)
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' && target !== inputRef.current) return;

            // If input is not focused, refocus it and append the key
            if (document.activeElement !== inputRef.current) {
                inputRef.current?.focus();
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        if (!showBulkModal) {
            const timer = setTimeout(() => inputRef.current?.focus(), 100);
            return () => {
                clearTimeout(timer);
                window.removeEventListener('keydown', handleKeyDown);
            };
        }
        return () => window.removeEventListener('keydown', handleKeyDown);

    }, [showBulkModal, lastScan]);

    useEffect(() => {
        const handleBlur = () => {
            if (!showBulkModal) {
                setTimeout(() => inputRef.current?.focus(), 100);
            }
        };
        const inputEl = inputRef.current;
        inputEl?.addEventListener('blur', handleBlur);
        return () => inputEl?.removeEventListener('blur', handleBlur);
    }, [showBulkModal]);


    if (isLoading) return <div className="p-8 text-white">Connecting...</div>;
    if (!clicr) return <div className="p-8 text-white">Clicr not found</div>;

    const handleGenderTap = (gender: 'M' | 'F', delta: number) => {
        if (navigator.vibrate) navigator.vibrate(50);

        // 1. Record the Count Event (Changes Occupancy) with Gender
        recordEvent({
            venue_id: 'ven_001',
            area_id: clicr.area_id,
            clicr_id: clicr.id,
            delta: delta,
            flow_type: delta > 0 ? 'IN' : 'OUT',
            gender: gender,
            event_type: 'TAP',
            idempotency_key: Math.random().toString(36)
        });

        // 2. If it's an entry (Delta > 0), also log a "Scan" for the record
        // (Optional: remove this if we rely solely on events for graph, but good for ID log consistency)
        if (delta > 0) {
            recordScan({
                venue_id: 'ven_001',
                scan_result: 'ACCEPTED',
                age: 21,
                age_band: '21+',
                sex: gender,
                zip_code: '00000'
            });
        }
    };

    const handleBulkSubmit = () => {
        if (bulkValue !== 0) {
            recordEvent({
                venue_id: 'ven_001',
                area_id: clicr.area_id,
                clicr_id: clicr.id,
                delta: bulkValue,
                // Always attribute corrections to 'IN' flow as requested
                flow_type: 'IN',
                event_type: 'BULK',
                idempotency_key: Math.random().toString(36)
            });
            setBulkValue(0);
            setShowBulkModal(false);
        }
    };

    // Reset Logic
    const handleReset = async () => {
        if (!window.confirm('WARNING: RESET ALL COUNTS TO ZERO?')) return;

        try {
            // 1. Optimistic Local Update via Store
            resetCounts(); // This clears the context state immediately

            // 2. Force API call just in case store didn't strictly sync yet
            await fetch('/api/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'RESET_COUNTS' }),
                cache: 'no-store'
            });

            // 3. Optional Reload to be safe
            // setTimeout(() => window.location.reload(), 100); 
            // Removed forced reload for smoother UX, since store updates state anyway.

        } catch (e) {
            console.error("Reset failed", e);
        }
    };

    // Scanner Logic
    const processScanResult = (age: number | null, sex: string | null, zip: string | null) => {
        const finalAge = age || 0;
        const scanResult = finalAge >= 21 ? 'ACCEPTED' : 'DENIED';

        // Explicitly check for valid sex chars, default to whatever comes back if it matches M/F.
        // If unknown, default to 'M' for now to ensure graph gets a value, as requested.
        const effectiveSex = (sex === 'M' || sex === 'F') ? sex : 'M';

        const scanEvent: Omit<IDScanEvent, 'id' | 'timestamp'> = {
            venue_id: venueId || 'ven_001',
            scan_result: scanResult,
            age: finalAge,
            age_band: 'Unknown',
            sex: effectiveSex, // Use effective sex here too so UI matches count
            zip_code: zip || '00000'
        };

        recordScan(scanEvent);

        // AUTO-COUNT LOGIC
        // If ID is accepted, automatically add +1 to the count with demographic data
        if (scanResult === 'ACCEPTED') {
            recordEvent({
                venue_id: venueId || 'ven_001',
                area_id: clicr.area_id,
                clicr_id: clicr.id,
                delta: 1,
                flow_type: 'IN',
                gender: effectiveSex,
                event_type: 'SCAN',
                idempotency_key: Math.random().toString(36)
            });
        }

        setLastScan({ ...scanEvent, id: 'temp', timestamp: Date.now() });
    };

    const handleHardwareSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!scannerInput) return;
        try {
            const parsed = parseAAMVA(scannerInput);
            if (parsed.age !== null) processScanResult(parsed.age, parsed.sex, parsed.postalCode);
        } catch (err) { console.error(err); }
        setScannerInput('');
    };

    const handleSimulateScan = () => {
        const mock = generateMockID();
        processScanResult(mock.age, mock.sex, mock.zip);
    };


    return (
        <div className="flex flex-col h-[calc(100vh-100px)] -mt-4 bg-black relative" onClick={() => inputRef.current?.focus()}>

            <form onSubmit={handleHardwareSubmit} className="opacity-0 absolute top-0 left-0 w-0 h-0 overflow-hidden">
                <input ref={inputRef} value={scannerInput} onChange={(e) => setScannerInput(e.target.value)} autoFocus autoComplete="off" type="text" />
                <button type="submit">Scan</button>
            </form>

            {/* Top Bar */}
            <div className="flex items-center justify-between mb-2">
                <button onClick={() => router.back()} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div className="text-center">
                    <h2 className="text-lg font-bold text-white leading-none">{clicr.name}</h2>
                    <span className="text-xs text-slate-500 font-mono">LIVE SYNC ACTIVE</span>
                </div>
                <div className="w-10"></div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col gap-4 relative">

                {/* 1. Occupancy Dashboard (Top) */}
                <div className="flex-1 flex flex-col items-center justify-center gap-4 py-2">

                    {/* Main Big Occupancy Display */}
                    <div className="relative group cursor-default">
                        <div className="text-7xl md:text-9xl leading-none font-mono font-bold text-white tracking-widest tabular-nums filter drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                            {totalAreaCount}
                        </div>
                        <div className="text-center text-slate-500 font-bold uppercase tracking-[0.2em] text-xs mt-1">
                            Live Occupancy
                        </div>
                    </div>

                    {/* Stats Row (In/Out) */}
                    <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
                        {/* Total In */}
                        <button
                            onClick={() => setShowBulkModal(true)}
                            className="bg-slate-900/50 border border-emerald-900/30 rounded-2xl p-2 flex flex-col items-center hover:bg-slate-900 hover:border-emerald-500/50 transition-all active:scale-95"
                        >
                            <div className="flex items-center gap-2 text-emerald-400 mb-1">
                                <ArrowUpCircle className="w-4 h-4" />
                                <span className="text-[10px] font-bold uppercase">Total In</span>
                            </div>
                            <div className="text-xl font-mono text-white font-bold">{globalIn}</div>
                            <div className="text-[9px] text-slate-500 uppercase tracking-wider mt-0.5">Adjust</div>
                        </button>

                        {/* Total Out */}
                        <div className="bg-slate-900/50 border border-rose-900/30 rounded-2xl p-2 flex flex-col items-center opacity-80">
                            <div className="flex items-center gap-2 text-rose-400 mb-1">
                                <ArrowDownCircle className="w-4 h-4" />
                                <span className="text-[10px] font-bold uppercase">Total Out</span>
                            </div>
                            <div className="text-xl font-mono text-white font-bold">{globalOut}</div>
                        </div>
                    </div>
                </div>


                {/* 2. Control Buttons (Mid-Bottom) */}
                <div className="flex gap-4 h-[220px] mb-2 shrink-0 px-4">
                    {/* Male Controls (Blue) */}
                    <div className="flex-1 flex flex-col gap-2">
                        <TapButton
                            type="plus"
                            label="MALE"
                            color="blue"
                            onClick={() => handleGenderTap('M', 1)}
                            className="flex-1 rounded-[1.5rem]"
                        />
                        <TapButton
                            type="minus"
                            color="blue"
                            onClick={() => handleGenderTap('M', -1)}
                            className="h-[60px] rounded-[1.5rem]"
                        />
                    </div>

                    {/* Female Controls (Pink) */}
                    <div className="flex-1 flex flex-col gap-2">
                        <TapButton
                            type="plus"
                            label="FEMALE"
                            color="pink"
                            onClick={() => handleGenderTap('F', 1)}
                            className="flex-1 rounded-[1.5rem]"
                        />
                        <TapButton
                            type="minus"
                            color="pink"
                            onClick={() => handleGenderTap('F', -1)}
                            className="h-[60px] rounded-[1.5rem]"
                        />
                    </div>
                </div>

                {/* Reset Button (Below clickers) */}
                <div className="flex justify-center mb-2 shrink-0">
                    <button
                        onClick={handleReset}
                        className="flex items-center gap-2 px-6 py-2 bg-red-950/20 border border-red-900/40 rounded-full text-red-500/80 text-[10px] font-bold uppercase tracking-widest hover:bg-red-900/60 hover:text-red-400 hover:border-red-500/50 transition-all active:scale-95"
                    >
                        <Trash2 className="w-3 h-3" />
                        Reset All Counts
                    </button>
                </div>


                {/* 3. ID Scanner (Bottom Edge) */}
                <div className="h-[70px] w-full relative shrink-0">
                    <AnimatePresence mode="wait">
                        {lastScan ? (
                            <motion.div
                                key="result"
                                initial={{ y: "100%" }}
                                animate={{ y: 0 }}
                                exit={{ y: "100%" }}
                                className={cn(
                                    "absolute inset-0 rounded-t-3xl flex items-center justify-between px-8 border-t-2 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] z-20 cursor-pointer",
                                    lastScan.scan_result === 'ACCEPTED'
                                        ? "bg-emerald-950 border-emerald-500"
                                        : "bg-red-950 border-red-500"
                                )}
                                onClick={() => setLastScan(null)}
                            >
                                <div className="flex items-center gap-4">
                                    {lastScan.scan_result === 'ACCEPTED' ? (
                                        <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                                    ) : (
                                        <XCircle className="w-10 h-10 text-red-500" />
                                    )}
                                    <div>
                                        <h2 className={cn("text-2xl font-black uppercase tracking-wider leading-none", lastScan.scan_result === 'ACCEPTED' ? "text-emerald-400" : "text-red-500")}>
                                            {lastScan.scan_result}
                                        </h2>
                                        <div className="text-white/60 text-xs font-mono mt-1">
                                            AGE: {lastScan.age} • SEX: {lastScan.sex}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-xs text-white/40 font-bold uppercase tracking-widest">
                                    Tap to Clear
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="idle"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 flex items-center justify-center opacity-50"
                            >
                                <button onClick={(e) => { e.stopPropagation(); handleSimulateScan(); }} className="flex items-center gap-2 text-slate-600 hover:text-slate-400 transition-colors">
                                    <ScanFace className="w-5 h-5" />
                                    <span className="text-xs uppercase font-bold tracking-widest">Scanner Ready</span>
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

            </div>

            {/* Bulk Modal (Reference Design Match) */}
            <AnimatePresence>
                {showBulkModal && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-[#0f1218] border border-slate-800 p-6 rounded-3xl w-full max-w-[340px] shadow-2xl"
                        >
                            <div className="flex justify-between items-start mb-1">
                                <div>
                                    <h3 className="text-xl font-bold text-white">Adjust Total Entries</h3>
                                    <p className="text-slate-500 text-xs mt-1 leading-snug max-w-[200px]">
                                        Correct for guests who entered/left without tracking. This modifies "Total In".
                                    </p>
                                </div>
                                <button
                                    onClick={handleReset}
                                    className="p-2.5 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl hover:bg-red-500/20 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="flex items-center gap-3 my-8">
                                <button
                                    onClick={() => setBulkValue(v => v - 1)}
                                    className="w-12 h-12 flex items-center justify-center bg-[#1e2330] rounded-xl text-white hover:bg-[#2a3040] active:scale-95 transition-all text-xl font-medium"
                                >
                                    <Minus className="w-5 h-5" />
                                </button>

                                <div className="flex-1 bg-black border border-slate-800 rounded-xl h-12 flex items-center px-4">
                                    <input
                                        type="number"
                                        value={bulkValue}
                                        onChange={(e) => setBulkValue(parseInt(e.target.value) || 0)}
                                        className="w-full bg-transparent text-center text-xl font-bold text-white outline-none"
                                    />
                                </div>

                                <button
                                    onClick={() => setBulkValue(v => v + 1)}
                                    className="w-12 h-12 flex items-center justify-center bg-[#1e2330] rounded-xl text-white hover:bg-[#2a3040] active:scale-95 transition-all text-xl font-medium"
                                >
                                    <Plus className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => { setShowBulkModal(false); setBulkValue(0); }}
                                    className="py-3 rounded-xl text-slate-400 bg-[#1e2330] hover:bg-[#2a3040] font-semibold text-sm transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleBulkSubmit}
                                    className="py-3 rounded-xl bg-[#6366f1] text-white font-semibold text-sm hover:bg-[#4f46e5] shadow-lg shadow-indigo-500/30 transition-all active:scale-95"
                                >
                                    Apply
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}


function TapButton({
    type,
    label,
    color,
    onClick,
    className
}: {
    type: 'plus' | 'minus',
    label?: string,
    color?: 'blue' | 'pink',
    onClick: () => void,
    className?: string
}) {
    // Colors
    const blueGradient = "bg-blue-600 active:bg-blue-700 from-blue-600 to-blue-800 bg-gradient-to-br border-blue-500/50";
    const pinkGradient = "bg-pink-600 active:bg-pink-700 from-pink-600 to-pink-800 bg-gradient-to-br border-pink-500/50";
    // Fallback for generic
    const greenGradient = "bg-emerald-600 active:bg-emerald-700 from-emerald-600 to-emerald-800 bg-gradient-to-br";
    const redGradient = "bg-rose-600 active:bg-rose-700 from-rose-600 to-rose-800 bg-gradient-to-br";

    let bgClass = "";
    if (color === 'blue') bgClass = blueGradient;
    else if (color === 'pink') bgClass = pinkGradient;
    else bgClass = type === 'plus' ? greenGradient : redGradient;

    return (
        <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onClick}
            className={cn(
                "flex flex-col items-center justify-center relative overflow-hidden group transition-all shadow-2xl border-t border-white/20",
                bgClass,
                className
            )}
        >
            <div className="relative z-10 flex flex-col items-center gap-1">
                {type === 'plus' ? <Plus className={cn("text-white drop-shadow-md", label ? "w-16 h-16" : "w-12 h-12")} /> : <Minus className="w-10 h-10 text-white drop-shadow-md" />}
                {label && <span className="text-white font-bold tracking-widest text-sm uppercase">{label}</span>}
            </div>
            {/* Glossy Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
        </motion.button>
    )
}

