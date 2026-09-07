const fs = require('fs');

// 1. Fix Checkout.tsx
let checkout = fs.readFileSync('src/pages/Checkout.tsx', 'utf8');
checkout = checkout.replace(
    /analytics\.trackEvent\('checkout_started', \{[\s\S]*?\}\);/,
    `analytics.trackEvent('checkout_started', {
                cart_total_value: finalTotal,
                products_array: cart.map(item => ({
                    product_id: item.id,
                    sku: (item as any).sku || '',
                    product_name: item.name,
                    quantity: item.quantity,
                    price: item.price
                }))
            });`
);

// purchase_completed already has products_array and order_total
checkout = checkout.replace(
    /analytics\.trackEvent\('purchase_completed', \{[\s\S]*?products_array: cart\.map[\s\S]*?\}\)\}\);/g,
    `analytics.trackEvent('purchase_completed', {
                                order_id: activeOrder.id,
                                order_total: finalTotal,
                                payment_id: response.razorpay_payment_id,
                                payment_method: formData.paymentMethod,
                                coupon_code: localCouponCode || couponCode || '',
                                discount_applied: couponDiscount || 0,
                                shipping_cost: shippingCost || 0,
                                taxes: gstTotal || 0,
                                products_array: cart.map(item => ({ 
                                    product_id: item.id, 
                                    sku: (item as any).sku || '',
                                    product_name: item.name, 
                                    quantity: item.quantity, 
                                    price: item.price,
                                }))
                            });`
);
fs.writeFileSync('src/pages/Checkout.tsx', checkout);

// 2. Fix ProductDetails.tsx
let productDetails = fs.readFileSync('src/pages/ProductDetails.tsx', 'utf8');
productDetails = productDetails.replace(
    /analytics\.trackEvent\('product_view', \{[\s\S]*?\}\);/,
    `analytics.trackEvent('product_view', {
                product_id: product.id,
                sku: product.sku || '',
                product_name: product.name,
                category: product.category,
                price: product.price,
                stock_status: product.inStock ? 'in_stock' : 'out_of_stock'
            });`
);
fs.writeFileSync('src/pages/ProductDetails.tsx', productDetails);

// 3. Remove obsolete variables in .env (if any)
let env = fs.readFileSync('.env', 'utf8');
env = env.replace(/VITE_GAS_ENDPOINT_V2=.*\n?/g, '');
fs.writeFileSync('.env', env);

console.log("Modifications complete.");
