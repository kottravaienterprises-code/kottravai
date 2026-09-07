const fs = require('fs');

const path = 'src/utils/analyticsService.ts';
let code = fs.readFileSync(path, 'utf8');

// Replace the endpoint definitions
code = code.replace(
    /const TRACKING_API_BASE = import\.meta\.env\.VITE_API_BASE_URL \|\| '';\s*const TRACKING_ENDPOINT = TRACKING_API_BASE\s*\?\s*`\$\{TRACKING_API_BASE\.replace\(\/\\\\\/\\$\/, ''\)\}\/api\/track\/event`\s*:\s*'\/api\/track\/event';/g,
    `const GAS_ENDPOINT = import.meta.env.VITE_GAS_ENDPOINT_V2 || '';`
);

// Replace the send function to use GAS_ENDPOINT and change POST request properties for GAS (often requires mode: 'no-cors' or specific headers, but for JSON payload to doPost usually we can just send text/plain to avoid preflight issues if cors isn't fully configured, but Content-Type: text/plain is better for GAS web apps)
code = code.replace(
    /private async send\(payload: AnalyticsPayload\) \{[\s\S]*?\/\/ 2\. Forward to GA4/m,
    `private async send(payload: AnalyticsPayload) {
        // 1. Send to Google Apps Script Endpoint (V2)
        if (GAS_ENDPOINT) {
            try {
                await fetch(GAS_ENDPOINT, {
                    method: 'POST',
                    // Using text/plain avoids CORS preflight issues with Google Apps Script Web Apps
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify(payload),
                    keepalive: true,
                    mode: 'no-cors' // We don't need to read the response, just fire and forget
                });
                console.debug('[Analytics] Sent', payload.event_type, 'to GAS V2');
            } catch (error) {
                console.warn('[Analytics] GAS tracking failed safely:', error);
            }
        } else {
            console.warn('[Analytics] VITE_GAS_ENDPOINT_V2 is not configured. Event dropped:', payload.event_type);
        }

        // 2. Forward to GA4`
);

fs.writeFileSync(path, code, 'utf8');
console.log('Patched analyticsService.ts for GAS V2');
