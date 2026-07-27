
import { RefreshCw, CheckCircle, XCircle, AlertTriangle, Phone, Mail, MessageCircle } from 'lucide-react';
import MainLayout from '@/layouts/MainLayout';
import { Helmet } from 'react-helmet-async';

const RefundPolicy = () => {
    return (
        <MainLayout>
            <Helmet>
                <title>Refund Policy - Kottravai</title>
                <meta name="description" content="Kottravai Refund Policy - Details on returns, refunds, non-returnable items, and replacement process." />
                <link rel="canonical" href={`${import.meta.env.VITE_SITE_URL || 'https://kottravai.com'}/refund-policy`} />
                <meta property="og:title" content="Refund Policy - Kottravai" />
                <meta property="og:description" content="Kottravai Refund Policy - Details on returns, refunds, non-returnable items, and replacement process." />
                <meta property="og:url" content={`${import.meta.env.VITE_SITE_URL || 'https://kottravai.com'}/refund-policy`} />
                <meta property="og:type" content="website" />
                <meta property="og:image" content={`${import.meta.env.VITE_SITE_URL || 'https://kottravai.com'}/hero.webp`} />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content="Refund Policy - Kottravai" />
                <meta name="twitter:description" content="Kottravai Refund Policy - Details on returns, refunds, non-returnable items, and replacement process." />
                <meta name="twitter:image" content={`${import.meta.env.VITE_SITE_URL || 'https://kottravai.com'}/hero.webp`} />
            </Helmet>

            <div className="bg-gray-50 min-h-screen py-12 px-4 sm:px-6 lg:px-8 font-sans">
                <div className="max-w-4xl mx-auto bg-white rounded-[2rem] shadow-xl overflow-hidden border border-gray-100">

                    {/* Header Section */}
                    <div className="bg-gradient-to-r from-[#2D1B4E] to-[#1a0f2e] text-white p-8 md:p-12 relative">
                        <div className="relative z-10">
                            <h1 className="text-3xl md:text-4xl font-black uppercase tracking-wider mb-4">Refund Policy</h1>
                            <p className="text-gray-300 text-lg max-w-2xl">
                                We value trust and transparency while supporting artisan livelihoods. Learn more about our return and refund process below.
                            </p>
                        </div>
                        <div className="absolute top-1/2 right-10 -translate-y-1/2 bg-white/5 p-4 rounded-full backdrop-blur-sm hidden md:block">
                            <RefreshCw size={64} className="text-[#b5128f] opacity-80" />
                        </div>
                    </div>

                    {/* Content Section */}
                    <div className="p-8 md:p-12 space-y-12 text-gray-700">

                        {/* Returns & Refunds */}
                        <section>
                            <h2 className="text-2xl font-bold text-[#2D1B4E] mb-6 flex items-center gap-3">
                                <span className="w-8 h-8 rounded-full bg-[#b5128f] text-white flex items-center justify-center text-sm">1</span>
                                Returns & Refunds
                            </h2>
                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
                                <div className="flex gap-4">
                                    <AlertTriangle className="text-blue-500 flex-shrink-0" size={24} />
                                    <div className="space-y-3">
                                        <p className="leading-relaxed text-blue-900">
                                            Due to the handmade and perishable nature of certain products, returns are accepted <span className="font-bold">only for damaged, defective, or incorrect items</span>.
                                        </p>
                                        <div className="inline-block bg-white px-3 py-1 rounded-lg text-sm font-semibold text-blue-600 border border-blue-200">
                                            Requests must be raised within 48 hours of delivery.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Non-Returnable Items */}
                        <section>
                            <h2 className="text-2xl font-bold text-[#2D1B4E] mb-6 flex items-center gap-3">
                                <span className="w-8 h-8 rounded-full bg-[#b5128f] text-white flex items-center justify-center text-sm">2</span>
                                Non-Returnable Items
                            </h2>
                            <div className="grid sm:grid-cols-3 gap-4">
                                <div className="bg-gray-50 p-5 rounded-xl border border-gray-100 text-center hover:border-red-200 transition-colors group">
                                    <XCircle className="mx-auto text-gray-400 mb-3 group-hover:text-red-500 transition-colors" size={32} />
                                    <h4 className="font-bold text-gray-800 text-sm">Food Products & Consumables</h4>
                                </div>
                                <div className="bg-gray-50 p-5 rounded-xl border border-gray-100 text-center hover:border-red-200 transition-colors group">
                                    <XCircle className="mx-auto text-gray-400 mb-3 group-hover:text-red-500 transition-colors" size={32} />
                                    <h4 className="font-bold text-gray-800 text-sm">Customized / Made-to-order</h4>
                                </div>
                                <div className="bg-gray-50 p-5 rounded-xl border border-gray-100 text-center hover:border-red-200 transition-colors group">
                                    <XCircle className="mx-auto text-gray-400 mb-3 group-hover:text-red-500 transition-colors" size={32} />
                                    <h4 className="font-bold text-gray-800 text-sm">Used or Altered Products</h4>
                                </div>
                            </div>
                        </section>

                        {/* Refund Process */}
                        <section>
                            <h2 className="text-2xl font-bold text-[#2D1B4E] mb-6 flex items-center gap-3">
                                <span className="w-8 h-8 rounded-full bg-[#b5128f] text-white flex items-center justify-center text-sm">3</span>
                                Refund Process
                            </h2>
                            <div className="space-y-4">
                                <div className="flex items-start gap-4 p-4 border border-gray-100 rounded-xl hover:shadow-md transition-shadow">
                                    <CheckCircle className="text-green-500 mt-1" size={20} />
                                    <div>
                                        <h4 className="font-bold text-gray-900">Approval & Timeline</h4>
                                        <p className="text-sm text-gray-600 mt-1">Once approved, refunds will be processed within <span className="font-bold">7–10 business days</span>.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4 p-4 border border-gray-100 rounded-xl hover:shadow-md transition-shadow">
                                    <CheckCircle className="text-green-500 mt-1" size={20} />
                                    <div>
                                        <h4 className="font-bold text-gray-900">Original Payment Method</h4>
                                        <p className="text-sm text-gray-600 mt-1">Refunds will be strictly credited back to the original source of payment.</p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Replacement */}
                        <div className="bg-[#FAF9F6] p-8 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6">
                            <div>
                                <h3 className="text-xl font-bold text-[#2D1B4E] mb-2">Replacement Policy</h3>
                                <p className="text-gray-600">Where possible, we may offer a replacement instead of a refund to ensure you get the product you love.</p>
                            </div>
                            <div className="shrink-0 bg-white p-3 rounded-full shadow-sm">
                                <RefreshCw className="text-[#b5128f] animate-spin-slow" size={28} />
                            </div>
                        </div>

                        {/* Reworked Premium Help Footer */}
                        <div className="mt-6 bg-[#2D1B4E] rounded-[3rem] p-10 md:p-16 text-white relative overflow-hidden shadow-2xl">
                            <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#8E2A8B] rounded-full mix-blend-screen filter blur-[120px] opacity-25 animate-pulse"></div>
                            <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-[#b5128f] rounded-full mix-blend-screen filter blur-[120px] opacity-15"></div>
                            
                            <div className="relative z-10">
                                <div className="flex flex-col lg:flex-row items-center justify-between gap-12 mb-12 pb-12 border-b border-white/10 text-center lg:text-left">
                                    <div className="max-w-md">
                                        <h3 className="text-4xl md:text-5xl font-serif mb-4 leading-tight tracking-tight">Need assistance?</h3>
                                        <p className="text-gray-400 text-lg font-medium leading-relaxed">Our dedicated team is here to help resolve any refund or return queries promptly.</p>
                                    </div>
                                    <div className="hidden lg:block">
                                        <div className="px-6 py-3 bg-white/5 rounded-full border border-white/10 backdrop-blur-md">
                                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#b5128f]">Available Mon - Sat | 10AM - 6PM</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-16">
                                    <div className="group cursor-pointer">
                                        <div className="flex flex-col items-center lg:items-start gap-5 transition-transform duration-500 group-hover:translate-y-[-5px]">
                                            <div className="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-[#8E2A8B] to-[#b5128f] flex items-center justify-center text-white shadow-xl shadow-pink-900/20 transform transition-transform group-hover:rotate-6">
                                                <Phone size={28} strokeWidth={1.5} />
                                            </div>
                                            <div className="space-y-1 text-center lg:text-left">
                                                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#b5128f]">Voice Support</span>
                                                <p className="text-2xl font-bold tracking-tight text-white">+91 97870 30811</p>
                                                <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest">Call us directly</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="group cursor-pointer">
                                        <div className="flex flex-col items-center lg:items-start gap-5 transition-transform duration-500 group-hover:translate-y-[-5px]">
                                            <div className="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-[#075E54] to-[#25D366] flex items-center justify-center text-white shadow-xl shadow-emerald-900/20 transform transition-transform group-hover:-rotate-6">
                                                <MessageCircle size={28} strokeWidth={1.5} />
                                            </div>
                                            <div className="space-y-1 text-center lg:text-left">
                                                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#25D366]">Instant Chat</span>
                                                <p className="text-2xl font-bold tracking-tight text-white">+91 88078 29183</p>
                                                <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest">WhatsApp for help</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="group cursor-pointer">
                                        <div className="flex flex-col items-center lg:items-start gap-5 transition-transform duration-500 group-hover:translate-y-[-5px]">
                                            <div className="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-[#2D1B4E] to-[#b5128f] flex items-center justify-center text-white shadow-xl shadow-purple-900/20 border border-white/10 transform transition-transform group-hover:rotate-6">
                                                <Mail size={28} strokeWidth={1.5} />
                                            </div>
                                            <div className="space-y-1 text-center lg:text-left">
                                                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-rose-400">Email Query</span>
                                                <p className="text-xl font-bold tracking-tight text-white break-all">customersupport@kottravai.in</p>
                                                <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest">24h response time</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </MainLayout>
    );
};

export default RefundPolicy;
