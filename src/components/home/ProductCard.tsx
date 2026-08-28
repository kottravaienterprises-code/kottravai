import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ChevronDown } from 'lucide-react';
import { Product, ProductVariant } from '@/data/products';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import toast from 'react-hot-toast';
import analytics from '@/utils/analyticsService';
import { getOptimizedImage, IMAGE_SIZES } from '@/utils/imageOptimizer';
import { isActivePromotion } from '@/utils/promotionHelper';

interface ProductCardProps {
    product: Product;
    badge?: string;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, badge }) => {
    const { addToCart, cart, removeFromCart } = useCart();
    const { toggleWishlist, isInWishlist } = useWishlist();

    const displayName = product.product_name || product.productName || product.title || product.name || 'Product';

    // Initialize with first variant if available
    const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
        product.variants && product.variants.length > 0 ? product.variants[0] : null
    );

    const isInCart = Array.isArray(cart) && cart.some(item =>
        item.id === product.id &&
        (!selectedVariant || item.selectedVariant?.weight === selectedVariant.weight)
    );

    const isFavorite = isInWishlist(product.id);

    const isPromo = isActivePromotion(product, selectedVariant);
    const currentPrice = selectedVariant?.price || product.price;
    const savings = isPromo && product.originalPrice ? product.originalPrice - currentPrice : 0;
    const discountPercentage = isPromo && product.originalPrice ? Math.round(((product.originalPrice - currentPrice) / product.originalPrice) * 100) : 0;
    
    // Use format to 2 decimal places to match example if needed, but keeping simple for typical numbers
    const formatPrice = (p: number | string) => `₹${Number(p).toFixed(2).replace(/\.00$/, '')}`;

    const handleAddToCart = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (product.isCustomRequest) return;

        if (isInCart) {
            removeFromCart(product.id, selectedVariant?.weight);
            toast.success('Removed from cart');
        } else {
            addToCart(product, 1, selectedVariant || undefined);
            toast.success(`${displayName} added to cart!`);
        }
    };

    const handleToggleWishlist = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        toggleWishlist(product);
    };

    return (
        <div className="group relative bg-white rounded-[8px] shadow-[0_10px_35px_rgba(0,0,0,0.05)] flex flex-col h-full border border-gray-100/50">

            {/* IMAGE SECTION - FULL BLEED */}
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-t-[8px] bg-white">
                <Link
                    to={`/product/${product.slug}`}
                    className="block w-full h-full relative"
                    onClick={() => analytics.trackEvent('product_view', {
                        product_id: product.id,
                        product_name: displayName,
                        category: product.category,
                        price: currentPrice,
                        page: `/product/${product.slug}`
                    })}
                >
                    <img
                        src={getOptimizedImage(product.image, IMAGE_SIZES.CARD)}
                        alt={displayName}
                        width={400}
                        height={400}
                        loading="lazy"
                        decoding="async"
                        className={`w-full h-full object-cover object-center transform scale-[0.95] transition-all duration-500 ${product.images && product.images.length > 0 ? 'group-hover:opacity-0' : 'group-hover:scale-[1.05]'}`}
                    />
                    {product.images && product.images.length > 0 && (
                        <img
                            src={getOptimizedImage(product.images[0], IMAGE_SIZES.CARD)}
                            alt={`${displayName} hover`}
                            width={400}
                            height={400}
                            loading="lazy"
                            decoding="async"
                            className="absolute inset-0 w-full h-full object-cover object-center transform scale-[0.95] opacity-0 group-hover:opacity-100 transition-all duration-500 group-hover:scale-[1.05]"
                        />
                    )}
                </Link>

                {/* Optional Badge or Customizable Badge */}
                {(badge || isPromo || (product.isCustomizable && product.customizableTag)) && (
                    <div className="absolute top-3 left-3 z-10 flex flex-col gap-1">
                        {badge && (
                            <span className="bg-[#8E2A8B] text-white text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded shadow-lg">
                                {badge}
                            </span>
                        )}
                        {!badge && isPromo && (
                            <span className="bg-brandPink text-white text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded shadow-lg">
                                {product.campaignTag}
                            </span>
                        )}
                        {!badge && !isPromo && product.isCustomizable && product.customizableTag && (
                            <span className="bg-[#2D1B4E] text-white text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded shadow-lg flex items-center gap-1">
                                <span className="text-[10px]">✨</span> {product.customizableTag}
                            </span>
                        )}
                    </div>
                )}

                {/* Wishlist Heart - Standalone Top Right */}
                <button
                    onClick={handleToggleWishlist}
                    className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-white/90 backdrop-blur-md rounded-full shadow-md hover:bg-white transition-all group/heart z-10"
                >
                    <Heart
                        size={15}
                        className={`transition-colors ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400 group-hover/heart:text-red-500'}`}
                    />
                </button>
            </div>

            {/* PRODUCT INFO SECTION */}
            <div className="p-3 pb-0 flex flex-col flex-grow">
                <div className="flex justify-between items-start gap-2 mb-1">
                    <Link
                        to={`/product/${product.slug}`}
                        className="flex-1"
                        onClick={() => analytics.trackEvent('product_view', {
                            product_id: product.id,
                            product_name: displayName,
                            category: product.category,
                            price: currentPrice,
                            page: `/product/${product.slug}`
                        })}
                    >
                        <h3 className="text-[14px] font-bold font-comfortaa text-brandPurple leading-tight line-clamp-2 hover:opacity-80 transition-opacity">
                            {displayName}
                        </h3>
                    </Link>
                    <div className="text-right flex flex-col items-end">
                        {product.isCustomRequest ? (
                            <span className="text-[14px] font-bold font-montserrat text-brandPink">Custom</span>
                        ) : (
                            <>
                                <span className="text-[14px] font-bold font-montserrat text-brandPink flex items-center gap-1">
                                    {formatPrice(currentPrice)}
                                </span>
                                {isPromo && product.originalPrice && (
                                    <>
                                        <span className="text-[11px] font-bold text-gray-400 line-through mt-0.5">
                                            {formatPrice(product.originalPrice)}
                                        </span>
                                        <span className="text-[9px] font-bold text-brandGreen mt-0.5 uppercase tracking-wider">
                                            You save {formatPrice(savings)} ({discountPercentage}%)
                                        </span>
                                    </>
                                )}
                            </>
                        )}
                    </div>
                </div>

                <p className="text-[10px] font-semibold text-gray-400 mb-2 line-clamp-1 uppercase tracking-widest">
                    {product.shortDescription}
                </p>

                {/* VARIANT SELECTOR */}
                {!product.isCustomRequest && product.variants && product.variants.length > 0 && (
                    <div className="relative mb-3">
                        <select
                            className="w-full h-10 px-4 py-2 bg-[#F8F8F8] border-none rounded-xl text-[10px] font-black text-gray-700 outline-none appearance-none cursor-pointer hover:bg-gray-100 transition-all uppercase tracking-widest"
                            value={selectedVariant?.weight}
                            onChange={(e) => {
                                const variant = product.variants?.find(v => v.weight === e.target.value);
                                if (variant) setSelectedVariant(variant);
                            }}
                        >
                            {product.variants.map((v, i) => (
                                <option key={i} value={v.weight}>{v.weight}{/^\d+$/.test(v.weight) ? 'g' : ''} Pack</option>
                            ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                            <ChevronDown size={12} strokeWidth={4} />
                        </div>
                    </div>
                )}
            </div>

            <div className="mt-auto">
                {product.isCustomRequest ? (
                    <Link
                        to={`/product/${product.slug}`}
                        className="w-full h-10 flex items-center justify-center bg-brandBlack text-white rounded-b-[8px] font-semibold font-montserrat text-[10px] uppercase tracking-[0.2em] hover:bg-brandPink transition-all"
                    >
                        REQUEST PRICE
                    </Link>
                ) : (
                    <button
                        onClick={(e) => {
                            if (product.stock === 0) {
                                handleToggleWishlist(e);
                            } else {
                                handleAddToCart(e);
                            }
                        }}
                        className={`w-full h-10 flex items-center justify-center rounded-b-[8px] font-semibold font-montserrat text-[10px] uppercase tracking-[0.2em] transition-all transform active:scale-95 ${isInCart
                            ? 'bg-gray-100 text-gray-500'
                            : (product.stock === 0 ? 'bg-gray-800 text-white hover:bg-black' : 'bg-brandPink text-white hover:opacity-90')
                            }`}
                    >
                        {isInCart ? 'IN BAG' : (product.stock === 0 ? 'ADD TO WISHLIST' : 'ADD TO CART')}
                    </button>
                )}
            </div>

            {/* Responsive CSS Clamping for title */}
            <style dangerouslySetInnerHTML={{
                __html: `
                .line-clamp-2 {
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }
            `}} />
        </div>
    );
};

export default ProductCard;
