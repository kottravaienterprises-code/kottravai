import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const features = [
    {
        id: 1,
        title: "Food made the Traditional Way",
        subtitle: "No Preservatives.\nJust Purity.",
        buttonText: "Shop Food Products",
        link: "/category/heritage-mixes",
        image: "/WhatsApp Image 2026-05-21 at 3.27.10 PM.jpeg",
    },
    {
        id: 2,
        title: "Handmade with Purpose & Love",
        subtitle: "Crafted by Skilled Artisans\nUsing Natural Materials.",
        buttonText: "Explore Collections",
        link: "/category/coconut-shell-products",
        image: "/cs.jpg",
    },
    {
        id: 3,
        title: "Hampers for Every Occasion",
        subtitle: "Thoughtful. Handmade.\nHeartfelt.",
        buttonText: "Shop Hampers",
        link: "/category/hampers",
        image: "/hampers.webp",
    }
];

const FeatureCards = () => {
    return (
        <section className="py-4 md:py-6 bg-white overflow-hidden">
            <div className="container mx-auto px-4 max-w-[1240px]">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {features.map((card, index) => (
                        <motion.div
                            key={card.id}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1, duration: 0.5 }}
                        >
                            <div className="relative rounded-2xl overflow-hidden bg-[#FCE5EE] flex flex-col gap-3 p-3 md:p-4 group">
                                <div className="relative z-10 w-full">
                                    <h2 className="text-xl md:text-[22px] font-semibold font-outfit leading-tight mb-1 md:mb-2 text-[#301646]">
                                        {card.title}
                                    </h2>
                                    <p className="font-medium text-[13px] md:text-sm leading-tight whitespace-pre-line mb-2 text-[#301646]">
                                        {card.subtitle}
                                    </p>
                                </div>

                                <div className="relative z-10">
                                    <Link
                                        to={card.link}
                                        className={`inline-flex items-center gap-2 px-2 py-1.5 rounded-lg font-bold text-xs shadow-[0_3px_10px_rgba(0,0,0,0.03)] transition-all bg-white/80 text-[#301646] hover:bg-white`}
                                    >
                                        {card.buttonText}
                                        <ArrowRight size={16} />
                                    </Link>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default FeatureCards;
