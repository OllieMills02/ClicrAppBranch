
import { test, expect } from '@playwright/test';

test.describe('Clicr Screen Latency', () => {

    test('Should update Total In instantly on Clicr Screen', async ({ page }) => {
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

        // Browse to Area -> Clicr
        await page.click('[href*="/areas/"]');
        await page.click('a[title="Open Counter"]');

        // Now on /clicr/[id] page.

        // Find initial value for Total In
        const totalInElement = page.locator('text=Total In').locator('..').locator('div.text-xl'); // adjust selector based on DOM
        const initialText = await totalInElement.innerText();
        const initialVal = parseInt(initialText.replace(/[^0-9]/g, '') || '0');

        // Record start time
        const start = Date.now();
        await page.click('button:has-text("IN")'); // Try tapping IN button

        // Wait for text change
        await expect(totalInElement).toContainText(String(initialVal + 1), { timeout: 200 });

        const end = Date.now();
        console.log(`Clicr Screen Latency: ${end - start}ms`);
        expect(end - start).toBeLessThan(100); // 100ms budget
    });

});
