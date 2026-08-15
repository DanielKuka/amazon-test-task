import { Product } from '../types/Product';

export interface PriceLimits {
    lowerLimit: number;
    upperLimit: number;
}

export function calculatePriceLimits(products: Product[]): PriceLimits {
    if (products.length === 0) {
        throw new Error('Cannot calculate price limits: no non-promoted products were collected');
    }

    const prices = products.map(product => product.price);
    const invalidPrice = prices.find(price => !Number.isFinite(price));

    if (invalidPrice !== undefined) {
        throw new Error(`Cannot calculate price limits: invalid product price ${invalidPrice}`);
    }

    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    return {
        lowerLimit: minPrice * 1.1,
        upperLimit: maxPrice * 0.65,
    };
}
