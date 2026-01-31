export type ReportFilter = {
    dateRange: { from: Date; to: Date };
    venueIds: string[]; // OR 'ALL'
    areaIds: string[];  // OR 'ALL'
    compareMode: 'NONE' | 'SIDE_BY_SIDE' | 'TREND';
    compareDates?: Date[]; // For Side-by-side
};

export type DailySummary = {
    date: string; // YYYY-MM-DD
    venueId: string;
    totalEntries: number;
    totalExits: number;
    peakOccupancy: number;
    avgOccupancy: number;
    minutesAtCapacity: number;
    totalScans: number;
    acceptedScans: number;
    deniedScans: number;
};

export type HourlySummary = {
    hourStart: string; // ISO
    entries: number;
    exits: number;
    occupancy: number;
    scans: number;
};
