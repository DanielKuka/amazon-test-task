import { Product } from '../types/Product';

export const filterAndSortProducts = (products: Product[]): Product[] => {
    const filtered = products.filter(product => product.rating >= 4.5 && product.reviews >= 100);
    const sorted = filtered.sort((a, b) => a.price - b.price);
    return sorted;
};
