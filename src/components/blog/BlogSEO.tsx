import React from 'react';
import { Helmet } from 'react-helmet-async';
import { BlogPost } from '@/types/blog';

interface BlogSEOProps {
    post?: BlogPost;
    isList?: boolean;
}

const BlogSEO: React.FC<BlogSEOProps> = ({ post, isList = false }) => {
    const siteUrl = 'https://www.kottravai.in';

    if (isList) {
        const pageUrl = `${siteUrl}/blog`;
        const pageSchema = {
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Kottravai Blog',
            description: 'Discover stories about artisan craftsmanship, sustainable living, women entrepreneurship, and eco-friendly home decor.',
            url: pageUrl
        };

        const breadcrumbSchema = {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
                {
                    '@type': 'ListItem',
                    position: 1,
                    name: 'Home',
                    item: siteUrl
                },
                {
                    '@type': 'ListItem',
                    position: 2,
                    name: 'Blog',
                    item: pageUrl
                }
            ]
        };

        return (
            <Helmet>
                <title>Kottravai Blog | Handcrafted Stories & Sustainable Living</title>
                <meta name="description" content="Discover stories about artisan craftsmanship, sustainable living, women entrepreneurship, and eco-friendly home decor." />
                <link rel="canonical" href={pageUrl} />
                <meta property="og:title" content="Kottravai Blog | Handcrafted Stories & Sustainable Living" />
                <meta property="og:description" content="Discover stories about artisan craftsmanship, sustainable living, women entrepreneurship, and eco-friendly home decor." />
                <meta property="og:url" content={pageUrl} />
                <meta property="og:type" content="website" />
                <meta property="og:image" content={`${siteUrl}/hero.webp`} />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content="Kottravai Blog | Handcrafted Stories & Sustainable Living" />
                <meta name="twitter:description" content="Discover stories about artisan craftsmanship, sustainable living, women entrepreneurship, and eco-friendly home decor." />
                <meta name="twitter:image" content={`${siteUrl}/hero.webp`} />
                <script type="application/ld+json">
                    {JSON.stringify(pageSchema)}
                </script>
                <script type="application/ld+json">
                    {JSON.stringify(breadcrumbSchema)}
                </script>
            </Helmet>
        );
    }

    if (!post) return null;

    const postUrl = `${siteUrl}/blog/${post.slug}`;
    const imageUrl = `${siteUrl}${post.featuredImage}`;

    // BlogPosting Schema
    const articleSchema = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": postUrl
        },
        "headline": post.seoTitle || post.title,
        "description": post.metaDescription,
        "image": imageUrl,
        "author": {
            "@type": "Person",
            "name": post.author
        },
        "publisher": {
            "@type": "Organization",
            "name": "Kottravai",
            "logo": {
                "@type": "ImageObject",
                "url": `${siteUrl}/logo.png`
            }
        },
        "datePublished": post.publishDate,
        "dateModified": post.publishDate
    };

    // Breadcrumb Schema
    const breadcrumbSchema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": siteUrl
            },
            {
                "@type": "ListItem",
                "position": 2,
                "name": "Blog",
                "item": `${siteUrl}/blog`
            },
            {
                "@type": "ListItem",
                "position": 3,
                "name": post.title,
                "item": postUrl
            }
        ]
    };

    // FAQ Schema (Basic placeholder to support requirements, can be expanded dynamically later)
    const faqSchema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {
                "@type": "Question",
                "name": `What is ${post.title} about?`,
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": post.metaDescription
                }
            }
        ]
    };

    return (
        <Helmet>
            <title>{post.seoTitle || post.title}</title>
            <meta name="description" content={post.metaDescription} />
            <link rel="canonical" href={postUrl} />

            {/* Open Graph */}
            <meta property="og:title" content={post.seoTitle || post.title} />
            <meta property="og:description" content={post.metaDescription} />
            <meta property="og:image" content={imageUrl} />
            <meta property="og:url" content={postUrl} />
            <meta property="og:type" content="article" />
            <meta property="article:published_time" content={post.publishDate} />
            <meta property="article:author" content={post.author} />
            <meta property="article:section" content={post.category} />
            {(post.tags || []).map(tag => (
                <meta property="article:tag" content={tag} key={tag} />
            ))}

            {/* Twitter Card */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={post.seoTitle || post.title} />
            <meta name="twitter:description" content={post.metaDescription} />
            <meta name="twitter:image" content={imageUrl} />

            {/* Structured Data */}
            <script type="application/ld+json">
                {JSON.stringify(articleSchema)}
            </script>
            <script type="application/ld+json">
                {JSON.stringify(breadcrumbSchema)}
            </script>
            <script type="application/ld+json">
                {JSON.stringify(faqSchema)}
            </script>
        </Helmet>
    );
};

export default BlogSEO;
