import { Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { parsePrice } from '../utils/parsePrice';

export class CartPage extends BasePage {
    constructor(page: Page) {
        super(page);
    }

    readonly subtotal = this.page.locator('#sc-subtotal-amount-activecart, #sc-subtotal-amount-buybox').first();

    async goto(): Promise<void> {
        await super.goto('/cart');
    }

    async getSubtotal(): Promise<number> {
        const text = await this.subtotal.textContent({ timeout: 5000 });
        return parsePrice(text!);
    }

    async getFirstItemTitleAndPrice(): Promise<{ title: string; price: number }> {
        const lineItem = this.page.locator('.sc-list-item').first();
        await lineItem.waitFor({ state: 'visible', timeout: 5000 });

        const title = await lineItem.getAttribute('data-producttitle', { timeout: 5000 });
        const subtotalJson = await lineItem.getAttribute('data-subtotal', { timeout: 5000 });
        const price = JSON.parse(subtotalJson!).subtotal.amount;

        return { title: title!.trim(), price };
    }
}
