import { useRef, useMemo } from 'react';
import { useProducts } from '@/context/ProductContext';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import toast from 'react-hot-toast';
import analytics from '@/utils/analyticsService';
import { ChevronLeft, ChevronRight, Heart, Eye, ShoppingBag } from 'lucide-react';
import { isActivePromotion } from '@/utils/promotionHelper';

const BestSellerProductCard = ({ product }: { product: any }) => {
    const { addToCart } = useCart();
    const { toggleWishlist, isInWishlist } = useWishlist();
    const navigate = useNavigate();
    
    const isFavorite = isInWishlist(product.id);
    
    const handleToggleWishlist = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        toggleWishlist(product);
    };

    const isPromo = isActivePromotion(product);
    const savings = isPromo && product.originalPrice ? product.originalPrice - product.price : 0;
    const discountPercentage = isPromo && product.originalPrice ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0;
    
    // Format helper
    const formatPrice = (p: number | string) => `₹${Number(p).toFixed(2).replace(/\.00$/, '')}`;
    
    return (
        <div className="bg-white rounded-2xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.05)] border border-gray-100 flex flex-col w-full h-full group hover:shadow-xl transition-all duration-300">
            
            {/* Image Area */}
            <div className="relative aspect-square w-full overflow-hidden">
                <Link
                    to={`/product/${product.slug}`}
                    className="block w-full h-full"
                    onClick={() => analytics.trackEvent('product_view', {
                        product_id: product.id,
                        product_name: product.name,
                        category: product.category,
                        price: product.price,
                        page: `/product/${product.slug}`
                    })}
                >
                    <img
                        src={product.image}
                        alt={product.name}
                        width={300}
                        height={300}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        loading="lazy"
                    />
                </Link>

                {/* Promo Badge */}
                {isPromo && (
                    <div className="absolute top-4 left-4 z-10">
                        <span className="bg-brandPink text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-lg">
                            {product.campaignTag}
                        </span>
                    </div>
                )}
                
                {/* Wishlist Heart on Image */}
                <button 
                    onClick={handleToggleWishlist}
                    className="absolute top-4 right-4 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-50 transition-colors z-10"
                    aria-label="Add to wishlist"
                >
                    <Heart 
                        size={20} 
                        className={`${isFavorite ? 'text-red-500 fill-red-500' : 'text-gray-400'}`} 
                    />
                </button>
            </div>

            {/* Content Area */}
            <div className="p-5 flex flex-col flex-grow">
                {/* Title */}
                <Link
                    to={`/product/${product.slug}`}
                    onClick={() => analytics.trackEvent('product_view', {
                        product_id: product.id,
                        product_name: product.name,
                        category: product.category,
                        price: product.price,
                        page: `/product/${product.slug}`
                    })}
                >
                    <h3 className="font-bold text-[#1A1A1A] text-sm leading-tight mb-4 line-clamp-2 min-h-[2.5rem]">
                        {product.name}
                    </h3>
                </Link>

                {/* Price Section */}
                <div className="flex flex-col mb-4 gap-1">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl font-black text-[#8E2A8B]">{formatPrice(product.price)}</span>
                        {isPromo && product.originalPrice && (
                            <span className="text-gray-400 line-through text-sm">{formatPrice(product.originalPrice)}</span>
                        )}
                    </div>
                    {isPromo && product.originalPrice && (
                        <span className="text-[10px] font-bold text-brandGreen uppercase tracking-wider">
                            You save {formatPrice(savings)} ({discountPercentage}%)
                        </span>
                    )}
                </div>

                {/* Star Rating */}
                <div className="flex items-center gap-1 mb-6">
                    {[...Array(5)].map((_, i) => (
                        <svg 
                            key={i} 
                            className={`w-4 h-4 ${i < 4 ? 'text-orange-400 fill-orange-400' : 'text-gray-200 fill-gray-200'}`} 
                            viewBox="0 0 20 20"
                        >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                    ))}
                    <span className="text-gray-400 text-xs ml-1 font-medium">({Math.floor(Math.random() * 200) + 100})</span>
                </div>

                {/* Secondary Action Buttons */}
                <div className="flex gap-2 mb-3 mt-auto">
                    <button 
                        onClick={() => {
                            analytics.trackEvent('product_view', {
                                product_id: product.id,
                                product_name: product.name,
                                category: product.category,
                                price: product.price,
                                page: `/product/${product.slug}`
                            });
                            navigate(`/product/${product.slug}`);
                        }}
                        className="flex-1 border border-gray-200 rounded-lg py-2.5 flex items-center justify-center gap-2 text-[10px] font-bold text-gray-600 uppercase tracking-widest hover:bg-gray-50 transition-colors"
                    >
                        <Eye size={16} /> QUICK VIEW
                    </button>
                    <button 
                        onClick={handleToggleWishlist}
                        className="flex-1 border border-gray-200 rounded-lg py-2.5 flex items-center justify-center gap-2 text-[10px] font-bold text-gray-600 uppercase tracking-widest hover:bg-gray-50 transition-colors"
                    >
                        <Heart size={16} className={isFavorite ? 'fill-red-500 text-red-500 border-none' : ''} /> WISHLIST
                    </button>
                </div>

                {/* Main Action Button */}
                <button
                    onClick={() => {
                        addToCart(product, 1);
                        toast.success(`${product.name} added to cart!`);
                    }}
                    className="w-full bg-[#8E2A8B] text-white rounded-lg py-3.5 flex items-center justify-center gap-2 hover:bg-[#72216F] transition-colors shadow-md group/btn"
                >
                    <ShoppingBag size={18} />
                    <span className="font-bold text-xs uppercase tracking-widest">ADD TO CART</span>
                </button>
            </div>
        </div>
    );
};

