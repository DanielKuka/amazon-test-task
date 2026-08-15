import { BasePage } from './BasePage';
import { Page } from '@playwright/test';

export class SearchPage extends BasePage {
    constructor(page: Page) {
        super(page);
    }

    // Locators

    readonly searchInput = this.page.locator('#twotabsearchtextbox');
    readonly searchSubmitButton = this.page.locator('#nav-search-submit-button');

    // Methods

    async search(query: string) {
        await this.searchInput.fill(query);
        // The international-shipping redirect overlay can appear asynchronously,
        // after goto()'s one-time dismissal already ran - clear it again right
        // before the click that it's most likely to intercept.
        await this.removeIfPresent('#redir-modal, #redir-overlay');
        await this.searchSubmitButton.click({ timeout: 5000 });
    }
}
