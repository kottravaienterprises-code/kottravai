import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/utils/supabaseClient';
import axios from 'axios';
import analytics from '@/utils/analyticsService';

declare global {
  interface Window {
    google: any;
    handleCredentialResponse: (response: any) => void;
  }
}

import { API_ENDPOINTS } from '@/config/api';

interface User {
    id: string;
    username: string;
    email: string;
    fullName: string;
    mobile?: string;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    isLoginModalOpen: boolean;
    openLoginModal: () => void;
    closeLoginModal: () => void;
    login: (mobile: string, password: string) => Promise<{ error: any }>;
    signUp: (username: string, email: string, mobile: string, password: string, otp: string) => Promise<{ error: any }>;
    sendWhatsAppOTP: (mobile: string, type?: 'signup' | 'forgot') => Promise<{ error: any }>;
    verifyWhatsAppOTP: (mobile: string, otp: string) => Promise<{ error: any }>;
    resetPasswordWithOTP: (mobile: string, otp: string, newPassword: string) => Promise<{ error: any }>;
    signInWithGoogle: (idToken: string) => Promise<{ error: any }>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

let isGoogleInitialized = false;

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

    const openLoginModal = () => setIsLoginModalOpen(true);
    const closeLoginModal = () => setIsLoginModalOpen(false);

    // Expose handleCredentialResponse to window for index.html/HTML API
    useEffect(() => {
        window.handleCredentialResponse = (response: any) => {
            handleGoogleResponse(response);
        };
    }, []);

    const decodeJwtResponse = (token: string) => {
        try {
            // Simplified decoder for "weightless" feel
            const payload = JSON.parse(atob(token.split('.')[1]));
            console.log("Floating into account:", payload.name);
            return payload;
        } catch (e) {
            console.error('Weightless Decode Error:', e);
            return null;
        }
    };

