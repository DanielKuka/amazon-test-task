import { test, expect } from '@playwright/test';
import { AmazonWebSite } from '../pages';

test.describe('Amazon cart', () => {
    test('add second not-configurable product to cart', async ({ page }) => {
        const site = new AmazonWebSite(page);
        await site.searchPage.goto();
        await site.searchPage.search('screwdriver');

        const addedProduct = await site.searchResultPage.addSecondNotConfigurableProductToCart();
        console.log('Added product:', addedProduct);

        const panelProduct = await site.miniCartPanel.getPanelProduct();
        console.log('Panel product:', panelProduct);

        const cartCount = await site.miniCartPanel.getCartCount();
        expect(cartCount).toBe(1);
        expect(panelProduct.title).toBe(addedProduct.title);
        expect(panelProduct.price).toBe(addedProduct.price);

        await site.cartPage.goto();
        const subtotal = await site.cartPage.getSubtotal();
        expect(subtotal).toBe(addedProduct.price);
    });
});
