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
    utm_content?: string;
    utm_term?: string;
    first_utm_source?: string;
    first_utm_medium?: string;
    first_utm_campaign?: string;
    first_utm_content?: string;
    first_utm_term?: string;
    session_utm_source?: string;
    session_utm_medium?: string;
    session_utm_campaign?: string;
    session_utm_content?: string;
    session_utm_term?: string;
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
    private firstUtm: { source: string; medium: string; campaign: string; content: string; term: string; };
    private sessionUtm: { source: string; medium: string; campaign: string; content: string; term: string; };

    constructor() {
        this.sessionId = getSessionId();
        this.visitorId = getVisitorId();
        const utms = this.resolveTrafficSource();
        this.firstUtm = utms.firstUtm;
        this.sessionUtm = utms.sessionUtm;

        console.debug('[Analytics] Service Ready. visitor_id=', this.visitorId, 'session_id=', this.sessionId);
    }

    private resolveTrafficSource() {
        if (typeof window === 'undefined') {
            return {
                firstUtm: { source: '', medium: '', campaign: '', content: '', term: '' },
                sessionUtm: { source: '', medium: '', campaign: '', content: '', term: '' }
            };
        }

        const params = new URLSearchParams(window.location.search);
        const currentUtm = {
            source: params.get('utm_source') || '',
            medium: params.get('utm_medium') || '',
            campaign: params.get('utm_campaign') || '',
            content: params.get('utm_content') || '',
            term: params.get('utm_term') || ''
        };

        // First-Touch Attribution (stored in localStorage)
        let firstUtmSource = localStorage.getItem('kottravai_first_utm_source');
        if (!firstUtmSource && currentUtm.source) {
            // New first touch via UTM
            localStorage.setItem('kottravai_first_utm_source', currentUtm.source);
            localStorage.setItem('kottravai_first_utm_medium', currentUtm.medium);
            localStorage.setItem('kottravai_first_utm_campaign', currentUtm.campaign);
            localStorage.setItem('kottravai_first_utm_content', currentUtm.content);
            localStorage.setItem('kottravai_first_utm_term', currentUtm.term);
        } else if (!firstUtmSource && document.referrer) {
            // New first touch via Referrer
            try {
                const refUrl = new URL(document.referrer);
                if (!refUrl.hostname.includes(window.location.hostname)) {
                    const refSource = refUrl.hostname.replace('www.', '');
                    localStorage.setItem('kottravai_first_utm_source', refSource);
                    localStorage.setItem('kottravai_first_utm_medium', 'referral');
                }
            } catch (e) {
                // Ignore invalid referrer
            }
        }

        const firstUtm = {
            source: localStorage.getItem('kottravai_first_utm_source') || '',
            medium: localStorage.getItem('kottravai_first_utm_medium') || '',
            campaign: localStorage.getItem('kottravai_first_utm_campaign') || '',
            content: localStorage.getItem('kottravai_first_utm_content') || '',
            term: localStorage.getItem('kottravai_first_utm_term') || ''
        };

        // Session Attribution (stored in sessionStorage)
        if (currentUtm.source) {
            sessionStorage.setItem('kottravai_session_utm_source', currentUtm.source);
            sessionStorage.setItem('kottravai_session_utm_medium', currentUtm.medium);
            sessionStorage.setItem('kottravai_session_utm_campaign', currentUtm.campaign);
            sessionStorage.setItem('kottravai_session_utm_content', currentUtm.content);
            sessionStorage.setItem('kottravai_session_utm_term', currentUtm.term);
        } else if (!sessionStorage.getItem('kottravai_session_utm_source') && document.referrer) {
            try {
                const refUrl = new URL(document.referrer);
                if (!refUrl.hostname.includes(window.location.hostname)) {
                    sessionStorage.setItem('kottravai_session_utm_source', refUrl.hostname.replace('www.', ''));
                    sessionStorage.setItem('kottravai_session_utm_medium', 'referral');
                }
            } catch (e) {
                // Ignore invalid referrer
            }
        }

        const sessionUtm = {
            source: sessionStorage.getItem('kottravai_session_utm_source') || '',
            medium: sessionStorage.getItem('kottravai_session_utm_medium') || '',
            campaign: sessionStorage.getItem('kottravai_session_utm_campaign') || '',
            content: sessionStorage.getItem('kottravai_session_utm_content') || '',
            term: sessionStorage.getItem('kottravai_session_utm_term') || ''
        };

        return { firstUtm, sessionUtm };
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
        if (typeof window === 'undefined') return '';
        let landing = sessionStorage.getItem('kottravai_landing_page');
        if (!landing) {
            landing = window.location.pathname;
            sessionStorage.setItem('kottravai_landing_page', landing);
        }
        return landing;
    }

    private updateJourneyTree(page: string): string {
        if (typeof window === 'undefined') return '[]';
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
        if (this.sessionUtm.source) return this.sessionUtm.source;
        if (typeof document === 'undefined') return 'Direct';
        const ref = document.referrer;
        if (!ref) return 'Direct';
        if (ref.includes('google.com')) return 'Google Organic';
        if (ref.includes('facebook.com') || ref.includes('instagram.com')) return 'Social';
        return 'Referral';
    }

    private createPayload(eventType: string, page: string, metadata: AnalyticsMetadata = {}): AnalyticsPayload {
        const targetPage = page || (typeof window !== 'undefined' ? window.location.pathname : '');
        const payload: AnalyticsPayload = {
            event_type: eventType,
            page: targetPage,
            page_title: typeof document !== 'undefined' ? document.title || targetPage : targetPage,
            landing_page: this.getLandingPage(),
            traffic_source: this.getTrafficSource(),
            tree: this.updateJourneyTree(targetPage),
            timestamp: new Date().toISOString(),
            session_id: this.sessionId,
            visitor_id: this.visitorId,
            page_url: typeof window !== 'undefined' ? window.location.href : '',
            browser: this.getBrowser(),
            device: this.getDeviceType(),
            screen_size: typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : '',
            referrer: normalizeValue(typeof document !== 'undefined' ? document.referrer : ''),
            
            // Legacy aliases for backward compatibility if needed, map to session
            utm_source: normalizeValue(this.sessionUtm.source),
            utm_medium: normalizeValue(this.sessionUtm.medium),
            utm_campaign: normalizeValue(this.sessionUtm.campaign),
            utm_content: normalizeValue(this.sessionUtm.content),
            utm_term: normalizeValue(this.sessionUtm.term),

            // First touch
            first_utm_source: normalizeValue(this.firstUtm.source),
            first_utm_medium: normalizeValue(this.firstUtm.medium),
            first_utm_campaign: normalizeValue(this.firstUtm.campaign),
            first_utm_content: normalizeValue(this.firstUtm.content),
            first_utm_term: normalizeValue(this.firstUtm.term),

            // Session touch
            session_utm_source: normalizeValue(this.sessionUtm.source),
            session_utm_medium: normalizeValue(this.sessionUtm.medium),
            session_utm_campaign: normalizeValue(this.sessionUtm.campaign),
            session_utm_content: normalizeValue(this.sessionUtm.content),
            session_utm_term: normalizeValue(this.sessionUtm.term),

            metadata: metadata
        };

        return payload;
    }

    private async send(payload: AnalyticsPayload) {
        // 1. Send to Custom Backend API
        try {
            await fetch(TRACKING_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                keepalive: true
            });
            console.debug('[Analytics] Sent', payload.event_type, 'to', TRACKING_ENDPOINT);
        } catch (error) {
            console.warn('[Analytics] Backend tracking failed:', error);
        }

        // 2. Forward to GA4 (gtag)
        if (typeof window !== 'undefined' && (window as any).gtag) {
            try {
                const ga4Payload = { ...payload };
                if (payload.metadata) {
                    Object.assign(ga4Payload, payload.metadata);
                }
                
                // If it's a purchase, ensure GA4 formatting is valid
                if (payload.event_type === 'purchase_completed' || payload.event_type === 'purchase') {
                    (window as any).gtag('event', 'purchase', ga4Payload);
                } else {
                    (window as any).gtag('event', payload.event_type, ga4Payload);
                }
            } catch (err) {
                console.warn('[Analytics] GA4 tracking failed:', err);
            }
        }
    }

    public setUserId(userId: string | null) {
        if (typeof localStorage === 'undefined') return;
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
        const payload = this.createPayload(eventType, page || metadata.page || (typeof window !== 'undefined' ? window.location.pathname : ''), metadata);
        void this.send(payload);
    }
}

export const analytics = new AnalyticsService();

if (typeof window !== 'undefined') {
    (window as any).analytics = analytics;
}

export default analytics;
