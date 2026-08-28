import { useState, FormEvent } from 'react';
import { Helmet } from 'react-helmet-async';
import MainLayout from '@/layouts/MainLayout';
import { Leaf, Gift, FileText, Send, Building2, UserCheck, Briefcase, ChevronRight, Palmtree, Sparkles } from 'lucide-react';
import { captureLead } from '@/services/leadService';
import { useReviews } from '@/context/ReviewContext';
import HampersRow from '@/components/home/HampersRow';
import ExploreCategories from '@/components/home/ExploreCategories';
import PartnerSection from '@/components/home/PartnerSection';
import WhyGiftWithUs from '@/components/home/WhyGiftWithUs';
import TrustedBySection from '@/components/home/TrustedBySection';
import TestimonialsB2B from '@/components/home/TestimonialsB2B';
import FriendsModal from '@/components/FriendsModal';
import B2BSolutions from '@/components/home/B2BSolutions';

const B2B = () => {
    const { getReviewsByPage } = useReviews();
    getReviewsByPage('b2b'); // Called to keep behavior if any, but removed unused assignment

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        company: '',
        location: '',
        products: '',
        quantity: '',
        notes: ''
    });

    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const [isFriendsModalOpen, setIsFriendsModalOpen] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setStatus('idle');
        setMessage('');

        try {
            const response = await fetch('/api/b2b-inquiry', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (response.ok) {
                setStatus('success');
                setMessage('Thank you! We received your inquiry and will contact you soon.');
                // 📋 Lead Capture — silent, non-blocking, AI classifies based on products + notes
                captureLead({
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone,
                    company_name: formData.company,
                    source: 'b2b_inquiry',
                    notes: `Products: ${formData.products}. Quantity: ${formData.quantity}. Location: ${formData.location}. Notes: ${formData.notes}`,
                }).catch(() => {});
                setFormData({
                    name: '', email: '', phone: '', company: '',
                    location: '', products: '', quantity: '', notes: ''
                });
            } else {
                setStatus('error');
                setMessage(result.message || 'Something went wrong. Please try again.');
            }
        } catch (error) {
            console.error('Submission Error:', error);
            setStatus('error');
            setMessage('Failed to submit form. Please check your connection.');
        }
    };

    const scrollToForm = () => {
        document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <MainLayout>
            <Helmet>
                <title>B2B & Corporate Gifting - Kottravai</title>
                <meta name="description" content="Sustainable, ethical, and handcrafted corporate gifts that empower rural women artisans." />
                <link rel="canonical" href={`${import.meta.env.VITE_SITE_URL || 'https://www.kottravai.in'}/b2b`} />
                <meta property="og:title" content="B2B & Corporate Gifting - Kottravai" />
                <meta property="og:description" content="Sustainable, ethical, and handcrafted corporate gifts that empower rural women artisans." />
                <meta property="og:url" content={`${import.meta.env.VITE_SITE_URL || 'https://www.kottravai.in'}/b2b`} />
                <meta property="og:type" content="website" />
                <meta property="og:image" content={`${import.meta.env.VITE_SITE_URL || 'https://www.kottravai.in'}/b2b-corporate-gifting.webp`} />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content="B2B & Corporate Gifting - Kottravai" />
                <meta name="twitter:description" content="Sustainable, ethical, and handcrafted corporate gifts that empower rural women artisans." />
                <meta name="twitter:image" content={`${import.meta.env.VITE_SITE_URL || 'https://www.kottravai.in'}/b2b-corporate-gifting.webp`} />
            </Helmet>


            {/* 1. Icons */}
            <PartnerSection />

            {/* 3. Hampers Row */}
            <HampersRow showEnquiry={true} onEnquiry={scrollToForm} />
            
            {/* NEW: Scenario-based Solutions */}
            <B2BSolutions />
            
            {/* 2. Why Gift With Kottravai */}
            <WhyGiftWithUs />

            {/* 4. Explore Our Products (Categories + Catalog) */}
            <ExploreCategories />

            <section className="py-6 md:py-10 bg-white relative overflow-hidden text-[#8E2A8B]">
                {/* Decorative background accents */}
                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 opacity-[0.05] pointer-events-none">
                    <Palmtree size={600} className="text-[#8E2A8B]" />
                </div>
                <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 opacity-[0.05] pointer-events-none origin-center rotate-45">
                    <Leaf size={400} className="text-[#8E2A8B]" />
                </div>

                <div className="container mx-auto px-4 max-w-6xl relative z-10">
                    <div className="flex flex-col items-center justify-center text-center">
                        {/* Text Content */}
                        <div className="w-full max-w-4xl mx-auto">
                            <div className="inline-flex items-center gap-2 bg-[#8E2A8B]/10 text-[#8E2A8B] px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest mb-4">
                                <Sparkles size={14} /> Wholesale & Bulk Orders
                            </div>
                            <h2 className="text-4xl md:text-5xl lg:text-7xl font-bold text-[#8E2A8B] mb-4 leading-tight tracking-tight">
                                Our Product <span className="text-[#B5128F]">Catalog</span>
                            </h2>
                            <p className="text-[#8E2A8B]/70 mb-6 text-lg md:text-xl max-w-3xl mx-auto leading-relaxed font-light">
                                Discover our full curation of handcrafted, earth-friendly creations across Banana Fiber, Coconut Shell, and Artisanal collections. Find the perfect pieces for your bulk or corporate gifting needs.
                            </p>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                                {/* Banana Fiber */}
                                <a
                                    href="/catalog/Banana Fiber catalog.pdf"
                                    download="Kottravai-Banana-Fiber-catalog.pdf"
                                    className="flex flex-col items-center justify-center p-4 md:p-6 bg-[#8E2A8B] text-white rounded-xl font-bold hover:bg-[#6D1E6A] hover:scale-105 transition-all shadow-xl group text-center"
                                >
                                    <FileText size={32} className="mb-2 md:mb-3 group-hover:rotate-12 transition-transform" />
                                    <span className="text-xs md:text-sm leading-tight">Banana Fiber <br className="hidden md:block" /> Catalog</span>
                                </a>

                                {/* Coconut Shell */}
                                <a
                                    href="/catalog/coconut shell catalouge.pdf"
                                    download="Kottravai-Coconut-Shell-Catalog.pdf"
                                    className="flex flex-col items-center justify-center p-4 md:p-6 bg-white text-[#8E2A8B] border-2 border-[#8E2A8B] rounded-xl font-bold hover:bg-[#8E2A8B] hover:text-white hover:scale-105 transition-all shadow-md group text-center"
                                >
                                    <FileText size={32} className="mb-2 md:mb-3 group-hover:rotate-12 transition-transform" />
                                    <span className="text-xs md:text-sm leading-tight">Coconut Shell <br className="hidden md:block" /> Catalog</span>
                                </a>

                                {/* Terracotta */}
                                <a
                                    href="/catalog/Terracotta. Catalouge..1.pdf"
                                    download="Kottravai-Terracotta-Catalog.pdf"
                                    className="flex flex-col items-center justify-center p-4 md:p-6 bg-white text-[#8E2A8B] border-2 border-[#8E2A8B] rounded-xl font-bold hover:bg-[#8E2A8B] hover:text-white hover:scale-105 transition-all shadow-md group text-center"
                                >
                                    <FileText size={32} className="mb-2 md:mb-3 group-hover:rotate-12 transition-transform" />
                                    <span className="text-xs md:text-sm leading-tight">Terracotta <br className="hidden md:block" /> Catalog</span>
                                </a>

                                {/* Heritage Mix */}
                                <a
                                    href="/catalog/kottaravai  Heritage mix catalogue.pdf"
                                    download="Kottravai-Heritage-Mix-Catalog.pdf"
                                    className="flex flex-col items-center justify-center p-4 md:p-6 bg-white text-[#8E2A8B] border-2 border-[#8E2A8B] rounded-xl font-bold hover:bg-[#8E2A8B] hover:text-white hover:scale-105 transition-all shadow-md group text-center"
                                >
                                    <FileText size={32} className="mb-2 md:mb-3 group-hover:rotate-12 transition-transform" />
                                    <span className="text-xs md:text-sm leading-tight">Heritage Mix <br className="hidden md:block" /> Catalog</span>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </section>



            {/* 5. From Concept to Connection (How We Work) */}
            <section className="py-6 md:py-10 bg-white relative overflow-hidden" id="how-we-work">
                <div className="container mx-auto px-4 max-w-7xl">
                    <div className="text-center mb-8">
                        <div className="flex items-center justify-center gap-4 mb-2">
                            <span className="text-[#8E2A8B] font-bold tracking-[0.3em] uppercase text-[10px]">Our Simple 5-Step Process</span>
                        </div>
                        <h2 className="text-4xl md:text-6xl font-black text-[#2D1B4E] leading-[1.1] mb-4 font-outfit tracking-tighter">
                            From Concept to Connection, <br className="hidden md:block" />
                            We <span className="text-[#8E2A8B]">Handle It All.</span>
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 relative">
                        {[
                            {
                                step: "01",
                                title: "Connect",
                                desc: "Share your requirements, occasion, theme, quantity and budget. We're here to understand your goals.",
                                img: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=500&auto=format&fit=crop",
                                bg: "bg-[#F8F4FF]",
                                accent: "text-[#6B4D91]"
                            },
                            {
                                step: "02",
                                title: "Curate",
                                desc: "We curate the perfect gift options or build a custom gift theme that matches your purpose and audience.",
                                img: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?q=80&w=500&auto=format&fit=crop",
                                bg: "bg-[#FFF9F2]",
                                accent: "text-[#D97706]"
                            },
                            {
                                step: "03",
                                title: "Branding",
                                desc: "Add your logo, personalized notes, and custom inserts to create a memorable brand experience.",
                                img: "https://images.unsplash.com/photo-1607344645866-009c320b63e0?q=80&w=500&auto=format&fit=crop",
                                bg: "bg-[#F0F7FF]",
                                accent: "text-[#2563EB]"
                            },
                            {
                                step: "04",
                                title: "Delivery",
                                desc: "We handle all logistics and ensure your gifts are delivered safely and on time, every time.",
                                img: "https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?q=80&w=500&auto=format&fit=crop",
                                bg: "bg-[#F2FFF9]",
                                accent: "text-[#059669]"
                            },
                            {
                                step: "05",
                                title: "Report",
                                desc: "Receive an impact report with key insights and feedback to measure the success of your gifting.",
                                img: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=500&auto=format&fit=crop",
                                bg: "bg-[#F5F3FF]",
                                accent: "text-[#4F46E5]"
                            }
                        ].map((item, idx) => (
                            <div key={idx} className="relative z-10 group">
                                <div className={`${item.bg} rounded-xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.02)] border border-white h-full flex flex-col transition-all duration-500 hover:-translate-y-2 hover:shadow-xl`}>
                                    {/* Image Part */}
                                    <div className="p-4 pb-0">
                                        <div className="flex justify-between items-center mb-4">
                                            <span className={`text-sm font-bold tracking-widest ${item.accent}`}>{item.step}</span>
                                            <div className="w-12 h-px bg-gray-200"></div>
                                        </div>
                                        <div className="h-48 md:h-56 rounded-lg overflow-hidden relative shadow-sm border border-white">
                                            <img 
                                                src={item.img} 
                                                alt={item.title}
                                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                            />
                                            <div className="absolute inset-0 bg-black/5"></div>
                                        </div>
                                    </div>

                                    {/* Text Content */}
                                    <div className="p-6 flex flex-col flex-grow">
                                        <h3 className="text-xl font-bold text-[#2D1B4E] mb-3 font-outfit">{item.title}</h3>
                                        <p className="text-gray-500 text-[11px] leading-relaxed font-medium">
                                            {item.desc}
                                        </p>
                                    </div>
                                </div>
                                
                                {/* Connector Arrow (Desktop) */}
                                {idx < 4 && (
                                    <div className="hidden lg:flex absolute top-1/2 -right-4 translate-y-12 z-20 w-8 h-8 rounded-full bg-white shadow-md items-center justify-center text-[#8E2A8B] border border-gray-50">
                                        <ChevronRight size={14} strokeWidth={3} />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Footer Info Bar - Premium Styled */}
                    <div className="mt-6 bg-white border border-gray-100 rounded-full py-6 px-12 flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_10px_40px_rgba(0,0,0,0.03)] max-w-6xl mx-auto">
                        <div className="flex items-center gap-4">
                            <span className="text-[#2D1B4E] font-black text-base tracking-tight">Thoughtful Gifting. Meaningful Impact.</span>
                        </div>
                        <div className="h-8 w-px bg-gray-100 hidden md:block"></div>
                        <div className="text-gray-400 text-[13px] font-medium leading-relaxed max-w-xl text-center md:text-left">
                            We don't just send gifts—we build relationships and leave a lasting impression.
                        </div>
                    </div>
                </div>
            </section>

            {/* 6. Trusted By */}
            <TrustedBySection />
            
            {/* 7. B2B Clients (Testimonials) */}
            <TestimonialsB2B />

            {/* 8. For Companies That Value People (Professional Partnerships) */}
            {/* 9. Partner With Kottravai (CTA included here) */}
            <section className="py-6 md:py-10 bg-white relative overflow-hidden">
                <div className="container mx-auto px-4 max-w-7xl">
                    <div className="flex flex-col lg:flex-row items-center gap-12">
                        {/* Left Column: Narrative */}
                        <div className="lg:w-1/2 text-left">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-1 h-6 bg-[#8E2A8B]"></div>
                                <span className="text-[#8E2A8B] text-[11px] font-black uppercase tracking-[0.2em]">Professional Partnerships</span>
                            </div>
                            
                            <h2 className="text-6xl md:text-7xl font-black text-[#2D1B4E] leading-[1] mb-4 font-outfit tracking-tighter">
                                For Companies <br />
                                That Value <br />
                                <span className="text-[#8E2A8B]">People</span>
                            </h2>
                            
                            <div className="w-16 h-1 bg-[#8E2A8B]/30 mb-4 rounded-full"></div>
                            
                            <p className="text-gray-500 text-xl leading-relaxed mb-6 max-w-md font-medium">
                                Purpose-driven gifting designed to strengthen culture, leadership, and belonging across teams.
                            </p>
                            
                            <button 
                                onClick={() => setIsFriendsModalOpen(true)}
                                className="inline-flex items-center gap-4 bg-[#8E2A8B] hover:bg-[#6d1e6a] text-white px-10 py-5 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-[#8E2A8B]/20 hover:-translate-y-1 group"
                            >
                                Partner With Kottravai
                                <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>

                        {/* Right Column: List Items */}
                        <div className="lg:w-1/2 flex flex-col relative">
                            {/* Vertical line connector */}
                            <div className="absolute left-10 top-0 bottom-0 w-px bg-gray-100 hidden md:block"></div>

                            {[
                                { 
                                    icon: Building2, 
                                    title: "DEI & Social Responsibility", 
                                    desc: "Gifts that reflect purpose, equity & meaningful impact.",
                                    iconColor: "text-purple-600",
                                    iconBg: "bg-purple-50"
                                },
                                { 
                                    icon: UserCheck, 
                                    title: "Authentic Leadership", 
                                    desc: "Human-centered gifting that strengthens workplace culture.",
                                    iconColor: "text-orange-600",
                                    iconBg: "bg-orange-50"
                                },
                                { 
                                    icon: Briefcase, 
                                    title: "Human Narrative", 
                                    desc: "Gifts that express identity and create emotional resonance.",
                                    iconColor: "text-blue-600",
                                    iconBg: "bg-blue-50"
                                },
                                { 
                                    icon: Gift, 
                                    title: "Culture & Craftsmanship", 
                                    desc: "Appreciation rooted in heritage and artisan-made products.",
                                    iconColor: "text-emerald-600",
                                    iconBg: "bg-emerald-50"
                                }
                            ].map((item, idx) => (
                                <div key={idx} className={`flex items-start gap-8 py-5 md:py-6 ${idx !== 3 ? 'border-b border-gray-100' : ''} group relative z-10`}>
                                    <div className={`w-20 h-20 rounded-full ${item.iconBg} flex items-center justify-center ${item.iconColor} shrink-0 shadow-sm transition-all duration-500 group-hover:scale-110`}>
                                        <item.icon size={28} strokeWidth={1.5} />
                                    </div>
                                    <div className="pt-2">
                                        <h3 className="text-xl font-bold text-[#2D1B4E] mb-2 font-outfit">{item.title}</h3>
                                        <p className="text-gray-400 text-sm font-medium max-w-sm leading-relaxed">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* 10. Partner With Us (Contact Form) */}
            <section className="py-6 md:py-10 bg-gray-50" id="contact-form">
                <div className="container mx-auto px-4">
                    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-xl overflow-hidden flex flex-col md:flex-row">
                        <div className="md:w-1/3 bg-[#2D1B4E] text-white p-10 flex flex-col justify-between">
                            <div>
                                <h3 className="text-2xl font-bold mb-4">Partner With Us</h3>
                                <p className="text-white/80 mb-8 leading-relaxed">Let's create something meaningful together. Fill out the form and our team will reach out within 24 hours.</p>
                            </div>
                            <div className="space-y-4 text-sm text-white/70">
                                <p>Email: b2b@kottravai.in</p>
                                <p>Phone: +91 97870 30811</p>
                            </div>
                        </div>
                        <div className="md:w-2/3 p-10">
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid md:grid-cols-2 gap-4">
                                    <input
                                        type="text" placeholder="Contact Name *" required
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#8E2A8B]"
                                        value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                    <input
                                        type="email" placeholder="Email Address *" required
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#8E2A8B]"
                                        value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <input
                                        type="tel" placeholder="Phone Number *" required
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#8E2A8B]"
                                        value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                    <input
                                        type="text" placeholder="Business / Store Name"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#8E2A8B]"
                                        value={formData.company} onChange={e => setFormData({ ...formData, company: e.target.value })}
                                    />
                                </div>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <input
                                        type="text" placeholder="Products Interested In *" required
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#8E2A8B]"
                                        value={formData.products} onChange={e => setFormData({ ...formData, products: e.target.value })}
                                    />
                                    <input
                                        type="text" placeholder="Approx Order Quantity *" required
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#8E2A8B]"
                                        value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                                    />
                                </div>
                                <input
                                    type="text" placeholder="Location *" required
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#8E2A8B]"
                                    value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })}
                                />
                                <textarea
                                    rows={3} placeholder="Additional Notes"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#8E2A8B]"
                                    value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                ></textarea>

                                <button type="submit" className="w-full bg-[#8E2A8B] text-white font-bold py-4 rounded-xl hover:bg-[#6d1e6a] transition flex items-center justify-center gap-2">
                                    <Send size={18} /> Submit Inquiry
                                </button>
                                {message && (
                                    <p className={`text-center text-sm ${status === 'error' ? 'text-red-600' : 'text-green-600'}`}>
                                        {message}
                                    </p>
                                )}
                            </form>
                        </div>
                    </div>
                </div>
            </section>

            <FriendsModal 
                isOpen={isFriendsModalOpen} 
                onClose={() => setIsFriendsModalOpen(false)} 
            />
        </MainLayout>
    );
};

export default B2B;


