import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';

const categories = [
    {
        id: 1,
        title: "Coconut Shell Products",
        image: "/cs.jpg",
        link: "/category/coconut-shell-products"
    },
    {
        id: 2,
        title: "Terracotta Jewellery",
        image: "/w5pt5wnue7-1778068003534-black_set_final_1_1.webp",
        link: "/category/handmade-jewellery"
    },
    {
        id: 3,
        title: "Banana Fibre Essential",
        image: "/yhf2zsie9kp-1778313282517-Gemini_Generated_Image_25jjpm25jjpm25jj (1).webp",
        link: "/category/banana-fiber-products"
    },
    {
        id: 8,
        title: "Hampers",
        image: "/hampers.webp",
        link: "/category/hampers"
    }
];

const CategoryRow = () => {
    const scrollRef = useRef<HTMLDivElement>(null);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const { scrollLeft, clientWidth } = scrollRef.current;
            const scrollAmount = clientWidth;
            const scrollTo = direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount;
            scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
        }
    };

    return (
        <section className="py-10 md:py-12 lg:py-[60px] xl:py-[72px] bg-white overflow-hidden">
            <div className="container mx-auto px-4 md:px-6 lg:px-8 xl:px-10 max-w-[1360px]">
                {/* Section Header */}
                <div className="mb-7 md:mb-8 lg:mb-9 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                    <div className="flex-1">
                        <h2 className="text-[28px] md:text-[32px] lg:text-[36px] font-black text-[#2D1B4E] font-outfit tracking-tighter leading-tight mb-2">
                            Shop By Categories
                        </h2>
                        <p className="text-[15px] md:text-[16px] lg:text-[17px] text-[#6b5a50] max-w-2xl leading-relaxed">
                            Explore handcrafted products made with purpose.
                        </p>
                    </div>
                    
                    <div className="flex items-center justify-between md:justify-end gap-6 mt-2 md:mt-0">
                        <Link 
                            to="/shop" 
                            className="inline-flex items-center gap-1 text-[15px] font-semibold text-[#8E2A8B] hover:text-[#6a1f68] transition-colors"
                        >
                            View All Categories
                            <ArrowRight size={16} />
                        </Link>
                        
                        {/* Desktop Carousel Controls */}
                        <div className="hidden md:flex items-center gap-2">
                            <button
                                onClick={() => scroll('left')}
                                aria-label="Scroll left"
                                className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center bg-white rounded-full shadow-[0_2px_6px_rgba(0,0,0,0.06)] border border-[#503C28]/10 hover:border-[#8E2A8B] hover:text-[#8E2A8B] transition-colors text-[#2D1B4E]"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <button
                                onClick={() => scroll('right')}
                                aria-label="Scroll right"
                                className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center bg-white rounded-full shadow-[0_2px_6px_rgba(0,0,0,0.06)] border border-[#503C28]/10 hover:border-[#8E2A8B] hover:text-[#8E2A8B] transition-colors text-[#2D1B4E]"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Carousel Container */}
                <div className="relative">
                    <div 
                        ref={scrollRef}
                        className="flex overflow-x-auto no-scrollbar gap-4 md:gap-5 lg:gap-6 pb-6 snap-x snap-mandatory scroll-smooth -mx-4 px-4 md:mx-0 md:px-0"
                    >
                        {categories.map((cat, index) => (
                            <motion.div
                                key={cat.id}
                                initial={{ opacity: 0, y: 15 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.05, duration: 0.4 }}
                                className="flex-shrink-0 w-[75vw] sm:w-[calc(50%-10px)] lg:w-[calc(25%-18px)] snap-start group"
                            >
                                <Link 
                                    to={cat.link} 
                                    className="block bg-white rounded-[20px] md:rounded-[24px] border border-[#503C28]/10 shadow-[0_2px_8px_rgba(80,60,40,0.04)] h-full overflow-hidden transition-all duration-300 md:hover:-translate-y-1 md:hover:shadow-[0_8px_24px_rgba(80,60,40,0.08)] flex flex-col"
                                >
                                    {/* Image Area */}
                                    <div className="w-full aspect-[4/3] overflow-hidden bg-[#F9F8F6]">
                                        <img 
                                            src={cat.image} 
                                            alt={cat.title}
                                            className="w-full h-full object-cover transition-transform duration-300 md:group-hover:scale-[1.03]"
                                            loading="lazy"
                                        />
                                    </div>
                                    
                                    {/* Content Area */}
                                    <div className="p-5 md:p-6 flex flex-col flex-grow bg-white">
                                        <h3 className="text-[18px] md:text-[19px] lg:text-[20px] font-semibold text-[#2D1B4E] leading-snug mb-1">
                                            {cat.title}
                                        </h3>

                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
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

export default CategoryRow;
