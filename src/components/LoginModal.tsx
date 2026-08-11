import React, { useState, useEffect, useRef } from 'react';
import { X, Eye, EyeOff, Mail, User, Lock, ArrowRight, RefreshCw, Smartphone, Check } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const LoginModal: React.FC = () => {
    const { isLoginModalOpen, closeLoginModal, login, signUp, sendWhatsAppOTP, verifyWhatsAppOTP, resetPasswordWithOTP } = useAuth();
    const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
    const [showPassword, setShowPassword] = useState(false);

    // Form fields
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [mobile, setMobile] = useState('');
    const [otp, setOtp] = useState('');
    const [password, setPassword] = useState('');

    // UI states
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isOtpSent, setIsOtpSent] = useState(false);
    const [isOtpVerified, setIsOtpVerified] = useState(false);
    const [otpTimer, setOtpTimer] = useState(0);
    const isVerifyingRef = useRef(false);

    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        if (otpTimer > 0) {
            interval = setInterval(() => {
                setOtpTimer((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [otpTimer]);

    useEffect(() => {
        if (isLoginModalOpen && (mode === 'login' || mode === 'signup')) {
            let attempts = 0;
            const renderGoogleButton = () => {
                if (window.google && document.getElementById("google-signin-button")) {
                    window.google.accounts.id.renderButton(
                        document.getElementById("google-signin-button"),
                        { 
                            theme: "outline", 
                            size: "large", 
                            shape: "pill",
                            logo_alignment: "center",
                            text: mode === 'signup' ? "signup_with" : "signin_with"
                        }
                    );
                    // Also trigger One Tap prompt
                    window.google.accounts.id.prompt();
                } else if (attempts < 20) {
                    attempts++;
                    // Retry if element not found or Google not ready
                    setTimeout(renderGoogleButton, 200);
                }
            };

            // Attempt render
            renderGoogleButton();
        }
    }, [isLoginModalOpen, mode]);

    if (!isLoginModalOpen) return null;

    const handleSendOTP = async () => {
        // Validation: Email required for signup, mobile required for OTP
        if (mode === 'signup' && (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
            setError("Please enter a valid email address.");
            return;
        }

        if (!mobile || mobile.length !== 10 || !/^\d+$/.test(mobile)) {
            setError("Please enter a valid 10-digit mobile number.");
            return;
        }

        setIsSubmitting(true);
        setError(null);
        try {
            const { error: otpError } = await sendWhatsAppOTP(mobile, mode === 'forgot' ? 'forgot' : 'signup');
            if (otpError) {
                setError(otpError.message || "Failed to send OTP.");
            } else {
                setIsOtpSent(true);
                setOtpTimer(60);
                setSuccessMessage("OTP sent to your WhatsApp!");
            }
        } catch (err) {
            setError("An error occurred. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);

        if (mode === 'signup' || mode === 'forgot') {
            if (!isOtpVerified) {
                setError("Please verify your WhatsApp first.");
                return;
            }
            if (password.length < 8) {
                setError("Password must be at least 8 characters long.");
                return;
            }
        }

        setIsSubmitting(true);
        try {
            if (mode === 'login') {
                const { error: loginError } = await login(mobile, password);
                if (loginError) setError(loginError.message);
                else closeLoginModal();
            } else if (mode === 'signup') {
                const { error: signUpError } = await signUp(username, email, mobile, password, otp);
                if (signUpError) {
                    setError(typeof signUpError === 'string' ? signUpError : (signUpError as any).message || "Signup failed");
                } else {
                    setSuccessMessage("Account created successfully!");
                }
            } else if (mode === 'forgot') {
                const { error: resetError } = await resetPasswordWithOTP(mobile, otp, password);
                if (resetError) {
                    setError(typeof resetError === 'string' ? resetError : (resetError as any).message || "Password reset failed");
                } else {
                    setSuccessMessage("Password reset successfully! You can now sign in.");
                    setTimeout(() => {
                        setMode('login');
                        resetFields();
                    }, 2000);
                }
            }
        } catch (err: any) {
            setError("An unexpected error occurred. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleInputFocus = () => {
        if (error) setError(null);
        if (successMessage) setSuccessMessage(null);
    };

    const resetFields = () => {
        setUsername('');
        setEmail('');
        setMobile('');
        setPassword('');
        setOtp('');
        setIsOtpSent(false);
        setIsOtpVerified(false);
        setError(null);
        setSuccessMessage(null);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={closeLoginModal}
            ></div>

            <div className="relative bg-white w-full max-w-[850px] max-h-[95vh] md:h-[600px] rounded-[3rem] overflow-hidden shadow-2xl animate-in zoom-in-95 fade-in duration-500 flex flex-col md:flex-row">
                {/* Left Panel - Visual Backdrop (Desktop Only) */}
                <div className="hidden md:flex relative w-1/2 h-full overflow-hidden">
                    <img
                        src="/kk.png"
                        alt="Kottravai Life"
                        className="w-full h-full object-cover brightness-[0.7] grayscale-[0.2] transition-transform duration-700 hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-12 flex flex-col justify-end">
                        <div className="space-y-6">
                            <h3 className="text-4xl font-black text-white leading-[1.1] tracking-tight">
                                Traditional Art, <br />
                                <span className="text-[#b5128f]">Modern Ethics.</span>
                            </h3>
                            <p className="text-white/70 text-sm font-medium leading-relaxed max-w-[280px]">
                                Join our community of artisans and conscious consumers reviving Indian heritage.
                            </p>
                        </div>
                        {/* Carousel Dots Placeholder for visual fidelity */}
                        <div className="flex gap-2 mt-8">
                            <div className="w-8 h-1 bg-white rounded-full"></div>
                            <div className="w-4 h-1 bg-white/30 rounded-full"></div>
                            <div className="w-4 h-1 bg-white/30 rounded-full"></div>
                        </div>
                    </div>
                </div>

                {/* Mobile Header (Mobile Only) */}
                <div className="md:hidden relative h-32 flex-shrink-0">
                    <img
                        src="/kk.png"
                        alt="Kottravai"
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center p-6 text-center">
                         <h2 className="text-xl font-black text-white uppercase tracking-widest">Kottravai</h2>
                    </div>
                    <button
                        onClick={closeLoginModal}
                        className="absolute top-4 right-4 w-8 h-8 bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all z-10"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Right Panel - Form (Desktop and Mobile) */}
                <div 
                    className="flex-1 bg-white overflow-y-auto flex flex-col h-full relative"
                >
                    <style dangerouslySetInnerHTML={{__html: `
                        .hide-modal-scrollbar::-webkit-scrollbar { display: none; }
                    `}} />
                    <div className="p-6 sm:p-8 flex-1 flex flex-col justify-center hide-modal-scrollbar">
                        <div className="mb-6">
                            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight leading-tight">
                                {mode === 'login' ? 'Welcome Back' : mode === 'signup' ? 'Create an account' : 'Verify Account'}
                            </h2>
                            <div className="mt-2 flex flex-col gap-1">
                                <p className="text-xs sm:text-sm text-gray-500 font-medium">
                                    {mode === 'login' ? (
                                        <>New to Kottravai? <button type="button" onClick={() => setMode('signup')} className="text-[#b5128f] font-bold hover:underline">Join Now</button></>
                                    ) : mode === 'signup' ? (
                                        <>Already have an account? <button type="button" onClick={() => setMode('login')} className="text-[#b5128f] font-bold hover:underline">Log in</button></>
                                    ) : (
                                        <>Back to <button type="button" onClick={() => setMode('login')} className="text-[#b5128f] font-bold hover:underline">Sign in</button></>
                                    )}
                                </p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-3">
                        <div className="space-y-3">
                            {/* Username field (Signup) */}
                            {mode === 'signup' && (
                                <div className="relative group">
                                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#b5128f] transition-colors">
                                        <User size={18} />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Username"
                                        required={mode === 'signup'}
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        onFocus={handleInputFocus}
                                        className="w-full pl-14 pr-10 py-3.5 bg-gray-50 border border-transparent rounded-[1.25rem] text-gray-700 placeholder-gray-400 focus:bg-white focus:border-[#b5128f]/20 focus:ring-4 focus:ring-[#b5128f]/5 outline-none transition-all"
                                    />
                                </div>
                            )}

                            {/* Email field (Signup only) */}
                            {mode === 'signup' && (
                                <div className="relative group">
                                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#b5128f] transition-colors">
                                        <Mail size={18} />
                                    </div>
                                    <input
                                        type="email"
                                        placeholder="Email Address"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value.toLowerCase())}
                                        onFocus={handleInputFocus}
                                        className="w-full pl-14 pr-10 py-3.5 bg-gray-50 border border-transparent rounded-[1.25rem] text-gray-700 placeholder-gray-400 focus:bg-white focus:border-[#b5128f]/20 focus:ring-4 focus:ring-[#b5128f]/5 outline-none transition-all"
                                     />
                                 </div>
                            )}

                            {/* Login Identifier field (Login only) */}
                            {mode === 'login' && (
                                <div className="relative group">
                                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#b5128f] transition-colors">
                                        <User size={18} />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Email or Mobile Number"
                                        required
                                        value={mobile} // Re-using mobile state for identifier
                                        onChange={(e) => setMobile(e.target.value)}
                                        onFocus={handleInputFocus}
                                        className="w-full pl-14 pr-6 py-3.5 bg-gray-50 border border-transparent rounded-[1.25rem] text-gray-700 placeholder-gray-400 focus:bg-white focus:border-[#b5128f]/20 focus:ring-4 focus:ring-[#b5128f]/5 outline-none transition-all"
                                    />
                                </div>
                            )}

                            {/* Mobile field (Signup and Forgot) */}
                            {(mode === 'signup' || mode === 'forgot') && (
                                <div className="relative group">
                                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#25D366] transition-colors">
                                        <Smartphone size={18} />
                                    </div>
                                    <input
                                        type="tel"
                                        placeholder="Mobile Number (10 digits)"
                                        required
                                        maxLength={10}
                                        value={mobile}
                                        onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                                        onFocus={handleInputFocus}
                                        disabled={isOtpSent || isOtpVerified}
                                        className={`w-full pl-14 pr-6 py-3.5 bg-gray-50 border border-transparent rounded-[1.25rem] text-gray-700 placeholder-gray-400 focus:bg-white focus:border-[#25D366]/20 focus:ring-4 focus:ring-[#25D366]/5 outline-none transition-all font-bold ${(isOtpSent || isOtpVerified) ? 'opacity-70 cursor-not-allowed' : ''}`}
                                    />
                                </div>
                            )}

                            {/* Email OTP Verification (Signup and Forgot) */}
                            {(mode === 'signup' || mode === 'forgot') && (
                                <div className="space-y-3">
                                    {!isOtpSent && !isOtpVerified && (
                                        <div className="relative group w-full">
                                                <button
                                                    type="button"
                                                    onClick={handleSendOTP}
                                                    disabled={isSubmitting}
                                                    className="w-full py-3.5 bg-[#F8F9FA] text-[#7C8291] rounded-full font-black text-[11px] uppercase tracking-[0.2em] hover:bg-black hover:text-white transition-all transform active:scale-[0.98] border border-gray-100/80 disabled:bg-gray-50 disabled:text-gray-300"
                                                >
                                                    {isSubmitting ? 'Sending...' : 'Send Verification Code'}
                                                </button>
                                        </div>
                                    )}

                                    {/* OTP Field - More compact */}
                                    {isOtpSent && !isOtpVerified && (
                                        <div className="flex flex-col gap-2 p-4 bg-emerald-50/30 rounded-2xl border border-emerald-100 animate-in slide-in-from-top-2 duration-300">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[9px] font-black text-emerald-800 uppercase tracking-widest">Verify WhatsApp Code</label>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setIsOtpSent(false);
                                                        setIsOtpVerified(false);
                                                        setOtp('');
                                                    }}
                                                    className="text-[9px] font-bold text-gray-400 hover:text-[#b5128f] uppercase tracking-widest transition-colors"
                                                >
                                                    Change Number
                                                </button>
                                            </div>
                                            <div className="relative flex items-center w-full">
                                                <input
                                                    type="text"
                                                    placeholder="Enter 6-digit OTP"
                                                    required
                                                    maxLength={6}
                                                    value={otp}
                                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                                    className="w-full pl-6 pr-[100px] py-4 bg-white border-2 border-emerald-200 rounded-2xl text-lg font-black tracking-[0.3em] text-emerald-900 focus:border-emerald-500 outline-none transition-all"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={async () => {
                                                        console.log(`[LoginModal] Verify button clicked at ${Date.now()}`);
                                                        if (otp.length !== 6 || isVerifyingRef.current) return;
                                                        
                                                        isVerifyingRef.current = true;
                                                        setIsSubmitting(true);
                                                        
                                                        try {
                                                            console.log(`[LoginModal] verifyWhatsAppOTP() starting at ${Date.now()}`);
                                                            const { error: vErr } = await verifyWhatsAppOTP(mobile, otp);
                                                            console.log(`[LoginModal] verifyWhatsAppOTP() finished at ${Date.now()}`);
                                                            
                                                            if (vErr) {
                                                                setError(vErr.message);
                                                            } else {
                                                                setIsOtpVerified(true);
                                                                setSuccessMessage("WhatsApp verified! You can now complete registration.");
                                                            }
                                                        } finally {
                                                            setIsSubmitting(false);
                                                            isVerifyingRef.current = false;
                                                        }
                                                    }}
                                                    disabled={otp.length !== 6 || isSubmitting || isVerifyingRef.current}
                                                    className="absolute right-2 top-2 bottom-2 px-6 bg-[#25D366] text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-[#1da851] transition-all disabled:bg-gray-100 disabled:text-gray-400 disabled:opacity-50"
                                                >
                                                    Verify
                                                </button>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleSendOTP}
                                                disabled={otpTimer > 0 || isSubmitting}
                                                className="text-[10px] font-bold text-gray-400 hover:text-emerald-600 self-center mt-2 flex items-center gap-1"
                                            >
                                                <RefreshCw size={10} className={isSubmitting ? 'animate-spin' : ''} />
                                                {otpTimer > 0 ? `Resend in ${otpTimer}s` : 'Resend Code'}
                                            </button>
                                        </div>
                                    )}

                                    {isOtpVerified && (
                                        <div className="flex items-center justify-between px-5 py-3.5 bg-emerald-50/50 text-emerald-600 rounded-2xl border border-emerald-100">
                                            <div className="flex items-center gap-3">
                                                <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center shrink-0 shadow-sm shadow-emerald-200">
                                                    <Check size={14} className="text-white" />
                                                </div>
                                                <span className="text-[11px] font-black uppercase tracking-widest">WhatsApp Verified</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsOtpSent(false);
                                                    setIsOtpVerified(false);
                                                    setOtp('');
                                                }}
                                                className="text-[9px] font-bold text-gray-400 hover:text-[#b5128f] uppercase tracking-widest transition-colors"
                                            >
                                                Change Number
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Password field - Tightened padding */}
                            {(mode !== 'forgot' || isOtpVerified) && (
                                <div className="relative group">
                                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#b5128f] transition-colors">
                                        <Lock size={18} />
                                    </div>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        placeholder={mode === 'forgot' ? "New Password" : "Password"}
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        onFocus={handleInputFocus}
                                        className="w-full pl-14 pr-14 py-3.5 bg-gray-50 border border-transparent rounded-2xl text-gray-700 placeholder-gray-400 focus:bg-white focus:border-[#b5128f]/20 focus:ring-4 focus:ring-[#b5128f]/5 outline-none transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            )}

                            {/* Error/Success Messages */}
                            {error && (
                                <div className="p-3 bg-red-50 border border-red-100 rounded-xl animate-in slide-in-from-top-1 fade-in duration-300">
                                    <p className="text-[10px] font-bold text-red-500 text-center uppercase tracking-tight">
                                        {error}
                                    </p>
                                </div>
                            )}
                            {successMessage && (
                                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl animate-in slide-in-from-top-1 fade-in duration-300">
                                    <p className="text-[10px] font-bold text-emerald-600 text-center uppercase tracking-tight">
                                        {successMessage}
                                    </p>
                                </div>
                            )}
                        </div>

                        {mode === 'login' && (
                            <div className="flex justify-start">
                                <button
                                    type="button"
                                    onClick={() => {
                                        resetFields();
                                        setMode('forgot');
                                    }}
                                    className="text-xs font-bold text-gray-400 hover:text-[#b5128f] transition-colors uppercase tracking-widest"
                                >
                                    Forgot password?
                                </button>
                            </div>
                        )}

                        <button
                                type="submit"
                                disabled={isSubmitting || (mode === 'signup' && !isOtpVerified)}
                                className="group relative w-full py-4 bg-[#2D1B4E] text-white font-black uppercase tracking-[0.3em] text-[12px] rounded-full hover:bg-[#b5128f] hover:scale-[1.02] transition-all transform active:scale-[0.98] shadow-xl shadow-purple-900/20 disabled:bg-gray-100 disabled:text-gray-300 disabled:cursor-not-allowed border-none outline-none"
                            >
                                <span className="relative z-10 flex items-center justify-center gap-4">
                                    {isSubmitting ? 'Processing...' : mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Update Password'}
                                    {!isSubmitting && <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />}
                                </span>
                            </button>

                        {(mode === 'login' || mode === 'signup') && (
                            <div className="flex items-center gap-4 py-2">
                                <div className="flex-1 h-px bg-gray-100"></div>
                                <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest whitespace-nowrap">Or continue with</span>
                                <div className="flex-1 h-px bg-gray-100"></div>
                            </div>
                        )}

                        {(mode === 'login' || mode === 'signup') && (
                            <div className="flex justify-center w-full">
                                <div 
                                    id="google-signin-button" 
                                    className="w-full transition-all duration-300 hover:opacity-90"
                                    style={{ height: '44px' }}
                                ></div>
                            </div>
                        )}

                        <div className="text-center pt-4 border-t border-gray-100">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-relaxed">
                                Conscious Choice for a Better Tomorrow <br/>
                                <button type="button" className="text-gray-500 hover:text-black">Privacy Policy</button> • <button type="button" className="text-gray-500 hover:text-black">Terms of Service</button>
                            </p>
                        </div>
                    </form>
                </div>
            </div>

            <button
                onClick={closeLoginModal}
                className="hidden md:flex absolute top-8 right-8 w-10 h-10 bg-gray-50 hover:bg-gray-100 rounded-full items-center justify-center text-gray-400 hover:text-black transition-all z-20 group"
            >
                <X size={20} className="group-hover:rotate-90 transition-transform duration-300" />
            </button>
        </div>
    </div>
    );
};

export default LoginModal;

