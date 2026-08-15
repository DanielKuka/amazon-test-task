import { Page } from '@playwright/test';
import { SearchPage } from './SearchPage';
import { SearchResultPage } from './SearchResultPage';
import { CartPage } from './CartPage';
import { MiniCartPanel } from './MiniCartPanel';

export class AmazonWebSite {
    constructor(public page: Page) {}

    searchPage = new SearchPage(this.page);
    searchResultPage = new SearchResultPage(this.page);
    cartPage = new CartPage(this.page);
    miniCartPanel = new MiniCartPanel(this.page);
}
