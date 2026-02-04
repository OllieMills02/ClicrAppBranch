'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/store';
import { getTrafficTotals, getTodayWindow, getVenueSummaries } from '@/lib/metrics-service';
import { createClient } from '@/utils/supabase/client';

export default function RuntimeInspector() {
    const { debug, business, venues, areas, clicrs, events, scanEvents, lastError, currentUser, devices } = useApp();
    const [manualTotals, setManualTotals] = useState<any>(null);
    const [manualAreaSummaries, setManualAreaSummaries] = useState<any>(null);

    const testTrafficTotals = async () => {
        if (!business) return;
        const w = getTodayWindow();
        const totals = await getTrafficTotals({ business_id: business.id }, w);
        setManualTotals({ params: { business_id: business.id, window: w }, result: totals });
    };

    const testAreaSummaries = async () => {
        if (!venues.length) return;
        // Test first venue
        const v = venues[0];
        const sums = getVenueSummaries([v], areas);
        setManualAreaSummaries(sums);
    };

    return (
        <div className="space-y-8 text-sm">

            {/* A. Environment */}
            <section className="bg-slate-950 p-6 rounded-lg shadow-sm border border-slate-800 text-slate-300">
                <h2 className="text-lg font-bold mb-4 text-white border-b border-slate-700 pb-2">A. Environment</h2>
                <div className="grid grid-cols-[140px_1fr] gap-2 font-mono text-xs">
                    <div className="text-slate-500">Commit SHA:</div>
                    <div>{process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || 'DEV_BUILD'}</div>
                    <div className="text-slate-500">Supabase URL:</div>
                    <div>{process.env.NEXT_PUBLIC_SUPABASE_URL}</div>
                    <div className="text-slate-500">Timestamp:</div>
                    <div>{new Date().toISOString()}</div>
                </div>
            </section>

            {/* B. Tenant Context */}
            <section className="bg-slate-950 p-6 rounded-lg shadow-sm border border-slate-800 text-slate-300">
                <h2 className="text-lg font-bold mb-4 text-white border-b border-slate-700 pb-2">B. Tenant Context</h2>
                <div className="grid grid-cols-[140px_1fr] gap-2 font-mono text-xs">
                    <div className="text-slate-500">User ID:</div>
                    <div>{currentUser?.id || 'unauthenticated'}</div>
                    <div className="text-slate-500">Role:</div>
                    <div>{currentUser?.role || '-'}</div>
                    <div className="text-slate-500">Business ID:</div>
                    <div>{business?.id || 'None'} <span className="text-slate-500">({business?.name})</span></div>
                    <div className="text-slate-500">Venue Count:</div>
                    <div>{venues.length}</div>
                </div>
            </section>

            {/* C. Areas Tab Diagnostics */}
            <section className="bg-slate-950 p-6 rounded-lg shadow-sm border border-slate-800 text-slate-300">
                <div className="flex justify-between items-center border-b border-slate-700 pb-2 mb-4">
                    <h2 className="text-lg font-bold text-white">C. Areas Tab Diagnostics</h2>
                    <button onClick={testAreaSummaries} className="bg-indigo-600 px-3 py-1 rounded text-white text-xs hover:bg-indigo-500">Test Calculation</button>
                </div>

                <div className="font-mono text-xs">
                    <div className="mb-4">
                        <div className="text-slate-500 mb-1">Loaded Areas ({areas.length}):</div>
                        <div className="max-h-40 overflow-auto bg-slate-900 p-2 rounded">
                            {areas.map(a => (
                                <div key={a.id} className="flex justify-between border-b last:border-0 border-slate-800 py-1">
                                    <span>{a.name} ({a.id.slice(0, 6)})</span>
                                    <span className={a.current_occupancy !== undefined ? "text-emerald-400" : "text-red-500"}>
                                        Occ: {a.current_occupancy ?? 'NULL'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                    {manualAreaSummaries && (
                        <div className="mt-4 border-t border-slate-700 pt-2">
                            <div className="text-slate-500 mb-1">Manual Test Result:</div>
                            <pre className="bg-slate-900 p-2 rounded overflow-auto">{JSON.stringify(manualAreaSummaries, null, 2)}</pre>
                        </div>
                    )}
                </div>
            </section>

            {/* D. Traffic Totals Diagnostics */}
            <section className="bg-slate-950 p-6 rounded-lg shadow-sm border border-slate-800 text-slate-300">
                <div className="flex justify-between items-center border-b border-slate-700 pb-2 mb-4">
                    <h2 className="text-lg font-bold text-white">D. Traffic Totals Diagnostics</h2>
                    <button onClick={testTrafficTotals} className="bg-indigo-600 px-3 py-1 rounded text-white text-xs hover:bg-indigo-500">Test RPC</button>
                </div>

                <div className="font-mono text-xs space-y-4">
                    <div>
                        <div className="text-slate-500">Time Window (Local):</div>
                        <div>Start: {getTodayWindow().start}</div>
                        <div>End:   {getTodayWindow().end}</div>
                    </div>

                    <div>
                        <div className="text-slate-500 mb-1">Last 10 Events:</div>
                        <div className="max-h-40 overflow-auto bg-slate-900 p-2 rounded">
                            {events.slice(0, 10).map(e => (
                                <div key={e.id} className="border-b last:border-0 border-slate-800 py-1 flex gap-2">
                                    <span className="text-slate-500">{new Date(e.timestamp).toLocaleTimeString()}</span>
                                    <span className={e.delta > 0 ? "text-emerald-400" : "text-amber-400"}>{e.delta > 0 ? '+' : ''}{e.delta}</span>
                                    <span className="text-slate-600">{e.venue_id?.slice(0, 4)}... / {e.area_id?.slice(0, 4)}...</span>
                                    <span className="text-slate-400">{e.event_type}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {manualTotals && (
                        <div className="mt-4 border-t border-slate-700 pt-2">
                            <div className="text-slate-500 mb-1">RPC Result:</div>
                            <pre className="bg-slate-900 p-2 rounded overflow-auto">{JSON.stringify(manualTotals, null, 2)}</pre>
                        </div>
                    )}
                </div>
            </section>

            {/* E. Devices / Delete Diagnostics */}
            <section className="bg-slate-950 p-6 rounded-lg shadow-sm border border-slate-800 text-slate-300">
                <h2 className="text-lg font-bold mb-4 text-white border-b border-slate-700 pb-2">E. Devices (Clicrs)</h2>
                <div className="font-mono text-xs max-h-40 overflow-auto bg-slate-900 p-2 rounded">
                    {devices.map(d => (
                        <div key={d.id} className="flex justify-between border-b last:border-0 border-slate-800 py-1">
                            <span>{d.device_name} ({d.id.slice(0, 6)})</span>
                            <span>{d.status} / {d.direction_mode}</span>
                        </div>
                    ))}
                    {clicrs.map(c => (
                        <div key={c.id} className="flex justify-between border-b last:border-0 border-slate-800 py-1 opacity-70">
                            <span>[LEGACY] {c.name} ({c.id.slice(0, 6)})</span>
                            <span>Active: {String(c.active)}</span>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
