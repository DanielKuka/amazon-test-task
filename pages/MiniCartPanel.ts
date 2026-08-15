import { Page } from '@playwright/test';
import { parsePrice } from '../utils/parsePrice';

export interface MiniCartProduct {
    title: string;
    price: number;
}

export class MiniCartPanel {
    constructor(private readonly page: Page) {}

    readonly cartCount = this.page.locator('#nav-cart-count');

    private readonly ewcPanelItem = this.page.locator('#ewc-content [data-asin]').first();
    private readonly ewcProductImage = this.ewcPanelItem
        .locator('img.sc-product-image:not(.ewc-sfl-image-small)')
        .first();
    private readonly ewcProductPrice = this.ewcPanelItem.locator('.ewc-unit-price, .sc-product-price').first();

    private readonly legacyConfirmationHeading = this.page.locator('#NATC_SMART_WAGON_CONF_MSG_SUCCESS');
    private readonly legacyProductImage = this.page.locator('#add-to-cart-confirmation-image img');
    private readonly legacySubtotal = this.page.locator('#sw-subtotal .a-price .a-offscreen');

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
        await this.ewcPanelItem.or(this.legacyConfirmationHeading).first().waitFor({ state: 'visible', timeout: 8000 });

        const isEwcPanelVisible = await this.ewcPanelItem.isVisible();
        const productImage = isEwcPanelVisible ? this.ewcProductImage : this.legacyProductImage;
        const productPrice = isEwcPanelVisible ? this.ewcProductPrice : this.legacySubtotal;

        const title = await productImage.getAttribute('alt', { timeout: 5000 });
        if (!title?.trim()) {
            throw new Error('Mini-cart panel product title is missing');
        }

        const priceText = await productPrice.textContent({ timeout: 5000 });
        const price = parsePrice(priceText ?? '');
        if (!Number.isFinite(price)) {
            throw new Error(`Mini-cart panel product price is invalid: ${priceText}`);
        }

        return {
            title: title.trim(),
            price,
        };
    }
}
