import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import MainLayout from '@/layouts/MainLayout';
import { API_BASE } from '@/config/api';
import toast from 'react-hot-toast';
import {
  User, Phone, Mail, Shield,
  Heart, AlertTriangle, Leaf, CheckCircle, ChevronDown, Loader2
} from 'lucide-react';

const CAMP_FEE = 500;

const initialForm = {
  name: '',
  age: '',
  gender: '',
  email: '',
  whatsapp: '',
  place: '',
  profession: '',
  emergencyName: '',
  emergencyPhone: '',
  allergies: '',
  medicalConditions: '',
  physicalActivities: '',
  heardAbout: '',
  heardAboutOther: '',
  whyJoin: '',
  whyJoinOther: '',
  consent: false,
  futureCamps: '',
};

const HEARD_OPTIONS = [
  'WhatsApp', 'Instagram', 'Facebook', 'Friend', 'Kottravai', 'Govardhan Foundation', 'Other'
];
const WHY_JOIN_OPTIONS = [
  'Stress relief', 'Connect with nature', 'Meet like-minded people', 'Personal growth', 'Curiosity', 'Other'
];

const FormSection: React.FC<{ icon: React.ReactNode; title: string; subtitle?: string; children: React.ReactNode }> = ({
  icon, title, subtitle, children
}) => (
  <div className="mb-10">
    <div className="flex items-center gap-3 mb-6">
      <div className="p-2.5 bg-[#8E2A8B]/10 text-[#8E2A8B] rounded-xl">{icon}</div>
      <div>
        <h3 className="text-lg font-black text-[#2D1B4E]">{title}</h3>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
    <div className="space-y-5">{children}</div>
  </div>
);

const InputField: React.FC<{
  label: string; required?: boolean; children: React.ReactNode;
}> = ({ label, required, children }) => (
  <div>
    <label className="block text-sm font-bold text-gray-700 mb-2">
      {label} {required && <span className="text-[#8E2A8B]">*</span>}
    </label>
    {children}
  </div>
);

const inputCls = `w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#8E2A8B]/30
  focus:border-[#8E2A8B] outline-none transition-all bg-white text-gray-800 placeholder-gray-400`;

