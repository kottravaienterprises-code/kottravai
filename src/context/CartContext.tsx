import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { Product } from '@/data/products';
import { useAuth } from './AuthContext';
import { useProducts } from './ProductContext';
import analytics from '@/utils/analyticsService';
import CartEmailModal from '@/components/CartEmailModal';

export interface CartItem extends Product {
    quantity: number;
    selectedVariant?: import('@/data/products').ProductVariant;
}

interface CartContextType {
    cart: CartItem[];
    addToCart: (product: Product, quantity?: number, variant?: import('@/data/products').ProductVariant) => void;
    removeFromCart: (productId: string, variantWeight?: string) => void;
    updateQuantity: (productId: string, quantity: number, variantWeight?: string) => void;
    clearCart: () => void;
    cartCount: number;
    cartTotal: number;
    // Coupon system
    couponCode: string;
    couponDiscount: number;
    couponApplied: boolean;
    couponError: string;
    applyCoupon: (code: string) => void;
    removeCoupon: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
    const { user, isAuthenticated } = useAuth();
    const { products } = useProducts();
    const [cartItems, setCartItems] = useState<{ id: string, quantity: number, variantWeight?: string }[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const lastLoadedKey = useRef<string | null>(null);

    // Coupon state
    const [couponCode, setCouponCode] = useState('');
    const [couponDiscount, setCouponDiscount] = useState(0);
    const [couponApplied, setCouponApplied] = useState(false);
    const [couponError, setCouponError] = useState('');

    // Cart Email Modal state
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

    // Storage key based on user session
    const storageKey = isAuthenticated && user?.username
        ? `kottravai_cart_${user.username}`
        : 'kottravai_cart_guest';

    // 1. Initial Load & Session Switch logic
    useEffect(() => {
        setIsLoaded(false);
        const storedCart = localStorage.getItem(storageKey);
        let parsed: { id: string, quantity: number, variantWeight?: string }[] = [];

        if (storedCart) {
            try {
                const raw = JSON.parse(storedCart);
                if (Array.isArray(raw)) {
                    // Migrate old full-product storage if it exists, or just take id/qty
                    parsed = raw.map((item: any) => ({
                        id: item.id,
                        quantity: item.quantity,
                        variantWeight: item.variantWeight
                    }));
                } else {
                    console.error("Cart data in local storage is not an array");
                    parsed = [];
                }
            } catch (error) {
                console.error("Failed to parse cart", error);
                parsed = [];
            }
        }

        // Logic: Merge guest cart into user cart when logging in
        if (isAuthenticated && user?.username) {
            const guestCartStr = localStorage.getItem('kottravai_cart_guest');
            if (guestCartStr) {
                try {
                    const guestCart = JSON.parse(guestCartStr);
                    if (guestCart && guestCart.length > 0) {
                        guestCart.forEach((guestItem: any) => {
                            const existing = parsed.find(item => item.id === guestItem.id && item.variantWeight === guestItem.variantWeight);
                            if (existing) {
                                existing.quantity += guestItem.quantity;
                            } else {
                                parsed.push({ id: guestItem.id, quantity: guestItem.quantity, variantWeight: guestItem.variantWeight });
                            }
                        });
                        localStorage.removeItem('kottravai_cart_guest');
                    }
                } catch (e) {
                    console.error("Failed to merge guest cart", e);
                }
            }
        }

        setCartItems(parsed);
        lastLoadedKey.current = storageKey;
        setIsLoaded(true);

        // Load coupon from storage if any
        const storedCoupon = localStorage.getItem('kottravai_coupon');
        if (storedCoupon) {
            try {
                const { code } = JSON.parse(storedCoupon);
                if (code) {
                    // We don't apply it immediately because cart total might have changed
                    // but we can set the code
                    setCouponCode(code);
                }
            } catch (e) {
                console.error("Failed to load coupon", e);
            }
        }
    }, [storageKey, isAuthenticated, user?.username]);

    // 2. Persistent Save logic
    useEffect(() => {
        if (!isLoaded || lastLoadedKey.current !== storageKey) return;
        if (cartItems.length > 0) {
            try {
                localStorage.setItem(storageKey, JSON.stringify(cartItems));
            } catch (e) {
                console.error("Storage limit hit! Cannot save cart.", e);
            }
        } else {
            localStorage.removeItem(storageKey);
        }
    }, [cartItems, storageKey, isLoaded]);

    // 3. Hydrate Cart with full product data
    const cart: CartItem[] = cartItems
        .map(item => {
            const product = products.find((p: Product) => p.id === item.id);
            if (!product) return null;

            let price = product.price;
            let selectedVariant = undefined;

            if (item.variantWeight && product.variants) {
                selectedVariant = product.variants.find(v => v.weight === item.variantWeight);
                if (selectedVariant) {
                    price = selectedVariant.price;
                }
            }

            const cartItem: CartItem = {
                ...product,
                price,
                quantity: item.quantity,
                selectedVariant
            };

            return cartItem;
        })
        .filter((item): item is CartItem => item !== null);

    const addToCart = (product: Product, quantity = 1, variant?: import('@/data/products').ProductVariant) => {
        setCartItems(prev => {
            const existing = prev.find(item =>
                item.id === product.id &&
                (!variant || item.variantWeight === variant.weight)
            );

            if (existing) {
                return prev.map(item =>
                    (item.id === product.id && item.variantWeight === variant?.weight)
                        ? { ...item, quantity: item.quantity + quantity }
                        : item
                );
            }
            return [...prev, { id: product.id, quantity, variantWeight: variant?.weight }];
        });

        analytics.trackEvent('add_to_cart', {
            product_id: product.id,
            product_name: product.name,
            category: product.category,
            quantity,
            variant: variant?.weight,
            price: variant?.price || product.price
        });

        // Trigger email capture modal if guest and email not saved
        if (!isAuthenticated && !localStorage.getItem('cart_email') && !sessionStorage.getItem('cart_email_skipped')) {
            setIsEmailModalOpen(true);
        }
    };

    const removeFromCart = (productId: string, variantWeight?: string) => {
        const removedItem = cart.find(item => item.id === productId && item.selectedVariant?.weight === variantWeight) || cart.find(item => item.id === productId);
        setCartItems(prev => prev.filter(item => !(item.id === productId && item.variantWeight === variantWeight)));
        analytics.trackEvent('remove_from_cart', {
            product_id: productId,
            product_name: removedItem?.name || productId,
            quantity: removedItem?.quantity,
            price: removedItem?.price,
            variant_weight: variantWeight
        });
    };

    const updateQuantity = (productId: string, quantity: number, variantWeight?: string) => {
        if (quantity < 1) return;
        setCartItems(prev => prev.map(item =>
            (item.id === productId && item.variantWeight === variantWeight) ? { ...item, quantity } : item
        ));
        analytics.trackEvent('cart_quantity_change', { product_id: productId, new_quantity: quantity, variant_weight: variantWeight });
    };

    const clearCart = () => {
        setCartItems([]);
        removeCoupon();
    };

    const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
    const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    // Coupon logic
    const applyCoupon = (code: string) => {
        const normalizedCode = code.trim().toUpperCase();
        setCouponCode(normalizedCode);
        setCouponError('');


        if (normalizedCode === 'ECOLIFE24') {
            const cocoTotal = cart
                .filter((item: any) =>
                    item.categorySlug === 'coconut-shell-products' ||
                    item.category_slug === 'coconut-shell-products' ||
                    item.category?.toLowerCase().includes('coco')
                )
                .reduce((sum, item) => sum + (Number(item.price) * (item.quantity || 1)), 0);

            if (cocoTotal <= 0) {
                setCouponError('This coupon is valid only for Coconut Shell Products products');
                setCouponApplied(false);
                setCouponDiscount(0);
                return;
            }

            const discount = cocoTotal * 0.05;
            setCouponDiscount(discount);
            setCouponApplied(true);
            localStorage.setItem('kottravai_coupon', JSON.stringify({ code: normalizedCode }));
            return;
        }

        setCouponError('Invalid coupon code');
        setCouponApplied(false);
        setCouponDiscount(0);
    };

    const removeCoupon = () => {
        setCouponCode('');
        setCouponDiscount(0);
        setCouponApplied(false);
        setCouponError('');
        localStorage.removeItem('kottravai_coupon');
    };

    // Recalculate coupon discount if cart total changes
    useEffect(() => {
        if (couponApplied) {
            applyCoupon(couponCode);
        }
    }, [cartTotal, cartItems]);

    return (
        <CartContext.Provider value={{
            cart,
            addToCart,
            removeFromCart,
            updateQuantity,
            clearCart,
            cartCount,
            cartTotal,
            couponCode,
            couponDiscount,
            couponApplied,
            couponError,
            applyCoupon,
            removeCoupon
        }}>
            {children}
            <CartEmailModal 
                isOpen={isEmailModalOpen} 
                onClose={() => setIsEmailModalOpen(false)} 
            />
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
};
