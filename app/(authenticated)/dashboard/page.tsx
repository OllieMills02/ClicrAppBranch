"use client";

import React, { useMemo } from 'react';
import { useApp } from '@/lib/store';
import { KpiCard } from '@/components/ui/KpiCard';
import { Users, LogIn, LogOut, Building2, MapPin, AlertTriangle, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function DashboardPage() {
    const { business, venues, areas, clicrs, isLoading, refreshTrafficStats } = useApp();

    // Init: Fetch traffic stats
    React.useEffect(() => {
        if (venues.length > 0) refreshTrafficStats();
        // Poll for traffic stats every 30s as a backup
        const interval = setInterval(() => refreshTrafficStats(), 30000);
        return () => clearInterval(interval);
    }, [venues.length, refreshTrafficStats]);

    // Helper to get stats for a specific venue
    const getVenueStats = (venueId: string) => {
        const venueAreas = areas.filter(a => a.venue_id === venueId);

        // Calculate Occupancy (Live - based on Area Snapshots which are the Source of Truth)
        const occupancy = venueAreas.reduce((sum, a) => sum + (a.current_occupancy || 0), 0);

        // Calculate In/Out (Today) based on Server Stats (Realtime Synced)
        // We now rely on the 'current_traffic_in/out' fields on the Area object, populated by refreshTrafficStats
        const inCount = venueAreas.reduce((sum, a) => sum + (a.current_traffic_in || 0), 0);
        const outCount = venueAreas.reduce((sum, a) => sum + (a.current_traffic_out || 0), 0);

        // Capacity
        const venueTotalCap = venueAreas.reduce((sum, a) => sum + (a.default_capacity || 0), 0);

        return {
            occupancy,
            inCount,
            outCount,
            areas: venueAreas.map(a => {
                return { ...a, currentOccupancy: a.current_occupancy || 0 };
            }),
            capacity: venueTotalCap,
            pct: venueTotalCap > 0 ? (occupancy / venueTotalCap) * 100 : 0
        };
    };


    if (isLoading || !business) {
        return <div className="p-8 text-white">Loading dashboard...</div>;
    }

    return (
        <div className="space-y-8 animate-[fade-in_0.5s_ease-out]">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">Dashboard</h1>
                    <p className="text-slate-400 mt-1">Real-time overview for <span className="text-primary font-semibold">{business.name}</span></p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-medium border border-emerald-500/20">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        System Operational
                    </div>
                </div>
            </div>

            {/* Per-Venue Sections */}
            <div className="space-y-6">

                {/* ONBOARDING EMPTY STATE */}
                {venues.length === 0 && (
                    <div className="bg-[#1e2330]/50 border border-white/5 rounded-3xl p-12 text-center flex flex-col items-center justify-center space-y-6 max-w-2xl mx-auto mt-12">
                        <div className="w-24 h-24 bg-primary/20 text-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/10 mb-2">
                            <img src="/clicr-logo-white.png" alt="Clicr" className="w-16 h-16 object-contain" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-2">Welcome to your Dashboard</h2>
                            <p className="text-slate-400 max-w-md mx-auto">
                                It looks like you haven't set up any venues yet. Get started by adding your first location to track occupancy.
                            </p>
                        </div>
                        <Link
                            href="/venues/new"
                            className="bg-primary hover:bg-primary-hover text-white font-bold py-4 px-8 rounded-full shadow-lg shadow-primary/25 transition-all flex items-center gap-2"
                        >
                            Set up your first Venue <ArrowRight className="w-5 h-5" />
                        </Link>
                    </div>
                )}


                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {venues.map(venue => {
                        const stats = getVenueStats(venue.id);
                        return (
                            <div key={venue.id} className="glass-panel p-6 rounded-2xl border border-slate-800 hover:border-slate-700 transition-colors">
                                {/* Venue Header */}
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex items-start gap-4">
                                        <div className="p-3 bg-slate-800 rounded-xl">
                                            <Building2 className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-white">{venue.name}</h3>
                                            <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                                                <MapPin className="w-3 h-3" />
                                                {venue.city ? `${venue.city}, ${venue.state}` : 'Location Unset'}
                                            </div>
                                        </div>
                                    </div>
                                    <Link
                                        href={`/venues/${venue.id}`}
                                        className="text-xs font-bold text-white bg-primary px-4 py-2 rounded-full hover:bg-indigo-500 shadow-lg shadow-primary/25 transition-all flex items-center gap-2 group"
                                    >
                                        Manage
                                        <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                                    </Link>
                                </div>

                                {/* Venue Mini KPIs */}
                                <div className="grid grid-cols-3 gap-4 mb-6">
                                    <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800">
                                        <div className="text-xs text-slate-500 mb-1">Occupancy</div>
                                        <div className="text-xl font-bold font-mono text-white">{stats.occupancy}</div>
                                    </div>
                                    <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800">
                                        <div className="text-xs text-slate-500 mb-1">In</div>
                                        <div className="text-xl font-bold font-mono text-emerald-400">+{stats.inCount}</div>
                                    </div>
                                    <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800">
                                        <div className="text-xs text-slate-500 mb-1">Out</div>
                                        <div className="text-xl font-bold font-mono text-amber-400">-{stats.outCount}</div>
                                    </div>
                                </div>

                                {/* Areas List */}
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Area Status</h4>
                                    {stats.areas.length === 0 && <p className="text-xs text-slate-600 italic">No areas configured.</p>}
                                    {stats.areas.map(area => {
                                        // Handle fallback for legacy 'capacity' field
                                        const cap = area.default_capacity || (area as any).capacity || 0;
                                        const pct = cap > 0 ? (area.currentOccupancy / cap) * 100 : 0;
                                        const isHigh = pct > 90;

                                        return (
                                            <div key={area.id} className="relative">
                                                <div className="flex justify-between items-center text-sm mb-1">
                                                    <span className="font-medium text-slate-300">{area.name}</span>
                                                    <span className={cn("font-mono", isHigh ? "text-red-400 font-bold" : "text-slate-400")}>
                                                        {area.currentOccupancy} <span className="text-slate-600 text-xs">/ {cap || '∞'}</span>
                                                    </span>
                                                </div>
                                                {cap ? (
                                                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                        <div
                                                            className={cn(
                                                                "h-full rounded-full transition-all",
                                                                isHigh ? "bg-red-500" : pct > 75 ? "bg-amber-500" : "bg-primary"
                                                            )}
                                                            style={{ width: `${Math.min(pct, 100)}%` }}
                                                        />
                                                    </div>
                                                ) : null}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
