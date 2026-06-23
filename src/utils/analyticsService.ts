import { getSessionId } from '@/utils/session';
import { getVisitorId } from '@/utils/visitor';

export type AnalyticsMetadata = Record<string, any>;

export interface AnalyticsPayload {
    event_type: string;
    page: string;
    timestamp: string;
    session_id: string;
    visitor_id: string;
    page_url: string;
    browser: string;
    device: string;
    screen_size: string;
    referrer?: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    metadata?: AnalyticsMetadata;
    [key: string]: any;
}

const TRACKING_API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const TRACKING_ENDPOINT = TRACKING_API_BASE
    ? `${TRACKING_API_BASE.replace(/\/$/, '')}/api/track/event`
    : '/api/track/event';

const normalizeValue = (value: any): any => {
    if (value === null || value === undefined || value === '') return undefined;
    return value;
};

class AnalyticsService {
    private sessionId: string;
    private visitorId: string;
    private trafficSource: {
        utm_source: string;
        utm_medium: string;
        utm_campaign: string;
    };

    constructor() {
        this.sessionId = getSessionId();
        this.visitorId = getVisitorId();
        this.trafficSource = this.resolveTrafficSource();

        console.debug('[Analytics] Service Ready. visitor_id=', this.visitorId, 'session_id=', this.sessionId);
    }

    private resolveTrafficSource() {
        const params = new URLSearchParams(window.location.search);
        let utm_source = params.get('utm_source');
        let utm_medium = params.get('utm_medium');
        let utm_campaign = params.get('utm_campaign');

        // If URL has UTM parameters, save them to sessionStorage
        if (utm_source || utm_medium || utm_campaign) {
            sessionStorage.setItem('kottravai_utm_source', utm_source || '');
            sessionStorage.setItem('kottravai_utm_medium', utm_medium || '');
            sessionStorage.setItem('kottravai_utm_campaign', utm_campaign || '');
        } else {
            // Otherwise try to load them from sessionStorage
            utm_source = sessionStorage.getItem('kottravai_utm_source');
            utm_medium = sessionStorage.getItem('kottravai_utm_medium');
            utm_campaign = sessionStorage.getItem('kottravai_utm_campaign');
            
            // If still no utm_source, try to extract domain from the document.referrer
            if (!utm_source && typeof document !== 'undefined' && document.referrer) {
                try {
                    const refUrl = new URL(document.referrer);
                    if (!refUrl.hostname.includes(window.location.hostname)) {
                        utm_source = refUrl.hostname.replace('www.', '');
                        utm_medium = 'referral';
                        
                        // Save this inferred source so we don't lose it on navigation
                        sessionStorage.setItem('kottravai_utm_source', utm_source);
                        sessionStorage.setItem('kottravai_utm_medium', utm_medium);
                    }
                } catch (e) {
                    // Silent fail if referrer is not a valid URL
                }
            }
        }

        return {
            utm_source: utm_source || '',
            utm_medium: utm_medium || '',
            utm_campaign: utm_campaign || ''
        };
    }

    private getDeviceType(): string {
        const ua = navigator.userAgent;
        if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return 'tablet';
        if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) return 'mobile';
        return 'desktop';
    }

    private getBrowser(): string {
        const ua = navigator.userAgent;
        if (ua.includes('Firefox')) return 'Firefox';
        if (ua.includes('Edg')) return 'Edge';
        if (ua.includes('Chrome')) return 'Chrome';
        if (ua.includes('Safari')) return 'Safari';
        return 'Other';
    }

    private getLandingPage(): string {
        let landing = sessionStorage.getItem('kottravai_landing_page');
        if (!landing) {
            landing = window.location.pathname;
            sessionStorage.setItem('kottravai_landing_page', landing);
        }
        return landing;
    }

    private updateJourneyTree(page: string): string {
        let treeStr = sessionStorage.getItem('kottravai_journey_tree') || '[]';
        try {
            const tree = JSON.parse(treeStr);
            if (tree[tree.length - 1] !== page) {
                tree.push(page);
                treeStr = JSON.stringify(tree);
                sessionStorage.setItem('kottravai_journey_tree', treeStr);
            }
        } catch (e) {
            treeStr = JSON.stringify([page]);
            sessionStorage.setItem('kottravai_journey_tree', treeStr);
        }
        return treeStr;
    }

    private getTrafficSource(): string {
        if (this.trafficSource.utm_source) return this.trafficSource.utm_source;
        const ref = document.referrer;
        if (!ref) return 'Direct';
        if (ref.includes('google.com')) return 'Google Organic';
        if (ref.includes('facebook.com') || ref.includes('instagram.com')) return 'Social';
        return 'Referral';
    }

    private createPayload(eventType: string, page: string, metadata: AnalyticsMetadata = {}): AnalyticsPayload {
        const targetPage = page || window.location.pathname;
        const payload: AnalyticsPayload = {
            event_type: eventType,
            page: targetPage,
            page_title: document.title || targetPage,
            landing_page: this.getLandingPage(),
            traffic_source: this.getTrafficSource(),
            tree: this.updateJourneyTree(targetPage),
            timestamp: new Date().toISOString(),
            session_id: this.sessionId,
            visitor_id: this.visitorId,
            page_url: window.location.href,
            browser: this.getBrowser(),
            device: this.getDeviceType(),
            screen_size: `${window.screen.width}x${window.screen.height}`,
            referrer: normalizeValue(document.referrer),
            utm_source: normalizeValue(this.trafficSource.utm_source),
            utm_medium: normalizeValue(this.trafficSource.utm_medium),
            utm_campaign: normalizeValue(this.trafficSource.utm_campaign),
            metadata: metadata
        };

        return payload;
    }

    private async send(payload: AnalyticsPayload) {
        try {
            await fetch(TRACKING_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                keepalive: true
            });
            console.debug('[Analytics] Sent', payload.event_type, 'to', TRACKING_ENDPOINT);
        } catch (error) {
            console.warn('[Analytics] Tracking failed:', error);
        }
    }

    public setUserId(userId: string | null) {
        if (userId) {
            localStorage.setItem('kottravai_user_id', userId);
        } else {
            localStorage.removeItem('kottravai_user_id');
        }
    }

    public trackPageView(page: string, metadata: AnalyticsMetadata = {}) {
        const payload = this.createPayload('page_view', page, metadata);
        void this.send(payload);
    }

    public trackEvent(eventType: string, metadata: AnalyticsMetadata = {}, page?: string) {
        const payload = this.createPayload(eventType, page || metadata.page || window.location.pathname, metadata);
        void this.send(payload);
    }
}

export const analytics = new AnalyticsService();

if (typeof window !== 'undefined') {
    (window as any).analytics = analytics;
}

export default analytics;
