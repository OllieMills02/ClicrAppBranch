
import React from 'react';
import { cn } from '@/lib/utils';
import { tokens } from '../tokens';
import { Check, X } from 'lucide-react';

export type ScanStatus = 'ALLOWED' | 'DENIED_UNDERAGE' | 'DENIED_BANNED' | 'DENIED_EXPIRED' | 'PENDING';

interface ScannerResultProps {
    status: ScanStatus;
    data: {
        name: string;
        age: number;
        dob: string; // YYYY-MM-DD
        exp: string; // YYYY-MM-DD
        photoUrl?: string;
    };
    onScanNext: () => void;
}

export function ScannerResult({ status, data, onScanNext }: ScannerResultProps) {
    const isAllowed = status === 'ALLOWED';
    const bgColor = isAllowed ? tokens.colors.status.allowed : tokens.colors.status.denied;

    // Status Config
    const config = {
        ALLOWED: {
            icon: Check,
            label: 'ALLOWED',
            sub: null
        },
        DENIED_UNDERAGE: {
            icon: X,
            label: 'DENIED',
            sub: 'UNDERAGE'
        },
        DENIED_BANNED: {
            icon: X,
            label: 'DENIED',
            sub: 'BANNED: REPEAT OFFENDER'
        },
        DENIED_EXPIRED: {
            icon: X,
            label: 'DENIED',
            sub: 'ID EXPIRED'
        },
        PENDING: {
            icon: Check,
            label: '...',
            sub: null
        }
    }[status] || { icon: X, label: 'ERROR', sub: null };

    const Icon = config.icon;

    return (
        <div className="flex flex-col h-screen w-full relative overflow-hidden font-sans" style={{ backgroundColor: bgColor }}>
            {/* Top Status Area - Takes remaining space */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 pb-32 animate-in fade-in zoom-in duration-300">
                <div className="bg-white rounded-full p-6 mb-6 shadow-xl">
                    <Icon className={cn("w-16 h-16 stroke-[3]", isAllowed ? "text-[#00C853]" : "text-[#D50000]")} />
                </div>
                <h1 className="text-5xl font-black text-white tracking-tight uppercase drop-shadow-md">
                    {config.label}
                </h1>
                {config.sub && (
                    <p className="text-white/90 text-xl font-bold mt-2 uppercase tracking-wide bg-black/10 px-4 py-1 rounded-full">
                        {config.sub}
                    </p>
                )}
            </div>

            {/* Bottom Card - White Sheet */}
            <div className="bg-white absolute bottom-0 left-0 right-0 rounded-t-[32px] p-8 pb-12 shadow-[0_-10px_40px_rgba(0,0,0,0.2)] animate-in slide-in-from-bottom duration-500">
                {/* Header Row: Name + Age */}
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">NAME</span>
                        <h2 className="text-2xl font-bold text-slate-900 leading-none">{data.name}</h2>
                    </div>
                    <div className="text-right">
                        <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">AGE</span>
                        <span className="text-2xl font-bold text-slate-900 leading-none">{data.age}</span>
                    </div>
                </div>

                {/* Grid: DOB + EXP */}
                <div className="grid grid-cols-2 gap-8 mb-8 pb-8 border-b border-slate-100">
                    <div>
                        <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">DOB</span>
                        <p className="text-lg font-mono font-medium text-slate-800 tracking-tight">{data.dob}</p>
                    </div>
                    <div>
                        <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">EXP</span>
                        <p className="text-lg font-mono font-medium text-slate-800 tracking-tight">{data.exp}</p>
                    </div>
                </div>

                {/* Action Button */}
                <button
                    onClick={onScanNext}
                    className="w-full bg-[#111827] text-white font-bold text-lg py-4 rounded-xl hover:bg-slate-800 active:scale-[0.98] transition-all shadow-lg"
                >
                    Scan Next
                </button>
            </div>
        </div>
    );
}
