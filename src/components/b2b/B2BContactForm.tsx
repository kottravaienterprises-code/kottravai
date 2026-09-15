import { useState, FormEvent } from 'react';
import { Send, Phone, Mail, MessageCircle } from 'lucide-react';
import { captureLead } from '@/services/leadService';

const B2BContactForm = () => {
    const [formData, setFormData] = useState({
        name: '',
        company: '',
        email: '',
        phone: '',
        businessType: '',
        products: '',
        quantity: '',
        requirement: ''
    });

    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setStatus('loading');
        setMessage('');

        try {
            // Sending original fields plus new ones (businessType, requirement)
            // Backend in index.js was updated to accept businessType and requirement if present.
            // If backend isn't updated yet, it safely ignores them or we can map them to notes/location.
            // As per instructions, "Keep existing fields working... Add new fields only where necessary... If backend changes are required, make the smallest safe backward-compatible change."
            const payload = {
                name: formData.name,
                company: formData.company,
                email: formData.email,
                phone: formData.phone,
                location: formData.businessType || 'N/A', // fallback map for older backend
                products: formData.products,
                quantity: formData.quantity,
                notes: formData.requirement, // fallback map for older backend
                businessType: formData.businessType,
                requirement: formData.requirement
            };

            const response = await fetch('/api/b2b-inquiry', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (response.ok) {
                setStatus('success');
                setMessage('Thank you! We received your inquiry and will contact you soon.');
                
                // Silent Lead Capture
                captureLead({
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone,
                    company_name: formData.company,
                    source: 'b2b_inquiry',
                    notes: `Business Type: ${formData.businessType}. Products: ${formData.products}. Quantity: ${formData.quantity}. Requirement: ${formData.requirement}`,
                }).catch(() => {});
                
                setFormData({
                    name: '', company: '', email: '', phone: '',
                    businessType: '', products: '', quantity: '', requirement: ''
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

    return (
        <section className="py-16 md:py-24 bg-white" id="b2b-enquiry">
            <div className="container mx-auto px-4 max-w-6xl">
                <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-gray-100 overflow-hidden flex flex-col lg:flex-row">
                    
                    {/* Direct Contact Side (Left) */}
                    <div className="lg:w-1/3 bg-[#2D1B4E] text-white p-10 md:p-12 flex flex-col justify-between" id="b2b-direct-contact">
                        <div>
                            <div className="inline-flex items-center gap-2 bg-white/10 text-white px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-6">
                                Get In Touch
                            </div>
                            <h3 className="text-3xl font-bold mb-6 font-outfit">Talk to Our Team</h3>
                            <p className="text-white/80 mb-10 leading-relaxed font-medium">
                                Ready to scale your impact with sustainable gifting? Reach out directly or fill the form.
                            </p>
                        </div>
                        
                        <div className="space-y-8">
                            <a href="mailto:b2b@kottravai.in" className="flex items-center gap-4 group">
                                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white group-hover:bg-[#8E2A8B] transition-colors">
                                    <Mail size={20} />
                                </div>
                                <div>
                                    <p className="text-xs text-white/50 uppercase tracking-wider font-bold mb-1">Email Us</p>
                                    <p className="font-medium">b2b@kottravai.in</p>
                                </div>
                            </a>
                            
                            <a href="tel:+919787030811" className="flex items-center gap-4 group">
                                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white group-hover:bg-[#8E2A8B] transition-colors">
                                    <Phone size={20} />
                                </div>
                                <div>
                                    <p className="text-xs text-white/50 uppercase tracking-wider font-bold mb-1">Call Us</p>
                                    <p className="font-medium">+91 97870 30811</p>
                                </div>
                            </a>
                            
                            <a href="https://wa.me/919787030811?text=Hi%20Kottravai,%20I'm%20interested%20in%20B2B%20Partnerships." target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 group">
                                <div className="w-12 h-12 rounded-full bg-[#25D366]/20 flex items-center justify-center text-[#25D366] group-hover:bg-[#25D366] group-hover:text-white transition-colors">
                                    <MessageCircle size={20} />
                                </div>
                                <div>
                                    <p className="text-xs text-[#25D366]/70 uppercase tracking-wider font-bold mb-1">WhatsApp</p>
                                    <p className="font-medium text-[#25D366]">+91 97870 30811</p>
                                </div>
                            </a>
                        </div>
                    </div>
                    
                    {/* Enquiry Form (Right) */}
                    <div className="lg:w-2/3 p-10 md:p-12">
                        <div className="mb-8">
                            <h3 className="text-3xl font-bold text-[#2D1B4E] mb-2 font-outfit">Request a Quote</h3>
                            <p className="text-gray-500 font-medium">Fill out the details below and we'll get back to you within 24 hours.</p>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="grid md:grid-cols-2 gap-5">
                                <div>
                                    <label htmlFor="name" className="block text-xs font-bold text-[#2D1B4E] uppercase tracking-wider mb-2">Name *</label>
                                    <input
                                        id="name"
                                        type="text" required
                                        className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#8E2A8B] focus:bg-white transition-colors font-medium text-gray-700"
                                        value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="company" className="block text-xs font-bold text-[#2D1B4E] uppercase tracking-wider mb-2">Company *</label>
                                    <input
                                        id="company"
                                        type="text" required
                                        className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#8E2A8B] focus:bg-white transition-colors font-medium text-gray-700"
                                        value={formData.company} onChange={e => setFormData({ ...formData, company: e.target.value })}
                                    />
                                </div>
                            </div>
                            
                            <div className="grid md:grid-cols-2 gap-5">
                                <div>
                                    <label htmlFor="email" className="block text-xs font-bold text-[#2D1B4E] uppercase tracking-wider mb-2">Work Email *</label>
                                    <input
                                        id="email"
                                        type="email" required
                                        className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#8E2A8B] focus:bg-white transition-colors font-medium text-gray-700"
                                        value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="phone" className="block text-xs font-bold text-[#2D1B4E] uppercase tracking-wider mb-2">Phone Number *</label>
                                    <input
                                        id="phone"
                                        type="tel" required
                                        className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#8E2A8B] focus:bg-white transition-colors font-medium text-gray-700"
                                        value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>
                            </div>
                            
                            <div className="grid md:grid-cols-2 gap-5">
                                <div>
                                    <label htmlFor="businessType" className="block text-xs font-bold text-[#2D1B4E] uppercase tracking-wider mb-2">Business Type *</label>
                                    <select
                                        id="businessType" required
                                        className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#8E2A8B] focus:bg-white transition-colors font-medium text-gray-700 appearance-none"
                                        value={formData.businessType} onChange={e => setFormData({ ...formData, businessType: e.target.value })}
                                    >
                                        <option value="" disabled>Select your business type</option>
                                        <option value="Corporate / Enterprise">Corporate / Enterprise</option>
                                        <option value="Retail / Boutique">Retail / Boutique</option>
                                        <option value="Hospitality / Hotel">Hospitality / Hotel</option>
                                        <option value="Event Planner">Event Planner</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="products" className="block text-xs font-bold text-[#2D1B4E] uppercase tracking-wider mb-2">Products Interested In *</label>
                                    <input
                                        id="products"
                                        type="text" required placeholder="e.g. Hampers, Coconut Shell"
                                        className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#8E2A8B] focus:bg-white transition-colors font-medium text-gray-700"
                                        value={formData.products} onChange={e => setFormData({ ...formData, products: e.target.value })}
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <label htmlFor="quantity" className="block text-xs font-bold text-[#2D1B4E] uppercase tracking-wider mb-2">Estimated Quantity *</label>
                                <input
                                    id="quantity"
                                    type="text" required placeholder="e.g. 500 units"
                                    className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#8E2A8B] focus:bg-white transition-colors font-medium text-gray-700"
                                    value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                                />
                            </div>
                            
                            <div>
                                <label htmlFor="requirement" className="block text-xs font-bold text-[#2D1B4E] uppercase tracking-wider mb-2">Requirement / Notes</label>
                                <textarea
                                    id="requirement"
                                    rows={4} placeholder="Please provide any specific requirements, budget, or timeline..."
                                    className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#8E2A8B] focus:bg-white transition-colors font-medium text-gray-700 resize-none"
                                    value={formData.requirement} onChange={e => setFormData({ ...formData, requirement: e.target.value })}
                                ></textarea>
                            </div>

                            <button 
                                type="submit" 
                                disabled={status === 'loading'}
                                className="w-full bg-[#8E2A8B] text-white font-bold py-4 rounded-xl hover:bg-[#6D1E6A] transition-all flex items-center justify-center gap-2 shadow-xl shadow-[#8E2A8B]/20 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {status === 'loading' ? 'Sending Inquiry...' : (
                                    <>
                                        <Send size={18} /> Request a Quote
                                    </>
                                )}
                            </button>
                            
                            {message && (
                                <div className={`p-4 rounded-xl text-sm font-bold flex items-center justify-center ${status === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                    {message}
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default B2BContactForm;
