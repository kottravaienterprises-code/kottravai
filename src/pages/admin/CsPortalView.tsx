import { useState, useEffect } from "react";
import {
  HeartHandshake,
  TrendingUp,
  AlertTriangle,
  Users,
  Search,
  ArrowUpRight,
  ShieldAlert,
  ChevronRight,
  DollarSign,
  BarChart,
  Zap,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from "recharts";

interface CsPortalViewProps {
  API_BASE: string;
}

export default function CsPortalView({ API_BASE }: CsPortalViewProps) {
  const [activeTab, setActiveTab] = useState<"dashboard" | "explorer" | "upsells">("dashboard");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [upsells, setUpsells] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [accountDetails, setAccountDetails] = useState<any>(null);
  const [copilotData, setCopilotData] = useState<any>(null);
  const [copilotLoading, setCopilotLoading] = useState(false);

  const fetchCopilotBrief = async (accountId: string) => {
    setCopilotLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/cs/copilot/account-brief`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("adminToken")}` 
        },
        body: JSON.stringify({ accountId })
      });
      const data = await res.json();
      if (data.success) setCopilotData(data.data);
    } catch (error) {
      console.error("Failed to fetch copilot brief:", error);
    } finally {
      setCopilotLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
    fetchAccounts();
    fetchUpsells();
  }, [API_BASE]);

  const fetchDashboardStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/cs/dashboard`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("adminToken")}` },
      });
      const data = await res.json();
      if (data.success) setStats(data.data);
    } catch (error) {
      console.error("Failed to fetch CS stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/cs/accounts`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("adminToken")}` },
      });
      const data = await res.json();
      if (data.success) setAccounts(data.data);
    } catch (error) {
      console.error("Failed to fetch accounts:", error);
    }
  };

  const fetchUpsells = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/cs/upsells`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("adminToken")}` },
      });
      const data = await res.json();
      if (data.success) setUpsells(data.data);
    } catch (error) {
      console.error("Failed to fetch upsells:", error);
    }
  };

  const fetchAccountDetails = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/admin/cs/accounts/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("adminToken")}` },
      });
      const data = await res.json();
      if (data.success) setAccountDetails(data.data);
    } catch (error) {
      console.error("Failed to fetch account details:", error);
    }
  };

  const handleAccountClick = (account: any) => {
    setSelectedAccount(account);
    setAccountDetails(null);
    setCopilotData(null);
    fetchAccountDetails(account.id);
  };

  const renderDashboard = () => {
    if (!stats) return null;

    const COLORS = ["#10B981", "#F59E0B", "#EF4444"];
    const healthData = [
      { name: "Healthy", value: stats.distributions.healthBreakdown.healthy },
      { name: "At Risk", value: stats.distributions.healthBreakdown.atRisk },
      { name: "Critical", value: stats.distributions.healthBreakdown.critical },
    ];

    return (
      <div className="space-y-6">
        {/* Top KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                <DollarSign size={24} />
              </div>
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                NRR {stats.summary.nrr}%
              </span>
            </div>
            <p className="text-gray-500 text-sm font-medium">Total ARR</p>
            <h3 className="text-3xl font-bold text-[#2D1B4E] mt-1">
              ${stats.summary.totalARR.toLocaleString()}
            </h3>
            <p className="text-xs text-gray-400 mt-2">
              MRR: ${stats.summary.totalMRR.toLocaleString()}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">
                <TrendingUp size={24} />
              </div>
              <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full">
                GRR {stats.summary.grr}%
              </span>
            </div>
            <p className="text-gray-500 text-sm font-medium">Expansion Revenue</p>
            <h3 className="text-3xl font-bold text-[#2D1B4E] mt-1">
              ${stats.summary.expansionRevenue.toLocaleString()}
            </h3>
            <p className="text-xs text-gray-400 mt-2">Upsells & Upgrades</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                <HeartHandshake size={24} />
              </div>
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                {stats.summary.averageNPS} Avg
              </span>
            </div>
            <p className="text-gray-500 text-sm font-medium">Net Promoter Score</p>
            <h3 className="text-3xl font-bold text-[#2D1B4E] mt-1">
              {stats.summary.averageNPS}
            </h3>
            <p className="text-xs text-gray-400 mt-2">Customer Satisfaction</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600">
                <AlertTriangle size={24} />
              </div>
              <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full">
                {stats.summary.renewalSuccessRate}% Success
              </span>
            </div>
            <p className="text-gray-500 text-sm font-medium">Churned Revenue</p>
            <h3 className="text-3xl font-bold text-[#2D1B4E] mt-1">
              ${stats.summary.churnedRevenue.toLocaleString()}
            </h3>
            <p className="text-xs text-gray-400 mt-2">Lost this period</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Health Distribution */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-[#2D1B4E] mb-6">Account Health</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={healthData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {healthData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-4">
              {healthData.map((item, index) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                  <span className="text-sm font-medium text-gray-600">{item.name} ({item.value})</span>
                </div>
              ))}
            </div>
          </div>

          {/* Churn Watchlist */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-[#2D1B4E] flex items-center gap-2">
                <ShieldAlert className="text-rose-500 w-5 h-5" />
                Churn Watchlist
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-gray-400 text-xs uppercase border-b border-gray-100">
                    <th className="pb-3 font-semibold">Account</th>
                    <th className="pb-3 font-semibold">Health Score</th>
                    <th className="pb-3 font-semibold">Risk Level</th>
                    <th className="pb-3 font-semibold">ARR</th>
                    <th className="pb-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {stats.watchlist.map((account: any) => (
                    <tr key={account.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                      <td className="py-4">
                        <div className="font-semibold text-[#2D1B4E]">{account.companyName}</div>
                        <div className="text-xs text-gray-500">{account.contactName}</div>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-12 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${account.healthScore < 50 ? 'bg-rose-500' : 'bg-amber-500'}`}
                              style={{ width: `${account.healthScore}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-gray-700">{account.healthScore}</span>
                        </div>
                      </td>
                      <td className="py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          account.churnProbability > 70 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {account.churnProbability}% Prob
                        </span>
                      </td>
                      <td className="py-4 font-medium text-gray-700">
                        ${Number(account.arr).toLocaleString()}
                      </td>
                      <td className="py-4 text-right">
                        <button 
                          onClick={() => handleAccountClick(account)}
                          className="p-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-purple-100 hover:text-purple-600 transition-colors"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {stats.watchlist.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-500">
                        No accounts currently at risk.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderExplorer = () => {
    const filteredAccounts = accounts.filter(a => 
      (a.company_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.contact_name || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
          <h3 className="text-lg font-bold text-[#2D1B4E]">Customer Explorer</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search accounts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#8E2A8B]/20 focus:border-[#8E2A8B] outline-none w-full md:w-64"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-gray-400 text-xs uppercase border-b border-gray-100">
                <th className="pb-3 font-semibold">Company</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold">Health Score</th>
                <th className="pb-3 font-semibold">CSM</th>
                <th className="pb-3 font-semibold">ARR</th>
                <th className="pb-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {filteredAccounts.map((account) => (
                <tr key={account.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="py-4">
                    <div className="font-semibold text-[#2D1B4E]">{account.company_name}</div>
                    <div className="text-xs text-gray-500">{account.contact_email}</div>
                  </td>
                  <td className="py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      account.status === 'Active' ? 'bg-emerald-100 text-emerald-700' :
                      account.status === 'Onboarding' ? 'bg-blue-100 text-blue-700' :
                      account.status === 'Churned' ? 'bg-rose-100 text-rose-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {account.status}
                    </span>
                  </td>
                  <td className="py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-12 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            account.health_score >= 80 ? 'bg-emerald-500' :
                            account.health_score >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${account.health_score}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-gray-700">{account.health_score}</span>
                    </div>
                  </td>
                  <td className="py-4 text-gray-600">
                    {account.csm_name || 'Unassigned'}
                  </td>
                  <td className="py-4 font-medium text-gray-700">
                    ${Number(account.arr || 0).toLocaleString()}
                  </td>
                  <td className="py-4 text-right">
                    <button 
                      onClick={() => handleAccountClick(account)}
                      className="text-purple-600 hover:text-purple-800 text-sm font-semibold"
                    >
                      View 360
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderUpsells = () => {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-bold text-[#2D1B4E] mb-6">Expansion & Upsell Pipeline</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {['Identified', 'In Progress', 'Won'].map(status => (
            <div key={status} className="bg-gray-50 rounded-xl p-4">
              <h4 className="font-bold text-gray-700 mb-4">{status}</h4>
              <div className="space-y-4">
                {upsells.filter(u => u.status === status).map(upsell => (
                  <div key={upsell.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                    <div className="text-sm font-bold text-[#2D1B4E]">{upsell.title}</div>
                    <div className="text-xs text-gray-500 mt-1">{upsell.company_name}</div>
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                        +${Number(upsell.estimated_value).toLocaleString()}
                      </span>
                      <button className="text-gray-400 hover:text-purple-600">
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderDrawer = () => {
    if (!selectedAccount) return null;

    return (
      <div className="fixed inset-0 z-50 flex justify-end bg-black/20 backdrop-blur-sm transition-opacity">
        <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col animate-slide-in-right">
          <div className="p-6 border-b border-gray-100 flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-2xl font-bold text-[#2D1B4E]">{selectedAccount.company_name || selectedAccount.companyName}</h2>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                  (selectedAccount.health_score || selectedAccount.healthScore) >= 80 ? 'bg-emerald-100 text-emerald-700' :
                  (selectedAccount.health_score || selectedAccount.healthScore) >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                }`}>
                  Score: {selectedAccount.health_score || selectedAccount.healthScore}
                </span>
              </div>
              <p className="text-sm text-gray-500">{selectedAccount.contact_email}</p>
            </div>
            <button 
              onClick={() => setSelectedAccount(null)}
              className="p-2 text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowUpRight className="w-5 h-5 rotate-45" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {/* KPI Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <p className="text-xs text-gray-500 mb-1">Annual Recurring Revenue</p>
                <div className="text-lg font-bold text-[#2D1B4E]">
                  ${Number(selectedAccount.arr || 0).toLocaleString()}
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <p className="text-xs text-gray-500 mb-1">Contract End Date</p>
                <div className="text-lg font-bold text-[#2D1B4E]">
                  {selectedAccount.contract_end_date ? new Date(selectedAccount.contract_end_date).toLocaleDateString() : 'N/A'}
                </div>
              </div>
            </div>

            {/* AI Copilot Action */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100 shadow-inner">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white">
                    <Zap size={16} />
                  </div>
                  <h3 className="font-bold text-[#2D1B4E]">CS AI Copilot</h3>
                </div>
                {!copilotData && !copilotLoading && (
                  <button
                    onClick={() => fetchCopilotBrief(selectedAccount.id)}
                    className="px-4 py-2 bg-white text-purple-600 font-semibold text-sm rounded-lg border border-purple-200 hover:bg-purple-50 transition-colors"
                  >
                    Generate Account Brief
                  </button>
                )}
              </div>

              {copilotLoading && (
                <div className="flex items-center gap-3 text-sm text-purple-600 font-medium py-4">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                  Analyzing account history and generating brief...
                </div>
              )}

              {copilotData && (
                <div className="space-y-4 mt-4 animate-fade-in">
                  <div>
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Executive Summary</h4>
                    <p className="text-sm text-gray-800 bg-white p-3 rounded-lg border border-purple-100">{copilotData.accountSummary}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Churn Risk Analysis</h4>
                      <p className="text-sm text-gray-800 bg-white p-3 rounded-lg border border-purple-100">{copilotData.churnRiskExplanation}</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Renewal Strategy</h4>
                      <p className="text-sm text-gray-800 bg-white p-3 rounded-lg border border-purple-100">{copilotData.renewalStrategy}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Expansion Opportunities</h4>
                      <ul className="space-y-2">
                        {copilotData.expansionOpportunities.map((opp: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-800 bg-white p-2 rounded border border-purple-50">
                            <TrendingUp size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                            <span>{opp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Next Best Actions</h4>
                      <ul className="space-y-2">
                        {copilotData.nextBestActions.map((action: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-800 bg-white p-2 rounded border border-purple-50">
                            <ChevronRight size={14} className="text-purple-500 mt-0.5 flex-shrink-0" />
                            <span>{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {accountDetails ? (
              <>
                {/* Health Trend */}
                {accountDetails.healthHistory.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-[#2D1B4E] mb-4">Health Trend</h3>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={accountDetails.healthHistory}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                          <XAxis 
                            dataKey="recorded_at" 
                            tickFormatter={(tick) => new Date(tick).toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 12, fill: '#6B7280' }}
                          />
                          <YAxis 
                            domain={[0, 100]}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 12, fill: '#6B7280' }}
                          />
                          <Tooltip 
                            labelFormatter={(label) => new Date(label).toLocaleDateString()}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="score" 
                            stroke="#8E2A8B" 
                            strokeWidth={3}
                            dot={{ r: 4, fill: '#8E2A8B', strokeWidth: 2, stroke: '#FFF' }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Unified Timeline */}
                <div>
                  <h3 className="text-sm font-bold text-[#2D1B4E] mb-4">Activity Timeline</h3>
                  <div className="relative border-l-2 border-gray-100 ml-3 space-y-6">
                    {accountDetails.timeline.map((event: any, i: number) => (
                      <div key={i} className="relative pl-6">
                        <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white bg-purple-500" />
                        <div className="text-sm font-bold text-gray-800">{event.event_type}</div>
                        <div className="text-xs text-gray-400 mb-1">{new Date(event.timestamp).toLocaleString()}</div>
                        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg mt-2">
                          {event.description}
                        </div>
                      </div>
                    ))}
                    {accountDetails.timeline.length === 0 && (
                      <div className="text-sm text-gray-500 pl-6">No activities recorded yet.</div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Tabs */}
      <div className="flex gap-2 p-1 bg-gray-100/50 rounded-xl w-fit">
        {[
          { id: "dashboard", label: "Executive Dashboard", icon: BarChart },
          { id: "explorer", label: "Account Explorer", icon: Users },
          { id: "upsells", label: "Expansion Pipeline", icon: TrendingUp },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === t.id
                ? "bg-white text-[#2D1B4E] shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "dashboard" && renderDashboard()}
      {activeTab === "explorer" && renderExplorer()}
      {activeTab === "upsells" && renderUpsells()}

      {renderDrawer()}
    </div>
  );
}
