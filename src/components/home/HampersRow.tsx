import React, { useMemo, useRef } from 'react';
import { useProducts } from '@/context/ProductContext';
import { ChevronLeft, ChevronRight, Heart, ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from '@/context/CartContext';
import { isActivePromotion } from '@/utils/promotionHelper';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

const HamperProductCard = ({ product }: { product: any }) => {
    const { addToCart } = useCart();
    const isPromo = isActivePromotion(product);
    const savings = isPromo && product.originalPrice ? product.originalPrice - product.price : 0;
    const discountPercentage = isPromo && product.originalPrice ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0;
    const formatPrice = (p: number) => `₹${Number(p).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/\.00$/, '')}`;

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex-shrink-0 w-[280px] sm:w-[320px] lg:w-[calc(25%-1rem)] snap-start h-full py-4"
        >
            <div className="group relative bg-white flex flex-col h-full rounded-xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] transition-all duration-500 border border-gray-100 mx-2">
                
                {/* TOP SECTION: IMAGE AREA */}
                <div className="relative aspect-square w-full overflow-hidden bg-gray-50">
                    {isPromo && (
                        <div className="absolute top-3 left-3 z-10 bg-brandPink text-white px-3 py-1.5 rounded-lg shadow-sm text-[10px] font-black uppercase tracking-widest">
                            {product.campaignTag}
                        </div>
                    )}
                    <button className="absolute top-3 right-3 z-10 w-12 h-12 rounded-full bg-white flex items-center justify-center text-[#8E2A8B] shadow-sm hover:bg-[#8E2A8B] hover:text-white transition-all duration-300" aria-label="Add to wishlist">
                        <Heart size={16} />
                    </button>
                    
                    <Link to={`/product/${product.slug}`} className="block w-full h-full relative z-0">
                        <img 
                            src={product.image} 
                            alt={product.name}
                            width={300}
                            height={300}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                        />
                    </Link>
                </div>

                {/* BOTTOM SECTION: CONTENT AREA */}
                <div className="relative flex-1 bg-white p-5 flex flex-col items-start text-left">
                    
                    {/* Price Section */}
                    <div className="mb-3 flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                            <span className="text-xl font-bold text-[#8E2A8B]">{formatPrice(product.price)}</span>
                            {isPromo && product.originalPrice && (
                                <span className="text-sm font-bold text-gray-400 line-through">
                                    {formatPrice(product.originalPrice)}
                                </span>
                            )}
                        </div>
                        {isPromo && product.originalPrice && (
                            <span className="text-xs font-bold text-brandGreen uppercase tracking-wider">
                                You save {formatPrice(savings)} ({discountPercentage}%)
                            </span>
                        )}
                    </div>

                    {/* Product Name */}
                    <div className="flex-grow mb-3">
                        <Link to={`/product/${product.slug}`}>
                            <h3 className="text-[15px] font-bold text-[#2D1B4E] leading-tight hover:text-[#8E2A8B] transition-colors line-clamp-2">
                                {product.name}
                            </h3>
                        </Link>
                    </div>

                    {/* Description */}
                    <div className="mb-6">
                        <p className="text-[13px] text-gray-500 leading-relaxed line-clamp-2">
                            {product.description || `Shop ${product.name} with premium handcrafted elements...`}
                        </p>
                    </div>

                    {/* Bottom Actions */}
                    <div className="w-full flex gap-2">
                        <button 
                            onClick={() => {
                                addToCart(product, 1);
                                toast.success(`${product.name} added to cart!`);
                            }}
                            className="flex-1 bg-[#8E2A8B] text-white py-3 rounded-xl font-bold text-[11px] uppercase tracking-widest hover:bg-[#72216F] transition-all transform active:scale-95"
                        >
                            BUY NOW
                        </button>
                        <button 
                            onClick={() => {
                                addToCart(product, 1);
                                toast.success(`${product.name} added to cart!`);
                            }}
                            className="w-11 h-11 border border-[#8E2A8B] text-[#8E2A8B] rounded-xl flex items-center justify-center hover:bg-[#8E2A8B] hover:text-white transition-all duration-300"
                            aria-label="Add to cart"
                        >
                            <ShoppingCart size={18} />
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

interface HampersRowProps {
    showEnquiry?: boolean;
    onEnquiry?: () => void;
}

const HampersRow: React.FC<HampersRowProps> = () => {
    const { products, loading } = useProducts();
    const scrollRef = useRef<HTMLDivElement>(null);

    const hamperProducts = useMemo(() => {
        if (!products || products.length === 0) return [];
        return products
            .filter(p => 
                p.isLive !== false && 
                (p.category?.toLowerCase() === 'hampers' || p.categorySlug === 'hampers')
            );
    }, [products]);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const { scrollLeft, clientWidth } = scrollRef.current;
            const scrollAmount = clientWidth * 0.8;
            const scrollTo = direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount;
            scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
        }
    };

    if (!loading && hamperProducts.length === 0) return null;

    return (
        <section className="pb-4 pt-0 bg-white overflow-hidden">
            <div className="container mx-auto px-4 max-w-[1240px]">
                {/* Header Row (match Best Sellers layout) */}
                <div className="mb-6 px-4 flex flex-col md:flex-row md:items-center md:justify-between text-center md:text-left">
                    <div>
                        <h2 className="text-4xl md:text-6xl font-black text-[#1A1A1A] tracking-tight font-outfit">Hampers</h2>
                    </div>
                    <div className="mt-4 md:mt-0">
                        <Link to="/shop" className="inline-flex items-center gap-2 text-sm font-bold text-[#8E2A8B] hover:underline uppercase tracking-wide">
                            View Hampers
                            <ChevronRight size={14} />
                        </Link>
                    </div>
                </div>

                <div className="relative group/carousel">
                    {/* Navigation Arrows (Desktop Only) */}
                    <button
                        onClick={() => scroll('left')}
                        className="absolute -left-6 top-1/2 -translate-y-1/2 z-20 w-12 h-12 hidden lg:flex items-center justify-center bg-white rounded-full shadow-xl border border-gray-50 opacity-0 group-hover/carousel:opacity-100 transition-all hover:bg-[#8E2A8B] hover:text-white"
                        aria-label="Scroll left"
                    >
                        <ChevronLeft size={24} />
                    </button>

                    {/* Carousel Container */}
                    <div
                        ref={scrollRef}
                        className="flex gap-2 md:gap-0 overflow-x-auto no-scrollbar snap-x snap-mandatory scroll-smooth pb-8 -mx-4 px-4 md:mx-0 md:px-0"
                    >
                        {loading ? (
                            [...Array(4)].map((_, i) => (
                                <div key={i} className="flex-shrink-0 w-[85%] sm:w-[50%] lg:w-[25%] px-2">
                                    <div className="h-[400px] bg-gray-50 animate-pulse rounded-[4px] border border-gray-100"></div>
                                </div>
                            ))
                        ) : (
                            hamperProducts.map((product) => (
                                <HamperProductCard key={product.id} product={product} />
                            ))
                        )}
                    </div>

                    <button
                        onClick={() => scroll('right')}
                        className="absolute -right-6 top-1/2 -translate-y-1/2 z-20 w-12 h-12 hidden lg:flex items-center justify-center bg-white rounded-full shadow-xl border border-gray-100 opacity-0 group-hover/carousel:opacity-100 transition-all hover:bg-[#8E2A8B] hover:text-white"
                        aria-label="Scroll right"
                    >
                        <ChevronRight size={24} />
                    </button>
                </div>


            </div>

            <style>{`
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </section>
    );
};

export default HampersRow;
