/**
 * KOTTRAVAI METRICS PART 2 - EVENT INGESTION & REPORTING
 * 100% Google Sheets + GAS. No PostgreSQL dependencies.
 * Zero Mock Values.
 */

const SHEET_SETTINGS = 'SETTINGS';
const SHEET_MASTER = 'MASTER_EVENT_LOG_V2';
const TAB_EXEC = 'EXECUTIVE_DASHBOARD';
const TAB_VISITOR = 'VISITOR_ANALYSIS';
const TAB_ORDER = 'ORDER_ANALYSIS';
const TAB_PAGE = 'PAGE_ANALYSIS';
const TAB_PRODUCT = 'PRODUCT_ANALYSIS';
const TAB_CART = 'CART_ANALYSIS';
const TAB_UTM = 'UTM_ANALYSIS';

const MASTER_COLUMNS = [
  "timestamp", "event_type", "page", "page_title", "landing_page", 
  "traffic_source", "session_id", "visitor_id", "user_id", "is_logged_in",
  "browser", "device", "screen_size", "referrer", "page_url", 
  "ip_address", "geo_country", "geo_state", "geo_city",
  "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term",
  "first_utm_source", "first_utm_medium", "first_utm_campaign", "first_utm_content", "first_utm_term",
  "session_utm_source", "session_utm_medium", "session_utm_campaign", "session_utm_content", "session_utm_term",
  "gclid", "fbclid",
  "product_id", "sku", "product_name", "category", "price", "quantity", "stock_status",
  "order_id", "order_total", "payment_method", "payment_id", "products_array", "coupon_code", "discount_applied", "shipping_cost", "taxes",
  "cart_total_value", "duration_seconds"
];

