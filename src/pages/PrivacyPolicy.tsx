
import { 
    ShieldCheck, 
    Eye, 
    Lock, 
    Database, 
    CreditCard,
    FileText,
    Monitor,
    Share2,
    Cookie,
    Shield,
    User,
    Clock,
    UserCircle,
    Link2,
    RefreshCcw,
    Mail,
    Phone,
    MessageCircle,
    MapPin
} from 'lucide-react';
import MainLayout from '@/layouts/MainLayout';
import { Helmet } from 'react-helmet-async';

const PrivacyPolicy = () => {
    const badges = [
        { icon: ShieldCheck, title: "Your Data is Safe", desc: "Your information is handled with care and trust" },
        { icon: Eye, title: "Transparency", desc: "You are clear about how we use and protect your data" },
        { icon: Lock, title: "Your Choice", desc: "You control your personal information" },
        { icon: Database, title: "We Secure", desc: "We use well proven personal information" },
        { icon: CreditCard, title: "Secure Payments", desc: "Your payment information is always protected" }
    ];

    const sections = [
        {
            id: 1,
            icon: FileText,
            title: "Information We Collect",
            content: "We collect information you provide when you place an order, create an account, contact us, or subscribe to our updates. This may include your name, phone number, email address, billing/shipping address, and payment-related details. We may also collect device information such as IP address, browser type, and website usage data to improve your experience."
        },
        {
            id: 2,
            icon: Monitor,
            title: "How We Use Your Information",
            content: "Your information is used to process orders, deliver products, provide customer support, and improve our services. We may also use your details to send order updates, promotional offers, newsletters, and important account-related notifications. Your data helps us personalize your shopping experience and maintain website security."
        },
        {
            id: 3,
            icon: Share2,
            title: "Sharing Your Information",
            content: "Kottravai values your privacy and does not sell your personal information. We may share limited information only with trusted service providers such as delivery partners, payment gateways, analytics providers, and technical support teams to complete transactions and improve services. All third parties are required to handle your data securely."
        },
        {
            id: 4,
            icon: Cookie,
            title: "Cookies & Tracking Technologies",
            content: "Our website uses cookies and similar technologies to enhance your browsing experience. Cookies help us remember your preferences, understand website traffic, improve functionality, and show relevant products or offers. You can disable cookies anytime through your browser settings, though some features may not function properly."
        },
        {
            id: 5,
            icon: Shield,
            title: "Data Security",
            content: "We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, misuse, alteration, or loss. Payment transactions are processed through secure and trusted payment gateways to ensure safe online shopping."
        },
        {
            id: 6,
            icon: User,
            title: "Your Choices & Rights",
            content: "You have the right to access, update, or request deletion of your personal information. You may also choose to unsubscribe from promotional emails or marketing communications at any time by clicking the unsubscribe link or contacting us directly."
        },
        {
            id: 7,
            icon: Clock,
            title: "Data Retention",
            content: "We retain your personal information only for as long as necessary to fulfill orders, provide services, comply with legal obligations, resolve disputes, and maintain business records. Once the data is no longer required, it is securely deleted or anonymized."
        },
        {
            id: 8,
            icon: UserCircle,
            title: "Children's Privacy",
            content: "Kottravai does not knowingly collect personal information from children under the age of 13. Our products and services are intended for individuals above this age group. If we become aware of data collected from a child without parental consent, we will remove it promptly."
        },
        {
            id: 9,
            icon: Link2,
            title: "Third-Party Links",
            content: "Our website may contain links to external or third-party websites for your convenience. Kottravai is not responsible for the privacy practices, policies, or content of these external websites. We encourage users to review their privacy policies before sharing personal information."
        },
        {
            id: 10,
            icon: RefreshCcw,
            title: "Changes to This Policy",
            content: "We may update or modify this Privacy Policy from time to time to reflect changes in our practices, services, or legal requirements. Any updates will be posted on this page with the revised effective date. Continued use of the website indicates acceptance of the updated policy."
        },
        {
            id: 11,
            icon: Mail,
            title: "Contact Us",
            content: "If you have any questions, concerns, or requests regarding this Privacy Policy or your personal information, feel free to contact us."
        }
    ];

    return (
        <MainLayout>
            <Helmet>
                <title>Privacy Policy | Kottravai - Pure, Natural & Authentic</title>
                <meta name="description" content="Kottravai Privacy Policy - Learn how we collect, use, and protect your personal information." />
                <link rel="canonical" href={`${import.meta.env.VITE_SITE_URL || 'https://kottravai.com'}/privacy-policy`} />
                <meta property="og:title" content="Privacy Policy | Kottravai - Pure, Natural & Authentic" />
                <meta property="og:description" content="Kottravai Privacy Policy - Learn how we collect, use, and protect your personal information." />
                <meta property="og:url" content={`${import.meta.env.VITE_SITE_URL || 'https://kottravai.com'}/privacy-policy`} />
                <meta property="og:type" content="website" />
                <meta property="og:image" content={`${import.meta.env.VITE_SITE_URL || 'https://kottravai.com'}/ChatGPT_Image_May_14_2026_04_22_19_PM.webp`} />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content="Privacy Policy | Kottravai - Pure, Natural & Authentic" />
                <meta name="twitter:description" content="Kottravai Privacy Policy - Learn how we collect, use, and protect your personal information." />
                <meta name="twitter:image" content={`${import.meta.env.VITE_SITE_URL || 'https://kottravai.com'}/ChatGPT_Image_May_14_2026_04_22_19_PM.webp`} />
            </Helmet>

            {/* Full-Width Cinematic Banner */}
            <div className="relative w-full overflow-hidden">
                <img 
                    src="/ChatGPT_Image_May_14_2026_04_22_19_PM.webp" 
                    alt="Privacy Policy Banner" 
                    width={1200}
                    height={300}
                    className="w-full h-auto object-cover"
                />
            </div>

            <div className="bg-[#FAF9F6] min-h-screen py-10 md:py-16">
                <div className="container mx-auto px-4 max-w-5xl">
                    
                    {/* Header Badges */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 md:gap-2 mb-16">
                        {badges.map((badge, i) => (
                            <div key={i} className="flex flex-col items-center text-center p-4 bg-[#FAF9F6] border border-gray-100/50 rounded-xl">
                                <div className="text-[#8E2A8B] mb-3">
                                    <badge.icon size={28} strokeWidth={1.5} />
                                </div>
                                <h4 className="font-bold text-[#2D1B4E] text-[11px] uppercase tracking-wider mb-1">{badge.title}</h4>
                                <p className="text-[9px] text-gray-400 font-medium leading-tight">{badge.desc}</p>
                            </div>
                        ))}
                    </div>

                    {/* Main Policy Content */}
                    <div className="bg-white rounded-[2.5rem] p-8 md:p-16 shadow-sm border border-gray-50">
                        <div className="space-y-12">
                            {sections.map((section) => (
                                <div key={section.id} className="relative">
                                    <div className="flex gap-6 md:gap-8">
                                        <div className="flex-shrink-0">
                                            <div className="w-12 h-12 md:w-14 md:h-14 bg-[#FAF9F6] rounded-2xl flex items-center justify-center text-[#8E2A8B] shadow-sm border border-gray-50">
                                                <section.icon size={24} />
                                            </div>
                                        </div>
                                        <div className="flex-grow pt-1">
                                            <h3 className="text-lg md:text-xl font-serif text-[#2D1B4E] mb-3">
                                                {section.id}. {section.title}
                                            </h3>
                                            <p className="text-sm md:text-[15px] text-gray-600 leading-relaxed font-medium">
                                                {section.content}
                                            </p>
                                        </div>
                                    </div>
                                    {section.id !== sections.length && (
                                        <div className="absolute -bottom-6 left-20 right-0 h-[1px] bg-gray-50"></div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

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

export default PrivacyPolicy;
