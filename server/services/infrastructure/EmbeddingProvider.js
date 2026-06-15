const crypto = require('crypto');

class EmbeddingProvider {
    constructor() {
        this.cache = new Map(); // Simple in-memory cache for embeddings to reduce cost
    }

    /**
     * Generate an embedding for a single text string
     */
    async generateEmbedding(text) {
        if (!text) return Array(1536).fill(0); // fallback

        const hash = crypto.createHash('sha256').update(text).digest('hex');
        if (this.cache.has(hash)) {
            return this.cache.get(hash);
        }

        // Mocking OpenAI `text-embedding-3-small` (1536 dims) for local execution without a real key
        // In a real environment, this would be: 
        // const response = await openai.embeddings.create({ model: "text-embedding-3-small", input: text });
        // return response.data[0].embedding;
        
        // Mock semantic vector (normalized pseudo-random to simulate cosine similarity testing)
        const vector = [];
        let mag = 0;
        for (let i = 0; i < 1536; i++) {
            const val = Math.sin(hash.charCodeAt(i % hash.length) + i); // pseudo-random deterministic
            vector.push(val);
            mag += val * val;
        }
        mag = Math.sqrt(mag);
        const normalized = vector.map(v => v / mag);

        // Artificial latency to simulate API call
        await new Promise(r => setTimeout(r, 50)); 
        
        this.cache.set(hash, normalized);
        return normalized;
    }

    /**
     * Generate embeddings for a batch of texts
     */
    async generateBatchEmbeddings(texts) {
        const results = [];
        for (const text of texts) {
            results.push(await this.generateEmbedding(text));
        }
        return results;
    }
}

module.exports = new EmbeddingProvider();
