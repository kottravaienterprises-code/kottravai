import { lazy, Suspense, useState, useEffect } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import analytics from '@/utils/analyticsService';
import ScrollToTop from '@/components/ScrollToTop';

// --- Lazy Load Pages ---
const Home = lazy(() => import('@/pages/Home'));
const PageViewer = lazy(() => import('@/pages/PageViewer'));
const BlogList = lazy(() => import('@/pages/BlogList'));
const BlogDetail = lazy(() => import('@/pages/BlogDetail'));
const Contact = lazy(() => import('@/pages/Contact'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const AboutUs = lazy(() => import('@/pages/AboutUs'));
const FAQ = lazy(() => import('@/pages/FAQ'));
const B2B = lazy(() => import('@/pages/B2B'));
const Shop = lazy(() => import('@/pages/Shop'));
const Cart = lazy(() => import('@/pages/Cart'));
const Checkout = lazy(() => import('@/pages/Checkout'));
const ProductDetails = lazy(() => import('@/pages/ProductDetails'));
const Account = lazy(() => import('@/pages/Account'));
const OrderSuccess = lazy(() => import('@/pages/OrderSuccess'));

// Admin Pages (Code-splitting protects chunks)
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'));
const AdminLogin = lazy(() => import('@/pages/admin/AdminLogin'));

const ShippingPolicy = lazy(() => import('@/pages/ShippingPolicy'));
const RefundPolicy = lazy(() => import('@/pages/RefundPolicy'));
const TermsOfService = lazy(() => import('@/pages/TermsOfService'));
const PrivacyPolicy = lazy(() => import('@/pages/PrivacyPolicy'));
const Alliance = lazy(() => import('@/pages/Alliance'));
const AffiliateDashboard = lazy(() => import('@/pages/AffiliateDashboard'));
const ArtisanHub = lazy(() => import('@/pages/ArtisanHub'));
const ArtisanProfile = lazy(() => import('@/pages/ArtisanProfile'));
const Campus = lazy(() => import('@/pages/Campus'));



// --- Admin Route Guard ---
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
    // Check for admin session in sessionStorage
    const isAdmin = sessionStorage.getItem('kottravai_admin_session') === 'true';
    if (!isAdmin) {
        return <Navigate to="/kottravai-secure-hq/login" replace />;
    }
    return <>{children}</>;
};

import SalesPopup from '@/components/SalesPopup';
import ErrorBoundary from '@/components/ErrorBoundary';

function App() {
    const location = useLocation();
    const isAdminRoute = location.pathname.startsWith('/kottravai-secure-hq');
    const [scrolledMilestones, setScrolledMilestones] = useState<number[]>([]);

    // Track Page Views & Affiliate Referral
    useEffect(() => {
        // Core Analytics tracking
        analytics.trackPageView(location.pathname, {
            search: location.search,
            page_title: document.title
        });

        // 🎯 Affiliate Tracking: Capture 'ref' parameter and persist in localStorage
        const params = new URLSearchParams(location.search);
        const refCode = params.get('ref');
        
        if (refCode) {
            console.log('🎯 Affiliate Ref Captured:', refCode);
            // Store in localStorage for cross-page persistence
            localStorage.setItem('kottravai_affiliate_ref', refCode);
            // Also store a timestamp for potential expiry logic
            localStorage.setItem('kottravai_affiliate_ref_time', Date.now().toString());

            // 🟢 GAP FIX: Record the click in the database
            fetch('/api/affiliates/click', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    slug: refCode, 
                    referrer: document.referrer, 
                    userAgent: navigator.userAgent 
                })
            }).catch(err => console.error('Failed to log affiliate click:', err));
        }

        setScrolledMilestones([]); // Reset milestones on navigation
    }, [location]);

    // Track Scroll Depth
    useEffect(() => {
        const handleScroll = () => {
            const h = document.documentElement;
            const b = document.body;
            const st = 'scrollTop';
            const sh = 'scrollHeight';
            const percent = (h[st] || b[st]) / ((h[sh] || b[sh]) - h.clientHeight) * 100;

            [25, 50, 75, 100].forEach(milestone => {
                if (percent >= milestone && !scrolledMilestones.includes(milestone)) {
                    setScrolledMilestones(prev => [...prev, milestone]);
                    analytics.trackEvent('scroll_depth', { depth: `${milestone}%` });
                }
            });
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [scrolledMilestones]);

    return (
        <ErrorBoundary>
            <ScrollToTop />
            {!isAdminRoute && <SalesPopup />}
            <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
            
            {/* Wrap All Routes with Suspense for Lazy Loading */}
            <Suspense fallback={
                <div className="min-h-screen flex items-center justify-center bg-white/90 backdrop-blur-md">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#b5128f]"></div>
                </div>
            }>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/shop" element={<Shop />} />
                    <Route path="/product/:slug" element={<ProductDetails />} />
                    <Route path="/category/:slug" element={<Shop />} />
                    <Route path="/cart" element={<Cart />} />
                    <Route path="/checkout" element={<Checkout />} />
                    <Route path="/order-success" element={<OrderSuccess />} />
                    <Route path="/account" element={<Account />} />
                    <Route path="/about" element={<AboutUs />} />
                    <Route path="/alliance" element={<Alliance />} />
                    <Route path="/hubs/:hubName" element={<ArtisanHub />} />
                    <Route path="/artisans/:id" element={<ArtisanProfile />} />
                    <Route path="/b2b" element={<B2B />} />
                    <Route path="/faqs" element={<FAQ />} />
                    <Route path="/services" element={<PageViewer slugUri="services" />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/camps" element={<Campus />} />
                    <Route path="/affiliate/dashboard" element={<AffiliateDashboard />} />
                    <Route path="/shipping-policy" element={<ShippingPolicy />} />
                    <Route path="/refund-policy" element={<RefundPolicy />} />
                    <Route path="/terms-of-service" element={<TermsOfService />} />
                    <Route path="/privacy-policy" element={<PrivacyPolicy />} />

                    {/* Blog System */}
                    <Route path="/blog" element={<BlogList />} />
                    <Route path="/blog/:slug" element={<BlogDetail />} />

                    <Route path="/advertise" element={<PageViewer slugUri="advertise" />} />
                    <Route path="/gift-cards" element={<PageViewer slugUri="gift-cards" />} />

                    {/* Dynamic Page Fallback */}
                    <Route path="/:slug" element={<PageViewer />} />

                    {/* 404 */}
                    <Route path="*" element={<NotFound />} />

                    {/* Admin Panel (Protected and Lazy Loaded) */}
                    <Route path="/kottravai-secure-hq/login" element={<AdminLogin />} />
                    <Route 
                        path="/kottravai-secure-hq" 
                        element={
                            <AdminRoute>
                                <AdminDashboard />
                            </AdminRoute>
                        } 
                    />
                </Routes>
            </Suspense>
        </ErrorBoundary>
    );
}

export default App;
