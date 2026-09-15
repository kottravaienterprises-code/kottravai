import { ChevronDown, ArrowRight } from 'lucide-react';

const B2BHero = () => {
    const scrollToEnquiry = () => {
        const target = document.getElementById('b2b-enquiry');
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const scrollToContact = () => {
        const target = document.getElementById('b2b-direct-contact');
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    return (
        <section className="relative pt-24 pb-20 md:pt-32 md:pb-28 bg-[#F8F4FF] overflow-hidden">
            <div className="absolute top-0 right-0 translate-x-1/3 -translate-y-1/4 w-[500px] h-[500px] bg-[#8E2A8B]/5 rounded-full blur-[80px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 -translate-x-1/3 translate-y-1/4 w-[400px] h-[400px] bg-[#2D1B4E]/5 rounded-full blur-[80px] pointer-events-none" />
            
            <div className="container mx-auto px-4 max-w-6xl relative z-10">
                <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
                    <div className="inline-flex items-center gap-2 bg-[#8E2A8B]/10 text-[#8E2A8B] px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest mb-6">
                        Corporate Partnerships
                    </div>
                    
                    <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-[#2D1B4E] leading-[1.1] mb-6 font-outfit tracking-tighter">
                        Purposeful Products. <br className="hidden md:block" />
                        <span className="text-[#8E2A8B]">Meaningful Partnerships.</span>
                    </h1>
                    
                    <p className="text-gray-600 text-lg md:text-xl leading-relaxed mb-10 max-w-2xl font-medium">
                        Sustainable products handcrafted by rural women artisans, curated perfectly for businesses, corporate gifting, hospitality, and bulk procurement.
                    </p>
                    
                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                        <button 
                            onClick={scrollToEnquiry}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#8E2A8B] hover:bg-[#6D1E6A] text-white px-8 py-4 rounded-xl font-bold text-sm tracking-wide transition-all shadow-xl shadow-[#8E2A8B]/20 hover:-translate-y-1"
                        >
                            Request B2B Catalogue
                            <ArrowRight size={18} />
                        </button>
                        <button 
                            onClick={scrollToContact}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white text-[#2D1B4E] border border-gray-200 hover:border-[#8E2A8B] hover:text-[#8E2A8B] px-8 py-4 rounded-xl font-bold text-sm tracking-wide transition-all shadow-sm hover:shadow-md"
                        >
                            Talk to Our Team
                        </button>
                    </div>
                </div>
            </div>
            
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 animate-bounce hidden md:block">
                <ChevronDown size={24} className="text-[#8E2A8B]/50" />
            </div>
        </section>
    );
};

export default B2BHero;
