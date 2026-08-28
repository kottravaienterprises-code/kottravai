import React, { useEffect, useState } from 'react';
import ProductCard from '@/components/home/ProductCard';
import { useProducts } from '@/context/ProductContext';
import { Product } from '@/data/products';
import { Link } from 'react-router-dom';
import analytics from '@/utils/analyticsService';

interface Props {
    productIds: string[];
    title?: string;
    source: 'mid_article' | 'end_article';
}

const BlogRelatedProducts: React.FC<Props> = ({ productIds, title = "Shop Related Products", source }) => {
    const { products } = useProducts();
    const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);

    useEffect(() => {
        // Try to match product IDs exactly
        let matches = products.filter(p => productIds.includes(p.id));
        
        // If we don't have enough matches (maybe IDs changed or were placeholders), just grab some bestsellers
        if (matches.length < 3) {
            const randomExtras = products.filter(p => !matches.find(m => m.id === p.id)).slice(0, 3 - matches.length);
            matches = [...matches, ...randomExtras];
        }

        // Still not enough? Grab random products
        if (matches.length < 3) {
            const random = products.filter(p => !matches.find(m => m.id === p.id)).slice(0, 3 - matches.length);
            matches = [...matches, ...random];
        }

        setRelatedProducts(matches);
    }, [products, productIds]);

    if (relatedProducts.length === 0) return null;

    const handleProductClick = (product: Product) => {
        analytics.trackEvent('blog_product_click', {
            product_id: product.id,
            product_name: product.name,
            source: source
        });
    };

    return (
        <div className="my-12">
            <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-4">
                <h3 className="text-2xl font-black text-[#2D1B4E]">{title}</h3>
                <Link to="/shop" className="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors hidden md:block">
                    View All Products &rarr;
                </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {relatedProducts.map(product => (
                    <div key={product.id} onClick={() => handleProductClick(product)}>
                        <ProductCard product={product} />
                    </div>
                ))}
            </div>
            
            <div className="mt-6 text-center md:hidden">
                <Link to="/shop" className="inline-block w-full h-12 leading-[48px] bg-gray-50 text-gray-900 font-bold rounded-xl text-sm border border-gray-200">
                    View All Products
                </Link>
            </div>
        </div>
    );
};

export default BlogRelatedProducts;
