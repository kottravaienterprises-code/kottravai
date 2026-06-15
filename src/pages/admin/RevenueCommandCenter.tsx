import { useState, useEffect, useCallback } from "react";
import {
  TrendingUp, TrendingDown, DollarSign, BarChart2, ShieldAlert,
  Zap, AlertTriangle, ChevronRight, RefreshCw, Download, Target,
  Bell, CalendarDays, ListChecks, MessagesSquare
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import ExecutiveCommandCenter from "./ExecutiveCommandCenter";

interface RevenueCommandCenterProps {
  API_BASE: string;
}

const COLORS = {
  green: "#10B981",
  amber: "#F59E0B",
  red: "#EF4444",
  purple: "#8B5CF6",
  blue: "#3B82F6",
  indigo: "#6366F1",
  emerald: "#059669",
};

const fmt = (n: number, prefix = "$") =>
  `${prefix}${Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

export default function RevenueCommandCenter({ API_BASE }: RevenueCommandCenterProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "forecast" | "risks" | "opportunities" | "ai">("overview");
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<any>(null);
  const [forecast, setForecast] = useState<any>(null);
  const [composition, setComposition] = useState<any>(null);
  const [risks, setRisks] = useState<any>(null);
  const [opportunities, setOpportunities] = useState<any>(null);
  const [copilot, setCopilot] = useState<any>(null);
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [forecastWindow, setForecastWindow] = useState("quarterly");
  const [boardReportLoading, setBoardReportLoading] = useState(false);
  const [executiveCenter, setExecutiveCenter] = useState<any>(null);
  const [executiveCenterLoading, setExecutiveCenterLoading] = useState(false);
  const [dispatchingReport, setDispatchingReport] = useState(false);

  const headers = { Authorization: `Bearer ${localStorage.getItem("adminToken")}`, "x-admin-secret": "Admin!Kottravai2025%100" };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [ovRes, compRes, riskRes, oppRes] = await Promise.all([
        fetch(`${API_BASE}/admin/revenue/dashboard`, { headers }),
        fetch(`${API_BASE}/admin/revenue/composition`, { headers }),
        fetch(`${API_BASE}/admin/revenue/risks`, { headers }),
        fetch(`${API_BASE}/admin/revenue/opportunities`, { headers }),
      ]);
      const [ov, comp, risk, opp] = await Promise.all([ovRes.json(), compRes.json(), riskRes.json(), oppRes.json()]);
      if (ov.success) setOverview(ov.data);
      if (comp.success) setComposition(comp.data);
      if (risk.success) setRisks(risk.data);
      if (opp.success) setOpportunities(opp.data);
    } catch (e) { console.error("Failed to fetch revenue data:", e); }
    setLoading(false);
  }, [API_BASE]);

  const fetchForecast = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/revenue/forecast?window=${forecastWindow}`, { headers });
      const data = await res.json();
      if (data.success) setForecast(data.data);
    } catch (e) { console.error("Failed to fetch forecast:", e); }
  }, [API_BASE, forecastWindow]);

  const fetchExecutiveCommandCenter = useCallback(async () => {
    setExecutiveCenterLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/revenue/executive/command-center`, { headers });
      const data = await res.json();
      if (data.success) setExecutiveCenter(data.data);
    } catch (e) { console.error("Failed to load executive command center:", e); }
    setExecutiveCenterLoading(false);
  }, [API_BASE]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => { fetchForecast(); }, [fetchForecast]);
  useEffect(() => { fetchExecutiveCommandCenter(); }, [fetchExecutiveCommandCenter]);

  const fetchCopilot = async () => {
    setCopilotLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/revenue/copilot/brief`, { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: "{}" });
      const data = await res.json();
      if (data.success) setCopilot(data.data);
    } catch (e) { console.error("Copilot failed:", e); }
    setCopilotLoading(false);
  };

  const downloadBoardReport = async () => {
    setBoardReportLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/revenue/board-report/export?timeframe=${forecastWindow}&format=csv`, { headers });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `board-report-${forecastWindow}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) { console.error("Export failed:", e); }
    setBoardReportLoading(false);
  };

  const dispatchExecutiveReport = async () => {
    setDispatchingReport(true);
    try {
      const res = await fetch(`${API_BASE}/admin/revenue/executive/report/dispatch`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ frequency: forecastWindow, recipient: localStorage.getItem("adminEmail") || "admin@kottravai.in" }),
      });
      await res.json();
      await fetchExecutiveCommandCenter();
    } catch (e) { console.error("Dispatch failed:", e); }
    setDispatchingReport(false);
  };

  const kpiCard = (label: string, value: string, sub?: string, trend?: "up" | "down" | "neutral", color = "indigo") => (
    <div className={`bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow`}>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{label}</p>
      <div className={`text-2xl font-bold text-${color}-600`}>{value}</div>
      {sub && (
        <div className="flex items-center gap-1 mt-1">
          {trend === "up" && <TrendingUp size={12} className="text-emerald-500" />}
          {trend === "down" && <TrendingDown size={12} className="text-rose-500" />}
          <span className={`text-xs ${trend === "up" ? "text-emerald-600" : trend === "down" ? "text-rose-600" : "text-gray-400"}`}>{sub}</span>
        </div>
      )}
    </div>
  );

  const tabs = [
    { id: "overview", label: "Revenue Overview", icon: DollarSign },
    { id: "forecast", label: "Forecast Engine", icon: Target },
    { id: "risks", label: "Risk Center", icon: ShieldAlert },
    { id: "opportunities", label: "Growth Opportunities", icon: TrendingUp },
    { id: "ai", label: "Executive AI", icon: Zap },
  ];

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                <BarChart2 size={20} />
              </div>
              <h1 className="text-2xl font-bold">Revenue Intelligence Platform</h1>
            </div>
            <p className="text-indigo-200 text-sm">Unified Sales, Renewal, Expansion & Churn Forecasting</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={forecastWindow}
              onChange={e => setForecastWindow(e.target.value)}
              className="bg-white/10 text-white border border-white/20 rounded-lg px-3 py-2 text-sm"
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </select>
            <button onClick={downloadBoardReport} disabled={boardReportLoading}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-4 py-2 rounded-lg text-sm transition-colors">
              <Download size={14} />
              {boardReportLoading ? "Exporting..." : "Board Pack CSV"}
            </button>
            <button onClick={fetchAll} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-3 py-2 rounded-lg text-sm transition-colors">
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* Summary KPI Bar */}
        {overview && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-6">
            {[
              { label: "ARR", value: fmt(overview.currentARR) },
              { label: "MRR", value: fmt(overview.currentMRR) },
              { label: "NRR", value: `${overview.nrr?.toFixed(1)}%` },
              { label: "GRR", value: `${overview.grr?.toFixed(1)}%` },
              { label: "Pipeline", value: fmt(overview.weightedPipeline) },
              { label: "Expansion ARR", value: fmt(overview.expansionARR) },
            ].map(k => (
              <div key={k.label} className="bg-white/10 rounded-xl p-3 text-center">
                <p className="text-indigo-200 text-xs mb-1">{k.label}</p>
                <p className="text-white font-bold text-base">{k.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === tab.id ? "bg-indigo-600 text-white shadow-md" : "bg-white text-gray-600 hover:bg-indigo-50 border border-gray-200"
            }`}>
            <tab.icon size={14} /> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "ai" && (
        <ExecutiveCommandCenter API_BASE={API_BASE} />
      )}

      {/* ── TAB: OVERVIEW ── */}
      {activeTab === "overview" && overview && composition && (
        <div className="space-y-6">
          {/* KPI Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {kpiCard("Current ARR", fmt(overview.currentARR), "Annual Recurring Revenue", "neutral", "indigo")}
            {kpiCard("NRR", `${overview.nrr?.toFixed(1)}%`, overview.nrr >= 100 ? "Above 100% — Healthy expansion" : "Below 100% — Monitor churn", overview.nrr >= 100 ? "up" : "down", overview.nrr >= 100 ? "emerald" : "red")}
            {kpiCard("GRR", `${overview.grr?.toFixed(1)}%`, "Gross Revenue Retention", overview.grr >= 85 ? "up" : "down", overview.grr >= 85 ? "emerald" : "amber")}
            {kpiCard("Expansion ARR", fmt(overview.expansionARR), "From won upsells", "up", "purple")}
            {kpiCard("Renewal ARR at Risk", fmt(overview.renewalARR), "Due in 90 days", "neutral", "amber")}
            {kpiCard("Churned ARR", fmt(overview.churnedARR), "Lost revenue", "down", "red")}
            {kpiCard("Avg NPS", String(overview.averageNPS ?? "N/A"), "Customer sentiment", "neutral", "blue")}
            {kpiCard("Renewal Rate", `${overview.renewalSuccessRate?.toFixed(1)}%`, "30-day renewal window", overview.renewalSuccessRate >= 80 ? "up" : "down", "indigo")}
          </div>

          {/* Revenue Composition Chart */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Revenue Composition (90-Day View)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={[
                      { name: "New Revenue", value: composition.newRevenue || 0 },
                      { name: "Renewal Revenue", value: composition.renewalRevenue || 0 },
                      { name: "Expansion Revenue", value: composition.expansionRevenue || 0 },
                      { name: "Churned Revenue", value: composition.churnedRevenue || 0 },
                    ]} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}>
                      {[COLORS.blue, COLORS.emerald, COLORS.purple, COLORS.red].map((color, i) => <Cell key={i} fill={color} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => fmt(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3">
                {[
                  { label: "New Revenue", value: composition.newRevenue, color: COLORS.blue },
                  { label: "Renewal Revenue", value: composition.renewalRevenue, color: COLORS.emerald },
                  { label: "Expansion Revenue", value: composition.expansionRevenue, color: COLORS.purple },
                  { label: "Churned Revenue", value: composition.churnedRevenue, color: COLORS.red },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ background: item.color }} />
                      <span className="text-sm text-gray-700">{item.label}</span>
                    </div>
                    <span className="font-bold text-sm text-gray-800">{fmt(item.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Monthly ARR Trend */}
          {composition.monthlyTrend?.length > 0 && (
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Monthly ARR Trend</h2>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={composition.monthlyTrend}>
                  <defs>
                    <linearGradient id="arrGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.indigo} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={COLORS.indigo} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: any) => fmt(v)} />
                  <Area type="monotone" dataKey="arr" stroke={COLORS.indigo} fill="url(#arrGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: FORECAST ── */}
      {activeTab === "forecast" && forecast && (
        <div className="space-y-6">
          {/* Forecast KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {kpiCard("Pipeline Forecast", fmt(forecast.pipelineForecast), "Weighted open pipeline", "up", "blue")}
            {kpiCard("Renewal Forecast", fmt(forecast.renewalForecast), "Probability-weighted", "up", "emerald")}
            {kpiCard("Expansion Forecast", fmt(forecast.expansionForecast), "Upsell pipeline weighted", "up", "purple")}
            {kpiCard("Expected Churn", fmt(forecast.expectedChurn), "Risk-adjusted loss", "down", "red")}
            {kpiCard("Unified Forecast", fmt(forecast.totalForecast), `${forecast.window} total`, "up", "indigo")}
          </div>

          {/* Confidence */}
          <div className={`rounded-2xl p-6 border shadow-sm ${
            forecast.confidence?.rating === "High" ? "bg-emerald-50 border-emerald-200" :
            forecast.confidence?.rating === "Medium" ? "bg-amber-50 border-amber-200" :
            "bg-rose-50 border-rose-200"
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Forecast Confidence</h2>
                <p className="text-sm text-gray-500">Based on pipeline coverage, renewal probability, health scores, and historical accuracy</p>
              </div>
              <div className="text-right">
                <div className={`text-4xl font-black ${
                  forecast.confidence?.rating === "High" ? "text-emerald-600" :
                  forecast.confidence?.rating === "Medium" ? "text-amber-600" : "text-rose-600"
                }`}>{forecast.confidence?.score}<span className="text-xl font-normal">/100</span></div>
                <div className={`text-sm font-bold uppercase ${
                  forecast.confidence?.rating === "High" ? "text-emerald-700" :
                  forecast.confidence?.rating === "Medium" ? "text-amber-700" : "text-rose-700"
                }`}>{forecast.confidence?.rating} Confidence</div>
              </div>
            </div>
            <div className="bg-white/60 rounded-xl p-4">
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full ${
                    forecast.confidence?.rating === "High" ? "bg-emerald-500" :
                    forecast.confidence?.rating === "Medium" ? "bg-amber-500" : "bg-rose-500"
                  }`}
                  style={{ width: `${forecast.confidence?.score || 0}%`, transition: "width 0.8s ease" }}
                />
              </div>
            </div>
            {forecast.forecastAccuracy !== null && (
              <p className="text-sm text-gray-600 mt-3">Historical Forecast Accuracy: <strong>{forecast.forecastAccuracy}%</strong></p>
            )}
          </div>

          {/* Forecast Breakdown Bar */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Forecast Composition Breakdown</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={[
                { name: "Pipeline", value: forecast.pipelineForecast, fill: COLORS.blue },
                { name: "Renewal", value: forecast.renewalForecast, fill: COLORS.emerald },
                { name: "Expansion", value: forecast.expansionForecast, fill: COLORS.purple },
                { name: "Churn (deduct)", value: -forecast.expectedChurn, fill: COLORS.red },
              ]} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={100} />
                <Tooltip formatter={(v: any) => fmt(Math.abs(v))} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {[COLORS.blue, COLORS.emerald, COLORS.purple, COLORS.red].map((color, i) => <Cell key={i} fill={color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── TAB: RISKS ── */}
      {activeTab === "risks" && risks && (
        <div className="space-y-6">
          {/* Risk Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {kpiCard("Risk Level", risks.riskLevel, `Score: ${risks.riskScore}/100`, risks.riskLevel === "High" ? "down" : "neutral", risks.riskLevel === "High" ? "red" : risks.riskLevel === "Medium" ? "amber" : "emerald")}
            {kpiCard("At-Risk ARR", fmt(risks.atRiskARR), "Immediate intervention needed", "down", "red")}
            {kpiCard("Critical Accounts", String(risks.criticalAccounts), "Health score < 50", "down", "rose")}
            {kpiCard("Churn Escalations", String(risks.churnEscalations), "Open escalation tickets", "down", "amber")}
          </div>

          {/* Risk Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800">Revenue Risk Registry</h2>
              <span className="text-sm text-gray-500">{risks.risks?.length || 0} active risks</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    {["Risk Type", "Entity", "ARR at Risk", "Risk Level", "Detail"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(risks.risks || []).map((risk: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          risk.riskLevel === "High" ? "bg-rose-100 text-rose-700" :
                          risk.riskLevel === "Medium" ? "bg-amber-100 text-amber-700" :
                          "bg-gray-100 text-gray-600"
                        }`}>{risk.type}</span>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">{risk.entity}</td>
                      <td className="px-4 py-3 text-sm font-bold text-gray-700">{fmt(risk.arr)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {risk.riskLevel === "High" && <AlertTriangle size={12} className="text-rose-500" />}
                          <span className={`text-xs font-bold ${
                            risk.riskLevel === "High" ? "text-rose-600" :
                            risk.riskLevel === "Medium" ? "text-amber-600" : "text-gray-500"
                          }`}>{risk.riskLevel}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">{risk.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!risks.risks || risks.risks.length === 0) && (
                <div className="text-center py-12 text-gray-400">
                  <ShieldAlert className="mx-auto mb-2 opacity-30" size={32} />
                  <p>No active risks detected. Revenue health is strong.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: OPPORTUNITIES ── */}
      {activeTab === "opportunities" && opportunities && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {kpiCard("Expansion Pipeline", fmt(opportunities.totalExpansionPipeline), "Total upsell opportunity value", "up", "purple")}
            {kpiCard("Open Upsells", String(opportunities.upsellOpportunities?.length || 0), "Active opportunities", "up", "blue")}
            {kpiCard("High-Health Accounts", String(opportunities.highHealthAccounts?.length || 0), "Score ≥ 80, prime for expansion", "up", "emerald")}
          </div>

          {/* Upsell Opportunities */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">Top Upsell Opportunities</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {(opportunities.upsellOpportunities || []).map((u: any) => (
                <div key={u.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div>
                    <div className="font-semibold text-gray-800 text-sm">{u.title}</div>
                    <div className="text-xs text-gray-500">{u.companyName} · Health Score: {u.accountHealthScore}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700`}>{u.status}</span>
                    <span className="font-bold text-indigo-700">{fmt(u.estimatedValue)}</span>
                    <ChevronRight size={14} className="text-gray-300" />
                  </div>
                </div>
              ))}
              {(!opportunities.upsellOpportunities || opportunities.upsellOpportunities.length === 0) && (
                <div className="text-center py-12 text-gray-400">
                  <Target className="mx-auto mb-2 opacity-30" size={32} />
                  <p>No open upsell opportunities. Create them from the CS portal.</p>
                </div>
              )}
            </div>
          </div>

          {/* High Health Accounts */}
          {opportunities.highHealthAccounts?.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-800">High-Health Accounts (Expansion Ready)</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                {opportunities.highHealthAccounts.map((a: any) => (
                  <div key={a.id} className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-gray-800 text-sm">{a.company_name}</span>
                      <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-200 text-emerald-800 font-bold">{a.health_score}</span>
                    </div>
                    <div className="text-xs text-gray-500">ARR: {fmt(a.arr)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Executive Command Center widgets */}
      {executiveCenterLoading && <p className="text-sm text-gray-500">Loading executive command center widgets...</p>}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Bell size={18} className="text-amber-500" />
              <h2 className="text-lg font-bold text-gray-800">Revenue Alerts</h2>
            </div>
            <span className="text-xs text-gray-500">Live evaluation</span>
          </div>
          <div className="space-y-3">
            {(executiveCenter?.alerts || []).slice(0, 4).map((alert: any, idx: number) => (
              <div key={idx} className="rounded-xl border border-gray-100 p-3 bg-gray-50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-800">{alert.category}</span>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${alert.severity === "Critical" ? "bg-rose-100 text-rose-700" : alert.severity === "High" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>{alert.severity}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
              </div>
            ))}
            {(!executiveCenter?.alerts || executiveCenter.alerts.length === 0) && <p className="text-sm text-gray-500">No active alerts at the moment.</p>}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CalendarDays size={18} className="text-indigo-500" />
              <h2 className="text-lg font-bold text-gray-800">Scheduled Reports</h2>
            </div>
            <button onClick={dispatchExecutiveReport} disabled={dispatchingReport} className="text-sm text-indigo-600 hover:text-indigo-700 font-semibold">
              {dispatchingReport ? "Dispatching..." : "Dispatch Now"}
            </button>
          </div>
          <div className="space-y-2">
            {(executiveCenter?.schedules || []).map((schedule: any) => (
              <div key={schedule.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
                <div>
                  <div className="text-sm font-semibold text-gray-800 uppercase">{schedule.frequency}</div>
                  <div className="text-xs text-gray-500">{schedule.recipient || "No recipient configured"}</div>
                </div>
                <span className="text-xs font-semibold text-emerald-600">{schedule.enabled ? "Enabled" : "Disabled"}</span>
              </div>
            ))}
            {(!executiveCenter?.schedules || executiveCenter.schedules.length === 0) && <p className="text-sm text-gray-500">Create a schedule from the executive automation API to populate this section.</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <ListChecks size={18} className="text-purple-500" />
            <h2 className="text-lg font-bold text-gray-800">Executive KPI Watchlists</h2>
          </div>
          <div className="space-y-2">
            {(executiveCenter?.watchlists || []).map((item: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
                <div>
                  <div className="text-sm font-semibold text-gray-800">{item.metric} {item.operator} {item.threshold}</div>
                  <div className="text-xs text-gray-500">Owner: {item.owner}</div>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${item.status === "Triggered" ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>{item.status}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <MessagesSquare size={18} className="text-sky-500" />
            <h2 className="text-lg font-bold text-gray-800">Executive Command Feed</h2>
          </div>
          <div className="space-y-2">
            {(executiveCenter?.feed || []).slice(0, 5).map((item: any) => (
              <div key={item.id} className="rounded-xl border border-gray-100 p-3 bg-gray-50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-800">{item.title}</span>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${item.severity === "Critical" ? "bg-rose-100 text-rose-700" : item.severity === "High" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700"}`}>{item.severity}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{item.summary}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Zap size={18} className="text-indigo-500" />
          <h2 className="text-lg font-bold text-gray-800">AI Executive Digest</h2>
        </div>
        {(executiveCenter?.digest?.sections || []).map((section: any) => (
          <div key={section.title} className="rounded-xl border border-gray-100 p-4 mb-3 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-800 mb-1">{section.title}</h3>
            <p className="text-sm text-gray-600">{section.body}</p>
          </div>
        ))}
      </div>

      {/* AI Executive Copilot — always visible at bottom */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-900 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
              <Zap size={18} />
            </div>
            <div>
              <h2 className="font-bold text-white">Executive Revenue Copilot</h2>
              <p className="text-indigo-300 text-xs">AI-grounded narrative from live revenue intelligence</p>
            </div>
          </div>
          {!copilot && !copilotLoading && (
            <button onClick={fetchCopilot}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm font-semibold transition-colors">
              Generate Executive Brief
            </button>
          )}
          {copilot && (
            <button onClick={fetchCopilot} disabled={copilotLoading}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-xs transition-colors flex items-center gap-1">
              <RefreshCw size={12} /> Refresh
            </button>
          )}
        </div>

        {copilotLoading && (
          <div className="flex items-center gap-3 text-indigo-200 py-4">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-300" />
            Analyzing revenue intelligence across all data layers...
          </div>
        )}

        {copilot && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 md:col-span-2">
              <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-2">Executive Summary</h3>
              <p className="text-sm text-white/90 leading-relaxed">{copilot.executiveSummary}</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-2">Forecast Narrative</h3>
              <p className="text-sm text-white/90 leading-relaxed">{copilot.forecastNarrative}</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-2">Board Highlights</h3>
              <ul className="space-y-1">
                {copilot.boardHighlights?.map((h: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-white/80">
                    <span className="text-indigo-400 font-bold mt-0.5">→</span> {h}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">Top Opportunities</h3>
              <ul className="space-y-1">
                {copilot.topOpportunities?.map((o: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-white/80">
                    <TrendingUp size={12} className="text-emerald-400 mt-0.5 flex-shrink-0" /> {o}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <h3 className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-2">Top Risks</h3>
              <ul className="space-y-1">
                {copilot.topRisks?.map((r: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-white/80">
                    <AlertTriangle size={12} className="text-rose-400 mt-0.5 flex-shrink-0" /> {r}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 md:col-span-2">
              <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">Recommended Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {copilot.recommendedActions?.map((a: string, i: number) => (
                  <div key={i} className="bg-white/5 rounded-lg p-3 text-sm text-white/80 border border-white/10">
                    <span className="text-amber-400 font-bold mr-1">{i + 1}.</span> {a}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {!copilot && !copilotLoading && (
          <p className="text-indigo-300/60 text-sm text-center py-4">Click "Generate Executive Brief" to produce an AI-grounded revenue narrative from live data.</p>
        )}
      </div>
    </div>
  );
}
