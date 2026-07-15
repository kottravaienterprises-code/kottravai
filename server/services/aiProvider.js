const { GoogleGenerativeAI } = require("@google/generative-ai");
const OpenAI = require("openai");

class AIProviderService {
    constructor() {
        console.log("🛠️ [RCA] INITIALIZING_AI_PROVIDERS...");
        this.gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
        this.groq = process.env.GROQ_API_KEY ? new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: "https://api.groq.com/openai/v1" }) : null;
        
        // Auto-select primary provider based on availability
        this.primaryProvider = this.groq ? 'groq' : (this.openai ? 'openai' : 'gemini');
        
        console.log("🛠️ [RCA] PROVIDER_STATUS:", {
            GEMINI: !!process.env.GEMINI_API_KEY,
            OPENAI: !!process.env.OPENAI_API_KEY,
            GROQ: !!process.env.GROQ_API_KEY
        });
    }

    async generateContent(systemPrompt, userMessage, history = [], options = {}) {
        // Enforce Groq as primary if available, otherwise Gemini. Completely bypass OpenAI.
        const provider = this.groq ? 'groq' : 'gemini';
        
        console.log("[AI_PROVIDER_SELECTED]", provider);
        console.log("[B2B_INQUIRY_AI_PROVIDER]", provider);
        console.log(`📡 [RCA] PROVIDER_CALL_START: ${provider}`);
        
        try {
            if (provider === 'groq') {
                return await this._callGroq(systemPrompt, userMessage, history);
            } else {
                return await this._callGemini(systemPrompt, userMessage, history);
            }
        } catch (err) {
            console.error(`❌ [RCA] PROVIDER_ERROR (${provider}):`, err.message);
            
            // If Groq fails, fallback to Gemini
            if (provider === 'groq' && this.gemini) {
                console.warn("🔄 [RCA] INITIATING_FAILOVER_TO_GEMINI...");
                try {
                    return await this._callGemini(systemPrompt, userMessage, history);
                } catch (geminiErr) {
                    console.error("❌ [RCA] GEMINI_FAILOVER_ERROR:", geminiErr.message);
                    throw geminiErr;
                }
            }
            throw err;
        }
    }

    async _callGemini(systemPrompt, userMessage, history) {
        console.log("📡 [RCA] GEMINI_API_REQUEST_SENT");
        const model = this.gemini.getGenerativeModel({ 
            model: "gemini-2.0-flash",
            systemInstruction: systemPrompt
        });
        
        // 1. Normalize Roles (Phase 11)
        let normalizedHistory = history
            .filter(h => h.role && h.content)
            .map(h => ({
                role: (h.role === 'assistant' || h.role === 'bot' || h.role === 'model') ? 'model' : 'user',
                parts: [{ text: h.content }]
            }));

        console.log("📜 GEMINI_HISTORY_RAW:", normalizedHistory.map(h => h.role));

        // 2. Enforce Valid First Message: Must be 'user'
        while (normalizedHistory.length > 0 && normalizedHistory[0].role !== 'user') {
            console.warn("⚠️ [RCA] STRIPPING_LEADING_MODEL_MESSAGE");
            normalizedHistory.shift();
        }

        // 3. Safety: If empty after cleanup, don't crash
        if (normalizedHistory.length === 0) {
            console.log("ℹ️ [RCA] HISTORY_EMPTY_OR_INVALID_START_CLEANED");
        }

        console.log("✅ GEMINI_HISTORY_VALID:", normalizedHistory.map(h => h.role));

        const chat = model.startChat({
            history: normalizedHistory
        });
        
        const result = await chat.sendMessage(userMessage);
        console.log("✅ [RCA] GEMINI_API_SUCCESS");
        return { text: result.response.text(), provider: 'gemini' };
    }

    async _callOpenAI(systemPrompt, userMessage, history) {
        console.log("📡 [RCA] OPENAI_API_REQUEST_SENT");
        const response = await this.openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                ...history.map(h => ({ role: h.role, content: h.content })),
                { role: "user", content: userMessage }
            ],
            max_tokens: 1000
        });
        console.log("✅ [RCA] OPENAI_API_SUCCESS");
        return { text: response.choices[0].message.content, provider: 'openai' };
    }

    async _callGroq(systemPrompt, userMessage, history) {
        console.log("📡 [RCA] GROQ_API_REQUEST_SENT");
        const response = await this.groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                { role: "system", content: systemPrompt },
                ...history.map(h => ({ role: h.role, content: h.content })),
                { role: "user", content: userMessage }
            ],
            max_tokens: 1000
        });
        console.log("✅ [RCA] GROQ_API_SUCCESS");
        return { text: response.choices[0].message.content, provider: 'groq' };
    }

    async getEmbedding(text) {
        console.log("📡 [RCA] EMBEDDING_API_REQUEST_SENT");
        try {
            const model = this.gemini.getGenerativeModel({ model: "gemini-embedding-001" });
            const result = await model.embedContent(text);
            console.log("✅ [RCA] EMBEDDING_API_SUCCESS");
            return result.embedding.values;
        } catch (err) {
            console.error("❌ [RCA] EMBEDDING_API_FAILURE:", err.message);
            throw err;
        }
    }
}

module.exports = new AIProviderService();
