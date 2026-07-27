import { useState, FormEvent } from 'react';
import { Helmet } from 'react-helmet-async';
import MainLayout from '@/layouts/MainLayout';
import analytics from '@/utils/analyticsService';
import { captureLead } from '@/services/leadService';
import {
    Mail,
    Phone,
    MapPin,
    Send,
    Loader2,
    User,
    ChevronDown,
    Hash,
    MessageCircle,
    Leaf
} from 'lucide-react';
import axios from 'axios';
import { API_ENDPOINTS } from '@/config/api';
import { motion } from 'framer-motion';

const Contact = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        orderId: '',
        message: ''
    });
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setStatus('loading');

        try {
            await axios.post(API_ENDPOINTS.contact, {
                name: formData.name,
                email: formData.email,
                subject: formData.subject || `Contact from ${formData.name}`,
                message: `${formData.message}${formData.orderId ? `\n\nOrder ID: ${formData.orderId}` : ''}`
            });
            analytics.trackEvent('contact_form_submit', {
                contact_method: 'form',
                form_subject: formData.subject || `Contact from ${formData.name}`,
                order_id: formData.orderId || undefined
            });
            // 📋 Lead Capture — silent, non-blocking
            captureLead({
                name: formData.name,
                email: formData.email,
                source: 'contact_form',
                notes: `Subject: ${formData.subject}\n${formData.message}${formData.orderId ? `\nOrder ID: ${formData.orderId}` : ''}`,
            }).catch(() => {});
            setStatus('success');
            setFormData({ name: '', email: '', subject: '', orderId: '', message: '' });
            setTimeout(() => setStatus('idle'), 5000);
        } catch (error) {
            console.error('Failed to send message:', error);
            setStatus('error');
        }
    };

    const SectionDivider = () => (
        <div className="flex items-center gap-4 my-4 md:my-8">
            <div className="h-[1px] bg-gradient-to-r from-[#8E2A8B]/20 to-transparent flex-1"></div>
            <div className="text-[#8E2A8B] opacity-30">
                <Leaf size={14} fill="currentColor" />
            </div>
            <div className="h-[1px] bg-gradient-to-l from-[#8E2A8B]/20 to-transparent flex-1"></div>
        </div>
    );

    const fadeInUp = {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.6 }
    };

    return (
        <MainLayout>
            <Helmet>
                <title>Contact Us | Kottravai - Pure, Natural & Authentic</title>
                <meta name="description" content="Reach out to Kottravai for any inquiries about our natural products, order status, or wholesale opportunities." />
                <link rel="canonical" href={`${import.meta.env.VITE_SITE_URL || 'https://kottravai.com'}/contact`} />
                <meta property="og:title" content="Contact Us | Kottravai - Pure, Natural & Authentic" />
                <meta property="og:description" content="Reach out to Kottravai for any inquiries about our natural products, order status, or wholesale opportunities." />
                <meta property="og:url" content={`${import.meta.env.VITE_SITE_URL || 'https://kottravai.com'}/contact`} />
                <meta property="og:type" content="website" />
                <meta property="og:image" content={`${import.meta.env.VITE_SITE_URL || 'https://kottravai.com'}/contact-banner.jpeg`} />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content="Contact Us | Kottravai - Pure, Natural & Authentic" />
                <meta name="twitter:description" content="Reach out to Kottravai for any inquiries about our natural products, order status, or wholesale opportunities." />
                <meta name="twitter:image" content={`${import.meta.env.VITE_SITE_URL || 'https://kottravai.com'}/contact-banner.jpeg`} />
            </Helmet>

            <div className="bg-[#FAF9F6] min-h-screen pb-24 md:pb-12">

                {/* Full-Width Page Banner - Exact Image */}
                <div className="w-full relative overflow-hidden">
                    <img
                        src="/contact-banner.jpeg"
                        alt="Kottravai Contact Banner"
                        className="w-full h-auto block"
                    />
                </div>

                <div className="container mx-auto px-4 md:px-6 max-w-6xl mt-8">

                    <motion.div
                        variants={fadeInUp}
                        initial="initial"
                        animate="animate"
                        className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] overflow-hidden border border-white flex flex-col md:flex-row"
                    >

                        {/* Left Column: Form */}
                        <div className="w-full md:w-[60%] p-6 md:p-16 border-b md:border-b-0 md:border-r border-gray-50">
                            <h2 className="text-2xl md:text-3xl font-serif text-[#2D1B4E] mb-2">Send us a Message</h2>
                            <p className="text-sm text-gray-500 mb-6">Have a question? We'd love to hear from you.</p>
                            <SectionDivider />

                            <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                                    {/* Full Name */}
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-[#2D1B4E]/60 ml-1">
                                            Full Name <span className="text-rose-500">*</span>
                                        </label>
                                        <div className="relative group">
                                            <input
                                                type="text"
                                                required
                                                placeholder="Your name"
                                                className="w-full pl-5 pr-12 py-3.5 md:py-4 bg-gray-50 border border-transparent rounded-xl md:rounded-2xl focus:bg-white focus:border-[#8E2A8B]/30 focus:ring-4 focus:ring-[#8E2A8B]/5 outline-none transition-all font-medium text-[#2D1B4E]"
                                                value={formData.name}
                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            />
                                            <User size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#8E2A8B] transition-colors" />
                                        </div>
                                    </div>

                                    {/* Email Address */}
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-[#2D1B4E]/60 ml-1">
                                            Email Address <span className="text-rose-500">*</span>
                                        </label>
                                        <div className="relative group">
                                            <input
                                                type="email"
                                                required
                                                placeholder="Your email"
                                                className="w-full pl-5 pr-12 py-3.5 md:py-4 bg-gray-50 border border-transparent rounded-xl md:rounded-2xl focus:bg-white focus:border-[#8E2A8B]/30 focus:ring-4 focus:ring-[#8E2A8B]/5 outline-none transition-all font-medium text-[#2D1B4E]"
                                                value={formData.email}
                                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                            />
                                            <Mail size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#8E2A8B] transition-colors" />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                                    {/* Subject */}
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-[#2D1B4E]/60 ml-1">
                                            Subject <span className="text-rose-500">*</span>
                                        </label>
                                        <div className="relative group">
                                            <select
                                                required
                                                className="w-full pl-5 pr-12 py-3.5 md:py-4 bg-gray-50 border border-transparent rounded-xl md:rounded-2xl focus:bg-white focus:border-[#8E2A8B]/30 focus:ring-4 focus:ring-[#8E2A8B]/5 outline-none transition-all font-medium text-[#2D1B4E] appearance-none"
                                                value={formData.subject}
                                                onChange={e => setFormData({ ...formData, subject: e.target.value })}
                                            >
                                                <option value="">Select a subject</option>
                                                <option value="Order Status">Order Status</option>
                                                <option value="Product Inquiry">Product Inquiry</option>
                                                <option value="Customization">Customization</option>
                                                <option value="Bulk Order">Bulk Order</option>
                                                <option value="Feedback">Feedback</option>
                                                <option value="Others">Others</option>
                                            </select>
                                            <ChevronDown size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#8E2A8B] transition-colors pointer-events-none" />
                                        </div>
                                    </div>

                                    {/* Order ID */}
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-[#2D1B4E]/60 ml-1">
                                            Order ID <span className="text-gray-400 font-normal normal-case">(Optional)</span>
                                        </label>
                                        <div className="relative group">
                                            <input
                                                type="text"
                                                placeholder="Order number"
                                                className="w-full pl-5 pr-12 py-3.5 md:py-4 bg-gray-50 border border-transparent rounded-xl md:rounded-2xl focus:bg-white focus:border-[#8E2A8B]/30 focus:ring-4 focus:ring-[#8E2A8B]/5 outline-none transition-all font-medium text-[#2D1B4E]"
                                                value={formData.orderId}
                                                onChange={e => setFormData({ ...formData, orderId: e.target.value })}
                                            />
                                            <Hash size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#8E2A8B] transition-colors" />
                                        </div>
                                    </div>
                                </div>

                                {/* Message */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[#2D1B4E]/60 ml-1">
                                        Message <span className="text-rose-500">*</span>
                                    </label>
                                    <div className="relative group">
                                        <textarea
                                            required
                                            rows={4}
                                            placeholder="Write your message here..."
                                            className="w-full p-5 bg-gray-50 border border-transparent rounded-xl md:rounded-2xl focus:bg-white focus:border-[#8E2A8B]/30 focus:ring-4 focus:ring-[#8E2A8B]/5 outline-none transition-all font-medium text-[#2D1B4E] resize-none"
                                            value={formData.message}
                                            onChange={e => setFormData({ ...formData, message: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* Terms */}
                                <div className="flex items-center gap-3 py-2">
                                    <input
                                        type="checkbox"
                                        required
                                        id="terms"
                                        className="w-5 h-5 rounded border-gray-300 text-[#8E2A8B] focus:ring-[#8E2A8B]"
                                    />
                                    <label htmlFor="terms" className="text-xs font-medium text-gray-500 leading-tight">
                                        I agree to the <span className="text-[#8E2A8B] font-bold hover:underline cursor-pointer">Terms & Conditions</span> and <span className="text-[#8E2A8B] font-bold hover:underline cursor-pointer">Privacy Policy</span>
                                    </label>
                                </div>

                                <motion.button
                                    whileTap={{ scale: 0.98 }}
                                    type="submit"
                                    disabled={status === 'loading'}
                                    className="w-full bg-[#8E2A8B] hover:bg-[#72216F] text-white py-4 md:py-5 rounded-xl md:rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] md:text-xs transition-all shadow-xl shadow-purple-200 flex items-center justify-center gap-3 disabled:opacity-70"
                                >
                                    {status === 'loading' ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            Syncing Message...
                                        </>
                                    ) : (
                                        <>
                                            <Send size={18} />
                                            Send Message
                                        </>
                                    )}
                                </motion.button>

                                {status === 'success' && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="bg-emerald-50 text-emerald-700 p-4 rounded-xl md:rounded-2xl text-center text-[10px] font-black uppercase tracking-widest border border-emerald-100"
                                    >
                                        ✨ Message sent! We'll reply within 24 hours.
                                    </motion.div>
                                )}
                            </form>
                        </div>

                        {/* Right Column: Info */}
                        <div className="w-full md:w-[40%] bg-gray-50/80 p-6 md:p-16 flex flex-col justify-center border-t md:border-t-0">
                            <h2 className="text-2xl md:text-3xl font-serif text-[#2D1B4E] mb-2">Get in Touch</h2>
                            <p className="text-sm text-gray-500 mb-6">Choose your preferred way to reach us.</p>
                            <SectionDivider />

                            <div className="space-y-8 md:space-y-10 mt-4">
                                {/* Customer Care */}
                                <motion.div whileHover={{ x: 5 }} className="flex items-start gap-4 md:gap-5 group cursor-default">
                                    <div className="w-12 h-12 md:w-14 md:h-14 bg-[#8E2A8B]/10 rounded-2xl flex items-center justify-center text-[#8E2A8B] shadow-sm group-hover:bg-[#8E2A8B] group-hover:text-white transition-all duration-300 flex-shrink-0">
                                        <Phone size={22} className="md:w-6 md:h-6" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-[#2D1B4E] text-xs md:text-sm mb-1 uppercase tracking-wider opacity-60">Customer Care</h4>
                                        <p className="text-[#2D1B4E] font-black text-lg md:text-xl">+91 97870 30811</p>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Mon - Sat | 10 AM - 6 PM</p>
                                    </div>
                                </motion.div>

                                {/* Email Us */}
                                <motion.div whileHover={{ x: 5 }} className="flex items-start gap-4 md:gap-5 group cursor-default">
                                    <div className="w-12 h-12 md:w-14 md:h-14 bg-[#8E2A8B]/10 rounded-2xl flex items-center justify-center text-[#8E2A8B] shadow-sm group-hover:bg-[#8E2A8B] group-hover:text-white transition-all duration-300 flex-shrink-0">
                                        <Mail size={22} className="md:w-6 md:h-6" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-[#2D1B4E] text-xs md:text-sm mb-1 uppercase tracking-wider opacity-60">Email Us</h4>
                                        <p className="text-[#2D1B4E] font-black text-lg md:text-xl">customersupport@kottravai.in</p>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">We reply within 24 hours</p>
                                    </div>
                                </motion.div>

                                {/* WhatsApp */}
                                <motion.div whileHover={{ x: 5 }} className="flex items-start gap-4 md:gap-5 group cursor-default">
                                    <div className="w-12 h-12 md:w-14 md:h-14 bg-[#8E2A8B]/10 rounded-2xl flex items-center justify-center text-[#8E2A8B] shadow-sm group-hover:bg-[#8E2A8B] group-hover:text-white transition-all duration-300 flex-shrink-0">
                                        <MessageCircle size={22} className="md:w-6 md:h-6" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-[#2D1B4E] text-xs md:text-sm mb-1 uppercase tracking-wider opacity-60">WhatsApp</h4>
                                        <p className="text-[#2D1B4E] font-black text-lg md:text-xl">+91 88078 29183</p>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Chat with us directly</p>
                                    </div>
                                </motion.div>

                                {/* Address */}
                                <motion.div whileHover={{ x: 5 }} className="flex items-start gap-4 md:gap-5 group cursor-default">
                                    <div className="w-12 h-12 md:w-14 md:h-14 bg-[#8E2A8B]/10 rounded-2xl flex items-center justify-center text-[#8E2A8B] shadow-sm group-hover:bg-[#8E2A8B] group-hover:text-white transition-all duration-300 flex-shrink-0">
                                        <MapPin size={22} className="md:w-6 md:h-6" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-[#2D1B4E] text-xs md:text-sm mb-1 uppercase tracking-wider opacity-60">Address</h4>
                                        <p className="text-xs md:text-sm text-gray-600 leading-relaxed font-medium">
                                            KOTTRAVAI ENTERPRISES PVT LTD<br />
                                            Vazhai Incubator, S.V.C College<br />
                                            Puliyangudi - 627855<br />
                                            Tamil Nadu, India
                                        </p>
                                    </div>
                                </motion.div>
                            </div>
                        </div>
                    </motion.div>


                </div>
            </div>
        </MainLayout>
    );
};

export default Contact;
