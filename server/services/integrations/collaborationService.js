const eventBus = require('../eventBus');

class CollaborationService {
    constructor() {
        this.slackToken = process.env.SLACK_BOT_TOKEN || 'xoxb-mock-token';
        this.executiveChannel = process.env.SLACK_EXEC_CHANNEL || '#exec-command-center';
        
        // Listen to events from the bus
        this._initEventSubscriptions();
    }

    _initEventSubscriptions() {
        eventBus.subscribe('ANOMALY_DETECTED', async (event) => {
            const anomaly = event.payload;
            if (anomaly.severity === 'Critical' || anomaly.severity === 'High') {
                await this.sendAlert(
                    this.executiveChannel, 
                    `🚨 *High Severity Anomaly Detected*\n*Type:* ${anomaly.type}\n*Variance:* ${anomaly.variance}%\n*Account:* ${anomaly.account}`
                );
            }
        });

        eventBus.subscribe('APPROVAL_REQUIRED', async (event) => {
            await this.sendApprovalMessage(event.payload);
        });

        eventBus.subscribe('DEAL_WON', async (event) => {
            const deal = event.payload;
            if (deal.value > 50000) {
                await this.sendAlert(
                    '#sales-wins',
                    `🎉 *Major Deal Won!* 🎉\n*Account:* ${deal.account}\n*Value:* $${deal.value.toLocaleString()}\n*Owner:* ${deal.owner}`
                );
            }
        });

        // Copilot Interaction
        eventBus.subscribe('COPILOT_QUERY', async (event) => {
            const { query, channel } = event.payload;
            console.log(`[Slack Copilot] Received query in ${channel}: "${query}"`);
            
            // Simulating AI RAG search over Revenue Snapshots
            const aiResponse = `Based on the latest revenue snapshot [ID: rev_snap_88921], the Q3 pipeline has a 12% expansion opportunity identified in the EMEA region. Source: [forecast_accuracy_screenshot.png]`;
            
            console.log(`[Slack Copilot] Responding to ${channel}: ${aiResponse}`);
        });
    }

    /**
     * Send a standard alert message to Slack
     */
    async sendAlert(channel, message) {
        console.log(`[Slack] Sending to ${channel}:\n${message}`);
        // Mock Axios POST to Slack API
        return { ok: true };
    }

    /**
     * Send an interactive approval message with buttons
     */
    async sendApprovalMessage(payload) {
        let text = `*Approval Required: ${payload.actionType || payload.actionPayload?.type}*`;
        if (payload.aiReasoning) text += `\n*AI Reasoning:* ${payload.aiReasoning}`;
        if (payload.actionPayload) text += `\n*Action Details:* ${JSON.stringify(payload.actionPayload)}`;
        
        const blocks = [
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: text
                }
            },
            {
                type: "actions",
                elements: [
                    {
                        type: "button",
                        text: { type: "plain_text", text: "Approve" },
                        style: "primary",
                        value: JSON.stringify({ action: "approve", sagaId: payload.sagaId, id: payload.id })
                    },
                    {
                        type: "button",
                        text: { type: "plain_text", text: "Reject" },
                        style: "danger",
                        value: JSON.stringify({ action: "reject", sagaId: payload.sagaId, id: payload.id })
                    }
                ]
            }
        ];

        console.log(`[Slack] Sending Approval to Execs:\n`, JSON.stringify(blocks, null, 2));
        return { ok: true };
    }

    /**
     * Parse and handle incoming chat commands (e.g., /forecast)
     */
    async handleCommand(command, userId) {
        console.log(`[Slack] Received command from ${userId}: ${command}`);
        // Route to conversational interface from Phase 7C-A
        // Mock return
        return `Processed command: ${command}`;
    }

    /**
     * Handle interactive action payload (button clicks)
     */
    async handleInteraction(payload) {
        try {
            const action = JSON.parse(payload.actions[0].value);
            
            if (action.action === 'approve' || action.action === 'reject') {
                // Publish back to bus for GenerativeActionService
                await eventBus.publish({
                    eventType: 'APPROVAL_COMPLETED',
                    source: 'slack',
                    tenantId: 'system',
                    payload: {
                        sagaId: action.sagaId,
                        approvalId: action.id,
                        approved: action.action === 'approve',
                        approver: payload.user?.id || 'exec_user'
                    }
                });
            }

            return { text: `Action recorded: ${action.action}` };
        } catch (err) {
            console.error('[Slack] Failed to handle interaction', err);
            throw err;
        }
    }
}

module.exports = new CollaborationService();
