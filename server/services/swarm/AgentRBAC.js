class AgentRBAC {
    constructor() {
        // Define which node types each agent role can query in EKG
        this.ekgNodeAccess = {
            'SALES_AGENT': ['CUSTOMER', 'DEAL', 'PIPELINE'],
            'FINANCE_AGENT': ['CUSTOMER', 'INVOICE', 'FINANCIAL_LEDGER', 'DEAL'],
            'CUSTOMER_SUCCESS_AGENT': ['CUSTOMER', 'ANOMALY', 'USAGE_METRIC']
        };

        // Define which tools each agent role is allowed to execute
        this.toolAccess = {
            'SALES_AGENT': ['propose_discount', 'generate_quote', 'search_ekg'],
            'FINANCE_AGENT': ['approve_discount', 'reject_discount', 'search_ekg'],
            'CUSTOMER_SUCCESS_AGENT': ['flag_churn_risk', 'search_ekg']
        };
    }

    /**
     * Check if the agent role is authorized to query a specific EKG node type
     */
    canAccessEKGNode(agentRole, nodeType) {
        const allowedNodes = this.ekgNodeAccess[agentRole.toUpperCase()] || [];
        return allowedNodes.includes(nodeType.toUpperCase());
    }

    /**
     * Check if the agent role is authorized to execute a specific tool
     */
    canExecuteTool(agentRole, toolName) {
        const allowedTools = this.toolAccess[agentRole.toUpperCase()] || [];
        return allowedTools.includes(toolName.toLowerCase());
    }

    /**
     * Get the allowed node types for a specific agent role (used for dynamic prompt building)
     */
    getAllowedNodeTypes(agentRole) {
        return this.ekgNodeAccess[agentRole.toUpperCase()] || [];
    }
}

module.exports = new AgentRBAC();