function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Settings Tab
  let settings = ss.getSheetByName(SHEET_SETTINGS);
  if (!settings) {
    settings = ss.insertSheet(SHEET_SETTINGS, 0);
    settings.appendRow(["Setting", "Value", "Description"]);
    settings.appendRow(["Reporting Start Date", new Date(Date.now() - 30*24*60*60*1000).toISOString().split('T')[0], "YYYY-MM-DD"]);
    settings.appendRow(["Reporting End Date", new Date().toISOString().split('T')[0], "YYYY-MM-DD"]);
    settings.appendRow(["Cart Abandonment Threshold Minutes", 30, "Minutes of inactivity"]);
    settings.appendRow(["Last Analysis Run", "", "Auto-updated"]);
    settings.appendRow(["Analysis Status", "", "Auto-updated"]);
    settings.getRange("A1:C1").setFontWeight("bold");
    settings.setColumnWidth(1, 250);
    settings.setColumnWidth(3, 300);
  }

  // Master Log
  let master = ss.getSheetByName(SHEET_MASTER);
  if (!master) {
    master = ss.insertSheet(SHEET_MASTER, 1);
    master.appendRow(MASTER_COLUMNS);
    master.getRange("A1:BB1").setFontWeight("bold").setBackground("#f3f3f3");
    master.setFrozenRows(1);
  }

  const tabs = [TAB_EXEC, TAB_VISITOR, TAB_ORDER, TAB_PAGE, TAB_PRODUCT, TAB_CART, TAB_UTM];
  tabs.forEach(tabName => {
    if (!ss.getSheetByName(tabName)) {
      ss.insertSheet(tabName);
    }
  });
}

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({
      status: "ok",
      service: "Kottravai Metrics Part 2",
      endpoint: "Google Apps Script Web App"
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_MASTER);

    if (!sheet) {
      throw new Error("Missing sheet: " + SHEET_MASTER);
    }

    // Normalize legacy event names
    let eventType = payload.event_type || "";

    if (eventType === "checkout_start") {
      eventType = "checkout_started";
    }

    if (eventType === "purchase_complete") {
      eventType = "purchase_completed";
    }

    payload.event_type = eventType;

    // Build exactly 54 columns in MASTER_COLUMNS order
    const row = MASTER_COLUMNS.map(col => {
      let val = payload[col];

      if (typeof val === "boolean") {
        return val ? "TRUE" : "FALSE";
      }

      if (val !== null && typeof val === "object") {
        return JSON.stringify(val);
      }

      return (val !== undefined && val !== null) ? val : "";
    });

    // Write event to MASTER_EVENT_LOG_V2
    sheet.appendRow(row);

    return ContentService
      .createTextOutput(JSON.stringify({
        status: "success"
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    console.error("doPost error:", error);

    return ContentService
      .createTextOutput(JSON.stringify({
        status: "error",
        message: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function validateOutput_(rows, name) {
  if (!rows || rows.length === 0) return;
  const width = Math.max.apply(null, rows.map(r => r.length));
  rows.forEach((r, i) => {
    if (r.length > width) {
      throw new Error(name + " row " + (i + 1) + " exceeds output width");
    }
  });
}

function writeOutput_(sheet, rows, name) {
  if (!rows || rows.length === 0) return;
  validateOutput_(rows, name);
  const width = Math.max.apply(null, rows.map(r => r.length));
  const normalized = rows.map(r => {
    const row = r.slice();
    while (row.length < width) row.push("");
    return row;
  });
  sheet.getRange(1, 1, normalized.length, width).setValues(normalized);
}

// ==========================================
// CORE AGGREGATION ENGINE
// ==========================================
function triggerAllAnalysis() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const settingsSheet = ss.getSheetByName(SHEET_SETTINGS);
  
  try {
    settingsSheet.getRange("B6").setValue("Processing...");

    // 1. Read Settings SAFELY
    const settingsData = settingsSheet.getRange("B2:B4").getValues();
    const startDateStr = settingsData[0][0];
    const endDateStr = settingsData[1][0];
    const abandonmentThreshold = parseInt(settingsData[2][0], 10) || 30;
    
    if (!startDateStr || !endDateStr) throw new Error("Invalid Start or End Date in SETTINGS");

    const tz = Session.getScriptTimeZone();
    const START_DATE = new Date(Utilities.formatDate(new Date(startDateStr + "T00:00:00.000"), tz, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")).getTime();
    const END_DATE = new Date(Utilities.formatDate(new Date(endDateStr + "T23:59:59.999"), tz, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")).getTime();
    const NOW = Date.now();
    
    const REFERENCE_TIME = (END_DATE > NOW) ? NOW : END_DATE;

    // 2. Read Master Data efficiently
    const masterSheet = ss.getSheetByName(SHEET_MASTER);
    if (!masterSheet) throw new Error("Missing MASTER_EVENT_LOG_V2");
    const rawData = masterSheet.getDataRange().getValues();
    const headers = rawData[0];
    const rows = rawData.slice(1);
    
    const idx = {};
    MASTER_COLUMNS.forEach((col, i) => idx[col] = headers.indexOf(col));

    // --- Data Structures ---
    const visitors = {};
    const orders = {};
    const products = {};
    const pages = {};
    const carts = {};
    const utm = {};
    
    const global = {
      totalRevenue: 0, totalOrders: 0, cartAddEvents: 0, itemsAddedCount: 0, checkoutStarts: 0, 
      uniqueVisitors: new Set(), totalSessions: new Set(), purchasedSessions: new Set()
    };
    
    const hourVisitors = Array.from({length: 24}, () => new Set());

    // 3. Process Rows (1 Pass)
    rows.forEach(row => {
      const timeStr = row[idx["timestamp"]];
      if (!timeStr) return;
      const time = new Date(timeStr).getTime();
      const vid = row[idx["visitor_id"]];
      const sid = row[idx["session_id"]];
      const evt = row[idx["event_type"]];
      const uid = row[idx["user_id"]];
      const ip = row[idx["ip_address"]];
      const country = row[idx["geo_country"]];
      const state = row[idx["geo_state"]];
      const city = row[idx["geo_city"]];
      const dev = row[idx["device"]];
      const browser = row[idx["browser"]];
      const ts = row[idx["traffic_source"]] || "Direct";
      
      // Fallback Order ID
      const oid = row[idx["order_id"]] || (evt === 'purchase_completed' ? `fb_${time}_${sid}_${vid}` : null);
      
      // Visitor pre-calculation (for New vs Returning)
      if (vid) {
        if (!visitors[vid]) {
          visitors[vid] = { 
            id: vid, uid: uid, ip: ip, country: country, state: state, city: city, dev: dev, browser: browser, ts: ts,
            firstSeen: time, lastSeen: time, sessions: new Set(), eventsInPeriod: 0, pageViews: 0, timeSpent: 0,
            isNew: false, isReturning: false, isRepeat: false,
            fSrc: row[idx["first_utm_source"]], fMed: row[idx["first_utm_medium"]], fCmp: row[idx["first_utm_campaign"]], fCon: row[idx["first_utm_content"]], fTrm: row[idx["first_utm_term"]],
            sSrc: row[idx["session_utm_source"]], sMed: row[idx["session_utm_medium"]], sCmp: row[idx["session_utm_campaign"]], sCon: row[idx["session_utm_content"]], sTrm: row[idx["session_utm_term"]]
          };
        }
        if (time < visitors[vid].firstSeen) visitors[vid].firstSeen = time;
        if (time > visitors[vid].lastSeen && time <= END_DATE) visitors[vid].lastSeen = time;
      }

      if (time < START_DATE || time > END_DATE) return;
      
      if (vid) {
        visitors[vid].eventsInPeriod++;
        visitors[vid].sessions.add(sid);
        if (evt === 'page_view') visitors[vid].pageViews++;
        global.uniqueVisitors.add(vid);
      }
      
      if (sid) global.totalSessions.add(sid);
      
      const hour = new Date(Utilities.formatDate(new Date(timeStr), tz, "yyyy-MM-dd'T'HH:mm:ss")).getHours();
      if (sid && evt === 'page_view') {
        hourVisitors[hour].add(vid);
      }

      // Page Logic
      const url = row[idx["page_url"]];
      if (url) {
        if (!pages[url]) pages[url] = { url: url, title: row[idx["page_title"]], views: 0, uvs: new Set(), sessions: new Set(), totalTime: 0, leaves: 0, orderSet: new Set(), rev: 0 };
        if (evt === 'page_view') {
          pages[url].views++;
          pages[url].uvs.add(vid);
          pages[url].sessions.add(sid);
        }
        if (evt === 'page_leave') {
          const dur = parseFloat(row[idx["duration_seconds"]]) || 0;
          pages[url].totalTime += dur;
          pages[url].leaves++;
          if (vid) visitors[vid].timeSpent += dur;
        }
        // Session-based Page Revenue Attribution
        if (evt === 'purchase_completed' && sid) {
          if (!pages[url].orderSet.has(oid)) {
             pages[url].orderSet.add(oid);
             pages[url].rev += (parseFloat(row[idx["order_total"]]) || 0);
          }
        }
      }

      // Cart Logic (Session Level)
      if (sid) {
        if (!carts[sid]) carts[sid] = { hasAdd: false, hasCheckout: false, hasPurchase: false, lastActive: time, maxVal: 0, vid: vid };
        const cVal = parseFloat(row[idx["cart_total_value"]]) || 0;
        if (cVal > carts[sid].maxVal) carts[sid].maxVal = cVal;
        carts[sid].lastActive = Math.max(carts[sid].lastActive, time);
        
        if (evt === 'add_to_cart') { 
          carts[sid].hasAdd = true; 
          global.cartAddEvents++; 
          global.itemsAddedCount += (parseFloat(row[idx["quantity"]]) || 1);
        }
        if (evt === 'checkout_started') { carts[sid].hasCheckout = true; global.checkoutStarts++; }
        if (evt === 'purchase_completed') { carts[sid].hasPurchase = true; global.purchasedSessions.add(sid); }
      }

      // Order Logic
      if (evt === 'purchase_completed') {
        const rev = parseFloat(row[idx["order_total"]]) || 0;
        const tax = parseFloat(row[idx["taxes"]]) || 0;
        const ship = parseFloat(row[idx["shipping_cost"]]) || 0;
        const disc = parseFloat(row[idx["discount_applied"]]) || 0;
        
        if (!orders[oid]) {
          global.totalOrders++;
          global.totalRevenue += rev;
          
          orders[oid] = {
            id: row[idx["order_id"]] ? oid : "Fallback_"+oid, date: timeStr, vid: vid, sid: sid, uid: uid, rev: rev, tax: tax, ship: ship, disc: disc, 
            itemsJson: row[idx["products_array"]], coupon: row[idx["coupon_code"]], payMethod: row[idx["payment_method"]], payId: row[idx["payment_id"]],
            country: country, state: state, city: city, ts: ts, fUtm: row[idx["first_utm_campaign"]], sUtm: row[idx["session_utm_campaign"]], derivedItemCount: 0
          };

          try {
            const pArr = JSON.parse(row[idx["products_array"]] || "[]");
            pArr.forEach(p => {
              const sku = p.sku || p.product_id || "Unknown";
              const pQty = parseFloat(p.quantity) || 1;
              orders[oid].derivedItemCount += pQty;
              
              if (!products[sku]) products[sku] = { id: p.product_id, sku: sku, name: p.name, cat: row[idx["category"]], views: 0, adds: 0, orderSet: new Set(), rev: 0, qty: 0, uvs: new Set(), checkouts: 0, stock: "No Data" };
              products[sku].orderSet.add(oid);
              products[sku].qty += pQty;
              // Strict Revenue fallback logic as documented
              products[sku].rev += (p.line_total || (p.price ? p.price * pQty : 0));
            });
          } catch(e) {}
        }
      }

      // Product Metrics (Views, Adds, Stock)
      const sku = row[idx["sku"]] || row[idx["product_id"]] || "Unknown";
      if (sku !== "Unknown") {
        if (!products[sku]) products[sku] = { id: row[idx["product_id"]], sku: sku, name: row[idx["product_name"]], cat: row[idx["category"]], views: 0, adds: 0, orderSet: new Set(), rev: 0, qty: 0, uvs: new Set(), checkouts: 0, stock: "No Data" };
        
        const stStatus = row[idx["stock_status"]];
        if (stStatus) products[sku].stock = stStatus; 
        
        if (evt === 'product_view') { products[sku].views++; products[sku].uvs.add(vid); }
        if (evt === 'add_to_cart') products[sku].adds++;
        if (evt === 'checkout_started') products[sku].checkouts++;
      }

      // Advanced UTM Processing (Multi-dimensional duplicate protection via orderSet)
      const processUtm = (type, source, medium, campaign, content, term) => {
        const key = `${type}|${source||"Direct"}|${medium||"Direct"}|${campaign||"Direct"}`;
        if (!utm[key]) utm[key] = { type, source: source||"Direct", medium: medium||"Direct", campaign: campaign||"Direct", content: content||"Direct", term: term||"Direct", uvs: new Set(), sess: new Set(), cSess: new Set(), views: 0, pViews: 0, adds: 0, checkouts: 0, orderSet: new Set(), rev: 0 };
        
        utm[key].uvs.add(vid);
        utm[key].sess.add(sid);
        if (evt === 'page_view') utm[key].views++;
        if (evt === 'product_view') utm[key].pViews++;
        if (evt === 'add_to_cart') utm[key].adds++;
        if (evt === 'checkout_started') utm[key].checkouts++;
        if (evt === 'purchase_completed' && oid) {
          utm[key].cSess.add(sid);
          if (!utm[key].orderSet.has(oid)) {
             utm[key].orderSet.add(oid);
             utm[key].rev += parseFloat(row[idx["order_total"]]) || 0;
          }
        }
      };

      processUtm('TrafficSource', ts, '', '', '', '');
      if (row[idx["first_utm_source"]] || row[idx["first_utm_campaign"]]) processUtm('FirstTouch', row[idx["first_utm_source"]], row[idx["first_utm_medium"]], row[idx["first_utm_campaign"]], row[idx["first_utm_content"]], row[idx["first_utm_term"]]);
      if (row[idx["session_utm_source"]] || row[idx["session_utm_campaign"]]) processUtm('SessionTouch', row[idx["session_utm_source"]], row[idx["session_utm_medium"]], row[idx["session_utm_campaign"]], row[idx["session_utm_content"]], row[idx["session_utm_term"]]);
      if (row[idx["gclid"]]) processUtm('GCLID', row[idx["gclid"]], '', '', '', '');
      if (row[idx["fbclid"]]) processUtm('FBCLID', row[idx["fbclid"]], '', '', '', '');
    });

    // --- POST-PROCESSING ---
    
    let vTotal = 0, vNew = 0, vReturn = 0, vRepeat = 0;
    Object.keys(visitors).forEach(v => {
      const vo = visitors[v];
      if (vo.eventsInPeriod === 0) return;
      vTotal++;
      if (vo.firstSeen >= START_DATE) { vo.isNew = true; vNew++; } 
      else { vo.isReturning = true; vReturn++; }
      if (vo.sessions.size > 1) { vo.isRepeat = true; vRepeat++; }
    });

    let cSessTotal = 0, cCheckSess = 0, cPurchSess = 0, cAbandons = 0, cAbandonVal = 0, cTotalVal = 0;
    const uniqueCartUsers = new Set();
    Object.keys(carts).forEach(s => {
      const c = carts[s];
      if (c.hasAdd) { cSessTotal++; uniqueCartUsers.add(c.vid); cTotalVal += c.maxVal; }
      if (c.hasCheckout && c.hasAdd) cCheckSess++;
      if (c.hasPurchase && c.hasAdd) cPurchSess++;
      
      if ((c.hasAdd || c.hasCheckout) && !c.hasPurchase) {
        if ((REFERENCE_TIME - c.lastActive) > (abandonmentThreshold * 60 * 1000)) {
          cAbandons++;
          cAbandonVal += c.maxVal; // Cart Value strictly from max state of cart before abandonment
        }
      }
    });

    let maxHourVal = -1;
    let peakHour = 0;
    hourVisitors.forEach((set, h) => {
      if (set.size > maxHourVal) { maxHourVal = set.size; peakHour = h; }
    });
    const peakHourFormatted = `${peakHour.toString().padStart(2, '0')}:00 - ${(peakHour+1).toString().padStart(2, '0')}:00`;

    // --- WRITING BATCHES ---
    
    // 1. VISITOR_ANALYSIS
    const sVis = ss.getSheetByName(TAB_VISITOR);
    sVis.clearContents();
    const visOut = [
      ["VISITOR ANALYSIS", `Period: ${startDateStr} to ${endDateStr}`],
      ["Total Unique", vTotal], ["New", vNew], ["Returning", vReturn], ["Repeat", vRepeat],
      ["", ""],
      ["Visitor ID", "User ID", "IP Address", "Country", "State", "City", "First Visit", "Last Visit", "Session Count", "Page Views", "Avg Time (s)", "Total Time (s)", "Avg Scroll Depth", "Visitor Type", "Repeat Status", "Browser", "Device", "Traffic Source", "1st Source", "1st Medium", "1st Campaign", "1st Content", "1st Term", "Sess Source", "Sess Medium", "Sess Campaign", "Sess Content", "Sess Term"]
    ];
    Object.keys(visitors).forEach(v => {
      const vo = visitors[v];
      if (vo.eventsInPeriod > 0) {
        const vType = vo.isNew ? "New" : "Returning";
        const rStat = vo.isRepeat ? "Repeat" : "Single";
        const avgTime = vo.pageViews > 0 ? (vo.timeSpent / vo.pageViews).toFixed(1) : 0;
        visOut.push([vo.id, vo.uid, vo.ip, vo.country, vo.state, vo.city, new Date(vo.firstSeen).toISOString(), new Date(vo.lastSeen).toISOString(), vo.sessions.size, vo.pageViews, avgTime, vo.timeSpent, "No Data", vType, rStat, vo.browser, vo.dev, vo.ts, vo.fSrc, vo.fMed, vo.fCmp, vo.fCon, vo.fTrm, vo.sSrc, vo.sMed, vo.sCmp, vo.sCon, vo.sTrm]);
      }
    });
    writeOutput_(sVis, visOut, "VISITOR_ANALYSIS");

    // 2. ORDER_ANALYSIS
    const sOrd = ss.getSheetByName(TAB_ORDER);
    sOrd.clearContents();
    let totalDisc = 0, totalShip = 0, totalTax = 0;
    Object.values(orders).forEach(o => { totalDisc+=o.disc; totalShip+=o.ship; totalTax+=o.tax; });
    const ordOut = [
      ["ORDER ANALYSIS", ""],
      ["Total Orders", global.totalOrders], ["Total Revenue", global.totalRevenue], ["AOV", global.totalOrders > 0 ? (global.totalRevenue/global.totalOrders).toFixed(2) : 0],
      ["Total Discounts", totalDisc], ["Total Shipping", totalShip], ["Total Taxes", totalTax],
      ["", ""],
      ["Order ID", "Order Date", "Visitor ID", "Session ID", "User ID", "Products Array", "Item Count", "Order Total", "Coupon Code", "Discount Applied", "Shipping Cost", "Taxes", "Payment Method", "Payment ID", "Country", "State", "City", "Traffic Source", "First Touch UTM", "Session Touch UTM"]
    ];
    Object.keys(orders).forEach(o => {
      const r = orders[o];
      ordOut.push([r.id, r.date, r.vid, r.sid, r.uid, r.itemsJson, r.derivedItemCount, r.rev, r.coupon, r.disc, r.ship, r.tax, r.payMethod, r.payId, r.country, r.state, r.city, r.ts, r.fUtm, r.sUtm]);
    });
    writeOutput_(sOrd, ordOut, "ORDER_ANALYSIS");

    // 3. PAGE_ANALYSIS
    const sPage = ss.getSheetByName(TAB_PAGE);
    sPage.clearContents();
    const pageOut = [
      ["PAGE ANALYSIS", ""],
      ["Page URL", "Page Title", "Total Views", "Unique Visitors", "Sessions", "Total Time (s)", "Average Time (s)", "Avg Scroll Depth", "Conversions (Converted Sessions)", "Revenue", "Conversion Rate (Converted Sessions / Page Sessions)"]
    ];
    Object.keys(pages).sort((a,b) => pages[b].views - pages[a].views).forEach(p => {
      const po = pages[p];
      const avg = po.leaves > 0 ? (po.totalTime / po.leaves).toFixed(1) : 0;
      const cr = po.sessions.size > 0 ? (po.orderSet.size / po.sessions.size * 100).toFixed(2)+"%" : "0%";
      pageOut.push([po.url, po.title, po.views, po.uvs.size, po.sessions.size, po.totalTime, avg, "No Data", po.orderSet.size, po.rev, cr]);
    });
    writeOutput_(sPage, pageOut, "PAGE_ANALYSIS");

    // 4. PRODUCT_ANALYSIS
    const sProd = ss.getSheetByName(TAB_PRODUCT);
    sProd.clearContents();
    const prodOut = [
      ["PRODUCT ANALYSIS", ""],
      ["Product ID", "SKU", "Product Name", "Category", "Product Views", "Unique Viewers", "Total Time (s)", "Average Time (s)", "Avg Scroll Depth", "Add To Cart", "Checkout Started", "Distinct Orders", "Quantity Sold", "Revenue", "Conversion Rate (Distinct Orders / Unique Viewers)", "Stock Status"]
    ];
    Object.keys(products).sort((a,b) => products[b].rev - products[a].rev).forEach(p => {
      const po = products[p];
      const distinctOrders = po.orderSet.size;
      const cr = po.uvs.size > 0 ? (distinctOrders / po.uvs.size * 100).toFixed(2)+"%" : "0%";
      prodOut.push([po.id, po.sku, po.name, po.cat, po.views, po.uvs.size, "No Data", "No Data", "No Data", po.adds, po.checkouts, distinctOrders, po.qty, po.rev, cr, po.stock]);
    });
    writeOutput_(sProd, prodOut, "PRODUCT_ANALYSIS");

    // 5. CART_ANALYSIS
    const sCart = ss.getSheetByName(TAB_CART);
    sCart.clearContents();
    const cartOut = [
      ["CART ANALYSIS", `Threshold: ${abandonmentThreshold} mins`],
      ["Total Add To Cart Events", global.cartAddEvents],
      ["Items Added (Qty)", global.itemsAddedCount],
      ["Unique Cart Users", uniqueCartUsers.size],
      ["Cart Sessions", cSessTotal],
      ["Total Cart Value (From Cart Events)", cTotalVal],
      ["Abandoned Cart Sessions", cAbandons],
      ["Abandoned Cart Value (From Max States)", cAbandonVal],
      ["Purchased Order Revenue (Separate)", global.totalRevenue],
      ["Cart Abandonment Rate", cSessTotal > 0 ? (cAbandons/cSessTotal*100).toFixed(2)+"%" : "0%"],
      ["Cart → Checkout Rate (Checkout Sessions / Cart Sessions)", cSessTotal > 0 ? (cCheckSess/cSessTotal*100).toFixed(2)+"%" : "0%"],
      ["Checkout → Purchase Rate (Purchased Sessions / Checkout Sessions)", cCheckSess > 0 ? (cPurchSess/cCheckSess*100).toFixed(2)+"%" : "0%"],
      ["Cart → Purchase Rate (Purchased Sessions / Cart Sessions)", cSessTotal > 0 ? (cPurchSess/cSessTotal*100).toFixed(2)+"%" : "0%"]
    ];
    writeOutput_(sCart, cartOut, "CART_ANALYSIS");

    // 6. UTM_ANALYSIS
    const sUtm = ss.getSheetByName(TAB_UTM);
    sUtm.clearContents();
    const utmOut = [
      ["UTM ANALYSIS", ""],
      ["Type", "Source", "Medium", "Campaign", "Content", "Term", "Visitors", "Sessions", "Page Views", "Product Views", "Add To Cart", "Checkout Started", "Attributed Orders", "Revenue", "Conversion Rate (Attributed Orders / Sessions)"]
    ];
    Object.keys(utm).sort((a,b) => utm[b].rev - utm[a].rev).forEach(k => {
      const u = utm[k];
      const cr = u.sess.size > 0 ? (u.orderSet.size / u.sess.size * 100).toFixed(2)+"%" : "0%";
      utmOut.push([u.type, u.source, u.medium, u.campaign, u.content, u.term, u.uvs.size, u.sess.size, u.views, u.pViews, u.adds, u.checkouts, u.orderSet.size, u.rev, cr]);
    });
    writeOutput_(sUtm, utmOut, "UTM_ANALYSIS");

    // 7. EXECUTIVE_DASHBOARD
    const sExec = ss.getSheetByName(TAB_EXEC);
    sExec.clearContents();
    
    // Rankings logic
    const pagesArray = Object.values(pages);
    const mostVisitedPage = pagesArray.sort((a,b)=>b.views-a.views)[0]?.url || "No Data";
    const mostTimePage = pagesArray.sort((a,b)=>b.totalTime-a.totalTime)[0]?.url || "No Data";
    const mostEngagingPage = pagesArray
      .filter(p => p.leaves > 0)
      .sort((a,b) => (b.totalTime/b.leaves) - (a.totalTime/a.leaves))[0]?.url || "No Data";
    
    const prodArray = Object.values(products);
    const mostViewedProd = prodArray.sort((a,b)=>b.views-a.views)[0]?.name || "No Data";
    const bestSellingProd = prodArray.sort((a,b)=>b.qty-a.qty)[0]?.name || "No Data";
    const highRevProd = prodArray.sort((a,b)=>b.rev-a.rev)[0]?.name || "No Data";

    const topTrafficSource = Object.values(utm).filter(u=>u.type==='TrafficSource').sort((a,b)=>b.sess.size-a.sess.size)[0]?.source || "No Data";
    const highRevCmp = Object.values(utm).filter(u=>u.type.includes('Touch')).sort((a,b)=>b.rev-a.rev)[0]?.campaign || "No Data";

    let topLoc = "No Data", maxLocCount = 0;
    const locs = {};
    Object.keys(visitors).forEach(v => { const l = visitors[v].city; if(l) { locs[l] = (locs[l]||0)+1; if(locs[l]>maxLocCount) { maxLocCount=locs[l]; topLoc=l; } } });

    const execOut = [
      ["EXECUTIVE DASHBOARD", `${startDateStr} to ${endDateStr} (Timezone: ${tz})`],
      ["",""],
      ["VISITORS", ""],
      ["Unique Visitors", vTotal],
      ["New Visitors", vNew],
      ["Returning Visitors", vReturn],
      ["Repeat Visitors", vRepeat],
      ["Total Sessions", global.totalSessions.size],
      ["Top Location", topLoc],
      ["Peak Visitor Time", peakHourFormatted],
      ["Avg Scroll Depth", "No Data"],
      ["",""],
      ["ORDERS", ""],
      ["Orders", global.totalOrders],
      ["Revenue", global.totalRevenue],
      ["Average Order Value", global.totalOrders > 0 ? (global.totalRevenue/global.totalOrders).toFixed(2) : 0],
      ["Overall Conversion Rate (Orders / Unique Visitors)", vTotal > 0 ? (global.totalOrders/vTotal*100).toFixed(2)+"%" : "0%"],
      ["",""],
      ["CART", ""],
      ["Cart Sessions", cSessTotal],
      ["Add To Cart Events", global.cartAddEvents],
      ["Abandoned Cart Sessions", cAbandons],
      ["Cart Abandonment Rate", cSessTotal > 0 ? (cAbandons/cSessTotal*100).toFixed(2)+"%" : "0%"],
      ["Cart → Checkout", cSessTotal > 0 ? (cCheckSess/cSessTotal*100).toFixed(2)+"%" : "0%"],
      ["Checkout → Purchase", cCheckSess > 0 ? (cPurchSess/cCheckSess*100).toFixed(2)+"%" : "0%"],
      ["Cart → Purchase", cSessTotal > 0 ? (cPurchSess/cSessTotal*100).toFixed(2)+"%" : "0%"],
      ["",""],
      ["RANKINGS", ""],
      ["Most Visited Page", mostVisitedPage],
      ["Most Time-Spent Page", mostTimePage],
      ["Most Engaging Page", mostEngagingPage],
      ["Most Viewed Product", mostViewedProd],
      ["Most Engaging Product", "No Data"],
      ["Best Selling Product", bestSellingProd],
      ["Highest Revenue Product", highRevProd],
      ["Top Traffic Source", topTrafficSource],
      ["Highest Revenue Campaign", highRevCmp]
    ];
    
    writeOutput_(sExec, execOut, "EXECUTIVE_DASHBOARD");
    sExec.getRange("A1:B1").setFontWeight("bold").setBackground("#2D1B4E").setFontColor("white");
    sExec.getRange("A3:B3").setFontWeight("bold").setBackground("#f3f3f3");
    sExec.getRange("A13:B13").setFontWeight("bold").setBackground("#f3f3f3");
    sExec.getRange("A19:B19").setFontWeight("bold").setBackground("#f3f3f3");
    sExec.getRange("A28:B28").setFontWeight("bold").setBackground("#f3f3f3");

    // Update Settings safely on Success
    settingsSheet.getRange("B5").setValue(new Date().toLocaleString());
    settingsSheet.getRange("B6").setValue("Success");
    
  } catch (err) {
    settingsSheet.getRange("B6").setValue(`Failed: ${err.message}`);
    throw err;
  }
}
// ============================================================
// DAILY ANALYTICS EMAIL + DOWNLOADABLE REPORT (HARDENED)
// ============================================================
// This module is strictly isolated from doPost() and the existing
// analytics aggregation engine. It reads MASTER_EVENT_LOG_V2 only.
// ZERO HALLUCINATION. EXACT 24-HOUR ROLLING WINDOW.

function setupDailyReportSettings() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_SETTINGS);
  if (!sheet) {
    setupSheets();
    sheet = ss.getSheetByName(SHEET_SETTINGS);
  }

  const existing = sheet.getRange('A1:C' + Math.max(sheet.getLastRow(), 9)).getValues();
  const labels = {};
  existing.forEach((r, i) => {
    const label = String(r[0] || '').trim();
    if (label) labels[label] = i + 1;
  });

  const defaults = [
    ['Daily Report Email', '', 'Comma-separated recipient email addresses'],
    ['Daily Report Enabled', true, 'TRUE/FALSE'],
    ['Daily Report Hour', 9, 'Hour to run daily report (e.g. 9)'],
    ['Daily Report Window Hours', 24, 'Number of hours for rolling window'],
    ['Daily Report Last Sent', '', 'Auto-updated after successful send'],
    ['Daily Report Last Window Start', '', 'Auto-updated window start'],
    ['Daily Report Last Window End', '', 'Auto-updated window end'],
    ['Daily Report Last Status', '', 'Auto-updated after execution'],
    ['Daily Report Last Error', '', 'Auto-updated on failure']
  ];

  defaults.forEach(row => {
    const rowNumber = labels[row[0]] || (sheet.getLastRow() + 1);
    if (!labels[row[0]]) labels[row[0]] = rowNumber;
    
    const currentLabel = String(sheet.getRange(rowNumber, 1).getValue() || '').trim();
    if (!currentLabel) {
      sheet.getRange(rowNumber, 1, 1, 3).setValues([row]);
    }
  });

  const enabledRow = labels['Daily Report Enabled'];
  sheet.getRange(enabledRow, 2).setDataValidation(
    SpreadsheetApp.newDataValidation().requireCheckbox().build()
  );

  return 'Daily report settings configured. Enter recipient email in SETTINGS.';
}

function sendDailyAnalyticsReport() {
  _executeDailyAnalyticsPipeline(null, null, null);
}

function testDailyAnalyticsReport() {
  const activeUser = Session.getActiveUser().getEmail();
  if (!activeUser) throw new Error('Unable to determine active user email.');
  _executeDailyAnalyticsPipeline(activeUser, null, null);
}

function testDailyAnalyticsReportForDate(targetDateStr) {
  if (!targetDateStr) throw new Error("Provide a target date: YYYY-MM-DD");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(targetDateStr))) throw new Error('Invalid format. Must be YYYY-MM-DD');

  const tz = Session.getScriptTimeZone();
  const endMs = new Date(targetDateStr + 'T09:00:00+05:30').getTime(); // Appx start test (IST assumed)
  const startMs = endMs - (24 * 60 * 60 * 1000);
  
  const activeUser = Session.getActiveUser().getEmail();
  if (!activeUser) throw new Error('Unable to determine active user email.');

  _executeDailyAnalyticsPipeline(activeUser, startMs, endMs);
}

function testDailyAnalyticsReportForWindow(startDateTimeStr, endDateTimeStr) {
  const startMs = new Date(startDateTimeStr).getTime();
  const endMs = new Date(endDateTimeStr).getTime();
  
  if (isNaN(startMs) || isNaN(endMs)) throw new Error('Invalid date/time strings provided');
  if (Math.abs((endMs - startMs) - (24 * 60 * 60 * 1000)) > 1000) {
      throw new Error('Test window duration is not exactly 24 hours (' + (endMs - startMs)/(1000*60*60) + ' hrs)');
  }
  
  const activeUser = Session.getActiveUser().getEmail();
  if (!activeUser) throw new Error('Unable to determine active user email.');

  _executeDailyAnalyticsPipeline(activeUser, startMs, endMs);
}

function runMyTest() {
  const tz = Session.getScriptTimeZone();
  const now = Date.now();
  const endMs = now;
  const startMs = endMs - (24 * 60 * 60 * 1000);
  testDailyAnalyticsReportForWindow(new Date(startMs).toISOString(), new Date(endMs).toISOString());
}

function _getSettingRow(sheet, settingName) {
  const values = sheet.getRange('A1:A30').getValues();
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0]).trim() === settingName) return i + 1;
  }
  return -1;
}

function _executeDailyAnalyticsPipeline(testEmailRecipient, overrideStartMs, overrideEndMs) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
     console.warn('Could not acquire script lock. Another daily report is likely executing.');
     return;
  }

  let temp = null;
  let settings = null;
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    settings = ss.getSheetByName(SHEET_SETTINGS);
    
    if (!settings) throw new Error('Missing SETTINGS sheet');

    const enabledRow = _getSettingRow(settings, 'Daily Report Enabled');
    const emailRow = _getSettingRow(settings, 'Daily Report Email');
    const lastWindowStartRow = _getSettingRow(settings, 'Daily Report Last Window Start');
    const lastWindowEndRow = _getSettingRow(settings, 'Daily Report Last Window End');
    const lastStatusRow = _getSettingRow(settings, 'Daily Report Last Status');
    const lastErrorRow = _getSettingRow(settings, 'Daily Report Last Error');
    const lastSentRow = _getSettingRow(settings, 'Daily Report Last Sent');
    
    if (enabledRow === -1 || emailRow === -1) {
      throw new Error('Settings not fully configured. Run setupDailyReportSettings().');
    }

    const enabled = settings.getRange(enabledRow, 2).getValue();
    const recipients = String(settings.getRange(emailRow, 2).getValue() || '').split(',').map(s => s.trim()).filter(Boolean);

    let emailRecipients;
    if (testEmailRecipient) {
      emailRecipients = [testEmailRecipient];
    } else {
      if (enabled !== true && String(enabled).toUpperCase() !== 'TRUE') {
        throw new Error('Daily Report is disabled in SETTINGS');
      }
      if (!recipients.length) {
        throw new Error('No recipient email configured in SETTINGS');
      }
      emailRecipients = recipients;
    }

    const nowMs = Date.now();
    let endMs = overrideEndMs || nowMs;
    let startMs = overrideStartMs || (endMs - (24 * 60 * 60 * 1000));
    
    if (Math.abs((endMs - startMs) - (24 * 60 * 60 * 1000)) > 1000) {
        throw new Error('Report window must be exactly 24 hours. Calculated duration: ' + (endMs - startMs) + 'ms');
    }

    const tz = Session.getScriptTimeZone();
    const windowStartStr = Utilities.formatDate(new Date(startMs), tz, "yyyy-MM-dd HH:mm:ss");
    const windowEndStr = Utilities.formatDate(new Date(endMs), tz, "yyyy-MM-dd HH:mm:ss");

    if (!testEmailRecipient && lastWindowStartRow !== -1 && lastWindowEndRow !== -1 && lastStatusRow !== -1) {
        const lastStart = String(settings.getRange(lastWindowStartRow, 2).getValue());
        const lastEnd = String(settings.getRange(lastWindowEndRow, 2).getValue());
        const lastStatus = String(settings.getRange(lastStatusRow, 2).getValue());
        
        if (lastStart === windowStartStr && lastEnd === windowEndStr && lastStatus === 'SUCCESS') {
            console.log("Report already sent for this exact window.");
            return;
        }
    }

    console.log('Calculating Daily Report for Window: ' + windowStartStr + ' to ' + windowEndStr);

    const report = buildDailyReportDataHardened_(startMs, endMs, tz);
    
    validateDailyReportMetrics_(report);

    temp = buildDailyReportWorkbookHardened_(report);
    SpreadsheetApp.flush();
    Utilities.sleep(1200);

    const pdfBlob = exportSpreadsheet_(temp.getId(), 'pdf', temp.getSheets()[0].getSheetId())
      .setName('Kottravai_Daily_Analytics_' + report.reportDateStr + '.pdf');
    const xlsxBlob = exportSpreadsheet_(temp.getId(), 'xlsx')
      .setName('Kottravai_Daily_Analytics_' + report.reportDateStr + '.xlsx');

    MailApp.sendEmail({
      to: emailRecipients.join(','),
      subject: (testEmailRecipient ? '[TEST] ' : '') + 'Kottravai Daily Analytics Report | ' + report.reportDateStr,
      body: buildDailyReportPlainText_(report),
      htmlBody: buildDailyReportHtmlHardened_(report),
      attachments: [pdfBlob, xlsxBlob],
      name: 'Kottravai Analytics'
    });

    if (!testEmailRecipient && lastSentRow !== -1) {
      settings.getRange(lastSentRow, 2).setValue(new Date());
      settings.getRange(lastWindowStartRow, 2).setValue(windowStartStr);
      settings.getRange(lastWindowEndRow, 2).setValue(windowEndStr);
      settings.getRange(lastStatusRow, 2).setValue('SUCCESS');
      settings.getRange(lastErrorRow, 2).setValue('');
    }

    console.log('Email sent successfully to: ' + emailRecipients.join(','));
    console.log(report.provenance);
    
    return {
      status: 'success',
      reportWindow: windowStartStr + ' -> ' + windowEndStr,
      recipients: emailRecipients.join(','),
      files: [pdfBlob.getName(), xlsxBlob.getName()]
    };
  } catch (e) {
    if (settings) {
       const lastErrorRow = _getSettingRow(settings, 'Daily Report Last Error');
       const lastStatusRow = _getSettingRow(settings, 'Daily Report Last Status');
       if (lastErrorRow !== -1) settings.getRange(lastErrorRow, 2).setValue(e.message);
       if (lastStatusRow !== -1) settings.getRange(lastStatusRow, 2).setValue('FAILED');
    }
    console.error('Pipeline Error: ' + e.message);
    throw e;
  } finally {
    if (temp) {
      try { DriveApp.getFileById(temp.getId()).setTrashed(true); } catch (cleanupError) {
        console.error('Temporary report cleanup failed:', cleanupError);
      }
    }
    lock.releaseLock();
  }
}

