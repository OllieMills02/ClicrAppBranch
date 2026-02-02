'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, BarChart3, Users, ShieldCheck, Zap, Smartphone, ScanLine, List, Activity, CheckCircle, SmartphoneNfc } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function DemoPage() {
    const [tab, setTab] = useState('DASHBOARD');

    // Stats for Dashboard Sim
    const [occupancy, setOccupancy] = useState(842);
    useEffect(() => {
        const interval = setInterval(() => {
            setOccupancy(prev => prev + (Math.random() > 0.6 ? 1 : -1));
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="min-h-screen bg-black text-white selection:bg-indigo-500/30 font-sans">
            {/* Nav */}
            <nav className="border-b border-white/10 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="https://clicr.co" className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Back to Website
                    </Link>
                    <div className="font-bold tracking-tight text-lg">CLICR <span className="text-primary px-1 bg-primary/10 rounded text-xs uppercase tracking-widest ml-2">Product Tour</span></div>
                    <Link href="/login" className="bg-white text-black px-4 py-2 rounded-full text-sm font-bold hover:bg-slate-200 transition-colors">
                        Start Real Trial
                    </Link>
                </div>
            </nav>

            <main className="p-6 md:p-12 max-w-7xl mx-auto space-y-8">

                {/* Intro */}
                <div className="text-center space-y-4 max-w-2xl mx-auto mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight">The Operating System for Nightlife.</h1>
                    <p className="text-slate-400 text-lg">
                        Use the tabs below to experience the CLICR ecosystem.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

                    {/* Navigation Sidebar */}
                    <div className="hidden lg:block space-y-2">
                        <div className="p-4 bg-slate-900/50 rounded-xl border border-white/5 space-y-4 mb-6">
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Live Status</div>
                            <div className="font-bold text-lg">The Grand Hall</div>
                            <div className="text-sm text-green-400 flex items-center gap-2">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                                System Online
                            </div>
                        </div>

                        <NavTab active={tab} id="DASHBOARD" setTab={setTab} icon={<Activity />} label="Dashboard" desc="Owner View" />
                        <NavTab active={tab} id="APP" setTab={setTab} icon={<Smartphone />} label="The Clicr App" desc="Door Staff View" />
                        <NavTab active={tab} id="SCANNER" setTab={setTab} icon={<ScanLine />} label="ID Scanner" desc="Security View" />
                        <NavTab active={tab} id="GUESTS" setTab={setTab} icon={<List />} label="Guest Directory" desc="Data View" />
                    </div>

                    {/* Mobile Nav (Horizontal) */}
                    <div className="lg:hidden flex overflow-x-auto gap-4 pb-4">
                        <button onClick={() => setTab('DASHBOARD')} className="bg-slate-900 px-4 py-2 rounded-full whitespace-nowrap text-sm font-bold border border-white/10">Dashboard</button>
                        <button onClick={() => setTab('APP')} className="bg-slate-900 px-4 py-2 rounded-full whitespace-nowrap text-sm font-bold border border-white/10">App</button>
                        <button onClick={() => setTab('SCANNER')} className="bg-slate-900 px-4 py-2 rounded-full whitespace-nowrap text-sm font-bold border border-white/10">Scanner</button>
                        <button onClick={() => setTab('GUESTS')} className="bg-slate-900 px-4 py-2 rounded-full whitespace-nowrap text-sm font-bold border border-white/10">Guests</button>
                    </div>

                    {/* Content Area */}
                    <div className="lg:col-span-3 min-h-[600px] bg-slate-950/30 border border-white/5 rounded-3xl p-6 lg:p-12 relative overflow-hidden flex flex-col justify-center">
                        <AnimatePresence mode="wait">

                            {tab === 'DASHBOARD' && (
                                <motion.div key="dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8 w-full">
                                    <div className="space-y-2">
                                        <h2 className="text-3xl font-bold">Real-Time Command Center</h2>
                                        <p className="text-slate-400">Watch your venue fill up in real-time. Syncs instantly with every door device.</p>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <StatCard label="Live Occupancy" value={occupancy} sub="92% Capacity" icon={<Users className="text-blue-400" />} trend="+Live" />
                                        <StatCard label="Total Entries" value="1,240" sub="Since 8:00 PM" icon={<Zap className="text-amber-400" />} trend="Peak Mode" />
                                        <StatCard label="Banned Scans" value="3" sub="Intercepted" icon={<ShieldCheck className="text-red-400" />} trend="Action Required" alert />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-slate-900/50 rounded-xl p-6 border border-white/5 space-y-4">
                                            <h3 className="font-bold text-slate-300">Live Activity Feed</h3>
                                            <div className="space-y-3">
                                                <ActivityRow time="Now" text="Entry at Main Door (+1)" />
                                                <ActivityRow time="2s ago" text="Entry at VIP Lane (+1)" />
                                                <ActivityRow time="12s ago" text="ID Scanned: M. Thompson (24)" />
                                                <ActivityRow time="45s ago" text="Capacity Warning: 90%" alert />
                                            </div>
                                        </div>
                                        <div className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 rounded-xl p-6 border border-white/5 flex flex-col items-center justify-center text-center">
                                            <div className="mb-4 bg-indigo-500/20 p-4 rounded-full"><BarChart3 className="w-8 h-8 text-indigo-400" /></div>
                                            <h3 className="font-bold text-lg">Advanced Analytics</h3>
                                            <p className="text-sm text-slate-400 mt-2">Historical trends, peak hour analysis, and dwell time reports are available in the full dashboard.</p>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {tab === 'APP' && (
                                <motion.div key="app" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex flex-col lg:flex-row gap-12 items-center w-full">
                                    <div className="space-y-6 flex-1">
                                        <h2 className="text-3xl font-bold">The Clicr App</h2>
                                        <div className="text-slate-400 space-y-4 text-lg">
                                            <p>Replace old mechanical clickers with smart devices. Multiple staff members can count at different doors, and everything syncs to the sum total automatically.</p>
                                            <ul className="space-y-3 text-sm text-slate-300">
                                                <li className="flex gap-3"><CheckCircle className="w-5 h-5 text-green-400" /> Works Offline (Local Cache)</li>
                                                <li className="flex gap-3"><CheckCircle className="w-5 h-5 text-green-400" /> Syncs every 2 seconds</li>
                                                <li className="flex gap-3"><CheckCircle className="w-5 h-5 text-green-400" /> Haptic Feedback</li>
                                            </ul>
                                        </div>
                                    </div>
                                    {/* Mock Phone */}
                                    <div className="relative w-[300px] h-[600px] bg-black border-8 border-slate-800 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col shrink-0">
                                        <div className="h-full bg-slate-950 flex flex-col relative w-full">
                                            {/* Dynamic Clicker Sim */}
                                            <ClicrSimulator />
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {tab === 'SCANNER' && (
                                <motion.div key="scanner" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex flex-col lg:flex-row gap-12 items-center w-full">
                                    <div className="space-y-6 flex-1">
                                        <h2 className="text-3xl font-bold">Instant ID Verification</h2>
                                        <div className="text-slate-400 space-y-4 text-lg">
                                            <p>Scan driver's licenses from all 50 states + Canada. Instantly verify age and check against your global ban list.</p>
                                            <ul className="space-y-3 text-sm text-slate-300">
                                                <li className="flex gap-3"><SmartphoneNfc className="w-5 h-5 text-blue-400" /> Supports Camera & Bluetooth Scanners</li>
                                                <li className="flex gap-3"><CheckCircle className="w-5 h-5 text-green-400" /> Detects Fake/Expired IDs</li>
                                                <li className="flex gap-3"><ShieldCheck className="w-5 h-5 text-red-400" /> Flags Banned Patrons instantly</li>
                                            </ul>
                                        </div>
                                    </div>
                                    {/* Mock Phone Scanner */}
                                    <div className="relative w-[300px] h-[600px] bg-black border-8 border-slate-800 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col shrink-0">
                                        <ScannerSimulator />
                                    </div>
                                </motion.div>
                            )}

                            {tab === 'GUESTS' && (
                                <motion.div key="guests" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8 h-full flex flex-col w-full">
                                    <div className="space-y-2">
                                        <h2 className="text-3xl font-bold">Smart Guest Directory</h2>
                                        <p className="text-slate-400">Every scan builds your database. Search guests, check history, and manage bans across all your venues.</p>
                                    </div>

                                    <div className=" bg-slate-900 rounded-xl border border-white/10 overflow-hidden flex flex-col w-full">
                                        {/* Mock Table Header */}
                                        <div className="grid grid-cols-4 bg-slate-950 p-4 font-bold text-xs text-slate-500 uppercase tracking-wider">
                                            <div className="col-span-1">Name</div>
                                            <div className="col-span-1">Age</div>
                                            <div className="col-span-1">City</div>
                                            <div className="col-span-1 text-right">Status</div>
                                        </div>
                                        {/* Mock Rows */}
                                        <div className="divide-y divide-white/5">
                                            <GuestRow name="Sarah Miller" age="24" city="Austin, TX" status="Clean" time="2 mins ago" />
                                            <GuestRow name="James Chen" age="28" city="Dallas, TX" status="Clean" time="5 mins ago" />
                                            <GuestRow name="Michael Ross" age="20" city="Houston, TX" status="Underage" time="12 mins ago" type="fail" />
                                            <GuestRow name="David Clark" age="32" city="Austin, TX" status="VIP" time="15 mins ago" type="vip" />
                                            <GuestRow name="Alex Doe" age="29" city="San Antonio" status="BANNED" time="22 mins ago" type="ban" />
                                            <GuestRow name="Emily White" age="22" city="Austin, TX" status="Clean" time="25 mins ago" />
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                        </AnimatePresence>
                    </div>

                </div>

            </main>
        </div>
    );
}

// --- Sub Components ---

function NavTab({ active, id, setTab, icon, label, desc }: any) {
    const isActive = active === id;
    return (
        <button
            onClick={() => setTab(id)}
            className={`w-full text-left p-4 rounded-xl flex items-start gap-4 transition-all duration-200 ${isActive ? 'bg-indigo-600/90 text-white scale-[1.02] shadow-lg shadow-indigo-500/20 border border-indigo-400/50' : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent'}`}
        >
            <div className={`mt-1 ${isActive ? 'text-white' : 'text-slate-500'}`}>{icon}</div>
            <div>
                <div className="font-bold">{label}</div>
                <div className={`text-xs ${isActive ? 'text-white/80' : 'text-slate-600'}`}>{desc}</div>
            </div>
        </button>
    )
}

function StatCard({ label, value, sub, icon, trend, alert }: any) {
    return (
        <div className={`p-6 rounded-2xl border flex flex-col justify-between h-40 ${alert ? 'bg-red-950/20 border-red-500/20' : 'bg-slate-900/50 border-white/5'}`}>
            <div className="flex justify-between items-start">
                <div className="text-slate-400 text-sm font-medium">{label}</div>
                {icon}
            </div>
            <div>
                <div className="text-3xl font-bold tracking-tight">{value}</div>
                <div className="flex justify-between items-end mt-1">
                    <div className="text-xs text-slate-500">{sub}</div>
                    <div className={`text-xs font-bold ${alert ? 'text-red-400' : 'text-green-400'}`}>{trend}</div>
                </div>
            </div>
        </div>
    )
}

function ActivityRow({ time, text, alert }: any) {
    return (
        <div className={`p-3 rounded-lg border flex items-center gap-3 ${alert ? 'bg-amber-950/20 border-amber-500/20' : 'bg-slate-950 border-white/5'}`}>
            <div className="text-xs font-mono text-slate-500 w-12 text-right shrink-0">{time}</div>
            <div className={`text-sm font-medium leading-tight ${alert ? 'text-amber-200' : 'text-slate-300'}`}>{text}</div>
        </div>
    )
}

function GuestRow({ name, age, city, status, time, type = 'clean' }: any) {
    let statusClass = 'bg-green-500/10 text-green-400 border-green-500/20';
    if (type === 'fail') statusClass = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    if (type === 'ban') statusClass = 'bg-red-500/10 text-red-400 border-red-500/20';
    if (type === 'vip') statusClass = 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';

    return (
        <div className="grid grid-cols-4 p-4 items-center hover:bg-white/5 transition-colors">
            <div className="col-span-1 font-bold">{name}</div>
            <div className="col-span-1 text-slate-400 text-sm">{age}</div>
            <div className="col-span-1 text-slate-400 text-sm">{city}</div>
            <div className="col-span-1 flex justify-end gap-2 items-center">
                <span className="text-xs text-slate-600 hidden md:block">{time}</span>
                <span className={`text-xs px-2 py-1 rounded border font-bold ${statusClass}`}>{status}</span>
            </div>
        </div>
    )
}

// --- Simulators ---

function ClicrSimulator() {
    const [count, setCount] = useState(128);
    const [flash, setFlash] = useState('');

    const tap = (label: string) => {
        setCount(c => c + 1);
        setFlash(label);
        setTimeout(() => setFlash(''), 200);
    };

    return (
        <div className="flex flex-col h-full bg-black text-white p-4">
            <div className="flex justify-between items-center mb-6 pt-8">
                <div className="text-xs font-bold text-slate-500">CLICR</div>
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            </div>
            <div className="flex-1 flex flex-col justify-center items-center gap-2">
                <div className="text-6xl font-black tracking-tighter">{count}</div>
                <div className="text-slate-500 text-sm uppercase tracking-widest">Total Count</div>
            </div>
            <div className="flex-1 grid grid-cols-2 gap-4 mb-12">
                <button
                    onClick={() => tap('M')}
                    className={`rounded-3xl flex items-center justify-center text-2xl font-bold transition-all active:scale-95 ${flash === 'M' ? 'bg-blue-400 text-black' : 'bg-slate-900 border border-slate-800'}`}
                >
                    MALE
                </button>
                <button
                    onClick={() => tap('F')}
                    className={`rounded-3xl flex items-center justify-center text-2xl font-bold transition-all active:scale-95 ${flash === 'F' ? 'bg-pink-400 text-black' : 'bg-slate-900 border border-slate-800'}`}
                >
                    FEMALE
                </button>
            </div>
        </div>
    )
}

function ScannerSimulator() {
    const [scanState, setScanState] = useState<'IDLE' | 'SCANNING' | 'RESULT'>('IDLE');
    const [progress, setProgress] = useState(0);

    const startScan = () => {
        setScanState('SCANNING');
        setProgress(0);
        const interval = setInterval(() => {
            setProgress(p => {
                if (p > 100) {
                    clearInterval(interval);
                    setScanState('RESULT');
                    return 100;
                }
                return p + 5;
            })
        }, 50);
    };

    return (
        <div className="flex flex-col h-full bg-black text-white relative">
            {scanState === 'IDLE' && (
                <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-6">
                    <div className="w-64 h-40 rounded-xl border-2 border-dashed border-slate-700 flex items-center justify-center bg-slate-900/50">
                        <ScanLine className="w-12 h-12 text-slate-500" />
                    </div>
                    <button onClick={startScan} className="w-full py-4 bg-white text-black font-bold rounded-full hover:scale-105 transition-transform">
                        Scan ID
                    </button>
                </div>
            )}

            {scanState === 'SCANNING' && (
                <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-900 relative">
                    <div className="absolute inset-0 bg-green-500/10 animate-pulse"></div>
                    <div className="z-10 text-2xl font-bold">Scanning...</div>
                    <div className="w-full h-2 bg-slate-800 rounded-full mt-4 overflow-hidden">
                        <div className="h-full bg-green-400 transition-all duration-100 ease-linear" style={{ width: `${progress}%` }}></div>
                    </div>
                </div>
            )}

            {scanState === 'RESULT' && (
                <div className="flex-1 flex flex-col p-6 pt-12 space-y-6 items-center text-center">
                    <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center text-black mb-4">
                        <CheckCircle className="w-10 h-10" />
                    </div>
                    <div>
                        <div className="text-3xl font-bold">Verified</div>
                        <div className="text-slate-400">Entry Allowed</div>
                    </div>
                    <div className="w-full bg-slate-900 rounded-xl p-4 text-left space-y-2 border border-slate-800">
                        <div className="text-xs text-slate-500 uppercase">Name</div>
                        <div className="font-bold text-lg">Sarah Jenkins</div>
                        <div className="grid grid-cols-2 gap-4 pt-2">
                            <div>
                                <div className="text-xs text-slate-500 uppercase">Age</div>
                                <div className="font-bold text-xl">24</div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 uppercase">Exp</div>
                                <div className="font-bold text-green-400 text-sm">Valid</div>
                            </div>
                        </div>
                    </div>
                    <button onClick={() => setScanState('IDLE')} className="w-full py-3 bg-slate-800 font-bold rounded-full mt-auto">
                        Scan Next
                    </button>
                </div>
            )}
        </div>
    )
}
