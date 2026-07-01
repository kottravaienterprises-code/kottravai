const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const googleSheetsService = require('../services/googleSheetsService');
const { google } = require('googleapis');
const { validateAndRepairKey } = require('../utils/googleKeyValidator');
const mailer = require('../utils/mailer');

async function sendYesterdayData() {
    try {
        console.log('Authenticating with Google Sheets...');
        let key = validateAndRepairKey(process.env.GOOGLE_PRIVATE_KEY || '');
        let clientEmail = process.env.GOOGLE_CLIENT_EMAIL.replace(/"/g, '');
        const auth = new google.auth.GoogleAuth({ 
            credentials: { client_email: clientEmail, private_key: key }, 
            scopes: ['https://www.googleapis.com/auth/spreadsheets'] 
        });
        const sheets = google.sheets({ version: 'v4', auth });
        
        console.log('Fetching raw events...');
        const rows = await googleSheetsService.fetchRawEventRows(sheets);
        console.log(`Fetched ${rows.length} rows.`);

        console.log('Aggregating data...');
        const aggregation = googleSheetsService.buildAggregations(rows);
        
        // Find yesterday's data
        // daily7DayTrend is an array where index 6 is yesterday, index 5 is the day before, etc.
        const yesterdayData = aggregation.daily7DayTrend[6];
        if (!yesterdayData) {
            throw new Error("Could not find yesterday's data in the 7-day trend array.");
        }

        console.log("Yesterday's Data:", yesterdayData);

        // Build HTML email with QuickChart graph
        const chartData = aggregation.daily7DayTrend.map(d => d.visitors);
        const chartLabels = aggregation.daily7DayTrend.map(d => {
            const dateParts = d.date.split('-');
            return `${dateParts[1]}/${dateParts[2]}`;
        });

        // QuickChart URL for visitors trend - Premium Dark Theme Smooth Line Chart
        const chartConfig = {
            type: 'line',
            data: {
                labels: chartLabels,
                datasets: [{
                    label: 'Visitors',
                    data: chartData,
                    fill: false,
                    borderColor: '#6366f1',
                    borderWidth: 3,
                    pointBackgroundColor: '#6366f1',
                    pointBorderColor: '#ffffff',
                    pointRadius: 4,
                    tension: 0.4 // Smooth curves
                }]
            },
            options: {
                title: {
                    display: true,
                    text: 'Daily Sessions Trend (Last 7 Days)',
                    fontColor: '#ffffff',
                    fontSize: 16,
                    padding: 20
                },
                legend: { display: false },
                scales: {
                    yAxes: [{
                        ticks: { fontColor: '#9ca3af', beginAtZero: true },
                        gridLines: { color: '#374151', zeroLineColor: '#9ca3af' }
                    }],
                    xAxes: [{
                        ticks: { fontColor: '#9ca3af' },
                        gridLines: { color: '#374151', zeroLineColor: '#9ca3af' }
                    }]
                }
            }
        };

        const chartUrl = `https://quickchart.io/chart?w=600&h=300&bkg=1f2937&c=${encodeURIComponent(JSON.stringify(chartConfig))}`;

        const html = `
            <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 30px; color: #333; background-color: #f9fafb;">
                <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                    <div style="background-color: #5C3B1E; padding: 20px; text-align: center; color: #ffffff;">
                        <h2 style="margin: 0; font-size: 20px;">📊 Daily Analytics Report</h2>
                        <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.8;">${yesterdayData.date}</p>
                    </div>
                    
                    <div style="padding: 30px;">
                        <h3 style="margin-top: 0; color: #5C3B1E; border-bottom: 2px solid #f3f4f6; padding-bottom: 10px;">Traffic Trend</h3>
                        
                        <div style="margin-bottom: 30px; background-color: #1f2937; border-radius: 8px; padding: 10px;">
                            <img src="${chartUrl}" alt="7-Day Visitors Trend" style="width: 100%; height: auto; display: block; border-radius: 4px;" />
                        </div>

                        <h3 style="color: #5C3B1E; border-bottom: 2px solid #f3f4f6; padding-bottom: 10px;">Key Metrics</h3>
                        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                            <tr>
                                <td style="padding: 15px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 4px; text-align: center; width: 50%;">
                                    <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: bold;">Visitors</div>
                                    <div style="font-size: 24px; color: #111827; font-weight: bold; margin-top: 5px;">${yesterdayData.visitors}</div>
                                </td>
                                <td style="padding: 15px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 4px; text-align: center; width: 50%;">
                                    <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: bold;">Revenue</div>
                                    <div style="font-size: 24px; color: #059669; font-weight: bold; margin-top: 5px;">₹${yesterdayData.revenue.toLocaleString()}</div>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 15px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 4px; text-align: center; width: 50%;">
                                    <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: bold;">Orders</div>
                                    <div style="font-size: 24px; color: #111827; font-weight: bold; margin-top: 5px;">${yesterdayData.orders}</div>
                                </td>
                                <td style="padding: 15px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 4px; text-align: center; width: 50%;">
                                    <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: bold;">Conversion</div>
                                    <div style="font-size: 24px; color: #111827; font-weight: bold; margin-top: 5px;">${(yesterdayData.purchaseConversionRate * 100).toFixed(2)}%</div>
                                </td>
                            </tr>
                        </table>
                    </div>
                    
                    <div style="background-color: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb;">
                        Automated Daily Reporting System • Kottravai Analytics<br/>
                        This email was generated from your Raw Events Google Sheet data.
                    </div>
                </div>
            </div>
        `;

        console.log('Sending email...');
        const result = await mailer.sendEmail({
            to: 'santhoshsaram001@gmail.com',
            subject: `Performance Report for ${yesterdayData.date}`,
            html: html,
            type: 'contact'
        });

        console.log("Email Result:", result);
        process.exit(0);

    } catch (err) {
        console.error("Failed:", err);
        process.exit(1);
    }
}

sendYesterdayData();