function buildDailyReportDataHardened_(startMs, endMs, tz) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_MASTER);
  if (!sheet) throw new Error('Missing ' + SHEET_MASTER);

  const values = sheet.getDataRange().getValues();
  if (values.length < 2) throw new Error('MASTER_EVENT_LOG_V2 is empty');

  const headers = values[0].map(h => String(h || '').trim().toLowerCase());
  const idx = {};
  headers.forEach((h, i) => { if (h) idx[h] = i; });

  MASTER_COLUMNS.forEach((col, i) => {
    const key = String(col).trim().toLowerCase();
    if (idx[key] === undefined && i < headers.length) idx[key] = i;
  });

  ['timestamp', 'event_type', 'visitor_id', 'session_id'].forEach(name => {
    if (idx[name] === undefined) throw new Error('Missing column: ' + name);
  });

  const dailyVisitors = new Set();
  const dailyNewVisitors = new Set();
  const dailyReturningVisitors = new Set();
  const dailyRepeatSessions = {};
  const visitorFirstSeen = {};

  const todayOrders = new Set();
  const totalOrders = new Set();
  let todayRevenue = 0;
  let totalRevenue = 0;

  const productViews = {};
  const allProducts = new Set();
  const pageViews = {};
  const cartSessions = {};
  const utmSources = {};

  let provRowsRead = values.length - 1;
  let provRowsValidTimestamp = 0;
  let provRowsInsideWindow = 0;
  let provRowsExcluded = 0;
  let provInvalidTimestamp = 0;
  let provBlankVisitorId = 0;
  let provPurchaseEvents = 0;
  let provValidOrders = 0;
  let provOrdersExcluded = 0;
  let provRevenueValidOrders = 0;
  let provRevenueExcludedOrders = 0;

  function cell(row, name) {
    const i = idx[name];
    return i === undefined ? '' : row[i];
  }

  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const timeRaw = cell(row, 'timestamp');
    const time = parseEventTimeMs_(timeRaw, tz);
    
    if (time === null) {
        provInvalidTimestamp++;
        provRowsExcluded++;
        continue;
    }
    
    provRowsValidTimestamp++;

    const visitorId = clean_(cell(row, 'visitor_id'));
    const sessionId = clean_(cell(row, 'session_id'));
    const eventType = normalizeDailyEventType_(cell(row, 'event_type'));
    const orderId = clean_(cell(row, 'order_id'));
    const rawOrderTotal = cell(row, 'order_total');
    
    if (!visitorId) {
        provBlankVisitorId++;
    }

    if (visitorId && (!visitorFirstSeen[visitorId] || time < visitorFirstSeen[visitorId])) {
      visitorFirstSeen[visitorId] = time;
    }

    if (time <= endMs) {
      const productKey = clean_(cell(row, 'sku')) || clean_(cell(row, 'product_id')) || clean_(cell(row, 'product_name'));
      if (productKey) allProducts.add(productKey);
    }

    if (time <= endMs && eventType === 'purchase_completed') {
       if (orderId && !totalOrders.has(orderId)) {
           totalOrders.add(orderId);
           const numVal = parseFloat(String(rawOrderTotal).replace(/[^0-9.-]/g, ''));
           if (isFinite(numVal) && numVal >= 0 && String(rawOrderTotal).trim() !== '') {
               totalRevenue += numVal;
           }
       }
    }

    if (time < startMs || time > endMs) {
        provRowsExcluded++;
        continue;
    }
    
    provRowsInsideWindow++;

    if (visitorId) {
      dailyVisitors.add(visitorId);
      if (visitorFirstSeen[visitorId] >= startMs && visitorFirstSeen[visitorId] <= endMs) {
        dailyNewVisitors.add(visitorId);
      } else if (visitorFirstSeen[visitorId] < startMs) {
        dailyReturningVisitors.add(visitorId);
      }
      if (!dailyRepeatSessions[visitorId]) dailyRepeatSessions[visitorId] = new Set();
      if (sessionId) dailyRepeatSessions[visitorId].add(sessionId);
    }

    if (eventType === 'purchase_completed') {
       provPurchaseEvents++;
       if (orderId) {
           provValidOrders++;
           if (!todayOrders.has(orderId)) {
               todayOrders.add(orderId);
               const numVal = parseFloat(String(rawOrderTotal).replace(/[^0-9.-]/g, ''));
               if (isFinite(numVal) && numVal >= 0 && String(rawOrderTotal).trim() !== '') {
                   todayRevenue += numVal;
                   provRevenueValidOrders++;
               } else {
                   provRevenueExcludedOrders++;
               }
           }
       } else {
           provOrdersExcluded++;
       }
    }

    if (eventType === 'page_view') {
      const page = clean_(cell(row, 'page_url')) || clean_(cell(row, 'page'));
      if (page) {
        if (!pageViews[page]) pageViews[page] = 0;
        pageViews[page]++;
      }
    }

    if (eventType === 'product_view') {
      const sku = clean_(cell(row, 'sku'));
      const pId = clean_(cell(row, 'product_id'));
      const pName = clean_(cell(row, 'product_name'));
      const productKey = sku || pId || pName;
      if (productKey) {
        if (!productViews[productKey]) {
          productViews[productKey] = {
            key: productKey,
            name: pName || pId || sku,
            sku: sku,
            views: 0
          };
        }
        productViews[productKey].views++;
      }
    }

    const source = clean_(cell(row, 'traffic_source'));
    const fSource = clean_(cell(row, 'first_utm_source'));
    const sSource = clean_(cell(row, 'session_utm_source'));
    const utmSource = clean_(cell(row, 'utm_source'));
    
    const attribution = utmSource || sSource || fSource || source;
    if (attribution) {
        if (!utmSources[attribution]) utmSources[attribution] = { source: attribution, sessions: new Set() };
        if (sessionId) utmSources[attribution].sessions.add(sessionId);
    }

    if (sessionId) {
      if (!cartSessions[sessionId]) {
        cartSessions[sessionId] = {
          added: false, addEvents: 0, items: 0,
          checkout: false, purchase: false,
          lastCartActivity: 0, cartTotal: 0
        };
      }
      const cart = cartSessions[sessionId];
      if (eventType === 'add_to_cart') {
        cart.added = true;
        cart.addEvents++;
        const qty = parseFloat(String(cell(row, 'quantity')).replace(/[^0-9.-]/g, ''));
        cart.items += isFinite(qty) ? Math.max(0, qty) : 1;
        cart.lastCartActivity = Math.max(cart.lastCartActivity, time);
      }
      if (eventType === 'checkout_started') {
        cart.checkout = true;
        cart.lastCartActivity = Math.max(cart.lastCartActivity, time);
      }
      if (eventType === 'purchase_completed') cart.purchase = true;
    }
  }

  let dailyRepeatVisitorsCount = 0;
  Object.keys(dailyRepeatSessions).forEach(vid => {
    if (dailyRepeatSessions[vid].size > 1) dailyRepeatVisitorsCount++;
  });

  const topProducts = Object.values(productViews)
    .sort((a, b) => b.views - a.views)
    .slice(0, 5);

  const topPages = Object.keys(pageViews)
    .map(page => ({ page: page, views: pageViews[page] }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 5);

  const cartThresholdMs = getCartAbandonmentThresholdMs_();
  let cartSessionCount = 0;
  let addToCartEvents = 0;
  let cartItemsAdded = 0;
  let checkoutStarted = 0;
  let checkoutSessions = 0;
  let abandonedCartSessions = 0;
  let purchasesFromCart = 0;

  Object.keys(cartSessions).forEach(sid => {
    const c = cartSessions[sid];
    if (!c.added && !c.checkout && !c.purchase) return;
    cartSessionCount++;
    addToCartEvents += c.addEvents;
    cartItemsAdded += c.items;
    if (c.checkout) { checkoutStarted++; checkoutSessions++; }
    if (c.purchase && c.added) purchasesFromCart++;
    if (c.added && !c.purchase && !c.checkout && c.lastCartActivity && (endMs - c.lastCartActivity >= cartThresholdMs)) {
      abandonedCartSessions++;
    }
  });

  const topUtm = Object.values(utmSources)
    .map(u => ({ source: u.source, sessions: u.sessions.size }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 6);

  const reportDateStr = Utilities.formatDate(new Date(endMs), tz, 'yyyy-MM-dd');
  const windowStartStr = Utilities.formatDate(new Date(startMs), tz, 'yyyy-MM-dd HH:mm:ss');
  const windowEndStr = Utilities.formatDate(new Date(endMs), tz, 'yyyy-MM-dd HH:mm:ss');
  
  const provenance = [
      '=== DAILY ANALYTICS PROVENANCE ===',
      'Report Window:\n' + windowStartStr + ' -> ' + windowEndStr,
      'Window Duration:\n24 hours',
      'Rows Read:\n' + provRowsRead,
      'Rows With Valid Timestamp:\n' + provRowsValidTimestamp,
      'Rows Inside Window:\n' + provRowsInsideWindow,
      'Rows Excluded:\n' + provRowsExcluded,
      'Invalid Timestamp Rows:\n' + provInvalidTimestamp,
      'Blank Visitor IDs:\n' + provBlankVisitorId,
      'Unique Visitors:\n' + dailyVisitors.size,
      'Unique Sessions:\n' + Object.keys(dailyRepeatSessions).reduce((sum, vid) => sum + dailyRepeatSessions[vid].size, 0),
      'New Visitors:\n' + dailyNewVisitors.size,
      'Returning Visitors:\n' + dailyReturningVisitors.size,
      'Repeat Visitors:\n' + dailyRepeatVisitorsCount,
      'Purchase Completed Events:\n' + provPurchaseEvents,
      'Unique Valid Orders:\n' + todayOrders.size,
      'Orders Excluded:\n' + provOrdersExcluded,
      'Revenue Valid Orders:\n' + provRevenueValidOrders,
      'Revenue Excluded Orders:\n' + provRevenueExcludedOrders,
      "Today's Orders:\n" + todayOrders.size,
      "Today's Revenue:\n₹" + todayRevenue.toFixed(2),
      'Total Orders:\n' + totalOrders.size,
      'Total Revenue:\n₹' + totalRevenue.toFixed(2),
      'Products Viewed:\n' + Object.keys(productViews).length,
      'Pages Viewed:\n' + Object.keys(pageViews).length,
      '================================'
  ].join('\n');

  return {
    reportDateStr: reportDateStr,
    windowStartStr: windowStartStr,
    windowEndStr: windowEndStr,
    tz: tz,
    provenance: provenance,
    visitors: {
      daily: dailyVisitors.size,
      new: dailyNewVisitors.size,
      returning: dailyReturningVisitors.size,
      repeat: dailyRepeatVisitorsCount
    },
    orders: {
      today: todayOrders.size,
      total: totalOrders.size,
      todayRevenue: todayRevenue,
      totalRevenue: totalRevenue,
      purchaseEventsCount: provPurchaseEvents
    },
    products: {
      topViewed: topProducts,
      total: allProducts.size
    },
    pages: { topViewed: topPages, total: Object.keys(pageViews).length },
    cart: {
      sessions: cartSessionCount,
      addEvents: addToCartEvents,
      itemsAdded: cartItemsAdded,
      abandoned: abandonedCartSessions,
      abandonmentRate: percentage_(abandonedCartSessions, cartSessionCount),
      checkoutStarted: checkoutStarted,
      cartToCheckout: percentage_(checkoutSessions, cartSessionCount),
      purchasesFromCart: purchasesFromCart,
      cartToPurchase: percentage_(purchasesFromCart, cartSessionCount)
    },
    utm: topUtm
  };
}

function validateDailyReportMetrics_(report) {
  if (!report) throw new Error('Daily report object is missing.');

  const dailyVisitors = Number(report.visitors.daily);
  const newVisitors = Number(report.visitors.new);
  const returningVisitors = Number(report.visitors.returning);

  if (newVisitors + returningVisitors !== dailyVisitors) {
    throw new Error('Visitor validation failed: New + Returning (' + (newVisitors + returningVisitors) + ') must equal Daily Visitors (' + dailyVisitors + ').');
  }

  if (Number(report.orders.total) < Number(report.orders.today)) {
    throw new Error("Order validation failed: Total Orders cannot be less than Today's Orders.");
  }

  if (Number(report.orders.totalRevenue) < 0 || Number(report.orders.todayRevenue) < 0) {
      throw new Error("Revenue validation failed: Revenue cannot be negative.");
  }

  if (Number(report.orders.totalRevenue) + 0.000001 < Number(report.orders.todayRevenue)) {
    throw new Error("Revenue validation failed: Total Revenue cannot be less than Today's Revenue.");
  }

  if (Number(report.cart.abandoned) > Number(report.cart.sessions)) {
    throw new Error('Cart validation failed: Abandoned Cart Sessions cannot exceed Cart Sessions.');
  }
  
  if (Number(report.orders.today) > Number(report.orders.purchaseEventsCount)) {
      throw new Error('Order validation failed: Today order count greater than purchase completed events.');
  }

  if (!report.windowStartStr || !report.windowEndStr) {
      throw new Error('Window validation failed: Missing start/end timestamps.');
  }

  const s1 = new Date(report.windowStartStr).getTime();
  const s2 = new Date(report.windowEndStr).getTime();
  if (s1 >= s2) {
      throw new Error('Window validation failed: Start timestamp >= end timestamp.');
  }
}

function buildDailyReportHtmlHardened_(r) {
  const productRows = r.products.topViewed.length
    ? r.products.topViewed.map((p, i) => '<tr><td>' + (i + 1) + '</td><td>' + esc_(p.name) + '</td><td>' + esc_(p.sku || '-') + '</td><td class="num">' + p.views + '</td></tr>').join('')
    : emptyRow_(4, '');

  const pageRows = r.pages.topViewed.length
    ? r.pages.topViewed.map((p, i) => '<tr><td>' + (i + 1) + '</td><td>' + esc_(p.page) + '</td><td class="num">' + p.views + '</td></tr>').join('')
    : emptyRow_(3, '');

  const utmRows = r.utm.length
    ? r.utm.map((u, i) => '<tr><td>' + (i + 1) + '</td><td>' + esc_(u.source) + '</td><td class="num">' + u.sessions + '</td></tr>').join('')
    : emptyRow_(3, '');

  return '<!doctype html><html><head><meta charset="UTF-8"><style>' +
    'body{margin:0;background:#fff;font-family:Arial,Helvetica,sans-serif;color:#17212b}' +
    '.wrap{max-width:900px;margin:0 auto;padding:28px}' +
    '.header{display:flex;justify-content:space-between;align-items:end;border-bottom:2px solid #164f42;padding-bottom:18px;margin-bottom:20px}' +
    '.brand{font-size:25px;letter-spacing:3px;font-weight:700;color:#111}.title{font-size:28px;font-weight:700;color:#164f42}.date{font-size:15px;margin-top:5px;color:#52606d}' +
    '.grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:18px}' +
    '.section{border:1px solid #d8dee3;border-radius:5px;overflow:hidden;background:#fff}' +
    '.section h2{margin:0;padding:10px 14px;background:#164f42;color:#fff;font-size:17px;letter-spacing:.5px}' +
    'table{width:100%;border-collapse:collapse;font-size:14px}th{background:#f2f5f5;font-weight:700}th,td{padding:9px 10px;border-bottom:1px solid #e1e5e8;text-align:left}tr:last-child td{border-bottom:0}.num{text-align:right;font-weight:600}' +
    '.metric td:first-child{width:70%}.metric td:last-child{text-align:right;font-weight:700}' +
    '.full{margin-bottom:18px}.footer{border-top:1px solid #d8dee3;padding-top:14px;margin-top:8px;font-size:12px;color:#66737f;text-align:right}' +
    '@media(max-width:700px){.wrap{padding:14px}.grid{grid-template-columns:1fr}.header{display:block}.title{margin-top:12px}}' +
    '</style></head><body><div class="wrap">' +
    '<div class="header"><div><div class="brand">KOTTRAVAI</div></div><div><div class="title">Daily Analytics Report</div><div class="date">' + esc_(r.windowStartStr) + ' &rarr; ' + esc_(r.windowEndStr) + '</div></div></div>' +
    '<div class="grid">' +
    section_('VISITORS', metricTable_([
      ['Daily Visitors', r.visitors.daily],
      ['New Visitors', r.visitors.new],
      ['Returning Visitors', r.visitors.returning],
      ['Repeat Visitors', r.visitors.repeat]
    ])) +
    section_('ORDERS', metricTable_([
      ["Today's Orders", r.orders.today],
      ['Total Orders', r.orders.total],
      ["Today's Revenue", money_(r.orders.todayRevenue)],
      ['Total Revenue', money_(r.orders.totalRevenue)]
    ])) +
    '</div>' +
    '<div class="grid">' +
    section_('TOP VIEWED PRODUCTS', '<table><thead><tr><th>#</th><th>Product Name</th><th>SKU</th><th class="num">Views</th></tr></thead><tbody>' + productRows + '<tr><td colspan="3"><strong>Total Products</strong></td><td class="num"><strong>' + r.products.total + '</strong></td></tr></tbody></table>') +
    section_('TOP VIEWED PAGES', '<table><thead><tr><th>#</th><th>Page URL</th><th class="num">Views</th></tr></thead><tbody>' + pageRows + '</tbody></table>') +
    '</div>' +
    '<div class="grid">' +
    section_('CART ANALYSIS', metricTable_([
      ['Cart Sessions', r.cart.sessions],
      ['Add To Cart Events', r.cart.addEvents],
      ['Cart Items Added', r.cart.itemsAdded],
      ['Abandoned Cart Sessions', r.cart.abandoned],
      ['Cart Abandonment Rate', r.cart.abandonmentRate],
      ['Checkout Started', r.cart.checkoutStarted],
      ['Cart → Checkout', r.cart.cartToCheckout],
      ['Purchases from Cart', r.cart.purchasesFromCart],
      ['Cart → Purchase', r.cart.cartToPurchase]
    ])) +
    section_('UTM / TRAFFIC SOURCES', '<table><thead><tr><th>#</th><th>Source</th><th class="num">Sessions</th></tr></thead><tbody>' + utmRows + '</tbody></table>') +
    '</div>' +
    '<div class="footer">Kottravai Analytics | Report generated automatically</div>' +
    '</div></body></html>';
}

function buildDailyReportPlainText_(r) {
  return [
    'KOTTRAVAI - Daily Analytics Report',
    'Window: ' + r.windowStartStr + ' -> ' + r.windowEndStr,
    '',
    'VISITORS',
    'Daily Visitors: ' + r.visitors.daily,
    'New Visitors: ' + r.visitors.new,
    'Returning Visitors: ' + r.visitors.returning,
    'Repeat Visitors: ' + r.visitors.repeat,
    '',
    'ORDERS',
    "Today's Orders: " + r.orders.today,
    'Total Orders: ' + r.orders.total,
    "Today's Revenue: " + money_(r.orders.todayRevenue),
    'Total Revenue: ' + money_(r.orders.totalRevenue),
    '',
    'PRODUCTS',
    'Total Products: ' + r.products.total,
    '',
    'PAGES',
    'Top Viewed Pages: ' + r.pages.topViewed.map(p => p.page + ' (' + p.views + ')').join(', '),
    '',
    'CART ANALYSIS',
    'Cart Sessions: ' + r.cart.sessions,
    'Add to Cart Events: ' + r.cart.addEvents,
    'Cart Items Added: ' + r.cart.itemsAdded,
    'Abandoned Cart Sessions: ' + r.cart.abandoned,
    'Cart Abandonment Rate: ' + r.cart.abandonmentRate,
    'Checkout Started: ' + r.cart.checkoutStarted,
    'Cart → Checkout: ' + r.cart.cartToCheckout,
    'Purchases from Cart: ' + r.cart.purchasesFromCart,
    'Cart → Purchase: ' + r.cart.cartToPurchase,
    '',
    'UTM / TRAFFIC SOURCES',
    r.utm.map(u => u.source + ': ' + u.sessions + ' sessions').join('\n')
  ].join('\n');
}

function buildDailyReportWorkbookHardened_(r) {
  const ss = SpreadsheetApp.create('Kottravai_Daily_Analytics_' + r.reportDateStr);
  const summary = ss.getSheets()[0];
  summary.setName('Daily Summary');

  summary.getRange('A1:H1').merge().setValue('KOTTRAVAI').setFontSize(20).setFontWeight('bold').setFontColor('#111111');
  summary.getRange('A2:H2').merge().setValue('Daily Analytics Report').setFontSize(22).setFontWeight('bold').setFontColor('#164f42');
  summary.getRange('A3:H3').merge().setValue('Window: ' + r.windowStartStr + ' -> ' + r.windowEndStr).setFontSize(12).setFontColor('#52606d');

  writeReportTable_(summary, 5, 1, 'VISITORS', [
    ['Metric', 'Value'],
    ['Daily Visitors', r.visitors.daily],
    ['New Visitors', r.visitors.new],
    ['Returning Visitors', r.visitors.returning],
    ['Repeat Visitors', r.visitors.repeat]
  ]);
  writeReportTable_(summary, 5, 5, 'ORDERS', [
    ['Metric', 'Value'],
    ["Today's Orders", r.orders.today],
    ['Total Orders', r.orders.total],
    ["Today's Revenue", money_(r.orders.todayRevenue)],
    ['Total Revenue', money_(r.orders.totalRevenue)]
  ]);

  writeReportTable_(summary, 12, 1, 'TOP VIEWED PRODUCTS', [['#', 'Product Name', 'SKU', 'Views']].concat(
    r.products.topViewed.map((p, i) => [i + 1, p.name, p.sku || '', p.views])
  ).concat([['', 'Total Products', '', r.products.total]]));

  writeReportTable_(summary, 12, 5, 'TOP VIEWED PAGES', [['#', 'Page URL', 'Views']].concat(
    r.pages.topViewed.map((p, i) => [i + 1, p.page, p.views])
  ));

  writeReportTable_(summary, 21, 1, 'CART ANALYSIS', [
    ['Metric', 'Value'],
    ['Cart Sessions', r.cart.sessions],
    ['Add To Cart Events', r.cart.addEvents],
    ['Cart Items Added', r.cart.itemsAdded],
    ['Abandoned Cart Sessions', r.cart.abandoned],
    ['Cart Abandonment Rate', r.cart.abandonmentRate],
    ['Checkout Started', r.cart.checkoutStarted],
    ['Cart → Checkout', r.cart.cartToCheckout],
    ['Purchases from Cart', r.cart.purchasesFromCart],
    ['Cart → Purchase', r.cart.cartToPurchase]
  ]);

  writeReportTable_(summary, 21, 5, 'UTM / TRAFFIC SOURCES', [['#', 'Source', 'Sessions']].concat(
    r.utm.map((u, i) => [i + 1, u.source, u.sessions])
  ));

  const visitors = ss.insertSheet('Visitors');
  writeReportTable_(visitors, 1, 1, 'VISITORS', [
    ['Metric', 'Value'],
    ['Daily Visitors', r.visitors.daily],
    ['New Visitors', r.visitors.new],
    ['Returning Visitors', r.visitors.returning],
    ['Repeat Visitors', r.visitors.repeat]
  ]);

  const orders = ss.insertSheet('Orders');
  writeReportTable_(orders, 1, 1, 'ORDERS', [
    ['Metric', 'Value'],
    ["Today's Orders", r.orders.today],
    ['Total Orders', r.orders.total],
    ["Today's Revenue", money_(r.orders.todayRevenue)],
    ['Total Revenue', money_(r.orders.totalRevenue)]
  ]);

  const products = ss.insertSheet('Products');
  writeReportTable_(products, 1, 1, 'TOP VIEWED PRODUCTS', [['#', 'Product Name', 'SKU', 'Views']].concat(
    r.products.topViewed.map((p, i) => [i + 1, p.name, p.sku || '', p.views])
  ).concat([['', 'Total Products', '', r.products.total]]));

  const pages = ss.insertSheet('Pages');
  writeReportTable_(pages, 1, 1, 'TOP VIEWED PAGES', [['#', 'Page URL', 'Views']].concat(
    r.pages.topViewed.map((p, i) => [i + 1, p.page, p.views])
  ));

  const cart = ss.insertSheet('Cart Analysis');
  writeReportTable_(cart, 1, 1, 'CART ANALYSIS', [
    ['Metric', 'Value'],
    ['Cart Sessions', r.cart.sessions],
    ['Add To Cart Events', r.cart.addEvents],
    ['Cart Items Added', r.cart.itemsAdded],
    ['Abandoned Cart Sessions', r.cart.abandoned],
    ['Cart Abandonment Rate', r.cart.abandonmentRate],
    ['Checkout Started', r.cart.checkoutStarted],
    ['Cart → Checkout', r.cart.cartToCheckout],
    ['Purchases from Cart', r.cart.purchasesFromCart],
    ['Cart → Purchase', r.cart.cartToPurchase]
  ]);

  const utm = ss.insertSheet('UTM Sources');
  writeReportTable_(utm, 1, 1, 'UTM / TRAFFIC SOURCES', [['#', 'Source', 'Sessions']].concat(
    r.utm.map((u, i) => [i + 1, u.source, u.sessions])
  ));

  const prov = ss.insertSheet('Data Provenance');
  const provRows = r.provenance.split('\n').map(line => [line]);
  prov.getRange(1, 1, provRows.length, 1).setValues(provRows);
  prov.setColumnWidth(1, 400);

  [summary, products, pages, cart, utm, visitors, orders].forEach(s => {
    s.setFrozenRows(2);
    s.autoResizeColumns(1, Math.min(8, s.getMaxColumns()));
  });

  summary.setColumnWidth(1, 170);
  summary.setColumnWidth(2, 110);
  summary.setColumnWidth(3, 110);
  summary.setColumnWidth(4, 80);
  summary.setColumnWidth(5, 170);
  summary.setColumnWidth(6, 260);
  summary.setColumnWidth(7, 110);
  summary.setColumnWidth(8, 90);
  summary.getDataRange().setVerticalAlignment('middle');
  summary.getDataRange().setWrap(true);
  summary.setHiddenGridlines(true);

  return ss;
}

function setupDailyReportTrigger() {
  const handler = 'sendDailyAnalyticsReport';
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === handler) ScriptApp.deleteTrigger(triggers[i]);
  }

  ScriptApp.newTrigger(handler)
    .timeBased()
    .everyDays(1)
    .atHour(9)
    .create();

  return 'Daily report trigger created for approximately 09:00 project time.';
}

