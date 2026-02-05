
export const tokens = {
    colors: {
        background: {
            dark: '#000000', // Pure black for Clicr screen
            card: '#1F2937', // Gray-800 for Stats cards on dark bg
            white: '#FFFFFF',
            modal: '#FFFFFF', // White for Scanner result card
        },
        primary: {
            blue: '#2563EB', // Vibrant Blue (Guest In/Out) - Tailored to match reference
            blueHover: '#1D4ED8',
        },
        status: {
            success: '#10B981', // Green for Allowed (Emerald-500 approx)
            successBg: '#059669', // Darker green for bg? Reference looks vivid green.
            allowed: '#00C853', // Material Green A700 matches reference well

            error: '#EF4444',
            denied: '#D50000', // Deep red for Denied

            dot: '#10B981', // Online status dot
        },
        text: {
            primary: '#FFFFFF',
            secondary: '#9CA3AF', // Gray-400
            darkPrimary: '#111827', // Gray-900 for Light Mode/Cards
            darkSecondary: '#6B7280', // Gray-500
        }
    },
    spacing: {
        xs: '0.25rem', // 4px
        sm: '0.5rem',  // 8px
        md: '1rem',    // 16px
        lg: '1.5rem',  // 24px
        xl: '2rem',    // 32px
        xxl: '3rem',   // 48px
    },
    borderRadius: {
        sm: '0.375rem',
        md: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
        sheet: '1.5rem', // For the top of the scanner result card
    },
    typography: {
        fontFamily: 'Inter, system-ui, sans-serif',
        size: {
            hero: '6rem', // 96px for Occupancy
            title: '2rem', // 32px
            subtitle: '1.25rem',
            body: '1rem',
            label: '0.75rem', // 12px
        },
        weight: {
            regular: 400,
            medium: 500,
            bold: 700,
            black: 900,
        }
    }
};
