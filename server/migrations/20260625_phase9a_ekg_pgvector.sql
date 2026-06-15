-- 20260625_phase9a_ekg_pgvector.sql

-- Try to create the vector extension. (Requires pgvector installed on Postgres)
CREATE EXTENSION IF NOT EXISTS vector;

-- EKG Nodes Table
CREATE TABLE IF NOT EXISTS public.ekg_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(100) NOT NULL,
    node_type VARCHAR(100) NOT NULL,
    normalized_key VARCHAR(255) NOT NULL, -- Used for deduplication (e.g., 'CUSTOMER:customer@example.com')
    source_table VARCHAR(100),
    source_id VARCHAR(100),
    attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
    semantic_embedding vector(1536), -- Assuming OpenAI ada-002 or text-embedding-3-small
    node_version INTEGER DEFAULT 1,
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    valid_to TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ekg_nodes_tenant_normalized_key_unique UNIQUE (tenant_id, normalized_key, valid_to)
);

-- Index for Vector Similarity Search (HNSW)
CREATE INDEX IF NOT EXISTS ekg_nodes_embedding_idx ON public.ekg_nodes USING hnsw (semantic_embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS ekg_nodes_tenant_key_idx ON public.ekg_nodes (tenant_id, normalized_key);

-- EKG Edges Table
CREATE TABLE IF NOT EXISTS public.ekg_edges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(100) NOT NULL,
    source_node_id UUID REFERENCES public.ekg_nodes(id) ON DELETE CASCADE,
    target_node_id UUID REFERENCES public.ekg_nodes(id) ON DELETE CASCADE,
    relation_type VARCHAR(100) NOT NULL,
    weight NUMERIC(5,2) DEFAULT 1.0,
    confidence_score NUMERIC(5,2) DEFAULT 100.0,
    provenance_metadata JSONB NOT NULL DEFAULT '{}'::jsonb, -- Triggering event, reason, etc.
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    valid_to TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ekg_edges_source_idx ON public.ekg_edges(source_node_id);
CREATE INDEX IF NOT EXISTS ekg_edges_target_idx ON public.ekg_edges(target_node_id);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION phase9a_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ekg_nodes_updated_at ON public.ekg_nodes;
CREATE TRIGGER trg_ekg_nodes_updated_at
BEFORE UPDATE ON public.ekg_nodes
FOR EACH ROW EXECUTE FUNCTION phase9a_set_timestamp();

DROP TRIGGER IF EXISTS trg_ekg_edges_updated_at ON public.ekg_edges;
CREATE TRIGGER trg_ekg_edges_updated_at
BEFORE UPDATE ON public.ekg_edges
FOR EACH ROW EXECUTE FUNCTION phase9a_set_timestamp();