export default function CampusPage() {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Ensure Razorpay script is loaded
  useEffect(() => {
    if (!(window as any).Razorpay) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setForm(prev => ({ ...prev, [name]: val }));
  };

  const validate = () => {
    if (!form.name.trim()) { toast.error('Please enter your name'); return false; }
    if (!form.age || isNaN(Number(form.age)) || Number(form.age) < 10) { toast.error('Please enter a valid age'); return false; }
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { toast.error('Please enter a valid email'); return false; }
    if (!form.whatsapp.trim() || !/^\d{10}$/.test(form.whatsapp)) { toast.error('Please enter a valid 10-digit WhatsApp number'); return false; }
    if (!form.place.trim()) { toast.error('Please enter your place / city'); return false; }
    if (!form.profession.trim()) { toast.error('Please enter your profession'); return false; }
    if (!form.emergencyName.trim()) { toast.error('Please enter emergency contact name'); return false; }
    if (!form.emergencyPhone.trim() || !/^\d{10}$/.test(form.emergencyPhone)) { toast.error('Please enter a valid emergency contact number'); return false; }
    if (!form.physicalActivities) { toast.error('Please answer the physical activities question'); return false; }
    if (!form.consent) { toast.error('Please agree to the consent statement'); return false; }
    return true;
  };

  const handlePayAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const RazorpayInstance = (window as any).Razorpay;
    if (!RazorpayInstance) {
      toast.error('Payment gateway not loaded. Please refresh the page.');
      return;
    }

    setSubmitting(true);

    try {
      // 1. Create Razorpay order
      const orderRes = await fetch(`${API_BASE}/api/campus/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: CAMP_FEE }),
      });

      if (!orderRes.ok) throw new Error('Failed to create payment order');
      const order = await orderRes.json();

      // 2. Open Razorpay
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: 'INR',
        name: 'மண் வாசம் Camp',
        description: 'மண் வாசம் Nature Camp Registration',
        order_id: order.id,
        prefill: { name: form.name, email: form.email, contact: form.whatsapp },
        theme: { color: '#8E2A8B' },
        handler: async (response: any) => {
          setSubmitting(true);
          try {
            const verifyRes = await fetch(`${API_BASE}/api/campus/register`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                formData: form,
                paymentId: response.razorpay_payment_id,
                orderId: response.razorpay_order_id,
                signature: response.razorpay_signature,
              }),
            });
            const result = await verifyRes.json();
            if (result.success) {
              setSuccess(true);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
              toast.error(result.error || 'Registration failed. Please contact support.');
            }
          } catch (err) {
            toast.error('Registration failed after payment. Please contact us with your payment ID.');
          } finally {
            setSubmitting(false);
          }
        },
        modal: {
          ondismiss: () => setSubmitting(false),
        },
      };

      const rzp = new RazorpayInstance(options);
      rzp.on('payment.failed', (response: any) => {
        toast.error('Payment failed: ' + response.error.description);
        setSubmitting(false);
      });
      rzp.open();
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-gradient-to-br from-[#f9f5ff] via-white to-[#f0faf0] flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-white rounded-3xl shadow-xl border border-gray-100 p-10 text-center">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={40} className="text-emerald-500" />
            </div>
            <h1 className="text-3xl font-black text-[#2D1B4E] mb-4">You're Registered! 🌿</h1>
            <p className="text-gray-600 leading-relaxed mb-6">
              Thank you for joining <strong>மண் வாசம்</strong>! A confirmation email with all camp details
              has been sent to <strong>{form.email}</strong>. We look forward to seeing you!
            </p>
            <div className="bg-[#8E2A8B]/5 rounded-2xl p-5 mb-6 text-left space-y-2">
              <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                <User size={16} className="text-[#8E2A8B]" /> {form.name}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail size={16} className="text-[#8E2A8B]" /> {form.email}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone size={16} className="text-[#8E2A8B]" /> {form.whatsapp}
              </div>
            </div>
            <p className="text-sm text-gray-400">
              Questions? Reach us on WhatsApp or at info@kottravai.in
            </p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Helmet>
        <title>மண் வாசம் Camp Registration | Kottravai</title>
        <meta name="description" content="Register for the மண் வாசம் nature camp — a grounded, immersive experience of nature, community, and mindful living." />
        <link rel="canonical" href={`${import.meta.env.VITE_SITE_URL || 'https://www.kottravai.in'}/campus`} />
        <meta property="og:title" content="மண் வாசம் Camp Registration | Kottravai" />
        <meta property="og:description" content="Register for the மண் வாசம் nature camp — a grounded, immersive experience of nature, community, and mindful living." />
        <meta property="og:url" content={`${import.meta.env.VITE_SITE_URL || 'https://www.kottravai.in'}/campus`} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content={`${import.meta.env.VITE_SITE_URL || 'https://www.kottravai.in'}/images/nature_camp_banner.png`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="மண் வாசம் Camp Registration | Kottravai" />
        <meta name="twitter:description" content="Register for the மண் வாசம் nature camp — a grounded, immersive experience of nature, community, and mindful living." />
        <meta name="twitter:image" content={`${import.meta.env.VITE_SITE_URL || 'https://www.kottravai.in'}/images/nature_camp_banner.png`} />
      </Helmet>

      <div className="w-full">
        <img 
          src="/images/nature_camp_banner.png" 
          alt="Nature Camp" 
          className="w-full h-auto max-h-[60vh] object-cover" 
        />
      </div>

      <div className="bg-gradient-to-br from-[#f9f5ff] via-white to-[#f0faf0] min-h-screen">
        <div className="max-w-3xl mx-auto px-4 py-12">
          <form onSubmit={handlePayAndRegister} className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 md:p-12">

            {/* Section 1: Essential */}
            <FormSection icon={<User size={20} />} title="Essential Details" subtitle="Tell us about yourself">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <InputField label="Full Name" required>
                  <input name="name" type="text" required value={form.name} onChange={handleChange}
                    className={inputCls} placeholder="Your full name" />
                </InputField>
                <InputField label="Age" required>
                  <input name="age" type="number" required min={10} max={100} value={form.age} onChange={handleChange}
                    className={inputCls} placeholder="Your age" />
                </InputField>
              </div>

              <InputField label="Gender (Optional)">
                <div className="relative">
                  <select name="gender" value={form.gender} onChange={handleChange} className={`${inputCls} appearance-none`}>
                    <option value="">Prefer not to say</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="non-binary">Non-binary</option>
                    <option value="other">Other</option>
                  </select>
                  <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </InputField>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <InputField label="Email Address" required>
                  <input name="email" type="email" required value={form.email} onChange={handleChange}
                    className={inputCls} placeholder="your@email.com" />
                </InputField>
                <InputField label="WhatsApp Number" required>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">+91</span>
                    <input name="whatsapp" type="tel" required maxLength={10} value={form.whatsapp} onChange={handleChange}
                      className={`${inputCls} pl-14`} placeholder="10-digit number" />
                  </div>
                </InputField>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <InputField label="Place / City" required>
                  <input name="place" type="text" required value={form.place} onChange={handleChange}
                    className={inputCls} placeholder="Your city or town" />
                </InputField>
                <InputField label="Profession" required>
                  <input name="profession" type="text" required value={form.profession} onChange={handleChange}
                    className={inputCls} placeholder="e.g. Software Engineer, Farmer..." />
                </InputField>
              </div>
            </FormSection>

            {/* Divider */}
            <div className="border-t border-gray-100 my-8" />

            {/* Section 2: Emergency & Health */}
            <FormSection icon={<Shield size={20} />} title="Safety & Health"
              subtitle="This helps us keep you safe during the camp">

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <InputField label="Emergency Contact Name" required>
                  <input name="emergencyName" type="text" required value={form.emergencyName} onChange={handleChange}
                    className={inputCls} placeholder="Name of someone we can reach" />
                </InputField>
                <InputField label="Emergency Contact Number" required>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">+91</span>
                    <input name="emergencyPhone" type="tel" required maxLength={10} value={form.emergencyPhone} onChange={handleChange}
                      className={`${inputCls} pl-14`} placeholder="10-digit number" />
                  </div>
                </InputField>
              </div>

              <InputField label="Any allergies? (Food, medicines, insects, etc.)">
                <textarea name="allergies" rows={2} value={form.allergies} onChange={handleChange}
                  className={`${inputCls} resize-none`} placeholder="List any known allergies or write 'None'" />
              </InputField>

              <InputField label="Any medical conditions we should know about?">
                <textarea name="medicalConditions" rows={2} value={form.medicalConditions} onChange={handleChange}
                  className={`${inputCls} resize-none`} placeholder="e.g. asthma, diabetes... or 'None'" />
              </InputField>

              <InputField label="Are you comfortable with light physical activities (yoga, walking, traditional games)?" required>
                <div className="flex gap-4">
                  {['Yes', 'No'].map(opt => (
                    <label key={opt} className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all font-bold text-sm
                      ${form.physicalActivities === opt
                        ? 'border-[#8E2A8B] bg-[#8E2A8B]/5 text-[#8E2A8B]'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                      <input type="radio" name="physicalActivities" value={opt}
                        checked={form.physicalActivities === opt} onChange={handleChange} className="sr-only" />
                      {opt}
                    </label>
                  ))}
                </div>
              </InputField>
            </FormSection>

            {/* Divider */}
            <div className="border-t border-gray-100 my-8" />

            {/* Section 3: Helpful */}
            <FormSection icon={<Heart size={20} />} title="A Little More About You" subtitle="Helps us understand your journey">

              <InputField label="How did you hear about மண் வாசம்?">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {HEARD_OPTIONS.map(opt => (
                    <label key={opt} className={`flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all text-sm font-semibold
                      ${form.heardAbout === opt
                        ? 'border-[#8E2A8B] bg-[#8E2A8B]/5 text-[#8E2A8B]'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                      <input type="radio" name="heardAbout" value={opt}
                        checked={form.heardAbout === opt} onChange={handleChange} className="sr-only" />
                      {opt}
                    </label>
                  ))}
                </div>
                {form.heardAbout === 'Other' && (
                  <input name="heardAboutOther" type="text" value={form.heardAboutOther} onChange={handleChange}
                    className={`${inputCls} mt-3`} placeholder="Please specify..." />
                )}
              </InputField>

              <InputField label="Why do you want to join மண் வாசம்?">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {WHY_JOIN_OPTIONS.map(opt => (
                    <label key={opt} className={`flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all text-sm font-semibold
                      ${form.whyJoin === opt
                        ? 'border-[#8E2A8B] bg-[#8E2A8B]/5 text-[#8E2A8B]'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                      <input type="radio" name="whyJoin" value={opt}
                        checked={form.whyJoin === opt} onChange={handleChange} className="sr-only" />
                      {opt}
                    </label>
                  ))}
                </div>
                {form.whyJoin === 'Other' && (
                  <input name="whyJoinOther" type="text" value={form.whyJoinOther} onChange={handleChange}
                    className={`${inputCls} mt-3`} placeholder="Please specify..." />
                )}
              </InputField>
            </FormSection>

            {/* Divider */}
            <div className="border-t border-gray-100 my-8" />

            {/* Section 4: Consent & Optional */}
            <FormSection icon={<AlertTriangle size={20} />} title="Consent & Preferences">

              <label className={`flex items-start gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all
                ${form.consent ? 'border-[#8E2A8B] bg-[#8E2A8B]/5' : 'border-gray-200 hover:border-gray-300'}`}>
                <input type="checkbox" name="consent" checked={form.consent} onChange={handleChange}
                  className="mt-1 w-5 h-5 accent-[#8E2A8B] cursor-pointer flex-shrink-0" />
                <span className="text-sm text-gray-700 leading-relaxed font-medium">
                  <span className="text-[#8E2A8B] font-black">*</span> I understand this is a nature-based outdoor experience and I participate at my own discretion.
                  I take full responsibility for my health and safety.
                </span>
              </label>

              <InputField label="Would you like to be informed about future camps and community gatherings? (Optional)">
                <div className="flex gap-4">
                  {['Yes', 'No'].map(opt => (
                    <label key={opt} className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all font-bold text-sm
                      ${form.futureCamps === opt
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-600'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                      <input type="radio" name="futureCamps" value={opt}
                        checked={form.futureCamps === opt} onChange={handleChange} className="sr-only" />
                      {opt}
                    </label>
                  ))}
                </div>
              </InputField>
            </FormSection>

            {/* Payment CTA */}
            <div className="mt-8 p-6 bg-gradient-to-br from-[#2D1B4E] to-[#8E2A8B] rounded-2xl text-white text-center">
              <p className="text-white/70 text-sm mb-2">Registration Fee</p>
              <p className="text-4xl font-black mb-1">₹{CAMP_FEE}</p>
              <p className="text-white/60 text-xs mb-6">Secure payment via Razorpay</p>
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-white text-[#8E2A8B] font-black py-4 px-8 rounded-xl text-lg
                  hover:bg-gray-100 transition-all active:scale-95 shadow-2xl shadow-black/30
                  disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                {submitting ? (
                  <><Loader2 size={20} className="animate-spin" /> Processing...</>
                ) : (
                  <><Leaf size={20} /> Pay ₹{CAMP_FEE} & Register</>
                )}
              </button>
              <p className="text-white/50 text-xs mt-4">
                By clicking, you agree to our Terms and the Consent statement above.
              </p>
            </div>
          </form>
        </div>
      </div>
    </MainLayout>
  );
}
