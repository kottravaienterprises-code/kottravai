import { useProducts } from '@/context/ProductContext';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const GiftHampers = () => {
    const { products, loading } = useProducts();

    // Fetch specifically curated kits/hampers (Only Live)
    const curatedHampers = products
        .filter(p => p.isLive !== false && (p.categorySlug === 'signature-kits' || p.category === 'Signature Kits'))
        .slice(0, 3);

    if (!loading && curatedHampers.length === 0) {
        return null; // Don't show empty section
    }

    return (
        <section className="py-20 bg-gray-50">
            <div className="container mx-auto px-4 max-w-[1240px]">
                <div className="text-center mb-10 px-4">
                    <p className="text-[11px] md:text-sm font-black text-[#8E2A8B] uppercase tracking-[0.4em] mb-2">Special Collections</p>
                    <h2 className="text-4xl md:text-6xl font-black text-[#1A1A1A] tracking-tight font-outfit">Curated Gift Hampers</h2>
                    <div className="flex justify-center mt-4">
                        <Link to="/category/hampers" className="group flex items-center gap-2 text-[#8E2A8B] font-bold uppercase tracking-[0.2em] text-[10px] hover:gap-4 transition-all pb-1 border-b-2 border-[#8E2A8B]/20 hover:border-[#8E2A8B]">
                            View All Collections <ArrowRight size={14} />
                        </Link>
                    </div>
                </div>

                <div className="flex md:grid md:grid-cols-3 gap-6 md:gap-8 overflow-x-auto md:overflow-visible no-scrollbar snap-x snap-mandatory pb-6 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0">
                    {loading ? (
                        [...Array(3)].map((_, i) => (
                            <div key={i} className="flex-shrink-0 w-[280px] sm:w-[320px] md:w-auto h-80 bg-gray-200 rounded-xl animate-pulse"></div>
                        ))
                    ) : (
                        curatedHampers.map((item, index) => (
                            <div 
                                key={item.id} 
                                className="group relative rounded-xl overflow-hidden shadow-md flex-shrink-0 w-[280px] sm:w-[320px] md:w-auto snap-start"
                                style={{ aspectRatio: '4/3', minHeight: '300px' }}
                            >
                                <img
                                    src={item.image}
                                    alt={item.name}
                                    width={400}
                                    height={320}
                                    loading="lazy"
                                    decoding="async"
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-8">
                                    <span className="text-white/80 text-xs font-bold uppercase tracking-widest mb-2">Signature Kit 0{index + 1}</span>
                                    <h3 className="text-2xl font-bold text-white mb-4">{item.name}</h3>
                                    <Link to={`/product/${item.slug}`} className="text-white text-sm font-semibold border-b border-white pb-1 inline-block w-max hover:text-[#8E2A8B] hover:border-[#8E2A8B] transition-colors">
                                        Explore Now
                                    </Link>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </section>
    );
};

export default GiftHampers;
