"use client";

import React from 'react';
import { useApp } from '@/lib/store';
import { FileText } from 'lucide-react';

export default function VenueLogs({ venueId }: { venueId: string }) {
    const { venueAuditLogs } = useApp();
    const logs = venueAuditLogs.filter(l => l.venue_id === venueId);

    // If empty for now, mock so checking UI works
    // In real app, we'd rely on 'logs'

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold">Audit Logs</h2>
            <div className="space-y-4">
                {logs.length === 0 && (
                    <div className="p-8 text-center bg-slate-900/30 rounded-2xl border border-slate-800 border-dashed">
                        <FileText className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                        <p className="text-slate-500 text-sm">No audit logs recorded yet.</p>
                    </div>
                )}
                {logs.map(log => (
                    <div key={log.id} className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl">
                        <div className="flex justify-between items-start">
                            <div>
                                <span className="text-sm font-bold text-white bg-slate-800 px-2 py-0.5 rounded mr-2">
                                    {log.action.replace(/_/g, ' ')}
                                </span>
                                <span className="text-slate-400 text-sm">
                                    by User {log.performed_by_user_id}
                                </span>
                            </div>
                            <span className="text-xs text-slate-500">
                                {new Date(log.timestamp).toLocaleString()}
                            </span>
                        </div>
                        {log.details_json && (
                            <pre className="mt-2 text-[10px] text-slate-500 bg-black/30 p-2 rounded overflow-x-auto">
                                {JSON.stringify(log.details_json, null, 2)}
                            </pre>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
