
import { 
    Truck, 
    MapPin, 
    Clock, 
    ShieldCheck, 
    RotateCcw, 
    Package, 
    FileText, 
    AlertCircle,
    Phone,
    Mail,
    MessageCircle,
    Globe,
    CreditCard
} from 'lucide-react';
import MainLayout from '@/layouts/MainLayout';
import { Helmet } from 'react-helmet-async';

const ShippingPolicy = () => {

    const benefits = [
        { icon: Truck, title: "Free Shipping", desc: "On orders above ₹499" },
        { icon: Clock, title: "Timely Delivery", desc: "We deliver on time" },
        { icon: ShieldCheck, title: "Safe & Secure", desc: "Careful packaging" },
        { icon: Globe, title: "Pan India Delivery", desc: "We ship across India" },
        { icon: RotateCcw, title: "Easy Returns", desc: "7-day return policy" }
    ];

    const policyCards = [
        {
            id: 1,
            icon: Package,
            title: "1. Order Processing",
            content: "All orders are processed within 1-3 business days (excluding Sundays and public holidays) after payment confirmation. You will receive an email/SMS with your order details and tracking information once your order is shipped."
        },
        {
            id: 2,
            icon: Truck,
            title: "2. Delivery Timelines",
            content: (
                <div className="space-y-1">
                    <p>We ship across India. Estimated delivery time after dispatch:</p>
                    <ul className="text-[13px] space-y-0.5 list-disc list-inside marker:text-[#8E2A8B]">
                        <li>Metro Cities: 2-4 business days</li>
                        <li>Tier 1 Cities: 3-5 business days</li>
                        <li>Tier 2 & 3 Cities: 4-7 business days</li>
                        <li>Remote Areas: 5-9 business days</li>
                    </ul>
                    <p className="text-[12px] text-gray-500 italic mt-2">Delays may occur due to unforeseen circumstances like weather, holidays or courier delays.</p>
                </div>
            )
        },
        {
            id: 3,
            icon: CreditCard,
            title: "3. Shipping Charges",
            content: (
                <ul className="space-y-2 list-disc list-inside marker:text-[#8E2A8B]">
                    <li>Free Shipping on all orders above ₹499</li>
                    <li>For orders below ₹499, a flat shipping fee of ₹60 will be applicable.</li>
                    <li className="text-gray-500 text-[12px]">The shipping charges will be added to your order amount at the time of checkout.</li>
                </ul>
            )
        },
        {
            id: 4,
            icon: FileText,
            title: "4. Order Tracking",
            content: "Once your order is shipped, you will receive a tracking link via email or SMS. You can also track your order by logging in to your account on our website."
        },
        {
            id: 5,
            icon: MapPin,
            title: "5. Delivery Locations",
            content: "We currently deliver to all serviceable pin codes across India. For orders to remote locations, additional transit time may apply."
        }
    ];

    const additionalInfo = [
        {
            id: "unsuccessful",
            title: "Unsuccessful Delivery Attempts",
            icon: RotateCcw,
            content: "If delivery is not successful after multiple attempts, the order may be returned to us. In such cases, we will contact you to arrange re-shipment (additional charges may apply)."
        },
        {
            id: "damaged",
            title: "Damaged or Lost Shipments",
            icon: AlertCircle,
            content: "If your package is damaged or lost during transit, please contact our support team within 48 hours of delivery."
        },
        {
            id: "changes",
            title: "Changes to Orders",
            icon: Clock,
            content: "Once an order is placed, it cannot be changed or cancelled. Please review your order before completing the purchase."
        },
        {
            id: "gifting",
            title: "Gifting & Special Instructions",
            icon: RotateCcw,
            content: "You can add gift messages or special delivery instructions at checkout. We will do our best to accommodate your request."
        }
    ];

    return (
        <MainLayout>
            <Helmet>
                <title>Shipping Policy | Kottravai - Pure, Natural & Authentic</title>
                <meta name="description" content="Learn about Kottravai's shipping policies, delivery timelines, charges, and tracking across India." />
                <link rel="canonical" href={`${import.meta.env.VITE_SITE_URL || 'https://kottravai.com'}/shipping-policy`} />
                <meta property="og:title" content="Shipping Policy | Kottravai - Pure, Natural & Authentic" />
                <meta property="og:description" content="Learn about Kottravai's shipping policies, delivery timelines, charges, and tracking across India." />
                <meta property="og:url" content={`${import.meta.env.VITE_SITE_URL || 'https://kottravai.com'}/shipping-policy`} />
                <meta property="og:type" content="website" />
                <meta property="og:image" content={`${import.meta.env.VITE_SITE_URL || 'https://kottravai.com'}/WhatsApp Image 2026-05-13 at 3.16.52 PM.jpeg`} />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content="Shipping Policy | Kottravai - Pure, Natural & Authentic" />
                <meta name="twitter:description" content="Learn about Kottravai's shipping policies, delivery timelines, charges, and tracking across India." />
                <meta name="twitter:image" content={`${import.meta.env.VITE_SITE_URL || 'https://kottravai.com'}/WhatsApp Image 2026-05-13 at 3.16.52 PM.jpeg`} />
            </Helmet>

            <div className="bg-[#FAF9F6] min-h-screen pb-20">
                {/* Full-Width Hero Banner - No transitions, exact image */}
                <div className="w-full relative overflow-hidden mb-12 md:mb-20">
                    <img 
                        src="/WhatsApp Image 2026-05-13 at 3.16.52 PM.jpeg" 
                        alt="Kottravai Shipping Banner" 
                        className="w-full h-auto block"
                    />
                </div>

                <div className="container mx-auto px-4">
                    {/* Intro text moved below banner for better flow */}
                    <div className="max-w-3xl mx-auto text-center mb-16">
                        <p className="text-gray-600 text-lg leading-relaxed">
                            At Kottravai, every product is handcrafted with care by rural women artisans. We ensure safe and timely delivery while respecting the handmade nature of our products.
                        </p>
                    </div>

                    {/* Benefits Badges */}
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6 mb-20">
                        {benefits.map((item, i) => (
                            <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 flex items-center gap-4 hover:shadow-lg transition-shadow duration-300">
                                <div className="text-[#8E2A8B]">
                                    <item.icon size={28} strokeWidth={1.5} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-[#2D1B4E] text-sm">{item.title}</h4>
                                    <p className="text-[10px] text-gray-400 font-medium">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Main Policy Content */}
                    <div className="text-center mb-10">
                        <h2 className="text-2xl md:text-3xl font-serif text-[#2D1B4E] mb-3">Our Shipping Policy</h2>
                        <div className="flex items-center justify-center gap-3">
                            <div className="h-[1px] bg-gray-200 w-10"></div>
                            <div className="text-[#8E2A8B] opacity-30"><RotateCcw size={14} /></div>
                            <div className="h-[1px] bg-gray-200 w-10"></div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
                        {policyCards.map((card) => (
                            <div 
                                key={card.id} 
                                className="bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-gray-100 shadow-sm flex flex-col h-full"
                            >
                                <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-[#8E2A8B] mb-6 flex-shrink-0">
                                    <card.icon size={24} />
                                </div>
                                <h3 className="text-lg md:text-xl font-serif text-[#2D1B4E] mb-4">{card.title}</h3>
                                <div className="text-sm text-gray-600 leading-relaxed font-medium flex-grow">
                                    {card.content}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Additional Information Cards - Now fully visible as requested */}
                    <div className="max-w-6xl mx-auto mb-20">
                        <h2 className="text-3xl font-serif text-[#2D1B4E] mb-10 text-center md:text-left">Additional Information</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                            {additionalInfo.map((info) => (
                                <div key={info.id} className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col h-full group">
                                    <div className="flex items-center gap-5 mb-6">
                                        <div className="w-14 h-14 bg-[#FAF9F6] rounded-2xl flex items-center justify-center text-[#8E2A8B] group-hover:bg-[#8E2A8B] group-hover:text-white transition-all duration-500">
                                            <info.icon size={28} />
                                        </div>
                                        <h3 className="font-bold text-xl text-[#2D1B4E]">{info.title}</h3>
                                    </div>
                                    <div className="text-sm text-gray-500 leading-relaxed font-medium">
                                        {info.content}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Help Footer */}
                    {/* Premium Get in Touch Section */}
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
            </div>
        </MainLayout>
    );
};

export default ShippingPolicy;
