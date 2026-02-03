'use client';

import React, { useState } from 'react';
import { banPatron } from '@/app/(authenticated)/scanner/actions';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function NewBanPage() {
    const router = useRouter();
    const [submitting, setSubmitting] = useState(false);

    // Identity Fields
    const [idNumber, setIdNumber] = useState('');
    const [state, setState] = useState('');
    const [dob, setDob] = useState(''); // YYYY-MM-DD from input type=date

    // Ban Details
    const [reason, setReason] = useState('AGGRESSIVE');
    const [scope, setScope] = useState('BUSINESS');
    const [notes, setNotes] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        const dobFormatted = dob.replace(/-/g, ''); // YYYYMMDD

        const res = await banPatron(null, { state, idNumber, dob: dobFormatted }, {
            reason,
            scope,
            notes,
            duration: 'PERMANENT'
        });

        if (res.success) {
            router.push('/banning');
            router.refresh();
        } else {
            alert('Error: ' + res.error);
            setSubmitting(false);
        }
    };

    return (
        <div className="p-8 max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Link href="/banning" className="text-slate-400 hover:text-white flex items-center gap-2 text-sm font-bold">
                <ArrowLeft className="w-4 h-4" /> Back to List
            </Link>

            <div>
                <h1 className="text-3xl font-bold text-white">Manual Ban Entry</h1>
                <p className="text-slate-400 mt-1">
                    Add a ban by Manually entering ID details. This calculates the hash without scanning.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">

                {/* section: Identity */}
                <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                    <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-2 mb-4">Patron Details</h2>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-500">State / Region</label>
                            <input
                                required
                                type="text"
                                maxLength={2}
                                placeholder="CA"
                                value={state} onChange={e => setState(e.target.value.toUpperCase())}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white font-mono"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-500">Date of Birth</label>
                            <input
                                required
                                type="date"
                                value={dob} onChange={e => setDob(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white font-mono"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-slate-500">ID Number</label>
                        <input
                            required
                            type="text"
                            placeholder="D1234567"
                            value={idNumber} onChange={e => setIdNumber(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white font-mono"
                        />
                    </div>
                </section>

                {/* section: Ban Rules */}
                <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                    <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-2 mb-4">Ban Rules</h2>

                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-slate-500">Reason</label>
                        <select
                            value={reason} onChange={e => setReason(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white"
                        >
                            <option value="AGGRESSIVE">Aggressive Behavior</option>
                            <option value="THEFT">Theft / Stealing</option>
                            <option value="HARASSMENT">Harassment</option>
                            <option value="VIP_VIOLATION">VIP Violation</option>
                            <option value="OTHER">Other</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-slate-500">Notes (Internal)</label>
                        <textarea
                            value={notes} onChange={e => setNotes(e.target.value)}
                            placeholder="Describe what happened..."
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white h-24"
                        />
                    </div>

                    <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                        <p className="text-sm text-red-200">
                            This will immediately block this ID from entering <strong>All Venues</strong> in your business.
                            The patron will be flagged as "BANNED" on future scans.
                        </p>
                    </div>
                </section>

                <div className="flex justify-end gap-4">
                    <Link href="/banning" className="px-6 py-3 rounded-xl font-bold text-slate-400 hover:text-white transition-colors">
                        Cancel
                    </Link>
                    <button
                        disabled={submitting}
                        type="submit"
                        className="px-8 py-3 bg-red-600 rounded-xl font-bold text-white hover:bg-red-500 shadow-lg shadow-red-900/20 disabled:opacity-50 flex items-center gap-2"
                    >
                        {submitting ? 'Saving...' : 'Confirm Ban'} <Save className="w-4 h-4" />
                    </button>
                </div>

            </form>
        </div>
    );
}
