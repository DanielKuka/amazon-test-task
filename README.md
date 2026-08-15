# Amazon Search Automation (Playwright + TypeScript)

Browser automation that searches Amazon for a product, collects the non-promoted
results from the first results page, filters and sorts them, and validates the
top 10 cheapest against a set of price-limit assertions. Built with the Page
Object Model.

## Requirements

- Node.js 18+
- npm

## Setup

```bash
npm install
npx playwright install
```

`npm install` pulls in Playwright, TypeScript and their types. `npx playwright
install` downloads the browser binaries Playwright drives (Chromium, Firefox,
WebKit) — required once per machine.

## Running the tests

```bash
npm test                 # all projects (chromium, firefox, webkit)
npm run test:chromium    # chromium only, faster for local runs
```

Both commands run every spec in `tests/`: the two search scenarios
(`amazon-search.test.ts`, for "hammer" and "screwdriver") and the cart scenario
(`amazon-cart.test.ts`). Console output (product data, price limits, and the
final statistics block) prints to the terminal as the tests run.

Playwright's default reporter is `html`; open the last report with:

```bash
npx playwright show-report
```

### About the expected test failures

The search test is written against an assertion the assignment defines as
**intentionally strict enough to fail often**: every one of the top 10
products must have a price strictly between
`(cheapest non-promoted price on the page) * 1.1` and
`(most expensive non-promoted price on the page) * 0.65`. On a real,
constantly-changing Amazon catalog, this is frequently violated by design —
that's the point of the exercise. Each violation is reported through
Playwright's `expect.soft()`, so:

- a failing check is logged with the offending product, price, and limit,
- the loop keeps evaluating the remaining products,
- the test ends with the accumulated statistics printed, and only _then_
  is reported as failed if any soft assertion didn't hold.

Seeing `amazon-search.test.ts` end in a failed status with soft-assertion
messages in the log is the expected outcome, not a bug.

## Project structure

```
pages/                  Page Objects (Page Object Model)
  BasePage.ts              shared navigation + popup/overlay handling
  SearchPage.ts             the search box and submit button
  SearchResultPage.ts       search-results collection, filtering out sponsored items
  CartPage.ts                the cart page (/cart)
  MiniCartPanel.ts           the post-add-to-cart confirmation panel + nav cart count
  index.ts                   AmazonWebSite facade bundling all of the above

types/
  Product.ts                shape of a scraped product (title, price, rating, reviews, url)

utils/                  Pure, framework-agnostic helpers (no Playwright dependency)
  filterAndSortProducts.ts  rating/review filter + price sort
  calculatePriceLimits.ts   lower/upper price-limit calculation
  parsePrice.ts              currency-agnostic price string -> number

helpers/
  runSearchScenario.ts       the full search -> collect -> assert -> log pipeline,
                              parameterized by search query, shared by both search tests

tests/
  amazon-search.test.ts      runs runSearchScenario for "hammer" and "screwdriver"
  amazon-cart.test.ts        optional task: add-to-cart, minicart, cart subtotal
```

## Design notes

- **Page Object Model.** Every page/component Amazon renders is its own class
  extending `BasePage`; tests only call methods on `AmazonWebSite`'s
  page-object properties (`site.searchPage`, `site.searchResultPage`, ...),
  never touch raw locators.
- **Sponsored-item filtering.** A card counts as sponsored if it contains a
  `"Sponsored"` label; ASINs are deduplicated so a product that appears both
  sponsored and organic on the same page is only counted once.
- **Resilient per-product parsing.** Extracting one product's data can fail
  (missing rating, an unusual multi-price layout, a slow-rendering card).
  Each product is parsed inside its own `try/catch` with a bounded per-locator
  timeout, so one bad card is logged and skipped instead of failing the whole
  run.
- **Currency-agnostic price parsing.** Amazon's displayed currency follows the
  detected shipping destination, not the browser's language — the same
  product can show `$12.99` or `PLN 47.20` depending on network/location.
  `utils/parsePrice.ts` extracts the numeric amount regardless of the currency
  symbol, so assertions stay correct wherever the suite runs.
- **Popup/overlay handling.** Amazon shows a few different interstitials
  depending on session/geo state (a "Continue shopping" bot-check, a
  country-redirect overlay, a shipping-destination banner). `BasePage`
  dismisses all of them defensively after every navigation, with short,
  per-popup timeouts so a popup that doesn't appear never stalls the test.
- **Sequential execution.** `playwright.config.ts` runs with a single worker
  and `fullyParallel: false`. Multiple concurrent automated sessions hitting
  the live amazon.com from one machine measurably increases the odds of
  throttled or degraded responses; running one test at a time is more stable
  than the time saved by parallelism.

## Optional task: add to cart

`amazon-cart.test.ts` searches, adds the second non-configurable product (one
whose "Add to cart" button works directly from the results page, i.e. it
doesn't require selecting options first) to the cart, and asserts:

- the mini-cart counter reads `1`,
- the product shown in the post-add confirmation panel matches the product
  that was added (name and price),
- the cart page subtotal equals the added product's price.

The confirmation panel doesn't reliably render on every run on the live site
with the same markup. The page object supports Amazon's current EWC side-cart
panel as well as the older NATC/Smart Wagon confirmation layout. The test reads
the title and price directly from whichever right-side panel Amazon renders; it
does not substitute cart-page data for the panel assertion.
