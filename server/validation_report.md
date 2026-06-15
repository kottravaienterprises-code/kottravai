# E2E Sales AutoPilot Validation Report

**Date:** 2026-06-11T10:41:15.324Z
**Total Tests:** 12
**Passed:** 5
**Failed:** 7

## Test Results

- ✅ PASS | Lead Creation | Lead created with ID: dd2157d0-9a40-4838-9c3b-3d0a157a1a95
- ❌ FAIL | Lead Activity Logging | Error: No activities found
- ✅ PASS | Source Tracking | Source recorded correctly
- ✅ PASS | AI Score Populated | Score: 20
- ✅ PASS | AI Summary Populated | Summary exists
- ❌ FAIL | Estimated Deal Value Generated | Error: Value is undefined
- ✅ PASS | Conversion Probability Generated | Probability: null%
- ❌ FAIL | Calendly Integration | Error: Webhook processing failed
- ❌ FAIL | followupNurturingJob executes | Error: column "sales_stage" does not exist
- ❌ FAIL | Next Follow-up Date Updates | Error: Date not bumped
- ❌ FAIL | Activity Logging after send | Error: No automated email activity found
- ❌ FAIL | n8n Integration Validation | Error: Webhook processing failed

## Configuration & Environment Review
- SUPABASE_URL: ✅ Configured
- VITE_SUPABASE_ANON_KEY: ✅ Configured
- SMTP_USER: ❌ Missing
- SMTP_PASSWORD: ❌ Missing

## Production Readiness Score: 42%

### ❌ Not Ready for Production
Critical failures detected in the validation. See results above for details.
