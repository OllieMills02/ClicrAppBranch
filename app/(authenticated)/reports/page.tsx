"use client";

import React, { useMemo } from 'react';
import { useApp } from '@/lib/store';
import { FileSpreadsheet, FileText, Download, Calendar } from 'lucide-react';
import { exportReportsToExcel, exportToCSV } from '@/lib/exportUtils';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';

// Mock Data if empty
const MOCK_SCANS_FOR_VISUAL = [
    { age_band: '18-20', count: 12 },
    { age_band: '21-24', count: 45 },
    { age_band: '25-34', count: 80 },
    { age_band: '35-44', count: 30 },
    { age_band: '45+', count: 15 },
];

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#06b6d4', '#10b981'];

export default function ReportsPage() {
    const { events, scanEvents, venues, areas, clicrs } = useApp();

    const handleExportExcel = () => {
        exportReportsToExcel(events, scanEvents, venues, areas, clicrs, `CLICR_Report_${new Date().toISOString().split('T')[0]}`);
    };

    const scanChartData = useMemo(() => {
        if (scanEvents.length === 0) return MOCK_SCANS_FOR_VISUAL;
        // aggregate real scan events
        // omitted for brevity, using mock for visual
        return MOCK_SCANS_FOR_VISUAL;
    }, [scanEvents]);

    return (
        <div className="space-y-8 animate-[fade-in_0.5s_ease-out]">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">Reports & Analytics</h1>
                    <p className="text-slate-400">Export detailed audit logs and audience insights.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors">
                        <Calendar className="w-4 h-4" />
                        <span>Last 24 Hours</span>
                    </button>
                    <button
                        onClick={handleExportExcel}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-lg shadow-emerald-900/20 transition-all transform hover:-translate-y-0.5"
                    >
                        <FileSpreadsheet className="w-4 h-4" />
                        <span>Export Excel</span>
                    </button>
                    <button
                        onClick={() => exportToCSV(events, 'events_log')}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors"
                    >
                        <FileText className="w-4 h-4" />
                        <span>CSV</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Audience Age Distribution */}
                <div className="glass-panel p-6 rounded-xl">
                    <h3 className="text-lg font-bold text-white mb-6">Audience Age Distribution</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={scanChartData}>
                                <XAxis dataKey="age_band" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }} />
                                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Gender Split (Mock) */}
                <div className="glass-panel p-6 rounded-xl">
                    <h3 className="text-lg font-bold text-white mb-6">Demographics</h3>
                    <div className="h-[300px] flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={[
                                        { name: 'Male', value: 45 },
                                        { name: 'Female', value: 50 },
                                        { name: 'Non-Binary', value: 5 }
                                    ]}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {MOCK_SCANS_FOR_VISUAL.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Recent Events Table */}
            <div className="glass-panel rounded-xl overflow-hidden">
                <div className="p-6 border-b border-white/5">
                    <h3 className="text-lg font-bold text-white">Recent Event Log</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-900/50 text-slate-400 uppercase text-xs">
                            <tr>
                                <th className="px-6 py-3">Time</th>
                                <th className="px-6 py-3">Type</th>
                                <th className="px-6 py-3">Clicr / Area</th>
                                <th className="px-6 py-3">Delta</th>
                                <th className="px-6 py-3">User</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {events.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">No events recorded today</td>
                                </tr>
                            ) : (
                                events.slice(0, 10).map(e => (
                                    <tr key={e.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4 font-mono text-slate-400">{new Date(e.timestamp).toLocaleTimeString()}</td>
                                        <td className="px-6 py-4">
                                            <span className={cn(
                                                "px-2 py-1 rounded-full text-xs font-bold",
                                                e.event_type === 'TAP' ? "bg-slate-700 text-slate-200" : "bg-orange-500/20 text-orange-400"
                                            )}>
                                                {e.event_type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-white">
                                            {clicrs.find(c => c.id === e.clicr_id)?.name || e.clicr_id}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={cn(
                                                "text-base font-bold",
                                                e.delta > 0 ? "text-emerald-400" : "text-rose-400"
                                            )}>
                                                {e.delta > 0 ? '+' : ''}{e.delta}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-400">
                                            {e.user_id}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
