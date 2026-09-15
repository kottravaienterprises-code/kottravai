import { MessageSquareText, FileText, CheckCircle, Hammer, Truck } from 'lucide-react';
import { motion } from 'framer-motion';

const steps = [
    {
        num: "01",
        title: "Tell us what you need",
        desc: "Share your requirements, quantities, and timelines with our team.",
        icon: MessageSquareText
    },
    {
        num: "02",
        title: "Receive catalogue & quote",
        desc: "We provide a curated catalogue and a detailed commercial quotation.",
        icon: FileText
    },
    {
        num: "03",
        title: "Approve samples",
        desc: "Review and approve physical samples or digital mockups of your order.",
        icon: CheckCircle
    },
    {
        num: "04",
        title: "Production",
        desc: "Our artisans handcraft your order with care and precision.",
        icon: Hammer
    },
    {
        num: "05",
        title: "Delivery",
        desc: "Safe, secure, and timely delivery to your specified locations.",
        icon: Truck
    }
];

const HowB2BWorks = () => {
    return (
        <section className="py-16 md:py-24 bg-[#F8F4FF] relative overflow-hidden">
            <div className="container mx-auto px-4 max-w-7xl relative z-10">
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-black text-[#2D1B4E] leading-tight font-outfit tracking-tighter mb-4">
                        How B2B <span className="text-[#8E2A8B]">Works</span>
                    </h2>
                    <p className="text-gray-600 text-lg font-medium max-w-2xl mx-auto">
                        A seamless, transparent, and professional process from your first inquiry to final delivery.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-6 relative">
                    {/* Background connecting line for desktop */}
                    <div className="hidden md:block absolute top-1/2 left-0 w-full h-[2px] bg-gray-200 -translate-y-1/2 z-0"></div>
                    
                    {steps.map((step, idx) => (
                        <motion.div 
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.1, duration: 0.4 }}
                            className="relative z-10 flex flex-col items-center text-center group"
                        >
                            {/* Connector for mobile */}
                            {idx < 4 && (
                                <div className="block md:hidden h-8 w-[2px] bg-gray-200 my-2"></div>
                            )}
                            
                            <div className="w-16 h-16 rounded-2xl bg-white border-2 border-gray-100 flex items-center justify-center text-[#8E2A8B] shadow-md group-hover:border-[#8E2A8B] group-hover:bg-[#8E2A8B] group-hover:text-white transition-all duration-300 relative z-10 mb-6">
                                <step.icon size={28} strokeWidth={1.5} />
                                <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-[#2D1B4E] text-white flex items-center justify-center text-xs font-black border-2 border-[#F8F4FF]">
                                    {step.num}
                                </div>
                            </div>
                            
                            <h3 className="text-lg font-bold text-[#2D1B4E] mb-2 font-outfit px-2">{step.title}</h3>
                            <p className="text-sm text-gray-500 font-medium px-2 leading-relaxed">{step.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default HowB2BWorks;
