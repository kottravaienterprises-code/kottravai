import React from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { Product } from '@/data/products';
import { useWishlist } from '@/context/WishlistContext';
import { isActivePromotion } from '@/utils/promotionHelper';

interface NewArrivalProductCardProps {
    product: Product;
    index?: number;
}

const NewArrivalProductCard: React.FC<NewArrivalProductCardProps> = ({ product }) => {
    const { toggleWishlist, isInWishlist } = useWishlist();
    
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
        <div className="group relative bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 flex flex-col h-full mx-1 w-full">
            
            {/* Top Wishlist Heart */}
            <button 
                onClick={handleToggleWishlist}
                className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center shadow-sm z-20 transition-all duration-300 ${isFavorite ? 'bg-white text-red-500' : 'bg-white text-gray-400 hover:text-red-500'}`}
            >
                <Heart size={14} className={isFavorite ? 'fill-red-500' : ''} />
            </button>

            {/* Promo Badge */}
            {isPromo && (
                <div className="absolute top-3 left-3 z-20">
                    <span className="bg-brandPink text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded shadow-sm">
                        {product.campaignTag}
                    </span>
                </div>
            )}

            {/* Image Section */}
            <div className="relative aspect-square w-full flex items-center justify-center overflow-hidden bg-gray-50 border-b border-gray-50">
                <Link to={`/product/${product.slug}`} className="block w-full h-full">
                    <img
                        src={product.image}
                        alt={product.name}
                        width={300}
                        height={300}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        loading="lazy"
                    />
                </Link>
            </div>

            {/* Content Section */}
            <div className="p-4 flex flex-col flex-grow items-start text-left">
                <Link to={`/product/${product.slug}`} className="w-full mb-3 flex-grow">
                    <h3 className="font-outfit font-bold text-[#1A1A1A] text-[13px] sm:text-sm leading-snug hover:text-[#8E2A8B] transition-colors line-clamp-2 uppercase">
                        {product.name}
                    </h3>
                </Link>

                <div className="flex flex-col gap-0.5 w-full">
                    <div className="flex items-center gap-2">
                        <span className="text-lg font-black text-[#8E2A8B] font-outfit">{formatPrice(product.price)}</span>
                        {isPromo && product.originalPrice && (
                            <span className="text-gray-400 line-through text-xs font-bold">{formatPrice(product.originalPrice)}</span>
                        )}
                    </div>
                    {isPromo && product.originalPrice && (
                        <span className="text-[9px] font-bold text-brandGreen uppercase tracking-wider">
                            You save {formatPrice(savings)} ({discountPercentage}%)
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NewArrivalProductCard;
