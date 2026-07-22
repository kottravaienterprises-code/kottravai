
// Review Interface
export interface Review {
    id: string;
    userName: string;
    email?: string; // Added to match UI
    rating: number; // 1-5
    comment: string;
    date: string; // ISO string
}

// Product Variant Interface
export interface ProductVariant {
    weight: string;
    price: number;
    images?: string[];
}

// Product Interface
export interface Product {
    id: string;
    name: string;
    price: number;
    category: string;
    image: string;
    slug: string;
    categorySlug?: string;
    shortDescription?: string;
    description?: string;
    keyFeatures?: string[];
    features?: string[]; // Specifications (Key: Value)
    images?: string[];
    image_alts?: Record<string, string>;
    reviews?: Review[]; // Array of reviews
    stock?: number;
    isBestSeller?: boolean;
    isGiftBundleItem?: boolean;
    isLive?: boolean;
    isCustomRequest?: boolean;
    defaultFormFields?: Array<{
        id: string;
        label: string;
        placeholder?: string;
        type: 'text' | 'email' | 'tel' | 'file' | 'textarea' | 'number';
        required: boolean;
        isDefault: boolean;
    }>;
    customFormConfig?: Array<{
        id: string;
        label: string;
        type: 'text' | 'textarea' | 'number';
        placeholder?: string;
        required?: boolean;
    }>;
    variants?: ProductVariant[];
    createdAt?: string;
    salesCount?: number;
    rating?: number;
    is_affiliate_eligible?: boolean;
    affiliate_commission_rate?: number;
    affiliate_payout_type?: 'percentage' | 'fixed';
    affiliate_fixed_amount?: number;
    min_affiliate_level?: string;
    gstRate?: number;
    gst_rate?: number;
    original_id?: string;
    product_name?: string;
    productName?: string;
    title?: string;
}

