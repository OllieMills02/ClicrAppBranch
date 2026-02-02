'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, BarChart3, Users, ShieldCheck, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export default function DemoPage() {
    return (
        <div className="min-h-screen bg-black text-white selection:bg-indigo-500/30 font-sans">
            {/* Nav */}
            <nav className="border-b border-white/10 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Back to Home
                    </Link>
                    <div className="font-bold tracking-tight text-lg">CLICR <span className="text-primary px-1 bg-primary/10 rounded text-xs uppercase tracking-widest ml-2">Interactive Demo</span></div>
                    <Link href="/login" className="bg-white text-black px-4 py-2 rounded-full text-sm font-bold hover:bg-slate-200 transition-colors">
                        Start Real Trial
                    </Link>
                </div>
            </nav>

            <main className="p-6 md:p-12 max-w-7xl mx-auto space-y-12">

                {/* Intro */}
                <div className="text-center space-y-4 max-w-2xl mx-auto">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight">See Your Venue in Real-Time.</h1>
                    <p className="text-slate-400 text-lg">
                        This is a simulation of the CLICR dashboard. In the full app, these numbers update instantly as your staff scan IDs and click counters.
                    </p>
                </div>

                {/* Dashboard Simulation */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

                    {/* Sidebar Sim */}
                    <div className="hidden lg:block space-y-2">
                        <div className="p-4 bg-slate-900/50 rounded-xl border border-white/5 space-y-4">
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Venue</div>
                            <div className="font-bold text-lg">The Grand Hall</div>
                            <div className="text-sm text-green-400 flex items-center gap-2">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                                Live System Active
                            </div>
                        </div>
                        <div className="p-4 rounded-xl hover:bg-white/5 cursor-pointer transition-colors font-medium text-white bg-white/5 border border-primary/20">
                            Dashboard
                        </div>
                        <div className="p-4 rounded-xl hover:bg-white/5 cursor-pointer transition-colors font-medium text-slate-400">
                            Reports
                        </div>
                        <div className="p-4 rounded-xl hover:bg-white/5 cursor-pointer transition-colors font-medium text-slate-400">
                            Staff & Security
                        </div>
                    </div>

                    {/* Main Content Sim */}
                    <div className="lg:col-span-3 space-y-6">

                        {/* Stats Row */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <StatCard
                                label="Total Occupancy"
                                value="842"
                                sub="92% Capacity"
                                icon={<Users className="text-blue-400" />}
                                trend="+12% vs last hr"
                            />
                            <StatCard
                                label="In / Out Flow"
                                value="1,240 / 398"
                                sub="High turnover night"
                                icon={<Zap className="text-amber-400" />}
                                trend="Peak intake now"
                            />
                            <StatCard
                                label="Banned Scans"
                                value="3"
                                sub="Auto-rejected at door"
                                icon={<ShieldCheck className="text-red-400" />}
                                trend="Security Alert"
                                alert
                            />
                        </div>

                        {/* Live Chart Placeholder */}
                        <div className="p-6 bg-slate-900/50 border border-white/5 rounded-2xl h-80 flex flex-col items-center justify-center text-center relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80 z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                                <Link href="/login" className="px-8 py-3 bg-primary text-black font-bold rounded-full transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                                    Unlock Real Analytics
                                </Link>
                            </div>
                            <BarChart3 className="w-16 h-16 text-slate-700 mb-4" />
                            <h3 className="text-xl font-bold text-slate-500">Live Traffic Volume</h3>
                            <p className="text-slate-600">Interact with live charts in the full version.</p>

                            {/* Fake bars */}
                            <div className="absolute bottom-0 left-0 right-0 h-32 flex items-end justify-between px-12 opacity-20 gap-2">
                                {[40, 65, 30, 80, 50, 90, 45, 70, 60, 85].map((h, i) => (
                                    <div key={i} className="w-full bg-primary rounded-t-sm" style={{ height: `${h}%` }}></div>
                                ))}
                            </div>
                        </div>

                        {/* Recent Activity */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold">Live Activity Feed</h3>
                            <div className="space-y-2">
                                <ActivityRow time="Just now" text="Front Door Scanned ID: Sarah M. (Verified 21+)" />
                                <ActivityRow time="12s ago" text="VIP Entrance +2 Guests" />
                                <ActivityRow time="45s ago" text="Patio Capacity Reached (100/100)" alert />
                                <ActivityRow time="1m ago" text="Bar Area -4 Guests" />
                            </div>
                        </div>

                    </div>
                </div>

                {/* Call to Action */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-6">
                    <h2 className="text-3xl font-bold">Ready to command your venue?</h2>
                    <p className="text-slate-400 max-w-lg mx-auto">
                        Get the full suite of tools: ID Scanning, Ban Networking, and Multi-Venue Management.
                    </p>
                    <Link href="/login" className="inline-flex h-12 items-center justify-center rounded-full bg-white px-8 text-sm font-bold text-black transition-colors hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-900">
                        Start Your Free Trial
                    </Link>
                </div>

            </main>
        </div>
    );
}

function StatCard({ label, value, sub, icon, trend, alert }: any) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-6 rounded-2xl border flex flex-col justify-between h-40 ${alert ? 'bg-red-950/10 border-red-500/20' : 'bg-slate-900/50 border-white/5'}`}
        >
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
        </motion.div>
    )
}

function ActivityRow({ time, text, alert }: any) {
    return (
        <div className={`p-4 rounded-xl border flex items-center gap-4 ${alert ? 'bg-amber-950/10 border-amber-500/20' : 'bg-slate-950 border-white/5'}`}>
            <div className="text-xs font-mono text-slate-500 w-16 text-right">{time}</div>
            <div className={`text-sm font-medium ${alert ? 'text-amber-200' : 'text-slate-300'}`}>{text}</div>
        </div>
    )
}
