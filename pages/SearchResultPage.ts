import { Product } from '../types/Product';
import { BasePage } from './BasePage';
import { Page, Locator } from '@playwright/test';
import { parsePrice } from '../utils/parsePrice';

export class SearchResultPage extends BasePage {
    constructor(page: Page) {
        super(page);
    }

    // Locators

    readonly resultsContainer = this.page.locator('#search');
    readonly productCards = this.resultsContainer.locator('div[data-component-type="s-search-result"]');

    // Methods

    private async isSponsored(card: Locator): Promise<boolean> {
        const sponsoredText = card.getByText('Sponsored', { exact: true });
        const sponsoredAriaLabel = card.locator('[aria-label*="sponsored" i]');

        return (await sponsoredText.count()) > 0 || (await sponsoredAriaLabel.count()) > 0;
    }

    private async getRequiredText(locator: Locator, fieldName: string, asin: string): Promise<string> {
        if ((await locator.count()) === 0) {
            throw new Error(`Missing ${fieldName} for ASIN ${asin}`);
        }

        const text = await locator.first().textContent({ timeout: 3000 });
        if (!text?.trim()) {
            throw new Error(`Empty ${fieldName} for ASIN ${asin}`);
        }

        return text.trim();
    }

    private async getRequiredAttribute(
        locator: Locator,
        attributeName: string,
        fieldName: string,
        asin: string,
    ): Promise<string> {
        if ((await locator.count()) === 0) {
            throw new Error(`Missing ${fieldName} for ASIN ${asin}`);
        }

        const value = await locator.first().getAttribute(attributeName, { timeout: 3000 });
        if (!value?.trim()) {
            throw new Error(`Empty ${fieldName} for ASIN ${asin}`);
        }

        return value.trim();
    }

    private ensureValidNumber(value: number, fieldName: string, asin: string): number {
        if (!Number.isFinite(value)) {
            throw new Error(`Invalid ${fieldName} for ASIN ${asin}`);
        }

        return value;
    }

    private async parseProductCard(card: Locator, asin: string): Promise<Product> {
        const productTitle = await this.getRequiredText(card.locator('[data-cy="title-recipe"] h2'), 'title', asin);

        const productPrice = await this.getRequiredText(
            card.locator('.a-price[data-a-size="xl"][data-a-color="base"] .a-offscreen'),
            'primary price',
            asin,
        );
        const price = this.ensureValidNumber(parsePrice(productPrice), 'price', asin);

        const productRating = await this.getRequiredAttribute(
            card.locator('[aria-label*="out of 5 stars" i]'),
            'aria-label',
            'rating',
            asin,
        );
        const rating = this.ensureValidNumber(parseFloat(productRating), 'rating', asin);

        const productReviews = await this.getRequiredAttribute(
            card.locator('a[aria-label$="ratings" i], a[aria-label$="reviews" i]'),
            'aria-label',
            'review count',
            asin,
        );
        const reviews = this.ensureValidNumber(parseFloat(productReviews.replace(/,/g, '')), 'review count', asin);
        const url = `${this.baseURL}/dp/${asin}`;

        return {
            title: productTitle,
            price,
            rating,
            reviews,
            url,
        };
    }

    private async waitForResultsToLoad(): Promise<void> {
        await this.productCards.first().waitFor({ state: 'visible' });

        let previousCount = -1;
        let currentCount = await this.productCards.count();
        while (currentCount !== previousCount) {
            previousCount = currentCount;
            await this.page.waitForTimeout(500);
            currentCount = await this.productCards.count();
        }
    }

    async getNotPromotedProducts(): Promise<Product[]> {
        const products: Product[] = [];
        const seenAsins = new Set<string>();
        await this.waitForResultsToLoad();
        const count = await this.productCards.count();

        for (let i = 0; i < count; i++) {
            const card = this.productCards.nth(i);

            if (await this.isSponsored(card)) {
                continue;
            }
            const asin = await card.getAttribute('data-asin');
            if (!asin) {
                console.error(`Skipped product card at index ${i}: missing ASIN`);
                continue;
            }
            if (seenAsins.has(asin)) {
                continue;
            }

            try {
                const product = await this.parseProductCard(card, asin);
                products.push(product);
                seenAsins.add(asin);
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                console.error(`Skipped product card at index ${i} (ASIN ${asin}): ${message}`);
            }
        }

        console.log('Cards found:', count, '| Products collected:', products.length);

        return products;
    }

    async getTotalProductsCount(): Promise<number> {
        await this.waitForResultsToLoad();
        return this.productCards.count();
    }

    private async getTitleAndPrice(card: Locator): Promise<{ title: string; price: number }> {
        const asin = await card.getAttribute('data-asin');
        if (!asin) {
            throw new Error('Cannot read product title and price: missing ASIN');
        }

        const productTitle = await this.getRequiredText(card.locator('[data-cy="title-recipe"] h2'), 'title', asin);

        const productPrice = await this.getRequiredText(
            card.locator('.a-price[data-a-size="xl"][data-a-color="base"] .a-offscreen'),
            'primary price',
            asin,
        );
        const price = this.ensureValidNumber(parsePrice(productPrice), 'price', asin);

        return { title: productTitle, price };
    }

    async addSecondNotConfigurableProductToCart(): Promise<{ title: string; price: number }> {
        await this.waitForResultsToLoad();
        const count = await this.productCards.count();

        let notConfigurableIndex = 0;

        for (let i = 0; i < count; i++) {
            const card = this.productCards.nth(i);

            if (await this.isSponsored(card)) {
                continue;
            }

            const addToCartButton = card.locator('input[name="submit.addToCart"]');
            if ((await addToCartButton.count()) === 0) {
                continue;
            }

            notConfigurableIndex++;
            if (notConfigurableIndex === 2) {
                const product = await this.getTitleAndPrice(card);
                // The country-redirect overlay can appear after the search results have
                // already loaded and otherwise intercept the Add to cart click.
                await this.removeIfPresent('#redir-modal, #redir-overlay');
                await addToCartButton.click({ timeout: 5000 });
                return product;
            }
        }

        throw new Error('Could not find a second not-configurable product on the page');
    }
}
