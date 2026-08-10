const getBaseLayout = (content) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Kottravai</title>
    <style>
        body { margin: 0; padding: 0; font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f5; -webkit-font-smoothing: antialiased; }
        .container { width: 100%; max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.04); border: 1px solid #f0f0f0; }
        .header { padding: 32px 24px; text-align: center; background-color: #ffffff; border-bottom: 4px solid #8E2A8B; }
        .logo { max-width: 140px; height: auto; display: block; margin: 0 auto; }
        .content { padding: 40px 32px; color: #3f3f46; line-height: 1.7; font-size: 15px; }
        .footer { padding: 32px; text-align: center; background-color: #fafafa; color: #71717a; font-size: 13px; border-top: 1px solid #f0f0f0; }
        .btn { display: inline-block; padding: 14px 28px; background-color: #8E2A8B; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 24px; box-shadow: 0 2px 8px rgba(142, 42, 139, 0.2); }
        .info-row { margin-bottom: 16px; display: flex; flex-direction: column; }
        .label { font-weight: 600; color: #71717a; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
        .value { color: #27272a; font-size: 15px; }
        h1, h2, h3 { color: #2D1B4E; margin-top: 0; font-weight: 700; line-height: 1.3; }
        h2 { font-size: 22px; margin-bottom: 16px; }
        .social-links { margin: 20px 0; }
        .social-links a { margin: 0 10px; color: #8E2A8B; text-decoration: none; font-weight: 600; }
        .data-card { background-color: #fdf4fc; padding: 24px; border-radius: 8px; margin: 24px 0; border: 1px solid #f8e5f6; }
        .quote { padding: 16px 20px; border-left: 4px solid #8E2A8B; background-color: #fbfbfc; font-style: italic; color: #52525b; margin: 24px 0; }
    </style>
</head>
<body>
    <div style="background-color: #f4f4f5; padding: 20px 0; min-height: 100vh;">
        <table class="container" cellpadding="0" cellspacing="0" border="0">
            <tr>
                <td class="header">
                    <img src="https://www.kottravai.in/logo.png" alt="Kottravai Logo" class="logo">
                </td>
            </tr>
            <tr>
                <td class="content">
                    ${content}
                </td>
            </tr>
            <tr>
                <td class="footer">
                    <p style="margin: 0 0 8px 0; font-weight: 600; color: #52525b;">Empowering Rural Women Artisans</p>
                    <p style="margin: 0 0 16px 0;">&copy; ${new Date().getFullYear()} Kottravai. All rights reserved.</p>
                    <div class="social-links">
                        <a href="https://kottravai.in">Website</a>
                        <a href="https://instagram.com/kottravai">Instagram</a>
                    </div>
                    <p style="margin: 16px 0 0 0; font-size: 12px; line-height: 1.5;">
                        Vazhai Incubator<br>
                        S Veerachamy Chettiar College,<br>
                        Puliyangudi - 627855
                    </p>
                </td>
            </tr>
        </table>
    </div>
</body>
</html>
`;

const getB2BAdminTemplate = (data) => {
    const content = `
        <h2>New B2B Inquiry Received</h2>
        <p>You have received a new inquiry from the B2B contact form. Here are the details:</p>
        
        <div class="data-card">
            <div class="info-row">
                <span class="label">Contact Name:</span>
                <span class="value">${data.name}</span>
            </div>
            <div class="info-row">
                <span class="label">Email:</span>
                <span class="value"><a href="mailto:${data.email}" style="color: #8E2A8B;">${data.email}</a></span>
            </div>
            <div class="info-row">
                <span class="label">Phone:</span>
                <span class="value"><a href="tel:${data.phone}" style="color: #8E2A8B;">${data.phone}</a></span>
            </div>
            <div class="info-row">
                <span class="label">Company / Business:</span>
                <span class="value">${data.company || 'N/A'}</span>
            </div>
            <div class="info-row">
                <span class="label">Location:</span>
                <span class="value">${data.location}</span>
            </div>
            <hr style="border: 0; border-top: 1px solid #e4e4e7; margin: 20px 0;">
            <div class="info-row">
                <span class="label">Interested Products:</span>
                <span class="value">${data.products}</span>
            </div>
            <div class="info-row">
                <span class="label">Approx. Quantity:</span>
                <span class="value">${data.quantity}</span>
            </div>
            <div class="info-row">
                <span class="label">Additional Notes:</span>
                <p class="value" style="margin-top: 5px;">${data.notes || 'None'}</p>
            </div>
        </div>
        
        <p style="text-align: center;">
            <a href="mailto:${data.email}" class="btn">Reply to Inquiry</a>
        </p>
    `;
    return getBaseLayout(content);
};

const getB2BUserTemplate = (data) => {
    const content = `
        <h2>Thank You for Your Inquiry</h2>
        <p>Dear ${data.name},</p>
        <p>Thank you for reaching out to <strong>Kottravai</strong> regarding your corporate gifting requirements.</p>
        <p>We have successfully received your inquiry for <strong>${data.products}</strong>.</p>
        <p>Our team is currently reviewing your request and will get back to you within 24 hours to discuss how we can tailor our authentic, handmade products for your needs.</p>
        
        <div class="quote">
            "Every gift you choose empowers rural women artisans and sustains traditional craftsmanship."
        </div>

        <p>If you have any urgent questions, please feel free to reply to this email or call us at <strong style="color: #2D1B4E;">+91 97870 30811</strong>.</p>
        
        <p>Warm Regards,<br>Team Kottravai</p>
        
        <p style="text-align: center;">
            <a href="https://kottravai.in" class="btn">Visit Our Website</a>
        </p>
    `;
    return getBaseLayout(content);
};

const getContactAdminTemplate = (data) => {
    const content = `
        <h2>New Contact Form Submission</h2>
        <p>You have received a new message from the website contact form.</p>
        
        <div class="data-card">
            <div class="info-row">
                <span class="label">Name:</span>
                <span class="value">${data.name}</span>
            </div>
            <div class="info-row">
                <span class="label">Email:</span>
                <span class="value"><a href="mailto:${data.email}" style="color: #8E2A8B;">${data.email}</a></span>
            </div>
            <div class="info-row">
                <span class="label">Subject:</span>
                <span class="value">${data.subject || 'General Inquiry'}</span>
            </div>
            <div class="info-row">
                <span class="label">Message:</span>
                <p class="value" style="margin-top: 5px; white-space: pre-wrap;">${data.message}</p>
            </div>
        </div>
        
        <p style="text-align: center;">
            <a href="mailto:${data.email}" class="btn">Reply to Message</a>
        </p>
    `;
    return getBaseLayout(content);
};

const getContactUserTemplate = (data) => {
    const content = `
        <h2>We Received Your Message</h2>
        <p>Dear ${data.name},</p>
        <p>Thank you for contacting <strong>Kottravai</strong>. We have received your message regarding "<strong>${data.subject || 'General Inquiry'}</strong>".</p>
        <p>Our team will review your message and get back to you as soon as possible.</p>
        
        <p>If your inquiry is urgent, please call us directly at <strong style="color: #2D1B4E;">+91 97870 30811</strong>.</p>
        
        <p>Warm Regards,<br>Team Kottravai</p>
    `;
    return getBaseLayout(content);
};

const getOrderAdminTemplate = (order) => {
    const hasCustomization = order.items.some(item => item.customizationData?.isCustomized);

    const itemsList = order.items.map(item => `
        <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">
                ${item.name} (x${item.quantity})
                ${item.customizationData?.isCustomized ? `
                    <div style="background: #fdf4fc; border-left: 3px solid #8E2A8B; padding: 6px; margin-top: 6px; font-size: 12px; border-radius: 4px;">
                        <strong>✨ Customization Request:</strong><br/>
                        ${item.customizationData.customText ? `Text: <em>"${item.customizationData.customText}"</em><br/>` : ''}
                        ${item.customizationData.specialInstructions ? `Instructions: ${item.customizationData.specialInstructions}<br/>` : ''}
                        ${item.customizationData.fileUrl ? `<a href="${item.customizationData.fileUrl}" style="color:#8E2A8B;">View Uploaded File</a>` : ''}
                    </div>
                ` : ''}
            </td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; vertical-align: top;">₹${item.price * item.quantity + (item.customizationData?.isCustomized ? item.customizationData.customizationCharge : 0)}</td>
        </tr>
    `).join('');

    const actionBanner = hasCustomization ? `
        <div style="background-color: #fef2f2; border: 1px solid #f87171; border-left: 5px solid #ef4444; padding: 15px; margin-bottom: 20px; border-radius: 6px;">
            <h3 style="color: #b91c1c; margin: 0 0 5px 0;">🚨 ACTION REQUIRED: Customized Order</h3>
            <p style="margin: 0; color: #991b1b; font-size: 14px;">This order contains customized products that require manual review and production setup before processing.</p>
        </div>
    ` : '';

    const content = `
        ${actionBanner}
        <h2>New Order Received!</h2>
        <p>You have received a new order (<strong>#${order.orderId}</strong>) from <strong>${order.customerName}</strong>.</p>
        
        <div class="data-card">
            <h3 style="border-bottom: 1px solid #e4e4e7; padding-bottom: 10px;">Customer Details</h3>
            <p>
                <strong>Name:</strong> ${order.customerName}<br>
                <strong>Email:</strong> ${order.customerEmail}<br>
                <strong>Phone:</strong> ${order.customerPhone}<br>
                <strong>Address:</strong><br>
                ${order.address}, ${order.city} - ${order.pincode}
            </p>

            <h3 style="border-bottom: 1px solid #ddd; padding-bottom: 10px; margin-top: 20px;">Order Summary</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background-color: #eee;">
                        <th style="padding: 8px; text-align: left;">Item</th>
                        <th style="padding: 8px; text-align: right;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsList}
                    <tr>
                        <td style="padding: 8px; font-weight: bold; border-top: 2px solid #ddd;">Grand Total</td>
                        <td style="padding: 8px; font-weight: bold; border-top: 2px solid #ddd; text-align: right;">₹${order.total}</td>
                    </tr>
                </tbody>
            </table>
            <p style="margin-top: 15px;"><strong>Payment ID:</strong> ${order.paymentId}</p>
        </div>
        
        ${hasCustomization ? `
        <p style="text-align: center;">
            <a href="https://kottravai.in/admin" class="btn" style="background-color: #ef4444;">Review Order in Dashboard</a>
        </p>
        ` : ''}
    `;
    return getBaseLayout(content);
};

const getOrderUserTemplate = (order) => {
    const itemsList = order.items.map(item => `
        <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">
                <strong>${item.name}</strong><br>
                <span style="font-size: 12px; color: #666;">Qty: ${item.quantity}</span>
            </td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">₹${item.price * item.quantity}</td>
        </tr>
    `).join('');

    const content = `
        <h2>Order Confirmation</h2>
        <p>Dear ${order.customerName},</p>
        <p>Thank you for shopping with <strong>Kottravai</strong>! Your order has been successfully placed.</p>
        
        <div class="data-card">
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #e4e4e7; padding-bottom: 10px; margin-bottom: 15px;">
                <span><strong>Order ID:</strong> #${order.orderId}</span>
                <span><strong>Date:</strong> ${new Date().toLocaleDateString()}</span>
            </div>

            <table style="width: 100%; border-collapse: collapse;">
                <tbody>
                    ${itemsList}
                    <tr>
                        <td style="padding: 10px 8px; font-weight: bold; border-top: 2px solid #ddd;">Total Paid</td>
                        <td style="padding: 10px 8px; font-weight: bold; border-top: 2px solid #ddd; text-align: right; color: #8E2A8B; font-size: 18px;">₹${order.total}</td>
                    </tr>
                </tbody>
            </table>

            <div style="margin-top: 20px; font-size: 14px; color: #555;">
                <p><strong>Shipping Address:</strong><br>
                ${order.address}, ${order.city} - ${order.pincode}<br>
                Phone: ${order.customerPhone}</p>
            </div>
        </div>

        <p>We will notify you once your package is shipped. Usually, it takes 3-7 business days for delivery.</p>
        
        <p style="text-align: center;">
            <a href="https://kottravai.in/shop" class="btn">Continue Shopping</a>
        </p>
    `;
    return getBaseLayout(content);
};

const getAffiliateWelcomeTemplate = (data) => {
    const content = `
        <h2>Welcome to Kottravai Affiliate Program!</h2>
        <p>Dear ${data.name},</p>
        <p>Congratulations! Your application to become a Kottravai Affiliate Partner has been approved.</p>
        <p>You can now log in to your affiliate dashboard to start track your performance and earn commissions.</p>
        
        <div class="data-card">
            <h3 style="color: #8E2A8B; margin-bottom: 15px; border-bottom: 1px solid #e4e4e7; padding-bottom: 5px;">Your Partner Account Details</h3>
            <div class="info-row">
                <span class="label">Login Email:</span>
                <span class="value">${data.email}</span>
            </div>
            <div class="info-row" style="margin-top: 10px;">
                <span class="label">Password:</span>
                <span class="value">${data.password}</span>
            </div>
            <div class="info-row" style="margin-top: 10px;">
                <span class="label">Your Referral Code:</span>
                <span class="value" style="font-weight: 900; color: #2D1B4E; letter-spacing: 1px;">${data.referral_code}</span>
            </div>
        </div>
        
        <p><strong>Next Steps:</strong></p>
        <ol>
            <li>Go to <a href="https://kottravai.in/affiliate/dashboard" style="color: #8E2A8B;">Affiliate Portal</a></li>
            <li>Log in using your credentials above</li>
            <li>Generate your unique affiliate links</li>
            <li>Share them with your network and earn on every successful purchase!</li>
        </ol>

        <p>If you have any questions, feel free to reach out to us.</p>
        
        <p>Happy Earning!<br>Team Kottravai</p>
        
        <p style="text-align: center;">
            <a href="https://kottravai.in/affiliate/dashboard" class="btn">Go to Affiliate Dashboard</a>
        </p>
    `;
    return getBaseLayout(content);
};

// ──────────────────────────────────────────────────────────────
// மண் வாசம் Camp Registration Email Templates
// ──────────────────────────────────────────────────────────────

const getCampusUserTemplate = (data) => {
    const content = `
        <h2 style="color: #2D1B4E;">🌿 You're Registered for மண் வாசம்!</h2>
        <p>Dear <strong>${data.name}</strong>,</p>
        <p>Thank you for registering for the <strong>மண் வாசம்</strong> nature camp. Your payment of <strong>₹350</strong> has been received successfully.</p>

        <div style="background: linear-gradient(135deg, #fdf4fc, #f0faf0); padding: 24px; border-radius: 12px; margin: 24px 0; border: 1px solid #e8d4f0;">
            <h3 style="color: #8E2A8B; margin-top: 0; margin-bottom: 16px;">📋 Your Registration Details</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr><td style="padding: 8px 4px; color: #666; width: 40%;"><strong>Name</strong></td><td style="padding: 8px 4px; color: #333;">${data.name}</td></tr>
                <tr style="background: #fff8fe;"><td style="padding: 8px 4px; color: #666;"><strong>Age</strong></td><td style="padding: 8px 4px; color: #333;">${data.age}</td></tr>
                <tr><td style="padding: 8px 4px; color: #666;"><strong>WhatsApp</strong></td><td style="padding: 8px 4px; color: #333;">+91 ${data.whatsapp}</td></tr>
                <tr style="background: #fff8fe;"><td style="padding: 8px 4px; color: #666;"><strong>Place</strong></td><td style="padding: 8px 4px; color: #333;">${data.place}</td></tr>
                <tr><td style="padding: 8px 4px; color: #666;"><strong>Profession</strong></td><td style="padding: 8px 4px; color: #333;">${data.profession}</td></tr>
                <tr style="background: #fff8fe;"><td style="padding: 8px 4px; color: #666;"><strong>Payment ID</strong></td><td style="padding: 8px 4px; color: #333; font-family: monospace;">${data.paymentId}</td></tr>
            </table>
        </div>

        <div style="background-color: #f0faf4; border-left: 4px solid #22c55e; padding: 16px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
            <p style="margin: 0; font-weight: bold; color: #166534;">✅ Payment Confirmed — ₹350</p>
            <p style="margin: 6px 0 0; color: #166534; font-size: 13px;">Keep this email as your registration proof.</p>
        </div>

        <p style="color: #555;">We will be in touch shortly with camp details, location, schedule, and what to bring. Watch your WhatsApp (<strong>+91 ${data.whatsapp}</strong>) for updates!</p>

        <p>If you have any questions, reply to this email or write to us at <a href="mailto:info@kottravai.in" style="color: #8E2A8B;">info@kottravai.in</a>.</p>

        <p style="margin-top: 32px;">With warmth and anticipation,<br><strong>Team Kottravai — மண் வாசம்</strong></p>

        <p style="text-align: center; margin-top: 24px;">
            <a href="https://kottravai.in" class="btn">Visit Kottravai</a>
        </p>
    `;
    return getBaseLayout(content);
};

const getCampusAdminTemplate = (data) => {
    const content = `
        <h2>🌿 New மண் வாசம் Registration</h2>
        <p>A new participant has registered and completed payment for the மண் வாசம் camp.</p>

        <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="border-bottom: 1px solid #ddd; padding-bottom: 10px; color: #2D1B4E;">👤 Personal Details</h3>
            <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
                <tr><td style="padding: 6px 4px; color: #666; width: 40%;"><strong>Name</strong></td><td style="padding: 6px 4px;">${data.name}</td></tr>
                <tr style="background:#f0f0f0;"><td style="padding: 6px 4px; color: #666;"><strong>Age</strong></td><td style="padding: 6px 4px;">${data.age}</td></tr>
                <tr><td style="padding: 6px 4px; color: #666;"><strong>Gender</strong></td><td style="padding: 6px 4px;">${data.gender || 'Not specified'}</td></tr>
                <tr style="background:#f0f0f0;"><td style="padding: 6px 4px; color: #666;"><strong>Email</strong></td><td style="padding: 6px 4px;"><a href="mailto:${data.email}" style="color: #8E2A8B;">${data.email}</a></td></tr>
                <tr><td style="padding: 6px 4px; color: #666;"><strong>WhatsApp</strong></td><td style="padding: 6px 4px;"><a href="tel:+91${data.whatsapp}" style="color: #8E2A8B;">+91 ${data.whatsapp}</a></td></tr>
                <tr style="background:#f0f0f0;"><td style="padding: 6px 4px; color: #666;"><strong>Place / City</strong></td><td style="padding: 6px 4px;">${data.place}</td></tr>
                <tr><td style="padding: 6px 4px; color: #666;"><strong>Profession</strong></td><td style="padding: 6px 4px;">${data.profession}</td></tr>
            </table>

            <h3 style="border-bottom: 1px solid #ddd; padding-bottom: 10px; color: #2D1B4E; margin-top: 20px;">🚨 Emergency Contact</h3>
            <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
                <tr><td style="padding: 6px 4px; color: #666; width: 40%;"><strong>Name</strong></td><td style="padding: 6px 4px;">${data.emergencyName}</td></tr>
                <tr style="background:#f0f0f0;"><td style="padding: 6px 4px; color: #666;"><strong>Phone</strong></td><td style="padding: 6px 4px;"><a href="tel:+91${data.emergencyPhone}" style="color: #8E2A8B;">+91 ${data.emergencyPhone}</a></td></tr>
            </table>

            <h3 style="border-bottom: 1px solid #ddd; padding-bottom: 10px; color: #2D1B4E; margin-top: 20px;">🏥 Health Information</h3>
            <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
                <tr><td style="padding: 6px 4px; color: #666; width: 40%;"><strong>Allergies</strong></td><td style="padding: 6px 4px;">${data.allergies || 'None'}</td></tr>
                <tr style="background:#f0f0f0;"><td style="padding: 6px 4px; color: #666;"><strong>Medical Conditions</strong></td><td style="padding: 6px 4px;">${data.medicalConditions || 'None'}</td></tr>
                <tr><td style="padding: 6px 4px; color: #666;"><strong>Physical Activities OK?</strong></td><td style="padding: 6px 4px;">${data.physicalActivities}</td></tr>
            </table>

            <h3 style="border-bottom: 1px solid #ddd; padding-bottom: 10px; color: #2D1B4E; margin-top: 20px;">📣 Discovery & Intent</h3>
            <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
                <tr><td style="padding: 6px 4px; color: #666; width: 40%;"><strong>Heard About Us</strong></td><td style="padding: 6px 4px;">${data.heardAbout}${data.heardAboutOther ? ` — ${data.heardAboutOther}` : ''}</td></tr>
                <tr style="background:#f0f0f0;"><td style="padding: 6px 4px; color: #666;"><strong>Why Joining</strong></td><td style="padding: 6px 4px;">${data.whyJoin}${data.whyJoinOther ? ` — ${data.whyJoinOther}` : ''}</td></tr>
                <tr><td style="padding: 6px 4px; color: #666;"><strong>Future Camp Updates?</strong></td><td style="padding: 6px 4px;">${data.futureCamps || 'Not specified'}</td></tr>
            </table>

            <h3 style="border-bottom: 1px solid #ddd; padding-bottom: 10px; color: #2D1B4E; margin-top: 20px;">💳 Payment</h3>
            <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
                <tr><td style="padding: 6px 4px; color: #666; width: 40%;"><strong>Amount</strong></td><td style="padding: 6px 4px; font-weight: bold; color: #16a34a;">₹350 ✅</td></tr>
                <tr style="background:#f0f0f0;"><td style="padding: 6px 4px; color: #666;"><strong>Payment ID</strong></td><td style="padding: 6px 4px; font-family: monospace;">${data.paymentId}</td></tr>
                <tr><td style="padding: 6px 4px; color: #666;"><strong>Order ID</strong></td><td style="padding: 6px 4px; font-family: monospace;">${data.orderId}</td></tr>
                <tr style="background:#f0f0f0;"><td style="padding: 6px 4px; color: #666;"><strong>Registered At</strong></td><td style="padding: 6px 4px;">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td></tr>
            </table>
        </div>

        <p style="text-align: center;">
            <a href="mailto:${data.email}" class="btn">Email Participant</a>
        </p>
    `;
    return getBaseLayout(content);
};

const getLivelihoodChallengeUserTemplate = (data) => {
    const content = `
        <h2 style="color: #2D1B4E;">🌿 Registration Confirmed: Design the Next Livelihood</h2>
        <p>Dear <strong>${data.full_name}</strong>,</p>
        <p>Thank you for registering for the <strong>Design the Next Livelihood</strong> challenge.</p>

        <div style="background: linear-gradient(135deg, #fdf4fc, #f0faf0); padding: 24px; border-radius: 12px; margin: 24px 0; border: 1px solid #e8d4f0;">
            <h3 style="color: #8E2A8B; margin-top: 0; margin-bottom: 16px;">📋 Your Registration Details</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr><td style="padding: 8px 4px; color: #666; width: 40%;"><strong>Name</strong></td><td style="padding: 8px 4px; color: #333;">${data.full_name}</td></tr>
                <tr style="background: #fff8fe;"><td style="padding: 8px 4px; color: #666;"><strong>Organization / College</strong></td><td style="padding: 8px 4px; color: #333;">${data.organization}</td></tr>
                <tr><td style="padding: 8px 4px; color: #666;"><strong>Phone</strong></td><td style="padding: 8px 4px; color: #333;">${data.phone}</td></tr>
            </table>
        </div>

        <p style="color: #555;">We will be in touch shortly with more details about the challenge and the next steps.</p>

        <p>If you have any questions, reply to this email or write to us at <a href="mailto:info@kottravai.in" style="color: #8E2A8B;">info@kottravai.in</a>.</p>

        <p style="margin-top: 32px;">With warmth and anticipation,<br><strong>Team Kottravai</strong></p>

        <p style="text-align: center; margin-top: 24px;">
            <a href="https://kottravai.in" class="btn">Visit Kottravai</a>
        </p>
    `;
    return getBaseLayout(content);
};

module.exports = {
    getB2BAdminTemplate,
    getB2BUserTemplate,
    getContactAdminTemplate,
    getContactUserTemplate,
    getOrderAdminTemplate,
    getOrderUserTemplate,
    getAffiliateWelcomeTemplate,
    getCampusUserTemplate,
    getCampusAdminTemplate,
    getLivelihoodChallengeUserTemplate,
};
