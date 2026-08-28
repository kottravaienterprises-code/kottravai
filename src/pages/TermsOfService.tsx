
import { 
    FileText, 
    ShieldCheck, 
    Scale, 
    Copyright, 
    Phone, 
    Mail, 
    MessageCircle,
    Monitor,
    Package,
    CreditCard,
    Truck,
    RotateCcw,
    UserCircle,
    Globe,
    RefreshCcw,
    MapPin
} from 'lucide-react';
import { Link } from 'react-router-dom';
import MainLayout from '@/layouts/MainLayout';
import { Helmet } from 'react-helmet-async';

const TermsOfService = () => {
    return (
        <MainLayout>
            <Helmet>
                <title>Terms of Service - Kottravai</title>
                <meta name="description" content="Kottravai Terms of Service - Guidelines regarding product usage, pricing, cancellations, and liability." />
                <link rel="canonical" href={`${import.meta.env.VITE_SITE_URL || 'https://www.kottravai.in'}/terms-of-service`} />
                <meta property="og:title" content="Terms of Service - Kottravai" />
                <meta property="og:description" content="Kottravai Terms of Service - Guidelines regarding product usage, pricing, cancellations, and liability." />
                <meta property="og:url" content={`${import.meta.env.VITE_SITE_URL || 'https://www.kottravai.in'}/terms-of-service`} />
                <meta property="og:type" content="website" />
                <meta property="og:image" content={`${import.meta.env.VITE_SITE_URL || 'https://www.kottravai.in'}/ChatGPT_Image_May_14_2026_05_41_46_PM.webp`} />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content="Terms of Service - Kottravai" />
                <meta name="twitter:description" content="Kottravai Terms of Service - Guidelines regarding product usage, pricing, cancellations, and liability." />
                <meta name="twitter:image" content={`${import.meta.env.VITE_SITE_URL || 'https://www.kottravai.in'}/ChatGPT_Image_May_14_2026_05_41_46_PM.webp`} />
            </Helmet>

            {/* Full-Width Cinematic Banner */}
            <div className="relative w-full overflow-hidden">
                <img 
                    src="/ChatGPT_Image_May_14_2026_05_41_46_PM.webp" 
                    alt="Terms of Service Banner" 
                    width={1200}
                    height={300}
                    className="w-full h-auto object-cover"
                />
            </div>

            <div className="bg-[#FAF9F6] min-h-screen py-16 px-4 sm:px-6 lg:px-8 font-sans">
                <div className="container mx-auto max-w-6xl">
                    
                    {/* Header Intro */}
                    <div className="text-center mb-16">
                        <div className="inline-block px-6 py-2 bg-[#8E2A8B]/10 rounded-full mb-6">
                            <p className="text-[#8E2A8B] text-xs font-black uppercase tracking-[0.3em]">Legal Framework</p>
                        </div>
                        <h2 className="text-3xl md:text-5xl font-serif text-[#2D1B4E] mb-6">Standard Terms & Conditions</h2>
                        <div className="h-1 w-20 bg-[#8E2A8B] mx-auto rounded-full"></div>
                    </div>

                    {/* Terms Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        
                        {/* 1. Introduction */}
                        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500 group">
                            <div className="w-14 h-14 bg-[#FAF9F6] rounded-2xl flex items-center justify-center text-[#8E2A8B] mb-6 group-hover:bg-[#8E2A8B] group-hover:text-white transition-all duration-500">
                                <FileText size={28} />
                            </div>
                            <h3 className="text-xl font-bold text-[#2D1B4E] mb-4">1. Introduction</h3>
                            <p className="text-sm text-gray-600 leading-relaxed font-medium">
                                These Terms & Conditions govern your use of the Kottravai website and services. By using this website, you accept these terms in full. If you do not agree with any part of these terms, please do not use our website.
                            </p>
                        </div>

                        {/* 2. Use of the Website */}
                        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500 group">
                            <div className="w-14 h-14 bg-[#FAF9F6] rounded-2xl flex items-center justify-center text-[#8E2A8B] mb-6 group-hover:bg-[#8E2A8B] group-hover:text-white transition-all duration-500">
                                <Monitor size={28} />
                            </div>
                            <h3 className="text-xl font-bold text-[#2D1B4E] mb-4">2. Use of the Website</h3>
                            <div className="space-y-4">
                                <p className="text-sm text-gray-600 leading-relaxed font-medium">
                                    You agree to use this website only for lawful purposes and in a manner that does not infringe the rights of others.
                                </p>
                                <ul className="text-xs text-gray-500 space-y-2 list-disc list-inside">
                                    <li>Misuse the website or attempt unauthorized access</li>
                                    <li>Use the website for fraudulent activities</li>
                                    <li>Copy or exploit website content without permission</li>
                                </ul>
                            </div>
                        </div>

                        {/* 3. Product Information */}
                        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500 group">
                            <div className="w-14 h-14 bg-[#FAF9F6] rounded-2xl flex items-center justify-center text-[#8E2A8B] mb-6 group-hover:bg-[#8E2A8B] group-hover:text-white transition-all duration-500">
                                <Package size={28} />
                            </div>
                            <h3 className="text-xl font-bold text-[#2D1B4E] mb-4">3. Product Information</h3>
                            <div className="space-y-3">
                                <p className="text-sm text-gray-600 leading-relaxed font-medium">
                                    We strive for accuracy in descriptions, but variations occur.
                                </p>
                                <ul className="text-xs text-gray-500 space-y-2 list-disc list-inside">
                                    <li>Slight variations due to handmade craftsmanship</li>
                                    <li>Product availability may change without notice</li>
                                    <li>Kottravai reserves the right to modify products</li>
                                </ul>
                            </div>
                        </div>

                        {/* 4. Pricing & Payments */}
                        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500 group">
                            <div className="w-14 h-14 bg-[#FAF9F6] rounded-2xl flex items-center justify-center text-[#8E2A8B] mb-6 group-hover:bg-[#8E2A8B] group-hover:text-white transition-all duration-500">
                                <CreditCard size={28} />
                            </div>
                            <h3 className="text-xl font-bold text-[#2D1B4E] mb-4">4. Pricing & Payments</h3>
                            <ul className="text-xs text-gray-500 space-y-2 list-disc list-inside">
                                <li>Prices in INR and inclusive/exclusive of taxes</li>
                                <li>Secure third-party payment gateways</li>
                                <li>Orders confirmed after successful verification</li>
                                <li>Right to refuse or cancel orders at discretion</li>
                            </ul>
                        </div>

                        {/* 5. Shipping & Delivery */}
                        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500 group">
                            <div className="w-14 h-14 bg-[#FAF9F6] rounded-2xl flex items-center justify-center text-[#8E2A8B] mb-6 group-hover:bg-[#8E2A8B] group-hover:text-white transition-all duration-500">
                                <Truck size={28} />
                            </div>
                            <h3 className="text-xl font-bold text-[#2D1B4E] mb-4">5. Shipping & Delivery</h3>
                            <ul className="text-xs text-gray-500 space-y-2 list-disc list-inside">
                                <li>We ship across India</li>
                                <li>Timelines are estimates and may vary</li>
                                <li>Shipping charges displayed during checkout</li>
                                <li>Logistics delays are beyond our control</li>
                            </ul>
                        </div>

                        {/* 6. Returns & Refunds */}
                        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500 group">
                            <div className="w-14 h-14 bg-[#FAF9F6] rounded-2xl flex items-center justify-center text-[#8E2A8B] mb-6 group-hover:bg-[#8E2A8B] group-hover:text-white transition-all duration-500">
                                <RotateCcw size={28} />
                            </div>
                            <h3 className="text-xl font-bold text-[#2D1B4E] mb-4">6. Returns & Refunds</h3>
                            <div className="space-y-4">
                                <ul className="text-xs text-gray-500 space-y-2 list-disc list-inside">
                                    <li>Return within specified period</li>
                                    <li>Items must be unused and in original packaging</li>
                                    <li>Refunds processed after inspection</li>
                                    <li>Custom/food products may not be eligible</li>
                                </ul>
                                <p className="text-[10px] font-bold text-[#8E2A8B]">
                                    Refer to our <Link to="/refund-policy" className="underline hover:text-[#2D1B4E]">Returns & Refund Policy</Link>
                                </p>
                            </div>
                        </div>

                        {/* 7. Intellectual Property */}
                        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500 group">
                            <div className="w-14 h-14 bg-[#FAF9F6] rounded-2xl flex items-center justify-center text-[#8E2A8B] mb-6 group-hover:bg-[#8E2A8B] group-hover:text-white transition-all duration-500">
                                <Copyright size={28} />
                            </div>
                            <h3 className="text-xl font-bold text-[#2D1B4E] mb-4">7. Intellectual Property</h3>
                            <p className="text-sm text-gray-600 leading-relaxed font-medium">
                                All content including Logos, Images, Product designs, Text, and Branding are the intellectual property of Kottravai. Unauthorized use or distribution is strictly prohibited.
                            </p>
                        </div>

                        {/* 8. User Accounts */}
                        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500 group">
                            <div className="w-14 h-14 bg-[#FAF9F6] rounded-2xl flex items-center justify-center text-[#8E2A8B] mb-6 group-hover:bg-[#8E2A8B] group-hover:text-white transition-all duration-500">
                                <UserCircle size={28} />
                            </div>
                            <h3 className="text-xl font-bold text-[#2D1B4E] mb-4">8. User Accounts</h3>
                            <div className="space-y-3">
                                <p className="text-xs text-gray-500">Users are responsible for:</p>
                                <ul className="text-xs text-gray-500 space-y-2 list-disc list-inside">
                                    <li>Maintaining account confidentiality</li>
                                    <li>Providing accurate information</li>
                                    <li>All activities conducted under their account</li>
                                </ul>
                                <p className="text-[10px] text-gray-400 italic">Kottravai reserves the right to terminate accounts violating terms.</p>
                            </div>
                        </div>

                        {/* 9. Limitation of Liability */}
                        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500 group">
                            <div className="w-14 h-14 bg-[#FAF9F6] rounded-2xl flex items-center justify-center text-[#8E2A8B] mb-6 group-hover:bg-[#8E2A8B] group-hover:text-white transition-all duration-500">
                                <Scale size={28} />
                            </div>
                            <h3 className="text-xl font-bold text-[#2D1B4E] mb-4">9. Limitation of Liability</h3>
                            <ul className="text-xs text-gray-500 space-y-2 list-disc list-inside">
                                <li>Not liable for indirect/incidental damages</li>
                                <li>Loss of data or profits</li>
                                <li>Delays caused by technical issues</li>
                                <li>Damages arising from product misuse</li>
                            </ul>
                        </div>

                        {/* 10. Privacy Policy */}
                        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500 group">
                            <div className="w-14 h-14 bg-[#FAF9F6] rounded-2xl flex items-center justify-center text-[#8E2A8B] mb-6 group-hover:bg-[#8E2A8B] group-hover:text-white transition-all duration-500">
                                <ShieldCheck size={28} />
                            </div>
                            <h3 className="text-xl font-bold text-[#2D1B4E] mb-4">10. Privacy Policy</h3>
                            <p className="text-sm text-gray-600 leading-relaxed font-medium">
                                Your use of this website is also governed by our <Link to="/privacy-policy" className="text-[#8E2A8B] font-bold underline">Privacy Policy</Link>, which explains how we collect, use, and protect your information.
                            </p>
                        </div>

                        {/* 11. Governing Law */}
                        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500 group">
                            <div className="w-14 h-14 bg-[#FAF9F6] rounded-2xl flex items-center justify-center text-[#8E2A8B] mb-6 group-hover:bg-[#8E2A8B] group-hover:text-white transition-all duration-500">
                                <Globe size={28} />
                            </div>
                            <h3 className="text-xl font-bold text-[#2D1B4E] mb-4">11. Governing Law</h3>
                            <p className="text-sm text-gray-600 leading-relaxed font-medium">
                                These Terms shall be governed by the laws of India. Disputes shall be subject to the jurisdiction of courts in Tamil Nadu, India.
                            </p>
                        </div>

                        {/* 12. Changes to Terms */}
                        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500 group">
                            <div className="w-14 h-14 bg-[#FAF9F6] rounded-2xl flex items-center justify-center text-[#8E2A8B] mb-6 group-hover:bg-[#8E2A8B] group-hover:text-white transition-all duration-500">
                                <RefreshCcw size={28} />
                            </div>
                            <h3 className="text-xl font-bold text-[#2D1B4E] mb-4">12. Changes to Terms</h3>
                            <p className="text-sm text-gray-600 leading-relaxed font-medium">
                                Kottravai reserves the right to update these Terms at any time without prior notice. Updated versions will be posted here.
                            </p>
                        </div>

                        {/* 13. Contact Us */}
                        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500 group lg:col-span-1 md:col-span-2">
                            <div className="w-14 h-14 bg-[#FAF9F6] rounded-2xl flex items-center justify-center text-[#8E2A8B] mb-6 group-hover:bg-[#8E2A8B] group-hover:text-white transition-all duration-500">
                                <Mail size={28} />
                            </div>
                            <h3 className="text-xl font-bold text-[#2D1B4E] mb-4">13. Contact Us</h3>
                            <div className="space-y-2 text-xs font-bold text-gray-600">
                                <p className="text-[#8E2A8B]">Kottravai</p>
                                <p>Website: www.kottravai.in</p>
                                <p>Email: care@kottravai.in</p>
                                <p>Phone: +91 97870 30411</p>
                            </div>
                        </div>

                    </div>

                    {/* Final Note */}
                    <div className="mt-20 text-center">
                        <p className="text-gray-400 text-[10px] font-black tracking-[0.4em] uppercase">Last Updated: October 2025</p>
                    </div>
                </div>
            </div>

            {/* Premium Get in Touch Section */}
            <div className="container mx-auto px-4 max-w-6xl mb-20">
                <div className="mt-16 md:mt-24 bg-white rounded-[2rem] md:rounded-[3.5rem] p-8 md:p-20 border border-gray-100 shadow-2xl relative overflow-hidden">
                    <div className="max-w-xl mx-auto text-center mb-12 md:mb-16">
                        <h3 className="text-3xl md:text-5xl font-serif text-[#2D1B4E] mb-4">Get in Touch</h3>
                        <p className="text-gray-500 font-medium text-sm md:text-base">Choose your preferred way to reach us.</p>
                        <div className="mt-8 flex items-center justify-center gap-4">
                            <div className="h-[1px] flex-1 bg-gray-100"></div>
                            <div className="w-2 h-2 rounded-full bg-[#8E2A8B] opacity-20"></div>
                            <div className="h-[1px] flex-1 bg-gray-100"></div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-10 md:gap-y-16 gap-x-16">
                        {/* Customer Care */}
                        <div className="flex items-start gap-5 md:gap-6 group">
                            <div className="w-14 h-14 md:w-20 md:h-20 rounded-2xl md:rounded-3xl bg-[#F3E8F4] flex items-center justify-center text-[#8E2A8B] shrink-0 group-hover:scale-110 transition-transform duration-500">
                                <Phone className="w-6 h-6 md:w-8 md:h-8" />
                            </div>
                            <div>
                                <p className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1 md:mb-2">Customer Care</p>
                                <p className="text-xl md:text-3xl font-bold text-[#2D1B4E] mb-1">+91 97870 30811</p>
                                <p className="text-[10px] md:text-[11px] font-bold text-gray-400 uppercase tracking-widest">Mon - Sat | 10 AM - 6 PM</p>
                            </div>
                        </div>

                        {/* Email */}
                        <div className="flex items-start gap-5 md:gap-6 group">
                            <div className="w-14 h-14 md:w-20 md:h-20 rounded-2xl md:rounded-3xl bg-[#F3E8F4] flex items-center justify-center text-[#8E2A8B] shrink-0 group-hover:scale-110 transition-transform duration-500">
                                <Mail className="w-6 h-6 md:w-8 md:h-8" />
                            </div>
                            <div>
                                <p className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1 md:mb-2">Email Us</p>
                                <p className="text-lg md:text-2xl font-bold text-[#2D1B4E] mb-1 break-all">customersupport@kottravai.in</p>
                                <p className="text-[10px] md:text-[11px] font-bold text-gray-400 uppercase tracking-widest">We reply within 24 hours</p>
                            </div>
                        </div>

                        {/* WhatsApp */}
                        <div className="flex items-start gap-5 md:gap-6 group">
                            <div className="w-14 h-14 md:w-20 md:h-20 rounded-2xl md:rounded-3xl bg-[#F3E8F4] flex items-center justify-center text-[#8E2A8B] shrink-0 group-hover:scale-110 transition-transform duration-500">
                                <MessageCircle className="w-6 h-6 md:w-8 md:h-8" />
                            </div>
                            <div>
                                <p className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1 md:mb-2">WhatsApp</p>
                                <p className="text-xl md:text-3xl font-bold text-[#2D1B4E] mb-1">+91 88078 29183</p>
                                <p className="text-[10px] md:text-[11px] font-bold text-gray-400 uppercase tracking-widest">Chat with us directly</p>
                            </div>
                        </div>

                        {/* Address */}
                        <div className="flex items-start gap-5 md:gap-6 group">
                            <div className="w-14 h-14 md:w-20 md:h-20 rounded-2xl md:rounded-3xl bg-[#F3E8F4] flex items-center justify-center text-[#8E2A8B] shrink-0 group-hover:scale-110 transition-transform duration-500">
                                <MapPin className="w-6 h-6 md:w-8 md:h-8" />
                            </div>
                            <div>
                                <p className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1 md:mb-2">Address</p>
                                <div className="text-[11px] md:text-xs font-bold text-gray-600 leading-relaxed uppercase tracking-tight">
                                    <p>Kottravai Enterprises Pvt Ltd</p>
                                    <p>Vazhai Incubator, S.V.C College</p>
                                    <p>Puliyangudi - 627855</p>
                                    <p>Tamil Nadu, India</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
};

export default TermsOfService;
