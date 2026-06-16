import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const EverydayMoments = () => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const items = [
        {
            title: "For Your Home",
            subtitle: "Natural living starts here",
            image: "https://images.unsplash.com/photo-1525498128493-380d1990a112?q=80&w=600&auto=format&fit=crop", // Macrame hanging planter
            link: "/shop?category=handicrafts"
        },
        {
            title: "For Gifting",
            subtitle: "Thoughtful gifts for loved ones",
            image: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?q=80&w=600&auto=format&fit=crop", // Sustainable gift box
            link: "/shop?category=hampers"
        },
        {
            title: "For Your Kitchen",
            subtitle: "Wholesome & traditional goodness",
            image: "https://images.unsplash.com/photo-1596436065565-dfc49cb376dc?q=80&w=600&auto=format&fit=crop", // Spices / Gourmet
            link: "/shop?category=heritage-mixes"
        },
        {
            title: "For Self Care",
            subtitle: "Pure care for you & your family",
            image: "https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?q=80&w=600&auto=format&fit=crop", // Natural soap
            link: "/shop?category=essential-care"
        },
        {
            title: "For Festive Moments",
            subtitle: "Make every celebration extra special",
            image: "https://images.unsplash.com/photo-1617033935328-fd23296de14a?q=80&w=600&auto=format&fit=crop", // Terracotta jewelry
            link: "/shop?category=handmade-jewellery"
        }
    ];

    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const { scrollLeft, clientWidth } = scrollContainerRef.current;
            const scrollTo = direction === 'left' ? scrollLeft - clientWidth : scrollLeft + clientWidth;
            scrollContainerRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
        }
    };

    return (
        <section className="py-12 md:py-16 bg-white overflow-hidden">
            <div className="container mx-auto px-4 max-w-[1240px]">
                
                {/* Title and Header Area */}
                <div className="flex flex-row items-center justify-between mb-8 pb-2 border-b border-gray-100">
                    <div className="flex flex-col md:flex-row md:items-baseline gap-1 md:gap-4">
                        <h2 className="text-xl md:text-3xl font-serif font-black text-[#2D1B4E]">
                            Made for Every Part of Your Life
                        </h2>
                        <span className="text-[11px] md:text-sm text-gray-500 font-medium">
                            Curated for your everyday moments
                        </span>
                    </div>
                    <Link 
                        to="/shop" 
                        className="text-xs md:text-sm font-bold text-[#8E2A8B] hover:text-[#72216F] transition-colors flex items-center gap-1 shrink-0"
                    >
                        View all
                        <ChevronRight size={16} />
                    </Link>
                </div>

                {/* Desktop View: Carousel with Navigation */}
                <div className="relative group/carousel hidden md:block">
                    {/* Navigation Buttons */}
                    <button
                        onClick={() => scroll('left')}
                        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-9 h-9 bg-white shadow-lg rounded-full flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-300 hover:bg-gray-50 border border-gray-100 hidden md:flex"
                    >
                        <ChevronLeft size={18} className="text-[#8E2A8B]" />
                    </button>
                    <button
                        onClick={() => scroll('right')}
                        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-9 h-9 bg-white shadow-lg rounded-full flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-300 hover:bg-gray-50 border border-gray-100 hidden md:flex"
                    >
                        <ChevronRight size={18} className="text-[#8E2A8B]" />
                    </button>

                    {/* Scrollable Row */}
                    <div
                        ref={scrollContainerRef}
                        className="flex overflow-x-auto no-scrollbar snap-x snap-mandatory gap-5 pb-4 scroll-smooth"
                    >
                        {items.map((item, index) => (
                            <Link 
                                key={index} 
                                to={item.link}
                                className="flex-shrink-0 w-[calc(20%-16px)] snap-start flex flex-col group/card"
                            >
                                <div className="bg-white rounded-[20px] overflow-hidden border border-gray-100 hover:border-gray-200/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] hover:shadow-[0_10px_30px_-5px_rgba(142,42,139,0.08)] transition-all duration-500 flex flex-col h-full">
                                    
                                    {/* Image Container */}
                                    <div className="relative aspect-square w-full overflow-hidden bg-gray-50">
                                        <img
                                            src={item.image}
                                            alt={item.title}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover/card:scale-105"
                                            loading="lazy"
                                        />
                                    </div>

                                    {/* Text Content */}
                                    <div className="p-5 flex flex-col flex-grow text-left">
                                        <h3 className="font-outfit font-bold text-[#8E2A8B] text-[15px] sm:text-base leading-tight mb-1.5 transition-colors">
                                            {item.title}
                                        </h3>
                                        <p className="text-gray-400 text-xs font-medium leading-relaxed">
                                            {item.subtitle}
                                        </p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Mobile View: Infinite Loop Running Carousel (Marquee Right-to-Left) */}
                <div className="relative overflow-hidden w-full md:hidden py-4 -mx-4 px-4">
                    {/* Edge shadow overlays */}
                    <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none"></div>
                    <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none"></div>

                    {/* Infinite Marquee flex container */}
                    <div className="flex animate-marquee gap-4 w-max">
                        {/* First Set of Items */}
                        {items.map((item, index) => (
                            <Link 
                                key={`set1-${index}`} 
                                to={item.link}
                                className="flex-shrink-0 w-[180px] flex flex-col"
                            >
                                <div className="bg-white rounded-[16px] overflow-hidden border border-gray-100 shadow-[0_4px_15px_-4px_rgba(0,0,0,0.03)] flex flex-col h-full">
                                    {/* Image */}
                                    <div className="relative aspect-square w-full overflow-hidden bg-gray-50">
                                        <img
                                            src={item.image}
                                            alt={item.title}
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                        />
                                    </div>

                                    {/* Content */}
                                    <div className="p-4 flex flex-col flex-grow text-left">
                                        <h3 className="font-outfit font-bold text-[#8E2A8B] text-[13px] leading-tight mb-1">
                                            {item.title}
                                        </h3>
                                        <p className="text-gray-400 text-[10px] font-medium leading-tight">
                                            {item.subtitle}
                                        </p>
                                    </div>
                                </div>
                            </Link>
                        ))}

                        {/* Second Set of Items for Infinite Scroll loop continuity */}
                        {items.map((item, index) => (
                            <Link 
                                key={`set2-${index}`} 
                                to={item.link}
                                className="flex-shrink-0 w-[180px] flex flex-col"
                            >
                                <div className="bg-white rounded-[16px] overflow-hidden border border-gray-100 shadow-[0_4px_15px_-4px_rgba(0,0,0,0.03)] flex flex-col h-full">
                                    {/* Image */}
                                    <div className="relative aspect-square w-full overflow-hidden bg-gray-50">
                                        <img
                                            src={item.image}
                                            alt={item.title}
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                        />
                                    </div>

                                    {/* Content */}
                                    <div className="p-4 flex flex-col flex-grow text-left">
                                        <h3 className="font-outfit font-bold text-[#8E2A8B] text-[13px] leading-tight mb-1">
                                            {item.title}
                                        </h3>
                                        <p className="text-gray-400 text-[10px] font-medium leading-tight">
                                            {item.subtitle}
                                        </p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>

            </div>
        </section>
    );
};

export default EverydayMoments;
