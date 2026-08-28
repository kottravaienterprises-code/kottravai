import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useProducts } from '@/context/ProductContext';
import { ChevronLeft, ChevronRight, Heart, Plus, Minus, Leaf, ShoppingBag, ShoppingCart } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { isActivePromotion } from '@/utils/promotionHelper';
import toast from 'react-hot-toast';

const HeritageMixes = () => {
    const { products, loading } = useProducts();
    const scrollRef = useRef<HTMLDivElement>(null);

    // Filter to get Heritage Mixes
    const heritageProducts = useMemo(() => {
        if (!products || products.length === 0) return [];
        
        // 1. Get all Heritage Mixes first
        const allHeritage = products.filter(p => {
            if (p.isLive === false) return false;

            const pCat = p.category?.toLowerCase() || '';
            const pSlug = p.categorySlug?.toLowerCase() || '';
            
            // Check against a wider range of heritage keywords and known heritage sub-categories
            const keywords = ['idly', 'idli', 'dosa', 'podi', 'mix', 'heritage', 'traditional', 'rice', 'puddi'];
            const matchesKeyword = keywords.some(key => pCat.includes(key) || pSlug.includes(key));
            
            // Also check if the category explicitly matches any heritage sub-category in our data
            const heritageCategoryNames = ['daily idly mix', 'tasty dosa mix', 'wholesome rice mix', 'heritage mixes'];
            const matchesExplicit = heritageCategoryNames.some(name => pCat === name || pSlug === name.replace(/\s+/g, '-').toLowerCase());

            return matchesKeyword || matchesExplicit;
        });

        // 2. Filter by sub-category if needed
        return allHeritage;
    }, [products]);

    // Scroll Handler
    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const { scrollLeft, clientWidth } = scrollRef.current;
            const scrollAmount = clientWidth * 0.8;
            const scrollTo = direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount;
            scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
        }
    };

    if (heritageProducts.length === 0 && !loading) {
        return (
            <section className="py-6 bg-[#F8FAFC]">
                <div className="container mx-auto px-4 text-center">
                    <p className="text-gray-300 font-bold uppercase tracking-widest text-[10px]">Updating traditional collections...</p>
                </div>
            </section>
        );
    }

    // --- Sub-component: Product Card with Requested Structure ---
    const HeritageProductCard = ({ product }: { product: any }) => {
        const [quantity, setQuantity] = useState(1);
        const { addToCart } = useCart();
        const isPromo = isActivePromotion(product);
        const savings = isPromo && product.originalPrice ? product.originalPrice - product.price : 0;
    const discountPercentage = isPromo && product.originalPrice ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0;
        const formatPrice = (p: number) => `₹${Number(p).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/\.00$/, '')}`;
        
        return (
            <div className="flex-shrink-0 w-[85%] sm:w-[60%] lg:w-[calc(33.33%-1rem)] xl:w-[calc(25%-1rem)] snap-start">
                <div className="relative bg-white rounded-xl overflow-hidden shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] border border-gray-100 flex flex-col group mt-4 mx-1 sm:mx-2 hover:shadow-xl transition-shadow duration-300">
                    
                    {/* Image Section */}
                    <div className="relative pt-0 px-0 bg-[#f8f9fa] overflow-hidden">
                        {/* Custom Category Label with slanted edge */}
                        <div 
                            className="absolute top-0 left-0 bg-[#701A75] text-white text-[9px] font-bold uppercase tracking-wider py-1.5 px-3 flex items-center gap-1.5 z-10" 
                            style={{ clipPath: 'polygon(0 0, 100% 0, 85% 100%, 0 100%)', paddingRight: '1.25rem' }}
                        >
                            <Leaf size={10} fill="currentColor" />
                            {product.category || "DAILY IDLY MIX"}
                        </div>

                        {/* Heart Icon */}
                        <button className="absolute top-3 right-3 bg-white w-12 h-12 rounded-full flex items-center justify-center shadow-sm border border-gray-100 text-[#701A75] hover:bg-gray-50 transition-colors z-10" aria-label="Add to wishlist">
                            <Heart size={14} />
                        </button>

                        {isPromo && (
                            <div className="absolute top-3 left-3 z-10 bg-brandPink text-white px-3 py-1.5 rounded-lg shadow-sm text-[10px] font-black uppercase tracking-widest mt-8">
                                {product.campaignTag}
                            </div>
                        )}

                        <Link to={`/product/${product.slug}`} className="block aspect-[4/3] relative z-0 flex items-center justify-center w-full">
                            <img
                                src={product.image}
                                alt={product.name}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                loading="lazy"
                            />
                        </Link>
                    </div>

                    {/* Content Section */}
                    <div className="px-4 py-4 flex flex-col flex-grow bg-white">
                        <Link to={`/product/${product.slug}`}>
                            <h3 className="font-outfit font-bold text-[#701A75] text-[15px] tracking-tight mb-1.5 hover:opacity-80 transition-opacity line-clamp-2">
                                {product.name}
                            </h3>
                        </Link>

                        <p className="text-gray-500 text-[11px] line-clamp-2 mb-4 leading-relaxed font-medium">
                            {product.shortDescription || "Flavorful idli podi made with authentic ingredients."}
                        </p>

                        <div className="flex items-center justify-between mb-5">

                            
                            <div className="flex items-center gap-1 text-gray-500">
                                <ShoppingBag size={12} />
                                <span className="text-[11px] font-medium">100 g</span>
                            </div>
                        </div>

                        <div className="flex items-end justify-between mt-auto">
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                    <div className="text-[16px] font-bold text-[#701A75]">{formatPrice(product.price * quantity)}</div>
                                    {isPromo && product.originalPrice && (
                                        <div className="text-xs font-bold text-gray-400 line-through">{formatPrice(product.originalPrice * quantity)}</div>
                                    )}
                                </div>
                                {isPromo && product.originalPrice ? (
                                    <div className="text-[9px] font-bold text-brandGreen uppercase tracking-wider mt-0.5">You save {formatPrice(savings * quantity)} ({discountPercentage}%)</div>
                                ) : (
                                    <div className="text-[9px] text-gray-400 mt-0.5">Inclusive of all taxes</div>
                                )}
                            </div>
                            
                            <div className="flex items-center gap-2">
                                <div className="flex items-center bg-white border border-gray-200 rounded-md text-sm overflow-hidden h-9">
                                    <button 
                                        onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                                        className="w-7 h-full flex items-center justify-center hover:bg-gray-50 text-gray-600 transition-colors"
                                        aria-label="Decrease quantity"
                                    >
                                        <Minus size={12} />
                                    </button>
                                    <span className="w-6 text-center text-[13px] font-semibold text-gray-800">{quantity}</span>
                                    <button 
                                        onClick={() => setQuantity(prev => prev + 1)}
                                        className="w-7 h-full flex items-center justify-center hover:bg-gray-50 text-gray-600 transition-colors"
                                        aria-label="Increase quantity"
                                    >
                                        <Plus size={12} />
                                    </button>
                                </div>
                                <button
                                    onClick={() => {
                                        addToCart(product, quantity);
                                        toast.success(`${product.name} added to cart!`);
                                    }}
                                    className="h-9 px-3.5 bg-[#701A75] text-white rounded-md flex items-center justify-center gap-2 hover:bg-[#581c87] transition-colors"
                                >
                                    <ShoppingCart size={13} fill="currentColor" strokeWidth={0} />
                                    <span className="text-[10px] font-bold tracking-wider">ADD TO CART</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <section className="py-4 md:py-5 bg-[#F8FAFC] overflow-hidden">
            <div className="container mx-auto px-4 max-w-[1240px]">
                {/* Header Row */}
                <div className="mb-6 px-4 flex flex-col md:flex-row md:items-center md:justify-between text-center md:text-left">
                    <div>
                        <h2 className="text-4xl md:text-6xl font-black text-[#1A1A1A] tracking-tight font-outfit">Heritage Mixes</h2>
                    </div>
                    <div className="mt-4 md:mt-0">
                        <Link to="/category/heritage-mixes" className="inline-flex items-center gap-2 text-sm font-bold text-[#8E2A8B] hover:underline uppercase tracking-wide">
                            Explore All
                            <ChevronRight size={14} />
                        </Link>
                    </div>
                </div>

                <div className="relative group/carousel px-2">
                    {/* Navigation Arrows (Desktop Only) */}
                    <button
                        onClick={() => scroll('left')}
                        className="absolute -left-6 top-1/2 -translate-y-1/2 z-20 w-12 h-12 hidden lg:flex items-center justify-center bg-white rounded-full shadow-xl border border-gray-50 opacity-0 group-hover/carousel:opacity-100 transition-all hover:bg-[#8E2A8B] hover:text-white"
                        aria-label="Scroll left"
                    >
                        <ChevronLeft size={24} />
                    </button>

                    <div
                        ref={scrollRef}
                        className="flex gap-2 overflow-x-auto no-scrollbar snap-x snap-mandatory scroll-smooth pb-8 -mx-4 px-4 md:mx-0 md:px-0"
                    >
                        {loading ? (
                            [...Array(4)].map((_, i) => (
                                <div key={i} className="min-w-[85%] sm:w-[50%] lg:w-[25%] p-4">
                                    <div className="bg-white rounded-3xl h-[400px] animate-pulse border border-gray-100"></div>
                                </div>
                            ))
                        ) : heritageProducts.length > 0 ? (
                            heritageProducts.map((product) => (
                                <HeritageProductCard key={product.id} product={product} />
                            ))
                        ) : (
                             <div className="w-full py-20 bg-white rounded-[32px] border border-dashed border-gray-200 flex flex-col items-center justify-center text-center px-4 mx-4">
                                <p className="text-gray-400 font-bold uppercase tracking-widest text-sm mb-4">No heritage mixes are available right now.</p>
                             </div>
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

export default HeritageMixes;
