import { Locator, Page } from '@playwright/test';

export abstract class BasePage {
    readonly page: Page;
    readonly baseURL = 'https://www.amazon.com';

    constructor(page: Page) {
        this.page = page;
    }

    async goto(path = '') {
        await this.page.goto(`${this.baseURL}${path}`);
        await this.dismissPopupsIfPresent();
    }

    // Best-effort popup dismissal: a failure to detect or click any single popup
    // must never hang the whole flow, so each attempt gets its own short timeout
    // and swallows its own errors.
    private async tryDismiss(locator: Locator, options: { force?: boolean } = {}): Promise<void> {
        try {
            if (await locator.isVisible({ timeout: 3000 })) {
                await locator.click({ timeout: 5000, force: options.force });
            }
        } catch {
            // Best-effort: if it can't be detected/clicked in time, move on.
        }
    }

    // Removes an element from the DOM outright rather than trying to click a "dismiss"
    // control on it. The international-shipping redirect overlay kept intercepting
    // clicks even after being clicked (its own backdrop click doesn't reliably close
    // it, and clicking may itself be blocked by a further overlay layer on top of it),
    // so removing it directly sidesteps needing to know its exact dismiss mechanism.
    protected async removeIfPresent(selector: string): Promise<void> {
        try {
            await this.page.evaluate(sel => {
                document.querySelectorAll(sel).forEach(el => el.remove());
            }, selector);
        } catch {
            // Best-effort: nothing to remove, or the page navigated away meanwhile.
        }
    }

    private async dismissPopupsIfPresent(): Promise<void> {
        await this.tryDismiss(this.page.getByRole('button', { name: 'Continue shopping', exact: true }));

        await this.tryDismiss(this.page.getByText('Stay on Amazon.com', { exact: true }));

        // International-shipping redirect overlay: "#redir-modal" is the backdrop and
        // "#redir-overlay" the content layer on top of it; both can intercept clicks
        // on unrelated page controls (e.g. the search button) even when barely visible.
        await this.removeIfPresent('#redir-modal, #redir-overlay');

        // "International Shopping Transition Alert" banner ("We're showing you items
        // that ship to <country>...") can sit on top of page controls and intercept clicks.
        await this.tryDismiss(this.page.getByText('Dismiss', { exact: true }));
    }
}
