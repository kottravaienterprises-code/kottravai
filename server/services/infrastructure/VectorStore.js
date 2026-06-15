const db = require('../../db');

class VectorStore {
    /**
     * Upserts an EKG Node and deduplicates using tenant_id + normalized_key.
     * Keeps history by retiring the old node version (valid_to = NOW()) if updated.
     */
    async upsertNode(tenantId, nodeType, normalizedKey, sourceTable, sourceId, attributes, semanticEmbedding) {
        // 1. Find existing active node
        const { rows: existing } = await db.query(`
            SELECT id, node_version FROM public.ekg_nodes 
            WHERE tenant_id = $1 AND normalized_key = $2 AND valid_to IS NULL
        `, [tenantId, normalizedKey]);

        let version = 1;

        if (existing.length > 0) {
            const oldNode = existing[0];
            // Retire old node
            await db.query(`
                UPDATE public.ekg_nodes SET valid_to = CURRENT_TIMESTAMP WHERE id = $1
            `, [oldNode.id]);
            version = oldNode.node_version + 1;
        }

        // 2. Insert new version
        const { rows } = await db.query(`
            INSERT INTO public.ekg_nodes 
            (tenant_id, node_type, normalized_key, source_table, source_id, attributes, semantic_embedding, node_version)
            VALUES ($1, $2, $3, $4, $5, $6, $7::vector, $8)
            RETURNING id
        `, [tenantId, nodeType, normalizedKey, sourceTable, sourceId, JSON.stringify(attributes), `[${semanticEmbedding.join(',')}]`, version]);

        return rows[0].id;
    }

    /**
     * Upserts an EKG Edge linking two nodes
     */
    async upsertEdge(tenantId, sourceNodeId, targetNodeId, relationType, weight, confidenceScore, provenance) {
        const { rows } = await db.query(`
            INSERT INTO public.ekg_edges 
            (tenant_id, source_node_id, target_node_id, relation_type, weight, confidence_score, provenance_metadata)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id
        `, [tenantId, sourceNodeId, targetNodeId, relationType, weight, confidenceScore, JSON.stringify(provenance)]);
        
        return rows[0].id;
    }

    /**
     * Hybrid Search: Finds similar nodes combining Vector Similarity and Metadata Filtering
     */
    async searchSimilarNodes(tenantId, queryVector, filterCriteria = {}, limit = 5) {
        let query = `
            SELECT id, node_type, normalized_key, attributes, source_table, source_id,
                   1 - (semantic_embedding <=> $2::vector) AS similarity_score
            FROM public.ekg_nodes
            WHERE tenant_id = $1 AND valid_to IS NULL
        `;
        const params = [tenantId, `[${queryVector.join(',')}]`];
        let paramIdx = 3;

        if (filterCriteria.nodeType) {
            query += ` AND node_type = $${paramIdx}`;
            params.push(filterCriteria.nodeType);
            paramIdx++;
        }

        if (filterCriteria.sourceTable) {
            query += ` AND source_table = $${paramIdx}`;
            params.push(filterCriteria.sourceTable);
            paramIdx++;
        }

        query += ` ORDER BY semantic_embedding <=> $2::vector LIMIT $${paramIdx}`;
        params.push(limit);

        const { rows } = await db.query(query, params);
        return rows;
    }
}

module.exports = new VectorStore();
