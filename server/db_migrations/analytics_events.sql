CREATE TABLE IF NOT EXISTS analytics_events (
    id SERIAL PRIMARY KEY,
    event_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    event_name VARCHAR(255) NOT NULL,
    page_url TEXT,
    referrer TEXT,
    browser VARCHAR(255),
    device VARCHAR(100),
    screen_size VARCHAR(50),
    user_agent TEXT,
    session_id VARCHAR(255),
    visitor_id VARCHAR(255),
    utm_source VARCHAR(255),
    utm_medium VARCHAR(255),
    utm_campaign VARCHAR(255),
    utm_term VARCHAR(255),
    utm_content VARCHAR(255),
    first_utm_source VARCHAR(255),
    first_utm_medium VARCHAR(255),
    first_utm_campaign VARCHAR(255),
    session_utm_source VARCHAR(255),
    session_utm_medium VARCHAR(255),
    session_utm_campaign VARCHAR(255),
    product_id VARCHAR(255),
    product_name VARCHAR(255),
    category VARCHAR(255),
    price NUMERIC,
    quantity INTEGER,
    order_id VARCHAR(255),
    order_total NUMERIC,
    payment_method VARCHAR(100),
    duration_seconds INTEGER,
    metadata JSONB,
    ip_address VARCHAR(45),
    geo_country VARCHAR(100),
    geo_state VARCHAR(100),
    geo_city VARCHAR(100),
    geo_region VARCHAR(100),
    geo_isp VARCHAR(255),
    geo_latitude VARCHAR(50),
    geo_longitude VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events(event_timestamp);
CREATE INDEX IF NOT EXISTS idx_analytics_events_name ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_visitor_id ON analytics_events(visitor_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_utm_source ON analytics_events(utm_source);
CREATE INDEX IF NOT EXISTS idx_analytics_events_first_utm_source ON analytics_events(first_utm_source);
CREATE INDEX IF NOT EXISTS idx_analytics_events_order_id ON analytics_events(order_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_product_id ON analytics_events(product_id);
