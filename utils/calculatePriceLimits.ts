import { Product } from '../types/Product';

export interface PriceLimits {
    lowerLimit: number;
    upperLimit: number;
}

export function calculatePriceLimits(products: Product[]): PriceLimits {
    const prices = products.map(product => product.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    return {
        lowerLimit: minPrice * 1.1,
        upperLimit: maxPrice * 0.65,
    };
}
