import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import MainLayout from '@/layouts/MainLayout';
import { Calendar, Target, ArrowRight, Loader2, AlertCircle, MapPin, CheckCircle, Info } from 'lucide-react';
import analytics from '@/utils/analyticsService';
import { API_ENDPOINTS } from '@/config/api';
import toast from 'react-hot-toast';
import { useProducts } from '@/context/ProductContext';

const HACKATHON_SLUG = 'rural-livelihood-hackathon-2026';

const LivelihoodChallenge = () => {
    const { products } = useProducts();
    const hackathonProduct = products.find(p => p.slug === HACKATHON_SLUG);

    const [showForm, setShowForm] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [paymentStatus, setPaymentStatus] = useState<{ type: 'success' | 'error', message: string, data?: any } | null>(null);

    const [formData, setFormData] = useState({
        teamName: '',
        leaderName: '',
        leaderEmail: '',
        leaderPhone: '',
        leaderOrg: '',
        part2Name: '',
        part2Email: '',
        part2Phone: '',
        part2Org: '',
        part3Name: '',
        part3Email: '',
        part3Phone: '',
        part3Org: '',
        agreedToRules: false
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        analytics.trackEvent('hackathon_page_view', { page: '/livelihood-challenge' });
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
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
        
        if (!formData.teamName.trim()) newErrors.teamName = 'Team name is required';
        if (!formData.leaderName.trim()) newErrors.leaderName = 'Team Leader name is required';
        if (!formData.leaderEmail.trim() || !/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(formData.leaderEmail)) newErrors.leaderEmail = 'Valid email is required';
        if (!formData.leaderPhone.trim() || !/^[6-9]\d{9}$/.test(formData.leaderPhone.replace(/\D/g, ''))) newErrors.leaderPhone = 'Valid 10-digit phone required';
        if (!formData.leaderOrg.trim()) newErrors.leaderOrg = 'College / Organization is required';

        if (!formData.part2Name.trim()) newErrors.part2Name = 'Participant 2 name is required';
        if (!formData.part2Email.trim() || !/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(formData.part2Email)) newErrors.part2Email = 'Valid email is required';
        if (!formData.part2Phone.trim() || !/^[6-9]\d{9}$/.test(formData.part2Phone.replace(/\D/g, ''))) newErrors.part2Phone = 'Valid 10-digit phone required';
        if (!formData.part2Org.trim()) newErrors.part2Org = 'College / Organization is required';

        // Participant 3 is optional, but if they enter a name, they must provide the rest
        if (formData.part3Name.trim()) {
            if (!formData.part3Email.trim() || !/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(formData.part3Email)) newErrors.part3Email = 'Valid email is required for Participant 3';
            if (!formData.part3Phone.trim() || !/^[6-9]\d{9}$/.test(formData.part3Phone.replace(/\D/g, ''))) newErrors.part3Phone = 'Valid phone required for Participant 3';
            if (!formData.part3Org.trim()) newErrors.part3Org = 'College / Organization required for Participant 3';
        }

        if (!formData.agreedToRules) {
            newErrors.agreedToRules = 'You must agree to the guidelines to participate';
            toast.error('Please agree to the participant guidelines');
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleRegisterClick = () => {
        setShowForm(true);
        analytics.trackEvent('hackathon_registration_view', { page: '/livelihood-challenge' });
        setTimeout(() => {
            document.getElementById('registration-form-section')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validateForm()) return;

        analytics.trackEvent('hackathon_registration_started', { team_name: formData.teamName });
        
        setIsSubmitting(true);
        setPaymentStatus(null);
        
        const RazorpayInstance = (window as any).Razorpay;
        if (!RazorpayInstance) {
            toast.error("Razorpay SDK not loaded. Please refresh the page.");
            setIsSubmitting(false);
            return;
        }

        try {
            // 1. Call Backend Registration Endpoint
            const registerResponse = await fetch(`/api/hackathon/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    teamName: formData.teamName,
                    leaderName: formData.leaderName,
                    leaderEmail: formData.leaderEmail,
                    leaderPhone: formData.leaderPhone,
                    leaderOrg: formData.leaderOrg,
                    part2Name: formData.part2Name,
                    part2Email: formData.part2Email,
                    part2Phone: formData.part2Phone,
                    part2Org: formData.part2Org,
                    part3Name: formData.part3Name || null,
                    part3Email: formData.part3Email || null,
                    part3Phone: formData.part3Phone || null,
                    part3Org: formData.part3Org || null,
                    first_utm_source: sessionStorage.getItem('kottravai_first_utm_source') || localStorage.getItem('kottravai_first_utm_source') || 'direct',
                    first_utm_medium: sessionStorage.getItem('kottravai_first_utm_medium') || localStorage.getItem('kottravai_first_utm_medium') || 'none',
                    first_utm_campaign: sessionStorage.getItem('kottravai_first_utm_campaign') || localStorage.getItem('kottravai_first_utm_campaign') || 'none',
                    first_utm_term: sessionStorage.getItem('kottravai_first_utm_term') || localStorage.getItem('kottravai_first_utm_term') || 'none',
                    first_utm_content: sessionStorage.getItem('kottravai_first_utm_content') || localStorage.getItem('kottravai_first_utm_content') || 'none',
                    session_utm_source: sessionStorage.getItem('kottravai_session_utm_source') || 'direct',
                    session_utm_medium: sessionStorage.getItem('kottravai_session_utm_medium') || 'none',
                    session_utm_campaign: sessionStorage.getItem('kottravai_session_utm_campaign') || 'none',
                    session_utm_term: sessionStorage.getItem('kottravai_session_utm_term') || 'none',
                    session_utm_content: sessionStorage.getItem('kottravai_session_utm_content') || 'none'
                })
            });

            if (!registerResponse.ok) {
                const err = await registerResponse.json();
                throw new Error(err.message || "Failed to create registration");
            }

            const regData = await registerResponse.json();
            
            analytics.trackEvent('hackathon_payment_initiated', { registration_id: regData.registration_id, amount: regData.amount });

            // 2. Open Razorpay
            const options: any = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID,
                amount: regData.amount,
                currency: regData.currency,
                name: "Kottravai",
                description: "Rural Livelihood Hackathon Registration",
                order_id: regData.order_id,
                handler: async (response: any) => {
                    setIsSubmitting(true);
                    
                    try {
                        // 3. Verify Payment
                        const verifyResponse = await fetch(`/api/hackathon/verify`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                registration_id: regData.registration_id
                            })
                        });

                        const verifyResult = await verifyResponse.json();

                        if (verifyResult.success) {
                            analytics.trackEvent('hackathon_payment_success', { payment_id: response.razorpay_payment_id });
                            analytics.trackEvent('hackathon_registration_completed', { team_name: formData.teamName });
                            
                            setPaymentStatus({
                                type: 'success',
                                message: 'Registration Successful',
                                data: {
                                    registrationId: regData.registration_id,
                                    teamName: formData.teamName,
                                    leaderName: formData.leaderName,
                                    fee: (regData.amount / 100).toString(),
                                    participants: formData.part3Name ? 3 : 2
                                }
                            });
                        } else {
                            throw new Error(verifyResult.message || "Payment verification failed");
                        }
                    } catch (error: any) {
                        analytics.trackEvent('hackathon_payment_failed', { reason: 'verification_failed', error: error.message });
                        setPaymentStatus({
                            type: 'error',
                            message: "Payment verification failed: " + error.message
                        });
                    }
                    setIsSubmitting(false);
                },
                prefill: {
                    name: formData.leaderName,
                    email: formData.leaderEmail,
                    contact: formData.leaderPhone
                },
                theme: { color: "#8E2A8B" },
                modal: {
                    ondismiss: function () {
                        setIsSubmitting(false);
                    }
                }
            };

            const rzp = new RazorpayInstance(options);
            rzp.on('payment.failed', function (response: any) {
                analytics.trackEvent('hackathon_payment_failed', { reason: 'razorpay_error', error: response.error.description });
                toast.error(response.error.description || "Payment failed");
            });
            rzp.open();
            
        } catch (error: any) {
            console.error("Hackathon Registration error:", error);
            toast.error(error.message || "Something went wrong. Please try again.");
            setIsSubmitting(false);
        }
    };

    return (
        <MainLayout>
            <Helmet>
                <title>Design the Next Livelihood | Kottravai</title>
                <meta name="description" content="India's Sustainable Livelihood Design Challenge 2026 organized by Kottravai, Luxentra, and Startup Singam." />
            </Helmet>

            {/* Hero Section */}
            <div className="w-full bg-[#f9f5ff]">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center px-4 md:px-8 pb-16 pt-8">
                    <div className="w-full md:w-2/3 md:pr-12">
                        <div className="inline-block bg-[#8E2A8B]/10 text-[#8E2A8B] px-4 py-2 rounded-full font-bold text-sm mb-6 tracking-wide uppercase">
                            Design Challenge 2026
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black text-[#2D1B4E] leading-tight mb-4">
                            DESIGN THE NEXT LIVELIHOOD
                        </h1>
                        <h2 className="text-2xl font-bold text-[#8E2A8B] mb-6">
                            RURAL LIVELIHOOD DESIGN HACKATHON 2026
                        </h2>
                        <p className="text-xl text-gray-700 mb-8 font-medium leading-relaxed border-l-4 border-[#8E2A8B] pl-4">
                            "This is not just a design competition."<br/><br/>
                            Selected ideas can move from concept to real products and real markets through the Kottravai ecosystem.
                        </p>
                        
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#8E2A8B]/20 mb-10 inline-block w-full max-w-lg">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-center gap-3 text-gray-700">
                                    <Target className="text-[#8E2A8B]" />
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase font-bold">Entry Fee</p>
                                        <p className="font-bold text-lg">₹1 per TEAM</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 text-gray-700">
                                    <MapPin className="text-[#8E2A8B]" />
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase font-bold">Venue</p>
                                        <p className="font-bold">VIT Chennai</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 text-gray-700">
                                    <Calendar className="text-[#8E2A8B]" />
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase font-bold">Registration Closes</p>
                                        <p className="font-bold">10 Sept 2026</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 text-gray-700">
                                    <Calendar className="text-[#8E2A8B]" />
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase font-bold">Event Date</p>
                                        <p className="font-bold">To Be Announced</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {!showForm && (
                            <div className="flex flex-col sm:flex-row gap-4">
                                <button 
                                    onClick={handleRegisterClick}
                                    className="bg-[#8E2A8B] text-white px-8 py-4 rounded-xl font-black text-lg hover:bg-[#2D1B4E] transition-colors duration-300 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                                >
                                    REGISTER YOUR TEAM – ₹1 <ArrowRight size={20} />
                                </button>
                                <button 
                                    onClick={() => document.getElementById('guidelines-section')?.scrollIntoView({ behavior: 'smooth' })}
                                    className="bg-white text-[#8E2A8B] border-2 border-[#8E2A8B] px-8 py-4 rounded-xl font-black text-lg hover:bg-gray-50 transition-colors duration-300 flex items-center justify-center gap-3"
                                >
                                    VIEW PARTICIPANT GUIDELINES
                                </button>
                            </div>
                        )}
                    </div>
                    
                    <div className="w-full md:w-1/3 mt-12 md:mt-0 flex justify-center">
                        <img 
                            src="/WhatsApp%20Image%202026-08-26%20at%2022.58.57.jpeg" 
                            alt="Hackathon Poster" 
                            className="w-full max-w-[350px] h-auto object-cover rounded-3xl shadow-2xl border-4 border-white transform rotate-2 hover:rotate-0 transition-transform duration-500" 
                        />
                    </div>
                </div>
            </div>

            {/* About the Challenge */}
            <div className="max-w-7xl mx-auto py-16 px-4 lg:px-8">
                <div className="text-center mb-10">
                    <h2 className="text-3xl md:text-4xl font-black text-[#2D1B4E] mb-6">About the Challenge</h2>
                    <p className="text-xl text-gray-700 max-w-3xl mx-auto">
                        The objective is to design products that can be made by rural women, sold in real markets, and create sustainable income.
                    </p>
                </div>
                
                <div className="flex justify-center max-w-4xl mx-auto">
                    <img 
                        src="/ChatGPT%20Image%20Aug%2027,%202026,%2012_41_56%20PM.png" 
                        alt="Idea to Income Flow" 
                        className="w-full h-auto object-contain rounded-3xl"
                    />
                </div>
            </div>

            {/* Who Can Participate & What Participants Create */}
            <div className="bg-[#fcf9ef] py-16 px-4 lg:px-8">
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="bg-white p-8 rounded-3xl shadow-sm">
                        <h3 className="text-2xl font-black text-[#2D1B4E] mb-6">Who Can Participate?</h3>
                        <p className="text-[#8E2A8B] font-bold mb-6 bg-[#8E2A8B]/10 inline-block px-4 py-2 rounded-lg">Team size: 2–3 participants per team</p>
                        <ul className="grid grid-cols-2 gap-y-4 gap-x-2">
                            {whoCanParticipate.map(person => (
                                <li key={person} className="flex items-center gap-2 text-gray-700 font-medium">
                                    <div className="w-2 h-2 rounded-full bg-[#8E2A8B]"></div>
                                    {person}
                                </li>
                            ))}
                        </ul>
                    </div>
                    
                    <div className="bg-white p-8 rounded-3xl shadow-sm">
                        <h3 className="text-2xl font-black text-[#2D1B4E] mb-6">What You Will Create</h3>
                        <p className="text-gray-700 mb-6 leading-relaxed">
                            Develop a practical product concept/prototype that can:
                        </p>
                        <ul className="space-y-4">
                            {["Create livelihood opportunities", "Have commercial potential", "Demonstrate good design", "Be sustainable and scalable"].map(item => (
                                <li key={item} className="flex items-start gap-3">
                                    <CheckCircle className="text-green-500 flex-shrink-0 mt-0.5" size={20} />
                                    <span className="text-gray-700 font-medium">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            {/* Local Materials */}
            <div className="max-w-7xl mx-auto py-16 px-4 lg:px-8">
                <div className="flex justify-center max-w-5xl mx-auto">
                    <img 
                        src="/ChatGPT%20Image%20Aug%2027,%202026,%2012_46_55%20PM.png" 
                        alt="10 Local Materials" 
                        className="w-full h-auto object-contain rounded-3xl"
                    />
                </div>
            </div>

            {/* Judging & Benefits */}
            <div className="bg-[#2D1B4E] py-16 px-4 lg:px-8 text-white">
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16">
                    <div>
                        <h2 className="text-3xl font-black mb-8">Judging Criteria</h2>
                        <div className="space-y-6">
                            {[
                                { name: 'Livelihood Impact', val: '30%' },
                                { name: 'Commercial Potential', val: '30%' },
                                { name: 'Design Excellence', val: '20%' },
                                { name: 'Sustainability & Scalability', val: '20%' }
                            ].map(crit => (
                                <div key={crit.name} className="flex items-center justify-between border-b border-white/20 pb-4">
                                    <span className="text-lg font-medium">{crit.name}</span>
                                    <span className="text-2xl font-black text-[#f1c40f]">{crit.val}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div>
                        <h2 className="text-3xl font-black mb-8">Winner Benefits</h2>
                        <div className="bg-white/10 p-8 rounded-3xl backdrop-blur-sm">
                            <ul className="space-y-4 mb-6">
                                {["Prototype Development", "Product Refinement", "Manufacturing Opportunity through Kottravai", "Design Licensing Royalty on Commercial Sales*", "Recognition as a Kottravai Design Innovator"].map(benefit => (
                                    <li key={benefit} className="flex items-start gap-3">
                                        <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#f1c40f] flex-shrink-0"></div>
                                        <span className="text-white/90 font-medium">{benefit}</span>
                                    </li>
                                ))}
                            </ul>
                            <p className="text-xs text-white/60 mb-4">*Subject to mutually agreed licensing terms.</p>
                            <div className="flex items-start gap-3 p-4 bg-[#8E2A8B]/50 rounded-xl border border-white/10">
                                <Info className="flex-shrink-0 text-[#f1c40f]" size={20} />
                                <p className="text-sm font-medium">There are no conventional cash prizes. The focus is on helping selected ideas move toward real products, production and market readiness. A maximum of 3–5 teams may be selected.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Participant Guidelines */}
            <div id="guidelines-section" className="max-w-7xl mx-auto py-16 px-4 lg:px-8">
                <h2 className="text-3xl font-black text-[#2D1B4E] mb-10 text-center">Participant Guidelines</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div>
                        <h3 className="text-xl font-bold text-[#8E2A8B] mb-4 border-b pb-2">Event Information</h3>
                        <ul className="space-y-3 text-gray-700">
                            <li><span className="font-bold">Registration Fee:</span> ₹1 / team</li>
                            <li><span className="font-bold">Registration Closes:</span> 10 September 2026</li>
                            <li><span className="font-bold">Venue:</span> VIT Chennai</li>
                            <li><span className="font-bold">Event Date:</span> To Be Announced</li>
                            <li><span className="font-bold">Event Time:</span> 10:00 AM – approx 6:00 PM</li>
                            <li><span className="font-bold">Team Size:</span> 2–3 participants</li>
                        </ul>

                        <h3 className="text-xl font-bold text-[#8E2A8B] mb-4 border-b pb-2 mt-8">What to Bring</h3>
                        <ul className="list-disc pl-5 space-y-2 text-gray-700">
                            <li>Team members</li>
                            <li>Initial concept/idea</li>
                            <li>Sketches/references if available</li>
                            <li>Laptop if required</li>
                            <li>Personal design/prototyping tools where required</li>
                            <li>Any specific tools/materials needed for their concept</li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="text-xl font-bold text-[#8E2A8B] mb-4 border-b pb-2">Participant Expectations</h3>
                        <ul className="list-disc pl-5 space-y-2 text-gray-700">
                            <li>Work collaboratively.</li>
                            <li>Respect other participants, volunteers and organizers.</li>
                            <li>Follow venue/event rules and maintain discipline.</li>
                            <li>Use provided materials responsibly.</li>
                            <li>Complete the prototype/presentation within the allotted time.</li>
                            <li>Submit original work.</li>
                            <li>Be available for jury evaluation and presentation.</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Registration Form */}
            {paymentStatus?.type === 'success' ? (
                <div className="max-w-4xl mx-auto py-16 px-4 mb-16">
                    <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-10 md:p-16 text-center">
                        <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-sm">
                            <CheckCircle size={48} />
                        </div>
                        <h2 className="text-3xl md:text-4xl font-black text-[#2D1B4E] mb-4">REGISTRATION SUCCESSFUL</h2>
                        <p className="text-xl font-bold text-gray-800 mb-2">Congratulations!</p>
                        <p className="text-lg text-gray-600 mb-8">Your team has been successfully registered for the Rural Livelihood Design Hackathon 2026.</p>
                        
                        <div className="bg-gray-50 rounded-2xl p-6 text-left max-w-lg mx-auto mb-8 border border-gray-200">
                            <div className="grid grid-cols-2 gap-y-4 text-gray-700">
                                <div className="text-sm font-bold text-gray-500 uppercase">Registration ID</div>
                                <div className="font-bold text-gray-900">{paymentStatus.data.registrationId}</div>
                                
                                <div className="text-sm font-bold text-gray-500 uppercase">Team Name</div>
                                <div className="font-bold text-gray-900">{paymentStatus.data.teamName}</div>
                                
                                <div className="text-sm font-bold text-gray-500 uppercase">Team Leader</div>
                                <div className="font-bold text-gray-900">{paymentStatus.data.leaderName}</div>
                                
                                <div className="text-sm font-bold text-gray-500 uppercase">Participants</div>
                                <div className="font-bold text-gray-900">{paymentStatus.data.participants}</div>
                                
                                <div className="text-sm font-bold text-gray-500 uppercase">Amount Paid</div>
                                <div className="font-bold text-green-600">₹{paymentStatus.data.fee}</div>
                                
                                <div className="text-sm font-bold text-gray-500 uppercase">Payment Status</div>
                                <div className="font-bold text-green-600 uppercase">Paid</div>
                                
                                <div className="text-sm font-bold text-gray-500 uppercase">Venue</div>
                                <div className="font-bold text-gray-900">VIT Chennai</div>
                            </div>
                        </div>
                        
                        <p className="text-sm font-bold text-[#8E2A8B] mb-8 bg-[#8E2A8B]/10 py-3 px-4 rounded-xl inline-block">
                            Please retain this registration confirmation for your records.
                        </p>
                    </div>
                </div>
            ) : (
                <div id="registration-form-section" className="max-w-5xl mx-auto py-16 px-4 mb-16 scroll-mt-24">
                    {showForm ? (
                        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 md:p-12">
                            <div className="text-center mb-10">
                                <h2 className="text-3xl font-black text-[#2D1B4E] mb-4">Team Registration</h2>
                                <p className="text-gray-500 font-bold bg-gray-100 py-2 px-6 rounded-full inline-block">
                                    REGISTRATION FEE: ₹1 PER TEAM
                                </p>
                            </div>

                            <form className="space-y-10" onSubmit={handleSubmit}>
                                {paymentStatus?.type === 'error' && (
                                    <div className="p-4 rounded-xl flex items-start gap-3 bg-red-50 text-red-800 border border-red-100">
                                        <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
                                        <p className="font-medium text-sm">{paymentStatus.message}</p>
                                    </div>
                                )}

                                {/* Team Info */}
                                <div>
                                    <h3 className="text-xl font-black text-[#8E2A8B] mb-4 border-b pb-2">Team Information</h3>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Team Name <span className="text-red-500">*</span></label>
                                        <input type="text" name="teamName" value={formData.teamName} onChange={handleInputChange} disabled={isSubmitting} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#8E2A8B] outline-none" placeholder="Enter Team Name" />
                                        {errors.teamName && <p className="text-red-500 text-xs font-bold mt-1">{errors.teamName}</p>}
                                    </div>
                                </div>

                                {/* Team Leader */}
                                <div>
                                    <h3 className="text-xl font-black text-[#8E2A8B] mb-4 border-b pb-2">Team Leader</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">Full Name <span className="text-red-500">*</span></label>
                                            <input type="text" name="leaderName" value={formData.leaderName} onChange={handleInputChange} disabled={isSubmitting} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#8E2A8B] outline-none" placeholder="Leader's Name" />
                                            {errors.leaderName && <p className="text-red-500 text-xs font-bold mt-1">{errors.leaderName}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">Email Address <span className="text-red-500">*</span></label>
                                            <input type="email" name="leaderEmail" value={formData.leaderEmail} onChange={handleInputChange} disabled={isSubmitting} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#8E2A8B] outline-none" placeholder="Leader's Email" />
                                            {errors.leaderEmail && <p className="text-red-500 text-xs font-bold mt-1">{errors.leaderEmail}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">Phone Number <span className="text-red-500">*</span></label>
                                            <input type="tel" name="leaderPhone" value={formData.leaderPhone} onChange={handleInputChange} disabled={isSubmitting} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#8E2A8B] outline-none" placeholder="Leader's Phone" />
                                            {errors.leaderPhone && <p className="text-red-500 text-xs font-bold mt-1">{errors.leaderPhone}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">College/Organization <span className="text-red-500">*</span></label>
                                            <input type="text" name="leaderOrg" value={formData.leaderOrg} onChange={handleInputChange} disabled={isSubmitting} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#8E2A8B] outline-none" placeholder="Leader's Organization" />
                                            {errors.leaderOrg && <p className="text-red-500 text-xs font-bold mt-1">{errors.leaderOrg}</p>}
                                        </div>
                                    </div>
                                </div>

                                {/* Participant 2 */}
                                <div>
                                    <h3 className="text-xl font-black text-[#8E2A8B] mb-4 border-b pb-2">Participant 2</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">Full Name <span className="text-red-500">*</span></label>
                                            <input type="text" name="part2Name" value={formData.part2Name} onChange={handleInputChange} disabled={isSubmitting} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#8E2A8B] outline-none" placeholder="Participant 2 Name" />
                                            {errors.part2Name && <p className="text-red-500 text-xs font-bold mt-1">{errors.part2Name}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">Email Address <span className="text-red-500">*</span></label>
                                            <input type="email" name="part2Email" value={formData.part2Email} onChange={handleInputChange} disabled={isSubmitting} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#8E2A8B] outline-none" placeholder="Participant 2 Email" />
                                            {errors.part2Email && <p className="text-red-500 text-xs font-bold mt-1">{errors.part2Email}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">Phone Number <span className="text-red-500">*</span></label>
                                            <input type="tel" name="part2Phone" value={formData.part2Phone} onChange={handleInputChange} disabled={isSubmitting} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#8E2A8B] outline-none" placeholder="Participant 2 Phone" />
                                            {errors.part2Phone && <p className="text-red-500 text-xs font-bold mt-1">{errors.part2Phone}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">College/Organization <span className="text-red-500">*</span></label>
                                            <input type="text" name="part2Org" value={formData.part2Org} onChange={handleInputChange} disabled={isSubmitting} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#8E2A8B] outline-none" placeholder="Participant 2 Organization" />
                                            {errors.part2Org && <p className="text-red-500 text-xs font-bold mt-1">{errors.part2Org}</p>}
                                        </div>
                                    </div>
                                </div>

                                {/* Participant 3 (Optional) */}
                                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
                                    <h3 className="text-xl font-black text-gray-500 mb-4 border-b border-gray-300 pb-2 flex justify-between">
                                        <span>Participant 3</span>
                                        <span className="text-xs uppercase bg-gray-200 px-3 py-1 rounded-full text-gray-600">Optional</span>
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">Full Name</label>
                                            <input type="text" name="part3Name" value={formData.part3Name} onChange={handleInputChange} disabled={isSubmitting} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#8E2A8B] outline-none bg-white" placeholder="Participant 3 Name" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">Email Address</label>
                                            <input type="email" name="part3Email" value={formData.part3Email} onChange={handleInputChange} disabled={isSubmitting} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#8E2A8B] outline-none bg-white" placeholder="Participant 3 Email" />
                                            {errors.part3Email && <p className="text-red-500 text-xs font-bold mt-1">{errors.part3Email}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">Phone Number</label>
                                            <input type="tel" name="part3Phone" value={formData.part3Phone} onChange={handleInputChange} disabled={isSubmitting} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#8E2A8B] outline-none bg-white" placeholder="Participant 3 Phone" />
                                            {errors.part3Phone && <p className="text-red-500 text-xs font-bold mt-1">{errors.part3Phone}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">College/Organization</label>
                                            <input type="text" name="part3Org" value={formData.part3Org} onChange={handleInputChange} disabled={isSubmitting} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#8E2A8B] outline-none bg-white" placeholder="Participant 3 Organization" />
                                            {errors.part3Org && <p className="text-red-500 text-xs font-bold mt-1">{errors.part3Org}</p>}
                                        </div>
                                    </div>
                                </div>

                                {/* Terms & Submission */}
                                <div className="pt-8 border-t border-gray-100">
                                    <div className="flex items-start gap-3 mb-8 bg-[#8E2A8B]/5 p-4 rounded-xl border border-[#8E2A8B]/20">
                                        <input
                                            type="checkbox"
                                            id="agreedToRules"
                                            name="agreedToRules"
                                            checked={formData.agreedToRules}
                                            onChange={handleInputChange}
                                            className="mt-1 w-5 h-5 rounded border-gray-300 text-[#8E2A8B] focus:ring-[#8E2A8B]"
                                        />
                                        <label htmlFor="agreedToRules" className="text-sm font-medium text-gray-800 leading-relaxed cursor-pointer">
                                            <span className="text-red-500">*</span> I have read and agree to the Participant Guidelines and Hackathon rules. I understand the registration fee is ₹1 per team.
                                        </label>
                                    </div>
                                    
                                    <button 
                                        type="submit" 
                                        disabled={isSubmitting}
                                        className="bg-[#8E2A8B] text-white px-10 py-5 rounded-xl font-black text-lg w-full md:w-auto shadow-lg hover:shadow-xl hover:-translate-y-1 hover:bg-[#2D1B4E] transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:-translate-y-0 disabled:hover:shadow-lg flex items-center justify-center gap-3 mx-auto"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 size={24} className="animate-spin" />
                                                Processing Payment...
                                            </>
                                        ) : (
                                            "Pay ₹1 & Register Team"
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    ) : (
                        <div className="text-center">
                            <button 
                                onClick={handleRegisterClick}
                                className="bg-[#8E2A8B] text-white px-12 py-5 rounded-full font-black text-2xl hover:bg-[#2D1B4E] transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-2 inline-flex items-center gap-3"
                            >
                                REGISTER YOUR TEAM – ₹1 <ArrowRight size={24} />
                            </button>
                        </div>
                    )}
                </div>
            )}
        </MainLayout>
    );
};

export default LivelihoodChallenge;