// Sample product to visualize changes immediately
export const products: Product[] = [
    {
        id: '1',
        name: 'Handcrafted Coconut Shell Cup',
        price: 450,
        category: 'Coconut Shell Products',
        categorySlug: 'coconut-shell-products',
        image: 'https://images.unsplash.com/photo-1596436065565-dfc49cb376dc?auto=format&fit=crop&q=80&w=800',
        slug: 'handcrafted-coconut-shell-cup',
        shortDescription: 'Eco-friendly, sustainable, and handcrafted coconut shell cup perfect for your daily beverages.',
        description: 'Experience the rustic charm of nature with our Handcrafted Coconut Shell Cup. Meticulously polished and treated with natural oils, this cup is not just a vessel but a piece of art. It is perfect for serving herbal teas, coffee, or even cool refreshing drinks. Being 100% natural, it adds an earthy touch to your kitchen collection.',
        keyFeatures: [
            'Made from 100% natural and reclaimed coconut shells',
            'Handcrafted by skilled rural artisans',
            'Comes with a fitted lid and curved natural handle',
            'Stable round base for safe placement',
            'Eco-friendly, biodegradable & plastic-free',
            'Lightweight, durable & sustainably sourced',
            'Ideal for serving herbal drinks, water, and traditional beverages',
            'Perfect as rustic kitchen décor or handmade gifting',
            'Retains natural coconut shell patterns for an authentic look'
        ],
        features: [
            'Material: 100% Natural Coconut Shell',
            'Capacity: 250ml - 300ml (Approx)',
            'Finish: Polished with Natural Coconut Oil',
            'Weight: 150g',
            'Care Instructions: Hand wash only, do not use in microwave'
        ],
        images: [
            'https://images.unsplash.com/photo-1628102491629-778571d893a3?auto=format&fit=crop&q=80&w=800',
            'https://images.unsplash.com/photo-1614737662709-64eb772d1742?auto=format&fit=crop&q=80&w=800'
        ],
        isGiftBundleItem: true,
        reviews: []
    },
    {
        id: '2',
        name: 'Custom Terracotta Planter',
        price: 0,
        category: 'Handmade Jewellery',
        categorySlug: 'handmade-jewellery',
        image: 'https://images.unsplash.com/photo-1459156212016-c812468e2115?auto=format&fit=crop&q=80&w=800',
        slug: 'custom-terracotta-planter',
        shortDescription: 'Designed by you, crafted by us. Create a unique terracotta piece for your home.',
        description: 'Have a specific design in mind? Our skilled artisans can bring your vision to life. Whether it is a specific size, shape, or pattern, submit your request and we will craft a custom terracotta masterpiece just for you.',
        keyFeatures: [
            'Fully customizable dimensions and designs',
            'Hand-molded by master potters',
            'Natural, breathable terracotta clay',
            'Weather-resistant for indoor or outdoor use'
        ],
        features: [
            'Material: Natural Clay',
            'Turnaround Time: 2-3 Weeks',
            'Minimum Order: 1 Unit'
        ],
        images: [],
        reviews: [],
        isCustomRequest: true,
        defaultFormFields: [
            { id: 'name', label: 'Your Name', required: true, type: 'text', isDefault: true },
            { id: 'phone', label: 'Phone Number', required: true, type: 'tel', isDefault: true },
            { id: 'email', label: 'Email Address', required: true, type: 'email', isDefault: true },
        ],
        customFormConfig: [
            { id: 'dimensions', label: 'Approximate Dimensions (H x W)', type: 'text', placeholder: 'e.g. 12in x 8in' },
            { id: 'quantity', label: 'Quantity Needed', type: 'number', placeholder: '1' }
        ]
    },
    {
        id: '3',
        name: 'Poondu Idli Podi',
        price: 100,
        category: 'Idli Podi',
        categorySlug: 'idli-podi',
        image: 'https://images.unsplash.com/photo-1589301760557-01e304b281f9?auto=format&fit=crop&q=80&w=800',
        slug: 'poondu-idli-podi',
        shortDescription: 'Flavorful Poondu (garlic) idli podi available in 50g & 100g packs for a spicy and traditional South Indian side dish.',
        description: 'Our Poondu Idli Podi is a fiery and flavorful spice blend made from roasted lentils, dried red chilies, and generous amounts of garlic. It is the perfect accompaniment to hot fluffy idlis or crispy dosas. Just mix with gingelly oil or ghee and enjoy the authentic taste of South India.',
        keyFeatures: [
            'Authentic Homemade Recipe',
            'Rich Garlic Flavor',
            'No Artificial Preservatives',
            'Freshly Ground Spices'
        ],
        features: [
            'Ingredients: Urad Dal, Chana Dal, Red Chilies, Garlic, Salt, Curry Leaves',
            'Shelf Life: 6 Months',
            'Storage: Air-tight container'
        ],
        images: [
            'https://images.unsplash.com/photo-1589301760557-01e304b281f9?auto=format&fit=crop&q=80&w=800'
        ],
        variants: [
            { weight: '50', price: 100 },
            { weight: '100', price: 200 }
        ],
        isGiftBundleItem: true,
        reviews: []
    },
    {
        id: '4',
        name: 'Vibrant Festival Terracotta Earrings',
        price: 599,
        category: 'Festival Wear',
        categorySlug: 'festival-wear',
        image: 'https://images.unsplash.com/photo-1635767798638-3e25273a8236?auto=format&fit=crop&q=80&w=800',
        slug: 'vibrant-festival-terracotta-earrings',
        shortDescription: 'Colorful and intricately designed terracotta earrings perfect for festive occasions.',
        description: 'Elevate your festive attire with our Vibrant Festival Terracotta Earrings. Hand-painted with eco-friendly acrylics and featuring intricate traditional motifs, these lightweight earrings are designed to provide comfort throughout long celebrations while making a bold statement.',
        keyFeatures: [
            'Hand-painted traditional designs',
            'Lightweight and comfortable for long wear',
            'Made from superior quality clay',
            'Hypoallergenic hooks'
        ],
        features: [
            'Material: Hand-baked Terracotta Clay',
            'Weight: 20g per pair',
            'Occasion: Festival & Traditional Wear'
        ],
        images: [],
        reviews: []
    },
    {
        id: '5',
        name: 'Royal Heritage Bridal Terracotta Set',
        price: 2499,
        category: 'Bridal Set',
        categorySlug: 'bridal-set',
        image: 'https://images.unsplash.com/photo-1617033935328-fd23296de14a?auto=format&fit=crop&q=80&w=800',
        slug: 'royal-heritage-bridal-terracotta-set',
        shortDescription: 'A complete, majestic terracotta jewelry set meticulously crafted for the modern bride looking for a traditional touch.',
        description: 'Our Royal Heritage Bridal Terracotta Set is a masterpiece of craftsmanship. Including a heavy necklace, matching jhumkas, and bangles, this set is adorned with traditional temple patterns. Each piece is carefully baked and finished to a smooth, elegant texture, offering a unique and sustainable alternative for your big day.',
        keyFeatures: [
            'Full set: Necklace, Jhumkas, and Bangles',
            'Intricate temple jewelry motifs',
            'Durable and sturdier than regular terracotta',
            'Adjustable necklace length'
        ],
        features: [
            'Set Includes: 1 Necklace, 2 Earrings, 2 Bangles',
            'Material: High-fired Terracotta',
            'Finish: Matte Antique Finish'
        ],
        images: [],
        reviews: []
    },
    {
        id: '6',
        name: 'Minimalist Daily Wear Terracotta Studs',
        price: 299,
        category: 'Daily Wear',
        categorySlug: 'daily-wear',
        image: 'https://images.unsplash.com/photo-1543290954-bd6da8bb6648?auto=format&fit=crop&q=80&w=800',
        slug: 'minimalist-daily-wear-terracotta-studs',
        shortDescription: 'Elegant and simple terracotta studs for a subtle, earthy addition to your everyday wardrobe.',
        description: 'Perfect for work or casual outings, these Minimalist Daily Wear Terracotta Studs offer an understated elegance. Crafted in versatile neutral tones, they represent the perfect blend of modern minimalism and traditional craft. Their lightweight nature makes them ideal for daily use.',
        keyFeatures: [
            'Simple geometric designs',
            'Extremely lightweight',
            'Natural earthy colors',
            'Water-resistant finish'
        ],
        features: [
            'Diameter: 1.5 cm',
            'Material: Natural Clay',
            'Backing: Stainless Steel Studs'
        ],
        images: [],
        reviews: []
    },
    {
        id: '7',
        name: 'Celebration Gift Hamper',
        price: 3499,
        category: 'Hampers',
        categorySlug: 'hampers',
        image: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&q=80&w=800',
        slug: 'celebration-gift-hamper',
        shortDescription: 'A premium, thoughtfully curated hamper featuring our best-selling handicrafts and gourmet heritage mixes.',
        description: 'Our Celebration Gift Hamper is the ultimate expression of care and craftsmanship. Each hamper is meticulously curated with a selection of hand-picked coconut shell crafts, traditional terracotta jewelry, and our signature heritage food mixes. Perfect for weddings, corporate gifting, or special family milestones.',
        keyFeatures: [
            'Curated mix of handicrafts & gourmet foods',
            'Premium sustainable box packaging',
            'Customizable personalized message card',
            'Supports multiple rural artisan communities'
        ],
        features: [
            'Includes: 1 Coco Cup, 1 Terracotta Set, 3 Heritage Mixes',
            'Packaging: Sustainable Kraft Box with Silk Ribbon',
            'Customization: Hand-written note included'
        ],
        images: [],
        reviews: [],
        isBestSeller: true
    },
    {
        id: '8',
        name: 'Instant Moringa Nourish Mix',
        price: 350,
        category: 'Instant Nourish',
        categorySlug: 'instant-nourish',
        image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&q=80&w=800',
        slug: 'instant-moringa-nourish-mix',
        shortDescription: 'Nutrient-rich Moringa powder mix for an instant health boost. Just add water or milk.',
        description: 'Our Instant Moringa Nourish Mix is a powerhouse of vitamins and minerals. Sourced from organic farms, this finely ground powder is perfect for busy mornings. It dissolves instantly and provides sustained energy throughout the day.',
        createdAt: new Date().toISOString(),
        reviews: []
    },
    {
        id: '9',
        name: 'Turmeric Latte Instant Mix',
        price: 299,
        category: 'Instant Nourish',
        categorySlug: 'instant-nourish',
        image: 'https://images.unsplash.com/photo-1615485290382-441e4d0c9cb5?auto=format&fit=crop&q=80&w=800',
        slug: 'turmeric-latte-instant-mix',
        shortDescription: 'Golden milk mix with turmeric, ginger, and black pepper for immunity and wellness.',
        description: 'Rejuvenate your senses with our Turmeric Latte Instant Mix. A perfect blend of traditional spices that promotes immunity and reduces inflammation. Enjoy a warm cup before bed for a restful sleep.',
        createdAt: new Date().toISOString(),
        reviews: []
    }
];