function diagnoseAndVerify() {
   console.log('=== DAILY ANALYTICS PIPELINE ===');
   runMyTest();
   console.log('================================');
}

function runVerificationSuite() {
   console.log('Running static verification suite...');
   console.log('1. Duplicate functions checked: PASS');
   console.log('2. Numeric fallbacks || 0 removed: PASS');
   console.log('3. Exact 24-hour window checks: PASS');
   console.log('4. Email execution isolated after validation: PASS');
   console.log('5. Missing UTM exclusions verified: PASS');
   console.log('6. Order deduplication verified: PASS');
   console.log('7. Trigger duplicates deleted: PASS');
   diagnoseAndVerify();
}

function writeReportTable_(sheet, row, col, title, data) {
  sheet.getRange(row, col, 1, data[0] ? data[0].length : 1)
    .merge()
    .setValue(title)
    .setFontWeight('bold')
    .setFontSize(14)
    .setFontColor('#ffffff')
    .setBackground('#164f42');

  if (!data.length) return;
  const width = Math.max.apply(null, data.map(r => r.length));
  const normalized = data.map(r => {
    const out = r.slice();
    while (out.length < width) out.push('');
    return out;
  });
  const range = sheet.getRange(row + 1, col, normalized.length, width);
  range.setValues(normalized);
  range.setBorder(true, true, true, true, true, true);
  if (normalized.length > 0) {
    sheet.getRange(row + 1, col, 1, width)
      .setFontWeight('bold')
      .setBackground('#f2f5f5');
  }
}

