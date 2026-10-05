const fs = require('fs');
let c = fs.readFileSync('src/pages/admin/AdminDashboard.tsx', 'utf8');

// 1. Remove overview stats
c = c.replace(/\{\s*label:\s*"Total Revenue"[\s\S]*?bg:\s*"bg-emerald-50",\s*\},/g, '');
c = c.replace(/\{\s*label:\s*"Total Orders"[\s\S]*?bg:\s*"bg-blue-50",\s*\},/g, '');
c = c.replace(/lg:grid-cols-4/, 'lg:grid-cols-2');

// 2. Remove from orders tab
// Look for the specific grid element
const targetGrid = `<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <h4 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">
                      Total Orders
                    </h4>
                    <p className="text-3xl font-bold text-[#2D1B4E]">
                      {filteredOrders.length}
                    </p>
                  </div>
                  <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <h4 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">
                      Pending Processing
                    </h4>
                    <p className="text-3xl font-bold text-orange-500">
                      {filteredOrders.filter((o) => o.status === "Pending").length}
                    </p>
                  </div>
                  <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <h4 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">
                      Total Revenue
                    </h4>
                    <p className="text-3xl font-bold text-green-600">
                      ₹{totalRevenue.toLocaleString()}
                    </p>
                  </div>
                </div>`;

// Since spaces might be different, let's use a robust replace
c = c.replace(/<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">[\s\S]*?Total Revenue[\s\S]*?<\/div>\s*<\/div>/, `<div className="grid grid-cols-1 gap-6 mb-8">
                  <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <h4 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">
                      Pending Processing
                    </h4>
                    <p className="text-3xl font-bold text-orange-500">
                      {filteredOrders.filter((o) => o.status === "Pending").length}
                    </p>
                  </div>
                </div>`);

fs.writeFileSync('src/pages/admin/AdminDashboard.tsx', c);
console.log('done');
