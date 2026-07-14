const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : false
});

const ensureSearchAnalyticsTables = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS search_analytics_events (
      id BIGSERIAL PRIMARY KEY,
      query TEXT,
      result_count INTEGER DEFAULT 0,
      zero_result BOOLEAN DEFAULT FALSE,
      clicked_product_id INTEGER,
      clicked_product_name TEXT,
      response_time_ms INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_search_analytics_query ON search_analytics_events(query);
  `);
};

const logSearchEvent = async (payload) => {
  try {
    await ensureSearchAnalyticsTables();
    const { query, resultCount = 0, zeroResult = false, clickedProductId = null, clickedProductName = null, responseTimeMs = 0 } = payload;
    await pool.query(
      `INSERT INTO search_analytics_events (query, result_count, zero_result, clicked_product_id, clicked_product_name, response_time_ms)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [query, resultCount, zeroResult, clickedProductId, clickedProductName, responseTimeMs]
    );
  } catch (error) {
    console.warn('Search analytics logging failed', error.message);
  }
};

const getPopularSearches = async (limit = 8) => {
  try {
    await ensureSearchAnalyticsTables();
    const result = await pool.query(
      `SELECT query, COUNT(*)::int AS count
       FROM search_analytics_events
       WHERE query IS NOT NULL AND TRIM(query) <> ''
       GROUP BY query
       ORDER BY count DESC, query ASC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  } catch (error) {
    console.warn('Popular searches lookup failed', error.message);
    return [];
  }
};

module.exports = {
  ensureSearchAnalyticsTables,
  logSearchEvent,
  getPopularSearches
};