    const handleGoogleResponse = async (response: any) => {
        setIsLoading(true);
        try {
            const payload = decodeJwtResponse(response.credential);
            
            const { error: googleError } = await signInWithGoogle(response.credential);
            if (googleError) throw googleError;

            closeLoginModal();
            analytics.trackEvent('google_login_success', { email: payload?.email });
        } catch (error: any) {
            console.error('Flight Control Error:', error);
            analytics.trackEvent('google_login_failed', { error: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const fetchSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                const u = session.user;
                setUser({
                    id: u.id,
                    username: u.email || u.id,
                    email: u.email || '',
                    fullName: u.user_metadata?.full_name || u.user_metadata?.username || u.user_metadata?.name || '',
                    mobile: u.user_metadata?.mobile || ''
                });
            }
            setIsLoading(false);
        };

        fetchSession();

        const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session?.user) {
                const u = session.user;
                setUser({
                    id: u.id,
                    username: u.email || u.id,
                    email: u.email || '',
                    fullName: u.user_metadata?.full_name || u.user_metadata?.username || u.user_metadata?.name || '',
                    mobile: u.user_metadata?.mobile || ''
                });
                analytics.setUserId(u.id);
            } else {
                setUser(null);
                analytics.setUserId(null);
            }
            setIsLoading(false);
        });

        // Initialize "Flight Control" for Google Identity Services
        const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
        if (googleClientId) {
            const initFlight = () => {
                if (window.google && !isGoogleInitialized) {
                    window.google.accounts.id.initialize({
                        client_id: googleClientId,
                        callback: handleGoogleResponse,
                        auto_select: true,
                        itp_support: true,
                        use_fedcm_for_prompt: true,
                        context: 'signin'
                    });
                    isGoogleInitialized = true;

                    // Trigger the 'One Tap' floating prompt
                    window.google.accounts.id.prompt((notification: any) => {
                        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                             console.log('One Tap prompt finished:', notification.getNotDisplayedReason() || notification.getSkippedReason());
                        }
                    });
                }
            };

            // In React, script might already be there from index.html
            if (window.google) {
                initFlight();
            } else {
                const script = document.querySelector('script[src*="gsi/client"]');
                script?.addEventListener('load', initFlight);
            }
        }

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    const signInWithGoogle = async (idToken: string) => {
        try {
            const { error } = await supabase.auth.signInWithIdToken({
                provider: 'google',
                token: idToken,
            });

            if (error) throw error;
            return { error: null };
        } catch (error: any) {
            return { error };
        }
    };

    const login = async (identifier: string, password: string) => {
        try {
            let email = identifier.trim().toLowerCase();

            // 1. Detect if identifier is a Mobile Number (no '@')
            if (!email.includes('@')) {
                // If it's a mobile number, lookup the email from backend
                const lookupRes = await axios.post(`${API_ENDPOINTS.auth}/get-email`, { mobile: identifier });
                email = lookupRes.data.email;

                if (!email) {
                    throw new Error('No account found with this mobile number');
                }
            }

            // 2. Proceeed with standard email sign-in/lookup-based login
            const { error } = await supabase.auth.signInWithPassword({
                email: email,
                password
            });

            if (error) {
                analytics.trackEvent('login_failed', { identifier, error: error.message });
                throw error;
            }
            analytics.trackEvent('login_success', { identifier });
            closeLoginModal();
            return { error: null };
        } catch (error: any) {
            console.error('Login error:', error);
            const message = error.response?.data?.error || error.message || 'Login failed';
            return { error: { message } };
        }
    };

    const signUp = async (username: string, email: string, mobile: string, password: string, otp: string) => {
        try {
            // Call backend to create user
            await axios.post(`${API_ENDPOINTS.auth}/register`, {
                username,
                email: email.toLowerCase(),
                mobile,
                password,
                otp
            });

            // Automatically log in after successful signup
            const { error: loginError } = await login(mobile, password);
            if (loginError) throw loginError;

            analytics.trackEvent('account_created', { username, email, mobile });
            return { error: null };
        } catch (error: any) {
            console.error('Signup error:', error);
            return { error: error.response?.data?.error || error.message || 'Signup failed' };
        }
    };

    const sendWhatsAppOTP = async (mobile: string, type: 'signup' | 'forgot' = 'signup') => {
        try {
            const response = await axios.post(`${API_ENDPOINTS.auth}/send-whatsapp-otp`, {
                mobile,
                type
            });
            return { error: null, data: response.data };
        } catch (error: any) {
            console.error('Send WhatsApp OTP error:', error);
            return { error: error.response?.data || { message: 'Failed to send OTP' } };
        }
    };

    const verifyWhatsAppOTP = async (mobile: string, otp: string) => {
        try {
            const response = await axios.post(`${API_ENDPOINTS.auth}/verify-whatsapp-otp`, { mobile, otp });
            return { error: null, data: response.data };
        } catch (error: any) {
            console.error('Verify WhatsApp OTP error:', error);
            return { error: error.response?.data || { message: 'Invalid OTP' } };
        }
    };

    const resetPasswordWithOTP = async (mobile: string, otp: string, newPassword: string) => {
        try {
            const response = await axios.post(`${API_ENDPOINTS.auth}/reset-password-with-otp`, {
                mobile,
                otp,
                newPassword
            });
            return { error: null, data: response.data };
        } catch (error: any) {
            console.error('Reset password error:', error);
            return { error: error.response?.data || { message: 'Failed to reset password' } };
        }
    };

    const logout = async () => {
        analytics.trackEvent('logout');
        await supabase.auth.signOut();
        setUser(null);
        analytics.setUserId(null);
    };

    return (
        <AuthContext.Provider value={{
            user,
            isAuthenticated: !!user,
            isLoading,
            isLoginModalOpen,
            openLoginModal,
            closeLoginModal,
            login,
            signUp,
            sendWhatsAppOTP,
            verifyWhatsAppOTP,
            resetPasswordWithOTP,
            signInWithGoogle,
            logout
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
