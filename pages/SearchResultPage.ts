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
        const sponsoredLabel = card.getByText('Sponsored', { exact: true });
        return (await sponsoredLabel.count()) > 0;
    }

    private async parseProductCard(card: Locator): Promise<Product> {
        const productTitle = await card.locator('[data-cy="title-recipe"] h2 span').textContent({ timeout: 3000 });

        const productPrice = await card
            .locator('.a-price[data-a-size="xl"][data-a-color="base"] .a-offscreen')
            .textContent({ timeout: 3000 });
        const price = parsePrice(productPrice!);

        const productRating = await card
            .locator('span[aria-hidden="true"].a-size-small.a-color-base')
            .textContent({ timeout: 3000 });
        const rating = parseFloat(productRating!);

        const productReviews = await card
            .locator('a[aria-label$="ratings"]')
            .getAttribute('aria-label', { timeout: 3000 });
        const reviews = parseFloat(productReviews!.replace(/,/g, ''));

        const asin = await card.getAttribute('data-asin', { timeout: 3000 });
        const url = `${this.baseURL}/dp/${asin}`;

        return {
            title: productTitle!,
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
            if (seenAsins.has(asin!)) {
                continue;
            }
            seenAsins.add(asin!);

            try {
                const product = await this.parseProductCard(card);
                products.push(product);
            } catch (error) {
                console.error(`Failed to parse product card at index ${i}:`, error);
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
        const productTitle = await card.locator('[data-cy="title-recipe"] h2 span').textContent({ timeout: 3000 });

        const productPrice = await card
            .locator('.a-price[data-a-size="xl"][data-a-color="base"] .a-offscreen')
            .textContent({ timeout: 3000 });
        const price = parsePrice(productPrice!);

        return { title: productTitle!.trim(), price };
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
                await addToCartButton.click({ timeout: 5000 });
                return product;
            }
        }

        throw new Error('Could not find a second not-configurable product on the page');
    }
}
