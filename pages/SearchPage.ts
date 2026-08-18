import { BasePage } from './BasePage';
import { Page } from '@playwright/test';

export class SearchPage extends BasePage {
    constructor(page: Page) {
        super(page);
    }

    // Locators

    readonly searchInput = this.page.locator('#twotabsearchtextbox');

    // Methods

    async search(query: string) {
        await this.searchInput.fill(query);
        // Submit from the input instead of clicking the button: Amazon's
        // country-redirect overlay may reappear asynchronously and intercept
        // pointer events even after it has just been dismissed.
        await this.searchInput.press('Enter');
    }
}
