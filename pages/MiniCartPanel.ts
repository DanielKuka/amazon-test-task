import { Page } from '@playwright/test';
import { parsePrice } from '../utils/parsePrice';

export interface MiniCartProduct {
    title: string;
    price: number;
}

export class MiniCartPanel {
    constructor(private readonly page: Page) {}

    readonly cartCount = this.page.locator('#nav-cart-count');

    readonly confirmationHeading = this.page.locator('#NATC_SMART_WAGON_CONF_MSG_SUCCESS');
    readonly productImage = this.page.locator('#add-to-cart-confirmation-image img');
    readonly subtotal = this.page.locator('#sw-subtotal .a-price .a-offscreen');

    async getCartCount(): Promise<number> {
        // The nav cart badge updates asynchronously after "Add to cart" is clicked,
        // so an immediate read can still catch the pre-update value ("0"). Poll briefly
        // until it changes, the same way waitForResultsToLoad polls for a stable count.
        const deadline = Date.now() + 5000;
        let count = 0;
        do {
            const text = await this.cartCount.textContent({ timeout: 3000 });
            count = parseInt(text!.trim(), 10) || 0;
            if (count > 0) {
                break;
            }
            await this.page.waitForTimeout(300);
        } while (Date.now() < deadline);

        return count;
    }

    async getPanelProduct(): Promise<MiniCartProduct> {
        await this.confirmationHeading.waitFor({ state: 'visible', timeout: 5000 });

        const title = await this.productImage.getAttribute('alt', { timeout: 5000 });

        const priceText = await this.subtotal.textContent({ timeout: 5000 });
        const price = parsePrice(priceText!);

        return {
            title: title!.trim(),
            price,
        };
    }
}
