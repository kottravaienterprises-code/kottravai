import React, { useState } from 'react';
import { X, Smartphone, ArrowRight, Loader2 } from 'lucide-react';
import axios from 'axios';
import { API_ENDPOINTS } from '@/config/api';
import toast from 'react-hot-toast';
import { useGuestAuth } from '@/contexts/GuestAuthContext';
import analytics from '@/utils/analyticsService';

interface GuestCheckoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function GuestCheckoutModal({ isOpen, onClose, onSuccess }: GuestCheckoutModalProps) {
    const [step, setStep] = useState<1 | 2>(1);
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { refreshProfile } = useGuestAuth();

    if (!isOpen) return null;

    const handleSendOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        if (phone.length !== 10) {
            toast.error("Please enter a valid 10-digit number.");
            return;
        }

        setIsLoading(true);
        try {
            const res = await axios.post(`${API_ENDPOINTS.auth}/send-whatsapp-otp`, { phone });
            if (res.data.success) {
                setStep(2);
                toast.success("OTP sent to your WhatsApp!");
                analytics.trackEvent('otp_sent', { phone });
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || err.response?.data?.error || "Failed to send OTP.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        if (otp.length !== 6) {
            toast.error("Please enter the 6-digit OTP.");
            return;
        }

        setIsLoading(true);
        try {
            const res = await axios.post(`${API_ENDPOINTS.auth}/verify-whatsapp-otp`, { phone, otp }, {
                withCredentials: true // Still pass it just in case
            });
            if (res.data.success) {
                console.log(`[${new Date().toISOString()}] GuestCheckoutModal: create-guest-session success`);
                await axios.post(`${API_ENDPOINTS.auth}/create-guest-session`, { phone }, {
                    withCredentials: true // Important for the HttpOnly cookie to be set on the client
                });
                toast.success("Verified successfully!");
                analytics.trackEvent('otp_verified', { phone });
                console.log(`[${new Date().toISOString()}] GuestCheckoutModal: Calling refreshProfile()`);
                await refreshProfile();
                console.log(`[${new Date().toISOString()}] GuestCheckoutModal: refreshProfile() finished`);

                onSuccess();
                onClose();
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || err.response?.data?.error || "Invalid OTP.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden font-sans">
                {/* Header */}
                <div className="bg-[#b5128f] p-6 text-white text-center relative">
                    <button 
                        onClick={onClose}
                        className="absolute top-4 right-4 p-1 bg-black/20 hover:bg-black/40 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                    <h2 className="text-2xl font-black uppercase tracking-wider mb-1">
                        Guest Checkout
                    </h2>
                    <p className="text-white/80 text-sm font-medium">
                        {step === 1 ? 'Enter your mobile number to continue' : 'Enter the verification code'}
                    </p>
                </div>

                <div className="p-8">
                    {step === 1 ? (
                        <form onSubmit={handleSendOTP} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">
                                    Mobile Number
                                </label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                                        <Smartphone size={20} />
                                    </div>
                                    <input
                                        type="tel"
                                        maxLength={10}
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl font-bold text-lg focus:ring-2 focus:ring-[#b5128f] transition-all outline-none"
                                        placeholder="10-digit number"
                                        required
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading || phone.length !== 10}
                                className="w-full py-4 bg-black text-white font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                {isLoading ? <Loader2 className="animate-spin" size={20} /> : (
                                    <>Send OTP <ArrowRight size={18} /></>
                                )}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleVerifyOTP} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">
                                    WhatsApp Code
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        maxLength={6}
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                        className="w-full px-4 py-4 bg-gray-50 border-none rounded-2xl font-black text-center text-2xl tracking-[0.5em] focus:ring-2 focus:ring-[#b5128f] transition-all outline-none"
                                        placeholder="••••••"
                                        required
                                        autoFocus
                                    />
                                </div>
                                <div className="text-center">
                                    <button 
                                        type="button" 
                                        onClick={() => setStep(1)}
                                        className="text-xs font-bold text-[#b5128f] hover:underline"
                                    >
                                        Change mobile number
                                    </button>
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading || otp.length !== 6}
                                className="w-full py-4 bg-[#b5128f] text-white font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 hover:bg-[#910e73] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-[#b5128f]/30"
                            >
                                {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Verify & Continue'}
                            </button>
                        </form>
                    )}
                </div>
                
                <div className="bg-gray-50 p-4 text-center">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Secure connection via Kottravai
                    </p>
                </div>
            </div>
        </div>
    );
}
