const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const { Pool } = require('pg');

let pool;

if (!process.env.DATABASE_URL && !process.env.VITE_DATABASE_URL) {
    console.error("❌ ERROR: DATABASE_URL environment variable is missing!");
    // Create a mock pool that fails gracefully on query
    pool = {
        query: async () => {
            const errorMsg = "❌ Database not configured: DATABASE_URL is missing in environment variables.";
            console.error(errorMsg);
            throw new Error(errorMsg);
        }
    };
} else {
    try {
        let connStr = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || '';
        
        // FIX: If the password contains '@', it breaks the URL parser.
        // We detect if there are multiple '@' symbols and encode the ones in the password section.
        if (connStr.includes(':') && connStr.split('@').length > 2) {
            const protocolPart = connStr.split('://')[0];
            const remaining = connStr.split('://')[1];
            const lastAtIndex = remaining.lastIndexOf('@');
            const credentials = remaining.substring(0, lastAtIndex);
            const hostPart = remaining.substring(lastAtIndex + 1);
            
            if (credentials.includes(':')) {
                const [user, ...pwdParts] = credentials.split(':');
                const password = pwdParts.join(':'); // Handle passwords with ':' too
                const encodedPassword = encodeURIComponent(password);
                connStr = `${protocolPart}://${user}:${encodedPassword}@${hostPart}`;
                console.log("🔧 Auto-fixed DATABASE_URL: Encoded password special characters.");
            }
        }

        pool = new Pool({
            connectionString: connStr,
            ssl: { rejectUnauthorized: false },
            connectionTimeoutMillis: 30000, // Increased to 30 seconds for Supabase cold starts
            idleTimeoutMillis: 30000,      // Close idle clients after 30 seconds
            keepAlive: true,
            max: 20
        });
    } catch (err) {
        console.error("❌ ERROR: Failed to create Postgres Pool:", err);
        pool = {
            query: async () => {
                console.error("❌ Cannot execute query: Pool creation failed.");
                throw new Error("Database connection failed");
            }
        };
    }
}

// Pre-warm the connection
if (pool.query) {
    pool.query('SELECT NOW()')
        .then(() => console.log('🚀 DB Connection Pre-warmed'))
        .catch(err => console.error('⚠️ DB Warmup failed:', err.message));
}

const queryWithRetry = async (text, params, retries = 3) => {
    for (let i = 0; i < retries; i++) {
        const queryStart = Date.now();
        if (i === 0) console.log(`[DB_QUERY_START] ${text.substring(0, 100)}...`);
        else console.log(`[DB_QUERY_RETRY] Attempt ${i + 1}/${retries} for ${text.substring(0, 100)}...`);

        try {
            const result = await pool.query(text, params);
            console.log(`[DB_QUERY_SUCCESS] Completed in ${Date.now() - queryStart}ms`);
            return result;
        } catch (err) {
            const isConnectionError = err.code === 'ETIMEDOUT' || err.code === 'ECONNRESET' || err.message.includes('Connection terminated') || err.message.includes('timeout exceeded');
            
            if (isConnectionError && i < retries - 1) {
                console.warn(`[SUPABASE_ERROR] Connection dropped (${err.message}). Retrying...`);
                await new Promise(res => setTimeout(res, 500)); // wait half a sec before retrying
                continue;
            }
            
            console.error(`[DB_QUERY_FAILED] Error: ${err.message} after ${Date.now() - queryStart}ms`);
            throw err;
        }
    }
};

module.exports = {
    query: queryWithRetry,
    pool
};
