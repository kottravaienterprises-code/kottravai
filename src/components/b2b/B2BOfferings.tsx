import { Gift, Package, Building2, Store, Tag, Globe } from 'lucide-react';

const offerings = [
    {
        title: "Corporate Gifting",
        description: "Meaningful, handcrafted gifts for employees, clients, and special events. Designed to reflect your brand's purpose.",
        icon: Gift,
        color: "text-purple-600",
        bg: "bg-purple-50"
    },
    {
        title: "Bulk Orders",
        description: "Large volume procurement of sustainable products at wholesale pricing, without compromising on artisan quality.",
        icon: Package,
        color: "text-blue-600",
        bg: "bg-blue-50"
    },
    {
        title: "Hospitality / Hotels",
        description: "Eco-friendly amenities, room decor, and serving accessories crafted to elevate the guest experience.",
        icon: Building2,
        color: "text-emerald-600",
        bg: "bg-emerald-50"
    },
    {
        title: "Retail & Resellers",
        description: "Curate authentic, sustainable, and handcrafted collections for your retail store or boutique.",
        icon: Store,
        color: "text-orange-600",
        bg: "bg-orange-50"
    },
    {
        title: "Custom / Private Label",
        description: "Personalize products with your brand identity, logo engraving, or custom packaging solutions.",
        icon: Tag,
        color: "text-pink-600",
        bg: "bg-pink-50"
    },
    {
        title: "International / Export",
        description: "Reliable export of our handcrafted products for international buyers, ensuring quality and compliance.",
        icon: Globe,
        color: "text-cyan-600",
        bg: "bg-cyan-50"
    }
];

const B2BOfferings = () => {
    return (
        <section className="py-16 md:py-24 bg-white">
            <div className="container mx-auto px-4 max-w-7xl">
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-black text-[#2D1B4E] leading-tight font-outfit tracking-tighter mb-4">
                        What can <span className="text-[#8E2A8B]">businesses buy?</span>
                    </h2>
                    <p className="text-gray-500 text-lg font-medium max-w-2xl mx-auto">
                        Whether you are gifting a team of 10 or procuring for a hotel chain, our artisan-made products fit every scale and purpose.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {offerings.map((item, idx) => (
                        <div 
                            key={idx} 
                            className="bg-white border border-gray-100 rounded-2xl p-8 hover:shadow-xl hover:border-gray-200 transition-all duration-300 group"
                        >
                            <div className={`w-16 h-16 rounded-xl ${item.bg} ${item.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                                <item.icon size={32} strokeWidth={1.5} />
                            </div>
                            <h3 className="text-2xl font-bold text-[#2D1B4E] mb-3 font-outfit">{item.title}</h3>
                            <p className="text-gray-500 leading-relaxed font-medium text-sm">
                                {item.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default B2BOfferings;
