import { Leaf, HandMetal, Factory, PenTool, Tag, HeartHandshake } from 'lucide-react';
import { motion } from 'framer-motion';

const reasons = [
    {
        title: "Handcrafted",
        description: "Authentic, artisanal products made by skilled hands, preserving traditional techniques.",
        icon: HandMetal,
    },
    {
        title: "Sustainable Materials",
        description: "Eco-friendly resources like banana fiber and coconut shell, minimizing environmental impact.",
        icon: Leaf,
    },
    {
        title: "Bulk Production",
        description: "Scalable manufacturing capabilities designed to handle large corporate and wholesale orders.",
        icon: Factory,
    },
    {
        title: "Customisation",
        description: "Tailored designs, packaging, and specific product variations to meet your exact needs.",
        icon: PenTool,
    },
    {
        title: "Private Labelling",
        description: "Add your brand's logo and identity to our products for a seamless corporate gifting experience.",
        icon: Tag,
    },
    {
        title: "Social Impact",
        description: "Every purchase directly empowers rural women artisans and creates dignified livelihoods.",
        icon: HeartHandshake,
    }
];

const WhyKottravaiB2B = () => {
    return (
        <section className="py-16 md:py-24 bg-white">
            <div className="container mx-auto px-4 max-w-7xl">
                <div className="flex flex-col md:flex-row gap-12 md:gap-16 items-center">
                    <div className="w-full md:w-1/3">
                        <div className="inline-flex items-center gap-2 bg-[#8E2A8B]/10 text-[#8E2A8B] px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-6">
                            The Kottravai Difference
                        </div>
                        <h2 className="text-4xl md:text-5xl font-black text-[#2D1B4E] leading-tight font-outfit tracking-tighter mb-6">
                            Why <span className="text-[#8E2A8B]">Kottravai?</span>
                        </h2>
                        <p className="text-gray-500 font-medium leading-relaxed mb-8">
                            We bridge the gap between authentic rural craftsmanship and modern business needs, ensuring quality, scale, and deep social impact in every order.
                        </p>
                    </div>

                    <div className="w-full md:w-2/3 grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {reasons.map((item, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, x: 20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1, duration: 0.4 }}
                                className="flex items-start gap-5 p-6 rounded-2xl bg-gray-50 hover:bg-[#F8F4FF] border border-gray-100 hover:border-[#8E2A8B]/20 transition-colors"
                            >
                                <div className="w-12 h-12 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-[#8E2A8B] shrink-0 shadow-sm">
                                    <item.icon size={24} strokeWidth={1.5} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-[#2D1B4E] mb-2 font-outfit">{item.title}</h3>
                                    <p className="text-sm text-gray-500 font-medium leading-relaxed">{item.description}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default WhyKottravaiB2B;
