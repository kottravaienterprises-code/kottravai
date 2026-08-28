const fs = require('fs');

const file = '../src/pages/LivelihoodChallenge.tsx';
let content = fs.readFileSync(file, 'utf8');

const newSubmitCode = `
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validateForm()) return;

        analytics.trackEvent('hackathon_registration_started', { team_name: formData.teamName });
        
        setIsSubmitting(true);
        setPaymentStatus(null);
        
        const RazorpayInstance = (window as any).Razorpay;
        if (!RazorpayInstance) {
            toast.error("Razorpay SDK not loaded. Please refresh the page.");
            setIsSubmitting(false);
            return;
        }

        try {
            // 1. Call Backend Registration Endpoint
            const registerResponse = await fetch(\`/api/hackathon/register\`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    teamName: formData.teamName,
                    leaderName: formData.leaderName,
                    leaderEmail: formData.leaderEmail,
                    leaderPhone: formData.leaderPhone,
                    leaderOrg: formData.leaderOrg,
                    part2Name: formData.part2Name,
                    part2Email: formData.part2Email,
                    part2Phone: formData.part2Phone,
                    part2Org: formData.part2Org,
                    part3Name: formData.part3Name || null,
                    part3Email: formData.part3Email || null,
                    part3Phone: formData.part3Phone || null,
                    part3Org: formData.part3Org || null,
                    first_utm_source: sessionStorage.getItem('kottravai_first_utm_source') || localStorage.getItem('kottravai_first_utm_source') || 'direct',
                    first_utm_medium: sessionStorage.getItem('kottravai_first_utm_medium') || localStorage.getItem('kottravai_first_utm_medium') || 'none',
                    first_utm_campaign: sessionStorage.getItem('kottravai_first_utm_campaign') || localStorage.getItem('kottravai_first_utm_campaign') || 'none',
                    first_utm_term: sessionStorage.getItem('kottravai_first_utm_term') || localStorage.getItem('kottravai_first_utm_term') || 'none',
                    first_utm_content: sessionStorage.getItem('kottravai_first_utm_content') || localStorage.getItem('kottravai_first_utm_content') || 'none',
                    session_utm_source: sessionStorage.getItem('kottravai_session_utm_source') || 'direct',
                    session_utm_medium: sessionStorage.getItem('kottravai_session_utm_medium') || 'none',
                    session_utm_campaign: sessionStorage.getItem('kottravai_session_utm_campaign') || 'none',
                    session_utm_term: sessionStorage.getItem('kottravai_session_utm_term') || 'none',
                    session_utm_content: sessionStorage.getItem('kottravai_session_utm_content') || 'none'
                })
            });

            if (!registerResponse.ok) {
                const err = await registerResponse.json();
                throw new Error(err.message || "Failed to create registration");
            }

            const regData = await registerResponse.json();
            
            analytics.trackEvent('hackathon_payment_initiated', { registration_id: regData.registration_id, amount: regData.amount });

            // 2. Open Razorpay
            const options: any = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID,
                amount: regData.amount,
                currency: regData.currency,
                name: "Kottravai",
                description: "Rural Livelihood Hackathon Registration",
                order_id: regData.order_id,
                handler: async (response: any) => {
                    setIsSubmitting(true);
                    
                    try {
                        // 3. Verify Payment
                        const verifyResponse = await fetch(\`/api/hackathon/verify\`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                registration_id: regData.registration_id
                            })
                        });

                        const verifyResult = await verifyResponse.json();

                        if (verifyResult.success) {
                            analytics.trackEvent('hackathon_payment_success', { payment_id: response.razorpay_payment_id });
                            analytics.trackEvent('hackathon_registration_completed', { team_name: formData.teamName });
                            
                            setPaymentStatus({
                                type: 'success',
                                message: 'Registration Successful',
                                data: {
                                    registrationId: regData.registration_id,
                                    teamName: formData.teamName,
                                    leaderName: formData.leaderName,
                                    fee: (regData.amount / 100).toString(),
                                    participants: formData.part3Name ? 3 : 2
                                }
                            });
                        } else {
                            throw new Error(verifyResult.message || "Payment verification failed");
                        }
                    } catch (error: any) {
                        analytics.trackEvent('hackathon_payment_failed', { reason: 'verification_failed', error: error.message });
                        setPaymentStatus({
                            type: 'error',
                            message: "Payment verification failed: " + error.message
                        });
                    }
                    setIsSubmitting(false);
                },
                prefill: {
                    name: formData.leaderName,
                    email: formData.leaderEmail,
                    contact: formData.leaderPhone
                },
                theme: { color: "#8E2A8B" },
                modal: {
                    ondismiss: function () {
                        setIsSubmitting(false);
                    }
                }
            };

            const rzp = new RazorpayInstance(options);
            rzp.on('payment.failed', function (response: any) {
                analytics.trackEvent('hackathon_payment_failed', { reason: 'razorpay_error', error: response.error.description });
                toast.error(response.error.description || "Payment failed");
            });
            rzp.open();
            
        } catch (error: any) {
            console.error("Hackathon Registration error:", error);
            toast.error(error.message || "Something went wrong. Please try again.");
            setIsSubmitting(false);
        }
    };
`;

const startIdx = content.indexOf('const handleSubmit = async (e: React.FormEvent) => {');
const endIdx = content.indexOf('    return (', startIdx);
if (startIdx !== -1 && endIdx !== -1) {
    content = content.substring(0, startIdx) + newSubmitCode + '\n' + content.substring(endIdx);
    
    // Replace API_ENDPOINTS.razorpay imports if they are no longer used? No, keep it.
    // Ensure we don't have price = 1/199 hardcoded here, which we don't anymore.
    fs.writeFileSync(file, content);
    console.log('handleSubmit updated');
} else {
    console.log('Could not find handleSubmit block');
}
