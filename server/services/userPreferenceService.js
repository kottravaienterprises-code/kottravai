const db = require('../db');

class UserPreferenceService {
    async updatePreferences(sessionId, data) {
        const { preferredCategory, pricingTendency, exploredProductId } = data;

        try {
            // 30-day rolling window is implicit in the 'updated_at' check during retrieval
            await db.query(`
                INSERT INTO user_preference_memory (session_id, preferred_categories, pricing_tendency, last_explored_products, updated_at)
                VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
                ON CONFLICT (session_id) DO UPDATE SET
                    preferred_categories = CASE 
                        WHEN NOT (user_preference_memory.preferred_categories @> $2) 
                        THEN user_preference_memory.preferred_categories || $2 
                        ELSE user_preference_memory.preferred_categories 
                    END,
                    pricing_tendency = EXCLUDED.pricing_tendency,
                    last_explored_products = CASE 
                        WHEN NOT (user_preference_memory.last_explored_products @> $4)
                        THEN jsonb_path_query_array($4 || user_preference_memory.last_explored_products, '$[0 to 4]')
                        ELSE user_preference_memory.last_explored_products
                    END,
                    updated_at = CURRENT_TIMESTAMP
            `, [
                sessionId, 
                JSON.stringify(preferredCategory ? [preferredCategory] : []), 
                pricingTendency, 
                JSON.stringify(exploredProductId ? [exploredProductId] : [])
            ]);
        } catch (err) {
            console.error("❌ [PREFERENCES] Failed to update preferences:", err.message);
        }
    }

    async getPreferences(sessionId) {
        try {
            // TTL: 30-day rolling window
            const result = await db.query(
                "SELECT * FROM user_preference_memory WHERE session_id = $1 AND updated_at > NOW() - INTERVAL '30 days'",
                [sessionId]
            );
            return result.rows[0] || null;
        } catch (err) {
            console.error("❌ [PREFERENCES] Failed to fetch preferences:", err.message);
            return null;
        }
    }

    /**
     * Smart Recommendation Weighting (Phase 13)
     * Boosts product scores based on behavioral preferences
     */
    boostProductScores(products, preferences) {
        if (!preferences) return products;

        const preferredCategories = Array.isArray(preferences.preferred_categories) ? preferences.preferred_categories : [];
        const pricingTendency = preferences.pricing_tendency;

        return products.map(p => {
            let boost = 0;

            // 1. Category Matching Boost
            if (preferredCategories.includes(p.category)) {
                boost += 3;
            }

            // 2. Pricing Tendency Boost
            if (pricingTendency === 'budget' && Number(p.price) < 500) {
                boost += 2;
            } else if (pricingTendency === 'premium' && Number(p.price) >= 1000) {
                boost += 2;
            }

            // 3. Last Explored Synergy (Cross-Selling)
            // If they looked at podi, boost health mixes. If they looked at hampers, boost handicrafts.
            if (p.category === 'Heritage Mixes' && preferredCategories.includes('Health Mixes')) boost += 1.5;
            if (p.category === 'Handicrafts' && preferredCategories.includes('Gifts/Hampers')) boost += 1.5;

            return { ...p, score: (p.score || 0) + boost };
        });
    }

    /**
     * Behavioral Commerce Suggestions (Phase 13)
     */
    getBehavioralIntro(preferences, currentDomain) {
        if (!preferences) return null;

        const categories = preferences.preferred_categories || [];
        
        if (currentDomain === 'gifts' && categories.some(c => c.toLowerCase().includes('gift'))) {
            return "You seem to enjoy our gifting collections. These curated hampers are customer favorites for birthdays and festive occasions.";
        }
        
        if (currentDomain === 'food' && (categories.some(c => c.toLowerCase().includes('mix')) || categories.some(c => c.toLowerCase().includes('health')))) {
            return "Since you’ve explored healthy mixes before, you might also enjoy these traditional wellness products we've picked out for you.";
        }

        return null;
    }

    // --- Analytics Methods (Internal) ---
    async getTopCategories() {
        const query = `
            SELECT cat, COUNT(*) as count
            FROM user_preference_memory, jsonb_array_elements_text(preferred_categories) as cat
            GROUP BY cat
            ORDER BY count DESC
            LIMIT 10
        `;
        const result = await db.query(query);
        return result.rows;
    }

    async getTrendingInterests() {
        const query = `
            SELECT pricing_tendency, COUNT(*) as count
            FROM user_preference_memory
            WHERE pricing_tendency IS NOT NULL
            GROUP BY pricing_tendency
        `;
        const result = await db.query(query);
        return result.rows;
    }

    async getConversionPatterns() {
        const query = `
            SELECT 
                category, 
                event_type, 
                COUNT(*) as count
            FROM commerce_conversion_logs
            WHERE timestamp > NOW() - INTERVAL '30 days'
            GROUP BY category, event_type
            ORDER BY count DESC
        `;
        const result = await db.query(query);
        return result.rows;
    }
}

module.exports = new UserPreferenceService();
