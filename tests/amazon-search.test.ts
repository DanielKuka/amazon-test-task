import { test, expect, Page } from '@playwright/test';
import { runSearchScenario } from '../helpers/runSearchScenario';

test.describe('Amazon search', () => {
    test('search for hammer', async ({ page }) => {
        await runSearchScenario(page, 'hammer');
    });

    test('search for screwdriver', async ({ page }) => {
        await runSearchScenario(page, 'screwdriver');
    });
});
