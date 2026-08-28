import { Product, ProductVariant } from '@/data/products';

export const isActivePromotion = (product: Product, variant?: ProductVariant | null): boolean => {
    // Must be 70% OFF campaign
    if (product.campaignTag !== '70% OFF') {
        return false;
    }

    // Must not be explicitly excluded
    if (product.campaignExcluded) {
        return false;
    }

    // Must not be an event or digital registration (Hackathon protection)
    if (product.slug === 'rural-livelihood-hackathon-2026' || product.category?.toLowerCase() === 'events' || product.category?.toLowerCase() === 'digital') {
        return false;
    }

    // Original price must exist and be greater than the current price
    const currentPrice = variant?.price || product.price;
    if (!product.originalPrice || product.originalPrice <= currentPrice) {
        return false;
    }

    // Must be within the sale time window (if timestamps exist)
    const now = new Date();
    
    if (product.saleStartAt) {
        const start = new Date(product.saleStartAt);
        if (now < start) return false;
    }

    if (product.saleEndAt) {
        const end = new Date(product.saleEndAt);
        if (now > end) return false;
    }

    return true;
};