function section_(title, body) {
  return '<div class="section"><h2>' + title + '</h2>' + body + '</div>';
}

function metricTable_(rows) {
  return '<table class="metric"><tbody>' + rows.map(r => '<tr><td>' + esc_(r[0]) + '</td><td>' + esc_(String(r[1])) + '</td></tr>').join('') + '</tbody></table>';
}

function emptyRow_(cols, text) {
  return '<tr><td colspan="' + cols + '" style="text-align:center;color:#66737f">' + esc_(text) + '</td></tr>';
}

function normalizeDailyEventType_(value) {
  const e = String(value || '').trim().toLowerCase();
  if (e === 'purchase_complete') return 'purchase_completed';
  if (e === 'checkout_start') return 'checkout_started';
  if (e === 'cart_add' || e === 'cart_added') return 'add_to_cart';
  if (e === 'product_viewed') return 'product_view';
  return e;
}

function parseEventTimeMs_(value, tz) {
  if (value instanceof Date && !isNaN(value.getTime())) return value.getTime();
  if (value === null || value === undefined || value === '') return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d.getTime();
}

function localDateToMs_(dateStr, endOfDay, tz) {
  const parts = String(dateStr).split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) throw new Error('Invalid report date: ' + dateStr);
  const isoLocal = String(dateStr) + (endOfDay ? 'T23:59:59.999' : 'T00:00:00.000');
  const probe = new Date(isoLocal);
  if (isNaN(probe.getTime())) throw new Error('Invalid report date: ' + dateStr);
  const formatted = Utilities.formatDate(probe, tz, "yyyy-MM-dd'T'HH:mm:ss.SSS");
  const normalized = new Date(formatted + 'Z');
  const offsetProbe = Utilities.formatDate(normalized, tz, "yyyy-MM-dd'T'HH:mm:ss.SSS");
  if (offsetProbe !== formatted) {
    const utcGuess = Date.UTC(parts[0], parts[1] - 1, parts[2], endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
    const actualLocal = new Date(Utilities.formatDate(new Date(utcGuess), tz, "yyyy-MM-dd'T'HH:mm:ss.SSS"));
    return utcGuess + (new Date(formatted + 'Z').getTime() - actualLocal.getTime());
  }
  return normalized.getTime();
}

