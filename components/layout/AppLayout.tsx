"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Building2,
    MapPin,
    Layers,
    MousePointer2,
    ScanFace,
    BarChart3,
    Settings,
    LogOut,
    Ban
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApp } from '@/lib/store';

const NAV_ITEMS = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Venues', href: '/venues', icon: MapPin },
    { label: 'Areas', href: '/areas', icon: Layers },
    { label: 'Clicr', href: '/clicr', icon: MousePointer2 },
    { label: 'Banning', href: '/banning', icon: Ban },
    { label: 'Reports', href: '/reports', icon: BarChart3 },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { currentUser } = useApp();

    return (
        <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
            {/* Sidebar */}
            <aside className="w-64 border-r border-border bg-card/50 hidden md:flex flex-col glass-panel z-20">
                <div className="p-6 border-b border-border/50">
                    <div className="flex items-center justify-between">
                        <div className="relative w-32 h-10">
                            {/* Using standard img for quick file reference compatibility, or check if Image needs width/height */}
                            <img src="/clicr-logo.png" alt="CLICR" className="w-full h-full object-contain object-left" />
                        </div>
                        <Link href="/settings" className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors">
                            <Settings className="w-5 h-5" />
                        </Link>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">v1.0.0 • {currentUser.role}</p>
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    {NAV_ITEMS.map((item) => {
                        const isActive = pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
                                    isActive
                                        ? "bg-primary text-white font-bold shadow-lg shadow-primary/25"
                                        : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/50"
                                )}
                            >
                                <item.icon className={cn("w-5 h-5", isActive ? "text-white" : "text-slate-500 group-hover:text-slate-300")} />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-border/50">
                    <button className="flex items-center gap-3 px-3 py-2 w-full text-slate-400 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
                        <LogOut className="w-5 h-5" />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto relative">
                {/* Background Gradients for 'Premium' feel */}
                <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
                <div className="absolute -top-[200px] -right-[200px] w-[600px] h-[600px] bg-primary/10 blur-[100px] rounded-full pointer-events-none" />
                <div className="absolute top-[40%] left-[20%] w-[400px] h-[400px] bg-secondary/5 blur-[120px] rounded-full pointer-events-none" />

                <div className="relative z-10 p-6 md:p-8 max-w-7xl mx-auto min-h-full">
                    {children}
                </div>
            </main>
        </div>
    );
}
