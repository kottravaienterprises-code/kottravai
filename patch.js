const fs = require('fs');
let c = fs.readFileSync('src/pages/ProductDetails.tsx', 'utf8');

c = c.replace(
    'customizableTag: data.customizable_tag || data.customizableTag',
    'customizableTag: data.customizable_tag || data.customizableTag,\n                    originalPrice: data.original_price ? Number(data.original_price) : data.originalPrice,\n                    campaignTag: data.campaign_tag || data.campaignTag,\n                    campaignExcluded: data.campaign_excluded || data.campaignExcluded || false,\n                    saleStartAt: data.sale_start_at || data.saleStartAt,\n                    saleEndAt: data.sale_end_at || data.saleEndAt'
);

c = c.replace(
    '<h1 className="text-xl md:text-2xl font-bold font-comfortaa text-brandPurple mb-3 leading-snug">{product.name}</h1>',
    `{product.isBestSeller && (
                            <div className="mb-2">
                                <span className="bg-[#8E2A8B] text-white text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded shadow-sm">
                                    BEST SELLER
                                </span>
                            </div>
                        )}
                        <h1 className="text-xl md:text-2xl font-bold font-comfortaa text-brandPurple mb-3 leading-snug">{product.name}</h1>`
);

fs.writeFileSync('src/pages/ProductDetails.tsx', c);
console.log('Patched ProductDetails.tsx');
