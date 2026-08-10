import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import MainLayout from '@/layouts/MainLayout';
import { Calendar, Users, Target, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { registerForLivelihoodChallenge } from '@/services/eventService';

const LivelihoodChallenge = () => {
    const [showForm, setShowForm] = useState(false);
    
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        organization: ''
    });
    
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};
        
        if (!formData.fullName.trim()) {
            newErrors.fullName = 'Full Name is required';
        } else if (formData.fullName.trim().length < 2) {
            newErrors.fullName = 'Name is too short';
        }
        
        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(formData.email)) {
            newErrors.email = 'Please enter a valid email address';
        }
        
        if (!formData.phone.trim()) {
            newErrors.phone = 'Phone number is required';
        } else if (!/^[6-9]\d{9}$/.test(formData.phone.replace(/\D/g, ''))) {
            newErrors.phone = 'Please enter a valid 10-digit Indian phone number';
        }
        
        if (!formData.organization.trim()) {
            newErrors.organization = 'College / Organization is required';
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validateForm()) return;
        
        setIsSubmitting(true);
        setSubmitStatus(null);
        
        try {
            await registerForLivelihoodChallenge(formData);
            setSubmitStatus({
                type: 'success',
                message: 'Registration submitted successfully.'
            });
        } catch (error: any) {
            setSubmitStatus({
                type: 'error',
                message: error.message || 'Unable to submit your registration. Please try again.'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRegisterClick = () => {
        setShowForm(true);
        // Scroll slightly to the form
        setTimeout(() => {
            document.getElementById('registration-form-section')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    return (
        <MainLayout>
            <Helmet>
                <title>Design the Next Livelihood | Kottravai</title>
                <meta name="description" content="India's Sustainable Livelihood Design Challenge 2026 organized by Kottravai, Luxentra, and Startup Thamizh." />
            </Helmet>



            {/* Hero Section */}
            <div className="w-full bg-[#f9f5ff]">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center px-4 md:px-8 pb-16 pt-8">
                    <div className="w-full md:w-2/3 md:pr-12">
                        <div className="inline-block bg-[#8E2A8B]/10 text-[#8E2A8B] px-4 py-2 rounded-full font-bold text-sm mb-6 tracking-wide uppercase">
                            Design Challenge 2026
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black text-[#2D1B4E] leading-tight mb-6">
                            Design the Next Livelihood
                        </h1>
                        <p className="text-xl text-gray-700 mb-8 font-medium leading-relaxed">
                            India's Sustainable Livelihood Design Challenge. 
                            From unhealthy work and limited choices to dignified work, fair income, and brighter futures.
                        </p>
                        
                        <div className="space-y-4 mb-10">
                            <div className="flex items-center gap-4 text-gray-700 font-semibold">
                                <Users size={24} className="text-[#8E2A8B]" />
                                <span>Organized by Kottravai & Luxentra</span>
                            </div>
                            <div className="flex items-center gap-4 text-gray-700 font-semibold">
                                <Target size={24} className="text-[#8E2A8B]" />
                                <span>In Collaboration with Startup Thamizh</span>
                            </div>
                            <div className="flex items-center gap-4 text-gray-700 font-semibold">
                                <Calendar size={24} className="text-[#8E2A8B]" />
                                <span>Registration Deadline: August 25</span>
                            </div>
                        </div>

                        {!showForm && (
                            <button 
                                onClick={handleRegisterClick}
                                className="bg-[#8E2A8B] text-white px-8 py-4 rounded-xl font-black text-lg hover:bg-[#2D1B4E] transition-colors duration-300 flex items-center gap-3 shadow-lg hover:shadow-xl hover:-translate-y-1 transform w-full md:w-auto justify-center"
                            >
                                Register Now <ArrowRight size={20} />
                            </button>
                        )}
                    </div>
                    
                    <div className="w-full md:w-1/3 mt-12 md:mt-0 flex justify-center">
                        <img 
                            src="/WhatsApp%20Image%202026-08-08%20at%2015.20.47.jpeg" 
                            alt="Design the Next Livelihood Poster" 
                            className="w-full max-w-[300px] h-auto object-cover rounded-3xl shadow-2xl border-4 border-white transform rotate-2 hover:rotate-0 transition-transform duration-500" 
                        />
                    </div>
                </div>
            </div>

            {/* Event Description & Challenge Section */}
            <div className="max-w-7xl mx-auto py-16 md:py-24 px-4 lg:px-8">
                <div className="flex flex-col lg:flex-row gap-16 lg:gap-24 items-start">
                    
                    {/* Left: Editorial Description */}
                    <div className="flex-1 max-w-[650px]">
                        <span className="inline-block text-[#8E2A8B] font-black text-xs md:text-sm tracking-[0.2em] uppercase mb-5">
                            India's Sustainable Livelihood Design Challenge 2026
                        </span>
                        
                        <h2 className="text-4xl md:text-[48px] font-black text-[#2D1B4E] leading-tight mb-8">
                            Design the Next Livelihood
                        </h2>
                        
                        <div className="text-[17px] md:text-[19px] text-gray-700 leading-[1.7] space-y-6 mb-12">
                            <p>
                                Design the Next Livelihood is a sustainable design challenge focused on creating practical, scalable, and meaningful solutions that can improve livelihoods for rural artisans and communities.
                            </p>
                            <p>
                                The challenge brings together creativity, design, natural resources, and traditional knowledge to explore new possibilities for dignified work, fair income, and brighter futures.
                            </p>
                            <p>
                                Participants are encouraged to rethink how locally available and sustainable materials can be transformed into useful products, solutions, and opportunities that create lasting social and economic impact.
                            </p>
                        </div>
                        
                        <div className="pl-6 border-l-[3px] border-[#8E2A8B]/30 relative">
                            {/* Subtle decorative dot */}
                            <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-[#8E2A8B]"></div>
                            
                            <p className="text-[19px] md:text-[22px] font-semibold text-gray-500 mb-3 leading-snug">
                                From unhealthy work.<br/>
                                Limited choices.
                            </p>
                            <p className="text-[19px] md:text-[22px] font-black text-[#8E2A8B] leading-snug">
                                To dignified work.<br/>
                                Fair income.<br/>
                                Brighter futures.
                            </p>
                        </div>
                    </div>
                    
                    {/* Right: The Challenge Information Panel */}
                    <div className="w-full lg:w-[400px] bg-white border border-gray-100 rounded-3xl p-8 md:p-10 shadow-sm sticky top-32">
                        <h3 className="text-[#8E2A8B] font-black text-xs tracking-[0.15em] uppercase mb-6 pb-4 border-b border-gray-100">
                            The Challenge
                        </h3>
                        
                        <p className="text-[#2D1B4E] font-bold text-lg mb-6">
                            Design practical solutions that can:
                        </p>
                        
                        <ul className="space-y-4">
                            {[
                                "Improve artisan livelihoods",
                                "Create dignified work",
                                "Support sustainable practices",
                                "Increase income opportunities",
                                "Build scalable solutions from local resources"
                            ].map((item, index) => (
                                <li key={index} className="flex items-start gap-3">
                                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#8E2A8B] flex-shrink-0"></div>
                                    <span className="text-gray-700 font-medium leading-relaxed">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    
                </div>
            </div>
                
                {/* Registration Form Section (Conditionally Rendered) */}
                {showForm && submitStatus?.type === 'success' && (
                    <div className="max-w-4xl mx-auto py-8 px-4 mb-16">
                        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-10 md:p-16 text-center">
                            <div className="w-24 h-24 bg-[#f0faf0] text-green-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-sm">
                                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                            </div>
                            <h2 className="text-3xl md:text-4xl font-black text-[#2D1B4E] mb-4">Registration Successful</h2>
                            <p className="text-xl md:text-2xl font-bold text-gray-800 mb-4">Thank you, {formData.fullName}.</p>
                            <p className="text-lg text-gray-600 max-w-xl mx-auto mb-10 leading-relaxed">
                                Your registration for <span className="font-bold text-[#8E2A8B]">Design the Next Livelihood</span> has been successfully received.
                                <br/><br/>
                                We look forward to your participation.
                            </p>
                            <button onClick={() => window.location.href = '/events'} className="bg-[#8E2A8B] text-white px-8 py-4 rounded-xl font-black text-lg hover:bg-[#2D1B4E] transition-all duration-300 shadow-md hover:shadow-lg hover:-translate-y-1 inline-flex items-center gap-2">
                                Back to Events
                            </button>
                        </div>
                    </div>
                )}
                
                {showForm && submitStatus?.type !== 'success' && (
                    <div className="max-w-4xl mx-auto py-8 px-4 mb-16">
                        <div id="registration-form-section" className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 md:p-12 scroll-mt-24">
                            <div className="text-center mb-10">
                                <h2 className="text-3xl font-black text-[#2D1B4E] mb-4">Registration Form</h2>
                            <p className="text-gray-500 max-w-xl mx-auto">
                                Please fill out your details below to register for India's Sustainable Livelihood Design Challenge 2026.
                            </p>
                        </div>
                        
                        <form className="space-y-6" onSubmit={handleSubmit}>
                            
                            {submitStatus?.type === 'error' && (
                                <div className="p-4 rounded-xl flex items-start gap-3 bg-red-50 text-red-800 border border-red-100">
                                    <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
                                    <p className="font-medium text-sm md:text-base">{submitStatus.message}</p>
                                </div>
                            )}
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Full Name</label>
                                    <input 
                                        type="text" 
                                        name="fullName"
                                        value={formData.fullName}
                                        onChange={handleInputChange}
                                        disabled={isSubmitting}
                                        className={`w-full px-4 py-3 rounded-xl border ${errors.fullName ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : 'border-gray-200 focus:border-[#8E2A8B] focus:ring-[#8E2A8B]/30'} bg-gray-50 focus:bg-white focus:ring-2 outline-none transition-all disabled:opacity-50`} 
                                        placeholder="Enter your full name" 
                                    />
                                    {errors.fullName && <p className="text-red-500 text-xs font-bold mt-1.5">{errors.fullName}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Email Address</label>
                                    <input 
                                        type="email" 
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        disabled={isSubmitting}
                                        className={`w-full px-4 py-3 rounded-xl border ${errors.email ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : 'border-gray-200 focus:border-[#8E2A8B] focus:ring-[#8E2A8B]/30'} bg-gray-50 focus:bg-white focus:ring-2 outline-none transition-all disabled:opacity-50`} 
                                        placeholder="Enter your email address" 
                                    />
                                    {errors.email && <p className="text-red-500 text-xs font-bold mt-1.5">{errors.email}</p>}
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Phone Number</label>
                                    <input 
                                        type="tel" 
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleInputChange}
                                        disabled={isSubmitting}
                                        className={`w-full px-4 py-3 rounded-xl border ${errors.phone ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : 'border-gray-200 focus:border-[#8E2A8B] focus:ring-[#8E2A8B]/30'} bg-gray-50 focus:bg-white focus:ring-2 outline-none transition-all disabled:opacity-50`} 
                                        placeholder="Enter your phone number" 
                                    />
                                    {errors.phone && <p className="text-red-500 text-xs font-bold mt-1.5">{errors.phone}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">College / Organization</label>
                                    <input 
                                        type="text" 
                                        name="organization"
                                        value={formData.organization}
                                        onChange={handleInputChange}
                                        disabled={isSubmitting}
                                        className={`w-full px-4 py-3 rounded-xl border ${errors.organization ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : 'border-gray-200 focus:border-[#8E2A8B] focus:ring-[#8E2A8B]/30'} bg-gray-50 focus:bg-white focus:ring-2 outline-none transition-all disabled:opacity-50`} 
                                        placeholder="Enter your institution" 
                                    />
                                    {errors.organization && <p className="text-red-500 text-xs font-bold mt-1.5">{errors.organization}</p>}
                                </div>
                            </div>
                            
                            <div className="pt-8 border-t border-gray-100 text-center">
                                <button 
                                    type="submit" 
                                    disabled={isSubmitting}
                                    className="bg-[#8E2A8B] text-white px-10 py-4 rounded-xl font-black text-lg w-full md:w-auto shadow-lg hover:shadow-xl hover:-translate-y-1 hover:bg-[#2D1B4E] transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:-translate-y-0 disabled:hover:shadow-lg flex items-center justify-center gap-3 mx-auto"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 size={24} className="animate-spin" />
                                            Registering...
                                        </>
                                    ) : (
                                        "Register Now"
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
                )}
        </MainLayout>
    );
};

export default LivelihoodChallenge;
