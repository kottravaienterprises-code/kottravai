import { Helmet } from 'react-helmet-async';
import MainLayout from '@/layouts/MainLayout';

import B2BHero from '@/components/b2b/B2BHero';
import B2BOfferings from '@/components/b2b/B2BOfferings';
import B2BProductCategories from '@/components/b2b/B2BProductCategories';
import WhyKottravaiB2B from '@/components/b2b/WhyKottravaiB2B';
import HowB2BWorks from '@/components/b2b/HowB2BWorks';
import B2BImpact from '@/components/b2b/B2BImpact';
import B2BContactForm from '@/components/b2b/B2BContactForm';

const B2B = () => {
    return (
        <MainLayout>
            <Helmet>
                <title>Corporate Partnerships & B2B Gifting - Kottravai</title>
                <meta name="description" content="Sustainable products made by rural women for businesses, corporate gifting, hospitality and bulk procurement." />
                <link rel="canonical" href={`${import.meta.env.VITE_SITE_URL || 'https://www.kottravai.in'}/b2b`} />
                <meta property="og:title" content="Corporate Partnerships & B2B Gifting - Kottravai" />
                <meta property="og:description" content="Sustainable products made by rural women for businesses, corporate gifting, hospitality and bulk procurement." />
                <meta property="og:url" content={`${import.meta.env.VITE_SITE_URL || 'https://www.kottravai.in'}/b2b`} />
                <meta property="og:type" content="website" />
                <meta property="og:image" content={`${import.meta.env.VITE_SITE_URL || 'https://www.kottravai.in'}/b2b-corporate-gifting.webp`} />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content="Corporate Partnerships & B2B Gifting - Kottravai" />
                <meta name="twitter:description" content="Sustainable products made by rural women for businesses, corporate gifting, hospitality and bulk procurement." />
                <meta name="twitter:image" content={`${import.meta.env.VITE_SITE_URL || 'https://www.kottravai.in'}/b2b-corporate-gifting.webp`} />
            </Helmet>

            {/* 1. B2BHero */}
            <B2BHero />

            {/* 2. B2BOfferings */}
            <B2BOfferings />

            {/* 3. B2BProductCategories */}
            <B2BProductCategories />

            {/* 4. WhyKottravaiB2B */}
            <WhyKottravaiB2B />

            {/* 5. HowB2BWorks */}
            <HowB2BWorks />

            {/* 6. B2BImpact */}
            <B2BImpact />

            {/* 7. B2BContactForm */}
            <B2BContactForm />
        </MainLayout>
    );
};

export default B2B;
