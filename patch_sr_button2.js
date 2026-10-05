const fs = require('fs');
let c = fs.readFileSync('src/pages/admin/AdminDashboard.tsx', 'utf8');

c = c.replace(/{!order\.shiprocketOrderId && \(\s*<button\s*onClick={\(\) => handleShiprocketPush\(order\)}/g, 
  "{true && (\n                              <button\n                                onClick={() => handleShiprocketPush(order)}");

fs.writeFileSync('src/pages/admin/AdminDashboard.tsx', c);
console.log("Done");
