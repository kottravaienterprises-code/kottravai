const fs = require('fs');

const path = 'src/context/CartContext.tsx';
let code = fs.readFileSync(path, 'utf8');

// Patch addToCart
code = code.replace(
    /analytics\.trackEvent\('add_to_cart', \{[\s\S]*?customized: customizationData\?\.isCustomized \|\| false\n\s*\}\);/,
    `analytics.trackEvent('add_to_cart', {
            product_id: product.id,
            product_name: product.name,
            category: product.category,
            quantity,
            variant: variant?.weight,
            price: variant?.price || product.price,
            sku: product.sku,
            stock_status: product.is_live ? 'in_stock' : 'out_of_stock',
            cart_total_value: cartTotal + ((variant?.price || product.price) * quantity) + (customizationData?.isCustomized && !cart.find(i => i.id === product.id && i.customizationHash === hash) ? Number(customizationData.customizationCharge) : 0),
            customized: customizationData?.isCustomized || false
        });`
);

// Patch removeFromCart
code = code.replace(
    /analytics\.trackEvent\('remove_from_cart', \{[\s\S]*?variant_weight: variantWeight\n\s*\}\);/,
    `analytics.trackEvent('remove_from_cart', {
            product_id: productId,
            product_name: removedItem?.name || productId,
            quantity: removedItem?.quantity,
            price: removedItem?.price,
            sku: removedItem?.sku,
            stock_status: removedItem?.is_live ? 'in_stock' : 'out_of_stock',
            cart_total_value: cartTotal - (Number(removedItem?.price || 0) * (removedItem?.quantity || 1)) - (removedItem?.customizationData?.isCustomized ? Number(removedItem.customizationData.customizationCharge) : 0),
            variant_weight: variantWeight
        });`
);

// Patch updateQuantity
code = code.replace(
    /analytics\.trackEvent\('cart_quantity_change', \{ product_id: productId, new_quantity: quantity, variant_weight: variantWeight, customized_hash: customizationDataHash \}\);/,
    `const changedItem = cart.find(item => item.id === productId && item.selectedVariant?.weight === variantWeight && (item as any).customizationHash === customizationDataHash) || cart.find(item => item.id === productId);
        const oldQuantity = changedItem?.quantity || 1;
        const diff = quantity - oldQuantity;
        analytics.trackEvent('cart_quantity_change', { 
            product_id: productId, 
            product_name: changedItem?.name || productId,
            sku: changedItem?.sku,
            new_quantity: quantity, 
            price: changedItem?.price,
            cart_total_value: cartTotal + (Number(changedItem?.price || 0) * diff),
            variant_weight: variantWeight, 
            customized_hash: customizationDataHash 
        });`
);

fs.writeFileSync(path, code);
console.log('Patched CartContext.tsx');
