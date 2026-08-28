import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingCart, Star, ShoppingBag, ArrowRight } from 'lucide-react';
import { Product } from '@/data/products';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { isActivePromotion } from '@/utils/promotionHelper';
import toast from 'react-hot-toast';

const CocoProductCard: React.FC<{ product: Product }> = ({ product }) => {
    const { addToCart } = useCart();
    const { toggleWishlist, isInWishlist } = useWishlist();
    const isFavorite = isInWishlist(product.id);

    const isPromo = isActivePromotion(product);
    const savings = isPromo && product.originalPrice ? product.originalPrice - product.price : 0;
    const formatPrice = (p: number | string) => `₹${Number(p).toFixed(2).replace(/\.00$/, '')}`;

    return (
        <div className="bg-white rounded-2xl p-3 shadow-xl border border-gray-50 flex flex-col h-full group transition-all duration-500 hover:shadow-2xl">
            {/* Image Area */}
            <div className="relative aspect-square rounded-xl overflow-hidden mb-4">
                <Link to={`/product/${product.slug}`} className="block w-full h-full">
                    <img 
                        src={product.image} 
                        alt={product.name}
                        width={300}
                        height={300}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                </Link>

                {/* Top Badges */}
                <div className="absolute top-3 left-3 flex flex-col gap-2">
                    <div className="bg-[#8E2A8B] text-white flex items-center gap-1.5 px-2.5 py-1 rounded-xl shadow-lg backdrop-blur-md bg-opacity-90 w-max">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-leaf"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 3.5 1 9.8a7 7 0 0 1-13.4 3.2"/><path d="M11 20c-1.4 0-2.8-.5-3.9-1.5l10.2-10.2c1 1.1 1.5 2.5 1.5 3.9a7 7 0 0 1-7.8 7.8Z"/></svg>
                        <span className="text-[8px] font-black uppercase tracking-widest">Eco Friendly</span>
                    </div>
                    {isPromo && (
                        <div className="bg-brandPink text-white flex items-center gap-1.5 px-2.5 py-1 rounded-xl shadow-lg backdrop-blur-md bg-opacity-90 w-max">
                            <span className="text-[10px] font-black uppercase tracking-wider">{product.campaignTag}</span>
                        </div>
                    )}
                </div>

                <div className="absolute top-3 right-3 flex flex-col gap-2">
                    <button 
                        onClick={() => toggleWishlist(product)}
                        className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg text-gray-400 hover:text-red-500 transition-colors"
                    >
                        <Heart size={14} fill={isFavorite ? "currentColor" : "none"} />
                    </button>
                    <button 
                        onClick={() => {
                            addToCart(product, 1);
                            toast.success(`${product.name} added to cart!`);
                        }}
                        className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg text-gray-400 hover:text-[#8E2A8B] transition-colors"
                    >
                        <ShoppingCart size={14} />
                    </button>
                </div>

                {/* Bottom Badges on Image */}
                <div className="absolute bottom-3 left-3">
                    <div className="bg-black/30 backdrop-blur-md text-white px-2 py-1 rounded-lg border border-white/20 flex items-center gap-1">
                        <Star size={8} fill="currentColor" />
                        <span className="text-[8px] font-bold uppercase tracking-widest">Handcrafted</span>
                    </div>
                </div>


            </div>

            {/* Carousel Dots Placeholder */}
            <div className="flex justify-center gap-1 mb-4">
                <div className="w-1.5 h-1.5 rounded-full bg-[#8E2A8B]"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-gray-200"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-gray-200"></div>
            </div>

            {/* Info Section */}
            <div className="flex flex-col gap-1 mb-4 px-2 flex-grow">
                <Link to={`/product/${product.slug}`}>
                    <h3 className="text-lg font-bold text-[#1A1A1A] leading-tight line-clamp-2 group-hover:text-[#8E2A8B] transition-colors font-outfit">
                        {product.name}
                    </h3>
                </Link>
                <p className="text-[11px] text-gray-400 line-clamp-1 leading-relaxed">
                    {product.shortDescription || "Eco-friendly coconut shell product."}
                </p>
            </div>

            <div className="mt-auto px-2 mb-1 flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                    <span className="text-2xl font-black text-[#1A1A1A]">{formatPrice(product.price)}</span>
                    {isPromo && product.originalPrice && (
                        <span className="text-sm font-bold text-gray-400 line-through">
                            {formatPrice(product.originalPrice)}
                        </span>
                    )}
                </div>
                {isPromo && product.originalPrice && (
                    <span className="text-xs font-bold text-brandGreen uppercase tracking-wider">
                        You save {formatPrice(savings)}
                    </span>
                )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 mt-3">
                <button 
                    onClick={() => {
                        addToCart(product, 1);
                        toast.success(`${product.name} added to cart!`);
                    }}
                    className="flex-1 h-11 bg-[#8E2A8B] text-white rounded-xl flex items-center justify-center gap-2 font-black text-[9px] uppercase tracking-widest hover:bg-[#72216F] transition-all shadow-lg active:scale-95"
                >
                    <ShoppingBag size={14} />
                    Quick Add
                </button>
                <Link 
                    to={`/product/${product.slug}`}
                    className="w-11 h-11 border-2 border-gray-100 rounded-xl flex items-center justify-center text-gray-400 hover:border-[#8E2A8B] hover:text-[#8E2A8B] transition-all"
                >
                    <ArrowRight size={18} />
                </Link>
            </div>
        </div>
    );
};

export default CocoProductCard;
