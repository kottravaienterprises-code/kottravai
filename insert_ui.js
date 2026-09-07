const fs = require('fs');
let c = fs.readFileSync('src/pages/admin/AdminDashboard.tsx', 'utf8');

const target = `<div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">
                      Category
                    </label>`;

const replacement = `<div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700">
                        Original Price (₹)
                      </label>
                      <input
                        type="number"
                        value={formData.originalPrice || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, originalPrice: e.target.value })
                        }
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-[#8E2A8B] focus:border-[#8E2A8B] outline-none transition-all"
                        placeholder="Optional. E.g. for sale campaigns"
                        disabled={isUploading}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700">
                        Campaign Tag
                      </label>
                      <input
                        type="text"
                        value={formData.campaignTag || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, campaignTag: e.target.value })
                        }
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-[#8E2A8B] focus:border-[#8E2A8B] outline-none transition-all"
                        placeholder="e.g. 70% OFF"
                        disabled={isUploading}
                      />
                    </div>
                  </div>
                  ` + target;

c = c.replace(target, replacement);

fs.writeFileSync('src/pages/admin/AdminDashboard.tsx', c);