const BestSellers = () => {
    const { products } = useProducts();
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Filter logic (showing 'All Products' category)
    const displayProducts = useMemo(() => {
        // 0. Only show Live products
        let filtered = products.filter(p => p.isLive !== false);

        // 1. Filter checks if it's marked as Best Seller
        filtered = filtered.filter(p => p.isBestSeller);

        // 3. Structured Mixing Logic for "Best Overall" (2 Coco, 2 Terracotta pattern)
        const coco = filtered.filter(p => p.category?.toLowerCase().includes('coco') || p.name?.toLowerCase().includes('coco'));
        const terracotta = filtered.filter(p => 
            p.category?.toLowerCase().includes('terracotta') || p.category?.toLowerCase().includes('ornaments') ||
            p.name?.toLowerCase().includes('terracotta') || p.name?.toLowerCase().includes('necklace')
        );
        const others = filtered.filter(p => !coco.includes(p) && !terracotta.includes(p));

        const interleaved: any[] = [];
        const maxLen = Math.max(coco.length, terracotta.length, others.length);
        
        for (let i = 0; i < maxLen; i += 2) {
            // Add 2 Coco
            if (coco[i]) interleaved.push(coco[i]);
            if (coco[i+1]) interleaved.push(coco[i+1]);
            
            // Add 2 Terracotta
            if (terracotta[i]) interleaved.push(terracotta[i]);
            if (terracotta[i+1]) interleaved.push(terracotta[i+1]);

            // Add 1 Other (to keep it fresh)
            const otherIdx = Math.floor(i/2);
            if (others[otherIdx]) interleaved.push(others[otherIdx]);
        }
        const limit = typeof window !== 'undefined' && window.innerWidth < 768 ? 6 : 12;
        return interleaved.slice(0, limit);
    }, [products]);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const { scrollLeft, clientWidth } = scrollContainerRef.current;
            const scrollTo = direction === 'left' ? scrollLeft - clientWidth : scrollLeft + clientWidth;
            scrollContainerRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
        }
    };

    if (!products || products.length === 0) {
        return null;
    }

    return (
        <section className="pt-8 pb-4 bg-[#FAF9F6]">
            <div className="container mx-auto px-4 max-w-[1240px]">
                <div className="mb-6 px-4 flex flex-col md:flex-row md:items-center md:justify-between text-center md:text-left">
                    <div>
                        <h2 className="text-4xl md:text-6xl font-black text-[#1A1A1A] tracking-tight font-outfit">Best Sellers</h2>
                    </div>
                    <div className="mt-4 md:mt-0">
                        <Link to="/shop" className="inline-flex items-center gap-2 text-sm font-bold text-[#8E2A8B] hover:underline uppercase tracking-wide">
                            View Products
                            <ChevronRight size={14} />
                        </Link>
                    </div>
                </div>

                {/* Carousel Container */}
                {displayProducts.length > 0 ? (
                    <div className="relative group/carousel">
                        {/* Navigation Buttons */}
                        <button
                            onClick={() => scroll('left')}
                            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-10 h-10 bg-white shadow-lg rounded-full flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-300 hover:bg-gray-50 border border-gray-100 hidden md:flex"
                            aria-label="Scroll best sellers left"
                        >
                            <ChevronLeft size={20} className="text-[#8E2A8B]" />
                        </button>
                        <button
                            onClick={() => scroll('right')}
                            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-10 h-10 bg-white shadow-lg rounded-full flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-300 hover:bg-gray-50 border border-gray-100 hidden md:flex"
                            aria-label="Scroll best sellers right"
                        >
                            <ChevronRight size={20} className="text-[#8E2A8B]" />
                        </button>

                        <div
                            ref={scrollContainerRef}
                            className="flex overflow-x-auto no-scrollbar snap-x snap-mandatory gap-4 md:gap-6 pb-8 -mx-4 px-4"
                        >
                            {displayProducts.map((product) => (
                                <div key={product.id} className="flex-shrink-0 w-[280px] sm:w-[320px] lg:w-[calc(25%-18px)] snap-start flex">
                                    <BestSellerProductCard product={product} />
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-20 bg-white rounded-[2rem] border border-dashed border-gray-200">
                        <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">No curated selections in this category yet.</p>
                    </div>
                )}

                {/* 'View All Products' moved to title area as a small link */}
            </div>
        </section>
    );
};

export default BestSellers;