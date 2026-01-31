
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(process.cwd(), 'data', 'db.json');

try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    const data = JSON.parse(raw);

    console.log("Current clicr_001 count:", data.clicrs[0].current_count);

    // Reset
    data.clicrs = data.clicrs.map(c => ({ ...c, current_count: 0 }));
    data.events = [];
    data.scanEvents = [];

    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
    console.log("Successfully reset DB. New count:", data.clicrs[0].current_count);

} catch (e) {
    console.error("Failed to reset:", e);
}
