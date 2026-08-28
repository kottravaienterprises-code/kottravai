import { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import MainLayout from '@/layouts/MainLayout';
import { blogService } from '@/services/blogService';
import { BlogPost } from '@/types/blog';
import BlogSEO from '@/components/blog/BlogSEO';
import BlogTOC, { Heading } from '@/components/blog/BlogTOC';
import BlogEmailCapture from '@/components/blog/BlogEmailCapture';
import BlogRelatedProducts from '@/components/blog/BlogRelatedProducts';
import NotFound from '@/pages/NotFound';
import { ArrowLeft, Clock, User, Calendar, Share2, HeartHandshake } from 'lucide-react';
import analytics from '@/utils/analyticsService';

const BlogDetail = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    
    const [post, setPost] = useState<BlogPost | null>(null);
    const [relatedArticles, setRelatedArticles] = useState<BlogPost[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Analytics Scroll Tracking
    useEffect(() => {
        if (!post) return;
        
        analytics.trackEvent('blog_view', {
            blog_id: post.id,
            blog_title: post.title,
            blog_slug: post.slug,
            category: post.category
        });

        const handleScroll = () => {
            const scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
            
            ['25', '50', '75', '90'].forEach(milestone => {
                const mark = parseInt(milestone);
                const key = `scrolled_${milestone}_${post.id}`;
                if (scrollPercent >= mark && !sessionStorage.getItem(key)) {
                    sessionStorage.setItem(key, 'true');
                    analytics.trackEvent('blog_scroll', {
                        scroll_depth: mark,
                        blog_id: post.id,
                        blog_title: post.title,
                        blog_slug: post.slug,
                        category: post.category
                    });
                }
            });
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [post]);

    useEffect(() => {
        const fetchPost = async () => {
            setIsLoading(true);
            try {
                if (!slug) return;
                const fetchedPost = await blogService.getPostBySlug(slug);
                if (fetchedPost) {
                    setPost(fetchedPost);
                    const related = await blogService.getRelatedPosts(fetchedPost.category, fetchedPost.slug);
                    setRelatedArticles(related);
                }
            } catch (error) {
                console.error("Failed to fetch post", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchPost();
        window.scrollTo(0, 0); // Reset scroll on load
    }, [slug]);

    const { content1, content2, headings } = useMemo(() => {
        if (!post) return { content1: '', content2: '', headings: [] };
        
        const extractedHeadings: Heading[] = [];
        let matchCounter = 0;

        const processHTML = (html: string) => {
            return html.replace(/<h([23])>(.*?)<\/h\1>/g, (_, level, text) => {
                const cleanText = text.replace(/<[^>]+>/g, '');
                const id = `sec-${matchCounter++}-${cleanText.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 20)}`;
                extractedHeadings.push({ id, text: cleanText, level: parseInt(level) });
                // Note: .scroll-mt-32 helps offset sticky headers when anchor jumping
                return `<h${level} id="${id}" class="scroll-mt-32 font-black text-[#2D1B4E] mb-6 mt-12">${text}</h${level}>`;
            });
        };

        return {
            content1: processHTML(post.contentPart1),
            content2: processHTML(post.contentPart2),
            headings: extractedHeadings
        };
    }, [post]);

    if (isLoading) {
        return (
            <MainLayout>
                <div className="flex justify-center items-center h-screen">
                    <div className="w-12 h-12 border-4 border-gray-100 border-t-[#b5128f] rounded-full animate-spin"></div>
                </div>
            </MainLayout>
        );
    }

    if (!post) return <NotFound />;

    const handleShare = () => {
        analytics.trackEvent('blog_share_click', {
            blog_id: post.id,
            blog_title: post.title,
            blog_slug: post.slug,
            category: post.category
        });
        if (navigator.share) {
            navigator.share({
                title: post.title,
                text: post.metaDescription,
                url: window.location.href,
            });
        } else {
            navigator.clipboard.writeText(window.location.href);
            alert("Link copied to clipboard!");
        }
    };

    const handleCtaClick = () => {
        analytics.trackEvent('blog_cta_click', {
            blog_id: post.id,
            blog_title: post.title,
            blog_slug: post.slug,
            category: post.category
        });
        navigate('/shop');
    };

    return (
        <MainLayout>
            <BlogSEO post={post} />

            <article className="bg-white min-h-screen pb-20 relative">
                
                {/* Hero Section */}
                <header className="relative bg-gray-900 pt-16 pb-24 md:pt-24 md:pb-32 overflow-hidden">
                    <div className="absolute inset-0">
                        <img 
                            src={post.featuredImage} 
                            alt={post.title} 
                            className="w-full h-full object-cover opacity-40"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-transparent" />
                    </div>
                    
                    <div className="relative container mx-auto px-4 max-w-4xl text-center z-10">
                        <div className="mb-6 flex flex-wrap items-center gap-2 text-sm font-bold uppercase tracking-widest text-white/70">
                            <Link to="/" className="hover:text-white/90">Home</Link>
                            <span>/</span>
                            <Link to="/blog" className="hover:text-white/90">Blog</Link>
                            <span>/</span>
                            <span className="text-white">{post.title}</span>
                        </div>
                        <Link to="/blog" className="inline-flex items-center text-white/70 hover:text-white mb-8 transition-colors text-sm font-bold uppercase tracking-widest">
                            <ArrowLeft size={16} className="mr-2" /> Back to Journal
                        </Link>
                        
                        <div className="mb-6">
                            <span className="inline-block px-4 py-1.5 bg-[#b5128f] text-white text-xs font-bold rounded-full uppercase tracking-widest shadow-lg">
                                {post.category}
                            </span>
                        </div>
                        
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight mb-8 drop-shadow-lg">
                            {post.title}
                        </h1>
                        
                        <div className="flex flex-wrap items-center justify-center gap-6 text-white/80 text-sm font-medium">
                            <div className="flex items-center gap-2"><User size={16} /> {post.author}</div>
                            <div className="flex items-center gap-2"><Calendar size={16} /> {new Date(post.publishDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
                            <div className="flex items-center gap-2"><Clock size={16} /> {post.readingTime}</div>
                        </div>
                    </div>
                </header>

                {/* Content Container */}
                <div className="container mx-auto px-4 max-w-7xl -mt-16 md:-mt-24 relative z-20">
                    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-4 md:p-8 lg:p-10 flex flex-col lg:flex-row gap-8 lg:gap-12">
                        
                        {/* Left Sidebar: TOC */}
                        <aside className="w-full lg:w-1/4 flex-shrink-0 lg:sticky lg:top-24 lg:max-h-[calc(100vh-120px)] overflow-y-auto scrollbar-hide pb-8">
                            <BlogTOC headings={headings} />
                            
                            {/* Share & Sticky CTA for Desktop */}
                            <div className="hidden lg:block mt-12 border-t border-gray-100 pt-8 pr-4">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Share Article</p>
                                <button onClick={handleShare} className="flex items-center gap-2 text-gray-600 hover:text-[#b5128f] transition-colors mb-8">
                                    <Share2 size={20} /> Share
                                </button>
                                
                                <div className="bg-[#FFF5F3] p-6 rounded-2xl border border-[#FFE4DE] text-center">
                                    <HeartHandshake className="mx-auto text-[#b5128f] mb-3" size={24} />
                                    <p className="text-sm font-bold text-[#2D1B4E] mb-4">Support our artisans.</p>
                                    <button onClick={handleCtaClick} className="w-full h-10 bg-black text-white text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-[#b5128f] transition-colors">
                                        Shop Collection
                                    </button>
                                </div>
                            </div>
                        </aside>

                        {/* Right Content: Main Article */}
                        <div className="w-full lg:w-3/4 max-w-3xl">
                            
                            {/* Mobile Share */}
                            <div className="lg:hidden flex justify-end mb-8">
                                <button onClick={handleShare} className="flex items-center gap-2 text-gray-600 hover:text-[#b5128f] text-sm font-bold bg-gray-50 px-4 py-2 rounded-full">
                                    <Share2 size={16} /> Share Article
                                </button>
                            </div>

                            <div 
                                className="prose prose-lg md:prose-xl prose-gray max-w-none prose-p:leading-relaxed prose-p:text-gray-600 prose-a:text-[#b5128f] prose-a:no-underline hover:prose-a:underline prose-img:rounded-2xl"
                                dangerouslySetInnerHTML={{ __html: content1 }}
                            />

                            {/* Mid-Article Conversion Block */}
                            <div className="my-16">
                                <BlogRelatedProducts 
                                    productIds={post.relatedProducts.slice(0, 2)} 
                                    title="Featured from this article"
                                    source="mid_article" 
                                />
                            </div>

                            <div 
                                className="prose prose-lg md:prose-xl prose-gray max-w-none prose-p:leading-relaxed prose-p:text-gray-600 prose-a:text-[#b5128f] prose-a:no-underline hover:prose-a:underline prose-img:rounded-2xl"
                                dangerouslySetInnerHTML={{ __html: content2 }}
                            />

                            {/* End of Article Conversion Section */}
                            <div className="mt-20 border-t-2 border-gray-100 pt-16">
                                
                                {/* Impact Banner */}
                                <div className="bg-[#2D1B4E] rounded-3xl p-8 md:p-12 text-center text-white mb-16 shadow-2xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#b5128f] opacity-20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
                                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#F43F5E] opacity-20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4"></div>
                                    
                                    <div className="relative z-10">
                                        <HeartHandshake className="mx-auto text-[#FFE4DE] mb-6" size={48} />
                                        <h3 className="text-3xl font-black mb-6">Every purchase makes an impact.</h3>
                                        <p className="text-lg text-white/80 max-w-xl mx-auto mb-10">
                                            By choosing Kottravai, you are directly supporting rural women entrepreneurs and preserving India's artisan communities.
                                        </p>
                                        <button onClick={handleCtaClick} className="inline-block px-8 h-14 leading-[56px] bg-white text-[#2D1B4E] font-bold uppercase tracking-widest text-sm rounded-xl hover:bg-[#FFE4DE] hover:shadow-lg transition-all">
                                            Shop Handmade Collections
                                        </button>
                                    </div>
                                </div>

                                {/* Bottom Related Products */}
                                <BlogRelatedProducts 
                                    productIds={post.relatedProducts} 
                                    title="Continue your journey"
                                    source="end_article"
                                />

                                {/* Lead Generation */}
                                <BlogEmailCapture post={post} />
                                
                            </div>
                        </div>
                    </div>
                </div>

                {/* Related Articles Footer */}
                {relatedArticles.length > 0 && (
                    <div className="container mx-auto px-4 max-w-7xl mt-24">
                        <div className="flex items-center gap-2 mb-10">
                            <div className="w-2 h-6 bg-gray-300 rounded-sm"></div>
                            <h2 className="text-3xl font-black text-[#2D1B4E] uppercase tracking-widest">
                                Read Next
                            </h2>
                        </div>
                        <div className="grid md:grid-cols-3 gap-8">
                            {relatedArticles.map(related => (
                                <Link key={related.id} to={`/blog/${related.slug}`} className="group block bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all border border-gray-100 overflow-hidden">
                                    <div className="h-48 overflow-hidden">
                                        <img src={related.featuredImage} alt={related.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                                    </div>
                                    <div className="p-6">
                                        <span className="text-xs font-bold text-[#b5128f] uppercase tracking-wider mb-2 block">{related.category}</span>
                                        <h3 className="text-lg font-bold text-gray-900 group-hover:text-[#b5128f] transition-colors line-clamp-2">{related.title}</h3>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </article>
            
            {/* Mobile Sticky CTA */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-gray-200 z-50 lg:hidden shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
                <button onClick={handleCtaClick} className="w-full h-12 bg-black text-white font-bold uppercase tracking-widest text-xs rounded-xl shadow-lg flex items-center justify-center gap-2">
                    Explore Products <ArrowLeft className="rotate-180" size={16} />
                </button>
            </div>
        </MainLayout>
    );
};

export default BlogDetail;
