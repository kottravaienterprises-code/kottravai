CREATE TABLE IF NOT EXISTS analytics_archive_manifest (
    id SERIAL PRIMARY KEY,
    archive_filename VARCHAR(255) NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    row_count INTEGER NOT NULL,
    checksum VARCHAR(255),
    status VARCHAR(50) DEFAULT 'created',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    verified_at TIMESTAMP WITH TIME ZONE,
    deletion_completed_at TIMESTAMP WITH TIME ZONE
);
