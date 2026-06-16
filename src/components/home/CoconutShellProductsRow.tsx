import { useRef, useMemo } from 'react';
import { useProducts } from '@/context/ProductContext';
import CocoProductCard from './CocoProductCard';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const CoconutShellProductsRow = () => {
    const { products } = useProducts();
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const cocoProducts = useMemo(() => {
        return products
            .filter(p => (p.category?.toLowerCase() || '').includes('coco'))
            .slice(0, 12);
    }, [products]);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const { scrollLeft, clientWidth } = scrollContainerRef.current;
            const scrollTo = direction === 'left' ? scrollLeft - clientWidth : scrollLeft + clientWidth;
            scrollContainerRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
        }
    };

    if (!cocoProducts || cocoProducts.length === 0) return null;

    return (
        <section className="py-4 bg-[#FBFBFB]">
            <div className="container mx-auto px-4 max-w-[1240px]">
                <div className="mb-6 px-4 flex flex-col md:flex-row md:items-center md:justify-between text-center md:text-left">
                    <div>
                        <h2 className="text-4xl md:text-6xl font-black text-[#1A1A1A] tracking-tight font-outfit">Coconut Shell Products</h2>
                    </div>
                    <div className="mt-4 md:mt-0 hidden md:flex items-center gap-4">
                        <button
                            onClick={() => scroll('left')}
                            className="w-12 h-12 border-2 border-gray-200 rounded-2xl flex items-center justify-center hover:border-[#8E2A8B] hover:text-[#8E2A8B] transition-all group"
                        >
                            <ChevronLeft size={24} className="group-active:scale-90 transition-transform" />
                        </button>
                        <button
                            onClick={() => scroll('right')}
                            className="w-12 h-12 border-2 border-gray-200 rounded-2xl flex items-center justify-center hover:border-[#8E2A8B] hover:text-[#8E2A8B] transition-all group"
                        >
                            <ChevronRight size={24} className="group-active:scale-90 transition-transform" />
                        </button>
                    </div>
                </div>

                <div
                    ref={scrollContainerRef}
                    className="flex overflow-x-auto no-scrollbar snap-x snap-mandatory gap-6 pb-8 -mx-4 px-4"
                >
                    {cocoProducts.map((product) => (
                        <div key={product.id} className="flex-shrink-0 w-[300px] md:w-[calc(33.33%-16px)] lg:w-[calc(25%-18px)] snap-start">
                            <CocoProductCard product={product} />
                        </div>
                    ))}
                </div>

                {/* Removed bottom action link per design request */}
            </div>
        </section>
    );
};

export default CoconutShellProductsRow;
