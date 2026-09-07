const fs = require('fs');

const checkoutPath = 'src/pages/Checkout.tsx';
let checkoutCode = fs.readFileSync(checkoutPath, 'utf8');

// Patch orderData creation (there are two places it creates orderData - one for initial backend request, one for verify)
checkoutCode = checkoutCode.replace(/subtotal_server: discountedSubtotal,\s*shipping_server: shippingCost,/g, `subtotal_server: discountedSubtotal,
                        shipping_server: shippingCost,
                        coupon_code: localCouponCode || couponCode || '',
                        discount_applied: couponDiscount || 0,
                        taxes: gstTotal,`);

checkoutCode = checkoutCode.replace(/analytics\.trackEvent\('purchase_completed', \{[\s\S]*?item_count: cart\.length,\s*\}\);/, `analytics.trackEvent('purchase_completed', {
                                order_id: activeOrder.id,
                                transaction_id: activeOrder.id,
                                value: finalTotal,
                                order_total: finalTotal,
                                currency: 'INR',
                                payment_id: response.razorpay_payment_id,
                                payment_method: formData.paymentMethod,
                                item_count: cart.length,
                                coupon_code: localCouponCode || couponCode || '',
                                discount_applied: couponDiscount || 0,
                                shipping_cost: shippingCost || 0,
                                taxes: gstTotal || 0,
                                products_array: cart.map(item => ({ 
                                    product_id: item.id, 
                                    sku: (item as any).sku || '',
                                    name: item.name, 
                                    quantity: item.quantity, 
                                    price: item.price,
                                    line_total: item.price * item.quantity
                                }))
                            });`);

fs.writeFileSync(checkoutPath, checkoutCode);

const successPath = 'src/pages/OrderSuccess.tsx';
let successCode = fs.readFileSync(successPath, 'utf8');

successCode = successCode.replace(/analytics\.trackEvent\('purchase_completed', \{[\s\S]*?total_amount: orderDetails\.total\s*\}\);/, `analytics.trackEvent('purchase_completed', {
                    order_id: orderDetails.orderId || orderDetails.paymentId || 'unknown',
                    transaction_id: orderDetails.orderId || orderDetails.paymentId || 'unknown',
                    payment_id: orderDetails.paymentId || undefined,
                    payment_method: orderDetails.paymentMethod || 'online',
                    value: orderDetails.total,
                    order_total: orderDetails.total,
                    item_count: orderDetails.items?.length || 0,
                    total_amount: orderDetails.total,
                    coupon_code: orderDetails.coupon_code || '',
                    discount_applied: orderDetails.discount_applied || 0,
                    shipping_cost: orderDetails.shipping_server || 0,
                    taxes: orderDetails.taxes || 0,
                    products_array: (orderDetails.items || []).map((item: any) => ({
                        product_id: item.id || item.item_id,
                        sku: item.sku || '',
                        name: item.name,
                        quantity: item.quantity,
                        price: item.price,
                        line_total: (item.price || 0) * (item.quantity || 1)
                    }))
                });`);

fs.writeFileSync(successPath, successCode);

console.log('Patched Checkout and OrderSuccess');
