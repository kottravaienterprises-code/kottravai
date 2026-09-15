import { Quote } from 'lucide-react';

const B2BImpact = () => {
    return (
        <section className="py-20 md:py-32 bg-[#2D1B4E] relative overflow-hidden text-center flex items-center justify-center">
            {/* Background elements */}
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none" 
                 style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #8E2A8B 0%, transparent 50%), radial-gradient(circle at 80% 80%, #8E2A8B 0%, transparent 50%)' }}>
            </div>
            
            <div className="container mx-auto px-4 max-w-4xl relative z-10">
                <Quote size={48} className="text-[#8E2A8B] mx-auto mb-8 opacity-50" />
                <h2 className="text-3xl md:text-5xl lg:text-6xl font-black text-white leading-tight font-outfit tracking-tighter mb-8">
                    "Every business order helps create <span className="text-[#8E2A8B]">dignified livelihoods</span> for rural women."
                </h2>
                <div className="w-16 h-1 bg-[#8E2A8B] mx-auto rounded-full"></div>
            </div>
        </section>
    );
};

export default B2BImpact;
