import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { CountEvent, IDScanEvent, Venue, Area, Clicr } from './types';

export const exportReportsToExcel = (
    events: CountEvent[],
    scans: IDScanEvent[],
    venues: Venue[],
    areas: Area[],
    clicrs: Clicr[],
    filename: string = 'clicr-report'
) => {
    // 1. Prepare Data Sheets

    // Sheet 1: Summary Stats
    const summaryData = [
        { Metric: 'Total Events', Value: events.length },
        { Metric: 'Total Scans', Value: scans.length },
        { Metric: 'Report Generated At', Value: new Date().toLocaleString() }
    ];

    // Sheet 2: Event Log
    const eventLogData = events.map(e => ({
        Timestamp: new Date(e.timestamp).toLocaleString(),
        EventID: e.id,
        VenueID: e.venue_id,
        AreaID: e.area_id,
        ClicrID: e.clicr_id,
        Delta: e.delta,
        Flow: e.flow_type,
        Type: e.event_type,
        User: e.user_id
    }));

    // Sheet 3: Audience Insights (Scans)
    const scanData = scans.map(s => ({
        Timestamp: new Date(s.timestamp).toLocaleString(),
        Result: s.scan_result,
        Age: s.age || 'N/A',
        Gender: s.sex || 'N/A',
        Zip: s.zip_code || 'N/A'
    }));

    // Sheet 4: Venue Structure
    const structureData = venues.map(v => ({
        VenueName: v.name,
        Areas: areas.filter(a => a.venue_id === v.id).map(a => a.name).join(', '),
        Capacity: v.default_capacity_total
    }));

    // 2. Create Workbook and Sheets
    const wb = XLSX.utils.book_new();

    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    const wsEvents = XLSX.utils.json_to_sheet(eventLogData);
    const wsScans = XLSX.utils.json_to_sheet(scanData);
    const wsStructure = XLSX.utils.json_to_sheet(structureData);

    // 3. Append Sheets
    XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");
    XLSX.utils.book_append_sheet(wb, wsEvents, "Event Log");
    XLSX.utils.book_append_sheet(wb, wsScans, "Audience Insights");
    XLSX.utils.book_append_sheet(wb, wsStructure, "Venue Config");

    // 4. Write File
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    saveAs(blob, `${filename}.xlsx`);
};

export const exportToCSV = (data: Record<string, unknown>[], filename: string) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${filename}.csv`);
};
