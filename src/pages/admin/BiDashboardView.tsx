import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import {
  Sparkles,
  BarChart3,
  Plus,
  Trash2,
  Edit2,
  Grid,
  Layers
} from "lucide-react";

interface BiDashboardViewProps {
  API_BASE: string;
}

export default function BiDashboardView({ API_BASE }: BiDashboardViewProps) {
  // Tabs: 'reports' or 'builder'
  const [subTab, setSubTab] = useState<"reports" | "builder">("reports");
  
  // Reports Sub-Tabs: 'cohorts' | 'winloss' | 'benchmarking' | 'forecast'
  const [reportSubTab, setReportSubTab] = useState<"cohorts" | "winloss" | "benchmarking" | "forecast">("cohorts");

  // Loading & Error States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Data States
  const [cohortsData, setCohortsData] = useState<any[]>([]);
  const [winLossData, setWinLossData] = useState<any>({ byIndustry: [], bySource: [], byDealSize: [], lossReasons: [] });
  const [benchmarkingData, setBenchmarkingData] = useState<any>({ representatives: [], teamMedians: {}, teamAverages: {} });
  const [forecastTrends, setForecastTrends] = useState<any[]>([]);
  const [forecastPeriod, setForecastPeriod] = useState<"monthly" | "quarterly" | "yearly">("monthly");

  // Dashboard Builder States
  const [dashboards, setDashboards] = useState<any[]>([]);
  const [selectedDashId, setSelectedDashId] = useState<string>("");
  const [currentDashData, setCurrentDashData] = useState<any>(null);
  const [widgetsData, setWidgetsData] = useState<{ [widgetId: string]: any }>({});
  const [loadingWidgets, setLoadingWidgets] = useState(false);

  // Modal States
  const [showDashModal, setShowDashModal] = useState(false);
  const [dashTitle, setDashTitle] = useState("");
  const [dashDesc, setDashDesc] = useState("");
  const [dashEditId, setDashEditId] = useState<string | null>(null);

  const [showWidgetModal, setShowWidgetModal] = useState(false);
  const [widgetTitle, setWidgetTitle] = useState("");
  const [widgetType, setWidgetType] = useState("bar");
  const [widgetMetric, setWidgetMetric] = useState("lead_count");
  const [widgetGroupBy, setWidgetGroupBy] = useState("sales_stage");
  const [widgetDateRange, setWidgetDateRange] = useState("all");
  const [widgetFilters, setWidgetFilters] = useState({ team: "", sales_stage: "" });
  const [widgetEditId, setWidgetEditId] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Colors Palette
  const PIE_COLORS = ["#8E2A8B", "#FF6B6B", "#4D96FF", "#6BCB77", "#FFD93D", "#9B59B6", "#1ABC9C", "#34495E"];

  // Headers helper
  const getHeaders = () => {
    const token = sessionStorage.getItem("kottravai_admin_token") || "";
    const headers: any = {};
    if (token.startsWith("eyJ")) {
      headers["Authorization"] = `Bearer ${token}`;
    } else {
      headers["X-Admin-Secret"] = token;
    }
    return headers;
  };

  // Fetch Analytical Reports Data
  const fetchReportsData = async () => {
    setLoading(true);
    setError("");
    const headers = getHeaders();
    try {
      if (reportSubTab === "cohorts") {
        const res = await axios.get(`${API_BASE}/api/admin/bi/cohorts`, { headers });
        if (res.data.success) setCohortsData(res.data.data);
      } else if (reportSubTab === "winloss") {
        const res = await axios.get(`${API_BASE}/api/admin/bi/win-loss`, { headers });
        if (res.data.success) setWinLossData(res.data.data);
      } else if (reportSubTab === "benchmarking") {
        const res = await axios.get(`${API_BASE}/api/admin/bi/benchmarking`, { headers });
        if (res.data.success) setBenchmarkingData(res.data.data);
      } else if (reportSubTab === "forecast") {
        const res = await axios.get(`${API_BASE}/api/admin/bi/forecast-trends?period=${forecastPeriod}`, { headers });
        if (res.data.success) setForecastTrends(res.data.data);
      }
    } catch (err: any) {
      console.error("Fetch reports error:", err);
      setError(err.response?.data?.error || "Failed to retrieve analytical reports data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (subTab === "reports") {
      fetchReportsData();
    }
  }, [reportSubTab, subTab, forecastPeriod]);

  // Fetch Dashboards List
  const fetchDashboards = async () => {
    const headers = getHeaders();
    try {
      const res = await axios.get(`${API_BASE}/api/admin/bi/dashboards`, { headers });
      if (res.data.success && res.data.data.length > 0) {
        setDashboards(res.data.data);
        if (!selectedDashId) {
          setSelectedDashId(res.data.data[0].id);
        }
      }
    } catch (err) {
      console.error("Fetch dashboards list error:", err);
    }
  };

  useEffect(() => {
    if (subTab === "builder") {
      fetchDashboards();
    }
  }, [subTab]);

  // Fetch Dashboard Details & Widgets
  const fetchDashboardDetails = async () => {
    if (!selectedDashId) return;
    setLoadingWidgets(true);
    const headers = getHeaders();
    try {
      const res = await axios.get(`${API_BASE}/api/admin/bi/dashboards/${selectedDashId}`, { headers });
      if (res.data.success) {
        setCurrentDashData(res.data.data);
        const widgets = res.data.data.widgets || [];
        
        // Fetch previews for each widget concurrently
        const previews: { [id: string]: any } = {};
        await Promise.all(
          widgets.map(async (widget: any) => {
            try {
              const previewRes = await axios.post(
                `${API_BASE}/api/admin/bi/widgets/preview`,
                { config: widget.query_config },
                { headers }
              );
              if (previewRes.data.success) {
                previews[widget.id] = previewRes.data.data;
              }
            } catch (pErr) {
              console.error(`Preview error for widget ${widget.id}:`, pErr);
              previews[widget.id] = null;
            }
          })
        );
        setWidgetsData(previews);
      }
    } catch (err) {
      console.error("Fetch dashboard details error:", err);
    } finally {
      setLoadingWidgets(false);
    }
  };

  useEffect(() => {
    if (subTab === "builder" && selectedDashId) {
      fetchDashboardDetails();
    }
  }, [selectedDashId, subTab]);

  // Run Widget Live Preview
  const runLivePreview = async () => {
    setLoadingPreview(true);
    setPreviewData(null);
    const headers = getHeaders();
    try {
      const config = {
        metric: widgetMetric,
        groupBy: widgetGroupBy,
        dateRange: widgetDateRange,
        filters: widgetFilters
      };
      const res = await axios.post(`${API_BASE}/api/admin/bi/widgets/preview`, { config }, { headers });
      if (res.data.success) {
        setPreviewData(res.data.data);
      }
    } catch (err: any) {
      alert(`Live Preview failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoadingPreview(false);
    }
  };

  // Dashboard Create/Edit Submit
  const handleDashSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const headers = getHeaders();
    try {
      if (dashEditId) {
        // Edit Dashboard info
        const res = await axios.put(`${API_BASE}/api/admin/bi/dashboards/${dashEditId}`, {
          title: dashTitle,
          description: dashDesc
        }, { headers });
        if (res.data.success) {
          alert("Dashboard updated successfully!");
          fetchDashboards();
          setShowDashModal(false);
        }
      } else {
        // Create Dashboard
        const res = await axios.post(`${API_BASE}/api/admin/bi/dashboards`, {
          title: dashTitle,
          description: dashDesc
        }, { headers });
        if (res.data.success) {
          alert("Dashboard created successfully!");
          setSelectedDashId(res.data.data.id);
          fetchDashboards();
          setShowDashModal(false);
        }
      }
    } catch (err: any) {
      alert(`Dashboard Save failed: ${err.response?.data?.error || err.message}`);
    }
  };

  // Delete Dashboard
  const handleDeleteDashboard = async () => {
    if (!selectedDashId) return;
    if (!window.confirm("Are you sure you want to delete this custom dashboard? This action is irreversible.")) return;
    const headers = getHeaders();
    try {
      const res = await axios.delete(`${API_BASE}/api/admin/bi/dashboards/${selectedDashId}`, { headers });
      if (res.data.success) {
        alert("Dashboard deleted successfully.");
        setSelectedDashId("");
        setCurrentDashData(null);
        fetchDashboards();
      }
    } catch (err: any) {
      alert(`Delete dashboard failed: ${err.response?.data?.error || err.message}`);
    }
  };

  // Widget Submit Add/Edit
  const handleWidgetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDashId) return;
    const headers = getHeaders();
    const widgetPayload = {
      title: widgetTitle,
      type: widgetType,
      metric: widgetMetric,
      query_config: {
        metric: widgetMetric,
        groupBy: widgetGroupBy,
        dateRange: widgetDateRange,
        filters: widgetFilters
      }
    };
    try {
      if (widgetEditId) {
        const res = await axios.put(
          `${API_BASE}/api/admin/bi/dashboards/${selectedDashId}/widgets/${widgetEditId}`,
          widgetPayload,
          { headers }
        );
        if (res.data.success) {
          alert("Widget updated successfully!");
          fetchDashboardDetails();
          setShowWidgetModal(false);
        }
      } else {
        const res = await axios.post(
          `${API_BASE}/api/admin/bi/dashboards/${selectedDashId}/widgets`,
          widgetPayload,
          { headers }
        );
        if (res.data.success) {
          alert("Widget added successfully!");
          fetchDashboardDetails();
          setShowWidgetModal(false);
        }
      }
    } catch (err: any) {
      alert(`Widget Save failed: ${err.response?.data?.error || err.message}`);
    }
  };

  // Delete Widget
  const handleDeleteWidget = async (widgetId: string) => {
    if (!selectedDashId) return;
    if (!window.confirm("Are you sure you want to remove this widget from the dashboard?")) return;
    const headers = getHeaders();
    try {
      const res = await axios.delete(
        `${API_BASE}/api/admin/bi/dashboards/${selectedDashId}/widgets/${widgetId}`,
        { headers }
      );
      if (res.data.success) {
        fetchDashboardDetails();
      }
    } catch (err: any) {
      alert(`Delete widget failed: ${err.response?.data?.error || err.message}`);
    }
  };

  // Heatmap Color Scale Generator
  const getCohortColor = (pct: number) => {
    if (pct === 0) return "bg-gray-100 text-gray-400";
    if (pct < 10) return "bg-[#8E2A8B]/10 text-[#8E2A8B] font-bold";
    if (pct < 30) return "bg-[#8E2A8B]/20 text-[#8E2A8B] font-bold";
    if (pct < 50) return "bg-[#8E2A8B]/45 text-white font-extrabold";
    if (pct < 75) return "bg-[#8E2A8B]/70 text-white font-black";
    return "bg-[#8E2A8B] text-white font-black";
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Tab Navigation header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-100 pb-4 gap-4">
        <div className="flex bg-[#2D1B4E]/5 p-1 rounded-xl">
          <button
            onClick={() => setSubTab("reports")}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              subTab === "reports" ? "bg-[#2D1B4E] text-white shadow-md" : "text-[#2D1B4E] hover:bg-gray-100"
            }`}
          >
            <BarChart3 size={14} /> Analytical BI Reports
          </button>
          <button
            onClick={() => setSubTab("builder")}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              subTab === "builder" ? "bg-[#2D1B4E] text-white shadow-md" : "text-[#2D1B4E] hover:bg-gray-100"
            }`}
          >
            <Grid size={14} /> Custom Dashboard Builder
          </button>
        </div>

        {subTab === "reports" && (
          <div className="flex gap-1 bg-white p-1 rounded-lg border border-gray-100 shadow-sm max-w-full overflow-x-auto">
            <button
              onClick={() => setReportSubTab("cohorts")}
              className={`px-3 py-1.5 rounded text-[11px] font-bold whitespace-nowrap transition-colors ${
                reportSubTab === "cohorts" ? "bg-[#8E2A8B]/10 text-[#8E2A8B]" : "text-gray-500 hover:text-[#8E2A8B]"
              }`}
            >
              Cohort Conversion
            </button>
            <button
              onClick={() => setReportSubTab("winloss")}
              className={`px-3 py-1.5 rounded text-[11px] font-bold whitespace-nowrap transition-colors ${
                reportSubTab === "winloss" ? "bg-[#8E2A8B]/10 text-[#8E2A8B]" : "text-gray-500 hover:text-[#8E2A8B]"
              }`}
            >
              Win/Loss Intelligence
            </button>
            <button
              onClick={() => setReportSubTab("benchmarking")}
              className={`px-3 py-1.5 rounded text-[11px] font-bold whitespace-nowrap transition-colors ${
                reportSubTab === "benchmarking" ? "bg-[#8E2A8B]/10 text-[#8E2A8B]" : "text-gray-500 hover:text-[#8E2A8B]"
              }`}
            >
              Sales Benchmarking
            </button>
            <button
              onClick={() => setReportSubTab("forecast")}
              className={`px-3 py-1.5 rounded text-[11px] font-bold whitespace-nowrap transition-colors ${
                reportSubTab === "forecast" ? "bg-[#8E2A8B]/10 text-[#8E2A8B]" : "text-gray-500 hover:text-[#8E2A8B]"
              }`}
            >
              Forecast Trends
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-xs font-bold p-3 rounded-lg border border-red-100 flex items-center gap-2">
          <span>⚠️ {error}</span>
        </div>
      )}

      {/* SUBTAB 1: ANALYTICAL REPORTS */}
      {subTab === "reports" && (
        <div className="space-y-6">
          {loading ? (
            <div className="text-center py-20 bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent text-[#2D1B4E] rounded-full" />
              <p className="text-xs text-gray-400 mt-2 font-bold uppercase tracking-wider">Analyzing datasets...</p>
            </div>
          ) : (
            <>
              {/* Cohort Heatmap view */}
              {reportSubTab === "cohorts" && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
                  <div className="flex justify-between items-start border-b border-gray-100 pb-3">
                    <div>
                      <h3 className="text-[#2D1B4E] font-black text-sm uppercase tracking-wider">Monthly Lead Cohort Conversion Matrix</h3>
                      <p className="text-[11px] text-gray-400 mt-0.5">Heatmap tracking what percentage of leads created in a cohort reach Qualified or Closed Won stages over 30-day relative intervals.</p>
                    </div>
                    <span className="text-[10px] uppercase font-black px-2 py-1 bg-[#8E2A8B]/10 text-[#8E2A8B] rounded">Rolling 12 Months</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px] text-left border-collapse">
                      <thead>
                        <tr className="border-b border-gray-100 text-gray-400 uppercase font-black text-[9px] tracking-wider bg-gray-50/50">
                          <th className="py-2.5 px-3">Cohort Month</th>
                          <th className="py-2.5 px-3 text-center">Cohort Size</th>
                          <th className="py-2.5 px-3 text-center border-l border-gray-100 bg-amber-50/20 text-amber-700">Qualify M0 (0-30d)</th>
                          <th className="py-2.5 px-3 text-center bg-amber-50/20 text-amber-700">Qualify M1 (31-60d)</th>
                          <th className="py-2.5 px-3 text-center bg-amber-50/20 text-amber-700">Qualify M2 (61d+)</th>
                          <th className="py-2.5 px-3 text-center border-l border-gray-100 bg-emerald-50/20 text-emerald-700">Won M0 (0-30d)</th>
                          <th className="py-2.5 px-3 text-center bg-emerald-50/20 text-emerald-700">Won M1 (31-60d)</th>
                          <th className="py-2.5 px-3 text-center bg-emerald-50/20 text-emerald-700">Won M2 (61-90d)</th>
                          <th className="py-2.5 px-3 text-center bg-emerald-50/20 text-emerald-700">Won M3 (91d+)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cohortsData.length > 0 ? (
                          cohortsData.map((row) => (
                            <tr key={row.cohort} className="border-b border-gray-50 hover:bg-gray-50/30 transition-colors">
                              <td className="py-2.5 px-3 font-bold text-[#2D1B4E]">{row.cohort}</td>
                              <td className="py-2.5 px-3 text-center font-bold text-gray-500">{row.size}</td>
                              
                              {/* Qualify */}
                              <td className={`py-2.5 px-3 text-center border-l border-gray-100 ${getCohortColor(row.qualified.m0)}`}>{row.qualified.m0}%</td>
                              <td className={`py-2.5 px-3 text-center ${getCohortColor(row.qualified.m1)}`}>{row.qualified.m1}%</td>
                              <td className={`py-2.5 px-3 text-center ${getCohortColor(row.qualified.m2)}`}>{row.qualified.m2}%</td>
                              
                              {/* Won */}
                              <td className={`py-2.5 px-3 text-center border-l border-gray-100 ${getCohortColor(row.won.m0)}`}>{row.won.m0}%</td>
                              <td className={`py-2.5 px-3 text-center ${getCohortColor(row.won.m1)}`}>{row.won.m1}%</td>
                              <td className={`py-2.5 px-3 text-center ${getCohortColor(row.won.m2)}`}>{row.won.m2}%</td>
                              <td className={`py-2.5 px-3 text-center ${getCohortColor(row.won.m3)}`}>{row.won.m3}%</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={9} className="text-center py-8 text-gray-400">No cohort data available. Please generate stage history transitions to seed.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Win/Loss Intelligence view */}
              {reportSubTab === "winloss" && (
                <div className="space-y-6">
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm border-l-4 border-l-[#8E2A8B]">
                      <h4 className="text-gray-400 text-[10px] font-black uppercase tracking-wider">Top Loss Category</h4>
                      <p className="text-xl font-black text-[#2D1B4E] mt-1">
                        {winLossData.lossReasons?.[0]?.reason || "N/A"} ({winLossData.lossReasons?.[0]?.count || 0} Deals)
                      </p>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm border-l-4 border-l-emerald-500">
                      <h4 className="text-gray-400 text-[10px] font-black uppercase tracking-wider">Highest Conversion Industry</h4>
                      <p className="text-xl font-black text-emerald-600 mt-1">
                        {winLossData.byIndustry?.sort((a: any, b: any) => b.winRate - a.winRate)?.[0]?.key || "N/A"} ({winLossData.byIndustry?.sort((a: any, b: any) => b.winRate - a.winRate)?.[0]?.winRate || 0}%)
                      </p>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm border-l-4 border-l-indigo-500">
                      <h4 className="text-gray-400 text-[10px] font-black uppercase tracking-wider">Optimal Lead Source</h4>
                      <p className="text-xl font-black text-indigo-600 mt-1">
                        {winLossData.bySource?.sort((a: any, b: any) => b.winRate - a.winRate)?.[0]?.key || "N/A"} ({winLossData.bySource?.sort((a: any, b: any) => b.winRate - a.winRate)?.[0]?.winRate || 0}%)
                      </p>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm border-l-4 border-l-amber-500">
                      <h4 className="text-gray-400 text-[10px] font-black uppercase tracking-wider">Enterprise Win Rate</h4>
                      <p className="text-xl font-black text-[#2D1B4E] mt-1">
                        {winLossData.byDealSize?.find((s: any) => s.key === "High (>$100k)")?.winRate || 0}%
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Loss Reason Classification Chart */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
                      <h3 className="text-[#2D1B4E] font-black text-sm uppercase tracking-wider">Loss Reason Classifier</h3>
                      <p className="text-[10px] text-gray-400">Classified using close notes keywords across lost leads.</p>
                      
                      <div className="flex flex-col md:flex-row items-center gap-6">
                        <div className="w-full md:w-1/2 h-56">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={winLossData.lossReasons}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={2}
                                dataKey="count"
                                nameKey="reason"
                              >
                                {winLossData.lossReasons?.map((_: any, index: number) => (
                                  <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip contentStyle={{ fontSize: 10 }} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="w-full md:w-1/2 space-y-2">
                          {winLossData.lossReasons?.map((item: any, index: number) => (
                            <div key={item.reason} className="flex justify-between items-center text-[10px]">
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                                <span className="font-bold text-gray-600">{item.reason}</span>
                              </div>
                              <span className="font-black text-[#2D1B4E] bg-gray-50 px-2 py-0.5 rounded">{item.count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Win Rate by Industry */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
                      <h3 className="text-[#2D1B4E] font-black text-sm uppercase tracking-wider">Win Rate by Industry</h3>
                      <p className="text-[10px] text-gray-400">Average win rate percentages grouped by sector.</p>
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={winLossData.byIndustry}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                            <XAxis dataKey="key" tick={{ fontSize: 9 }} stroke="#9CA3AF" />
                            <YAxis tick={{ fontSize: 9 }} stroke="#9CA3AF" unit="%" />
                            <Tooltip contentStyle={{ fontSize: 10 }} />
                            <Bar dataKey="winRate" name="Win Rate" fill="#8E2A8B" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Win Rate by Lead Source */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
                      <h3 className="text-[#2D1B4E] font-black text-sm uppercase tracking-wider">Win Rate by Lead Source</h3>
                      <p className="text-[10px] text-gray-400">Marketing attribution channel performance conversion rates.</p>
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={winLossData.bySource}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                            <XAxis dataKey="key" tick={{ fontSize: 9 }} stroke="#9CA3AF" />
                            <YAxis tick={{ fontSize: 9 }} stroke="#9CA3AF" unit="%" />
                            <Tooltip contentStyle={{ fontSize: 10 }} />
                            <Bar dataKey="winRate" name="Win Rate" fill="#4D96FF" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Win Rate by Deal Size */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
                      <h3 className="text-[#2D1B4E] font-black text-sm uppercase tracking-wider">Win Rate by Deal Size</h3>
                      <p className="text-[10px] text-gray-400">Closing efficiencies across deal size categories.</p>
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={winLossData.byDealSize}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                            <XAxis dataKey="key" tick={{ fontSize: 9 }} stroke="#9CA3AF" />
                            <YAxis tick={{ fontSize: 9 }} stroke="#9CA3AF" unit="%" />
                            <Tooltip contentStyle={{ fontSize: 10 }} />
                            <Bar dataKey="winRate" name="Win Rate" fill="#6BCB77" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Benchmarking view */}
              {reportSubTab === "benchmarking" && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-6">
                  <div className="border-b border-gray-100 pb-3 flex justify-between items-center">
                    <div>
                      <h3 className="text-[#2D1B4E] font-black text-sm uppercase tracking-wider">Representative Performance Benchmarking</h3>
                      <p className="text-[10px] text-gray-400">Comparing agent sales velocity, closures, and activities against calculated team medians.</p>
                    </div>
                    <div className="text-[10px] font-bold text-gray-500 bg-gray-50 px-3 py-1 rounded-lg border border-gray-100">
                      Team Median Win Rate: <span className="font-extrabold text-[#8E2A8B]">{Math.round(benchmarkingData.teamMedians?.winRate || 0)}%</span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px] border-collapse">
                      <thead>
                        <tr className="border-b border-gray-100 text-gray-400 uppercase font-black text-[9px] tracking-wider bg-gray-50/50">
                          <th className="py-3 px-3">Sales Agent</th>
                          <th className="py-3 px-3">Team Scope</th>
                          <th className="py-3 px-3 text-right">Revenue Closed</th>
                          <th className="py-3 px-3 text-center">Win Rate</th>
                          <th className="py-3 px-3 text-right">Avg Deal Size</th>
                          <th className="py-3 px-3 text-center">Calls Logged</th>
                          <th className="py-3 px-3 text-center">Emails Sent</th>
                          <th className="py-3 px-3 text-center">Avg Days in Stage</th>
                        </tr>
                      </thead>
                      <tbody>
                        {benchmarkingData.representatives?.length > 0 ? (
                          benchmarkingData.representatives.map((rep: any) => (
                            <tr key={rep.id} className="border-b border-gray-50 hover:bg-gray-50/30 transition-colors">
                              <td className="py-3 px-3 font-bold text-[#2D1B4E]">{rep.representative}</td>
                              <td className="py-3 px-3 text-gray-500 font-bold">{rep.team || "Global"}</td>
                              
                              {/* Revenue Closed */}
                              <td className="py-3 px-3 text-right font-black">
                                <div>${rep.revenueClosed?.toLocaleString()}</div>
                                <span className={`text-[8px] font-bold uppercase ${
                                  rep.ratings?.revenueClosed === "Above Average" ? "text-emerald-500" : rep.ratings?.revenueClosed === "Below Average" ? "text-rose-500" : "text-gray-400"
                                }`}>{rep.ratings?.revenueClosed}</span>
                              </td>

                              {/* Win Rate */}
                              <td className="py-3 px-3 text-center">
                                <div className="font-bold">{Math.round(rep.winRate)}%</div>
                                <span className={`text-[8px] font-bold uppercase ${
                                  rep.ratings?.winRate === "Above Average" ? "text-emerald-500" : rep.ratings?.winRate === "Below Average" ? "text-rose-500" : "text-gray-400"
                                }`}>{rep.ratings?.winRate}</span>
                              </td>

                              {/* Avg Deal Size */}
                              <td className="py-3 px-3 text-right">
                                <div className="font-bold">${Math.round(rep.avgDealSize)?.toLocaleString()}</div>
                                <span className={`text-[8px] font-bold uppercase ${
                                  rep.ratings?.avgDealSize === "Above Average" ? "text-emerald-500" : rep.ratings?.avgDealSize === "Below Average" ? "text-rose-500" : "text-gray-400"
                                }`}>{rep.ratings?.avgDealSize}</span>
                              </td>

                              {/* Calls Logged */}
                              <td className="py-3 px-3 text-center">
                                <div className="font-bold">{rep.callsLogged}</div>
                                <span className={`text-[8px] font-bold uppercase ${
                                  rep.ratings?.callsLogged === "Above Average" ? "text-emerald-500" : rep.ratings?.callsLogged === "Below Average" ? "text-rose-500" : "text-gray-400"
                                }`}>{rep.ratings?.callsLogged}</span>
                              </td>

                              {/* Emails Sent */}
                              <td className="py-3 px-3 text-center">
                                <div className="font-bold">{rep.emailsSent}</div>
                                <span className={`text-[8px] font-bold uppercase ${
                                  rep.ratings?.emailsSent === "Above Average" ? "text-emerald-500" : rep.ratings?.emailsSent === "Below Average" ? "text-rose-500" : "text-gray-400"
                                }`}>{rep.ratings?.emailsSent}</span>
                              </td>

                              {/* Pipeline Velocity */}
                              <td className="py-3 px-3 text-center">
                                <div className="font-bold">{rep.pipelineVelocity ? rep.pipelineVelocity.toFixed(1) : 0}d</div>
                                {/* Lower velocity duration is actually better (Above Average performance) */}
                                <span className={`text-[8px] font-bold uppercase ${
                                  rep.pipelineVelocity < benchmarkingData.teamAverages?.pipelineVelocity ? "text-emerald-500" : "text-rose-500"
                                }`}>{rep.pipelineVelocity < benchmarkingData.teamAverages?.pipelineVelocity ? "Faster" : "Slower"}</span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={8} className="text-center py-8 text-gray-400">No representatives logged in the team benchmark.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Forecast Trends view */}
              {reportSubTab === "forecast" && (
                <div className="space-y-6">
                  {/* Period selection */}
                  <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <div>
                      <h3 className="text-[#2D1B4E] font-black text-sm uppercase tracking-wider">Forecast Trend Analysis</h3>
                      <p className="text-[10px] text-gray-400">Actual won revenue vs AI-based expected revenue over time.</p>
                    </div>
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                      {["monthly", "quarterly", "yearly"].map((p) => (
                        <button
                          key={p}
                          onClick={() => setForecastPeriod(p as any)}
                          className={`px-3 py-1 rounded text-[10px] font-black uppercase tracking-wider transition-colors ${
                            forecastPeriod === p ? "bg-[#8E2A8B] text-white" : "text-gray-400 hover:text-gray-600"
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Charts */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4 lg:col-span-2">
                      <h4 className="text-[#2D1B4E] font-black text-xs uppercase tracking-wider">Variance & Forecast Drift</h4>
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={forecastTrends}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                            <XAxis dataKey="period" tick={{ fontSize: 9 }} stroke="#9CA3AF" />
                            <YAxis tick={{ fontSize: 9 }} stroke="#9CA3AF" />
                            <Tooltip contentStyle={{ fontSize: 10 }} />
                            <Legend wrapperStyle={{ fontSize: 10 }} />
                            <Line type="monotone" dataKey="actualRevenue" name="Actual Closed Won" stroke="#6BCB77" strokeWidth={3} dot={{ r: 4 }} />
                            <Line type="monotone" dataKey="forecastRevenue" name="Forecast Value" stroke="#FFD93D" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Table listing forecast detail */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
                      <h4 className="text-[#2D1B4E] font-black text-xs uppercase tracking-wider">Accuracy Matrix</h4>
                      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                        {forecastTrends.length > 0 ? (
                          forecastTrends.map((trend) => (
                            <div key={trend.period} className="p-3 bg-gray-50 rounded-lg text-[10px] space-y-1.5 border border-gray-100">
                              <div className="flex justify-between items-center border-b border-gray-200/50 pb-1">
                                <span className="font-bold text-[#2D1B4E]">{trend.period}</span>
                                <span className={`px-2 py-0.5 rounded font-black text-[9px] ${
                                  trend.accuracy >= 90 ? "bg-emerald-50 text-emerald-600" : trend.accuracy >= 75 ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"
                                }`}>
                                  {trend.accuracy}% Acc
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-gray-500">
                                <div>
                                  <span className="block text-[8px] text-gray-400 font-bold uppercase">Actual Won</span>
                                  <span className="font-bold text-gray-700">${trend.actualRevenue?.toLocaleString()}</span>
                                </div>
                                <div>
                                  <span className="block text-[8px] text-gray-400 font-bold uppercase">Forecast Expected</span>
                                  <span className="font-bold text-gray-700">${trend.forecastRevenue?.toLocaleString()}</span>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-center text-gray-400 py-10">No period stats calculated.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* SUBTAB 2: CUSTOM DASHBOARD BUILDER */}
      {subTab === "builder" && (
        <div className="space-y-6">
          {/* Dashboard Header Selector controls */}
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="space-y-1 w-full md:w-64">
                <label className="text-[9px] uppercase font-black text-gray-400 block tracking-wider">Select Dashboard</label>
                <select
                  value={selectedDashId}
                  onChange={(e) => setSelectedDashId(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg p-2 bg-white text-xs font-bold text-[#2D1B4E] focus:outline-none focus:ring-2 focus:ring-[#8E2A8B]/20"
                >
                  <option value="" disabled>-- Choose Dashboard --</option>
                  {dashboards.map((dash) => (
                    <option key={dash.id} value={dash.id}>
                      {dash.title} {dash.is_default ? "⭐" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-1 items-end pt-5">
                <button
                  onClick={() => {
                    setDashEditId(null);
                    setDashTitle("");
                    setDashDesc("");
                    setShowDashModal(true);
                  }}
                  className="bg-[#2D1B4E] hover:bg-[#2D1B4E]/90 text-white p-2.5 rounded-lg shadow transition-colors flex items-center gap-1.5 text-xs font-bold whitespace-nowrap"
                  title="Create New Dashboard"
                >
                  <Plus size={14} /> New
                </button>

                {currentDashData?.dashboard && !currentDashData.dashboard.is_default && (
                  <>
                    <button
                      onClick={() => {
                        setDashEditId(currentDashData.dashboard.id);
                        setDashTitle(currentDashData.dashboard.title);
                        setDashDesc(currentDashData.dashboard.description || "");
                        setShowDashModal(true);
                      }}
                      className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-500 p-2.5 rounded-lg transition-colors flex items-center"
                      title="Edit Dashboard Info"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={handleDeleteDashboard}
                      className="bg-white hover:bg-rose-50 border border-gray-200 text-rose-500 p-2.5 rounded-lg transition-colors flex items-center"
                      title="Delete Dashboard"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>

            {selectedDashId && (
              <button
                onClick={() => {
                  setWidgetEditId(null);
                  setWidgetTitle("");
                  setWidgetType("bar");
                  setWidgetMetric("lead_count");
                  setWidgetGroupBy("sales_stage");
                  setWidgetDateRange("all");
                  setWidgetFilters({ team: "", sales_stage: "" });
                  setPreviewData(null);
                  setShowWidgetModal(true);
                }}
                className="bg-[#8E2A8B] hover:bg-[#8E2A8B]/95 text-white px-4 py-2.5 rounded-lg shadow-md transition-all flex items-center gap-2 text-xs font-black uppercase tracking-wider"
              >
                <Plus size={14} /> Add Analytics Widget
              </button>
            )}
          </div>

          {currentDashData?.dashboard?.description && (
            <p className="text-[11px] text-gray-500 italic bg-gray-50 px-4 py-2 rounded-lg border border-gray-100">
              ℹ️ {currentDashData.dashboard.description}
            </p>
          )}

          {/* Widgets Grid */}
          {loadingWidgets ? (
            <div className="text-center py-20 bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent text-[#2D1B4E] rounded-full" />
              <p className="text-xs text-gray-400 mt-2 font-bold uppercase tracking-wider">Loading widgets...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {currentDashData?.widgets?.length > 0 ? (
                currentDashData.widgets.map((widget: any) => {
                  const data = widgetsData[widget.id];
                  
                  return (
                    <div key={widget.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4 flex flex-col justify-between min-h-[300px]">
                      <div className="flex justify-between items-start border-b border-gray-100 pb-2">
                        <div>
                          <h4 className="text-xs font-black text-[#2D1B4E] uppercase tracking-wider">{widget.title}</h4>
                          <span className="text-[8px] bg-gray-100 text-gray-400 font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                            Metric: {widget.metric?.replace("_", " ")} | Group: {widget.query_config?.groupBy || "None"}
                          </span>
                        </div>

                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              setWidgetEditId(widget.id);
                              setWidgetTitle(widget.title);
                              setWidgetType(widget.type);
                              setWidgetMetric(widget.metric);
                              setWidgetGroupBy(widget.query_config?.groupBy || "");
                              setWidgetDateRange(widget.query_config?.dateRange || "all");
                              setWidgetFilters(widget.query_config?.filters || { team: "", sales_stage: "" });
                              setPreviewData(null);
                              setShowWidgetModal(true);
                            }}
                            className="text-gray-400 hover:text-[#8E2A8B] p-1 transition-colors"
                            title="Edit Widget"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteWidget(widget.id)}
                            className="text-gray-400 hover:text-rose-500 p-1 transition-colors"
                            title="Remove Widget"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Widget chart rendering */}
                      <div className="flex-1 min-h-[200px] flex items-center justify-center pt-2">
                        {!data ? (
                          <p className="text-[10px] text-gray-400">Failed to render widget. No data returned.</p>
                        ) : widget.type === "kpi" ? (
                          <div className="text-center space-y-1">
                            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Total Output</span>
                            <div className="text-4xl font-black text-[#2D1B4E]">
                              {typeof data.value === "number" 
                                ? (widget.metric.includes("value") || widget.metric.includes("revenue") ? `$${data.value.toLocaleString()}` : data.value)
                                : (data[0]?.value ? `${data[0].value}%` : "0")}
                            </div>
                          </div>
                        ) : widget.type === "pie" ? (
                          <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                              <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                outerRadius={60}
                                dataKey="value"
                                nameKey="label"
                              >
                                {data.map((_: any, idx: number) => (
                                  <Cell key={`cell-${idx}`} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip contentStyle={{ fontSize: 9 }} />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : widget.type === "line" ? (
                          <ResponsiveContainer width="100%" height={200}>
                            <LineChart data={data}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F9FAFB" />
                              <XAxis dataKey="label" tick={{ fontSize: 8 }} stroke="#9CA3AF" />
                              <YAxis tick={{ fontSize: 8 }} stroke="#9CA3AF" />
                              <Tooltip contentStyle={{ fontSize: 9 }} />
                              <Line type="monotone" dataKey="value" stroke="#8E2A8B" strokeWidth={2.5} dot={{ r: 3 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        ) : (
                          <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={data}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F9FAFB" />
                              <XAxis dataKey="label" tick={{ fontSize: 8 }} stroke="#9CA3AF" />
                              <YAxis tick={{ fontSize: 8 }} stroke="#9CA3AF" />
                              <Tooltip contentStyle={{ fontSize: 9 }} />
                              <Bar dataKey="value" fill="#2D1B4E" radius={[3, 3, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-1 md:col-span-2 text-center py-16 bg-white rounded-xl border border-gray-100 shadow-sm space-y-2">
                  <Layers className="mx-auto text-gray-300" size={32} />
                  <h4 className="text-[#2D1B4E] font-black text-xs uppercase tracking-wider">No widgets on this dashboard</h4>
                  <p className="text-[10px] text-gray-400">Click "Add Analytics Widget" above to build your first reporting block.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: DASHBOARD CREATE / EDIT */}
      {showDashModal && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-sm flex justify-center items-center z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 border border-gray-100 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="text-[#2D1B4E] font-black text-sm uppercase tracking-wider">
                {dashEditId ? "Modify Custom Dashboard" : "Create Business Dashboard"}
              </h3>
              <button onClick={() => setShowDashModal(false)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleDashSubmit} className="space-y-4 text-xs font-bold text-gray-700">
              <div className="space-y-1">
                <label className="block">Dashboard Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q3 Sales Funnel Analysis"
                  value={dashTitle}
                  onChange={(e) => setDashTitle(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg p-2 font-medium focus:outline-none focus:ring-2 focus:ring-[#8E2A8B]/20"
                />
              </div>

              <div className="space-y-1">
                <label className="block">Short Description</label>
                <textarea
                  placeholder="Enter context, target filters, or instructions."
                  value={dashDesc}
                  onChange={(e) => setDashDesc(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg p-2 font-medium focus:outline-none focus:ring-2 focus:ring-[#8E2A8B]/20"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDashModal(false)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-2 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#2D1B4E] hover:bg-[#2D1B4E]/95 text-white px-5 py-2 rounded-lg"
                >
                  Save Dashboard
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: WIDGET CREATE / EDIT (WIDGET BUILDER) */}
      {showWidgetModal && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-sm flex justify-center items-center z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl p-6 border border-gray-100 flex flex-col md:flex-row gap-6 max-h-[90vh] overflow-y-auto">
            {/* Form Fields */}
            <div className="flex-1 space-y-4">
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <h3 className="text-[#2D1B4E] font-black text-sm uppercase tracking-wider">
                  {widgetEditId ? "Configure Widget Parameters" : "Advanced Custom Widget Builder"}
                </h3>
              </div>

              <form onSubmit={handleWidgetSubmit} className="space-y-3.5 text-[11px] font-bold text-gray-700">
                <div className="space-y-1">
                  <label className="block">Widget Reporting Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Lead Pipeline by Industry"
                    value={widgetTitle}
                    onChange={(e) => setWidgetTitle(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg p-2 font-medium text-xs focus:outline-none focus:ring-2 focus:ring-[#8E2A8B]/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block">Visualization Type</label>
                    <select
                      value={widgetType}
                      onChange={(e) => setWidgetType(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg p-2 bg-white text-xs focus:outline-none"
                    >
                      <option value="bar">Bar Chart</option>
                      <option value="line">Line Chart</option>
                      <option value="pie">Pie Chart</option>
                      <option value="kpi">KPI Stat Card</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block">Target Aggregation Metric</label>
                    <select
                      value={widgetMetric}
                      onChange={(e) => setWidgetMetric(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg p-2 bg-white text-xs focus:outline-none"
                    >
                      <option value="lead_count">Leads Count (Total volume)</option>
                      <option value="sum_deal_value">Pipeline Value (Revenue Sum)</option>
                      <option value="avg_deal_value">Avg Deal Size</option>
                      <option value="win_rate">Win Rate %</option>
                      <option value="avg_stage_duration">Stage Velocity (Avg Days)</option>
                      <option value="forecast_revenue">Expected Revenue (Weighted)</option>
                      <option value="conversion_rate">Qualification Conversion %</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block">Group Segment (X-Axis/Breakdown)</label>
                    <select
                      value={widgetGroupBy}
                      onChange={(e) => setWidgetGroupBy(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg p-2 bg-white text-xs focus:outline-none"
                      disabled={widgetType === "kpi"}
                    >
                      <option value="sales_stage">Sales Stages</option>
                      <option value="lead_source">Marketing Sources</option>
                      <option value="team">Regional Teams</option>
                      <option value="assigned_to">Sales Representatives</option>
                      <option value="created_month">Timeline (Monthly Cohorts)</option>
                      <option value="industry">Business Industry Sectors</option>
                      <option value="quality">Confidence Level (Lead Quality)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block">Attribution Date Range</label>
                    <select
                      value={widgetDateRange}
                      onChange={(e) => setWidgetDateRange(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg p-2 bg-white text-xs focus:outline-none"
                    >
                      <option value="all">All-Time Dataset</option>
                      <option value="last_30_days">Last 30 Days</option>
                      <option value="last_90_days">Last 90 Days</option>
                      <option value="last_12_months">Last 12 Months</option>
                    </select>
                  </div>
                </div>

                <div className="border border-gray-100 p-3 bg-gray-50/50 rounded-xl space-y-2">
                  <span className="text-[9px] uppercase tracking-wider text-gray-400 block font-black">Segment Filters (Optional)</span>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-gray-500">Filter by Team</label>
                      <select
                        value={widgetFilters.team}
                        onChange={(e) => setWidgetFilters({ ...widgetFilters, team: e.target.value })}
                        className="w-full border border-gray-200 rounded p-1 bg-white text-xs"
                      >
                        <option value="">All Teams</option>
                        <option value="Domestic">Domestic</option>
                        <option value="APAC">APAC</option>
                        <option value="EMEA">EMEA</option>
                        <option value="AMER">AMER</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-gray-500">Filter by Stage</label>
                      <select
                        value={widgetFilters.sales_stage}
                        onChange={(e) => setWidgetFilters({ ...widgetFilters, sales_stage: e.target.value })}
                        className="w-full border border-gray-200 rounded p-1 bg-white text-xs"
                      >
                        <option value="">All Stages</option>
                        <option value="New Lead">New Lead</option>
                        <option value="Qualified">Qualified</option>
                        <option value="Contacted">Contacted</option>
                        <option value="Proposal Sent">Proposal Sent</option>
                        <option value="Negotiation">Negotiation</option>
                        <option value="Closed Won">Closed Won</option>
                        <option value="Closed Lost">Closed Lost</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 justify-between pt-4">
                  <button
                    type="button"
                    onClick={runLivePreview}
                    className="border border-[#8E2A8B] hover:bg-[#8E2A8B]/5 text-[#8E2A8B] px-4 py-2 rounded-lg flex items-center gap-1.5"
                  >
                    {loadingPreview ? (
                      <div className="animate-spin inline-block w-3 h-3 border-2 border-current border-t-transparent text-[#8E2A8B] rounded-full" />
                    ) : (
                      <Sparkles size={12} />
                    )}
                    Generate Live Preview
                  </button>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowWidgetModal(false)}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-2 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-[#2D1B4E] hover:bg-[#2D1B4E]/95 text-white px-5 py-2 rounded-lg"
                    >
                      Save Widget
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Preview Panel */}
            <div className="w-full md:w-[320px] bg-gray-50 rounded-2xl border border-gray-200/60 p-5 flex flex-col justify-between min-h-[300px]">
              <div>
                <h4 className="text-xs font-black text-[#2D1B4E] uppercase tracking-wider mb-0.5">Widget Live Preview</h4>
                <p className="text-[10px] text-gray-400 mb-4">Query execution rendered in real-time.</p>
              </div>

              <div className="flex-1 flex items-center justify-center min-h-[200px]">
                {loadingPreview ? (
                  <div className="text-center space-y-1">
                    <div className="animate-spin inline-block w-6 h-6 border-3 border-current border-t-transparent text-[#8E2A8B] rounded-full" />
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Running query...</p>
                  </div>
                ) : previewData ? (
                  widgetType === "kpi" ? (
                    <div className="text-center space-y-1">
                      <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">KPI Value</span>
                      <div className="text-3xl font-black text-[#2D1B4E]">
                        {typeof previewData.value === "number"
                          ? (widgetMetric.includes("value") || widgetMetric.includes("revenue") ? `$${previewData.value.toLocaleString()}` : previewData.value)
                          : (previewData[0]?.value ? `${previewData[0].value}%` : "0")}
                      </div>
                    </div>
                  ) : widgetType === "pie" ? (
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie
                          data={previewData}
                          cx="50%"
                          cy="50%"
                          outerRadius={50}
                          dataKey="value"
                          nameKey="label"
                        >
                          {previewData.map((_: any, idx: number) => (
                          <Cell key={`cell-${idx}`} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                        ))}
                        </Pie>
                        <Tooltip contentStyle={{ fontSize: 8 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : widgetType === "line" ? (
                    <ResponsiveContainer width="100%" height={180}>
                      <LineChart data={previewData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                        <XAxis dataKey="label" tick={{ fontSize: 7 }} stroke="#9CA3AF" />
                        <YAxis tick={{ fontSize: 7 }} stroke="#9CA3AF" />
                        <Tooltip contentStyle={{ fontSize: 8 }} />
                        <Line type="monotone" dataKey="value" stroke="#8E2A8B" strokeWidth={2} dot={{ r: 2.5 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={previewData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                        <XAxis dataKey="label" tick={{ fontSize: 7 }} stroke="#9CA3AF" />
                        <YAxis tick={{ fontSize: 7 }} stroke="#9CA3AF" />
                        <Tooltip contentStyle={{ fontSize: 8 }} />
                        <Bar dataKey="value" fill="#2D1B4E" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )
                ) : (
                  <p className="text-[10px] text-gray-400 text-center italic">Configure settings and click "Generate Live Preview" to render.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
