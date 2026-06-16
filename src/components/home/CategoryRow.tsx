import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
        id: 4,
        title: "Dosa mix",
        image: "/y6j712e3wbq-1777717294475-Gemini_Generated_Image_rwm9odrwm9odrwm9 (1).webp",
        link: "/category/heritage-mixes"
    },
    {
        id: 5,
        title: "Instant nourish",
        image: "/vd13njgmplk-1778308551249-Gemini_Generated_Image_45cwzq45cwzq45cw (1).webp",
        link: "/category/instant-nourish"
    },
    {
        id: 6,
        title: "Masala powders",
        image: "/Gemini_Generated_Image_qzi18xqzi18xqzi1.webp",
        link: "/category/masala-powders"
    },
    {
        id: 7,
        title: "Essential Care – Soaps",
        image: "/download_1.webp",
        link: "/category/essential-care"
    },
    {
        id: 8,
        title: "Hampers",
        image: "/hampers.webp",
        link: "/category/hampers"
    },
    {
        id: 9,
        title: "Tasty Idly mix",
        image: "/u3cfrsk4b97-1777716271869-Gemini_Generated_Image_5n0cqp5n0cqp5n0c (2).webp",
        link: "/category/heritage-mixes"
    },
    {
        id: 10,
        title: "Wholesome rice mix",
        image: "/rzhuephpg7f-1777963682141-Gemini_Generated_Image_vpfc55vpfc55vpfc (1) (1).webp",
        link: "/category/heritage-mixes"
    }
];

const CategoryRow = () => {
    const scrollRef = useRef<HTMLDivElement>(null);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const { scrollLeft, clientWidth } = scrollRef.current;
            const scrollAmount = clientWidth * 0.8;
            const scrollTo = direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount;
            scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
        }
    };

    return (
        <section className="pt-6 pb-4 bg-white overflow-hidden">
            <div className="container mx-auto px-4 max-w-[1240px]">
                {/* Section Header */}
                <div className="mb-8 px-4 flex flex-col md:flex-row md:items-center md:justify-between text-center md:text-left">
                    <div>
                        <h2 className="text-3xl md:text-5xl font-black text-[#2D1B4E] font-outfit tracking-tighter">
                            Shop By <span className="text-[#8E2A8B]">Categories</span>
                        </h2>
                    </div>
                    <div className="mt-4 md:mt-0">
                        <Link to="/shop" className="inline-flex items-center gap-2 text-sm font-bold text-[#8E2A8B] hover:underline uppercase tracking-wide">
                            View Categories
                            <ChevronRight size={14} />
                        </Link>
                    </div>
                </div>

                {/* Carousel Container */}
                <div className="relative group/carousel">
                    {/* Left Arrow */}
                    <button
                        onClick={() => scroll('left')}
                        aria-label="Scroll left"
                        className="absolute -left-5 md:-left-6 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-white rounded-full shadow-xl border border-gray-50 opacity-100 lg:opacity-0 lg:group-hover/carousel:opacity-100 transition-all hover:bg-[#8E2A8B] hover:text-white"
                    >
                        <ChevronLeft size={24} />
                    </button>

                    <div 
                        ref={scrollRef}
                        className="flex overflow-x-auto no-scrollbar gap-4 md:gap-6 pb-6 snap-x snap-mandatory scroll-smooth -mx-4 px-4 md:mx-0 md:px-0"
                    >
                    {categories.map((cat, index) => (
                        <motion.div
                            key={cat.id}
                            initial={{ opacity: 0, y: 15 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.05, duration: 0.4 }}
                            className="flex-shrink-0 w-[160px] sm:w-[180px] lg:w-[200px] snap-start"
                        >
                            <Link 
                                to={cat.link} 
                                className="group flex flex-col bg-[#FCF5F8] rounded-2xl p-5 h-full transition-all duration-300 hover:shadow-[0_8px_30px_rgba(142,42,139,0.1)] hover:-translate-y-1"
                            >
                                {/* Image Area */}
                                <div className="aspect-[4/3] w-full rounded-xl overflow-hidden bg-transparent mb-5 flex items-center justify-center">
                                    <img 
                                        src={cat.image} 
                                        alt={cat.title}
                                        width={200}
                                        height={150}
                                        className="max-w-full max-h-full object-contain transition-transform duration-500 group-hover:scale-110 mix-blend-multiply"
                                        loading="lazy"
                                    />
                                </div>
                                
                                {/* Content Area */}
                                <div className="flex flex-col items-center justify-between flex-grow text-center mt-auto">
                                    <h3 className="text-[14px] font-bold text-[#2D1B4E] leading-snug group-hover:text-[#8E2A8B] transition-colors line-clamp-3">
                                        {cat.title}
                                    </h3>
                                </div>
                            </Link>
                        </motion.div>
                    ))}
                </div>

                {/* Right Arrow */}
                    <button
                        onClick={() => scroll('right')}
                        aria-label="Scroll right"
                        className="absolute -right-5 md:-right-6 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-white rounded-full shadow-xl border border-gray-100 opacity-100 lg:opacity-0 lg:group-hover/carousel:opacity-100 transition-all hover:bg-[#8E2A8B] hover:text-white"
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

export default CategoryRow;
