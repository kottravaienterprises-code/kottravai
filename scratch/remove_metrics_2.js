const fs = require('fs');

const file1 = 'scratch/Kottravai_Metrics_Part2_Daily_Report_Hardened.gs';
if (fs.existsSync(file1)) {
    let c = fs.readFileSync(file1, 'utf8');
    c = c.replace(/\["Today's Orders", r\.orders\.today\],\s*\["Total Orders", r\.orders\.total\],\s*\["Today's Revenue", money_\(r\.orders\.todayRevenue\)\],\s*\["Total Revenue", money_\(r\.orders\.totalRevenue\)\]/g, '');
    fs.writeFileSync(file1, c);
}

const file2 = 'scratch/Kottravai_Metrics_Part2_Daily_Report_Hardened.js';
if (fs.existsSync(file2)) {
    let c = fs.readFileSync(file2, 'utf8');
    c = c.replace(/\["Today's Orders", r\.orders\.today\],\s*\["Total Orders", r\.orders\.total\],\s*\["Today's Revenue", money_\(r\.orders\.todayRevenue\)\],\s*\["Total Revenue", money_\(r\.orders\.totalRevenue\)\]/g, '');
    fs.writeFileSync(file2, c);
}

const file3 = 'scratch/assemble_gs.js';
if (fs.existsSync(file3)) {
    let c = fs.readFileSync(file3, 'utf8');
    c = c.replace(/\["Today's Orders", r\.orders\.today\],\s*\["Total Orders", r\.orders\.total\],\s*\["Today's Revenue", money_\(r\.orders\.todayRevenue\)\],\s*\["Total Revenue", money_\(r\.orders\.totalRevenue\)\]/g, '');
    fs.writeFileSync(file3, c);
}

const file4 = 'server/services/dailyEmailTemplate.js';
if (fs.existsSync(file4)) {
    let c = fs.readFileSync(file4, 'utf8');
    c = c.replace(/\{ label: "Today's Orders", value: formatNum\(data\.summary\.totalOrders\) \},\s*\{ label: "Today's Revenue", value: formatCur\(data\.summary\.totalRevenue\), isGreen: true \},/g, '');
    fs.writeFileSync(file4, c);
}
console.log('Metrics removed');
