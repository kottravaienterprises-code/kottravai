const db = require('../../db');
const eventBus = require('../eventBus');

class BillingService {
    constructor() {
        // Initialize Stripe Mock / SDK
        this.stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_mock';

        // Listen for Generative Action Executions
        eventBus.subscribe('EXECUTE_DISCOUNT_NEGOTIATION', async (event) => {
            await this.applyDiscount(event.payload);
        });
    }

    async applyDiscount(payload) {
        console.log(`[Stripe Billing] Applying ${payload.discountPercent}% discount to customer ${payload.targetCustomer} for ${payload.durationMonths} months`);
        // Mock Stripe API call
        // const customer = await stripe.customers.update(payload.targetCustomer, { coupon: 'retention_coupon' });
        
        // Publish success back to the bus
        await eventBus.publish({
            eventType: 'DISCOUNT_APPLIED',
            source: 'stripe_billing',
            tenantId: 'system',
            payload: { customerId: payload.targetCustomer, discount: payload.discountPercent, sagaId: payload.sagaId }
        });
    }

    /**
     * Process incoming Stripe webhooks
     * @param {Object} event Stripe webhook event payload
     */
    async processStripeWebhook(stripeEvent) {
        try {
            switch (stripeEvent.type) {
                case 'invoice.payment_succeeded':
                    await this._handlePaymentSucceeded(stripeEvent.data.object);
                    break;
                case 'invoice.payment_failed':
                    await this._handlePaymentFailed(stripeEvent.data.object);
                    break;
                case 'customer.subscription.created':
                case 'customer.subscription.updated':
                    await this._handleSubscriptionChange(stripeEvent.data.object);
                    break;
                case 'customer.subscription.deleted':
                    await this._handleSubscriptionCancelled(stripeEvent.data.object);
                    break;
                default:
                    console.log(`[BillingService] Unhandled stripe event type: ${stripeEvent.type}`);
            }
            return { success: true };
        } catch (err) {
            console.error('[BillingService] Webhook processing failed', err);
            throw err;
        }
    }

    async _handlePaymentSucceeded(invoice) {
        // Sync invoice
        const customerId = invoice.customer;
        const tenantId = await this._mapCustomerToTenant(customerId);

        await eventBus.publish({
            eventType: 'PAYMENT_RECEIVED',
            source: 'stripe',
            tenantId,
            payload: {
                invoiceId: invoice.id,
                amountPaid: invoice.amount_paid,
                currency: invoice.currency,
                customer: customerId
            }
        });

        // Trigger Revenue Recognition update
        await this._recognizeRevenue(tenantId, invoice.amount_paid, invoice.currency);
    }

    async _handlePaymentFailed(invoice) {
        const customerId = invoice.customer;
        const tenantId = await this._mapCustomerToTenant(customerId);

        await eventBus.publish({
            eventType: 'PAYMENT_FAILED',
            source: 'stripe',
            tenantId,
            payload: {
                invoiceId: invoice.id,
                amountDue: invoice.amount_due,
                currency: invoice.currency,
                customer: customerId
            }
        });
    }

    async _handleSubscriptionChange(subscription) {
        const customerId = subscription.customer;
        const tenantId = await this._mapCustomerToTenant(customerId);

        await eventBus.publish({
            eventType: 'SUBSCRIPTION_RENEWED',
            source: 'stripe',
            tenantId,
            payload: {
                subscriptionId: subscription.id,
                status: subscription.status,
                plan: subscription.plan?.id,
                amount: subscription.plan?.amount
            }
        });
    }

    async _handleSubscriptionCancelled(subscription) {
        const customerId = subscription.customer;
        const tenantId = await this._mapCustomerToTenant(customerId);

        await eventBus.publish({
            eventType: 'SUBSCRIPTION_CANCELLED',
            source: 'stripe',
            tenantId,
            payload: {
                subscriptionId: subscription.id,
                status: subscription.status
            }
        });
    }

    /**
     * Maps an external Stripe customer ID to an internal Tenant/Account ID.
     */
    async _mapCustomerToTenant(stripeCustomerId) {
        // Mock DB lookup
        return `tenant_from_stripe_${stripeCustomerId}`;
    }

    /**
     * Revenue Recognition Feed Stub
     */
    async _recognizeRevenue(tenantId, amount, currency) {
        console.log(`[BillingService] Recognizing revenue for ${tenantId}: ${amount} ${currency}`);
        // In reality, this inserts into a revenue_ledger table
    }

    /**
     * For internal sync polling (if webhooks missed)
     */
    async syncInvoices(tenantId) {
        console.log(`[BillingService] Syncing invoices for ${tenantId}`);
        return { synced: true };
    }
}

module.exports = new BillingService();
