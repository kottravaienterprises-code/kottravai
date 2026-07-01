require('dotenv').config({ path: './server/.env' });
const { generateDailyAnalyticsSummary } = require('./server/services/dailyAnalyticsService.js');
const gs = require('./server/services/googleSheetsService.js');

async function rebuildAggregated() {
  console.log("Rebuilding Aggregated Daily sheet for missing dates...");
  const dates = ['2026-06-18', '2026-06-19', '2026-06-20', '2026-06-21', '2026-06-22', '2026-06-23'];
  
  for (const date of dates) {
    console.log(`Aggregating data for ${date}...`);
    try {
      const summary = await generateDailyAnalyticsSummary(date);
      // Wait a moment to ensure no API rate limits are hit
      await new Promise(r => setTimeout(r, 1000));
      
      // Save it to the Google Sheet (Aggregated Daily, Sessions, etc)
      await gs.saveDailySummary(summary);
      console.log(`✅ Saved aggregated summary for ${date}`);
      
      // Clear cache so the next iteration doesn't reuse anything
      gs.clearCache && gs.clearCache();
    } catch (e) {
      console.error(`❌ Failed to aggregate ${date}:`, e);
    }
  }
  
  console.log("Rebuild complete!");
}

rebuildAggregated();
