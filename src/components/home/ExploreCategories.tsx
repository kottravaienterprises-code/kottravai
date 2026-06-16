import { Link } from 'react-router-dom';
import { Leaf, Heart, Truck, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

const categories = [
    {
        id: 1,
        title: "Handmade Coconut Shell Products",
        image: "/cs.jpg",
        link: "/category/coconut-shell-products"
    },
    {
        id: 2,
        title: "Teracotta Jewellery",
        image: "/w5pt5wnue7-1778068003534-black_set_final_1_1.webp",
        link: "/category/handmade-jewellery"
    },
    {
        id: 3,
        title: "Handmade Woven Fiber Products",
        image: "/yhf2zsie9kp-1778313282517-Gemini_Generated_Image_25jjpm25jjpm25jj (1).webp",
        link: "/category/banana-fiber-products"
    },
    {
        id: 4,
        title: "Idly Podi",
        image: "/y6j712e3wbq-1777717294475-Gemini_Generated_Image_rwm9odrwm9odrwm9 (1).webp",
        link: "/category/heritage-mixes"
    },
    {
        id: 5,
        title: "Dosa Mix",
        image: "/vd13njgmplk-1778308551249-Gemini_Generated_Image_45cwzq45cwzq45cw (1).webp",
        link: "/category/instant-nourish"
    },
    {
        id: 6,
        title: "Essential Care – Soap",
        image: "/download_1.webp",
        link: "/category/essential-care"
    },
    {
        id: 7,
        title: "Hampers",
        image: "/hampers.webp",
        link: "/category/hampers"
    },
    {
        id: 8,
        title: "Instant Mix",
        image: "/Gemini_Generated_Image_qzi18xqzi18xqzi1.webp",
        link: "/category/masala-powders"
    }
];

const valueProps = [
    {
        title: "Natural & Handmade",
        subtitle: "Crafted with care",
        Icon: Leaf
    },
    {
        title: "Made with Love",
        subtitle: "From our hands to yours",
        Icon: Heart
    },
    {
        title: "Pan India Delivery",
        subtitle: "Fast & reliable shipping",
        Icon: Truck
    },
    {
        title: "Secure & Trusted",
        subtitle: "100% safe shopping",
        Icon: ShieldCheck
    }
];

const ExploreCategories = () => {
    return (
        <section className="pt-6 md:pt-8 pb-6 md:pb-8 bg-white overflow-hidden">
            <div className="container mx-auto px-4 max-w-[1240px]">
                {/* Standardized Header */}
                <div className="text-center mb-6">
                    <p className="text-[#8E2A8B] font-semibold text-xs md:text-sm tracking-wider mb-2">
                        Made with Love. Delivered with Care.
                    </p>
                    <h2 className="text-4xl md:text-5xl font-black text-[#2D1B4E] leading-tight font-outfit tracking-tighter">
                        Explore Our Categories
                    </h2>
                    <div className="w-16 h-1 bg-[#8E2A8B] mx-auto mt-3 rounded-full"></div>
                </div>

                {/* Categories Grid - Responsive Carousel on Mobile */}
                <div className="flex lg:grid lg:grid-cols-8 gap-4 px-4 md:px-2 overflow-x-auto lg:overflow-visible no-scrollbar snap-x snap-mandatory pb-6 -mx-4 lg:mx-0">
                    {categories.map((cat, index) => (
                        <motion.div
                            key={cat.id}
                            initial={{ opacity: 0, y: 15 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.05, duration: 0.4 }}
                            className="flex-shrink-0 w-[160px] sm:w-[190px] lg:w-auto snap-start"
                        >
                            <Link 
                                to={cat.link} 
                                className="group flex flex-col h-full bg-[#FAF4F7] rounded-xl p-4 border border-[#8E2A8B]/5 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(142,42,139,0.08)] hover:-translate-y-1"
                            >
                                {/* Image Area */}
                                <div className="aspect-[4/5] w-full rounded-xl overflow-hidden bg-white shadow-sm mb-4">
                                    <img 
                                        src={cat.image} 
                                        alt={cat.title}
                                        width={180}
                                        height={225}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                        loading="lazy"
                                    />
                                </div>
                                
                                {/* Content Area */}
                                <div className="flex flex-col items-center justify-between flex-grow text-center">
                                    <h3 className="text-[13px] font-black text-[#2D1B4E] leading-tight font-outfit group-hover:text-[#8E2A8B] transition-colors">
                                        {cat.title}
                                    </h3>
                                    <div className="w-6 h-[2px] bg-[#8E2A8B]/30 mt-3 rounded-full group-hover:bg-[#8E2A8B] transition-colors"></div>
                                </div>
                            </Link>
                        </motion.div>
                    ))}
                </div>

                {/* Value Props Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-4 md:mt-6 border-t border-gray-100 pt-4 md:pt-6 px-2">
                    {valueProps.map((prop, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 10 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1, duration: 0.4 }}
                            className="flex items-center gap-4 px-4 py-3 rounded-xl bg-gray-50/50 hover:bg-[#FAF4F7]/40 border border-transparent hover:border-[#8E2A8B]/5 transition-all duration-300"
                        >
                            <div className="w-12 h-12 rounded-full bg-[#FAF4F7] border border-[#8E2A8B]/10 flex items-center justify-center text-[#8E2A8B] shrink-0 shadow-sm">
                                <prop.Icon size={20} strokeWidth={2} />
                            </div>
                            <div className="flex flex-col text-left">
                                <span className="text-sm font-black text-[#2D1B4E] leading-snug">
                                    {prop.title}
                                </span>
                                <span className="text-[11px] text-gray-500 font-bold leading-normal mt-0.5">
                                    {prop.subtitle}
                                </span>
                            </div>
                        </motion.div>
                    ))}
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

export default ExploreCategories;