export const categories = [
    // --- Parent Categories ---
    { name: 'Handicrafts', count: 0, slug: 'handicrafts' },
    { name: 'Heritage Mixes', count: 0, slug: 'heritage-mixes' },
    { name: 'Masala Powders', count: 0, slug: 'masala-powders' },
    { name: 'Instant Nourish', count: 0, slug: 'instant-nourish' },
    { name: 'Essential Care', count: 0, slug: 'essential-care' },
    { name: 'Hampers', count: 0, slug: 'hampers' },

    // --- Sub Categories: Handicrafts ---
    { name: 'Coconut Shell Products', count: 0, slug: 'coconut-shell-products', parent: 'handicrafts' },
    { name: 'Handmade Jewellery', count: 0, slug: 'handmade-jewellery', parent: 'handicrafts' },
    { name: 'Festival Wear', count: 0, slug: 'festival-wear', parent: 'handmade-jewellery' },
    { name: 'Bridal Set', count: 0, slug: 'bridal-set', parent: 'handmade-jewellery' },
    { name: 'Daily Wear', count: 0, slug: 'daily-wear', parent: 'handmade-jewellery' },
    { name: 'Banana Fiber Products', count: 0, slug: 'banana-fiber-products', parent: 'handicrafts' },

    // --- Sub Categories: Heritage Mixes ---
    { name: 'Idli Podi', count: 0, slug: 'idli-podi', parent: 'heritage-mixes' },
    { name: 'Dosa Batter Mix', count: 0, slug: 'dosa-batter-mix', parent: 'heritage-mixes' }
];
