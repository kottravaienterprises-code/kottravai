import { FileText, MessageSquare, CheckCircle2 } from 'lucide-react';

const CorporateGiftingCatalogue = () => {
    const scrollToEnquiry = () => {
        const target = document.getElementById('b2b-enquiry');
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const highlights = [
        {
            title: 'Handcrafted Collections',
            desc: 'Unique products made with traditional craftsmanship and natural materials.',
        },
        {
            title: 'Corporate Gift Sets',
            desc: 'Curated combinations designed for employee, client, partner, and festive gifting.',
        },
        {
            title: 'Custom Branding',
            desc: 'Add your company identity through customised packaging, branding, or product requirements where applicable.',
        },
        {
            title: 'Bulk & Large Orders',
            desc: 'Flexible solutions for corporate requirements, events, celebrations, and employee gifting programs.',
        },
        {
            title: 'Sustainable Choices',
            desc: 'Meaningful products that bring together traditional craftsmanship, natural materials, and responsible gifting.',
        },
    ];

    return (
        <section className="py-20 md:py-28 bg-[#FCFAFF]">
            <div className="container mx-auto px-4 max-w-7xl">
                <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center mb-16">
                    {/* Content Left */}
                    <div className="flex flex-col">
                        <div className="inline-flex items-center gap-2 text-[#8E2A8B] font-bold text-sm tracking-widest uppercase mb-4">
                            Diwali Gifting Catalogue
                        </div>
                        
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[#2D1B4E] leading-tight mb-6 font-outfit">
                            Thoughtful Gifts for Meaningful Business Relationships
                        </h2>
                        
                        <p className="text-gray-600 text-lg leading-relaxed mb-6">
                            Explore our curated corporate gifting catalogue featuring handcrafted, sustainable, and culturally inspired products from Kottravai. From employee appreciation and festive gifting to client relationships and bulk corporate orders, our collection offers thoughtful gifting options for every occasion.
                        </p>
                        
                        <p className="text-gray-600 leading-relaxed mb-8">
                            Choose from ready-to-order products or work with our team to create a customised gifting solution based on your budget, quantity, occasion, and branding requirements.
                        </p>
                        
                        <div className="flex flex-col sm:flex-row items-center gap-4">
                            <a 
                                href="/diwali-gifting-catalogue.pdf"
                                target="_blank"
                                rel="noopener noreferrer"
                                download="Diwali-Gifting-Catalogue.pdf"
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#8E2A8B] hover:bg-[#6D1E6A] text-white px-8 py-4 rounded-xl font-bold text-sm tracking-wide transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                            >
                                <FileText size={18} />
                                Download Diwali Gifting Catalogue
                            </a>
                            <button 
                                onClick={scrollToEnquiry}
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white text-[#2D1B4E] border border-gray-200 hover:border-[#8E2A8B] hover:text-[#8E2A8B] px-8 py-4 rounded-xl font-bold text-sm tracking-wide transition-all shadow-sm hover:shadow-md"
                            >
                                <MessageSquare size={18} />
                                Request a Custom Quote
                            </button>
                        </div>
                    </div>

                    {/* Image Right */}
                    <div className="relative group">
                        {/* Decorative Background */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-[#8E2A8B]/10 to-[#2D1B4E]/10 rounded-2xl transform translate-x-4 translate-y-4 -z-10 transition-transform group-hover:translate-x-6 group-hover:translate-y-6" />
                        
                        <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-white border border-gray-100 p-2">
                            <img 
                                src="/catalog/catalog_preview.png"
                                alt="Corporate Gifting Catalogue Preview" 
                                className="w-full h-auto rounded-xl object-cover transform transition-transform duration-700 group-hover:scale-[1.02]"
                                onError={(e) => { e.currentTarget.src = '/b2b-corporate-gifting.webp' }}
                            />
                        </div>
                    </div>
                </div>

                {/* Highlights Bottom */}
                <div className="bg-white rounded-2xl p-8 md:p-10 shadow-sm border border-gray-100">
                    <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-8">
                        {highlights.map((item, idx) => (
                            <div key={idx} className="flex flex-col gap-3">
                                <div className="text-[#8E2A8B]">
                                    <CheckCircle2 size={24} />
                                </div>
                                <h3 className="font-bold text-[#2D1B4E] text-base">{item.title}</h3>
                                <p className="text-gray-500 text-sm leading-relaxed">
                                    {item.desc}
                                </p>
                            </div>
                        ))}
                    </div>
                    
                    <div className="mt-12 pt-8 border-t border-gray-100 text-center">
                        <p className="text-gray-500 italic font-medium">
                            Made with care. Gifted with purpose. Created to leave a lasting impression.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default CorporateGiftingCatalogue;
