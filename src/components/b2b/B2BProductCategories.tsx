import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const b2bCategories = [
    {
        id: 1,
        title: "Handmade Coconut Shell Products",
        description: "Eco-friendly serving ware and décor crafted from upcycled coconut shells.",
        image: "/cs.jpg",
    },
    {
        id: 7,
        title: "Corporate Hampers",
        description: "Curated artisan hampers tailored for festive gifting, events, and employee appreciation.",
        image: "/hampers.webp",
    },
    {
        id: 3,
        title: "Woven Fiber Products",
        description: "Sustainable banana fiber bags, organizers, and mats for hospitality and retail.",
        image: "/yhf2zsie9kp-1778313282517-Gemini_Generated_Image_25jjpm25jjpm25jj (1).webp",
    },
    {
        id: 2,
        title: "Terracotta Jewellery",
        description: "Unique, handcrafted clay jewellery ideal for boutique retail or cultural events.",
        image: "/w5pt5wnue7-1778068003534-black_set_final_1_1.webp",
    }
];

const B2BProductCategories = () => {
    const scrollToEnquiry = () => {
        const target = document.getElementById('b2b-enquiry');
        if (target) {
            // Optional: You could set the form state here if using a context, 
            // but scrolling smoothly to the form is the primary action.
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    return (
        <section className="py-16 md:py-24 bg-[#FAF4F7]">
            <div className="container mx-auto px-4 max-w-7xl">
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-black text-[#2D1B4E] leading-tight font-outfit tracking-tighter mb-4">
                        Curated for <span className="text-[#8E2A8B]">Business</span>
                    </h2>
                    <p className="text-gray-600 text-lg font-medium max-w-2xl mx-auto">
                        Explore our handcrafted, sustainable collections tailored for corporate gifting, hospitality, and retail bulk orders.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {b2bCategories.map((cat, index) => (
                        <motion.div
                            key={cat.id}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1, duration: 0.5 }}
                            className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 flex flex-col"
                        >
                            <div className="aspect-[4/3] w-full overflow-hidden bg-gray-100 relative">
                                <img 
                                    src={cat.image} 
                                    alt={cat.title}
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                    loading="lazy"
                                />
                                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors"></div>
                            </div>
                            
                            <div className="p-6 md:p-8 flex flex-col flex-grow">
                                <h3 className="text-xl font-bold text-[#2D1B4E] mb-3 font-outfit">
                                    {cat.title}
                                </h3>
                                <p className="text-gray-500 font-medium text-sm leading-relaxed mb-6 flex-grow">
                                    {cat.description}
                                </p>
                                
                                <button 
                                    onClick={scrollToEnquiry}
                                    className="inline-flex items-center justify-between w-full bg-[#F8F4FF] hover:bg-[#8E2A8B] text-[#8E2A8B] hover:text-white px-5 py-3 rounded-xl font-bold text-sm transition-colors group/btn"
                                >
                                    <span>Enquire for Bulk</span>
                                    <ArrowRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default B2BProductCategories;
