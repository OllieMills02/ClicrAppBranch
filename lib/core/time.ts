
export const getTodayWindow = (timezone: string = 'UTC') => {
    // In a real app, use connection to timezone lib or simple local logic
    // For now, consistent local time relative to user's browser or forced UTC
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    return {
        start: start.toISOString(),
        end: end.toISOString(),
        timezone
    };
};
