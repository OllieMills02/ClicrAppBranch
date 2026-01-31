"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/store';
import { Venue } from '@/lib/types';
import { ArrowLeft } from 'lucide-react';

export default function NewVenuePage() {
    const router = useRouter();
    const { addVenue } = useApp();
    const [isLoading, setIsLoading] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        city: '',
        state: '',
        capacity: 500
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const newVenueId = Math.random().toString(36).substring(7);
        const venue: Venue = {
            id: newVenueId,
            business_id: 'biz_001', // Mock
            name: formData.name,
            city: formData.city,
            state: formData.state,
            default_capacity_total: formData.capacity,
            capacity_enforcement_mode: 'WARN_ONLY',
            status: 'ACTIVE',
            timezone: 'America/New_York',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            active: true
        };

        await addVenue(venue);
        router.push(`/venues/${newVenueId}`);
    };

    return (
        <div className="max-w-xl mx-auto py-12">
            <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-slate-400 hover:text-white mb-6"
            >
                <ArrowLeft className="w-4 h-4" />
                Back
            </button>

            <h1 className="text-3xl font-bold mb-2">Create New Venue</h1>
            <p className="text-slate-400 mb-8">Set up a new location for your business.</p>

            <form onSubmit={handleSubmit} className="space-y-6 bg-slate-900/50 border border-slate-800 p-8 rounded-2xl shadow-xl">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Venue Name</label>
                    <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary/50 focus:outline-none"
                        placeholder="e.g. Downtown Club"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">City</label>
                        <input
                            type="text"
                            required
                            value={formData.city}
                            onChange={e => setFormData({ ...formData, city: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary/50 focus:outline-none"
                            placeholder="City"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">State</label>
                        <input
                            type="text"
                            required
                            value={formData.state}
                            onChange={e => setFormData({ ...formData, state: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary/50 focus:outline-none"
                            placeholder="State"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Initial Capacity Limit</label>
                    <input
                        type="number"
                        required
                        value={formData.capacity}
                        onChange={e => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary/50 focus:outline-none"
                        placeholder="500"
                    />
                </div>

                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-4 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl transition-all shadow-lg hover:shadow-primary/25 disabled:opacity-50"
                    >
                        {isLoading ? 'Creating...' : 'Create Venue'}
                    </button>
                </div>
            </form>
        </div>
    );
}
