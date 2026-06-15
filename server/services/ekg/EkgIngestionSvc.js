const eventBus = require('../eventBus');
const vectorStore = require('../infrastructure/VectorStore');
const embeddingProvider = require('../infrastructure/EmbeddingProvider');

class EkgIngestionSvc {
    constructor() {
        this._initListeners();
    }

    _initListeners() {
        eventBus.subscribe('DEAL_WON', async (event) => this.handleDealWon(event));
        eventBus.subscribe('ANOMALY_DETECTED', async (event) => this.handleAnomaly(event));
        // Add more event listeners here for continuous ingestion
    }

    async handleDealWon(event) {
        const { tenantId, eventId, payload } = event;
        const customerKey = `CUSTOMER:${payload.account || 'unknown'}`;
        
        // 1. Generate Embedding for Customer Node
        const customerContext = `Customer Account: ${payload.account}. Recently closed a deal worth ${payload.value}.`;
        const customerEmbedding = await embeddingProvider.generateEmbedding(customerContext);

        // 2. Upsert Customer Node
        const customerNodeId = await vectorStore.upsertNode(
            tenantId, 
            'CUSTOMER', 
            customerKey, 
            'sales_deals', 
            payload.id || 'deal_unknown', 
            { account: payload.account }, 
            customerEmbedding
        );

        // 3. Generate Embedding for Deal Node
        const dealKey = `DEAL:${payload.id || eventId}`;
        const dealContext = `Deal closed by ${payload.owner} for ${payload.value} dollars with account ${payload.account}.`;
        const dealEmbedding = await embeddingProvider.generateEmbedding(dealContext);

        // 4. Upsert Deal Node
        const dealNodeId = await vectorStore.upsertNode(
            tenantId,
            'DEAL',
            dealKey,
            'sales_deals',
            payload.id || 'deal_unknown',
            payload,
            dealEmbedding
        );

        // 5. Create Edge: CUSTOMER -> WON -> DEAL
        await vectorStore.upsertEdge(
            tenantId,
            customerNodeId,
            dealNodeId,
            'WON_DEAL',
            1.0,
            100.0,
            { triggerEventId: eventId, source: 'EkgIngestionSvc' }
        );
        
        console.log(`[EKG Ingestion] Ingested DEAL_WON for ${customerKey}`);
    }

    async handleAnomaly(event) {
        const { tenantId, eventId, payload } = event;
        const customerKey = `CUSTOMER:${payload.account || 'unknown'}`;
        const anomalyKey = `ANOMALY:${eventId}`;

        // 1. Ensure Customer Node exists (we update it slightly with latest context)
        const customerContext = `Customer Account: ${payload.account}. Recently experienced a ${payload.severity} anomaly.`;
        const customerEmbedding = await embeddingProvider.generateEmbedding(customerContext);
        const customerNodeId = await vectorStore.upsertNode(
            tenantId, 'CUSTOMER', customerKey, 'system', 'sys', { account: payload.account }, customerEmbedding
        );

        // 2. Upsert Anomaly Node
        const anomalyContext = `${payload.severity} anomaly of type ${payload.type} with ${payload.variance}% variance affecting ${payload.account}.`;
        const anomalyEmbedding = await embeddingProvider.generateEmbedding(anomalyContext);
        const anomalyNodeId = await vectorStore.upsertNode(
            tenantId, 'ANOMALY', anomalyKey, 'anomalies', eventId, payload, anomalyEmbedding
        );

        // 3. Create Edge
        await vectorStore.upsertEdge(
            tenantId, customerNodeId, anomalyNodeId, 'EXPERIENCED_ANOMALY', 0.8, 95.0, { triggerEventId: eventId }
        );

        console.log(`[EKG Ingestion] Ingested ANOMALY_DETECTED for ${customerKey}`);
    }
}

module.exports = new EkgIngestionSvc();
