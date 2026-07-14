import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import pagesData from '@/data/pages.json';
import MainLayout from '@/layouts/MainLayout';
import NotFound from '@/pages/NotFound';

const SITE_URL = 'https://www.kottravai.in';

const PageViewer = ({ slugUri }: { slugUri?: string }) => {
    const { slug: paramSlug } = useParams();
    const currentSlug = slugUri || paramSlug;

    const page = pagesData.find(p => p.slug === currentSlug);

    if (!page) {
        return <NotFound />;
    }

    const pageUrl = typeof window !== 'undefined'
        ? window.location.href
        : `${SITE_URL}/${page.slug}`;

    const pageImage = page.featured_image
        ? page.featured_image.startsWith('http')
            ? page.featured_image
            : `${SITE_URL}${page.featured_image}`
        : undefined;

    const pageSchema = {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: page.meta_title || page.title,
        description: page.meta_description || '',
        url: pageUrl,
        ...(pageImage ? { image: pageImage } : {})
    };

    const breadcrumbSchema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            {
                '@type': 'ListItem',
                position: 1,
                name: 'Home',
                item: SITE_URL
            },
            {
                '@type': 'ListItem',
                position: 2,
                name: page.title,
                item: pageUrl
            }
        ]
    };

    return (
        <MainLayout>
            <Helmet>
                <title>{page.meta_title || page.title}</title>
                <meta name="description" content={page.meta_description || ''} />
                <link rel="canonical" href={pageUrl} />
                <meta property="og:title" content={page.meta_title || page.title} />
                <meta property="og:description" content={page.meta_description || ''} />
                <meta property="og:url" content={pageUrl} />
                <meta property="og:type" content="website" />
                {pageImage && <meta property="og:image" content={pageImage} />}
                <meta name="twitter:card" content="summary_large_image" />
                {pageImage && <meta name="twitter:image" content={pageImage} />}
                <meta name="twitter:title" content={page.meta_title || page.title} />
                <meta name="twitter:description" content={page.meta_description || ''} />
                <script type="application/ld+json">
                    {JSON.stringify(pageSchema)}
                </script>
                <script type="application/ld+json">
                    {JSON.stringify(breadcrumbSchema)}
                </script>
            </Helmet>

            {page.featured_image && (
                <div className="w-full h-64 md:h-96 relative">
                    <img
                        src={page.featured_image}
                        alt={page.title}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <h1 className="text-4xl md:text-5xl font-bold text-white text-center px-4">
                            {page.title}
                        </h1>
                    </div>
                </div>
            )}

            <div className={`container mx-auto px-4 py-8 ${!page.featured_image ? 'mt-8' : ''}`}>
                {!page.featured_image && (
                    <h1 className="text-4xl font-bold mb-8 text-center">{page.title}</h1>
                )}

                {/* Render HTML Content from Data */}
                <div
                    className="prose prose-lg max-w-none text-gray-700"
                    dangerouslySetInnerHTML={{ __html: page.content }}
                />
            </div>
        </MainLayout>
    );
};

export default PageViewer;
