
import { test, expect } from '@playwright/test';

test.describe('Totals Latency Performance', () => {

    test('Should update Total In instantly on same device', async ({ page }) => {
        // 1. Visit Venue/Area (assuming logged in state, handle login if needed)
        await page.goto('/dashboard');
        if (await page.url().includes('login')) {
            await page.fill('input[name="email"]', 'demo@clicr.co');
            await page.fill('input[name="password"]', 'password');
            await page.click('button[type="submit"]');
            await page.waitForURL('/dashboard');
        }

        // Go to an active area or Clicr
        await page.goto('/venues');
        await page.click('a[href^="/venues/"]:first-of-type');

        // Find "Total In" value
        // Assuming KPI Card structure. The text "Total In" is uppercase: "TOTAL IN"
        // The value is adjacent.
        const totalInLabel = page.locator('text=Total In');
        const totalInValue = totalInLabel.locator('..').locator('span.font-mono');

        // Get initial value
        const initialText = await totalInValue.innerText();
        const initialVal = parseInt(initialText || '0');

        // Find and Click "IN" or "+" button (Navigate to Clicr if needed)
        // If we are on Venue page, we might see Area KPIs. 
        // Let's go to Area page.
        await page.click('[href*="/areas/"]');

        // On Area Page, look for a Clicr to open.
        // Click "Open Counter" link for first active clicr
        await page.click('a[title="Open Counter"]');

        // Now on /clicr/[id] page. Use big buttons.
        // Record start time
        const start = Date.now();
        await page.click('button:has-text("IN")'); // or whatever the label is (Label A)

        // Measure time until Total In updates
        // The Clicr page shows "Live Count" and maybe Totals?
        // Let's assume the header or footer shows totals, OR go back to verify?
        // Better: Verify the "Current Count" on the button updates instantly.
        // The requirement is "Total In". 
        // The Clicr page usually shows "Traffic Today" stats.

        // Wait for text change
        await expect(page.locator('text=Total In').locator('..').locator('span:has-text("' + (initialVal + 1) + '")')).toBeVisible({ timeout: 200 });

        const end = Date.now();
        console.log(`Latency: ${end - start}ms`);
        expect(end - start).toBeLessThan(100); // 100ms budget for "Instant"
    });

});
