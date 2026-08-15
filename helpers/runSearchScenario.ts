import { Page, expect } from '@playwright/test';
import { calculatePriceLimits } from '../utils/calculatePriceLimits';
import { filterAndSortProducts } from '../utils/filterAndSortProducts';
import { AmazonWebSite } from '../pages';

export async function runSearchScenario(page: Page, query: string) {
    const site = new AmazonWebSite(page);
    await site.searchPage.goto();
    await site.searchPage.search(query);

    console.log('Current URL:', page.url());
    const notPromoted = await site.searchResultPage.getNotPromotedProducts();
    expect(notPromoted.length, `Expected to collect non-promoted products for the "${query}" search`).toBeGreaterThan(
        0,
    );

    const { lowerLimit, upperLimit } = calculatePriceLimits(notPromoted);
    console.log('Price limits:', { lowerLimit, upperLimit });
    const totalOnPage = await site.searchResultPage.getTotalProductsCount();

    const filteredAndSorts = filterAndSortProducts(notPromoted);
    expect
        .soft(
            filteredAndSorts.length,
            `Expected at least 10 products matching the rating and review criteria for the "${query}" search`,
        )
        .toBeGreaterThanOrEqual(10);

    const top10 = filteredAndSorts.slice(0, 10);
    console.log(top10);

    let cheaperCount = 0;
    let expensiveCount = 0;

    for (const product of top10) {
        if (product.price <= lowerLimit) {
            cheaperCount++;
        }
        if (product.price >= upperLimit) {
            expensiveCount++;
        }
        expect
            .soft(product.price, `${product.title} price ${product.price} should be within limits`)
            .toBeGreaterThan(lowerLimit);
        expect
            .soft(product.price, `${product.title} price ${product.price} should be within limits`)
            .toBeLessThan(upperLimit);
    }
    console.log('Statistics:', {
        totalProductsOnPage: totalOnPage,
        matchingCriteria: filteredAndSorts.length,
        cheaperThanLimit: cheaperCount,
        moreExpensiveThanLimit: expensiveCount,
    });
}
