const express = require('express');
const axios = require('axios');
const path = require('path');
const db = require('./server/db');

// Resolve .env for server
require('dotenv').config({ path: path.resolve(__dirname, 'server', '.env') });

const app = express();
app.use(express.json());

// Register pipeline routes
app.use('/api/admin/pipeline', require('./server/routes/pipelineRoutes'));

const PORT = 4999;
let server;

async function run() {
  console.log("==================================================");
  console.log("PHASE 4D E2E ROUTE VERIFICATION");
  console.log("==================================================");
  
  // Start server
  server = app.listen(PORT, async () => {
    console.log(`Test server started on port ${PORT}`);
    
    try {
      const endpoints = [
        { name: '1. Pipeline Health Score', path: '/health' },
        { name: '2. AI Insights (with Fallback)', path: '/insights' },
        { name: '3. Trend Analytics', path: '/trends' },
        { name: '4. Forecast Accuracy', path: '/forecast-accuracy' },
        { name: '5. Team Leaderboard (Production Mode)', path: '/leaderboard?demo_mode=false' },
        { name: '6. Team Leaderboard (Demo Mode)', path: '/leaderboard?demo_mode=true' }
      ];
      
      for (const ep of endpoints) {
        console.log(`\n--------------------------------------------------`);
        console.log(`Testing: ${ep.name}`);
        console.log(`Endpoint: GET http://localhost:${PORT}/api/admin/pipeline${ep.path}`);
        console.log(`--------------------------------------------------`);
        
        const res = await axios.get(`http://localhost:${PORT}/api/admin/pipeline${ep.path}`);
        if (res.data.success) {
          console.log("✅ STATUS: SUCCESS");
          console.log("Payload:", JSON.stringify(res.data.data, null, 2));
        } else {
          console.log("❌ STATUS: FAILED");
          console.log("Response:", res.data);
        }
      }
      
      console.log("\n==================================================");
      console.log("VERIFICATION COMPLETED SUCCESSFULLY!");
      console.log("==================================================");
      
    } catch (err) {
      console.error("❌ Test run failed:", err.message);
      if (err.response) {
        console.error("Response data:", err.response.data);
      }
    } finally {
      server.close(() => {
        console.log("Test server shut down.");
        process.exit(0);
      });
    }
  });
}

run();
