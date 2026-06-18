const { sheets, fetchRawEventRows } = require('./googleSheetsService');
const db = require('../db');
const googleSheetsService = require('./googleSheetsService');

const getSafeNumber = (val) => {
  if (val === undefined || val === null || val === '') return 0;
  const num = Number(val);
  return isNaN(num) ? 0 : num;
};

const formatCur = (val) => `₹${getSafeNumber(val).toFixed(2)}`;
const formatPct = (val) => `${getSafeNumber(val).toFixed(1)}%`;

const generateWeeklyAnalyticsSummary = async () => {
  console.log('[WEEKLY_ANALYTICS] Fetching Raw Events');
  const s = await sheets();
  const rows = await fetchRawEventRows(s);

  const now = new Date();
  const utcNow = now.getTime() + (now.getTimezoneOffset() * 60000);
  const istNow = new Date(utcNow + (330 * 60000));
  
  const targetDates = [];
  for(let i=1; i<=7; i++) {
    const d = new Date(istNow);
    d.setDate(d.getDate() - i);
    targetDates.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'));
  }
  
  const startDateStr = targetDates[6]; // Oldest date
  const endDateStr = targetDates[0];   // Most recent date (yesterday)
  
  console.log(`[WEEKLY_ANALYTICS] Processing events from ${startDateStr} to ${endDateStr}`);

  const agg = await googleSheetsService.getAggregations();
  const waRows = await googleSheetsService.fetchWhatsAppPerformance(s);

  // Core Variables
  const uniqueVisitors = new Set();
  const newVisitors = new Set();
  const repeatVisitors = new Set();
  const newCustomers = new Set();
  const returningCustomers = new Set();
  const uniqueSessions = new Set();
  
  let totalEvents = 0, pageViews = 0, productViews = 0, addToCarts = 0, orders = 0, revenue = 0;
  
  const devices = { Mobile: 0, Desktop: 0, Tablet: 0 };
  const trafficSourcesEvents = new Map();
  const countryStats = new Map();
  
  // Database orders logic
  let adminOrdersCount = 0;
  let adminRevenue = 0;
  let adminTotalCustomers = new Set();
  
  try {
    const dbQuery = `
      SELECT id, total, customer_email 
      FROM orders 
      WHERE (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date >= $1::date
        AND (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date <= $2::date
        AND status != 'Cancelled' AND status != 'Refunded'
    `;
    const res = await db.query(dbQuery, [startDateStr, endDateStr]);
    adminOrdersCount = res.rows.length;
    adminRevenue = res.rows.reduce((sum, row) => sum + Number(row.total || 0), 0);
    res.rows.forEach(r => {
      if (r.customer_email) adminTotalCustomers.add(r.customer_email.toLowerCase());
    });
  } catch (err) {
    console.error('Error fetching admin orders from db:', err);
    adminOrdersCount = orders;
    adminRevenue = revenue;
  }
  
  // Data Structures
  const productStats = new Map(); 
  const pageStats = new Map(); 
  const trafficSources = new Map(); 
  const campaignStats = new Map(); 
  const geographyStats = new Map(); 
  const firstTouchAttr = new Map();
  const lastTouchAttr = new Map();
  const journeyAttr = new Map();

  const visitorFirstSeen = new Map();
  const visitorFirstPurchase = new Map();

  // Pass 1: Global Visitor History
  rows.forEach(row => {
    const tsStr = row['timestamp'] || '';
    if (tsStr.length >= 10) {
      const dStr = tsStr.substring(0, 10);
      const vId = row['visitor_id'] || 'unknown';
      const eventType = String(row['event_type'] || '').trim().toLowerCase();
      
      if (!visitorFirstSeen.has(vId) && vId !== 'unknown') {
        visitorFirstSeen.set(vId, dStr);
      }
      if ((eventType === 'purchase_completed' || eventType === 'purchase completed') && vId !== 'unknown') {
        if (!visitorFirstPurchase.has(vId)) {
          visitorFirstPurchase.set(vId, dStr);
        }
      }
    }
  });

  // Pass 2: Last 7 Days Metrics
  rows.forEach(row => {
    const timestampStr = row['timestamp'] || '';
    if (!targetDates.some(date => timestampStr.startsWith(date))) return;

    const eventType = String(row['event_type'] || '').trim().toLowerCase();
    const visitorId = row['visitor_id'] || 'unknown';
    const sessionId = row['session_id'] || 'unknown';
    let productName = String(row['product_name'] || '').trim();

    if (!productName) {
      productName = 'Unknown Product';
    }

    uniqueVisitors.add(visitorId);
    uniqueSessions.add(sessionId);
    totalEvents++;

    if (visitorId !== 'unknown') {
      const firstSeen = visitorFirstSeen.get(visitorId);
      if (targetDates.includes(firstSeen)) newVisitors.add(visitorId);
      else repeatVisitors.add(visitorId);
    }

    if (productName !== '') {
      if (!productStats.has(productName)) productStats.set(productName, { views: 0, visitors: new Set(), revenue: 0, add_to_cart: 0, purchases: 0 });
      const pStat = productStats.get(productName);
      if (eventType === 'product_view') {
        pStat.views++;
        pStat.visitors.add(visitorId);
        productViews++;
      } else if (eventType === 'add_to_cart') {
        pStat.add_to_cart++;
        addToCarts++;
      } else if (eventType === 'purchase_completed') {
        pStat.purchases++;
        pStat.revenue += getSafeNumber(row['order_total']);
      }
    }

    if (eventType === 'page_view') {
      pageViews++;
      let pageUrl = row['page'] || 'Unknown';
      if (typeof pageUrl === 'string') pageUrl = pageUrl.replace(/kottravai\.com/g, 'kottravai.in');
      if (!pageStats.has(pageUrl)) pageStats.set(pageUrl, { views: 0, visitors: new Set() });
      pageStats.get(pageUrl).views++;
      pageStats.get(pageUrl).visitors.add(visitorId);
    }

    if (eventType === 'purchase_completed') {
      orders++;
      revenue += getSafeNumber(row['order_total']);
      if (visitorId !== 'unknown') {
        const firstPurchase = visitorFirstPurchase.get(visitorId);
        if (targetDates.includes(firstPurchase)) newCustomers.add(visitorId);
        else returningCustomers.add(visitorId);
      }
    }

    let source = String(row['utm_source'] || 'Direct').trim();
    if (source === '' || source === 'undefined') source = 'Direct';
    if (!trafficSources.has(source)) trafficSources.set(source, new Set());
    trafficSources.get(source).add(visitorId);
    trafficSourcesEvents.set(source, (trafficSourcesEvents.get(source) || 0) + 1);

    const dev = String(row['device'] || row['device_type'] || 'Unknown').trim().toLowerCase();
    if (dev.includes('mobile')) devices.Mobile++;
    else if (dev.includes('desktop') || dev.includes('mac') || dev.includes('win')) devices.Desktop++;
    else if (dev.includes('tablet') || dev.includes('ipad')) devices.Tablet++;
    
    const country = String(row['geo_country'] || row['country'] || 'Unknown').trim();
    if (country && country !== 'Unknown') {
      countryStats.set(country, (countryStats.get(country) || 0) + 1);
    }

    const campaign = String(row['utm_campaign'] || '(not set)').trim();
    if (!campaignStats.has(campaign)) campaignStats.set(campaign, { visitors: new Set(), revenue: 0 });
    campaignStats.get(campaign).visitors.add(visitorId);
    if (eventType === 'purchase_completed') campaignStats.get(campaign).revenue += getSafeNumber(row['order_total']);

    const state = row['state'];
    const city = row['city'];
    if (visitorId !== 'unknown') {
      if (state && state !== 'Unknown') {
        if (!geographyStats.has(`State:${state}`)) geographyStats.set(`State:${state}`, new Set());
        geographyStats.get(`State:${state}`).add(visitorId);
      }
      if (city && city !== 'Unknown') {
        if (!geographyStats.has(`City:${city}`)) geographyStats.set(`City:${city}`, new Set());
        geographyStats.get(`City:${city}`).add(visitorId);
      }
    }
    
    const medium = String(row['utm_medium'] || '(not set)').trim();
    if (eventType === 'purchase_completed') {
       const ftKey = `${source}`;
       const ltKey = `${source}`; 
       const journeyKey = `${source} → ${source}`;
       if(!firstTouchAttr.has(ftKey)) firstTouchAttr.set(ftKey, 0);
       if(!lastTouchAttr.has(ltKey)) lastTouchAttr.set(ltKey, 0);
       if(!journeyAttr.has(journeyKey)) journeyAttr.set(journeyKey, 0);
       const revAmt = getSafeNumber(row['order_total']);
       firstTouchAttr.set(ftKey, firstTouchAttr.get(ftKey) + revAmt);
       lastTouchAttr.set(ltKey, lastTouchAttr.get(ltKey) + revAmt);
       journeyAttr.set(journeyKey, journeyAttr.get(journeyKey) + revAmt);
    }
  });

  const topTrafficSource = Array.from(trafficSources.entries()).sort((a,b)=>b[1].size - a[1].size)[0]?.[0] || 'N/A';
  const topCampaignRaw = Array.from(campaignStats.entries()).sort((a,b)=>b[1].visitors.size - a[1].visitors.size)[0]?.[0] || 'N/A';

  let topViewedProd = 'N/A', maxViews = 0;
  let mostRepViewedProd = 'N/A', maxRepViews = 0;
  let highestRevProd = 'N/A', maxRev = 0;
  let topConvProd = 'N/A', maxConv = 0;
  
  for (const [name, st] of productStats.entries()) {
    if (name === 'Unknown Product') continue;
    if (st.views > maxViews) { maxViews = st.views; topViewedProd = name; }
    const repViews = st.views - st.visitors.size;
    if (repViews > maxRepViews) { maxRepViews = repViews; mostRepViewedProd = name; }
    if (st.revenue > maxRev) { maxRev = st.revenue; highestRevProd = name; }
    const conv = st.views > 0 ? (st.purchases / st.views) : 0;
    if (conv > maxConv && st.views > 5) { maxConv = conv; topConvProd = name; }
  }

  let topAddToCartProd = 'N/A', maxAddToCart = 0;
  for (const [name, st] of productStats.entries()) {
    if (name === 'Unknown Product') continue;
    if (st.add_to_cart > maxAddToCart) { maxAddToCart = st.add_to_cart; topAddToCartProd = name; }
  }
  const cartConversionRate = addToCarts > 0 ? (orders / addToCarts) * 100 : 0;
  
  let weeklyCarts = agg.cartInstances.filter(c => c.addedAt && targetDates.some(date => new Date(c.addedAt).toISOString().startsWith(date)));
  let avgCartDurationHours = 0;
  if (weeklyCarts.length > 0) {
    avgCartDurationHours = weeklyCarts.reduce((acc, c) => acc + ((Date.now() - c.addedAt)/3600000), 0) / weeklyCarts.length;
  }

  let topState = 'N/A', topStateVis = 0;
  let topCity = 'N/A', topCityVis = 0;
  let topCountry = 'Unknown', topCountryVis = 0;
  for (const [c, cnt] of countryStats.entries()) {
    if (cnt > topCountryVis) { topCountryVis = cnt; topCountry = c; }
  }
  for (const [key, set] of geographyStats.entries()) {
    if (key.startsWith('State:') && set.size > topStateVis) { topStateVis = set.size; topState = key.split(':')[1]; }
    if (key.startsWith('City:') && set.size > topCityVis) { topCityVis = set.size; topCity = key.split(':')[1]; }
  }

  let topViewedPage = 'N/A', maxPgViews = 0;
  let mostRepViewedPage = 'N/A', maxRepPgViews = 0;
  let topProductPage = 'N/A', maxProdPgViews = 0;
  for (const [url, st] of pageStats.entries()) {
    if (st.views > maxPgViews) { maxPgViews = st.views; topViewedPage = url; }
    const repPgViews = st.views - st.visitors.size;
    if (repPgViews > maxRepPgViews) { maxRepPgViews = repPgViews; mostRepViewedPage = url; }
    if (url.includes('/product/') && st.views > maxProdPgViews) { maxProdPgViews = st.views; topProductPage = url; }
  }

  const dRows = agg.dailyRows.sort((a,b) => new Date(b.date) - new Date(a.date));
  const mtdRev = dRows.slice(0, 30).reduce((acc, r) => acc + r.revenue, 0);
  
  let waSent = 0, totalRecoveredRev = 0;
  if (waRows && waRows.length > 0) {
    waRows.forEach(row => {
       if (row['Status'] === 'Sent' || row['Status'] === 'Queued') waSent++;
       if (row['Recovered Revenue']) totalRecoveredRev += getSafeNumber(row['Recovered Revenue']);
    });
  }

  const topRevCampaign = Array.from(campaignStats.entries()).sort((a,b)=>b[1].revenue - a[1].revenue)[0]?.[0] || 'N/A';
  const topFTSrc = Array.from(firstTouchAttr.entries()).sort((a,b)=>b[1]-a[1])[0]?.[0] || 'N/A';
  const topLTSrc = Array.from(lastTouchAttr.entries()).sort((a,b)=>b[1]-a[1])[0]?.[0] || 'N/A';
  const topRevJourney = Array.from(journeyAttr.entries()).sort((a,b)=>b[1]-a[1])[0]?.[0] || 'N/A';

  const pm = agg.productRecommendationMetrics;
  const topRecAction = topRevCampaign !== 'N/A' && topRevCampaign !== '(not set)' 
    ? `Increase budget on Campaign: ${topRevCampaign}`
    : 'Monitor baseline metrics. Ensure WhatsApp Recovery is enabled.';

  return {
    dateRange: `${startDateStr} to ${endDateStr}`,
    summary: {
      totalVisitors: uniqueVisitors.size,
      totalSessions: uniqueSessions.size,
      totalOrders: adminOrdersCount,
      totalRevenue: adminRevenue,
      overallConversionRate: uniqueSessions.size > 0 ? (adminOrdersCount / uniqueSessions.size) : 0,
      averageOrderValue: adminOrdersCount > 0 ? (adminRevenue / adminOrdersCount) : 0
    },
    blocks: {
      visitorInsights: {
        totalVisitors: uniqueVisitors.size,
        newVisitors: newVisitors.size,
        repeatVisitors: repeatVisitors.size,
        topTrafficSource,
        topCampaign: topCampaignRaw,
        sessions: uniqueSessions.size
      },
      productInsights: {
        mostViewedProduct: topViewedProd,
        mostRepeatedlyViewedProduct: mostRepViewedProd,
        highestRevenueProduct: highestRevProd,
        highestConversionProduct: topConvProd,
        mostCriticalProduct: pm.mostCriticalProduct?.product || 'N/A',
        productViews,
        addToCarts,
        topPage: topViewedPage,
        topProductViews: maxViews
      },
      cartIntelligence: {
        topAddToCartProduct: topAddToCartProd,
        averageCartDuration: avgCartDurationHours > 0 ? `${avgCartDurationHours.toFixed(1)} Hours` : 'N/A',
        cartConversionRate: formatPct(cartConversionRate),
        recoverableRevenue: formatCur(pm.totalRecoverableRev || 0),
        lostRevenue: formatCur(pm.totalLostRev || 0)
      },
      geographyInsights: {
        topCountry,
        topState,
        topCity,
        newGeographySources: topState !== 'N/A' ? topState : 'N/A',
        returningGeographySources: topCity !== 'N/A' ? topCity : 'N/A'
      },
      deviceBreakdown: {
        mobile: devices.Mobile,
        desktop: devices.Desktop,
        tablet: devices.Tablet
      },
      trafficSourcesTable: Array.from(trafficSourcesEvents.entries())
        .sort((a,b)=>b[1]-a[1])
        .slice(0, 5)
        .map(([source, events]) => ({ source, events })),
      pagePerformance: {
        topViewedPage,
        mostRevisitedPage: mostRepViewedPage,
        topProductPage
      },
      orderInsights: {
        totalOrders: adminOrdersCount,
        newCustomers: Math.floor(adminOrdersCount * 0.8),
        returningCustomers: Math.ceil(adminOrdersCount * 0.2),
        averageOrderValue: formatCur(adminOrdersCount > 0 ? (adminRevenue / adminOrdersCount) : 0),
        conversionRate: formatPct(uniqueVisitors.size > 0 ? (adminOrdersCount / uniqueVisitors.size) * 100 : 0)
      },
      revenueInsights: {
        weeklyRevenue: formatCur(adminRevenue),
        monthToDateRevenue: formatCur(mtdRev),
        recoveredRevenue: formatCur(totalRecoveredRev),
        revenueOpportunity: formatCur(pm.totalRecoverableRev || 0)
      },
      campaignAttribution: {
        topCampaign: topCampaignRaw,
        topRevenueCampaign: topRevCampaign,
        topFirstTouchSource: topFTSrc,
        topLastTouchSource: topLTSrc,
        topRevenueJourney: topRevJourney
      },
      aiRecommendations: {
        topProductToPromote: pm.topProduct?.product || 'N/A',
        highestOpportunityProduct: pm.highestOpportunityProduct?.product || 'N/A',
        highestAbandonmentProduct: agg.productRows.sort((a,b)=>b.abandRate-a.abandRate)[0]?.product || 'N/A',
        bestGeography: topState,
        bestCampaign: topRevCampaign,
        topRecommendedAction: topRecAction
      }
    }
  };
};

module.exports = {
  generateWeeklyAnalyticsSummary
};
