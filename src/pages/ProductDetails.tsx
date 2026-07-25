import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import axios from 'axios';
import { useParams, Link, useNavigate } from 'react-router-dom';
import MainLayout from '@/layouts/MainLayout';
import { useCart } from '@/context/CartContext';
import { useProducts } from '@/context/ProductContext';
import { useWishlist } from '@/context/WishlistContext';
import { ShoppingBag, Star, Heart, Minus, Plus, X, Check, Share2, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import analytics from '@/utils/analyticsService';
import { getOptimizedImage, IMAGE_SIZES } from '@/utils/imageOptimizer';
import { API_ENDPOINTS } from '@/config/api';
import ProductCustomization, { CustomizationData } from '@/components/shop/ProductCustomization';
import imageCompression from 'browser-image-compression';

const ProductDetails = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const { addToCart, cart, removeFromCart } = useCart();
    const { products, addReview } = useProducts();
    const { toggleWishlist, isInWishlist } = useWishlist();

    const [product, setProduct] = useState<any>(null);
    const [isFetching, setIsFetching] = useState(true);
    const [reviews, setReviews] = useState<any[]>([]);
    const [isReviewsLoading, setIsReviewsLoading] = useState(false);
    const [reviewsError, setReviewsError] = useState<string | null>(null);
    const [reviewsOffset, setReviewsOffset] = useState(0);
    const [reviewsSort, setReviewsSort] = useState<'latest' | 'highest'>('latest');
    const [hasMoreReviews, setHasMoreReviews] = useState(true);
    const REVIEWS_PER_PAGE = 5;

    useEffect(() => {
        const fetchProductBySlug = async () => {
            if (!slug) return;
            setIsFetching(true);
            try {
                // Determine API URL 
                const response = await axios.get(`${API_ENDPOINTS.products}/${slug}`);
                const data = response.data;
                const mappedProduct = {
                    ...data,
                    id: data.id,
                    categorySlug: data.category_slug || data.categorySlug,
                    shortDescription: data.short_description || data.shortDescription || data.description,
                    isBestSeller: data.is_best_seller || data.isBestSeller || false,
                    isLive: data.is_live !== undefined ? data.is_live : (data.isLive !== undefined ? data.isLive : true),
                    keyFeatures: data.key_features || data.keyFeatures || [],
                    features: data.features || [],
                    images: data.images || [],
                    reviews: data.reviews || [],
                    isCustomizable: data.is_customizable !== undefined ? data.is_customizable : data.isCustomizable,
                    customizationCharge: data.customization_charge !== undefined ? Number(data.customization_charge) : data.customizationCharge,
                    allowImageUpload: data.allow_image_upload !== undefined ? data.allow_image_upload : data.allowImageUpload,
                    allowCustomText: data.allow_custom_text !== undefined ? data.allow_custom_text : data.allowCustomText,
                    allowSpecialInstructions: data.allow_special_instructions !== undefined ? data.allow_special_instructions : data.allowSpecialInstructions,
                    maxTextLength: data.max_text_length !== undefined ? data.max_text_length : data.maxTextLength,
                    maxFileSize: data.max_file_size !== undefined ? data.max_file_size : data.maxFileSize,
                    allowedFileTypes: data.allowed_file_types || data.allowedFileTypes,
                    customizableTag: data.customizable_tag || data.customizableTag
                };

                setProduct(mappedProduct);
                // Initial reviews from product fetch
                setReviews(mappedProduct.reviews);
            } catch (err) {
                console.error("Failed to fetch product details", err);
                // 🛡️ [FALLBACK] Try to find the product in the global context if API fails
                if (products && products.length > 0) {
                    const localProduct = products.find(p => p.slug === slug);
                    if (localProduct) {
                        console.log("🛡️ [ProductDetails] Found product in local context fallback");
                        setProduct(localProduct);
                        setReviews(localProduct.reviews || []);
                        setIsFetching(false);
                        return;
                    }
                }
                setProduct(null);
            } finally {
                setIsFetching(false);
            }
        };

        fetchProductBySlug();
    }, [slug]);

    // Reset pagination when product or sort changes
    useEffect(() => {
        setReviewsOffset(0);
        setReviews([]);
    }, [product?.id, reviewsSort]);

    // Optimized effect to fetch reviews based on offset and sort
    useEffect(() => {
        const fetchLatestReviews = async () => {
            if (!product?.id) return;
            
            setIsReviewsLoading(true);
            setReviewsError(null);
            
            try {
                const response = await axios.get(API_ENDPOINTS.reviews, {
                    params: { 
                        product_id: product.id,
                        limit: REVIEWS_PER_PAGE,
                        offset: reviewsOffset,
                        sort: reviewsSort
                    }
                });
                
                const mappedReviews = response.data.map((r: any) => ({
                    ...r,
                    userName: r.user_name || r.userName || 'Anonymous User',
                    date: r.date || r.created_at || null
                }));
                
                if (reviewsOffset === 0) {
                    setReviews(mappedReviews);
                } else {
                    setReviews(prev => [...prev, ...mappedReviews]);
                }
                
                setHasMoreReviews(mappedReviews.length === REVIEWS_PER_PAGE);
            } catch (err: any) {
                console.error("Failed to fetch reviews", err);
                const errorMessage = err.response?.data?.error || "Unable to load reviews. Please try again later.";
                setReviewsError(errorMessage);
            } finally {
                setIsReviewsLoading(false);
            }
        };

        fetchLatestReviews();
    }, [product?.id, reviewsOffset, reviewsSort]);

    const [mainImage, setMainImage] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [activeTab, setActiveTab] = useState<'description' | 'specifications' | 'reviews'>('description');
    const [isReviewPanelOpen, setIsReviewPanelOpen] = useState(false);

    const [reviewForm, setReviewForm] = useState({
        name: '', email: '', rating: 5, comment: '', saveInfo: false
    });

    const [selectedVariant, setSelectedVariant] = useState<any>(null);
    const [zoomStyle, setZoomStyle] = useState<React.CSSProperties>({
        transformOrigin: 'center center',
        transform: 'scale(1)'
    });
    
    // Customization state
    const [customizationData, setCustomizationData] = useState<CustomizationData | undefined>(undefined);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
        // Calculate position as percentage 
        const x = ((e.clientX - left) / width) * 100;
        const y = ((e.clientY - top) / height) * 100;
        
        setZoomStyle({
            transformOrigin: `${x}% ${y}%`,
            transform: 'scale(2.5)'
        });
    };

    const handleMouseLeave = () => {
        setZoomStyle({
            transformOrigin: 'center center',
            transform: 'scale(1)'
        });
    };

    // Custom Request State
    const [isCustomRequestOpen, setIsCustomRequestOpen] = useState(false);
    const [isSubmittingCustom, setIsSubmittingCustom] = useState(false);
    const [customForm, setCustomForm] = useState({
        name: '', email: '', phone: '', message: '', referenceImage: ''
    });



    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const options = {
                    maxSizeMB: 0.1, // Compress to max 100KB
                    maxWidthOrHeight: 800,
                    useWebWorker: true
                };
                const compressedFile = await imageCompression(file, options);
                
                const reader = new FileReader();
                reader.onloadend = () => {
                    setCustomForm({ ...customForm, referenceImage: reader.result as string });
                };
                reader.readAsDataURL(compressedFile);
            } catch (error) {
                console.error("Compression error:", error);
                toast.error("Failed to process image. Please try a smaller image.");
            }
        }
    };

    const handleCustomSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmittingCustom(true);
        try {
            await axios.post(API_ENDPOINTS.customRequest, {
                productName: product?.name,
                name: customForm.name,
                email: customForm.email,
                phone: customForm.phone,
                requestedText: customForm.message,
                referenceImage: customForm.referenceImage
            });
            toast.success('Custom request sent successfully! We will contact you soon.');
            setIsCustomRequestOpen(false);
            setCustomForm({ name: '', email: '', phone: '', message: '', referenceImage: '' });
        } catch (err) {
            console.error(err);
            toast.error('Failed to send request. Please try again.');
        } finally {
            setIsSubmittingCustom(false);
        }
    };


    useEffect(() => {
        if (product) {
            setMainImage(product.image);
            if (product.variants && product.variants.length > 0) {
                setSelectedVariant(product.variants[0]);
            }
            // Track product view
            analytics.trackEvent('product_view', {
                product_id: product.id,
                product_name: product.name,
                category: product.category,
                price: product.price
            });
        }
        window.scrollTo(0, 0);
    }, [product?.id]); // Run when product ID changes, meaning a product was loaded

    // Track Time Spent on Product Page
    useEffect(() => {
        const startTime = Date.now();
        return () => {
            const timeSpent = Math.floor((Date.now() - startTime) / 1000); // in seconds
            if (product) {
                analytics.trackEvent('time_spent_on_product', {
                    product_id: product.id,
                    product_name: product.name,
                    duration_seconds: timeSpent
                });
            }
        };
    }, [product]);

    const SITE_URL = 'https://www.kottravai.in';
    const productUrl = typeof window !== 'undefined'
        ? window.location.href
        : `${SITE_URL}/product/${product?.slug || ''}`;
    const productImage = product?.image
        ? product.image.startsWith('http')
            ? product.image
            : `${SITE_URL}${product.image}`
        : undefined;

    const isAdmin = sessionStorage.getItem('kottravai_admin_session') === 'true';
    const isLive = product?.isLive !== false;

    if (isFetching) {
        return (
            <MainLayout>
                <div className="container mx-auto px-4 py-20 flex flex-col items-center justify-center">
                    <div className="w-12 h-12 border-4 border-brandPink/20 border-t-brandPink rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-xs animate-pulse">Loading Craftsmanship...</p>
                </div>
            </MainLayout>
        );
    }

    if (!product || (!isLive && !isAdmin)) {
        return (
            <MainLayout>
                <div className="container mx-auto px-4 py-20 text-center">
                    <h2 className="text-2xl font-bold mb-4 text-brandPurple">Product Not Found</h2>
                    <p className="text-gray-500 mb-8 max-w-md mx-auto font-medium">This unique creation may have found another home or is currently being prepared in our workshop.</p>
                    <Link to="/shop" className="inline-flex items-center gap-2 px-8 py-3 bg-brandPurple text-white rounded-xl font-bold hover:bg-brandPink transition-all hover:scale-105">
                        <ChevronLeft size={18} />
                        Explore Our Shop
                    </Link>
                </div>
            </MainLayout>
        );
    }

    const isInCart = Array.isArray(cart) && cart.some(item =>
        item.id === product.id &&
        (!selectedVariant || item.selectedVariant?.weight === selectedVariant.weight)
    );

    const handleAddToCart = () => {
        if (isInCart) {
            // Note: Since we only pass product id and variant, this removes all customizations of this variant. For precise removal we'd need hash, but sticking to existing logic for now.
            removeFromCart(product.id, selectedVariant?.weight);
        } else {
            addToCart(product, quantity, selectedVariant || undefined, customizationData);
        }
    };


    const allImages = Array.from(new Set([product.image, ...(product.images || [])]));

    const handlePrevImage = () => {
        const currentIndex = allImages.indexOf(mainImage || product.image);
        const prevIndex = (currentIndex - 1 + allImages.length) % allImages.length;
        setMainImage(allImages[prevIndex]);
        analytics.trackEvent('image_zoom', { interaction: 'prev_image', product_name: product.name });
    };

    const handleNextImage = () => {
        const currentIndex = allImages.indexOf(mainImage || product.image);
        const nextIndex = (currentIndex + 1) % allImages.length;
        setMainImage(allImages[nextIndex]);
        analytics.trackEvent('image_zoom', { interaction: 'next_image', product_name: product.name });
    };

    const handleSubmitReview = async (e: React.FormEvent) => {
        e.preventDefault();
        if (product) {
            // 🛡️ Client Side Validation
            if (reviewForm.rating < 1 || reviewForm.rating > 5) {
                toast.error('Please provide a rating between 1 and 5 stars');
                return;
            }
            if (!reviewForm.comment.trim()) {
                toast.error('Verification comment cannot be empty');
                return;
            }

            try {
                await addReview(product.id, {
                    userName: reviewForm.name,
                    rating: reviewForm.rating,
                    comment: reviewForm.comment
                    // date is now handled by server side only for truth
                });
                
                setIsReviewPanelOpen(false);
                setReviewForm({ name: '', email: '', rating: 5, comment: '', saveInfo: false });
                
                // Reset to first page with current sort to show new review
                if (reviewsOffset === 0) {
                    // Refresh manually if already on page 0
                    const response = await axios.get(API_ENDPOINTS.reviews, {
                        params: { 
                            product_id: product.id,
                            limit: REVIEWS_PER_PAGE,
                            offset: 0,
                            sort: reviewsSort
                        }
                    });
                    const mappedReviews = response.data.map((r: any) => ({
                        ...r,
                        userName: r.user_name || r.userName || 'Anonymous User',
                        date: r.date || r.created_at || null
                    }));
                    setReviews(mappedReviews);
                } else {
                    setReviewsOffset(0);
                }
                
                toast.success('Your experience has been shared. Thank you!');
            } catch (err: any) {
                console.error("Failed to post review", err);
                const errorMessage = err.response?.data?.error || 'Failed to post review. Please try again.';
                toast.error(errorMessage);
            }
        }
    };

    const averageRating = reviews?.length
        ? (reviews.reduce((acc: number, rev: any) => acc + rev.rating, 0) / reviews.length).toFixed(1)
        : null;

    const relatedProducts = products
        .filter(p => p.category === product.category && p.id !== product.id)
        .slice(0, 4);


    return (
        <MainLayout>
            <Helmet>
                <title>{product.name} - Kottravai</title>
                <meta name="description" content={product.shortDescription || product.description?.substring(0, 160) || ''} />
                <link rel="canonical" href={productUrl} />
                <meta property="og:title" content={`${product.name} - Kottravai`} />
                {productImage && <meta property="og:image" content={productImage} />}
                <meta property="og:type" content="product" />
                <meta property="og:url" content={productUrl} />
                <meta property="og:description" content={product.shortDescription || product.description?.substring(0, 160) || ''} />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={`${product.name} - Kottravai`} />
                <meta name="twitter:description" content={product.shortDescription || product.description?.substring(0, 160) || ''} />
                {productImage && <meta name="twitter:image" content={productImage} />}
                <script type="application/ld+json">
                    {JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'Product',
                        name: product.name,
                        image: [productImage || product.image, ...(product.images || [])],
                        description: product.shortDescription || product.description || '',
                        sku: product.slug,
                        url: productUrl,
                        offers: {
                            '@type': 'Offer',
                            priceCurrency: 'INR',
                            price: product.price?.toString() || '0',
                            availability: product.stock && product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
                            url: productUrl
                        }
                    })}
                </script>
                <script type="application/ld+json">
                    {JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'BreadcrumbList',
                        itemListElement: [
                            {
                                '@type': 'ListItem',
                                position: 1,
                                name: 'Home',
                                item: 'https://www.kottravai.in'
                            },
                            {
                                '@type': 'ListItem',
                                position: 2,
                                name: 'Shop',
                                item: 'https://www.kottravai.in/shop'
                            },
                            {
                                '@type': 'ListItem',
                                position: 3,
                                name: product.category || 'Category',
                                item: `https://www.kottravai.in/category/${product.categorySlug || product.category?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`
                            },
                            {
                                '@type': 'ListItem',
                                position: 4,
                                name: product.name,
                                item: window.location.href
                            }
                        ]
                    })}
                </script>
            </Helmet>

            {isAdmin && !isLive && (
                <div className="bg-[#2D1B4E] text-white py-2 text-center text-[10px] font-black uppercase tracking-[0.4em] flex items-center justify-center gap-4">
                    <span className="opacity-50">●</span>
                    DRAFT PREVIEW MODE - This product is currently hidden from customers
                    <span className="opacity-50">●</span>
                </div>
            )}

            <div className="bg-[#FAF9F6] py-3 md:py-4 border-b border-gray-100">
                <div className="container mx-auto px-4 text-[10px] md:text-sm text-gray-400 font-bold uppercase tracking-widest">
                    <Link to="/" className="hover:text-[#8E2A8B]">Home</Link>
                    <span className="mx-2">/</span>
                    <Link to="/shop" className="hover:text-[#8E2A8B]">Shop</Link>
                    {product.category && (
                        <>
                            <span className="mx-2">/</span>
                            <Link
                                to={`/category/${product.categorySlug || product.category.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`}
                                className="hover:text-[#8E2A8B]"
                            >
                                {product.category}
                            </Link>
                        </>
                    )}
                    <span className="mx-2">/</span>
                    <span className="text-gray-900">{product.name}</span>
                </div>
            </div>

            <div className="container mx-auto px-4 py-6 md:py-10 max-w-5xl">
                <div className="flex flex-col lg:flex-row gap-6 lg:gap-10 mb-10">
                    {/* Image Section */}
                    <div className="lg:w-1/2">
                        <div 
                            className="relative bg-white md:bg-gray-50 rounded-2xl overflow-hidden mb-4 border border-gray-100 shadow-sm md:shadow-none group cursor-zoom-in"
                            style={{ aspectRatio: '1/1', minHeight: '280px' }}
                            onMouseMove={handleMouseMove}
                            onMouseLeave={handleMouseLeave}
                        >
                            <div className="w-full h-full p-6 md:p-8 flex items-center justify-center">
                                <img 
                                    src={getOptimizedImage(mainImage || product.image, IMAGE_SIZES.PRODUCT_DETAIL)} 
                                    alt={product.image_alts?.[mainImage || product.image] || product.name} 
                                    width={800}
                                    height={800}
                                    loading="lazy"
                                    decoding="async"
                                    className="w-full h-full object-contain transition-transform duration-300 ease-out will-change-transform" 
                                    style={zoomStyle}
                                />
                            </div>

                            {/* View helper */}
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-black/5 backdrop-blur-md rounded-full text-[9px] font-bold text-gray-400 uppercase tracking-widest pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                                Hover to Zoom Details
                            </div>

                            {allImages.length > 1 && (
                                <>
                                    <button
                                        onClick={handlePrevImage}
                                        className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 hover:bg-white flex items-center justify-center text-gray-800 shadow-md opacity-0 group-hover:opacity-100 transition-all duration-300 z-10"
                                    >
                                        <ChevronLeft size={24} />
                                    </button>
                                    <button
                                        onClick={handleNextImage}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 hover:bg-white flex items-center justify-center text-gray-800 shadow-md opacity-0 group-hover:opacity-100 transition-all duration-300 z-10"
                                    >
                                        <ChevronRight size={24} />
                                    </button>
                                </>
                            )}
                        </div>
                        {product.images && product.images.length > 0 && (
                            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                                {product.images.map((img: string, idx: number) => (
                                    <button
                                        key={idx}
                                        onClick={() => setMainImage(img)}
                                        className={`w-14 h-14 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all ${mainImage === img ? 'border-[#8E2A8B] shadow-md' : 'border-gray-100 hover:border-gray-200'}`}
                                        style={{ aspectRatio: '1/1' }}
                                    >
                                        <img 
                                            src={getOptimizedImage(img, IMAGE_SIZES.THUMBNAIL)} 
                                            alt={product.image_alts?.[img] || `${product.name} thumbnail ${idx + 1}`} 
                                            width={100}
                                            height={100}
                                            className="w-full h-full object-cover" 
                                            loading="lazy" 
                                            decoding="async"
                                        />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Content Section */}
                    <div className="lg:w-1/2">


                        <h1 className="text-xl md:text-2xl font-bold font-comfortaa text-brandPurple mb-3 leading-snug">{product.name}</h1>

                        <div className="flex items-center gap-3 mb-4">
                            {product.isCustomRequest ? (
                                <span className="text-lg font-bold text-brandPurple bg-purple-50 px-4 py-2 rounded-xl border border-purple-100 italic">Price on Request</span>
                            ) : (
                                <div className="flex flex-col">
                                    <span className="text-2xl font-bold font-montserrat text-brandPink">
                                        ₹{Number(Number(selectedVariant ? selectedVariant.price : product.price) * quantity + (customizationData?.isCustomized ? Number(customizationData.customizationCharge) : 0)).toLocaleString('en-IN')}
                                    </span>
                                    {customizationData?.isCustomized && (
                                        <span className="text-[10px] text-gray-500 font-bold uppercase">Includes ₹{customizationData.customizationCharge} customization fee</span>
                                    )}
                                </div>
                            )}
                            <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-0.5 text-yellow-400">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <Star key={star} size={12} fill={Number(averageRating) >= star ? "currentColor" : "none"} className={Number(averageRating) >= star ? "text-yellow-400" : "text-gray-200"} />
                                    ))}
                                </div>
                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">
                                    {averageRating ? `${averageRating}/5 (${reviews.length} Reviews)` : 'No reviews yet'}
                                </span>
                            </div>
                        </div>

                        {/* Variant Selection */}
                        {!product.isCustomRequest && product.variants && product.variants.length > 0 && (
                            <div className="mb-4 space-y-2">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Select Grams</label>
                                <div className="flex flex-wrap gap-2">
                                    {product.variants.map((variant: any, idx: number) => (
                                        <button
                                            key={idx}
                                            onClick={() => setSelectedVariant(variant)}
                                            className={`min-w-[64px] px-3 py-1.5 rounded-lg border-2 transition-all font-bold text-xs ${selectedVariant?.weight === variant.weight ? 'border-[#b5128f] bg-[#b5128f] text-white' : 'border-gray-100 text-gray-600 hover:border-[#b5128f] hover:text-[#b5128f]'}`}
                                        >
                                            {variant.weight}{/^\d+$/.test(variant.weight) ? 'g' : ''}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="text-sm text-gray-500 mb-5 leading-relaxed font-medium line-clamp-4">
                            {product.shortDescription || product.description || "Handcrafted with love and organic materials."}
                        </div>

                        {/* Customization Module */}
                        {!product.isCustomRequest && product.isCustomizable && (
                            <ProductCustomization 
                                product={product} 
                                onCustomizationChange={setCustomizationData} 
                            />
                        )}

                        {product.category === 'Essential Care' ? (
                            <div className="space-y-4 mb-6">
                                <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                                    <span className="text-red-600 font-black uppercase tracking-widest text-[10px]">Temporarily Out of Stock</span>
                                </div>
                                <button
                                    onClick={() => toggleWishlist(product)}
                                    className={`w-full h-11 rounded-xl font-semibold font-montserrat uppercase tracking-[0.15em] text-xs transition-all flex items-center justify-center gap-2 ${isInWishlist(product.id) ? 'bg-[#EC4899] text-white' : 'bg-brandBlack text-white hover:bg-[#b5128f]'}`}
                                >
                                    <Heart size={14} fill={isInWishlist(product.id) ? "currentColor" : "none"} />
                                    {isInWishlist(product.id) ? 'Saved to Wishlist' : 'Add to Wishlist'}
                                </button>
                                <p className="text-gray-400 text-[10px] font-medium text-center italic">Be the first to know when it's back!</p>
                            </div>
                        ) : !product.isCustomRequest ? (
                            <div className="space-y-3 mb-6">
                                <div className="flex gap-3 h-11">
                                    {/* Quantity */}
                                    <div className="flex items-center bg-gray-50 rounded-xl px-2 border border-gray-100">
                                        <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-8 h-full flex items-center justify-center text-gray-400 hover:text-black transition"><Minus size={14} /></button>
                                        <span className="w-8 text-center font-black text-base">{quantity}</span>
                                        <button onClick={() => setQuantity(quantity + 1)} className="w-8 h-full flex items-center justify-center text-gray-400 hover:text-black transition"><Plus size={14} /></button>
                                    </div>

                                    {/* Cart */}
                                    <button
                                        onClick={handleAddToCart}
                                        className={`flex-1 rounded-xl font-semibold font-montserrat uppercase tracking-[0.15em] text-xs transition-all flex items-center justify-center gap-2 ${isInCart ? 'bg-gray-100 text-gray-400' : 'bg-brandPink text-white hover:scale-[1.02] active:scale-95'}`}
                                    >
                                        {isInCart ? <><Check size={14} /> In Your Bag</> : <><ShoppingBag size={14} /> Add To Cart</>}
                                    </button>
                                </div>
                                <button
                                    onClick={() => {
                                        if (!isInCart) addToCart(product, quantity, selectedVariant || undefined, customizationData);
                                        navigate('/checkout');
                                    }}
                                    className="w-full h-11 rounded-xl font-semibold font-montserrat uppercase tracking-[0.15em] text-xs transition-all bg-brandBlack text-white hover:bg-brandPink active:scale-95 mt-4"
                                >
                                    Buy Now
                                </button>
                            </div>
                        ) : (
                            <div className="mb-6">
                                <button onClick={() => setIsCustomRequestOpen(true)} className="w-full h-11 bg-black text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-[#b5128f] transition-colors">Request Customization</button>
                            </div>
                        )}

                        <div className="flex items-center gap-6 pt-4 border-t border-gray-100">
                            <button className="flex items-center gap-2 group">
                                <div className="w-8 h-8 rounded-full border border-gray-100 flex items-center justify-center group-hover:bg-red-50 group-hover:border-red-100 transition-all"><Heart size={14} className="group-hover:text-red-500 transition-colors" /></div>
                                <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 group-hover:text-black">Wishlist</span>
                            </button>
                            <button onClick={() => {
                                if (navigator.share) {
                                    navigator.share({ title: product.name, url: window.location.href });
                                    analytics.trackEvent('product_share', { method: 'native_share', product_name: product.name });
                                }
                            }} className="flex items-center gap-2 group">
                                <div className="w-8 h-8 rounded-full border border-gray-100 flex items-center justify-center group-hover:bg-blue-50 group-hover:border-blue-100 transition-all"><Share2 size={14} className="group-hover:text-blue-500 transition-colors" /></div>
                                <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 group-hover:text-black">Share</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Tabs & Content */}
                <div className="mt-12">
                    <div className="flex gap-8 border-b border-gray-100 mb-12 overflow-x-auto no-scrollbar">
                        {(['description', 'specifications', 'reviews'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`pb-6 text-sm font-black uppercase tracking-[0.2em] transition-all relative whitespace-nowrap ${activeTab === tab ? 'text-[#b5128f]' : 'text-gray-300 hover:text-gray-500'}`}
                            >
                                {tab}
                                {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#b5128f] animate-in slide-in-from-left duration-300"></div>}
                            </button>
                        ))}
                    </div>

                    <div className="w-full">
                        {activeTab === 'description' && (
                            <div className="text-gray-500 leading-loose font-medium space-y-8 animate-in fade-in duration-500">
                                <div className="text-base whitespace-pre-wrap">{product.description}</div>
                                {product.keyFeatures && (
                                    <div className="bg-gray-50 p-8 rounded-[2rem] border border-gray-100">
                                        <h4 className="text-[#2D1B4E] font-black uppercase tracking-widest text-sm mb-6">Key Highlights</h4>
                                        <ul className="grid sm:grid-cols-2 gap-4">
                                            {product.keyFeatures.map((f: string, i: number) => (
                                                <li key={i} className="flex items-center gap-3 text-sm"><div className="w-2 h-2 rounded-full bg-[#b5128f]"></div> {f}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'specifications' && (
                            <div className="animate-in fade-in duration-500">
                                <div className="border border-gray-100 rounded-[2rem] overflow-hidden">
                                    <table className="w-full">
                                        <tbody className="divide-y divide-gray-100">
                                            {product.features?.map((f: string, i: number) => {
                                                const [k, v] = f.split(':');
                                                return (
                                                    <tr key={i} className="hover:bg-gray-50/50">
                                                        <td className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400 w-1/3">{k}</td>
                                                        <td className="p-6 text-sm font-bold text-[#2D1B4E]">{v}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {activeTab === 'reviews' && (
                            <div className="animate-in fade-in duration-500 space-y-12">
                                <div className="space-y-8">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-6">
                                        <h3 className="text-xl font-bold text-[#2D1B4E]">Customer Feedback</h3>
                                        <div className="flex items-center gap-4">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Sort By</span>
                                            <select 
                                                value={reviewsSort}
                                                onChange={(e) => {
                                                    setReviewsSort(e.target.value as any);
                                                }}
                                                className="bg-gray-50 border-none rounded-lg px-4 py-2 text-xs font-bold text-[#2D1B4E] outline-none"
                                            >
                                                <option value="latest">Latest</option>
                                                <option value="highest">Highest Rated</option>
                                            </select>
                                        </div>
                                    </div>

                                    {isReviewsLoading && reviews.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                                            <div className="w-10 h-10 border-4 border-brandPink/10 border-t-brandPink rounded-full animate-spin"></div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 animate-pulse">Checking records...</p>
                                        </div>
                                    ) : reviewsError ? (
                                        <div className="bg-red-50 p-6 rounded-2xl border border-red-100 flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-red-400"></div>
                                            <p className="text-red-500 font-bold text-xs uppercase tracking-widest">{reviewsError}</p>
                                        </div>
                                    ) : reviews && reviews.length > 0 ? (
                                        <>
                                            <div className="space-y-6">
                                                {reviews.map((rev: any) => (
                                                    <div key={rev.id} className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                                        <div className="flex items-center gap-4 mb-4">
                                                            <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center font-black text-[#b5128f] border border-gray-100">
                                                                {rev.userName ? rev.userName[0].toUpperCase() : 'U'}
                                                            </div>
                                                            <div>
                                                                <h5 className="font-bold text-[#2D1B4E]">{rev.userName}</h5>
                                                                <div className="flex text-yellow-400 scale-75 -ml-4">
                                                                    {[1, 2, 3, 4, 5].map(s => (
                                                                        <Star key={s} size={14} fill={rev.rating >= s ? "currentColor" : "none"} />
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            {rev.date && (
                                                                <div className="ml-auto text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                                                                    {new Date(rev.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <p className="text-gray-500 leading-relaxed italic text-sm">"{rev.comment}"</p>
                                                    </div>
                                                ))}
                                            </div>

                                            {hasMoreReviews && (
                                                <div className="flex justify-center pt-4">
                                                    <button 
                                                        onClick={() => setReviewsOffset(prev => prev + REVIEWS_PER_PAGE)}
                                                        disabled={isReviewsLoading}
                                                        className="px-8 py-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-500 hover:text-brandPink hover:border-brandPink transition-all flex items-center gap-2 disabled:opacity-50"
                                                    >
                                                        {isReviewsLoading ? <div className="w-4 h-4 border-2 border-gray-200 border-t-brandPink rounded-full animate-spin"></div> : 'View More Stories'}
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="text-center py-16 bg-gray-50 rounded-[2rem] border border-dotted border-gray-200">
                                            <Star size={32} className="text-gray-200 mx-auto mb-4" />
                                            <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">No reviews yet for this masterpiece</p>
                                            <p className="text-gray-300 text-[9px] mt-1 italic">Be the first to share your experience!</p>
                                        </div>
                                    )}
                                </div>
                                <button onClick={() => setIsReviewPanelOpen(true)} className="bg-black text-white px-10 py-5 rounded-[1.25rem] font-black uppercase tracking-widest text-xs hover:bg-[#b5128f] transition-colors">Write Your Review</button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Related Products */}
                {relatedProducts.length > 0 && (
                    <div className="mt-12 pt-10 border-t border-gray-100">
                        <h3 className="text-3xl font-black text-[#2D1B4E] mb-8">You May Also <span className="text-[#b5128f]">Like</span></h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
                            {relatedProducts.map(rel => (
                                <Link
                                    key={rel.id}
                                    to={`/product/${rel.slug}`}
                                    className="group"
                                    onClick={() => analytics.trackEvent('related_product_click', { original_product: product.name, clicked_product: rel.name })}
                                >
                                    <div 
                                        className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden mb-4 shadow-sm relative"
                                        style={{ aspectRatio: '1/1', minHeight: '250px' }}
                                    >
                                        <div className="w-full h-full relative">
                                            <img
                                                src={getOptimizedImage(rel.image, IMAGE_SIZES.CARD)}
                                                width={400}
                                                height={400}
                                                loading="lazy"
                                                decoding="async"
                                                className={`w-full h-full object-cover object-center transform scale-[0.95] transition-all duration-500 ${rel.images && rel.images.length > 0 ? 'group-hover:opacity-0' : 'group-hover:scale-110'}`}
                                                alt={rel.name}
                                            />
                                            {rel.images && rel.images.length > 0 && (
                                                <img
                                                    src={getOptimizedImage(rel.images[0], IMAGE_SIZES.CARD)}
                                                    width={400}
                                                    height={400}
                                                    loading="lazy"
                                                    decoding="async"
                                                    className="absolute inset-0 w-full h-full object-cover object-center transform scale-[0.95] opacity-0 group-hover:opacity-100 transition-all duration-500 group-hover:scale-110"
                                                    alt={`${rel.name} hover`}
                                                />
                                            )}
                                        </div>
                                    </div>
                                    <h4 className="font-bold text-[#2D1B4E] group-hover:text-[#b5128f] transition-colors truncate px-2">{rel.name}</h4>
                                    <div className="text-[#b5128f] font-black mt-1 px-2">
                                        {(rel.variants && rel.variants.length > 0) || Number(rel.price) === 0 ? (
                                            <span className="text-[10px] uppercase tracking-widest font-black">View Price</span>
                                        ) : (
                                            <>₹{Number(rel.price).toLocaleString('en-IN')}</>
                                        )}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Mobile Sticky Bar */}
            {!product.isCustomRequest && product.category !== 'Essential Care' && (
                <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-t border-gray-100 px-6 py-4 flex items-center justify-between gap-6 animate-in slide-in-from-bottom duration-500 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-tighter text-gray-400">Final Total</span>
                        <span className="text-xl font-black text-[#b5128f]">₹{Number(selectedVariant ? selectedVariant.price * quantity : product.price * quantity).toLocaleString('en-IN')}</span>
                    </div>
                    <button
                        onClick={() => {
                            if (!isInCart) addToCart(product, quantity, selectedVariant || undefined);
                            navigate('/checkout');
                        }}
                        className="flex-1 bg-black text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs active:scale-95 transition-all"
                    >
                        Checkout Now
                    </button>
                </div>
            )}

            {/* Review Modal */}
            {isReviewPanelOpen && (
                <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-4">
                    <div className="absolute inset-0 bg-[#2D1B4E]/40 backdrop-blur-sm" onClick={() => setIsReviewPanelOpen(false)}></div>
                    <div className="relative bg-white w-full max-w-lg rounded-[2.5rem] p-8 md:p-12 shadow-2xl animate-in fade-in slide-in-from-bottom duration-500">
                        <button onClick={() => setIsReviewPanelOpen(false)} className="absolute top-8 right-8 text-gray-400 hover:text-black transition-colors"><X size={24} /></button>
                        <h3 className="text-3xl font-black text-[#2D1B4E] mb-2">Share Your Story</h3>
                        <p className="text-gray-400 text-sm mb-8 font-medium">Your feedback inspires our craftsmanship.</p>

                        <form onSubmit={handleSubmitReview} className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Rate Your Experience</label>
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4, 5].map(s => (
                                        <button key={s} type="button" onClick={() => setReviewForm({ ...reviewForm, rating: s })} className={`transition-colors ${reviewForm.rating >= s ? 'text-yellow-400' : 'text-gray-100 hover:text-gray-200'}`}><Star size={32} fill="currentColor" /></button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-4">
                                <input required placeholder="Your Professional Name" className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-[#b5128f]/20 outline-none" value={reviewForm.name} onChange={e => setReviewForm({ ...reviewForm, name: e.target.value })} />
                                <textarea required rows={4} placeholder="Your Detailed Experience..." className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-[#b5128f]/20 outline-none" value={reviewForm.comment} onChange={e => setReviewForm({ ...reviewForm, comment: e.target.value })}></textarea>
                            </div>
                            <button type="submit" className="w-full bg-[#b5128f] text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-[#910e73] transition-all active:scale-95">Post Review</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Custom Request Modal */}
            {isCustomRequestOpen && (
                <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-4">
                    <div className="absolute inset-0 bg-[#2D1B4E]/40 backdrop-blur-sm" onClick={() => setIsCustomRequestOpen(false)}></div>
                    <div className="relative bg-white w-full max-w-lg rounded-[2.5rem] p-8 md:p-12 shadow-2xl animate-in fade-in slide-in-from-bottom duration-500 max-h-[90vh] overflow-y-auto">
                        <button onClick={() => setIsCustomRequestOpen(false)} className="absolute top-8 right-8 text-gray-400 hover:text-black transition-colors"><X size={24} /></button>
                        <h3 className="text-3xl font-black text-[#2D1B4E] mb-2">Custom Request</h3>
                        <p className="text-gray-400 text-sm mb-8 font-medium">Tell us what you need, and we'll craft it for you.</p>

                        <form onSubmit={handleCustomSubmit} className="space-y-6">
                            <div className="space-y-4">
                                <input required placeholder="Your Name" className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-[#b5128f]/20 outline-none" value={customForm.name} onChange={e => setCustomForm({ ...customForm, name: e.target.value })} />
                                <input required type="email" placeholder="Email Address" className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-[#b5128f]/20 outline-none" value={customForm.email} onChange={e => setCustomForm({ ...customForm, email: e.target.value })} />
                                <input required type="tel" placeholder="Phone Number" className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-[#b5128f]/20 outline-none" value={customForm.phone} onChange={e => setCustomForm({ ...customForm, phone: e.target.value })} />

                                <textarea rows={4} placeholder="Describe your custom requirement..." className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-[#b5128f]/20 outline-none" value={customForm.message} onChange={e => setCustomForm({ ...customForm, message: e.target.value })}></textarea>

                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Reference Image (Optional)</label>
                                    <input type="file" accept="image/*" onChange={handleImageUpload} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100" />
                                    {customForm.referenceImage && <p className="text-xs text-green-600 mt-1 flex items-center gap-1"><Check size={12} /> Image selected</p>}
                                </div>
                            </div>
                            <button type="submit" disabled={isSubmittingCustom} className="w-full bg-[#b5128f] text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-[#910e73] transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed">
                                {isSubmittingCustom ? 'Sending...' : 'Send Request'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

        </MainLayout>
    );
};

export default ProductDetails;