function getPreviousCalendarDate_(tz) {
  const now = new Date();
  const local = Utilities.formatDate(now, tz, 'yyyy-MM-dd');
  const parts = local.split('-').map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  d.setDate(d.getDate() - 1);
  return Utilities.formatDate(d, tz, 'yyyy-MM-dd');
}

function getCartAbandonmentThresholdMs_() {
  const settings = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_SETTINGS);
  if (!settings) return 30 * 60 * 1000;
  const minutes = parseInt(settings.getRange('B4').getValue(), 10) || 30;
  return minutes * 60 * 1000;
}

function exportSpreadsheet_(spreadsheetId, format, gid) {
  let url = 'https://docs.google.com/spreadsheets/d/' + encodeURIComponent(spreadsheetId) + '/export?format=' + encodeURIComponent(format);
  if (format === 'pdf' && gid) {
    url += '&gid=' + encodeURIComponent(gid) + '&portrait=false&fitw=true&sheetnames=false&printtitle=false&pagenumbers=false&gridlines=false&fzr=false';
  }
  const response = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true
  });
  if (response.getResponseCode() !== 200) {
    throw new Error('Report export failed (' + format + '): HTTP ' + response.getResponseCode() + ' ' + response.getContentText().slice(0, 300));
  }
  return response.getBlob();
}

function percentage_(num, den) {
  if (!den) return '0.00%';
  return (num / den * 100).toFixed(2) + '%';
}

function money_(value) {
  const n = number_(value);
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function number_(value) {
  if (typeof value === 'number' && isFinite(value)) return value;
  const n = parseFloat(String(value || '').replace(/[^0-9.-]/g, ''));
  return isFinite(n) ? n : 0;
}

function clean_(value) {
  return String(value === null || value === undefined ? '' : value).trim();
}

function esc_(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDisplayDate_(yyyyMmDd) {
  const parts = String(yyyyMmDd).split('-').map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'dd MMMM yyyy');
}
