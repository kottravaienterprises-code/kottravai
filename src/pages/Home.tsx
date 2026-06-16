import { lazy, Suspense, useState, useEffect, useRef, ReactNode } from 'react';
import { Helmet } from 'react-helmet-async';
import MainLayout from '@/layouts/MainLayout';

// ─── ABOVE FOLD: load eagerly (LCP-critical, first paint) ────────────────────
import HeroSlider from '@/components/home/HeroSlider';
import CategoryRow from '@/components/home/CategoryRow';
import BestSellers from '@/components/home/BestSellers';

// ─── BELOW FOLD: lazy load (never block first paint) ─────────────────────────
const NewArrivals = lazy(() => import('@/components/home/NewArrivals'));
const FeaturedMedia = lazy(() => import('@/components/home/FeaturedMedia'));
const FeatureCards = lazy(() => import('@/components/home/FeatureCards'));
const HampersRow = lazy(() => import('@/components/home/HampersRow'));
const CuratedMoments = lazy(() => import('@/components/home/CuratedMoments'));
const TextTestimonials = lazy(() => import('@/components/home/TextTestimonials'));
const JournalSection = lazy(() => import('@/components/home/JournalSection'));
const SeeKottravaiInLife = lazy(() => import('@/components/home/SeeKottravaiInLife'));
const CoconutShellProductsRow = lazy(() => import('@/components/home/CoconutShellProductsRow'));
const BananaFiberRow = lazy(() => import('@/components/home/BananaFiberRow'));
const GiftBundleBuilder = lazy(() => import('@/components/home/GiftBundleBuilder'));
const HeritageMixes = lazy(() => import('@/components/home/HeritageMixes'));
const Testimonials = lazy(() => import('@/components/home/Testimonials'));

// Premium, lightweight skeleton/spinner fallback to ensure excellent layout stability
const SectionSkeleton = () => (
    <div className="w-full max-w-[1240px] mx-auto py-10 px-4 md:px-8 animate-pulse">
        <div className="h-6 bg-gray-100 rounded-md w-48 mb-6"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="h-48 bg-gray-50/50 rounded-2xl"></div>
            <div className="h-48 bg-gray-50/50 rounded-2xl"></div>
            <div className="h-48 bg-gray-50/50 rounded-2xl"></div>
            <div className="h-48 bg-gray-50/50 rounded-2xl"></div>
        </div>
    </div>
);

// ✅ Premium scroll-deferred lazy-rendering helper to solve mobile NO_LCP & TBT errors
const LazyRender = ({ children, placeholderHeight = 150 }: { children: ReactNode; placeholderHeight?: number }) => {
    const [isIntersecting, setIsIntersecting] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsIntersecting(true);
                    observer.disconnect();
                }
            },
            { rootMargin: '350px' } // Load slightly before it enters the viewport
        );

        if (ref.current) {
            observer.observe(ref.current);
        }

        return () => observer.disconnect();
    }, []);

    return isIntersecting ? (
        <>{children}</>
    ) : (
        <div ref={ref} className="w-full" style={{ minHeight: placeholderHeight }} />
    );
};

const Home = () => {
    return (
        <MainLayout>
            <Helmet>
                <title>Kottravai | Handmade Crafts, Eco Products &amp; Traditional Food Mixes.</title>
                <meta name="description" content="Kottravai offers premium handcrafted terracotta jewellery, heritage mixes, and essential care products. Shop our exclusive collection today." />
                <link rel="preload" as="image" href="/hero.webp" fetchPriority="high" />
            </Helmet>

            {/* 1. Hero — EAGER, LCP element lives here */}
            <HeroSlider />

            {/* 1.5. New Category Row */}
            <CategoryRow />

            {/* 2. Best Sellers — EAGER, visible above fold on desktop */}
            <BestSellers />

            <LazyRender placeholderHeight={300}>
                <Suspense fallback={<SectionSkeleton />}>
                    {/* Note: placing media feature immediately after Best Sellers */}
                    <FeaturedMedia />
                </Suspense>
            </LazyRender>

            <LazyRender placeholderHeight={300}>
                <Suspense fallback={<SectionSkeleton />}>
                    {/* Feature Promotional Cards */}
                    <FeatureCards />
                </Suspense>
            </LazyRender>

            {/* WhatsApp Banner — static HTML, no JS cost (placed above New Arrivals) */}
            <LazyRender placeholderHeight={100}>
                <div className="w-full pt-8 pb-4 px-4 md:px-8">
                    <div className="max-w-[1240px] mx-auto">
                        <a
                            href="https://whatsapp.com/channel/0029VbAxfDt6rsQwQdzLjS2m"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block hover:opacity-95 transition-opacity"
                        >
                            <picture>
                                <source
                                    media="(max-width: 768px)"
                                    srcSet="/IMG-20260523-WA0004.jpg.jpeg"
                                />
                                <img
                                    src="/whatsapp-banner.webp"
                                    alt="Join Kottravai WhatsApp Community"
                                    width={1240}
                                    height={300}
                                    className="w-full h-auto object-cover shadow-sm animate-pulse-slow"
                                    loading="lazy"
                                    decoding="async"
                                />
                            </picture>
                        </a>
                    </div>
                </div>
            </LazyRender>

            <LazyRender placeholderHeight={450}>
                <Suspense fallback={<SectionSkeleton />}>
                    {/* 2.1 New Arrivals */}
                    <NewArrivals />
                </Suspense>
            </LazyRender>

            <LazyRender placeholderHeight={450}>
                <Suspense fallback={<SectionSkeleton />}>
                    <HampersRow />
                </Suspense>
            </LazyRender>

            <LazyRender placeholderHeight={400}>
                <Suspense fallback={<SectionSkeleton />}>
                    <CuratedMoments />
                </Suspense>
            </LazyRender>

            <LazyRender placeholderHeight={200}>
                <Suspense fallback={null}>
                    <TextTestimonials />
                </Suspense>
            </LazyRender>

            <LazyRender placeholderHeight={300}>
                <Suspense fallback={null}>
                    <JournalSection />
                </Suspense>
            </LazyRender>

            <LazyRender placeholderHeight={300}>
                <Suspense fallback={null}>
                    <SeeKottravaiInLife />
                </Suspense>
            </LazyRender>

            {/* Coconut Shell Products Section — Premium Redesign */}
            <LazyRender placeholderHeight={450}>
                <Suspense fallback={<SectionSkeleton />}>
                    <CoconutShellProductsRow />
                </Suspense>
            </LazyRender>

            {/* Banana Fiber Section — New Design */}
            <LazyRender placeholderHeight={450}>
                <Suspense fallback={<SectionSkeleton />}>
                    <BananaFiberRow />
                </Suspense>
            </LazyRender>

            <LazyRender placeholderHeight={300}>
                <Suspense fallback={null}>
                    <GiftBundleBuilder />
                </Suspense>
            </LazyRender>

            <LazyRender placeholderHeight={450}>
                <Suspense fallback={<SectionSkeleton />}>
                    <HeritageMixes />
                </Suspense>
            </LazyRender>

            <LazyRender placeholderHeight={200}>
                <Suspense fallback={null}>
                    <Testimonials />
                </Suspense>
            </LazyRender>

        </MainLayout>
    );
};

export default Home;


