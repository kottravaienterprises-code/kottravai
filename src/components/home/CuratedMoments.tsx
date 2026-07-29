import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRef } from 'react';

const cards = [
    { id: 1, title: 'For Your Home', subtitle: 'Natural living starts here', image: '/fmgdv3264zu-1772640046533.webp', link: '/category/coconut-shell-products' },
    { id: 2, title: 'For Gifting', subtitle: 'Thoughtful gifts for loved ones', image: '/9tce0oa5y3u-1775120003580-Gemini_Generated_Image_1nopgu1nopgu1nop(1).webp', link: '/category/hampers' },
    { id: 3, title: 'For Your Kitchen', subtitle: 'Wholesome & traditional goodness', image: '/Gemini_Generated_Image_qzi18xqzi18xqzi1.webp', link: '/category/heritage-mixes' },
    { id: 4, title: 'For Self Care', subtitle: 'Pure care for you & your family', image: '/x3gxlnc79r-1770976867292.webp', link: '/category/essential-care' },
    { id: 5, title: 'For Festive Moments', subtitle: 'Make every celebration extra special', image: '/2q7ietfbksc-1778150205829-output_img19.webp', link: '/category/handmade-jewellery' }
];

const CuratedMoments = () => {
    const scrollRef = useRef<HTMLDivElement | null>(null);
    return (
        <section className="py-6 bg-[#FFF8FB] overflow-hidden">
            <div className="container mx-auto px-4 max-w-[1240px]">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-3xl md:text-4xl font-black text-[#451047]">Made for Every Part of Your Life</h2>
                        <p className="text-gray-600">Curated for your everyday moments</p>
                    </div>
                    <Link to="/shop" className="text-[#451047] font-semibold hover:underline inline-flex items-center gap-1">
                        View all
                        <ChevronRight size={16} />
                    </Link>
                </div>

                <div className="relative">
                    <button onClick={() => {
                        if (scrollRef.current) {
                            const { scrollLeft, clientWidth } = scrollRef.current;
                            scrollRef.current.scrollTo({ left: Math.max(0, scrollLeft - clientWidth * 0.8), behavior: 'smooth' });
                        }
                    }} aria-label="Scroll left" className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white rounded-full shadow hidden md:flex items-center justify-center">
                        <ChevronLeft size={20} />
                    </button>

                    <div ref={scrollRef} className="flex gap-6 overflow-x-auto no-scrollbar pb-4 -mx-4 px-4 md:mx-0 md:px-0">
                        {cards.map((c) => (
                            <motion.div key={c.id} className="flex-shrink-0 w-[300px] md:w-[260px] bg-white rounded-2xl overflow-hidden border border-gray-100" whileHover={{ y: -6 }} transition={{ type: 'spring', stiffness: 300 }}>
                                <Link to={c.link} className="block">
                                    <div className="aspect-[4/3] bg-gray-100 overflow-hidden flex items-center justify-center">
                                        <img 
                                            src={c.image} 
                                            alt={c.title} 
                                            width={300}
                                            height={225}
                                            className="w-full h-full object-cover" 
                                            loading="lazy" 
                                            decoding="async" 
                                        />
                                    </div>
                                    <div className="p-4">
                                        <h3 className="text-lg font-bold text-[#451047] mb-1">{c.title}</h3>
                                        <p className="text-gray-600 text-sm">{c.subtitle}</p>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </div>

                    <button onClick={() => {
                        if (scrollRef.current) {
                            const { scrollLeft, clientWidth, scrollWidth } = scrollRef.current;
                            const scrollTo = Math.min(scrollWidth - clientWidth, scrollLeft + clientWidth * 0.8);
                            scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
                        }
                    }} aria-label="Scroll right" className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white rounded-full shadow hidden md:flex items-center justify-center">
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>
            <style>{` .no-scrollbar::-webkit-scrollbar{ display:none } .no-scrollbar{ -ms-overflow-style:none; scrollbar-width:none } `}</style>
        </section>
    );
};

export default CuratedMoments;
