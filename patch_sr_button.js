const fs = require('fs');
let c = fs.readFileSync('src/pages/admin/AdminDashboard.tsx', 'utf8');

const searchStr = `                            {!order.shiprocketOrderId && (
                              <button
                                onClick={() => handleShiprocketPush(order)}`;

const replaceStr = `                            {true && (
                              <button
                                onClick={() => handleShiprocketPush(order)}`;

if (c.includes(searchStr)) {
    c = c.replace(searchStr, replaceStr);
    fs.writeFileSync('src/pages/admin/AdminDashboard.tsx', c);
    console.log("Patched AdminDashboard.tsx to always show Shiprocket button");
} else {
    console.log("Could not find the target string");
}
