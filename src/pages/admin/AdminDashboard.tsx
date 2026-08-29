import { useState, useEffect, useCallback, Fragment } from "react";
import { useProducts } from "@/context/ProductContext";
import { useVideos } from "@/context/VideoContext";
import { useNews } from "@/context/NewsContext";
import { useReviews } from "@/context/ReviewContext";
import { useOrders } from "../../context/OrderContext";
import { usePartners } from "@/context/PartnerContext";
import { Link, useNavigate } from "react-router-dom";
import {
  Plus,
  Image as ImageIcon,
  Trash2,
  X,
  Check,
  Upload,
  Pencil,
  MessageSquareQuote,
  Package,
  ShoppingBag,
  ChevronDown,
  ChevronUp,
  LayoutDashboard,
  TrendingUp,
  DollarSign,
  Handshake,
  Video,
  Newspaper,
  Users,
  UserCheck,
  Phone,
  Instagram,
  Facebook,
  Twitter,
  Youtube,
  Linkedin,
  LogOut,
  Search,
  Bell,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  MoreVertical,
  Calendar,
  Clock,
  MessageCircle,
  FileText,
  RefreshCw,
  BadgeCheck,
  Wallet,
  Menu,
  Sparkles,
  Shield,
  BarChart3,
  HeartHandshake,
  Zap,
  Terminal,
  BrainCircuit
} from "lucide-react";
import { Helmet } from 'react-helmet-async';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { CopilotDashboardView } from "./CopilotDashboardView";
import BiDashboardView from "./BiDashboardView";
import CsPortalView from "./CsPortalView";
import RevenueCommandCenter from "./RevenueCommandCenter";
import WorkflowCommandCenter from "./WorkflowCommandCenter";
import { ExecutiveCommandLayer } from "./ExecutiveCommandLayer";
import { PredictiveInsightsPanel } from "./PredictiveInsightsPanel";
import { StrategicPlanningPanel } from "./StrategicPlanningPanel";
import { categories } from "@/data/products";
import toast from "react-hot-toast";
import { compressImage } from "../../utils/imageCompressor";
import ImageOptimizer from "./ImageOptimizer";
import axios from "axios";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
// import { supabase } from '@/utils/supabaseClient';
import { API_BASE } from "@/config/api";
import PipelineDashboard from "./PipelineDashboard";
import LeadCRMPanel from "./LeadCRMPanel";
import { LeadCopilotPanel } from "./LeadCopilotPanel";
import { Lead } from "@/types/crm";
import EventRegistrationsView from "./EventRegistrationsView";

// ─────────────────────────────────────────────────────────────────────────────
// LeadsView — Phase 1: Lead Capture & Qualification System
// ─────────────────────────────────────────────────────────────────────────────
const LeadsView = () => {
  const [lFilter, setLFilter] = useState({ status: "all", source: "all", priority: "all", intent: "all", quality: "all", dealSize: "all", queue_filter: "all" });
  const [lLoading, setLLoading] = useState(false);
  const [lLeads, setLLeads] = useState<Lead[]>([]);
  const [salesQueue, setSalesQueue] = useState<any>(null);
  const [lTotal, setLTotal] = useState(0);
  const [lPage, setLPage] = useState(0);
  const [expandedLead, setExpandedLead] = useState<string | null>(null);
  const PAGE_SIZE = 20;

  const loadLeads = useCallback(async (page = 0, filter: any = { status: "all", source: "all", priority: "all", queue_filter: "all" }) => {
    setLLoading(true);
    try {
      const adminSecret = sessionStorage.getItem("kottravai_admin_token") || "";
      const params: Record<string, string> = { limit: String(PAGE_SIZE), offset: String(page * PAGE_SIZE) };
      if (filter.status && filter.status !== "all") params.status = filter.status;
      if (filter.source && filter.source !== "all") params.source = filter.source;
      if (filter.priority && filter.priority !== "all") params.priority = filter.priority;
      if (filter.queue_filter && filter.queue_filter !== "all") params.queue_filter = filter.queue_filter;
      
      const qs = new URLSearchParams(params).toString();
      const res = await axios.get(`${API_BASE}/api/admin/leads?${qs}`, { headers: { "X-Admin-Secret": adminSecret } });
      if (res.data.success) {
        setLLeads(res.data.leads || []);
        setLTotal(res.data.total || 0);
      }
      
      // Also fetch queue metrics
      const qRes = await axios.get(`${API_BASE}/api/admin/sales-queue`, { headers: { "X-Admin-Secret": adminSecret } });
      if (qRes.data.success) {
        setSalesQueue(qRes.data.queue);
      }
    } catch {
      toast.error("Failed to load leads or queue metrics");
    } finally {
      setLLoading(false);
    }
  }, []);

  useEffect(() => { loadLeads(0, lFilter); }, [loadLeads]);

  const updateStatus = async (id: string, status: string) => {
    try {
      const adminSecret = sessionStorage.getItem("kottravai_admin_token") || "";
      await axios.patch(`${API_BASE}/api/admin/leads/${id}`, { status }, { headers: { "X-Admin-Secret": adminSecret } });
      toast.success(`Lead marked as ${status}`);
      if (status === "qualified") {
        import("@/utils/analyticsService").then(m => m.default.trackEvent("lead_qualified", { lead_id: id })).catch(() => {});
      }
      loadLeads(lPage, lFilter);
    } catch { toast.error("Update failed"); }
  };

  const exportCSV = async () => {
    try {
      const adminSecret = sessionStorage.getItem("kottravai_admin_token") || "";
      const res = await axios.get(`${API_BASE}/api/admin/leads/export`, {
        headers: { "X-Admin-Secret": adminSecret },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `kottravai_leads_${Date.now()}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error("Export failed: Unauthorized or network error");
    }
  };

  const exportHackathonCSV = async () => {
    try {
      const adminSecret = sessionStorage.getItem("kottravai_admin_token") || "";
      const res = await axios.get(`${API_BASE}/api/admin/hackathon/export`, {
        headers: { "X-Admin-Secret": adminSecret },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `hackathon_registrations_${Date.now()}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("Hackathon registrations exported!");
    } catch (err) {
      toast.error("Hackathon export failed: Unauthorized or network error");
    }
  };

  const STATUS_COLORS: Record<string, string> = {
    new: "bg-blue-100 text-blue-700",
    qualified: "bg-emerald-100 text-emerald-700",
    converted: "bg-purple-100 text-purple-700",
    disqualified: "bg-gray-100 text-gray-500",
  };
  const INTENT_COLORS: Record<string, string> = {
    high: "bg-green-100 text-green-700",
    medium: "bg-orange-100 text-orange-700",
    low: "bg-red-100 text-red-700",
  };
  const QUALITY_COLORS: Record<string, string> = {
    hot: "bg-red-100 text-red-700",
    warm: "bg-orange-100 text-orange-700",
    cold: "bg-gray-100 text-gray-700",
  };
  const DEAL_SIZE_COLORS: Record<string, string> = {
    large: "bg-green-100 text-green-700",
    medium: "bg-blue-100 text-blue-700",
    small: "bg-gray-100 text-gray-700",
  };
  const TYPE_LABELS: Record<string, string> = {
    corporate_gifting: "Corporate",
    wedding: "Wedding",
    retail: "Retail",
    general: "General",
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 50) return "bg-orange-500";
    return "bg-red-500";
  };

  // Client-side filtering
  const filteredLeads = lLeads.filter(lead => {
    if (lFilter.intent !== "all" && (lead.buying_intent || "").toLowerCase() !== lFilter.intent.toLowerCase()) return false;
    const quality = lead.lead_quality || lead.lead_temperature || "";
    if (lFilter.quality !== "all" && quality.toLowerCase() !== lFilter.quality.toLowerCase()) return false;
    if (lFilter.dealSize !== "all" && (lead.estimated_deal_size || "").toLowerCase() !== lFilter.dealSize.toLowerCase()) return false;
    return true;
  });

  const handleQueueClick = (queueFilter: string) => {
    const newFilter = { ...lFilter, queue_filter: queueFilter };
    setLFilter(newFilter);
    loadLeads(0, newFilter);
  };


  return (
    <div className="p-6 lg:p-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#2D1B4E]">Lead Pipeline</h1>
          <p className="text-gray-500 text-sm mt-1">All captured leads from forms, newsletter &amp; cart</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => loadLeads(0, lFilter)} className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition">
            <RefreshCw size={13} /> Refresh
          </button>
          <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition">
            <FileText size={13} /> Export Leads
          </button>
          <button onClick={exportHackathonCSV} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition">
            <FileText size={13} /> Export Hackathon
          </button>
        </div>
      </div>

      {/* Stat Cards - Clickable Operational Queue */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Tasks Due Today", value: salesQueue?.tasks_due_today || 0, filter: "tasks_due_today", color: "from-blue-500 to-blue-600" },
          { label: "Overdue Follow-ups", value: salesQueue?.overdue_followups || 0, filter: "overdue_followups", color: "from-red-500 to-red-600" },
          { label: "Critical Leads", value: salesQueue?.critical_leads || 0, filter: "critical_leads", color: "from-purple-500 to-purple-600" },
          { label: "Unassigned Leads", value: salesQueue?.unassigned_leads || 0, filter: "unassigned_leads", color: "from-orange-400 to-orange-500" },
          { label: "Escalated Leads", value: salesQueue?.escalated_leads || 0, filter: "escalated_leads", color: "from-emerald-500 to-emerald-600" },
        ].map((s, i) => (
          <div 
            key={i} 
            onClick={() => handleQueueClick(s.filter)}
            className={`bg-gradient-to-br ${s.color} rounded-2xl p-5 shadow-lg cursor-pointer transform hover:scale-105 transition-transform duration-200 border-2 ${lFilter.queue_filter === s.filter ? 'border-white ring-4 ring-[#8E2A8B]/50' : 'border-transparent'}`}
          >
            <p className="text-[10px] font-black uppercase tracking-widest text-white/70 mb-1">{s.label}</p>
            <p className="text-3xl font-black text-white">{s.value}</p>
          </div>
        ))}
      </div>
      
      {/* Clear Queue Filter Button */}
      {lFilter.queue_filter !== "all" && (
        <div className="flex justify-end">
          <button 
            onClick={() => handleQueueClick("all")}
            className="text-sm font-bold text-[#8E2A8B] hover:underline"
          >
            Clear Active Queue Filter: {lFilter.queue_filter.replace(/_/g, ' ').toUpperCase()} &times;
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-100">
        {[
          { key: "status", label: "Status", options: ["all", "new", "qualified", "converted", "disqualified"] },
          { key: "source", label: "Source", options: ["all", "contact_form", "b2b_inquiry", "newsletter", "cart_capture"] },
          { key: "priority", label: "Priority", options: ["all", "high", "medium", "low"] },
          { key: "quality", label: "Quality", options: ["all", "hot", "warm", "cold"] },
          { key: "intent", label: "Intent", options: ["all", "high", "medium", "low"] },
          { key: "dealSize", label: "Deal Size", options: ["all", "large", "medium", "small"] },
        ].map(f => (
          <div key={f.key} className="flex items-center gap-2">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{f.label}:</span>
            <select
              value={(lFilter as any)[f.key]}
              onChange={e => {
                const next = { ...lFilter, [f.key]: e.target.value };
                setLFilter(next);
                if (f.key === "status" || f.key === "source" || f.key === "priority") {
                  setLPage(0);
                  loadLeads(0, next);
                }
              }}
              className="text-xs font-bold bg-white border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#8E2A8B]/40"
            >
              {f.options.map(o => <option key={o} value={o}>{o === "all" ? "All" : o.replace(/_/g, " ")}</option>)}
            </select>
          </div>
        ))}
        <span className="text-[10px] text-gray-400 ml-auto self-center">{lTotal} total results</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {lLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8E2A8B]"></div>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
            <Users size={32} className="mb-2 opacity-30" />
            <p className="text-sm">No leads match the selected filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["Name", "Type", "Score", "Intent", "Quality", "Deal Size", "Status", "Date", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredLeads.map((lead: Lead) => {
                  const intent = (lead.buying_intent || "N/A").toLowerCase();
                  const quality = (lead.lead_quality || lead.lead_temperature || "N/A").toLowerCase();
                  const dealSize = (lead.estimated_deal_size || "N/A").toLowerCase();
                  
                  const score = Number(lead.lead_score) || 0;
                  const isPending = !lead.lead_score && !lead.ai_summary;

                  let parsedInsights: string[] = [];
                  try {
                    const rawInsights = lead.key_insights || lead.ai_reasoning || "";
                    if (rawInsights) {
                      if (rawInsights.startsWith("[")) {
                        parsedInsights = JSON.parse(rawInsights);
                      } else {
                        parsedInsights = rawInsights.split("|").map((s: string) => s.trim()).filter(Boolean);
                      }
                    }
                  } catch (e) {
                    parsedInsights = [lead.key_insights || lead.ai_reasoning || ""];
                  }

                  return (
                    <Fragment key={lead.id}>
                      <tr 
                        className={`hover:bg-gray-50/50 transition cursor-pointer ${expandedLead === lead.id ? 'bg-gray-50' : ''}`}
                        onClick={() => setExpandedLead(expandedLead === lead.id ? null : lead.id)}
                      >
                        <td className="px-4 py-3">
                          <p className="font-bold text-[#2D1B4E] text-xs flex items-center gap-2">
                            {expandedLead === lead.id ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                            {lead.name}
                          </p>
                          <p className="text-[10px] text-gray-400 ml-5">{lead.company_name || lead.email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="bg-purple-50 text-purple-700 text-[10px] font-bold px-2 py-1 rounded-full">
                            {TYPE_LABELS[lead.lead_type || ''] || lead.lead_type || lead.source?.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {isPending ? (
                            <span className="text-[10px] text-gray-400 italic">Pending</span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-gray-700 w-6">{score}</span>
                              <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div className={`h-full ${getScoreColor(score)}`} style={{ width: `${Math.min(score, 100)}%` }}></div>
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isPending ? (
                            <span className="text-[10px] text-gray-400">-</span>
                          ) : (
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${INTENT_COLORS[intent] || "bg-gray-100 text-gray-600"}`}>
                              {intent.charAt(0).toUpperCase() + intent.slice(1)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isPending ? (
                            <span className="text-[10px] text-gray-400">-</span>
                          ) : (
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${QUALITY_COLORS[quality] || "bg-gray-100 text-gray-600"}`}>
                              {quality === 'hot' ? '🔥 Hot' : quality === 'warm' ? '☀️ Warm' : quality === 'cold' ? '❄️ Cold' : quality}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isPending ? (
                            <span className="text-[10px] text-gray-400">-</span>
                          ) : (
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${DEAL_SIZE_COLORS[dealSize] || "bg-gray-100 text-gray-600"}`}>
                              {dealSize.charAt(0).toUpperCase() + dealSize.slice(1)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${STATUS_COLORS[lead.status] || ""}`}>
                            {lead.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[10px] text-gray-400">
                          {new Date(lead.created_at).toLocaleDateString("en-IN")}
                        </td>
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          <select
                            value={lead.status}
                            onChange={e => updateStatus(lead.id, e.target.value)}
                            className="text-[10px] font-bold bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 focus:outline-none"
                          >
                            <option value="new">New</option>
                            <option value="qualified">Qualified</option>
                            <option value="converted">Converted</option>
                            <option value="disqualified">Disqualified</option>
                          </select>
                        </td>
                      </tr>
                      {expandedLead === lead.id && (
                        <tr className="bg-gray-50/80 border-b border-gray-200">
                          <td colSpan={9} className="p-0">
                            <div className="p-6">
                              <h3 className="text-sm font-black text-[#2D1B4E] mb-4 flex items-center gap-2">
                                <Activity size={16} className="text-[#8E2A8B]" />
                                AI Lead Analysis
                              </h3>
                              
                              {isPending ? (
                                <div className="text-center p-6 bg-white rounded-xl border border-gray-100">
                                  <div className="animate-pulse flex flex-col items-center">
                                    <Activity size={24} className="text-gray-300 mb-2" />
                                    <p className="text-sm text-gray-500 font-medium">AI Analysis Pending</p>
                                    <p className="text-xs text-gray-400 mt-1">Waiting for the AI service to process this lead...</p>
                                  </div>
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                  <div className="lg:col-span-1 space-y-4">
                                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Lead Score</p>
                                      <div className="flex items-end gap-3 mb-2">
                                        <span className="text-3xl font-black text-[#2D1B4E]">{score}</span>
                                        <span className="text-xs text-gray-500 mb-1">/ 100</span>
                                      </div>
                                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div className={`h-full ${getScoreColor(score)}`} style={{ width: `${Math.min(score, 100)}%` }}></div>
                                      </div>
                                    </div>
                                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-wrap gap-2">
                                      <div className="w-full mb-1">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Attributes</p>
                                      </div>
                                      <span className={`text-[10px] font-bold px-2.5 py-1.5 rounded-full ${INTENT_COLORS[intent] || "bg-gray-100 text-gray-600"}`}>
                                        Intent: {intent.charAt(0).toUpperCase() + intent.slice(1)}
                                      </span>
                                      <span className={`text-[10px] font-bold px-2.5 py-1.5 rounded-full ${QUALITY_COLORS[quality] || "bg-gray-100 text-gray-600"}`}>
                                        Quality: {quality === 'hot' ? '🔥 Hot' : quality === 'warm' ? '☀️ Warm' : quality === 'cold' ? '❄️ Cold' : quality}
                                      </span>
                                      <span className={`text-[10px] font-bold px-2.5 py-1.5 rounded-full ${DEAL_SIZE_COLORS[dealSize] || "bg-gray-100 text-gray-600"}`}>
                                        Deal Size: {dealSize.charAt(0).toUpperCase() + dealSize.slice(1)}
                                      </span>
                                    </div>
                                  </div>
                                  
                                  <div className="lg:col-span-2 space-y-4">
                                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">AI Summary</p>
                                      <p className="text-sm text-gray-700 leading-relaxed">{lead.ai_summary}</p>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 shadow-sm">
                                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2 flex items-center gap-1">
                                          <Check size={12} /> Recommended Action
                                        </p>
                                        <p className="text-sm font-medium text-emerald-900">{lead.ai_next_action || lead.recommended_action || "Reach out to qualify"}</p>
                                      </div>
                                      
                                      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Key Insights</p>
                                        {parsedInsights.length > 0 ? (
                                          <ul className="space-y-1.5">
                                            {parsedInsights.map((insight: string, idx: number) => (
                                              <li key={idx} className="text-xs text-gray-600 flex items-start gap-2">
                                                <span className="w-1 h-1 rounded-full bg-[#8E2A8B] mt-1.5 flex-shrink-0"></span>
                                                <span>{insight}</span>
                                              </li>
                                            ))}
                                          </ul>
                                        ) : (
                                          <p className="text-xs text-gray-400 italic">No key insights extracted.</p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Inject LeadCRMPanel and LeadCopilotPanel here */}
                                  <div className="lg:col-span-3">
                                    <LeadCopilotPanel lead={lead} onUpdate={() => loadLeads(lPage, lFilter)} />
                                    <LeadCRMPanel lead={lead} onUpdate={() => loadLeads(lPage, lFilter)} />
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {lTotal > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <button
            disabled={lPage === 0}
            onClick={() => { const p = lPage - 1; setLPage(p); loadLeads(p, lFilter); }}
            className="px-4 py-2 text-xs font-bold bg-gray-100 hover:bg-gray-200 rounded-xl disabled:opacity-40 transition"
          >
            ← Previous
          </button>
          <span className="text-xs text-gray-500">Page {lPage + 1} of {Math.ceil(lTotal / PAGE_SIZE)}</span>
          <button
            disabled={(lPage + 1) * PAGE_SIZE >= lTotal}
            onClick={() => { const p = lPage + 1; setLPage(p); loadLeads(p, lFilter); }}
            className="px-4 py-2 text-xs font-bold bg-gray-100 hover:bg-gray-200 rounded-xl disabled:opacity-40 transition"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
};

const AdminDashboard = () => {

  const navigate = useNavigate();
  const {
    products,
    addProduct,
    deleteProduct,
    updateProduct,
    updateStock,
    fetchProducts,
  } = useProducts();
  const { videos, addVideo, deleteVideo, updateVideo } = useVideos();
  const { newsItems, addNewsItem, deleteNewsItem, updateNewsItem } = useNews();
  const { addReview, deleteReview, updateReview, getReviewsByPage } =
    useReviews();
  const {
    adminOrders: orders,
    updateOrderStatus,
    deleteOrder,
    fetchAllOrders,
  } = useOrders();
  const { partners, addPartner, updatePartner, deletePartner } = usePartners();

  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<
    boolean | null
  >(null);
  const [orderTab, setOrderTab] = useState<"normal" | "customized">("normal");
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<any>(null);
  const [orderSearchQuery, setOrderSearchQuery] = useState("");
  const [orderFilterStatus, setOrderFilterStatus] = useState("All");
  const [view, setView] = useState<
    | "dashboard"
    | "list"
    | "add"
    | "videos"
    | "news"
    | "reviews"
    | "stocks"
    | "orders"
    | "partners"
    | "users"
    | "whatsapp-helper"
    | "alliance-apps"
    | "image-optimizer"
    | "affiliates"
    | "affiliate-partners"
    | "affiliate-dashboard"
    | "affiliate-payouts"
  | "leads"
  | "revenue"
  | "workflows"
  | "event-registrations"
  >("dashboard");

  // Leads state
  const fetchLeads = async () => {
    try {
      console.log('🔍 [AdminDashboard] Fetching leads from API...');
      
      // Check sessionStorage
      const storedToken = sessionStorage.getItem("kottravai_admin_token");
      console.log('🔍 [AdminDashboard] Token in sessionStorage:', storedToken ? `"${storedToken.substring(0, 30)}..."` : 'NOT FOUND');
      
      // Determine token to use
      const adminToken = storedToken || "";
      console.log('🔍 [AdminDashboard] Token being sent:', `"${adminToken.substring(0, 30)}..."`);
      console.log('🔍 [AdminDashboard] Token length:', adminToken.length);
      console.log('🔍 [AdminDashboard] Full token:', `"${adminToken}"`);
      
      // Prepare headers
      const headers = {
        "x-admin-secret": adminToken,
      };
      console.log('🔍 [AdminDashboard] Request headers:', headers);
      console.log('🔍 [AdminDashboard] API endpoint:', `${API_BASE}/api/leads`);
      
      const response = await axios.get(`${API_BASE}/api/leads`, { headers });
      
      console.log('✅ [AdminDashboard] Raw API response:', response);
      console.log('✅ [AdminDashboard] Response data:', response.data);
      console.log('✅ [AdminDashboard] Response data type:', typeof response.data);
      console.log('✅ [AdminDashboard] Is array?:', Array.isArray(response.data));
      console.log('✅ [AdminDashboard] Array length:', response.data?.length || 0);
      
      const leads = response.data || [];
      console.log('✅ [AdminDashboard] Setting leadsData to:', leads);
    } catch (err: any) {
      console.error("❌ Failed to fetch leads:", err);
      console.error('❌ Error status:', err.response?.status);
      console.error('❌ Error data:', err.response?.data);
      console.error('❌ Error message:', err.message);
      console.error('❌ Error headers:', err.response?.headers);
    }
  };

  // Admin Session Guard
  useEffect(() => {
    const isAdmin =
      sessionStorage.getItem("kottravai_admin_session") === "true";
    if (!isAdmin) {
      navigate("/kottravai-secure-hq/login");
    } else {
      setIsAdminAuthenticated(true);
      
      // Log token information on mount for debugging
      const storedToken = sessionStorage.getItem("kottravai_admin_token");
      console.log('🔐 [AdminDashboard] On mount - Admin session:', isAdmin);
      console.log('🔐 [AdminDashboard] On mount - Token in sessionStorage:', storedToken ? `"${storedToken.substring(0, 30)}..."` : 'NOT FOUND');
      console.log('🔐 [AdminDashboard] On mount - Token length:', storedToken?.length || 0);
      console.log('🔐 [AdminDashboard] On mount - Full token:', storedToken ? `"${storedToken}"` : 'NONE');
      
      // Fetch all orders and products specifically for admin use
      fetchAllOrders();
      fetchProducts();
    }
  }, [navigate, fetchAllOrders, fetchProducts]);

  const handleLogout = () => {
    sessionStorage.removeItem("kottravai_admin_session");
    navigate("/kottravai-secure-hq/login");
  };

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "live" | "draft">(
    "all",
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [quickEditId, setQuickEditId] = useState<string | null>(null);
  const [quickEditForm, setQuickEditForm] = useState({
    name: "",
    price: "",
    isBestSeller: false,
    isGiftBundleItem: false,
    isLive: true,
  });

  // Video Form State
  const [newVideo, setNewVideo] = useState({ title: "", url: "" });
  const [editingVideoId, setEditingVideoId] = useState<number | null>(null);

  // News Form State
  const [newsForm, setNewsForm] = useState({
    title: "",
    category: "",
    date: "",
    image: "",
    link: "",
  });
  const [editingNewsId, setEditingNewsId] = useState<number | null>(null);

  // Review Form State
  const [reviewPage, setReviewPage] = useState<"home" | "b2b">("home");
  const [reviewForm, setReviewForm] = useState({
    name: "",
    role: "",
    content: "",
    image: "",
    rating: 5,
  });
  const [editingReviewId, setEditingReviewId] = useState<number | null>(null);

  // Partner Form State
  const [partnerForm, setPartnerForm] = useState({ name: "", logo: "" });
  const [editingPartnerId, setEditingPartnerId] = useState<number | null>(null);

  // Alliance Applications state
  const [allianceApps, setAllianceApps] = useState<any[]>([]);

  const fetchAllianceApps = async () => {
    try {
      const response = await axios.get(
        `${API_BASE}/api/alliance`,
        {
          headers: {
            "x-admin-secret":
              sessionStorage.getItem("kottravai_admin_token") || "",
          },
        },
      );
      setAllianceApps(response.data);
    } catch (error) {
      console.error("Failed to fetch alliance apps:", error);
    }
  };

  useEffect(() => {
    if (view === "alliance-apps") {
      fetchAllianceApps();
    }
  }, [view]);

  // Affiliate Applications state
  const [affiliateApplications, setAffiliateApplications] = useState<any[]>([]);
  const [isAffiliateActionLoading, setIsAffiliateActionLoading] = useState(false);

  const fetchAffiliateApplications = async () => {
    try {
      const adminSecret =
        sessionStorage.getItem("kottravai_admin_token") || "";
      const response = await axios.get(
        `${API_BASE}/api/affiliate/admin/applications`,
        {
          headers: { "X-Admin-Secret": adminSecret },
        },
      );
      if (response.data.success) {
        setAffiliateApplications(response.data.applications);
      }
    } catch (error) {
      console.error("Failed to fetch affiliate applications:", error);
      toast.error("Failed to load affiliate applications");
    }
  };

  useEffect(() => {
    const isAdmin = sessionStorage.getItem("kottravai_admin_session") === "true";
    if (isAdmin) {
      fetchAffiliateApplications();
    }
  }, []);

  const handleUpdateAffiliateStatus = async (id: string, status: string) => {
    if (isAffiliateActionLoading) return;

    try {
      setIsAffiliateActionLoading(true);
      const adminSecret =
        sessionStorage.getItem("kottravai_admin_token") || "";
      
      const response = await axios.put(
        `${API_BASE}/api/affiliate/admin/applications/${id}`,
        { status },
        { headers: { "X-Admin-Secret": adminSecret } },
      );

      if (response.data.success) {
        if (status === "Approved") {
          toast.success("Alliance approved successfully. Email and WhatsApp notification sent.");
        } else {
          toast.success("Alliance rejected successfully. WhatsApp notification sent.");
        }
      } else {
        toast.success(`Application marked as ${status}`);
      }
      
      fetchAffiliateApplications();
      if (status === "Approved") fetchAffiliates(); // Refresh partners if approved
    } catch (error: any) {
      const msg = error.response?.data?.message || "Failed to update status";
      toast.error(msg);
    } finally {
      setIsAffiliateActionLoading(false);
    }
  };

  // Active Affiliates state
  const [activeAffiliates, setActiveAffiliates] = useState<any[]>([]);

  const fetchAffiliates = async () => {
    try {
      const adminSecret =
        sessionStorage.getItem("kottravai_admin_token") || "";
      const response = await axios.get(
        `${API_BASE}/api/affiliate/admin/affiliates`,
        {
          headers: { "X-Admin-Secret": adminSecret },
        },
      );
      if (response.data.success) {
        setActiveAffiliates(response.data.affiliates);
      }
    } catch (error) {
      console.error("Failed to fetch active affiliates:", error);
    }
  };

  const handleUpdateAffiliateLevel = async (
    affiliateId: string,
    newLevel: string,
  ) => {
    try {
      const adminSecret =
        sessionStorage.getItem("kottravai_admin_token") || "";
      await axios.put(
        `${API_BASE}/api/affiliate/admin/affiliates/${affiliateId}`,
        { level: newLevel },
        { headers: { "X-Admin-Secret": adminSecret } },
      );
      toast.success(`Level updated to ${newLevel}`);
      fetchAffiliates();
    } catch (error) {
      toast.error("Failed to update level");
    }
  };

  // Affiliate Sales state
  const [affiliateSales, setAffiliateSales] = useState<any[]>([]);
  const [affiliatePayouts, setAffiliatePayouts] = useState<any[]>([]);

  const fetchAffiliatePayouts = async () => {
    try {
      const adminSecret =
        sessionStorage.getItem("kottravai_admin_token") || "";
      const response = await axios.get(
        `${API_BASE}/api/affiliate/admin/payouts`,
        {
          headers: { "X-Admin-Secret": adminSecret },
        },
      );
      if (response.data.success) {
        setAffiliatePayouts(response.data.payouts || []);
      }
    } catch (error) {
      console.error("Failed to fetch affiliate payouts:", error);
      toast.error("Failed to load payout logs");
    }
  };

  const handleRecordPayout = async (affiliateId: string, amount: number) => {
    try {
      const adminSecret =
        sessionStorage.getItem("kottravai_admin_token") || "";
      await axios.post(
        `${API_BASE}/api/affiliate/admin/payouts`,
        { affiliateId, amount, date: new Date().toISOString() },
        { headers: { "X-Admin-Secret": adminSecret } },
      );
      toast.success("Payout recorded successfully");
      fetchAffiliatePayouts();
      fetchAffiliates(); // Refresh balances
    } catch (error) {
      toast.error("Failed to record payout");
    }
  };

  const fetchAffiliateSales = async () => {
    try {
      const adminSecret =
        sessionStorage.getItem("kottravai_admin_token") || "";
      const response = await axios.get(
        `${API_BASE}/api/affiliate/admin/sales`,
        {
          headers: { "X-Admin-Secret": adminSecret },
        },
      );
      if (response.data.success) {
        setAffiliateSales(response.data.sales || []);
      }
    } catch (error) {
      console.error("Failed to fetch affiliate sales:", error);
    }
  };

  useEffect(() => {
    if (view === "affiliates") {
      fetchAffiliateApplications();
    }
    if (
      view === "affiliate-partners" ||
      view === "affiliate-dashboard" ||
      view === "affiliate-payouts"
    ) {
      fetchAffiliates();
    }
    if (view === "affiliate-dashboard") {
      fetchAffiliateSales();
    }
    if (view === "affiliate-payouts") {
      fetchAffiliatePayouts();
    }
  }, [view]);

  const [selectedAffiliateFilter, setSelectedAffiliateFilter] =
    useState<string>("all");
  const [selectedSalesAffiliateFilter, setSelectedSalesAffiliateFilter] =
    useState<string>("all");

  // Innovative State
  const [searchQuery, setSearchQuery] = useState("");
  const [compressionStats, setCompressionStats] = useState<{
    original: string;
    compressed: string;
    saved: string;
  } | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "analytics" | "sales-copilot" | "pipeline-intelligence" | "security-governance" | "business-intelligence" | "customer-success" | "revenue-intelligence" | "workflows" | "executive-command" | "predictive-intelligence" | "strategic-planning">(
    "overview"
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Security and Governance state
  const [securityProfile, setSecurityProfile] = useState<{
    role: string;
    permissions: string[];
    teamScope: string;
  } | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [complianceSummary, setComplianceSummary] = useState<any>(null);
  const [crmUsers, setCrmUsers] = useState<any[]>([]);
  const [loadingSecurity, setLoadingSecurity] = useState(false);
  const [securitySearch, setSecuritySearch] = useState("");
  const [securityActionFilter, setSecurityActionFilter] = useState("");

  const fetchSecurityData = async () => {
    setLoadingSecurity(true);
    try {
      const token = sessionStorage.getItem("kottravai_admin_token") || "";
      const headers: any = {};
      if (token.startsWith("eyJ")) {
        headers["Authorization"] = `Bearer ${token}`;
      } else {
        headers["X-Admin-Secret"] = token;
      }

      const [logsRes, summaryRes, usersRes] = await Promise.all([
        axios.get(`${API_BASE}/api/admin/security/audit-logs?search=${securitySearch}&action=${securityActionFilter}`, { headers }).catch(() => ({ data: { success: false, data: { logs: [] } } })),
        axios.get(`${API_BASE}/api/admin/security/compliance-summary`, { headers }).catch(() => ({ data: { success: false } })),
        axios.get(`${API_BASE}/api/admin/security/users`, { headers }).catch(() => ({ data: { success: false, data: { users: [] } } }))
      ]);

      if (logsRes.data?.success) setAuditLogs(logsRes.data.data.logs);
      if (summaryRes.data?.success) setComplianceSummary(summaryRes.data.data);
      if (usersRes.data?.success) setCrmUsers(usersRes.data.data.users);
    } catch (err) {
      console.error("Failed to fetch security/compliance data:", err);
    } finally {
      setLoadingSecurity(false);
    }
  };

  const updateUserRole = async (userId: string, role: string, team: string) => {
    try {
      const token = sessionStorage.getItem("kottravai_admin_token") || "";
      const headers: any = {};
      if (token.startsWith("eyJ")) {
        headers["Authorization"] = `Bearer ${token}`;
      } else {
        headers["X-Admin-Secret"] = token;
      }
      
      const res = await axios.patch(`${API_BASE}/api/admin/security/users/${userId}/role`, { role, team }, { headers });
      if (res.data.success) {
        toast.success("User role and team updated successfully!");
        fetchSecurityData();
      }
    } catch (err: any) {
      console.error("Failed to update user role:", err);
      toast.error(err.response?.data?.error || "Failed to update user role.");
    }
  };

  useEffect(() => {
    if (activeTab === "security-governance") {
      fetchSecurityData();
    }
  }, [activeTab, securitySearch, securityActionFilter]);

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const token = sessionStorage.getItem("kottravai_admin_token") || "";
        const headers: any = {};
        if (token.startsWith("eyJ")) {
          headers["Authorization"] = `Bearer ${token}`;
        } else {
          headers["X-Admin-Secret"] = token;
        }
        
        const res = await axios.get(`${API_BASE}/api/admin/security/permissions`, { headers });
        if (res.data.success) {
          setSecurityProfile(res.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch security permissions:', err);
      }
    };
    fetchPermissions();
  }, []);

  const generateInvoice = async (order: any) => {
    const invoiceId = `INV-${Date.now().toString(36).toUpperCase()}`;
    const dateStr = new Date(order.date || Date.now()).toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "long",
        year: "numeric",
      },
    );
    // Enhanced Calculation Logic: Ensure decimals are handled correctly
    let rawSubtotal = Number(order.subtotal_server || 0);
    let rawShipping = Number(order.shipping_server || 0);
    const rawTotal = Number(order.total || 0);

    // Detect if server-saved values are in cents while total is in INR (common inconsistency)
    if (rawTotal > 0 && rawSubtotal + rawShipping > rawTotal * 50) {
      console.warn(
        "⚠️ Order subtotal/shipping detected in cents. Normalizing...",
        { rawSubtotal, rawShipping, rawTotal },
      );
      rawSubtotal = rawSubtotal / 100;
      rawShipping = rawShipping / 100;
    }

    const subtotal = rawSubtotal || rawTotal - rawShipping;
    const shipping = rawShipping;
    const gstAmount = Number(order.total_gst_server || 0);
    const grandTotal = rawTotal;

    const fmt = (n: number) =>
      `Rs. ${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

    // Total in words helper (Simplified for common totals)
    const numberToWords = (n: number) => {
      return "Rupees " + Number(n).toLocaleString("en-IN") + " Only";
    };

    // ── Build offscreen HTML invoice ───────────────────────────────────
    const container = document.createElement("div");
    container.id = "invoice-container";
    container.style.cssText =
      'position:fixed;left:-9999px;top:0;width:800px;background:#fff;padding:0;margin:0;box-sizing:border-box;font-family:"Segoe UI", Roboto, Helvetica, Arial, sans-serif;';
    document.body.appendChild(container);

    const items = Array.isArray(order.items) ? order.items : [];
    const itemRows = items
      .map((item: any, i: number) => {
        let unit = Number(item.price || 0);
        const qty = Number(item.quantity || 0);

        // Heuristic: If unit price * quantity is way higher than total, it's likely in cents
        if (grandTotal > 0 && unit * qty > grandTotal * 50) {
          unit = unit / 100;
        }

        const gstRate = item.gst_rate || 0;
        const gstAmount = item.gst_amount || 0;
        const gstText = gstRate > 0 ? ` | GST: ${gstRate}% (₹${gstAmount})` : '';

        return `
            <tr style="border-bottom: 1px solid #edf2f7;">
                <td style="padding: 12px; color: #718096; font-size: 11px; text-align: center; width: 40px;">${i + 1}</td>
                <td style="padding: 12px; text-align: left;">
                    <div style="font-weight: 700; color: #2d3748; font-size: 12px; line-height: 1.3;">${item.name || ""}</div>
                    <div style="font-size: 9px; color: #a0aec0; margin-top: 2px;">HSN/SAC: 6304${gstText}</div>
                </td>
                <td style="padding: 12px; color: #4a5568; font-size: 11px; text-align: center; width: 60px; font-weight: 600;">${qty} Nos</td>
                <td style="padding: 12px; color: #4a5568; font-size: 11px; text-align: right; width: 100px; font-family: 'Courier New', Courier, monospace;">${fmt(unit)}</td>
                <td style="padding: 12px; color: #2D1B4E; font-size: 12px; font-weight: 800; text-align: right; width: 100px; font-family: 'Courier New', Courier, monospace;">${fmt(unit * qty)}</td>
            </tr>`;
      })
      .join("");

    const cityLine = [
      order.city,
      order.state,
      order.pincode ? `- ${order.pincode}` : "",
    ]
      .filter(Boolean)
      .join(", ");

    container.innerHTML = `
        <div style="width: 800px; height: 1130px; display: flex; flex-direction: column; background: #fff; position: relative; color: #2d3748; box-sizing: border-box; overflow: hidden;">
            
            <div style="height: 6px; background: linear-gradient(90deg, #2D1B4E, #8E2A8B); width: 100%;"></div>

            <!-- HEADER -->
            <div style="padding: 30px 50px 25px; display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                    <img src="/uploads/2026/01/kottravai-logo-final.png" style="height: 65px; width: auto; margin-bottom: 8px;" />
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 36px; font-weight: 950; color: #2D1B4E; letter-spacing: -1.2px; line-height: 0.9; margin-bottom: 12px;">TAX INVOICE</div>
                    <div style="background: #f7fafc; border: 1px solid #e2e8f0; padding: 6px 15px; display: inline-block; border-radius: 6px;">
                        <span style="font-size: 10px; font-weight: 800; color: #718096; text-transform: uppercase; margin-right: 8px;">Invoice No:</span>
                        <span style="font-size: 14px; font-weight: 900; color: #2D1B4E;">${invoiceId}</span>
                    </div>
                </div>
            </div>

            <!-- DETAILS GRID -->
            <div style="padding: 0 50px; display: flex; gap: 30px; margin-bottom: 25px;">
                <div style="flex: 1; border-left: 3px solid #8E2A8B; padding-left: 15px;">
                    <div style="font-size: 10px; font-weight: 900; color: #8E2A8B; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 1px;">FROM</div>
                    <div style="font-size: 16px; font-weight: 900; color: #2D1B4E; margin-bottom: 4px;">KOTTRAVAI ENTERPRISES PRIVATE LIMITED</div>
                    <div style="font-size: 10.5px; color: #4a5568; line-height: 1.5;">
                        Vazhai Incubator,<br/>
                        S Veerasamy Chettiar College,<br/>
                        Puliyangudi - 627855,<br/>
                        Tamil Nadu, India<br/>
                        <span style="color: #718096; font-weight: 700;">GSTIN:</span> <span style="font-weight: 800; color: #2D1B4E;">33AALCK4299D1ZD</span><br/>
                        <span style="color: #718096; font-weight: 700;">State:</span> Tamil Nadu
                    </div>
                </div>

                <div style="flex: 1; border-left: 3px solid #edf2f7; padding-left: 15px;">
                    <div style="font-size: 10px; font-weight: 900; color: #A0AEC0; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 1px;">Billed To</div>
                    <div style="font-size: 16px; font-weight: 900; color: #2D1B4E; margin-bottom: 4px;">${order.customerName || "Customer"}</div>
                    <div style="font-size: 10.5px; color: #4a5568; line-height: 1.5;">
                        ${order.customerEmail || ""}<br/>
                        ${order.address || ""}<br/>
                        ${cityLine}<br/>
                        <span style="color: #718096; font-weight: 700;">Phone:</span> ${order.customerPhone || "N/A"}
                    </div>
                </div>
            </div>

            <!-- META INFO BOX -->
            <div style="margin: 0 50px 25px; background: #2D1B4E; padding: 15px 25px; border-radius: 10px; display: flex; justify-content: space-between; align-items: center;">
                <div style="text-align: left;">
                    <div style="font-size: 9px; color: rgba(255,255,255,0.6); font-weight: 800; text-transform: uppercase; margin-bottom: 2px;">Invoice Date</div>
                    <div style="font-size: 13px; font-weight: 800; color: #fff;">${dateStr}</div>
                </div>
                <div style="width: 1px; height: 25px; background: rgba(255,255,255,0.15);"></div>
                <div style="text-align: left;">
                    <div style="font-size: 9px; color: rgba(255,255,255,0.6); font-weight: 800; text-transform: uppercase; margin-bottom: 2px;">Payment Method</div>
                    <div style="font-size: 13px; font-weight: 800; color: #fff;">Prepaid (Razorpay)</div>
                </div>
                <div style="width: 1px; height: 25px; background: rgba(255,255,255,0.15);"></div>
                <div style="text-align: left;">
                    <div style="font-size: 9px; color: rgba(255,255,255,0.6); font-weight: 800; text-transform: uppercase; margin-bottom: 2px;">Status</div>
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <div style="width: 6px; height: 6px; border-radius: 50%; background: #48bb78;"></div>
                        <div style="font-size: 12px; font-weight: 900; color: #fff; text-transform: uppercase;">PAID</div>
                    </div>
                </div>
            </div>

            <!-- TABLE CONTENT -->
            <div style="padding: 0 50px; flex: 1;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="border-bottom: 2px solid #2D1B4E;">
                            <th style="padding: 10px; color: #2D1B4E; font-size: 10px; font-weight: 900; text-transform: uppercase; text-align: center; width: 40px;">No.</th>
                            <th style="padding: 10px; color: #2D1B4E; font-size: 10px; font-weight: 900; text-transform: uppercase; text-align: left;">Item Description</th>
                            <th style="padding: 10px; color: #2D1B4E; font-size: 10px; font-weight: 900; text-transform: uppercase; text-align: center; width: 60px;">Qty</th>
                            <th style="padding: 10px; color: #2D1B4E; font-size: 10px; font-weight: 900; text-transform: uppercase; text-align: right; width: 110px;">Rate</th>
                            <th style="padding: 10px; color: #2D1B4E; font-size: 10px; font-weight: 900; text-transform: uppercase; text-align: right; width: 110px;">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemRows}
                        ${items.length < 5 ? `<tr style="height: 100px;"><td colspan="5"></td></tr>` : ""}
                    </tbody>
                </table>
            </div>

            <!-- FOOTER WRAPPER -->
            <div style="padding: 25px 50px 40px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 40px;">
                    <div style="max-width: 320px;">
                        <div style="margin-bottom: 15px;">
                            <div style="font-size: 9px; font-weight: 900; color: #A0AEC0; text-transform: uppercase; margin-bottom: 4px;">Amount in Words</div>
                            <div style="font-size: 12px; font-weight: 800; color: #2D1B4E;">${numberToWords(grandTotal)}</div>
                        </div>
                        
                        <div style="background: #fdf2f8; border-radius: 10px; padding: 12px; border: 1px solid #f9a8d4;">
                            <div style="font-size: 9px; font-weight: 900; color: #8E2A8B; text-transform: uppercase; margin-bottom: 4px;">Terms & Conditions</div>
                            <div style="font-size: 9px; color: #8E2A8B; line-height: 1.5; font-weight: 500;">
                                • Prices include GST where applicable<br/>
                                • Handcrafted products - unique subtle variations<br/>
                                • Verification needed within 48h for claims
                            </div>
                        </div>
                    </div>

                    <div style="width: 280px; background: #fff; border: 2px solid #2D1B4E; border-radius: 12px; overflow: hidden;">
                        <div style="padding: 10px 15px; display: flex; justify-content: space-between; border-bottom: 1px solid #edf2f7;">
                            <span style="font-size: 11px; font-weight: 700; color: #718096;">Subtotal</span>
                            <span style="font-size: 11px; font-weight: 800; color: #2D1B4E;">${fmt(subtotal)}</span>
                        </div>
                        <div style="padding: 10px 15px; display: flex; justify-content: space-between; border-bottom: 1px solid #edf2f7;">
                            <span style="font-size: 11px; font-weight: 700; color: #718096;">Shipping</span>
                            <span style="font-size: 11px; font-weight: 800; color: #2D1B4E;">${fmt(shipping)}</span>
                        </div>
                        <div style="padding: 10px 15px; display: flex; justify-content: space-between; border-bottom: 1px solid #edf2f7;">
                            <span style="font-size: 11px; font-weight: 700; color: #718096;">GST</span>
                            <span style="font-size: 11px; font-weight: 800; color: #2D1B4E;">${fmt(gstAmount)}</span>
                        </div>
                        <div style="padding: 15px; display: flex; justify-content: space-between; background: #2D1B4E; color: #fff;">
                            <span style="font-size: 14px; font-weight: 900; text-transform: uppercase;">Grand Total</span>
                            <span style="font-size: 18px; font-weight: 950;">${fmt(grandTotal)}</span>
                        </div>
                    </div>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #edf2f7; padding-top: 25px;">
                    <div style="font-size: 9px; color: #A0AEC0; font-weight: 600;">Generated: ${new Date().toLocaleString()}</div>
                </div>
            </div>

            <div style="background: #f7fafc; padding: 20px 50px; border-top: 1px solid #edf2f7; display: flex; justify-content: space-between; align-items: center; margin-top: auto;">
                <div style="font-size: 9px; font-weight: 700; color: #718096; text-transform: uppercase;">+91 97870 30811 &nbsp;|&nbsp; support@kottravai.in &nbsp;|&nbsp; kottravai.in</div>
                <div style="font-size: 11px; font-weight: 950; color: #2D1B4E; text-transform: uppercase; letter-spacing: 2px;">KOTTRAVAI</div>
            </div>
        </div>`;

    toast.loading("Generating industry-grade tax invoice...", { id: "inv" });
    try {
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });
      document.body.removeChild(container);

      const imgData = canvas.toDataURL("image/png", 1.0);
      const pdf = new jsPDF({
        unit: "mm",
        format: "a4",
        orientation: "portrait",
      });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = (canvas.height * pdfW) / canvas.width;

      if (pdfH <= 297) {
        pdf.addImage(imgData, "PNG", 0, 0, pdfW, pdfH, undefined, "FAST");
      } else {
        let y = 0;
        const pageH = 297;
        while (y < pdfH) {
          if (y > 0) pdf.addPage();
          pdf.addImage(imgData, "PNG", 0, -y, pdfW, pdfH, undefined, "FAST");
          y += pageH;
        }
      }

      const safeName = (order.customerName || "Customer").replace(/\s+/g, "_");
      pdf.save(`Kottravai_Tax_Invoice_${invoiceId}_${safeName}.pdf`);
      toast.success("Professional tax invoice generated!", { id: "inv" });
    } catch (err) {
      if (document.getElementById("invoice-container"))
        document.body.removeChild(container);
      toast.error("Invoice generation failed", { id: "inv" });
      console.error(err);
    }
  };

  const handleShiprocketPush = async (order: any) => {
    const tid = toast.loading(
      `Pushing order #${order.id.slice(0, 8)} to Shiprocket...`,
    );
    try {
      const adminSecret =
        sessionStorage.getItem("kottravai_admin_token") || "";
      const response = await axios.post(
        `${API_BASE}/api/admin/orders/${order.id}/shiprocket`,
        {},
        {
          headers: { "X-Admin-Secret": adminSecret },
        },
      );

      if (response.data.success) {
        toast.success("Shiprocket order created!", { id: tid });
        fetchAllOrders(); // Refresh list to show SR ID
      }
    } catch (error: any) {
      console.error("Shiprocket Push Error:", error);
      const msg =
        error.response?.data?.message || error.message || "Unknown error";
      toast.error(`Shiprocket Error: ${msg}`, { id: tid, duration: 5000 });
    }
  };

  const recentActivity = [
    {
      id: 1,
      type: "order",
      message: "New order received from John Doe",
      time: "5 mins ago",
      status: "success",
    },
    {
      id: 2,
      type: "stock",
      message: 'Product "Bento Box" is low on stock',
      time: "12 mins ago",
      status: "warning",
    },
    {
      id: 3,
      type: "review",
      message: 'New 5-star review on "Ceramic Plate"',
      time: "1 hour ago",
      status: "info",
    },
    {
      id: 4,
      type: "news",
      message: 'News article "Safety First" published',
      time: "3 hours ago",
      status: "success",
    },
  ];

  const topProducts = Array.isArray(products) ? products.slice(0, 4).map((p) => ({
    name: p.name,
    sales: Math.floor(Math.random() * 500) + 100,
    growth: Math.floor(Math.random() * 20) + 5,
    image: p.image,
  })) : [];

  const filteredReviews = getReviewsByPage(reviewPage);

  // Calculate dynamic stats
  const totalSales = Array.isArray(orders) ? orders.reduce((sum, order) => sum + order.total, 0) : 0;
  const totalOrders = Array.isArray(orders) ? orders.length : 0;

  // Calculate growth (comparing this month vs last month)
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const thisMonthOrders = Array.isArray(orders) ? orders.filter(
    (o) => new Date(o.date) >= thisMonthStart,
  ) : [];
  const lastMonthOrders = Array.isArray(orders) ? orders.filter((o) => {
    const d = new Date(o.date);
    return d >= lastMonthStart && d < thisMonthStart;
  }) : [];

  const thisMonthSales = Array.isArray(thisMonthOrders) ? thisMonthOrders.reduce(
    (sum, order) => sum + order.total,
    0,
  ) : 0;
  const lastMonthSales = Array.isArray(lastMonthOrders) ? lastMonthOrders.reduce(
    (sum, order) => sum + order.total,
    0,
  ) : 0;

  const salesGrowth =
    lastMonthSales === 0
      ? thisMonthSales > 0
        ? 12
        : 0
      : ((thisMonthSales - lastMonthSales) / lastMonthSales) * 100;
  const ordersGrowth =
    lastMonthOrders.length === 0
      ? thisMonthOrders.length > 0
        ? 5
        : 0
      : ((thisMonthOrders.length - lastMonthOrders.length) /
          lastMonthOrders.length) *
        100;

  // Extract unique customers from orders
  const customers = Array.isArray(orders) ? orders.reduce((acc: any[], order) => {
    const existing = acc.find((c) => c.email === order.customerEmail);
    if (existing) {
      existing.totalSpent += order.total;
      existing.orderCount += 1;
      if (new Date(order.date) > new Date(existing.lastOrder)) {
        existing.lastOrder = order.date;
      }
    } else {
      acc.push({
        name: order.customerName,
        email: order.customerEmail,
        phone: order.customerPhone,
        totalSpent: order.total,
        orderCount: 1,
        lastOrder: order.date,
      });
    }
    return acc;
  }, []) : [];

  // Helper: get all descendant slugs for a given category slug (recursive)
  const getDescendantSlugs = (slug: string): string[] => {
    const children = Array.isArray(categories) ? categories.filter((c) => c.parent === slug) : [];
    return [slug, ...children.flatMap((c) => getDescendantSlugs(c.slug))];
  };

  // Filter products by category slug (includes all nested sub-categories)
  const filteredProducts = Array.isArray(products) ? products.filter((p) => {
    const matchesCategory =
      selectedCategory === "all" ||
      (p.categorySlug &&
        getDescendantSlugs(selectedCategory).includes(p.categorySlug));
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "live" ? p.isLive !== false : p.isLive === false);
    const matchesSearch =
      !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesStatus && matchesSearch;
  }) : [];

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    originalPrice: "",
    campaignTag: "",
    category: categories[0]?.slug || "", // Use slug for value
    description: "",
    shortDescription: "",
    keyFeatures: "",
    specifications: "",

    reviews: "",
    isBestSeller: false,
    isGiftBundleItem: false,
    isLive: true,
    isCustomRequest: false,
    is_affiliate_eligible: false,
    affiliate_commission_rate: 10,
    affiliate_payout_type: "percentage" as "percentage" | "fixed",
    affiliate_fixed_amount: 0,
    min_affiliate_level: "Ambassador",
    isCustomizable: false,
    customizationCharge: 100,
    allowCustomImage: false,
    allowCustomText: false,
    allowSpecialInstructions: false,
    customTextMaxLength: 50,
    customImageMaxSizeMB: 5,
    customizableTag: "CUSTOMIZABLE" as "CUSTOMIZABLE" | "PERSONALIZABLE" | "CUSTOM MADE",
    defaultFormFields: [
      {
        id: "name",
        label: "Name to Print",
        placeholder: "Enter the name exactly as you want",
        type: "text" as const,
        required: true,
        isDefault: true,
      },
      {
        id: "email",
        label: "Email Address",
        placeholder: "Enter your email address",
        type: "email" as const,
        required: true,
        isDefault: true,
      },
      {
        id: "phone",
        label: "Phone Number",
        placeholder: "Enter your phone number",
        type: "tel" as const,
        required: true,
        isDefault: true,
      },
      {
        id: "image",
        label: "Reference Image",
        placeholder: "Upload reference image (optional)",
        type: "file" as const,
        required: false,
        isDefault: true,
      },
    ],
    customFormConfig: [] as {
      id: string;
      label: string;
      type: "text" | "textarea" | "number";
      placeholder?: string;
      required?: boolean;
    }[],
    variants: [] as { weight: string; price: number; images: string[] }[],
    image_alts: {} as Record<string, string>,
  });

  const [mainImage, setMainImage] = useState<string>("");
  const [mainImageFile, setMainImageFile] = useState<File | null>(null);
  const [otherImages, setOtherImages] = useState<string[]>([]);
  const [otherImageFiles, setOtherImageFiles] = useState<File[]>([]);
  const [newsImageFile, setNewsImageFile] = useState<File | null>(null);
  const [reviewImageFile, setReviewImageFile] = useState<File | null>(null);
  const [partnerLogoFile, setPartnerLogoFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Base64 helper (for preview only)
  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  // Generic Upload Helper Proxy (Bypasses Storage RLS)
  const uploadToSupabase = async (
    file: File,
    folder: string,
  ): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);

    const adminSecret =
      sessionStorage.getItem("kottravai_admin_token") || "";

    try {
      const response = await axios.post(
        `${API_BASE}/api/storage/upload`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            "X-Admin-Secret": adminSecret,
          },
        },
      );

      return response.data.publicUrl;
    } catch (error: any) {
      console.error("❌ Upload Proxy Failed:", error);
      const resData = error.response?.data;
      const message =
        resData?.error ||
        resData?.message ||
        error.message ||
        "Failed to upload image via proxy";
      throw new Error(message);
    }
  };

  // File Handlers
  const handleMainImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const loadingToast = toast.loading("Optimizing main image...");
      try {
        const result = await compressImage(file);
        setMainImageFile(result.file);
        setCompressionStats({
          original: (result.originalSize / 1024).toFixed(1),
          compressed: (result.compressedSize / 1024).toFixed(1),
          saved: result.savedPercentage,
        });
        const base64 = await convertToBase64(result.file);
        setMainImage(base64); // For preview only
        toast.success(`Optimized: ${result.savedPercentage}% smaller`, {
          id: loadingToast,
        });
      } catch (err) {
        toast.error("Compression failed", { id: loadingToast });
        setMainImageFile(file);
        const base64 = await convertToBase64(file);
        setMainImage(base64);
      }
    }
  };

  const handleNewsImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const loadingToast = toast.loading("Optimizing news image...");
      const result = await compressImage(file);
      setNewsImageFile(result.file);
      const base64 = await convertToBase64(result.file);
      setNewsForm({ ...newsForm, image: base64 }); // For preview only
      toast.success(`Optimized: ${result.savedPercentage}% smaller`, {
        id: loadingToast,
      });
    }
  };

  const handleOtherImagesUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = e.target.files;
    if (files) {
      const fileList = Array.from(files);
      const loadingToast = toast.loading(
        `Optimizing ${fileList.length} images...`,
      );

      const optimizedResults = await Promise.all(
        fileList.map((f) => compressImage(f)),
      );
      const optimizedFiles = optimizedResults.map((r) => r.file);

      setOtherImageFiles((prev) => [...prev, ...optimizedFiles]);
      const base64Images = await Promise.all(
        optimizedFiles.map((f) => convertToBase64(f)),
      );
      setOtherImages((prev) => [...prev, ...base64Images]); // For preview only

      const totalSaved = optimizedResults.reduce(
        (acc, r) => acc + (r.originalSize - r.compressedSize),
        0,
      );
      toast.success(
        `Optimized ${fileList.length} images. Saved ${(totalSaved / 1024).toFixed(0)}KB`,
        { id: loadingToast },
      );
    }
  };

  const handleDeleteProduct = (productId: string, productName: string) => {
    if (
      window.confirm(
        `Are you sure you want to delete "${productName}"? This action cannot be undone.`,
      )
    ) {
      deleteProduct(productId);
      toast.success("Product deleted successfully");
    }
  };

  const handleEdit = (product: any) => {
    setEditingId(product.id);

    // Find slug from category name for proper select value
    const catObj = categories.find((c) => c.name === product.category);
    const catSlug = catObj ? catObj.slug : categories[0].slug;

    setFormData({
      name: product.name,
      price: product.price.toString(),
      originalPrice: product.originalPrice ? product.originalPrice.toString() : "",
      campaignTag: product.campaignTag || "",
      category: catSlug,
      description: product.description || "",
      shortDescription: product.shortDescription || "", // assuming property exists or optional
      keyFeatures: product.keyFeatures ? product.keyFeatures.join("\n") : "",
      specifications: product.features ? product.features.join("\n") : "",

      reviews: "",
      isBestSeller: product.isBestSeller || false,
      isGiftBundleItem: product.isGiftBundleItem || false,
      isLive: product.isLive !== undefined ? product.isLive : true,
      isCustomRequest: product.isCustomRequest || false,
      defaultFormFields: product.defaultFormFields || [
        {
          id: "name",
          label: "Name to Print",
          placeholder: "Enter the name exactly as you want",
          type: "text" as const,
          required: true,
          isDefault: true,
        },
        {
          id: "email",
          label: "Email Address",
          placeholder: "Enter your email address",
          type: "email" as const,
          required: true,
          isDefault: true,
        },
        {
          id: "phone",
          label: "Phone Number",
          placeholder: "Enter your phone number",
          type: "tel" as const,
          required: true,
          isDefault: true,
        },
        {
          id: "image",
          label: "Reference Image",
          placeholder: "Upload reference image (optional)",
          type: "file" as const,
          required: false,
          isDefault: true,
        },
      ],
      customFormConfig: product.customFormConfig || [],
      is_affiliate_eligible: product.is_affiliate_eligible || false,
      affiliate_commission_rate: product.affiliate_commission_rate || 10,
      affiliate_payout_type: product.affiliate_payout_type || "percentage",
      affiliate_fixed_amount: product.affiliate_fixed_amount || 0,
      min_affiliate_level: product.min_affiliate_level || "Ambassador",
      isCustomizable: product.isCustomizable || false,
      customizationCharge: product.customizationCharge || 100,
      allowCustomImage: product.allowCustomImage || false,
      allowCustomText: product.allowCustomText || false,
      allowSpecialInstructions: product.allowSpecialInstructions || false,
      customTextMaxLength: product.customTextMaxLength || 50,
      customImageMaxSizeMB: product.customImageMaxSizeMB || 5,
      customizableTag: product.customizableTag || "CUSTOMIZABLE",
      variants: product.variants || [],
      image_alts: product.image_alts || {},
    });
    setMainImage(product.image);
    setOtherImages(product.images || []);
    setView("add");
  };

  const handleQuickEditInit = (product: any) => {
    setQuickEditId(product.id);
    setQuickEditForm({
      name: product.name,
      price: product.price.toString(),
      isBestSeller: product.isBestSeller || false,
      isGiftBundleItem: product.isGiftBundleItem || false,
      isLive: product.isLive !== undefined ? product.isLive : true,
    });
  };

  const handleQuickUpdate = async (product: any) => {
    setIsUploading(true);
    const updateToast = toast.loading("Performing quick update...");
    try {
      const updatedProduct = {
        ...product,
        name: quickEditForm.name,
        price: parseFloat(quickEditForm.price),
        isBestSeller: quickEditForm.isBestSeller,
        isGiftBundleItem: quickEditForm.isGiftBundleItem,
        isLive: quickEditForm.isLive,
        slug: quickEditForm.name
          .toLowerCase()
          .replace(/ /g, "-")
          .replace(/[^\w-]+/g, ""),
      };

      await updateProduct(updatedProduct);
      toast.success("Product updated!", { id: updateToast });
      setQuickEditId(null);
      fetchProducts(true);
    } catch (error) {
      toast.error("Failed to update product", { id: updateToast });
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      price: "",
      category: categories[0]?.slug || "",
      description: "",
      shortDescription: "",
      keyFeatures: "",
      specifications: "",
      reviews: "",
      isBestSeller: false,
      isGiftBundleItem: false,
      isLive: true,
      isCustomRequest: false,
      is_affiliate_eligible: false,
      affiliate_commission_rate: 10,
      affiliate_payout_type: "percentage",
      affiliate_fixed_amount: 0,
      min_affiliate_level: "Ambassador",
      defaultFormFields: [
        {
          id: "name",
          label: "Name to Print",
          placeholder: "Enter the name exactly as you want",
          type: "text" as const,
          required: true,
          isDefault: true,
        },
        {
          id: "email",
          label: "Email Address",
          placeholder: "Enter your email address",
          type: "email" as const,
          required: true,
          isDefault: true,
        },
        {
          id: "phone",
          label: "Phone Number",
          placeholder: "Enter your phone number",
          type: "tel" as const,
          required: true,
          isDefault: true,
        },
        {
          id: "image",
          label: "Reference Image",
          placeholder: "Upload reference image (optional)",
          type: "file" as const,
          required: false,
          isDefault: true,
        },
      ],
      customFormConfig: [],
      variants: [],
      isCustomizable: false,
      customizationCharge: 100,
      allowCustomImage: false,
      allowCustomText: false,
      allowSpecialInstructions: false,
      customTextMaxLength: 50,
      customImageMaxSizeMB: 5,
      customizableTag: "CUSTOMIZABLE",
      image_alts: {},
    });
    setMainImage("");
    setMainImageFile(null);
    setOtherImages([]);
    setOtherImageFiles([]);
    setEditingId(null);
    setIsUploading(false);
    setStatusFilter("all");
    setSearchQuery("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Validation
    if (!formData.name.trim()) return toast.error("Product Name is required");
    if (
      !formData.isCustomRequest &&
      (!formData.price || isNaN(parseFloat(formData.price)))
    )
      return toast.error("Please enter a valid price");
    if (!formData.category) return toast.error("Please select a category");
    if (!mainImage && !mainImageFile)
      return toast.error("Main Product Image is required");

    setIsUploading(true);
    const uploadToast = toast.loading(
      editingId ? "Updating product..." : "Creating product...",
    );

    try {
      // 2. Upload Images to Supabase if they are new files
      let uploadedMainUrl = mainImage;
      if (mainImageFile) {
        uploadedMainUrl = await uploadToSupabase(mainImageFile, "products");
      }

      const uploadedOtherUrls = await Promise.all(
        otherImages.map(async (img, idx) => {
          // Check if this index has a corresponding file in otherImageFiles
          // (Matches by index if otherImageFiles were added in order)
          // If it's already a URL (not base64), keep it
          if (img.startsWith("http")) return img;

          // Find the matching file index. Note: This simple logic assumes
          // otherImageFiles matches 1:1 with base64 strings in otherImages
          // that don't start with http.
          const fileIndex = otherImages
            .slice(0, idx)
            .filter((ui) => !ui.startsWith("http")).length;
          if (otherImageFiles[fileIndex]) {
            return await uploadToSupabase(
              otherImageFiles[fileIndex],
              "gallery",
            );
          }
          return img;
        }),
      );

      // Find category name from slug
      const categoryObj = categories.find((c) => c.slug === formData.category);
      const categoryName = categoryObj ? categoryObj.name : "Uncategorized";

      // Find existing product to preserve reviews if editing
      const existingProduct = products.find((p) => p.id === editingId);
      const existingReviews = existingProduct?.reviews || [];

      // Resolve final image alt mappings (handling base64/temp keys rewriting to Supabase storage public URLs)
      const finalImageAlts: Record<string, string> = {};
      if (mainImage && formData.image_alts[mainImage]) {
        finalImageAlts[uploadedMainUrl] = formData.image_alts[mainImage];
      }
      otherImages.forEach((img, idx) => {
        const finalUrl = uploadedOtherUrls[idx];
        if (finalUrl && formData.image_alts[img]) {
          finalImageAlts[finalUrl] = formData.image_alts[img];
        }
      });

      const productData = {
        id: editingId || Date.now().toString(),
        name: formData.name,
        price: formData.isCustomRequest ? 0 : parseFloat(formData.price),
        category: categoryName,
        categorySlug: formData.category,
        slug: formData.name
          .toLowerCase()
          .replace(/ /g, "-")
          .replace(/[^\w-]+/g, ""),
        image: uploadedMainUrl,
        images: uploadedOtherUrls,
        image_alts: finalImageAlts,
        shortDescription: formData.shortDescription,
        description: formData.description,
        keyFeatures: formData.keyFeatures
          .split("\n")
          .filter((f) => f.trim() !== ""),
        features: formData.specifications
          .split("\n")
          .filter((f) => f.trim() !== ""),
        reviews: existingReviews,
        isBestSeller: formData.isBestSeller,
        isGiftBundleItem: formData.isGiftBundleItem,
        isLive: formData.isLive,
        isCustomRequest: formData.isCustomRequest,
        defaultFormFields: formData.defaultFormFields,
        customFormConfig: formData.customFormConfig,
        is_affiliate_eligible: formData.is_affiliate_eligible,
        affiliate_commission_rate: formData.affiliate_commission_rate,
        affiliate_payout_type: formData.affiliate_payout_type,
        affiliate_fixed_amount: formData.affiliate_fixed_amount,
        min_affiliate_level: formData.min_affiliate_level,
        isCustomizable: formData.isCustomizable,
        customizationCharge: formData.customizationCharge,
        allowImageUpload: formData.allowCustomImage,
        allowCustomText: formData.allowCustomText,
        allowSpecialInstructions: formData.allowSpecialInstructions,
        maxTextLength: formData.customTextMaxLength,
        maxFileSize: formData.customImageMaxSizeMB,
        customizableTag: formData.customizableTag,
        variants: formData.variants,
        originalPrice: formData.originalPrice ? parseFloat(formData.originalPrice) : undefined,
        campaignTag: formData.campaignTag || undefined,
      };

      if (editingId) {
        await updateProduct(productData);
        toast.success("Product Updated Successfully!", { id: uploadToast });
      } else {
        await addProduct(productData);
        toast.success("Product Added Successfully!", { id: uploadToast });
      }

      await fetchProducts(true);
      setView("list");
      resetForm();
    } catch (error: any) {
      console.error("❌ Failed to save product:", error);

      // Extract the most meaningful error message
      let errorMessage = "Unknown error occurred";

      if (error.response?.data) {
        const data = error.response.data;
        // Show the most descriptive error: prefer specific pg/DB errors over generic label
        const specificMsg = data.details || data.message || data.error;
        errorMessage = typeof specificMsg === "string" ? specificMsg : JSON.stringify(data);
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error(`Failed to save product: ${errorMessage}`, {
        id: uploadToast,
        duration: 8000,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddVideo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVideo.title || !newVideo.url)
      return toast.error("Please fill in both fields");

    // Simple embed conversion if user pastes full URL
    let embedUrl = newVideo.url;
    if (newVideo.url.includes("watch?v=")) {
      embedUrl = newVideo.url.replace("watch?v=", "embed/");
    } else if (newVideo.url.includes("youtu.be/")) {
      embedUrl = newVideo.url.replace("youtu.be/", "www.youtube.com/embed/");
    }

    if (editingVideoId) {
      updateVideo({ id: editingVideoId, title: newVideo.title, url: embedUrl });
      setEditingVideoId(null);
      toast.success("Video updated successfully");
    } else {
      addVideo({ title: newVideo.title, url: embedUrl });
      toast.success("Video added successfully");
    }

    setNewVideo({ title: "", url: "" });
  };

  const handleEditVideo = (video: any) => {
    setEditingVideoId(video.id);
    setNewVideo({ title: video.title, url: video.url });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelVideoEdit = () => {
    setEditingVideoId(null);
    setNewVideo({ title: "", url: "" });
  };

  const handleAddNews = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !newsForm.title ||
      !newsForm.category ||
      !newsForm.date ||
      !newsForm.link
    )
      return toast.error("Please fill all fields");

    setIsUploading(true);
    const uploadToast = toast.loading("Saving news item...");
    try {
      let uploadedImageUrl = newsForm.image;
      if (newsImageFile) {
        uploadedImageUrl = await uploadToSupabase(newsImageFile, "news");
      }

      const newsData = { ...newsForm, image: uploadedImageUrl };

      if (editingNewsId) {
        updateNewsItem({ id: editingNewsId, ...newsData });
        setEditingNewsId(null);
        toast.success("News updated successfully", { id: uploadToast });
      } else {
        addNewsItem(newsData);
        toast.success("News added successfully", { id: uploadToast });
      }
      setNewsForm({ title: "", category: "", date: "", image: "", link: "" });
      setNewsImageFile(null);
    } catch (error: any) {
      toast.error("Failed to save news item", { id: uploadToast });
    } finally {
      setIsUploading(false);
    }
  };

  const handleEditNews = (news: any) => {
    setEditingNewsId(news.id);
    setNewsForm({
      title: news.title,
      category: news.category,
      date: news.date,
      image: news.image,
      link: news.link,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelNewsEdit = () => {
    setEditingNewsId(null);
    setNewsForm({ title: "", category: "", date: "", image: "", link: "" });
  };

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewForm.name || !reviewForm.content)
      return toast.error("All fields are required");

    setIsUploading(true);
    const uploadToast = toast.loading("Saving review...");
    try {
      let uploadedImageUrl = reviewForm.image;
      if (reviewImageFile) {
        uploadedImageUrl = await uploadToSupabase(reviewImageFile, "reviews");
      }

      const reviewData = {
        ...reviewForm,
        image: uploadedImageUrl,
        page: reviewPage,
      };

      if (editingReviewId) {
        updateReview({ id: editingReviewId, ...reviewData });
        setEditingReviewId(null);
        toast.success("Review updated successfully", { id: uploadToast });
      } else {
        addReview(reviewData);
        toast.success("Review added successfully", { id: uploadToast });
      }
      setReviewForm({ name: "", role: "", content: "", image: "", rating: 5 });
      setReviewImageFile(null);
    } catch (error: any) {
      toast.error("Failed to save review", { id: uploadToast });
    } finally {
      setIsUploading(false);
    }
  };

  const handleEditReview = (review: any) => {
    setEditingReviewId(review.id);
    setReviewForm({
      name: review.name,
      role: review.role,
      content: review.content,
      image: review.image,
      rating: review.rating || 5,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelReviewEdit = () => {
    setEditingReviewId(null);
    setReviewForm({ name: "", role: "", content: "", image: "", rating: 5 });
  };

  const handleReviewImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const loadingToast = toast.loading("Optimizing review image...");
      const result = await compressImage(file);
      setReviewImageFile(result.file);
      const base64 = await convertToBase64(result.file);
      setReviewForm({ ...reviewForm, image: base64 });
      toast.success(`Optimized: ${result.savedPercentage}% smaller`, {
        id: loadingToast,
      });
    }
  };

  const handleAddPartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerForm.name) return toast.error("Partner Name is required");

    setIsUploading(true);
    const uploadToast = toast.loading("Saving partner...");
    try {
      let uploadedLogoUrl = partnerForm.logo;
      if (partnerLogoFile) {
        uploadedLogoUrl = await uploadToSupabase(partnerLogoFile, "partners");
      }

      const partnerData = { ...partnerForm, logo: uploadedLogoUrl };

      if (editingPartnerId) {
        updatePartner({ id: editingPartnerId, ...partnerData });
        setEditingPartnerId(null);
        toast.success("Partner updated successfully", { id: uploadToast });
      } else {
        addPartner(partnerData);
        toast.success("Partner added successfully", { id: uploadToast });
      }
      setPartnerForm({ name: "", logo: "" });
      setPartnerLogoFile(null);
    } catch (error: any) {
      toast.error("Failed to save partner", { id: uploadToast });
    } finally {
      setIsUploading(false);
    }
  };

  const handleEditPartner = (partner: any) => {
    setEditingPartnerId(partner.id);
    setPartnerForm({
      name: partner.name,
      logo: partner.logo || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelPartnerEdit = () => {
    setEditingPartnerId(null);
    setPartnerForm({ name: "", logo: "" });
  };

  const handlePartnerLogoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const loadingToast = toast.loading("Optimizing logo...");
      const result = await compressImage(file);
      setPartnerLogoFile(result.file);
      const base64 = await convertToBase64(result.file);
      setPartnerForm({ ...partnerForm, logo: base64 });
      toast.success(`Optimized: ${result.savedPercentage}% smaller`, {
        id: loadingToast,
      });
    }
  };

  const removeOtherImage = (index: number) => {
    const isFile = !otherImages[index].startsWith("http");
    if (isFile) {
      // Find which file in otherImageFiles corresponds to this index
      const fileIndex = otherImages
        .slice(0, index)
        .filter((img) => !img.startsWith("http")).length;
      setOtherImageFiles((prev) => prev.filter((_, i) => i !== fileIndex));
    }
    setOtherImages((prev) => prev.filter((_, i) => i !== index));
  };

  if (isAdminAuthenticated === null) return null; // Prevent flicker

  return (
    <>
      <Helmet>
        <title>Admin Dashboard | Kottravai</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="min-h-screen bg-gray-50 flex font-sans relative overflow-x-hidden">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[#2D1B4E] flex items-center justify-between px-6 z-50 shadow-lg">
        <img
          src="/admin-logo.png"
          alt="Kottravai"
          className="h-8 w-auto brightness-0 invert"
        />
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
        >
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 w-72 bg-[#2D1B4E] text-white flex-shrink-0 flex flex-col border-r border-white/5 shadow-2xl overflow-hidden transition-transform duration-300 z-50 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#8E2A8B] via-purple-400 to-[#8E2A8B]"></div>

        <div className="p-8 pb-10">
          <div className="flex flex-col items-center">
            <div className="relative group cursor-pointer">
              <div className="absolute -inset-1 bg-gradient-to-r from-[#8E2A8B] to-purple-600 rounded-full blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
              <img
                src="/admin-logo.png"
                alt="Kottravai"
                className="relative w-48 h-auto object-contain transition-all duration-500 group-hover:scale-105 group-hover:brightness-0 group-hover:invert"
              />
            </div>
            <div className="mt-4 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
              <span className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em]">
                System Core Active
              </span>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-10 overflow-y-auto no-scrollbar pb-10">
          {/* Main Section */}
          <div className="space-y-2">
            <p className="px-4 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4">
              Central Hub
            </p>
            <button
              onClick={() => {
                setView("dashboard");
                resetForm();
                setSelectedCategory("all");
                fetchProducts(true);
                setIsSidebarOpen(false);
              }}
              className={`w-full text-left px-5 py-3.5 rounded-2xl transition-all duration-300 font-bold flex items-center gap-4 group ${view === "dashboard" ? "sidebar-item-active" : "text-gray-400 hover:bg-white/5 hover:text-white"}`}
            >
              <div
                className={`p-2 rounded-xl transition-colors ${view === "dashboard" ? "bg-white/20" : "bg-gray-800 group-hover:bg-gray-700"}`}
              >
                <LayoutDashboard size={20} />
              </div>
              <span className="text-sm">Control Tower</span>
            </button>
          </div>

          {/* Management Section */}
          <div className="space-y-4">
            <p className="px-4 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">
              Commerce Lab
            </p>
            <div className="space-y-2">
              {[
                {
                  view: "list",
                  icon: Package,
                  label: "Inventory",
                  active: selectedCategory === "all" && view === "list",
                },
                {
                  view: "stocks",
                  icon: Activity,
                  label: "Stock Levels",
                  active: view === "stocks",
                },
                {
                  view: "orders",
                  icon: ShoppingBag,
                  label: "Order Streams",
                  active: view === "orders",
                },
                {
                  view: "users",
                  icon: Users,
                  label: "User Insights",
                  active: view === "users",
                },
                  {
                    view: "leads",
                    icon: MessageSquareQuote,
                    label: "Leads",
                    active: view === "leads",
                  },
              ].map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    if (item.view === "list") {
                      setSelectedCategory("all");
                      fetchProducts(true);
                    }
                    if (item.view === "orders") {
                      fetchAllOrders(true);
                    }
                    if (item.view === "leads") {
                      fetchLeads();
                    }
                    setView(item.view as any);
                    resetForm();
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full text-left px-5 py-3 rounded-2xl transition-all duration-300 font-bold flex items-center justify-between group ${item.active ? "sidebar-item-active" : "text-gray-400 hover:bg-white/5 hover:text-white"}`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`p-2 rounded-xl transition-colors ${item.active ? "bg-white/20" : "bg-gray-800 group-hover:bg-gray-700"}`}
                    >
                      <item.icon size={18} />
                    </div>
                    <span className="text-sm">{item.label}</span>
                  </div>
                  {item.active && (
                    <div className="h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_8px_white]"></div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* WhatsApp Tools */}
          <div className="space-y-4">
            <p className="px-4 text-[10px] font-black text-[#25D366] uppercase tracking-[0.2em]">
              WhatsApp Tools
            </p>
            <div className="space-y-2">
              <button
                onClick={() => {
                  setView("whatsapp-helper");
                  resetForm();
                }}
                className={`w-full text-left px-5 py-3 rounded-2xl transition-all duration-300 font-bold flex items-center justify-between group ${view === "whatsapp-helper" ? "sidebar-item-active" : "text-gray-400 hover:bg-white/5 hover:text-white"}`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`p-2 rounded-xl transition-colors ${view === "whatsapp-helper" ? "bg-[#25D366]/20" : "bg-gray-800 group-hover:bg-gray-700"}`}
                  >
                    <MessageCircle size={18} color="#25D366" />
                  </div>
                  <span className="text-sm">Catalog Assistant</span>
                </div>
                {view === "whatsapp-helper" && (
                  <div className="h-1.5 w-1.5 rounded-full bg-[#25D366] shadow-[0_0_8px_#25D366]"></div>
                )}
              </button>
            </div>
          </div>

          {/* Affiliate Program Section */}
          <div className="space-y-4">
            <p className="px-4 text-[10px] font-black text-[#8E2A8B] uppercase tracking-[0.2em]">
              Affiliate Network
            </p>
            <div className="space-y-2">
              {[
                {
                  view: "affiliate-dashboard",
                  icon: LayoutDashboard,
                  label: "Performance",
                },
                { view: "affiliates", icon: UserCheck, label: "Applications" },
                { view: "affiliate-partners", icon: Users, label: "Partners" },
                { view: "affiliate-payouts", icon: Wallet, label: "Payouts" },
              ].map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setView(item.view as any);
                    resetForm();
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full text-left px-5 py-3 rounded-2xl transition-all duration-300 font-bold flex items-center justify-between group ${view === item.view ? "sidebar-item-active" : "text-gray-400 hover:bg-white/5 hover:text-white"}`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`p-2 rounded-xl transition-colors ${view === item.view ? "bg-[#8E2A8B]/20" : "bg-gray-800 group-hover:bg-gray-700"}`}
                    >
                      <item.icon
                        size={18}
                        className={view === item.view ? "text-white" : ""}
                      />
                    </div>
                    <span className="text-sm">{item.label}</span>
                    {item.view === "affiliates" && affiliateApplications.filter(app => app.status?.toLowerCase() === "pending").length > 0 && (
                      <span className="bg-[#b5128f] text-white text-[10px] font-black px-2 py-0.5 rounded-full ml-1 animate-pulse">
                        {affiliateApplications.filter(app => app.status?.toLowerCase() === "pending").length}
                      </span>
                    )}
                  </div>
                  {view === item.view && (
                    <div className="h-1.5 w-1.5 rounded-full bg-[#8E2A8B] shadow-[0_0_8px_#8E2A8B]"></div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Leads Section */}
          <div className="space-y-4">
            <p className="px-4 text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em]">
              Lead Pipeline
            </p>
            <div className="space-y-2">
              <button
                onClick={() => {
                  setView("leads");
                  resetForm();
                  setIsSidebarOpen(false);
                  fetchLeads();
                }}
                className={`w-full text-left px-5 py-3 rounded-2xl transition-all duration-300 font-bold flex items-center justify-between group ${view === "leads" ? "sidebar-item-active" : "text-gray-400 hover:bg-white/5 hover:text-white"}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-xl transition-colors ${view === "leads" ? "bg-emerald-500/20" : "bg-gray-800 group-hover:bg-gray-700"}`}>
                    <Users size={18} className={view === "leads" ? "text-emerald-400" : ""} />
                  </div>
                  <span className="text-sm">Leads</span>
                </div>
                {view === "leads" && (
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]"></div>
                )}
              </button>
            </div>
          </div>

          {/* Content Section */}
          <div className="space-y-4">
            <p className="px-4 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">
              Brand Experience
            </p>
            <div className="space-y-2">
              {[
                {
                  view: "reviews",
                  icon: MessageSquareQuote,
                  label: "Feedback",
                },
                { view: "news", icon: Newspaper, label: "Newsroom" },
                { view: "videos", icon: Video, label: "Media Hub" },
                { view: "partners", icon: Handshake, label: "Alliances" },
                {
                  view: "alliance-apps",
                  icon: UserCheck,
                  label: "Applications",
                },
                {
                  view: "image-optimizer",
                  icon: RefreshCw,
                  label: "Image Optimizer",
                },
                {
                  view: "event-registrations",
                  icon: Calendar,
                  label: "Event Registrations",
                },
              ].map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setView(item.view as any);
                    resetForm();
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full text-left px-5 py-3 rounded-2xl transition-all duration-300 font-bold flex items-center justify-between group ${view === item.view ? "sidebar-item-active" : "text-gray-400 hover:bg-white/5 hover:text-white"}`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`p-2 rounded-xl transition-colors ${view === item.view ? "bg-white/20" : "bg-gray-800 group-hover:bg-gray-700"}`}
                    >
                      <item.icon size={18} />
                    </div>
                    <span className="text-sm">{item.label}</span>
                  </div>
                  {view === item.view && (
                    <div className="h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_8px_white]"></div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </nav>

        <div className="p-6 mt-auto">
          <div className="bg-gradient-to-br from-[#8E2A8B]/20 to-[#2D1B4E] rounded-2xl p-5 border border-[#8E2A8B]/30 shadow-inner">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-full bg-[#8E2A8B] flex items-center justify-center font-black text-white shadow-lg">
                AD
              </div>
              <div>
                <p className="text-xs font-black text-white">Super Admin</p>
                <p className="text-[10px] text-gray-400">Master Level Access</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-900/50 text-rose-400 text-xs font-black hover:bg-rose-500 hover:text-white transition-all duration-300"
            >
              <LogOut size={14} />
              CORE DISCONNECT
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-gray-50/50 pt-16 lg:pt-0">
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-6 lg:px-10 py-5 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-8 flex-1">
            <h2 className="text-2xl font-black text-[#2D1B4E] whitespace-nowrap admin-gradient-text">
              {view === "dashboard"
                ? "Overview"
                : view === "videos"
                  ? "Video Lab"
                  : view === "news"
                    ? "Press Hub"
                    : view === "reviews"
                      ? "Feedback Lab"
                      : view === "stocks"
                        ? "Inventory"
                        : view === "orders"
                          ? "Order Stream"
                          : view === "users"
                            ? "Monitoring"
                            : view === "leads"
                              ? "Leads"
                            : view === "partners"
                              ? "Alliances"
                              : view === "alliance-apps"
                                ? "Alliance Catalog"
                                : view === "add"
                                  ? editingId
                                    ? "Refine Product"
                                    : "Construct Product"
                                  : selectedCategory === "all"
                                    ? "Inventory Catalog"
                                    : categories.find(
                                        (c) => c.slug === selectedCategory,
                                      )?.name || selectedCategory}
            </h2>

            {/* Search Bar */}
            <div className="hidden md:flex items-center flex-1 max-w-md relative group">
              <Search
                className="absolute left-4 text-gray-400 group-focus-within:text-[#8E2A8B] transition-colors"
                size={18}
              />
              <input
                type="text"
                placeholder="Search everything..."
                className="w-full bg-gray-50 border-none rounded-2xl pl-12 pr-4 py-3 text-sm font-medium focus:ring-2 focus:ring-[#8E2A8B]/10 transition-all outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2 border-r border-gray-100 pr-5">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2.5 rounded-xl bg-gray-50 text-gray-500 hover:bg-[#8E2A8B]/5 hover:text-[#8E2A8B] transition-all group"
              >
                <Bell size={20} />
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-rose-500 border-2 border-white"></span>

                {showNotifications && (
                  <div className="absolute top-full right-0 mt-4 w-80 glass-card rounded-2xl p-4 shadow-2xl z-50 animate-in slide-in-from-top-2 duration-300">
                    <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-50">
                      <h4 className="font-black text-[#2D1B4E] text-xs uppercase tracking-widest">
                        Alerts Flow
                      </h4>
                      <span className="text-[10px] text-[#8E2A8B] font-bold">
                        4 New
                      </span>
                    </div>
                    <div className="space-y-3">
                      {recentActivity.slice(0, 3).map((n) => (
                        <div
                          key={n.id}
                          className="flex gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors"
                        >
                          <div
                            className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${n.status === "success" ? "bg-emerald-500" : "bg-amber-500"}`}
                          />
                          <p className="text-[11px] font-bold text-gray-600 line-clamp-2">
                            {n.message}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </button>
              <Link
                to="/"
                className="p-2.5 rounded-xl bg-gray-50 text-gray-500 hover:bg-[#8E2A8B]/5 hover:text-[#8E2A8B] transition-all"
              >
                <ImageIcon size={20} />
              </Link>
            </div>

            {view === "list" && (
              <button
                onClick={() => {
                  resetForm();
                  setView("add");
                }}
                className="bg-[#8E2A8B] text-white px-6 py-3 rounded-2xl flex items-center gap-3 hover:bg-[#722270] transition-all hover:shadow-xl hover:shadow-[#8E2A8B]/30 font-black text-sm uppercase tracking-wider"
              >
                <Plus size={18} />
                Deploy Item
              </button>
            )}

            <div className="flex items-center gap-3 pl-2">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-black text-[#2D1B4E]">Admin User</p>
                <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">
                  Active Access
                </p>
              </div>
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-[#8E2A8B] to-purple-800 p-[1px]">
                <div className="h-full w-full rounded-[15px] bg-white p-1">
                  <div className="h-full w-full rounded-xl bg-gray-100 flex items-center justify-center text-[#8E2A8B] font-black text-xs uppercase shadow-inner">
                    K
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="p-8">
          {view === "dashboard" ? (
            <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
              {/* Dashboard Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-extrabold text-[#2D1B4E]">
                    Intelligence Dashboard
                  </h1>
                  <p className="text-gray-500 mt-1">
                    Welcome back, Admin. Here's what's happening today.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-100">
                    <button
                      onClick={() => setActiveTab("overview")}
                      className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "overview" ? "bg-[#8E2A8B] text-white shadow-md" : "text-gray-500 hover:bg-gray-50"}`}
                    >
                      Overview
                    </button>
                    <button
                      onClick={() => setActiveTab("analytics")}
                      className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "analytics" ? "bg-[#8E2A8B] text-white shadow-md" : "text-gray-500 hover:bg-gray-50"}`}
                    >
                      Analytics
                    </button>
                    <button
                      onClick={() => setActiveTab("sales-copilot")}
                      className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "sales-copilot" ? "bg-[#8E2A8B] text-white shadow-md flex items-center gap-2" : "text-gray-500 hover:bg-gray-50 flex items-center gap-2"}`}
                    >
                      <Sparkles size={14} /> Copilot
                    </button>
                    <button
                      onClick={() => setActiveTab("pipeline-intelligence")}
                      className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === "pipeline-intelligence" ? "bg-[#8E2A8B] text-white shadow-md" : "text-gray-500 hover:bg-gray-50"}`}
                    >
                      <TrendingUp size={16} /> Pipeline Intelligence
                    </button>
                    {(!securityProfile || securityProfile.role !== "REPRESENTATIVE") && (
                      <>
                        <button
                          onClick={() => setActiveTab("business-intelligence")}
                          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === "business-intelligence" ? "bg-[#8E2A8B] text-white shadow-md" : "text-gray-500 hover:bg-gray-50"}`}
                        >
                          <BarChart3 className="w-4 h-4" />
                          Business Intelligence
                        </button>
                        <button
                          onClick={() => setActiveTab("customer-success")}
                          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === "customer-success" ? "bg-[#8E2A8B] text-white shadow-md" : "text-gray-500 hover:bg-gray-50"}`}
                        >
                          <HeartHandshake className="w-4 h-4" />
                          Customer Success
                        </button>
                        <button
                          onClick={() => setActiveTab("revenue-intelligence")}
                          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === "revenue-intelligence" ? "bg-indigo-600 text-white shadow-md" : "text-gray-500 hover:bg-gray-50"}`}
                        >
                          <DollarSign className="w-4 h-4" />
                          Revenue Intelligence
                        </button>
                        <button
                          onClick={() => setActiveTab("workflows")}
                          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === "workflows" ? "bg-[#8E2A8B] text-white shadow-md" : "text-gray-500 hover:bg-gray-50"}`}
                        >
                          <Zap className="w-4 h-4" />
                          Workflow Operations
                        </button>
                        <button
                          onClick={() => setActiveTab("executive-command")}
                          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === "executive-command" ? "bg-red-600 text-white shadow-md" : "text-gray-500 hover:bg-gray-50"}`}
                        >
                          <Terminal className="w-4 h-4" />
                          Executive Command
                        </button>
                        <button
                          onClick={() => setActiveTab("predictive-intelligence")}
                          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === "predictive-intelligence" ? "bg-emerald-600 text-white shadow-md" : "text-gray-500 hover:bg-gray-50"}`}
                        >
                          <BrainCircuit className="w-4 h-4" />
                          Predictive Intelligence
                        </button>
                        <button
                          onClick={() => setActiveTab("strategic-planning")}
                          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === "strategic-planning" ? "bg-purple-600 text-white shadow-md" : "text-gray-500 hover:bg-gray-50"}`}
                        >
                          <TrendingUp className="w-4 h-4" />
                          Strategic Planning
                        </button>
                        <button
                          onClick={() => setActiveTab("security-governance")}
                          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === "security-governance" ? "bg-[#8E2A8B] text-white shadow-md" : "text-gray-500 hover:bg-gray-50"}`}
                        >
                          <Shield size={16} /> Security & Governance
                        </button>
                      </>
                    )}

                  </div>
                  <button className="bg-white p-2.5 rounded-xl shadow-sm border border-gray-100 text-gray-400 hover:text-[#8E2A8B] transition-colors">
                    <Calendar size={20} />
                  </button>
                </div>
              </div>

              {activeTab === "overview" && (
                <>
                  {/* Stats Grid - Innovative Look */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                      {
                        label: "Total Revenue",
                        value: `₹${totalSales.toLocaleString()}`,
                        grow: salesGrowth,
                        icon: DollarSign,
                        color: "text-emerald-600",
                        bg: "bg-emerald-50",
                      },
                      {
                        label: "Total Orders",
                        value: totalOrders,
                        grow: ordersGrowth,
                        icon: ShoppingBag,
                        color: "text-blue-600",
                        bg: "bg-blue-50",
                      },
                      {
                        label: "Conversion Rate",
                        value: "3.2%",
                        grow: 1.2,
                        icon: Activity,
                        color: "text-purple-600",
                        bg: "bg-purple-50",
                      },
                      {
                        label: "Avg Order Value",
                        value: `₹${totalOrders > 0 ? (totalSales / totalOrders).toFixed(0) : 0}`,
                        grow: -2.4,
                        icon: TrendingUp,
                        color: "text-orange-600",
                        bg: "bg-orange-50",
                      },
                    ].map((stat, i) => (
                      <div
                        key={i}
                        className="glass-card stat-card-glow p-6 rounded-2xl group hover:transform hover:-translate-y-1 transition-all duration-300"
                      >
                        <div className="flex justify-between items-start">
                          <div
                            className={`p-3 ${stat.bg} ${stat.color} rounded-xl transition-transform group-hover:scale-110 duration-300`}
                          >
                            <stat.icon size={24} />
                          </div>
                          <div
                            className={`flex items-center gap-1 text-sm font-bold ${stat.grow >= 0 ? "text-emerald-500" : "text-rose-500"}`}
                          >
                            {stat.grow >= 0 ? (
                              <ArrowUpRight size={16} />
                            ) : (
                              <ArrowDownRight size={16} />
                            )}
                            {Math.abs(stat.grow).toFixed(1)}%
                          </div>
                        </div>
                        <div className="mt-4">
                          <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">
                            {stat.label}
                          </p>
                          <h3 className="text-3xl font-black text-[#2D1B4E] mt-1">
                            {stat.value}
                          </h3>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Main Dashboard Section: Charts & Activity */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Sales Chart - Large */}
                    <div className="lg:col-span-2 glass-card p-8 rounded-2xl">
                      <div className="flex justify-between items-center mb-8">
                        <div>
                          <h3 className="text-xl font-bold text-[#2D1B4E]">
                            Revenue Overview
                          </h3>
                          <p className="text-sm text-gray-500 mt-1">
                            Monthly performance insights
                          </p>
                        </div>
                        <select className="bg-gray-50 border border-gray-100 text-sm font-bold rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#8E2A8B]/20">
                          <option>Last 7 Months</option>
                          <option>Last Year</option>
                        </select>
                      </div>
                      <div className="h-[350px] w-full" style={{ minHeight: '350px' }}>
                        <ResponsiveContainer
                          width="100%"
                          height="100%"
                          minWidth={0}
                          debounce={50}
                        >
                          <AreaChart
                            data={[
                              { name: "Jan", sales: 4000, orders: 120 },
                              { name: "Feb", sales: 3000, orders: 90 },
                              { name: "Mar", sales: 5000, orders: 150 },
                              { name: "Apr", sales: 2780, orders: 100 },
                              { name: "May", sales: 1890, orders: 80 },
                              { name: "Jun", sales: 2390, orders: 110 },
                              { name: "Jul", sales: 3490, orders: 130 },
                            ]}
                            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                          >
                            <defs>
                              <linearGradient
                                id="colorSales"
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                              >
                                <stop
                                  offset="5%"
                                  stopColor="#8E2A8B"
                                  stopOpacity={0.1}
                                />
                                <stop
                                  offset="95%"
                                  stopColor="#8E2A8B"
                                  stopOpacity={0}
                                />
                              </linearGradient>
                              <linearGradient
                                id="colorOrders"
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                              >
                                <stop
                                  offset="5%"
                                  stopColor="#2D1B4E"
                                  stopOpacity={0.1}
                                />
                                <stop
                                  offset="95%"
                                  stopColor="#2D1B4E"
                                  stopOpacity={0}
                                />
                              </linearGradient>
                            </defs>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              vertical={false}
                              stroke="#F1F5F9"
                            />
                            <XAxis
                              dataKey="name"
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: "#94A3B8", fontSize: 12 }}
                              dy={10}
                            />
                            <YAxis
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: "#94A3B8", fontSize: 12 }}
                            />
                            <Tooltip
                              contentStyle={{
                                borderRadius: "16px",
                                border: "none",
                                boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                                padding: "12px",
                              }}
                              cursor={{
                                stroke: "#8E2A8B",
                                strokeWidth: 2,
                                strokeDasharray: "5 5",
                              }}
                            />
                            <Area
                              type="monotone"
                              dataKey="sales"
                              stroke="#8E2A8B"
                              strokeWidth={4}
                              fillOpacity={1}
                              fill="url(#colorSales)"
                            />
                            <Area
                              type="monotone"
                              dataKey="orders"
                              stroke="#2D1B4E"
                              strokeWidth={4}
                              fillOpacity={1}
                              fill="url(#colorOrders)"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Recent Activity Sidebar */}
                    <div className="glass-card p-8 rounded-2xl flex flex-col">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-[#2D1B4E]">
                          Live Activity
                        </h3>
                        <button className="text-[#8E2A8B] p-2 hover:bg-[#8E2A8B]/10 rounded-lg transition-colors">
                          <MoreVertical size={20} />
                        </button>
                      </div>
                      <div className="space-y-6 flex-1">
                        {recentActivity.map((activity) => (
                          <div key={activity.id} className="flex gap-4 group">
                            <div
                              className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${activity.status === "success" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : activity.status === "warning" ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" : "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"}`}
                            />
                            <div>
                              <p className="text-sm font-bold text-gray-800 leading-tight group-hover:text-[#8E2A8B] transition-colors cursor-default">
                                {activity.message}
                              </p>
                              <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                                <Clock size={12} />
                                {activity.time}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <button className="mt-8 w-full py-3 rounded-xl border-2 border-dashed border-gray-100 text-gray-400 font-bold hover:border-[#8E2A8B] hover:text-[#8E2A8B] transition-all">
                        View All Logs
                      </button>
                    </div>
                  </div>

                  {/* Bottom Grid: Top Products & Quick Actions */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Top Products */}
                    <div className="glass-card p-8 rounded-2xl">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-[#2D1B4E]">
                          Top Performing Products
                        </h3>
                        <button className="text-sm font-bold text-[#8E2A8B] hover:underline">
                          See Details
                        </button>
                      </div>
                      <div className="space-y-4">
                        {topProducts.map((product, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100"
                          >
                            <div className="flex items-center gap-4">
                              <div className="h-12 w-12 rounded-lg overflow-hidden bg-gray-100">
                                <img
                                  src={product.image}
                                  alt={product.name}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                              <div>
                                <p className="font-bold text-gray-800">
                                  {product.name}
                                </p>
                                <p className="text-xs text-gray-400">
                                  {product.sales} sales this week
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-black text-[#2D1B4E]">
                                ₹{(product.sales * 1200).toLocaleString()}
                              </p>
                              <p className="text-xs text-emerald-500 font-bold flex items-center justify-end gap-1">
                                <TrendingUp size={12} />+{product.growth}%
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Quick Actions / Bento Items */}
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        {
                          title: "New Product",
                          icon: Plus,
                          desc: "Add item to store",
                          action: () => setView("add"),
                          color: "bg-purple-600",
                        },
                        {
                          title: "Check Stocks",
                          icon: Package,
                          desc: "9 items low",
                          action: () => setView("stocks"),
                          color: "bg-orange-500",
                        },
                        {
                          title: "Manage Orders",
                          icon: ShoppingBag,
                          desc: "4 pending today",
                          action: () => setView("orders"),
                          color: "bg-blue-600",
                        },
                        {
                          title: "View Reviews",
                          icon: MessageSquareQuote,
                          desc: "Manage feedback",
                          action: () => setView("reviews"),
                          color: "bg-pink-600",
                        },
                      ].map((action, i) => (
                        <button
                          key={i}
                          onClick={action.action}
                          className="glass-card p-6 rounded-2xl flex flex-col items-center justify-center text-center group hover:shadow-2xl hover:shadow-[#8E2A8B]/10 transition-all duration-300 border-b-4 hover:border-b-[#8E2A8B]"
                        >
                          <div
                            className={`p-4 ${action.color} text-white rounded-2xl mb-4 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}
                          >
                            <action.icon size={28} />
                          </div>
                          <h4 className="font-black text-[#2D1B4E] uppercase text-xs tracking-widest">
                            {action.title}
                          </h4>
                          <p className="text-sm text-gray-500 mt-1">
                            {action.desc}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
              {activeTab === "analytics" && (
                <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 glass-card p-8 rounded-3xl">
                      <h3 className="text-xl font-black text-[#2D1B4E] mb-6">
                        Regional Sales Trends
                      </h3>
                      <div className="h-[300px]">
                        <ResponsiveContainer
                          width="100%"
                          height="100%"
                          minWidth={0}
                        >
                          <BarChart
                            data={[
                              { name: "North", sales: 4000 },
                              { name: "South", sales: 7000 },
                              { name: "East", sales: 2000 },
                              { name: "West", sales: 5000 },
                              { name: "Central", sales: 3000 },
                            ]}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              vertical={false}
                              stroke="#f1f5f9"
                            />
                            <XAxis
                              dataKey="name"
                              axisLine={false}
                              tickLine={false}
                            />
                            <YAxis axisLine={false} tickLine={false} />
                            <Tooltip
                              contentStyle={{
                                borderRadius: "16px",
                                border: "none",
                                boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                              }}
                            />
                            <Bar
                              dataKey="sales"
                              fill="#8E2A8B"
                              radius={[8, 8, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    <div className="glass-card p-8 rounded-3xl flex flex-col items-center">
                      <h3 className="text-xl font-black text-[#2D1B4E] mb-6 self-start">
                        Category Share
                      </h3>
                      <div className="h-[300px] w-full">
                        <ResponsiveContainer
                          width="100%"
                          height="100%"
                          minWidth={0}
                        >
                          <PieChart>
                            <Pie
                              data={[
                                { name: "Safety", value: 40 },
                                { name: "Industrial", value: 30 },
                                { name: "Custom", value: 20 },
                                { name: "Other", value: 10 },
                              ]}
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {[
                                { color: "#8E2A8B" },
                                { color: "#2D1B4E" },
                                { color: "#722270" },
                                { color: "#94A3B8" },
                              ].map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={entry.color}
                                />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend verticalAlign="bottom" height={36} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                      {
                        label: "Avg Session",
                        value: "4m 32s",
                        icon: Clock,
                        color: "text-blue-500",
                      },
                      {
                        label: "Bounce Rate",
                        value: "24.8%",
                        icon: Activity,
                        color: "text-rose-500",
                      },
                      {
                        label: "New Users",
                        value: "1,284",
                        icon: Users,
                        color: "text-emerald-500",
                      },
                    ].map((item, i) => (
                      <div
                        key={i}
                        className="glass-card p-6 rounded-2xl flex items-center gap-4"
                      >
                        <div
                          className={`p-3 rounded-xl bg-gray-50 ${item.color}`}
                        >
                          <item.icon size={24} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                            {item.label}
                          </p>
                          <p className="text-xl font-black text-[#2D1B4E]">
                            {item.value}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {activeTab === "sales-copilot" && (
                 <CopilotDashboardView />
              )}
              {activeTab === "pipeline-intelligence" && (
                 <PipelineDashboard />
              )}
              {activeTab === "security-governance" && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  {/* Compliance Summary Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm border-l-4 border-l-[#2D1B4E]">
                      <h4 className="text-gray-400 text-[10px] font-black uppercase tracking-wider">Total Operations Audited</h4>
                      <p className="text-2xl font-black text-[#2D1B4E] mt-1">{complianceSummary?.stats?.total_logs || 0}</p>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm border-l-4 border-l-emerald-500">
                      <h4 className="text-gray-400 text-[10px] font-black uppercase tracking-wider">Lead Exports Run</h4>
                      <p className="text-2xl font-black text-[#2D1B4E] mt-1">{complianceSummary?.stats?.export_count || 0}</p>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm border-l-4 border-l-rose-500">
                      <h4 className="text-gray-400 text-[10px] font-black uppercase tracking-wider">Security Violations</h4>
                      <p className="text-2xl font-black text-rose-600 mt-1">{complianceSummary?.stats?.violation_count || 0}</p>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm border-l-4 border-l-amber-500">
                      <h4 className="text-gray-400 text-[10px] font-black uppercase tracking-wider">Role/Privilege Changes</h4>
                      <p className="text-2xl font-black text-[#2D1B4E] mt-1">{complianceSummary?.stats?.role_change_count || 0}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column (2/3) - Audit Logs */}
                    <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div>
                          <h3 className="text-[#2D1B4E] font-black text-lg">System Audit & Access Logs</h3>
                          <p className="text-xs text-gray-400">Append-only chronological record of CRM actions</p>
                        </div>
                        
                        <div className="flex gap-2 w-full sm:w-auto">
                          <input 
                            type="text" 
                            placeholder="Filter by admin/resource..." 
                            value={securitySearch}
                            onChange={(e) => setSecuritySearch(e.target.value)}
                            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-[#8E2A8B] w-full sm:w-40"
                          />
                          <select
                            value={securityActionFilter}
                            onChange={(e) => setSecurityActionFilter(e.target.value)}
                            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none bg-white"
                          >
                            <option value="">All Actions</option>
                            <option value="LOGIN">LOGIN</option>
                            <option value="EXPORT">EXPORT</option>
                            <option value="ROLE_CHANGE">ROLE_CHANGE</option>
                            <option value="LEAD_ASSIGNMENT">LEAD_ASSIGNMENT</option>
                            <option value="SECURITY_VIOLATION">VIOLATIONS</option>
                          </select>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase text-[10px]">
                              <th className="py-2.5">Time</th>
                              <th className="py-2.5">User</th>
                              <th className="py-2.5">Role</th>
                              <th className="py-2.5">Action</th>
                              <th className="py-2.5">Resource</th>
                              <th className="py-2.5">Target ID</th>
                              <th className="py-2.5">IP</th>
                            </tr>
                          </thead>
                          <tbody>
                            {loadingSecurity ? (
                              <tr><td colSpan={7} className="text-center py-6 text-gray-400">Loading audit trail...</td></tr>
                            ) : auditLogs.length > 0 ? (
                              auditLogs.map((log) => (
                                <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                  <td className="py-2">{new Date(log.created_at).toLocaleString()}</td>
                                  <td className="py-2 font-bold text-gray-700">{log.admin_id}</td>
                                  <td className="py-2">
                                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                                      log.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-700' :
                                      log.role === 'MANAGER' ? 'bg-blue-100 text-blue-700' :
                                      log.role === 'AUDITOR' ? 'bg-amber-100 text-amber-700' :
                                      'bg-gray-100 text-gray-600'
                                    }`}>{log.role || 'ADMIN'}</span>
                                  </td>
                                  <td className="py-2">
                                    <span className={`font-bold ${
                                      log.action === 'SECURITY_VIOLATION' ? 'text-red-600' :
                                      log.action === 'EXPORT' ? 'text-emerald-600' : 'text-gray-800'
                                    }`}>{log.action}</span>
                                  </td>
                                  <td className="py-2 text-gray-500">{log.resource}</td>
                                  <td className="py-2 text-gray-400 font-mono text-[10px]">{log.resource_id}</td>
                                  <td className="py-2 text-gray-400">{log.ip_address}</td>
                                </tr>
                              ))
                            ) : (
                              <tr><td colSpan={7} className="text-center py-6 text-gray-400">No matching logs found.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Right Column (1/3) - Role Management & Violations */}
                    <div className="space-y-6">
                      {/* Security Violations Feed */}
                      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
                        <div className="flex justify-between items-center">
                          <h3 className="text-rose-600 font-black text-sm uppercase tracking-wider">Security Violations</h3>
                          <span className="bg-rose-50 text-rose-600 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                            {complianceSummary?.recentViolations?.length || 0} Alert(s)
                          </span>
                        </div>
                        
                        <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                          {complianceSummary?.recentViolations && complianceSummary.recentViolations.length > 0 ? (
                            complianceSummary.recentViolations.map((v: any, index: number) => (
                              <div key={index} className="p-3 bg-red-50 rounded-lg border border-red-100 text-[11px] space-y-1">
                                <div className="flex justify-between font-bold text-red-700">
                                  <span>{v.metadata?.method || 'GET'} ACCESS BLOCKED</span>
                                  <span>{new Date(v.created_at).toLocaleTimeString()}</span>
                                </div>
                                <p className="text-gray-600">IP: <span className="font-mono text-gray-800">{v.ip_address}</span></p>
                                <p className="text-gray-500 line-clamp-1">Path: {v.resource}</p>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-6 text-gray-400 text-xs">
                              No security violations detected. System healthy!
                            </div>
                          )}
                        </div>
                      </div>

                      {/* User Role Management */}
                      {(!securityProfile || securityProfile.role === 'SUPER_ADMIN') && (
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
                          <h3 className="text-[#2D1B4E] font-black text-sm uppercase tracking-wider">CRM User Role Management</h3>
                          
                          <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
                            {crmUsers.length > 0 ? (
                              crmUsers.map((user) => (
                                <div key={user.id} className="p-3 bg-gray-50 rounded-lg space-y-2.5 text-[11px]">
                                  <div className="flex justify-between items-center border-b border-gray-100 pb-1.5">
                                    <span className="font-bold text-gray-800">{user.full_name || user.username}</span>
                                    <span className="text-[10px] text-gray-400">{user.mobile}</span>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <label className="text-[10px] text-gray-400 font-bold block mb-1">Role Privilege</label>
                                      <select 
                                        value={user.role}
                                        onChange={(e) => updateUserRole(user.id, e.target.value, user.team)}
                                        className="w-full border border-gray-200 rounded p-1 bg-white text-[11px]"
                                      >
                                        <option value="SUPER_ADMIN">Super Admin</option>
                                        <option value="MANAGER">Manager</option>
                                        <option value="REPRESENTATIVE">Representative</option>
                                        <option value="AUDITOR">Auditor</option>
                                        <option value="USER">User (Customer)</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className="text-[10px] text-gray-400 font-bold block mb-1">Team Scope</label>
                                      <select 
                                        value={user.team || ""}
                                        onChange={(e) => updateUserRole(user.id, user.role, e.target.value)}
                                        className="w-full border border-gray-200 rounded p-1 bg-white text-[11px]"
                                      >
                                        <option value="">None (Global)</option>
                                        <option value="Domestic">Domestic</option>
                                        <option value="APAC">APAC</option>
                                        <option value="EMEA">EMEA</option>
                                        <option value="AMER">AMER</option>
                                      </select>
                                    </div>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="text-center py-6 text-gray-400 text-xs">
                                No registered crm users found.
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {activeTab === "business-intelligence" && (
                <BiDashboardView API_BASE={API_BASE} />
              )}
              {activeTab === "customer-success" && (
                <CsPortalView API_BASE={API_BASE} />
              )}
              {activeTab === "revenue-intelligence" && (
                <RevenueCommandCenter API_BASE={API_BASE} />
              )}
              {activeTab === "workflows" && (
                <WorkflowCommandCenter API_BASE={API_BASE} />
              )}
              {activeTab === "executive-command" && (
                <ExecutiveCommandLayer />
              )}
              {activeTab === "predictive-intelligence" && (
                <PredictiveInsightsPanel API_BASE={API_BASE} />
              )}
              {activeTab === "strategic-planning" && (
                <StrategicPlanningPanel />
              )}
            </div>
          ) : view === "videos" ? (
            <div className="space-y-8 max-w-5xl mx-auto">
              {/* Add Video Form */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-[#2D1B4E] mb-4">
                  Add New Video
                </h3>
                <form
                  onSubmit={handleAddVideo}
                  className="flex flex-col md:flex-row gap-4 items-end"
                >
                  <div className="flex-1 space-y-1 w-full">
                    <label className="text-sm font-bold text-gray-700">
                      Video Title
                    </label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#8E2A8B]/20 focus:border-[#8E2A8B]"
                      placeholder="e.g. Kottravai in Action"
                      value={newVideo.title}
                      onChange={(e) =>
                        setNewVideo({ ...newVideo, title: e.target.value })
                      }
                    />
                  </div>
                  <div className="flex-1 space-y-1 w-full">
                    <label className="text-sm font-bold text-gray-700">
                      YouTube URL
                    </label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#8E2A8B]/20 focus:border-[#8E2A8B]"
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={newVideo.url}
                      onChange={(e) =>
                        setNewVideo({ ...newVideo, url: e.target.value })
                      }
                    />
                  </div>
                  <div className="flex gap-2">
                    {editingVideoId && (
                      <button
                        type="button"
                        onClick={cancelVideoEdit}
                        className="bg-gray-500 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-gray-600 transition-colors flex-shrink-0"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="submit"
                      className="bg-[#2D1B4E] text-white px-6 py-2.5 rounded-lg font-bold hover:bg-[#8E2A8B] transition-colors flex-shrink-0"
                    >
                      {editingVideoId ? "Update Video" : "Add Video"}
                    </button>
                  </div>
                </form>
              </div>

              {/* Video List */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-[#2D1B4E] mb-6">
                  Current Videos
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {videos.map((video) => (
                    <div
                      key={video.id}
                      className="border border-gray-200 rounded-lg overflow-hidden group relative"
                    >
                      <div className="aspect-video bg-gray-100 relative">
                        <iframe
                          className="w-full h-full"
                          src={video.url}
                          title={video.title}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          loading="lazy"
                        ></iframe>
                      </div>
                      <div className="p-4">
                        <h4 className="font-bold text-gray-800 leading-tight mb-2 line-clamp-2">
                          {video.title}
                        </h4>
                        <div className="flex justify-between items-center mt-4">
                          <span className="text-xs text-gray-400">
                            ID: {video.id}
                          </span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditVideo(video)}
                              className="text-blue-500 hover:text-blue-700 p-2 hover:bg-blue-50 rounded-full transition-colors"
                              title="Edit Video"
                            >
                              <Pencil size={18} />
                            </button>
                            <button
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `Delete video "${video.title}"?`,
                                  )
                                ) {
                                  deleteVideo(video.id);
                                  toast.success("Video deleted");
                                }
                              }}
                              className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-full transition-colors"
                              title="Delete Video"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {videos.length === 0 && (
                    <div className="col-span-full text-center py-10 text-gray-400">
                      No videos added yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : view === "news" ? (
            <div className="space-y-8 max-w-5xl mx-auto">
              {/* Add News Form */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-[#2D1B4E] mb-4">
                  {editingNewsId ? "Edit News" : "Add New News"}
                </h3>
                <form onSubmit={handleAddNews} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-bold text-gray-700">
                        Title
                      </label>
                      <input
                        type="text"
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#8E2A8B]/20 focus:border-[#8E2A8B]"
                        value={newsForm.title}
                        onChange={(e) =>
                          setNewsForm({ ...newsForm, title: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-bold text-gray-700">
                        Category
                      </label>
                      <input
                        type="text"
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#8E2A8B]/20 focus:border-[#8E2A8B]"
                        placeholder="e.g. Innovation"
                        value={newsForm.category}
                        onChange={(e) =>
                          setNewsForm({ ...newsForm, category: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-bold text-gray-700">
                        Date
                      </label>
                      <input
                        type="text"
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#8E2A8B]/20 focus:border-[#8E2A8B]"
                        placeholder="e.g. June 01, 2025"
                        value={newsForm.date}
                        onChange={(e) =>
                          setNewsForm({ ...newsForm, date: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-bold text-gray-700">
                        Read More Link
                      </label>
                      <input
                        type="text"
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#8E2A8B]/20 focus:border-[#8E2A8B]"
                        value={newsForm.link}
                        onChange={(e) =>
                          setNewsForm({ ...newsForm, link: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  {/* Image Upload for News */}
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-gray-700">
                      News Image
                    </label>
                    <div className="flex items-center gap-4">
                      {newsForm.image && (
                        <div className="w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
                          <img
                            src={newsForm.image}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                        Upload Image
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={handleNewsImageUpload}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    {editingNewsId && (
                      <button
                        type="button"
                        onClick={cancelNewsEdit}
                        className="bg-gray-500 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-gray-600 transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={isUploading}
                      className="bg-[#2D1B4E] text-white px-6 py-2.5 rounded-lg font-bold hover:bg-[#8E2A8B] transition-colors flex items-center gap-2 disabled:bg-gray-400"
                    >
                      {isUploading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Saving...
                        </>
                      ) : editingNewsId ? (
                        "Update News"
                      ) : (
                        "Add News"
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* News List */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-[#2D1B4E] mb-6">
                  Current News Items
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {newsItems.map((item) => (
                    <div
                      key={item.id}
                      className="border border-gray-200 rounded-lg overflow-hidden group"
                    >
                      <div className="h-48 bg-gray-100 relative">
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs font-bold text-[#8E2A8B] uppercase tracking-wider">
                            {item.category}
                          </span>
                          <span className="text-xs text-gray-400">
                            {item.date}
                          </span>
                        </div>
                        <h4 className="font-bold text-gray-800 leading-tight mb-4 line-clamp-2">
                          {item.title}
                        </h4>
                        <div className="flex justify-end gap-2 mt-auto">
                          <button
                            onClick={() => handleEditNews(item)}
                            className="text-blue-500 hover:text-blue-700 p-2 hover:bg-blue-50 rounded-full transition-colors"
                            title="Edit News"
                          >
                            <Pencil size={18} />
                          </button>
                          <button
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Delete news item "${item.title}"?`,
                                )
                              ) {
                                deleteNewsItem(item.id);
                                toast.success("News item deleted");
                              }
                            }}
                            className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-full transition-colors"
                            title="Delete News"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {newsItems.length === 0 && (
                    <div className="col-span-full text-center py-10 text-gray-400">
                      No news items added yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : view === "reviews" ? (
            <div className="space-y-8 max-w-5xl mx-auto">
              {/* Review Page Selector */}
              <div className="flex gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <button
                  onClick={() => {
                    setReviewPage("home");
                    cancelReviewEdit();
                  }}
                  className={`px-6 py-2 rounded-lg font-bold transition-all ${reviewPage === "home" ? "bg-[#8E2A8B] text-white shadow-md" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                >
                  Home Page Reviews
                </button>
                <button
                  onClick={() => {
                    setReviewPage("b2b");
                    cancelReviewEdit();
                  }}
                  className={`px-6 py-2 rounded-lg font-bold transition-all ${reviewPage === "b2b" ? "bg-[#8E2A8B] text-white shadow-md" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                >
                  B2B Page Reviews
                </button>
              </div>

              {/* Add/Edit Review Form */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-[#2D1B4E] mb-4">
                  {editingReviewId
                    ? "Edit Review"
                    : `Add New Review (${reviewPage === "home" ? "Home" : "B2B"})`}
                </h3>
                <form onSubmit={handleAddReview} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-bold text-gray-700">
                        Name
                      </label>
                      <input
                        type="text"
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#8E2A8B]/20 focus:border-[#8E2A8B]"
                        value={reviewForm.name}
                        onChange={(e) =>
                          setReviewForm({ ...reviewForm, name: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-bold text-gray-700">
                        Role / Title
                      </label>
                      <input
                        type="text"
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#8E2A8B]/20 focus:border-[#8E2A8B]"
                        value={reviewForm.role}
                        onChange={(e) =>
                          setReviewForm({ ...reviewForm, role: e.target.value })
                        }
                        placeholder={
                          reviewPage === "b2b"
                            ? "e.g. CEO, Company Name"
                            : "e.g. Customer - Location"
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-bold text-gray-700">
                      Content
                    </label>
                    <textarea
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#8E2A8B]/20 focus:border-[#8E2A8B] h-32"
                      value={reviewForm.content}
                      onChange={(e) =>
                        setReviewForm({
                          ...reviewForm,
                          content: e.target.value,
                        })
                      }
                    ></textarea>
                  </div>

                  {/* Image Upload for Review */}
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-gray-700">
                      Profile Image (Optional)
                    </label>
                    <div className="flex items-center gap-4">
                      {reviewForm.image && (
                        <div className="w-16 h-16 rounded-full overflow-hidden border border-gray-200">
                          <img
                            src={reviewForm.image}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                        Upload Image
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={handleReviewImageUpload}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    {editingReviewId && (
                      <button
                        type="button"
                        onClick={cancelReviewEdit}
                        className="bg-gray-500 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-gray-600 transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={isUploading}
                      className="bg-[#2D1B4E] text-white px-6 py-2.5 rounded-lg font-bold hover:bg-[#8E2A8B] transition-colors flex items-center gap-2 disabled:bg-gray-400"
                    >
                      {isUploading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Saving...
                        </>
                      ) : editingReviewId ? (
                        "Update Review"
                      ) : (
                        "Add Review"
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Reviews List */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-[#2D1B4E] mb-6">
                  Current Reviews
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  {filteredReviews.map((review) => (
                    <div
                      key={review.id}
                      className="border border-gray-200 rounded-lg p-4 flex gap-4 items-start"
                    >
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex-shrink-0 overflow-hidden">
                        {review.image ? (
                          <img
                            src={review.image}
                            alt={review.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            ?
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-gray-900">
                              {review.name}
                            </h4>
                            <p className="text-xs text-[#8E2A8B] font-bold uppercase tracking-wider">
                              {review.role}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditReview(review)}
                              className="text-blue-500 hover:text-blue-700 p-1"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `Delete review from "${review.name}"?`,
                                  )
                                ) {
                                  deleteReview(review.id);
                                  toast.success("Review deleted");
                                }
                              }}
                              className="text-red-500 hover:text-red-700 p-1"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        <p className="text-gray-600 text-sm mt-2">
                          {review.content}
                        </p>
                      </div>
                    </div>
                  ))}
                  {filteredReviews.length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                      No reviews found for this page.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : view === "partners" ? (
            <div className="space-y-8 max-w-5xl mx-auto">
              {/* Add Partner Form */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-[#2D1B4E] mb-4">
                  {editingPartnerId
                    ? "Edit Trusted Partner"
                    : "Add New Trusted Partner"}
                </h3>
                <form onSubmit={handleAddPartner} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-gray-700">
                      Partner Name
                    </label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#8E2A8B]/20 focus:border-[#8E2A8B]"
                      value={partnerForm.name}
                      onChange={(e) =>
                        setPartnerForm({ ...partnerForm, name: e.target.value })
                      }
                      placeholder="e.g. Company Name"
                    />
                  </div>

                  {/* Logo Upload */}
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-gray-700">
                      Logo
                    </label>
                    <div className="flex items-center gap-4">
                      {partnerForm.logo ? (
                        <div className="w-32 h-16 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center p-2">
                          <img
                            src={partnerForm.logo}
                            alt="Preview"
                            className="max-w-full max-h-full object-contain"
                          />
                        </div>
                      ) : (
                        <div className="w-32 h-16 rounded-lg border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-gray-400 text-xs">
                          No Logo
                        </div>
                      )}
                      <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                        Upload Logo
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={handlePartnerLogoUpload}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    {editingPartnerId && (
                      <button
                        type="button"
                        onClick={cancelPartnerEdit}
                        className="bg-gray-500 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-gray-600 transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={isUploading}
                      className="bg-[#2D1B4E] text-white px-6 py-2.5 rounded-lg font-bold hover:bg-[#8E2A8B] transition-colors flex items-center gap-2 disabled:bg-gray-400"
                    >
                      {isUploading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Saving...
                        </>
                      ) : editingPartnerId ? (
                        "Update Partner"
                      ) : (
                        "Add Partner"
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Partners List */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-[#2D1B4E] mb-6">
                  Current Trusted Partners
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {partners.map((partner) => (
                    <div
                      key={partner.id}
                      className="border border-gray-200 rounded-lg p-4 flex flex-col items-center justify-between h-40 bg-gray-50 group relative"
                    >
                      <div className="flex-1 flex items-center justify-center w-full p-2">
                        {partner.logo ? (
                          <img
                            src={partner.logo}
                            alt={partner.name}
                            className="max-w-full max-h-20 object-contain"
                          />
                        ) : (
                          <span className="text-gray-500 font-bold text-center">
                            {partner.name}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 font-medium mt-2">
                        {partner.name}
                      </p>

                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEditPartner(partner)}
                          className="bg-white text-blue-500 p-1.5 rounded-full shadow-sm hover:text-blue-700"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => {
                            if (
                              window.confirm(
                                `Delete partner "${partner.name}"?`,
                              )
                            ) {
                              deletePartner(partner.id);
                              toast.success("Partner deleted");
                            }
                          }}
                          className="bg-white text-red-500 p-1.5 rounded-full shadow-sm hover:text-red-700"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {partners.length === 0 && (
                    <div className="col-span-full text-center py-10 text-gray-400">
                      No partners added yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : view === "alliance-apps" ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h3 className="text-lg font-bold text-[#2D1B4E]">
                  Alliance Applications
                </h3>
                <button
                  onClick={() => {
                    const token = sessionStorage.getItem(
                      "kottravai_admin_token",
                    );
                    window.open(
                      `${import.meta.env.VITE_API_URL || "/api"}/alliance/export?token=${token || ""}`,
                      "_blank",
                    );
                  }}
                  className="flex items-center gap-2 bg-[#1A1A1A] text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-[#8E2A8B] transition-all shadow-lg hover:shadow-[#8E2A8B]/20"
                >
                  <ImageIcon size={16} className="text-[#FFD700]" />
                  Export to Excel (.csv)
                </button>
              </div>
              <div className="overflow-x-auto border border-gray-100 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-gray-500">
                        Applicant
                      </th>
                      <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-gray-500">
                        Contact
                      </th>
                      <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-gray-500">
                        Address
                      </th>
                      <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-gray-500">
                        Socials
                      </th>
                      <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-gray-500">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {allianceApps.map((app) => (
                      <tr
                        key={app.id}
                        className="hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#8E2A8B]/10 flex items-center justify-center text-[#8E2A8B] font-bold text-xs">
                              {app.name.charAt(0)}
                            </div>
                            <span className="font-bold text-gray-900">
                              {app.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 text-xs font-medium text-gray-600">
                              <Phone size={12} className="text-[#8E2A8B]" />
                              {app.phone}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 max-w-xs">
                          <p className="text-xs text-gray-600 line-clamp-2">
                            {app.address}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {app.insta_id && (
                              <a
                                href={`https://instagram.com/${app.insta_id.replace("@", "")}`}
                                target="_blank"
                                className="text-[#E4405F] hover:scale-110 transition-transform"
                              >
                                <Instagram size={16} />
                              </a>
                            )}
                            {app.facebook_id && (
                              <a
                                href={app.facebook_id}
                                target="_blank"
                                className="text-[#1877F2] hover:scale-110 transition-transform"
                              >
                                <Facebook size={16} />
                              </a>
                            )}
                            {app.linkedin_id && (
                              <a
                                href={
                                  app.linkedin_id.startsWith("http")
                                    ? app.linkedin_id
                                    : `https://linkedin.com/in/${app.linkedin_id.replace("@", "")}`
                                }
                                target="_blank"
                                className="text-[#0A66C2] hover:scale-110 transition-transform"
                              >
                                <Linkedin size={16} />
                              </a>
                            )}
                            {app.twitter_id && (
                              <a
                                href={
                                  app.twitter_id.startsWith("http")
                                    ? app.twitter_id
                                    : `https://twitter.com/${app.twitter_id.replace("@", "")}`
                                }
                                target="_blank"
                                className="text-[#1DA1F2] hover:scale-110 transition-transform"
                              >
                                <Twitter size={16} />
                              </a>
                            )}
                            {app.youtube_id && (
                              <a
                                href={app.youtube_id}
                                target="_blank"
                                className="text-[#FF0000] hover:scale-110 transition-transform"
                              >
                                <Youtube size={16} />
                              </a>
                            )}
                            {!app.insta_id &&
                              !app.facebook_id &&
                              !app.linkedin_id &&
                              !app.twitter_id &&
                              !app.youtube_id && (
                                <span className="text-gray-400 text-xs">
                                  None
                                </span>
                              )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-500 font-medium">
                          {new Date(app.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                    {allianceApps.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-6 py-12 text-center text-gray-400 font-bold uppercase tracking-widest text-sm"
                        >
                          No applications received yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : view === "affiliate-dashboard" ? (
            <div className="space-y-8 animate-in fade-in duration-500 pb-12">
              {/* Analytics Hero Section */}
              <div className="relative overflow-hidden bg-[#2D1B4E] rounded-[2.5rem] p-10 shadow-2xl">
                <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-[#8E2A8B]/20 to-transparent"></div>
                <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-[#8E2A8B]/10 rounded-full blur-3xl"></div>

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                  <div className="text-white">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/10 text-xs font-black uppercase tracking-widest mb-6">
                      <Activity size={14} className="text-[#8E2A8B]" />
                      Live Network Pulse
                    </div>
                    <h3 className="text-4xl font-black mb-4 leading-none">
                      Affiliate Performance{" "}
                      <span className="text-[#8E2A8B]">Analytics</span>
                    </h3>
                    <p className="text-white/60 max-w-xl font-medium text-lg">
                      Monitor sales, commissions, and performance of your brand
                      ambassadors in real-time.
                    </p>
                  </div>
                  <div className="flex gap-4">
                    <button
                      onClick={fetchAffiliateSales}
                      className="px-6 py-3 bg-[#8E2A8B] hover:bg-[#a1329d] text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-[#8E2A8B]/20 flex items-center gap-2"
                    >
                      <RefreshCw size={16} />
                      Update Feed
                    </button>
                  </div>
                </div>
              </div>

              {/* Performance Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Total Affiliate Sales Card */}
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-xl hover:shadow-2xl transition-all duration-500 group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-emerald-50 rounded-2xl group-hover:bg-emerald-500 transition-colors duration-500">
                      <TrendingUp
                        size={24}
                        className="text-emerald-500 group-hover:text-white transition-colors duration-500"
                      />
                    </div>
                    <div className="flex items-center gap-1 text-emerald-600 font-black text-sm">
                      <ArrowUpRight size={16} />
                      <span>Active</span>
                    </div>
                  </div>
                  <div className="text-3xl font-black text-[#2D1B4E] mb-1">
                    ₹
                    {affiliateSales
                      .reduce(
                        (sum, s) =>
                          sum + parseFloat(s.order_total || s.sale_amount || 0),
                        0,
                      )
                      .toLocaleString()}
                  </div>
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Total Affiliate Revenue
                  </div>
                </div>

                {/* Commission Earnings Card */}
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-xl hover:shadow-2xl transition-all duration-500 group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-amber-50 rounded-2xl group-hover:bg-amber-500 transition-colors duration-500">
                      <DollarSign
                        size={24}
                        className="text-amber-500 group-hover:text-white transition-colors duration-500"
                      />
                    </div>
                    <div className="bg-amber-100 text-amber-700 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider">
                      Earnings Hub
                    </div>
                  </div>
                  <div className="text-3xl font-black text-[#2D1B4E] mb-1">
                    ₹
                    {affiliateSales
                      .reduce(
                        (sum, s) => sum + parseFloat(s.commission_amount || 0),
                        0,
                      )
                      .toLocaleString()}
                  </div>
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Total Commission Paid
                  </div>
                </div>

                {/* Active Partners Card */}
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-xl hover:shadow-2xl transition-all duration-500 group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-purple-50 rounded-2xl group-hover:bg-[#8E2A8B] transition-colors duration-500">
                      <Users
                        size={24}
                        className="text-[#8E2A8B] group-hover:text-white transition-colors duration-500"
                      />
                    </div>
                    <span className="text-[10px] font-black text-purple-600 bg-purple-50 px-2 py-1 rounded-lg uppercase tracking-wider">
                      Growth Hub
                    </span>
                  </div>
                  <div className="text-3xl font-black text-[#2D1B4E] mb-1">
                    {activeAffiliates.length}
                  </div>
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Active Brand Partners
                  </div>
                </div>

                {/* Tracked Conversions Card */}
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-xl hover:shadow-2xl transition-all duration-500 group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-blue-50 rounded-2xl group-hover:bg-blue-500 transition-colors duration-500">
                      <ShoppingBag
                        size={24}
                        className="text-blue-500 group-hover:text-white transition-colors duration-500"
                      />
                    </div>
                    <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg uppercase tracking-wider">
                      Success Rate
                    </span>
                  </div>
                  <div className="text-3xl font-black text-[#2D1B4E] mb-1">
                    {affiliateSales.length}
                  </div>
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Tracked Conversions
                  </div>
                </div>
              </div>

              {/* Visual Analytics Hub */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl">
                  <h4 className="text-xl font-black text-[#2D1B4E] mb-6">
                    Partner Performance Matrix
                  </h4>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={activeAffiliates
                          .map((a) => ({
                            name: a.name,
                            commission: parseFloat(a.total_commission || 0),
                          }))
                          .sort((a, b) => b.commission - a.commission)
                          .slice(0, 5)}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="#F3F4F6"
                        />
                        <XAxis
                          dataKey="name"
                          axisLine={false}
                          tickLine={false}
                          tick={{
                            fill: "#9CA3AF",
                            fontWeight: "900",
                            fontSize: 10,
                          }}
                          dy={10}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{
                            fill: "#9CA3AF",
                            fontWeight: "900",
                            fontSize: 10,
                          }}
                        />
                        <Tooltip
                          contentStyle={{
                            borderRadius: "16px",
                            border: "none",
                            boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                            fontWeight: "900",
                          }}
                          cursor={{ fill: "#F9FAFB" }}
                        />
                        <Bar
                          dataKey="commission"
                          fill="#8E2A8B"
                          radius={[8, 8, 8, 8]}
                          barSize={40}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl">
                  <h4 className="text-xl font-black text-[#2D1B4E] mb-6">
                    Product Attribution
                  </h4>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={Object.entries(
                            affiliateSales.reduce((acc: any, s) => {
                              acc[s.product_name || "Legacy"] =
                                (acc[s.product_name || "Legacy"] || 0) +
                                parseFloat(s.order_total || s.sale_amount || 0);
                              return acc;
                            }, {}),
                          )
                            .map(([name, value]) => ({ name, value }))
                            .sort((a: any, b: any) => b.value - a.value)
                            .slice(0, 5)}
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {[0, 1, 2, 3, 4].map((index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={
                                [
                                  "#2D1B4E",
                                  "#8E2A8B",
                                  "#FFD700",
                                  "#48BB78",
                                  "#3182CE",
                                ][index % 5]
                              }
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            borderRadius: "16px",
                            border: "none",
                            boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                            fontWeight: "900",
                          }}
                        />
                        <Legend
                          iconType="circle"
                          wrapperStyle={{ fontWeight: "900", fontSize: "10px" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Sales Stream Table */}
              <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl overflow-hidden">
                <div className="p-8 border-b border-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h4 className="text-xl font-black text-[#2D1B4E]">
                      Affiliate Sales Stream
                    </h4>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">
                      Real-time attribution and commission tracking
                    </p>
                  </div>
                  <div className="flex gap-4 w-full md:w-auto">
                    <select
                      value={selectedSalesAffiliateFilter}
                      onChange={(e) =>
                        setSelectedSalesAffiliateFilter(e.target.value)
                      }
                      className="bg-gray-50 border border-gray-100 px-4 py-2.5 rounded-2xl text-xs font-black text-[#2D1B4E] focus:ring-2 focus:ring-[#8E2A8B]/20 transition-all outline-none"
                    >
                      <option value="all">Every Ambassador</option>
                      {activeAffiliates.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                          Order ID
                        </th>
                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                          Affiliate
                        </th>
                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                          Sale Amount
                        </th>
                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 text-center">
                          Commission
                        </th>
                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 text-right">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {affiliateSales
                        .filter(
                          (s) =>
                            selectedSalesAffiliateFilter === "all" ||
                            s.affiliate_id === selectedSalesAffiliateFilter,
                        )
                        .map((sale) => (
                          <tr
                            key={sale.id}
                            className="hover:bg-gray-50/50 transition-all group"
                          >
                            <td className="px-8 py-5">
                              <div className="flex items-center gap-3">
                                <div className="w-1.5 h-6 bg-emerald-500 rounded-full group-hover:h-8 transition-all"></div>
                                <div>
                                  <div className="font-black text-[#2D1B4E] text-sm">
                                    #
                                    {sale.order_number ||
                                      sale.order_id?.slice(-8).toUpperCase()}
                                  </div>
                                  <div className="text-[10px] font-bold text-gray-400">
                                    {new Date(
                                      sale.created_at,
                                    ).toLocaleDateString()}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-8 py-5">
                              <div className="font-black text-[#2D1B4E] text-xs uppercase tracking-wider">
                                {sale.product_name || "N/A"}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="text-[10px] text-gray-400 font-bold">
                                  Via {sale.affiliate_name || "Partner"}
                                </div>
                                <div className="w-1 h-1 rounded-full bg-gray-300"></div>
                                <code className="text-[9px] bg-purple-50 text-[#8E2A8B] px-1.5 py-0.5 rounded border border-purple-100 font-black uppercase tracking-tighter">
                                  {sale.link_slug ||
                                    (sale.referral_code
                                      ? sale.referral_code
                                      : "DIRECT")}
                                </code>
                              </div>
                            </td>
                            <td className="px-8 py-5">
                              <div className="font-black text-[#2D1B4E] text-sm">
                                ₹
                                {parseFloat(
                                  sale.order_total || sale.sale_amount,
                                ).toLocaleString()}
                              </div>
                            </td>
                            <td className="px-8 py-5 text-center">
                              <div className="inline-block px-3 py-1 bg-emerald-50 rounded-lg">
                                <div className="text-xs font-black text-emerald-600">
                                  ₹
                                  {parseFloat(
                                    sale.commission_amount,
                                  ).toLocaleString()}
                                </div>
                                {sale.commission_rate && (
                                  <div className="text-[9px] font-black text-emerald-400 uppercase">
                                    {sale.commission_rate}% Rate
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-8 py-5 text-right">
                              <span
                                className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm ${
                                  sale.status === "Completed" ||
                                  sale.status === "Paid"
                                    ? "bg-emerald-500 text-white"
                                    : sale.status === "Pending"
                                      ? "bg-amber-100 text-amber-700"
                                      : "bg-rose-50 text-rose-500"
                                }`}
                              >
                                {sale.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      {affiliateSales.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-20 text-center">
                            <div className="flex flex-col items-center">
                              <div className="p-4 bg-gray-50 rounded-full mb-4">
                                <ShoppingBag
                                  size={40}
                                  className="text-gray-200"
                                />
                              </div>
                              <p className="text-gray-400 font-black uppercase tracking-widest text-sm">
                                No Affiliate Conversions Streamed Yet
                              </p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : view === "affiliates" ? (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
                <h3 className="text-xl font-black text-[#2D1B4E]">
                  Affiliate Applications
                </h3>
                <p className="text-sm text-gray-500">
                  Review and approve new partners for the network
                </p>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-xs font-black uppercase text-gray-400">
                        Applicant
                      </th>
                      <th className="px-6 py-4 text-xs font-black uppercase text-gray-400">
                        Experience
                      </th>
                      <th className="px-6 py-4 text-xs font-black uppercase text-gray-400">
                        Social Media
                      </th>
                      <th className="px-6 py-4 text-xs font-black uppercase text-gray-400">
                        Target Segment
                      </th>
                      <th className="px-6 py-4 text-xs font-black uppercase text-gray-400">
                        Status
                      </th>
                      <th className="px-6 py-4 text-xs font-black uppercase text-right text-gray-400">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {affiliateApplications.map((app) => (
                      <tr
                        key={app.id}
                        className="hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#8E2A8B]/10 flex items-center justify-center font-black text-[#8E2A8B]">
                              {app.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900">
                                {app.name}
                              </p>
                              <div className="flex flex-col gap-0.5">
                                <p className="text-[10px] text-gray-400 font-bold uppercase">
                                  {app.email}
                                </p>
                                {app.phone && (
                                  <p className="text-[10px] text-gray-500 font-bold">
                                    {app.phone}
                                  </p>
                                )}
                                <p className="text-[9px] text-[#8E2A8B] font-bold">
                                  {app.city || "No City"}
                                </p>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p
                            className="text-xs text-gray-600 font-medium line-clamp-1"
                            title={app.experience}
                          >
                            {app.experience}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {app.instagram_link && (
                              <a
                                href={
                                  app.instagram_link.startsWith("http")
                                    ? app.instagram_link
                                    : `https://instagram.com/${app.instagram_link.replace("@", "")}`
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#E4405F] hover:scale-110 transition-transform"
                              >
                                <Instagram size={16} />
                              </a>
                            )}
                            {app.facebook_link && (
                              <a
                                href={
                                  app.facebook_link.startsWith("http")
                                    ? app.facebook_link
                                    : `https://facebook.com/${app.facebook_link}`
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#1877F2] hover:scale-110 transition-transform"
                              >
                                <Facebook size={16} />
                              </a>
                            )}
                            {app.twitter_link && (
                              <a
                                href={
                                  app.twitter_link.startsWith("http")
                                    ? app.twitter_link
                                    : `https://twitter.com/${app.twitter_link.replace("@", "")}`
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#1DA1F2] hover:scale-110 transition-transform"
                              >
                                <Twitter size={16} />
                              </a>
                            )}
                            {app.youtube_link && (
                              <a
                                href={app.youtube_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#FF0000] hover:scale-110 transition-transform"
                              >
                                <Youtube size={16} />
                              </a>
                            )}
                            {!app.instagram_link &&
                              !app.facebook_link &&
                              !app.twitter_link &&
                              !app.youtube_link && (
                                <span className="text-gray-400 text-[10px]">
                                  None
                                </span>
                              )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-[10px] font-black uppercase">
                            {app.target_segment}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                              app.status?.toLowerCase() === "approved"
                                ? "bg-emerald-50 text-emerald-600"
                                : app.status?.toLowerCase() === "rejected"
                                  ? "bg-rose-50 text-rose-600"
                                  : "bg-amber-50 text-amber-600"
                            }`}
                          >
                            {app.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() =>
                                handleUpdateAffiliateStatus(app.id, "Approved")
                              }
                              disabled={app.status?.toLowerCase() !== "pending" || isAffiliateActionLoading}
                              className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                              title="Approve"
                            >
                              {isAffiliateActionLoading ? (
                                <RefreshCw size={18} className="animate-spin" />
                              ) : (
                                <Check size={18} />
                              )}
                            </button>
                            <button
                              onClick={() =>
                                handleUpdateAffiliateStatus(app.id, "Rejected")
                              }
                              disabled={app.status?.toLowerCase() !== "pending" || isAffiliateActionLoading}
                              className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                              title="Reject"
                            >
                              {isAffiliateActionLoading ? (
                                <RefreshCw size={18} className="animate-spin" />
                              ) : (
                                <X size={18} />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {affiliateApplications.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-20 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center text-gray-300">
                              <FileText size={32} />
                            </div>
                            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">
                              No pending applications
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : view === "affiliate-partners" ? (
            <div className="space-y-8 animate-in fade-in duration-500 pb-12">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-white p-8 rounded-[2rem] shadow-xl border border-gray-100">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#8E2A8B]/10 rounded-full text-[#8E2A8B] text-[10px] font-black uppercase tracking-widest mb-3">
                    <BadgeCheck size={14} />
                    Verified Partners
                  </div>
                  <h3 className="text-3xl font-black text-[#2D1B4E]">
                    Network <span className="text-[#8E2A8B]">Elite</span>
                  </h3>
                  <p className="text-gray-500 font-medium text-lg mt-2">
                    Scale your reach through our top-performing brand
                    ambassadors.
                  </p>
                </div>
                <div className="flex gap-2 p-1.5 bg-gray-50 rounded-2xl border border-gray-100 w-full md:w-auto overflow-x-auto no-scrollbar">
                  {[
                    "all",
                    "Ambassador",
                    "Kottravai Seller",
                    "Kottravai Pro Partner",
                  ].map((f) => (
                    <button
                      key={f}
                      onClick={() => setSelectedAffiliateFilter(f)}
                      className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                        selectedAffiliateFilter === f
                          ? "bg-[#2D1B4E] text-white shadow-lg"
                          : "text-gray-400 hover:bg-white hover:text-[#2D1B4E]"
                      }`}
                    >
                      {f === "all" ? "Every Tier" : f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {activeAffiliates
                  .filter(
                    (a) =>
                      selectedAffiliateFilter === "all" ||
                      a.level === selectedAffiliateFilter,
                  )
                  .map((aff) => (
                    <div
                      key={aff.id}
                      className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 p-8 hover:shadow-2xl transition-all duration-500 group relative overflow-hidden"
                    >
                      <div
                        className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full blur-2xl opacity-20 ${
                          aff.level === "Kottravai Pro Partner"
                            ? "bg-amber-400"
                            : aff.level === "Kottravai Seller"
                              ? "bg-blue-400"
                              : "bg-[#8E2A8B]"
                        }`}
                      ></div>

                      <div className="flex justify-between items-start mb-8 relative z-10">
                        <div className="flex items-center gap-5">
                          <div
                            className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center font-black text-white text-2xl shadow-lg transform group-hover:scale-110 transition-transform duration-500 bg-gradient-to-br ${
                              aff.level === "Kottravai Legend"
                                ? "from-amber-400 to-orange-600"
                                : aff.level === "Diamond" ||
                                    aff.level === "Elite"
                                  ? "from-blue-400 to-purple-600"
                                  : "from-[#8E2A8B] to-[#2D1B4E]"
                            }`}
                          >
                            {aff.name.charAt(0)}
                          </div>
                          <div>
                            <h4 className="font-black text-[#2D1B4E] text-xl">
                              {aff.name}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                ID: {aff.referral_code}
                              </span>
                              <div className="h-3 w-[1px] bg-gray-200 mx-1"></div>
                              <div className="flex items-center gap-2">
                                {aff.instagram_link && (
                                  <a
                                    href={
                                      aff.instagram_link.startsWith("http")
                                        ? aff.instagram_link
                                        : `https://instagram.com/${aff.instagram_link.replace("@", "")}`
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[#E4405F] hover:scale-110 transition-transform"
                                  >
                                    <Instagram size={12} />
                                  </a>
                                )}
                                {aff.facebook_link && (
                                  <a
                                    href={
                                      aff.facebook_link.startsWith("http")
                                        ? aff.facebook_link
                                        : `https://facebook.com/${aff.facebook_link}`
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[#1877F2] hover:scale-110 transition-transform"
                                  >
                                    <Facebook size={12} />
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div
                          className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                            aff.status === "Active"
                              ? "bg-emerald-50 text-emerald-600"
                              : "bg-rose-50 text-rose-600"
                          }`}
                        >
                          {aff.status}
                        </div>
                      </div>

                      <div className="space-y-6 mb-8 relative z-10">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 group-hover:border-purple-100 transition-colors">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                              Total Sales
                            </p>
                            <p className="font-black text-[#2D1B4E] text-lg">
                              ₹
                              {parseFloat(
                                aff.total_sales_amount || 0,
                              ).toLocaleString()}
                            </p>
                          </div>
                          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 group-hover:border-purple-100 transition-colors">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                              Commission
                            </p>
                            <p className="font-black text-emerald-600 text-lg">
                              ₹
                              {parseFloat(
                                aff.total_commission || 0,
                              ).toLocaleString()}
                            </p>
                          </div>
                        </div>

                        <div className="bg-purple-50/50 rounded-2xl p-4 border border-purple-100">
                          <div className="flex justify-between items-center mb-2">
                            <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest">
                              Balance Wallet
                            </p>
                            <Wallet size={14} className="text-purple-400" />
                          </div>
                          <p className="font-black text-[#2D1B4E] text-2xl">
                            ₹
                            {parseFloat(
                              aff.available_balance || 0,
                            ).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-4 relative z-10">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">
                            Ambassador Tier
                          </label>
                          <select
                            value={aff.level}
                            onChange={(e) =>
                              handleUpdateAffiliateLevel(aff.id, e.target.value)
                            }
                            className="w-full bg-white border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm font-black text-[#2D1B4E] focus:border-[#8E2A8B] outline-none transition-all cursor-pointer shadow-sm"
                          >
                            <option value="Ambassador">Ambassador</option>
                            <option value="Kottravai Seller">
                              Kottravai Seller
                            </option>
                            <option value="Kottravai Pro Partner">
                              Kottravai Pro Partner
                            </option>
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              navigate("/kottravai-secure-hq/orders", {
                                state: { affiliateId: aff.id },
                              })
                            }
                            className="flex-1 py-3 px-4 bg-gray-50 hover:bg-[#2D1B4E] hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-gray-100"
                          >
                            Audit Orders
                          </button>
                          <button
                            onClick={() => setView("affiliate-payouts")}
                            className="flex-1 py-3 px-4 bg-gray-50 hover:bg-[#8E2A8B] hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-gray-100"
                          >
                            Process Payout
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                {activeAffiliates.length === 0 && (
                  <div className="col-span-full py-20 text-center bg-white rounded-[2rem] border border-gray-100 border-dashed">
                    <Users size={48} className="text-gray-200 mx-auto mb-4" />
                    <p className="text-gray-400 font-black uppercase tracking-[0.3em]">
                      No Active Partners Found
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : view === "affiliate-payouts" ? (
            <div className="space-y-8 animate-in fade-in duration-500 pb-12">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-8 rounded-[2rem] shadow-xl border border-gray-100">
                <div>
                  <h3 className="text-3xl font-black text-[#2D1B4E]">
                    Payout <span className="text-emerald-500">Registry</span>
                  </h3>
                  <p className="text-gray-500 font-medium text-lg mt-2">
                    Execute and audit financial disbursements to your network.
                  </p>
                </div>
                <button className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2">
                  <FileText size={16} />
                  Export ledger
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 glass-card rounded-[2rem] border border-gray-100 shadow-xl overflow-hidden">
                  <div className="p-8 border-b border-gray-50">
                    <h4 className="text-xl font-black text-[#2D1B4E]">
                      Disbursement Ledger
                    </h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">
                            Date/Time
                          </th>
                          <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">
                            Partner
                          </th>
                          <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">
                            Amount
                          </th>
                          <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">
                            Method
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {affiliatePayouts.map((payout, idx) => (
                          <tr
                            key={idx}
                            className="hover:bg-gray-50/50 transition-all"
                          >
                            <td className="px-8 py-5">
                              <div className="font-black text-[#2D1B4E] text-sm">
                                {new Date(
                                  payout.payout_date || payout.created_at,
                                ).toLocaleDateString()}
                              </div>
                              <div className="text-[10px] font-bold text-gray-400">
                                {new Date(
                                  payout.payout_date || payout.created_at,
                                ).toLocaleTimeString()}
                              </div>
                            </td>
                            <td className="px-8 py-5">
                              <div className="font-black text-[#2D1B4E] text-sm">
                                {payout.affiliate_name}
                              </div>
                              <div className="text-[10px] font-black text-purple-500 uppercase tracking-tighter">
                                ID:{" "}
                                {payout.referral_code ||
                                  payout.affiliate_id?.slice(0, 8)}
                              </div>
                            </td>
                            <td className="px-8 py-5 text-right font-black text-emerald-600 text-lg">
                              ₹{parseFloat(payout.amount).toLocaleString()}
                            </td>
                            <td className="px-8 py-5 text-right">
                              <span className="px-3 py-1 bg-gray-900 text-white rounded-lg text-[10px] font-black uppercase tracking-widest">
                                Manual Record
                              </span>
                            </td>
                          </tr>
                        ))}
                        {affiliatePayouts.length === 0 && (
                          <tr>
                            <td
                              colSpan={4}
                              className="py-20 text-center text-gray-400 font-black uppercase tracking-widest text-sm"
                            >
                              No Payout Records Found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="glass-card rounded-[2rem] border border-gray-100 shadow-xl p-8">
                    <h4 className="text-xl font-black text-[#2D1B4E] mb-6">
                      Record New Payout
                    </h4>
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                          Select Partner
                        </label>
                        <select
                          id="payout-affiliate"
                          className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm font-black text-[#2D1B4E] outline-none focus:border-[#8E2A8B] transition-all"
                        >
                          <option value="">Select an Ambassador...</option>
                          {activeAffiliates.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name} (₹
                              {parseFloat(
                                a.available_balance || 0,
                              ).toLocaleString()}
                              )
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                          Amount to Disburse
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-[#2D1B4E]">
                            ₹
                          </span>
                          <input
                            id="payout-amount"
                            type="number"
                            placeholder="0.00"
                            className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl pl-8 pr-4 py-3 text-lg font-black text-[#2D1B4E] outline-none focus:border-[#8E2A8B] transition-all"
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const affId = (
                            document.getElementById(
                              "payout-affiliate",
                            ) as HTMLSelectElement
                          ).value;
                          const amount = (
                            document.getElementById(
                              "payout-amount",
                            ) as HTMLInputElement
                          ).value;
                          if (!affId || !amount) {
                            toast.error("Please enter affiliate and amount");
                            return;
                          }
                          handleRecordPayout(affId, parseFloat(amount));
                          (
                            document.getElementById(
                              "payout-amount",
                            ) as HTMLInputElement
                          ).value = "";
                        }}
                        className="w-full py-4 bg-[#2D1B4E] hover:bg-[#8E2A8B] text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl hover:shadow-[#8E2A8B]/30 flex items-center justify-center gap-3"
                      >
                        <Wallet size={18} />
                        Authorize Record
                      </button>
                      <p className="text-[10px] text-gray-400 font-bold text-center italic">
                        This action will immediately update the partner's
                        available balance.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : view === "image-optimizer" ? (
            <ImageOptimizer />
          ) : view === "add" ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-4xl mx-auto">
              <h3 className="text-lg font-bold text-[#2D1B4E] mb-6">
                {editingId ? "Edit Product" : "Add New Product"}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">
                      Product Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-[#8E2A8B] focus:border-[#8E2A8B] outline-none transition-all"
                      placeholder="Product Name"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-bold text-gray-700">
                        Price (₹)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="isCustomRequest"
                          checked={formData.isCustomRequest}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              isCustomRequest: e.target.checked,
                              price: e.target.checked ? "0" : formData.price,
                            })
                          }
                          className="w-4 h-4 rounded text-[#8E2A8B] focus:ring-[#8E2A8B] border-gray-300"
                        />
                        <label
                          htmlFor="isCustomRequest"
                          className="text-xs font-bold text-[#8E2A8B] cursor-pointer select-none"
                        >
                          Use Customization Form
                        </label>
                      </div>
                    </div>
                    <input
                      type="number"
                      value={formData.price}
                      onChange={(e) =>
                        setFormData({ ...formData, price: e.target.value })
                      }
                      className={`w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-[#8E2A8B] focus:border-[#8E2A8B] outline-none transition-all ${formData.isCustomRequest ? "bg-gray-100 text-gray-400" : ""}`}
                      placeholder="0.00"
                      disabled={formData.isCustomRequest || isUploading}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
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
                        placeholder="Optional"
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
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">
                      Category
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({ ...formData, category: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-[#8E2A8B] focus:border-[#8E2A8B] outline-none transition-all bg-white text-sm font-medium"
                    >
                      <option value="" disabled>
                        Select a category
                      </option>
                      {categories
                        .filter((c) => !c.parent)
                        .map((topCat) => {
                          const renderOptions = (
                            parentSlug: string,
                            level: number = 0,
                          ) => {
                            const children = categories.filter(
                              (c) => c.parent === parentSlug,
                            );
                            return children.map((child) => (
                              <Fragment key={child.slug}>
                                <option value={child.slug}>
                                  {"\u00A0".repeat(level * 4)}
                                  {level > 0 ? "↳ " : ""}
                                  {child.name}
                                </option>
                                {renderOptions(child.slug, level + 1)}
                              </Fragment>
                            ));
                          };

                          return (
                            <optgroup
                              key={topCat.slug}
                              label={topCat.name.toUpperCase()}
                            >
                              <option value={topCat.slug}>
                                General {topCat.name}
                              </option>
                              {renderOptions(topCat.slug, 1)}
                            </optgroup>
                          );
                        })}
                    </select>
                  </div>
                  <div className="col-span-1 md:col-span-2 flex items-center gap-6 pt-2">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="isBestSeller"
                        checked={formData.isBestSeller}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            isBestSeller: e.target.checked,
                          })
                        }
                        className="w-5 h-5 rounded text-[#8E2A8B] focus:ring-[#8E2A8B] border-gray-300"
                      />
                      <label
                        htmlFor="isBestSeller"
                        className="text-sm font-bold text-gray-700 select-none cursor-pointer"
                      >
                        Mark as Best Seller (Show on Home Page)
                      </label>
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="isGiftBundleItem"
                        checked={formData.isGiftBundleItem}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            isGiftBundleItem: e.target.checked,
                          })
                        }
                        className="w-5 h-5 rounded text-[#8E2A8B] focus:ring-[#8E2A8B] border-gray-300"
                      />
                      <label
                        htmlFor="isGiftBundleItem"
                        className="text-sm font-bold text-gray-700 select-none cursor-pointer"
                      >
                        Add to Gift Bundle
                      </label>
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="isLive"
                        checked={formData.isLive}
                        onChange={(e) =>
                          setFormData({ ...formData, isLive: e.target.checked })
                        }
                        className="w-5 h-5 rounded text-[#8E2A8B] focus:ring-[#8E2A8B] border-gray-300"
                      />
                      <label
                        htmlFor="isLive"
                        className="text-sm font-bold text-[#8E2A8B] select-none cursor-pointer"
                      >
                        Live Status (Published to Site)
                      </label>
                    </div>
                  </div>

                  {/* Affiliate Program Settings */}
                  <div className="col-span-1 md:col-span-2 bg-[#8E2A8B]/5 p-6 rounded-2xl border border-[#8E2A8B]/10 space-y-4">
                    <div className="flex items-center gap-3 pb-2 border-b border-[#8E2A8B]/10">
                      <div className="p-2 bg-[#8E2A8B] rounded-lg text-white">
                        <TrendingUp size={18} />
                      </div>
                      <div>
                        <h4 className="font-black text-[#2D1B4E]">
                          Affiliate Program
                        </h4>
                        <p className="text-[10px] text-[#8E2A8B] font-bold uppercase tracking-widest">
                          Incentivize partner promotion
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                      <div className="flex items-center gap-3">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={formData.is_affiliate_eligible}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                is_affiliate_eligible: e.target.checked,
                              })
                            }
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#8E2A8B]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:after:w-5 after:transition-all peer-checked:bg-[#8E2A8B]"></div>
                          <span className="ml-3 text-sm font-bold text-gray-700">
                            Eligible for Commissions
                          </span>
                        </label>
                      </div>

                      {formData.is_affiliate_eligible && (
                        <>
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                              Payout Type
                            </label>
                            <div className="flex bg-white p-1 rounded-lg border border-gray-200">
                              <button
                                type="button"
                                onClick={() =>
                                  setFormData({
                                    ...formData,
                                    affiliate_payout_type: "percentage",
                                  })
                                }
                                className={`flex-1 py-1.5 rounded-md text-[10px] font-black uppercase transition-all ${formData.affiliate_payout_type === "percentage" ? "bg-[#8E2A8B] text-white shadow-sm" : "text-gray-400"}`}
                              >
                                Percentage (%)
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setFormData({
                                    ...formData,
                                    affiliate_payout_type: "fixed",
                                  })
                                }
                                className={`flex-1 py-1.5 rounded-md text-[10px] font-black uppercase transition-all ${formData.affiliate_payout_type === "fixed" ? "bg-[#8E2A8B] text-white shadow-sm" : "text-gray-400"}`}
                              >
                                Fixed Amount
                              </button>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                              {formData.affiliate_payout_type === "percentage"
                                ? "Commission Rate (%)"
                                : "Fixed Amount (₹)"}
                            </label>
                            <input
                              type="number"
                              value={
                                formData.affiliate_payout_type === "percentage"
                                  ? formData.affiliate_commission_rate
                                  : formData.affiliate_fixed_amount
                              }
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  [formData.affiliate_payout_type ===
                                  "percentage"
                                    ? "affiliate_commission_rate"
                                    : "affiliate_fixed_amount"]: Number(
                                    e.target.value,
                                  ),
                                })
                              }
                              className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm font-bold focus:ring-[#8E2A8B] focus:border-[#8E2A8B] outline-none"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                              Min. Affiliate Level
                            </label>
                            <select
                              value={
                                formData.min_affiliate_level || "Ambassador"
                              }
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  min_affiliate_level: e.target.value,
                                })
                              }
                              className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm font-bold focus:ring-[#8E2A8B] focus:border-[#8E2A8B] outline-none bg-white"
                            >
                              <option value="Ambassador">Ambassador</option>
                              <option value="Kottravai Seller">
                                Kottravai Seller
                              </option>
                              <option value="Kottravai Pro Partner">
                                Kottravai Pro Partner
                              </option>
                            </select>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Custom Form Builder - Table View */}
                  {formData.isCustomRequest && (
                    <div className="col-span-1 md:col-span-2 bg-white p-6 rounded-lg border border-gray-200">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold text-[#2D1B4E] text-lg">
                          Custom Form Fields
                        </h4>
                        <button
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              customFormConfig: [
                                ...prev.customFormConfig,
                                {
                                  id: Date.now().toString(),
                                  label: "",
                                  type: "text",
                                  placeholder: "",
                                  required: true,
                                },
                              ],
                            }))
                          }
                          className="bg-[#2D1B4E] text-white px-4 py-2 rounded-lg hover:bg-[#8E2A8B] transition flex items-center gap-2"
                        >
                          <Plus size={16} />
                          Add Field
                        </button>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="bg-gray-50 border-b-2 border-gray-200">
                              <th className="text-left px-4 py-3 font-bold text-sm text-gray-700">
                                Field Label
                              </th>
                              <th className="text-left px-4 py-3 font-bold text-sm text-gray-700">
                                Placeholder Text
                              </th>
                              <th className="text-left px-4 py-3 font-bold text-sm text-gray-700">
                                Field Type
                              </th>
                              <th className="text-center px-4 py-3 font-bold text-sm text-gray-700">
                                Required
                              </th>
                              <th className="text-center px-4 py-3 font-bold text-sm text-gray-700">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {/* Default Fields - Now Editable */}
                            {formData.defaultFormFields.map((field, index) => (
                              <tr
                                key={field.id}
                                className="border-b border-gray-100 bg-gray-50/50 hover:bg-gray-100/50 transition"
                              >
                                <td className="px-4 py-3">
                                  <input
                                    type="text"
                                    value={field.label}
                                    onChange={(e) => {
                                      const newFields = [
                                        ...formData.defaultFormFields,
                                      ];
                                      newFields[index].label = e.target.value;
                                      setFormData({
                                        ...formData,
                                        defaultFormFields: newFields,
                                      });
                                    }}
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-[#8E2A8B] focus:border-[#8E2A8B] outline-none bg-white"
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <input
                                    type="text"
                                    value={field.placeholder}
                                    onChange={(e) => {
                                      const newFields = [
                                        ...formData.defaultFormFields,
                                      ];
                                      newFields[index].placeholder =
                                        e.target.value;
                                      setFormData({
                                        ...formData,
                                        defaultFormFields: newFields,
                                      });
                                    }}
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-[#8E2A8B] focus:border-[#8E2A8B] outline-none bg-white"
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <select
                                    value={field.type}
                                    onChange={(e) => {
                                      const newFields = [
                                        ...formData.defaultFormFields,
                                      ];
                                      newFields[index].type = e.target
                                        .value as any;
                                      setFormData({
                                        ...formData,
                                        defaultFormFields: newFields,
                                      });
                                    }}
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-[#8E2A8B] focus:border-[#8E2A8B] outline-none bg-white"
                                  >
                                    <option value="text">Text</option>
                                    <option value="email">Email</option>
                                    <option value="tel">Phone</option>
                                    <option value="file">File Upload</option>
                                    <option value="textarea">Long Text</option>
                                    <option value="number">Number</option>
                                  </select>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <input
                                    type="checkbox"
                                    checked={field.required}
                                    onChange={(e) => {
                                      const newFields = [
                                        ...formData.defaultFormFields,
                                      ];
                                      newFields[index].required =
                                        e.target.checked;
                                      setFormData({
                                        ...formData,
                                        defaultFormFields: newFields,
                                      });
                                    }}
                                    className="w-4 h-4 rounded text-[#8E2A8B] focus:ring-[#8E2A8B] border-gray-300"
                                  />
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className="text-xs text-gray-400 bg-gray-200 px-2 py-1 rounded">
                                    Default
                                  </span>
                                </td>
                              </tr>
                            ))}

                            {/* Custom Fields - Editable */}
                            {formData.customFormConfig.map((field, index) => (
                              <tr
                                key={field.id}
                                className="border-b border-gray-100 hover:bg-blue-50/30 transition"
                              >
                                <td className="px-4 py-3">
                                  <input
                                    type="text"
                                    value={field.label}
                                    onChange={(e) => {
                                      const newConfig = [
                                        ...formData.customFormConfig,
                                      ];
                                      newConfig[index].label = e.target.value;
                                      setFormData({
                                        ...formData,
                                        customFormConfig: newConfig,
                                      });
                                    }}
                                    placeholder="e.g., Size, Color"
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-[#8E2A8B] focus:border-[#8E2A8B] outline-none"
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <input
                                    type="text"
                                    value={field.placeholder || ""}
                                    onChange={(e) => {
                                      const newConfig = [
                                        ...formData.customFormConfig,
                                      ];
                                      newConfig[index].placeholder =
                                        e.target.value;
                                      setFormData({
                                        ...formData,
                                        customFormConfig: newConfig,
                                      });
                                    }}
                                    placeholder="Enter placeholder text"
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-[#8E2A8B] focus:border-[#8E2A8B] outline-none"
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <select
                                    value={field.type}
                                    onChange={(e) => {
                                      const newConfig = [
                                        ...formData.customFormConfig,
                                      ];
                                      newConfig[index].type = e.target
                                        .value as any;
                                      setFormData({
                                        ...formData,
                                        customFormConfig: newConfig,
                                      });
                                    }}
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-[#8E2A8B] focus:border-[#8E2A8B] outline-none bg-white"
                                  >
                                    <option value="text">Text</option>
                                    <option value="textarea">Long Text</option>
                                    <option value="number">Number</option>
                                  </select>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <input
                                    type="checkbox"
                                    checked={field.required !== false}
                                    onChange={(e) => {
                                      const newConfig = [
                                        ...formData.customFormConfig,
                                      ];
                                      newConfig[index].required =
                                        e.target.checked;
                                      setFormData({
                                        ...formData,
                                        customFormConfig: newConfig,
                                      });
                                    }}
                                    className="w-4 h-4 rounded text-[#8E2A8B] focus:ring-[#8E2A8B] border-gray-300"
                                  />
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newConfig =
                                        formData.customFormConfig.filter(
                                          (_, i) => i !== index,
                                        );
                                      setFormData({
                                        ...formData,
                                        customFormConfig: newConfig,
                                      });
                                    }}
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded transition"
                                    title="Delete field"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {formData.customFormConfig.length === 0 && (
                        <p className="text-sm text-gray-400 italic text-center py-4 bg-gray-50 rounded mt-4">
                          No custom fields added. Default fields (Name, Email,
                          Phone, Image) will be used.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Product Variants Section */}
                  <div className="space-y-4 pt-6 border-t border-gray-100">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-md font-bold text-[#2D1B4E]">
                          Product Variants (Weight-based)
                        </h4>
                        <p className="text-xs text-gray-500">
                          Add different weights, prices, and images for this
                          product.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            variants: [
                              ...prev.variants,
                              { weight: "", price: 0, images: [] },
                            ],
                          }))
                        }
                        className="bg-[#2D1B4E] text-white px-4 py-2 rounded-lg hover:bg-[#8E2A8B] transition flex items-center gap-2 text-sm font-bold"
                      >
                        <Plus size={16} />
                        Add Variant
                      </button>
                    </div>

                    {formData.variants.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {formData.variants.map((variant, index) => (
                          <div
                            key={index}
                            className="bg-gray-50 p-4 rounded-xl border border-gray-200 relative group"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                const newVariants = formData.variants.filter(
                                  (_, i) => i !== index,
                                );
                                setFormData({
                                  ...formData,
                                  variants: newVariants,
                                });
                              }}
                              className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-10"
                            >
                              <X size={14} />
                            </button>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-700">
                                  Weight / Size
                                </label>
                                <input
                                  type="text"
                                  value={variant.weight}
                                  onChange={(e) => {
                                    const newVariants = [...formData.variants];
                                    newVariants[index].weight = e.target.value;
                                    setFormData({
                                      ...formData,
                                      variants: newVariants,
                                    });
                                  }}
                                  placeholder="e.g. 500g, 1kg"
                                  className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-[#8E2A8B] focus:border-[#8E2A8B] outline-none"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-700">
                                  Price (₹)
                                </label>
                                <input
                                  type="number"
                                  value={variant.price || ""}
                                  onChange={(e) => {
                                    const newVariants = [...formData.variants];
                                    newVariants[index].price = parseFloat(
                                      e.target.value,
                                    );
                                    setFormData({
                                      ...formData,
                                      variants: newVariants,
                                    });
                                  }}
                                  placeholder="Price"
                                  className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-[#8E2A8B] focus:border-[#8E2A8B] outline-none"
                                />
                              </div>
                            </div>

                            <div className="mt-3 space-y-1">
                              <label className="text-xs font-bold text-gray-700">
                                Variant Images
                              </label>
                              <div className="flex flex-wrap gap-2 mb-2">
                                {(variant.images || []).map((img, imgIdx) => (
                                  <div
                                    key={imgIdx}
                                    className="relative w-10 h-10 rounded border border-gray-300 overflow-hidden group/img"
                                  >
                                    <img
                                      src={img}
                                      className="w-full h-full object-cover"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newVariants = [
                                          ...formData.variants,
                                        ];
                                        newVariants[index].images = newVariants[
                                          index
                                        ].images.filter((_, i) => i !== imgIdx);
                                        setFormData({
                                          ...formData,
                                          variants: newVariants,
                                        });
                                      }}
                                      className="absolute top-0 right-0 bg-red-500 text-white p-0.5 opacity-0 group-hover/img:opacity-100"
                                    >
                                      <X size={8} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                              <label className="cursor-pointer bg-white border border-gray-300 text-gray-700 px-3 py-1 rounded text-[10px] font-bold hover:bg-gray-50 transition-colors inline-block uppercase tracking-wider">
                                Upload Images
                                <input
                                  type="file"
                                  multiple
                                  className="hidden"
                                  accept="image/*"
                                  onChange={async (e) => {
                                    const files = e.target.files;
                                    if (files) {
                                      setIsUploading(true);
                                      const loadToast = toast.loading(
                                        "Uploading variant images...",
                                      );
                                      try {
                                        const uploadedUrls = await Promise.all(
                                          Array.from(files).map(
                                            async (file) => {
                                              const result =
                                                await compressImage(file);
                                              return uploadToSupabase(
                                                result.file,
                                                "variants",
                                              );
                                            },
                                          ),
                                        );

                                        const newVariants = [
                                          ...formData.variants,
                                        ];
                                        newVariants[index].images = [
                                          ...(newVariants[index].images || []),
                                          ...uploadedUrls,
                                        ];
                                        setFormData({
                                          ...formData,
                                          variants: newVariants,
                                        });
                                        toast.success("Images uploaded", {
                                          id: loadToast,
                                        });
                                      } catch (err: any) {
                                        toast.error(
                                          "Upload failed: " + err.message,
                                          { id: loadToast },
                                        );
                                      } finally {
                                        setIsUploading(false);
                                      }
                                    }
                                  }}
                                />
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                        <p className="text-sm text-gray-500 italic">
                          No weight variants added. Default price and images
                          will be used.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">
                    Short Description
                  </label>
                  <input
                    type="text"
                    value={formData.shortDescription}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        shortDescription: e.target.value,
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-[#8E2A8B] focus:border-[#8E2A8B] outline-none transition-all"
                    placeholder="Brief summary used in cards"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">
                    Full Description
                  </label>
                  <textarea
                    rows={4}
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-[#8E2A8B] focus:border-[#8E2A8B] outline-none transition-all"
                    placeholder="Detailed description..."
                  ></textarea>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">
                      Key Features (One per line)
                    </label>
                    <textarea
                      rows={4}
                      value={formData.keyFeatures}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          keyFeatures: e.target.value,
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-[#8E2A8B] focus:border-[#8E2A8B] outline-none transition-all"
                      placeholder="- Feature 1&#10;- Feature 2"
                    ></textarea>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">
                      Specifications (One per line)
                    </label>
                    <textarea
                      rows={4}
                      value={formData.specifications}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          specifications: e.target.value,
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-[#8E2A8B] focus:border-[#8E2A8B] outline-none transition-all"
                      placeholder="- Spec 1&#10;- Spec 2"
                    ></textarea>
                  </div>
                </div>
                
                {/* Customization Settings */}
                <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-black text-[#2D1B4E]">Product Customization</h3>
                      <p className="text-xs text-gray-500">Enable and configure customization options for this product.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isCustomizable}
                        onChange={(e) => setFormData({ ...formData, isCustomizable: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#8E2A8B]"></div>
                    </label>
                  </div>

                  {formData.isCustomizable && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 bg-white p-4 rounded-xl border border-purple-100">
                      
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-700">Customization Charge (₹)</label>
                        <input
                          type="number"
                          value={formData.customizationCharge}
                          onChange={(e) => setFormData({ ...formData, customizationCharge: Number(e.target.value) })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-[#8E2A8B] outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-700">Customizable Tag</label>
                        <select
                          value={formData.customizableTag}
                          onChange={(e) => setFormData({ ...formData, customizableTag: e.target.value as any })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-[#8E2A8B] outline-none"
                        >
                          <option value="CUSTOMIZABLE">CUSTOMIZABLE</option>
                          <option value="PERSONALIZABLE">PERSONALIZABLE</option>
                          <option value="CUSTOM MADE">CUSTOM MADE</option>
                        </select>
                      </div>

                      <div className="flex items-center justify-between col-span-1 border border-gray-100 p-2 rounded-lg">
                        <span className="text-xs font-bold text-gray-700">Allow Image Upload</span>
                        <input
                          type="checkbox"
                          checked={formData.allowCustomImage}
                          onChange={(e) => setFormData({ ...formData, allowCustomImage: e.target.checked })}
                          className="accent-[#8E2A8B]"
                        />
                      </div>

                      {formData.allowCustomImage && (
                        <div className="space-y-1 border border-gray-100 p-2 rounded-lg">
                          <label className="text-xs font-bold text-gray-700">Max File Size (MB)</label>
                          <input
                            type="number"
                            value={formData.customImageMaxSizeMB}
                            onChange={(e) => setFormData({ ...formData, customImageMaxSizeMB: Number(e.target.value) })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-1 focus:ring-[#8E2A8B] outline-none"
                          />
                        </div>
                      )}

                      <div className="flex items-center justify-between col-span-1 border border-gray-100 p-2 rounded-lg">
                        <span className="text-xs font-bold text-gray-700">Allow Custom Text</span>
                        <input
                          type="checkbox"
                          checked={formData.allowCustomText}
                          onChange={(e) => setFormData({ ...formData, allowCustomText: e.target.checked })}
                          className="accent-[#8E2A8B]"
                        />
                      </div>

                      {formData.allowCustomText && (
                        <div className="space-y-1 border border-gray-100 p-2 rounded-lg">
                          <label className="text-xs font-bold text-gray-700">Max Text Length</label>
                          <input
                            type="number"
                            value={formData.customTextMaxLength}
                            onChange={(e) => setFormData({ ...formData, customTextMaxLength: Number(e.target.value) })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-1 focus:ring-[#8E2A8B] outline-none"
                          />
                        </div>
                      )}

                      <div className="flex items-center justify-between col-span-1 md:col-span-2 border border-gray-100 p-2 rounded-lg">
                        <span className="text-xs font-bold text-gray-700">Allow Special Instructions</span>
                        <input
                          type="checkbox"
                          checked={formData.allowSpecialInstructions}
                          onChange={(e) => setFormData({ ...formData, allowSpecialInstructions: e.target.checked })}
                          className="accent-[#8E2A8B]"
                        />
                      </div>

                    </div>
                  )}
                </div>

                {/* Image Uploads */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">
                      Main Image
                    </label>
                    <div className="flex items-center gap-4">
                      {mainImage && (
                        <div className="w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
                          <img
                            src={mainImage}
                            alt="Main"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <label className="cursor-pointer bg-purple-50 hover:bg-purple-100 text-[#8E2A8B] px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2">
                        <Upload size={16} />
                        Upload Cover
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={handleMainImageUpload}
                        />
                      </label>
                    </div>
                    {mainImage && (
                      <div className="mt-2">
                        <label className="text-xs font-bold text-gray-500 block mb-1">Image Alt Text (SEO)</label>
                        <input
                          type="text"
                          className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:ring-[#8E2A8B] focus:border-[#8E2A8B] outline-none transition-all"
                          placeholder="Describe the cover image..."
                          value={formData.image_alts?.[mainImage] || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormData((prev) => ({
                              ...prev,
                              image_alts: { ...prev.image_alts, [mainImage]: val },
                            }));
                          }}
                        />
                      </div>
                    )}
                    {compressionStats && mainImage && (
                      <div className="mt-4 p-4 bg-emerald-50 rounded-xl border border-emerald-100 animate-in fade-in slide-in-from-top-2 duration-500">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 text-emerald-700">
                            <Check size={16} className="text-emerald-500" />
                            <span className="text-xs font-black uppercase tracking-wider">
                              Image Optimized
                            </span>
                          </div>
                          <span className="text-xs font-black text-emerald-600 bg-white px-2 py-1 rounded-lg border border-emerald-100">
                            -{compressionStats.saved}% Savings
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-white/50 p-2 rounded-lg">
                            <p className="text-[10px] text-gray-500 font-bold uppercase">
                              Original
                            </p>
                            <p className="text-sm font-black text-gray-700">
                              {compressionStats.original} KB
                            </p>
                          </div>
                          <div className="bg-white/50 p-2 rounded-lg">
                            <p className="text-[10px] text-gray-500 font-bold uppercase">
                              Optimized
                            </p>
                            <p className="text-sm font-black text-[#8E2A8B]">
                              {compressionStats.compressed} KB
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">
                      Gallery Images
                    </label>
                    <div className="space-y-3">
                      {otherImages.length > 0 && (
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                          {otherImages.map((img, idx) => (
                            <div key={idx} className="flex items-center gap-3 p-2 bg-gray-50 rounded-xl border border-gray-100">
                              <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-200 shrink-0">
                                <img src={img} alt="" className="w-full h-full object-cover" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <input
                                  type="text"
                                  className="w-full border border-gray-300 rounded-lg px-2.5 py-1 text-xs focus:ring-[#8E2A8B] focus:border-[#8E2A8B] outline-none bg-white"
                                  placeholder={`Gallery image ${idx + 1} alt text...`}
                                  value={formData.image_alts?.[img] || ""}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setFormData((prev) => ({
                                      ...prev,
                                      image_alts: { ...prev.image_alts, [img]: val },
                                    }));
                                  }}
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => removeOtherImage(idx)}
                                className="text-red-500 hover:text-red-700 p-1 shrink-0 transition-colors"
                                title="Remove image"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold transition-colors inline-flex items-center gap-2">
                        <Upload size={16} />
                        Add Images
                        <input
                          type="file"
                          multiple
                          className="hidden"
                          accept="image/*"
                          onChange={handleOtherImagesUpload}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => {
                      setView("list");
                      resetForm();
                    }}
                    disabled={isUploading}
                    className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-bold hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUploading}
                    className="px-6 py-2.5 bg-[#2D1B4E] text-white rounded-lg font-bold hover:bg-[#8E2A8B] transition-colors shadow-lg disabled:bg-gray-400 flex items-center gap-2"
                  >
                    {isUploading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Saving...
                      </>
                    ) : editingId ? (
                      "Save Changes"
                    ) : (
                      "Create Product"
                    )}
                  </button>
                </div>
              </form>
            </div>
          ) : view === "stocks" ? (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-[#2D1B4E] text-white">
                    <tr>
                      <th className="px-6 py-4 font-bold text-sm uppercase tracking-wider">
                        Product
                      </th>
                      <th className="px-6 py-4 font-bold text-sm uppercase tracking-wider">
                        Current Stock
                      </th>
                      <th className="px-6 py-4 font-bold text-sm uppercase tracking-wider">
                        Update Stock
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {products.map((product) => (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded bg-gray-100 overflow-hidden">
                              <img
                                src={product.image}
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <span className="font-medium text-gray-900">
                              {product.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold ${product.stock && product.stock > 10 ? "bg-green-100 text-green-700" : product.stock && product.stock > 0 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}
                          >
                            {product.stock || 0} units
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                updateStock(
                                  product.id,
                                  Math.max(0, (product.stock || 0) - 1),
                                )
                              }
                              className="p-1.5 rounded-lg bg-gray-100 hover:bg-red-100 text-gray-600 hover:text-red-600 transition-colors"
                            >
                              <ChevronDown size={16} />
                            </button>
                            <span className="w-8 text-center font-bold">
                              {product.stock || 0}
                            </span>
                            <button
                              onClick={() =>
                                updateStock(
                                  product.id,
                                  (product.stock || 0) + 1,
                                )
                              }
                              className="p-1.5 rounded-lg bg-gray-100 hover:bg-green-100 text-gray-600 hover:text-green-600 transition-colors"
                            >
                              <ChevronUp size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : view === "users" ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                  <h4 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">
                    Total Customers
                  </h4>
                  <p className="text-3xl font-bold text-[#2D1B4E]">
                    {customers.length}
                  </p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                  <h4 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">
                    Average LTV
                  </h4>
                  <p className="text-3xl font-bold text-blue-600">
                    ₹
                    {customers.length > 0
                      ? (
                          customers.reduce((acc, c) => acc + c.totalSpent, 0) /
                          customers.length
                        ).toFixed(2)
                      : 0}
                  </p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                  <h4 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">
                    Repeat Customers
                  </h4>
                  <p className="text-3xl font-bold text-purple-600">
                    {customers.filter((c) => c.orderCount > 1).length}
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-[#2D1B4E] text-white">
                    <tr>
                      <th className="px-6 py-4 font-bold text-sm uppercase tracking-wider">
                        Customer Name
                      </th>
                      <th className="px-6 py-4 font-bold text-sm uppercase tracking-wider">
                        Email/Phone
                      </th>
                      <th className="px-6 py-4 font-bold text-sm uppercase tracking-wider">
                        Orders
                      </th>
                      <th className="px-6 py-4 font-bold text-sm uppercase tracking-wider">
                        Total Spent
                      </th>
                      <th className="px-6 py-4 font-bold text-sm uppercase tracking-wider">
                        Last Order
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {customers
                      .sort((a, b) => b.totalSpent - a.totalSpent)
                      .map((customer, idx) => (
                        <tr
                          key={idx}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <span className="font-bold text-gray-800">
                              {customer.name}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm text-gray-600">
                                {customer.email}
                              </span>
                              <span className="text-xs text-gray-400">
                                {customer.phone}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="bg-purple-50 text-[#8E2A8B] px-3 py-1 rounded-full text-xs font-bold">
                              {customer.orderCount} Orders
                            </span>
                          </td>
                          <td className="px-6 py-4 font-bold text-gray-900">
                            ₹{customer.totalSpent.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {new Date(customer.lastOrder).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    {customers.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-6 py-10 text-center text-gray-400 italic"
                        >
                          No customer data available yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : view === "orders" ? (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-[#2D1B4E]">
                  Orders Management
                </h3>
                <button
                  onClick={() =>
                    generateInvoice({
                      id: "SAMPLE-123",
                      date: new Date().toISOString(),
                      customerName: "Sample Customer",
                      customerEmail: "customer@example.com",
                      customerPhone: "+91 9876543210",
                      address: "123, Sample Street, Test City",
                      city: "Chennai",
                      state: "Tamil Nadu",
                      pincode: "600001",
                      total: 5000,
                      items: [
                        {
                          name: "Kottravai Premium Product",
                          quantity: 1,
                          price: 4500,
                        },
                        {
                          name: "Heritage Collection Item",
                          quantity: 2,
                          price: 250,
                        },
                      ],
                      subtotal_server: 5000,
                      shipping_server: 0,
                    })
                  }
                  className="bg-[#8E2A8B] text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-[#2D1B4E] transition-all flex items-center gap-2 shadow-md"
                >
                  <FileText size={18} />
                  Generate Sample Invoice
                </button>
              </div>

              <div className="flex items-center gap-4 border-b border-gray-200 mb-6 pb-2">
                <button
                  onClick={() => setOrderTab("normal")}
                  className={`px-4 py-2 font-bold text-sm rounded-t-lg transition-colors ${orderTab === "normal" ? "text-[#8E2A8B] border-b-2 border-[#8E2A8B]" : "text-gray-500 hover:text-gray-700"}`}
                >
                  Normal Orders
                </button>
                <button
                  onClick={() => setOrderTab("customized")}
                  className={`px-4 py-2 font-bold text-sm rounded-t-lg transition-colors ${orderTab === "customized" ? "text-[#8E2A8B] border-b-2 border-[#8E2A8B]" : "text-gray-500 hover:text-gray-700"}`}
                >
                  ✨ Customized Orders
                </button>
              </div>

              {(() => {
                let filteredOrders = orders.filter(o => {
                  const hasCustom = o.has_customizations || (o.items && o.items.some((i: any) => i.customizationData?.isCustomized));
                  return orderTab === "customized" ? hasCustom : !hasCustom;
                });
                
                // Analytics calcs
                const totalRevenue = filteredOrders.reduce((acc, curr) => acc + curr.total, 0);
                
                let avgCustomizationFee = 0;
                let topCustomProduct = "";
                let repeatCustomers = 0;
                
                if (orderTab === "customized" && filteredOrders.length > 0) {
                  let totalFees = 0;
                  let feeCount = 0;
                  const productCounts: Record<string, number> = {};
                  const customerCounts: Record<string, number> = {};
                  
                  filteredOrders.forEach(o => {
                      customerCounts[o.customerEmail] = (customerCounts[o.customerEmail] || 0) + 1;
                      o.items.forEach((i: any) => {
                          if (i.customizationData?.isCustomized) {
                              totalFees += (i.customizationData.customizationCharge || 0);
                              feeCount++;
                              productCounts[i.name] = (productCounts[i.name] || 0) + 1;
                          }
                      });
                  });
                  avgCustomizationFee = feeCount > 0 ? totalFees / feeCount : 0;
                  topCustomProduct = Object.keys(productCounts).sort((a,b) => productCounts[b] - productCounts[a])[0] || "N/A";
                  repeatCustomers = Object.values(customerCounts).filter(v => v > 1).length;
                }

                // Apply search and filters
                if (orderSearchQuery) {
                    const q = orderSearchQuery.toLowerCase();
                    filteredOrders = filteredOrders.filter(o => 
                        o.id.toLowerCase().includes(q) || 
                        o.customerName.toLowerCase().includes(q) || 
                        (o.customerPhone && o.customerPhone.includes(q)) ||
                        o.items.some((i:any) => i.name.toLowerCase().includes(q))
                    );
                }
                
                if (orderFilterStatus !== "All") {
                    filteredOrders = filteredOrders.filter(o => o.status === orderFilterStatus);
                }

                return (
                  <>
              {orderTab === "customized" ? (
                <div className="mb-8 space-y-4">
                  <div className="p-5 bg-purple-50 rounded-2xl border border-purple-100 shadow-inner">
                    <div className="mb-4">
                      <h4 className="text-[#2D1B4E] text-lg font-black flex items-center gap-2">
                        <Sparkles size={20} className="text-[#8E2A8B]" />
                        Customization Analytics
                      </h4>
                      <p className="text-xs text-gray-500">Comprehensive metrics for customized production</p>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white p-3 rounded-xl border border-purple-100 shadow-sm">
                        <p className="text-[10px] text-gray-400 font-bold uppercase">Total Custom Orders</p>
                        <p className="text-xl font-black text-[#2D1B4E]">{filteredOrders.length}</p>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-purple-100 shadow-sm">
                        <p className="text-[10px] text-gray-400 font-bold uppercase">Total Revenue</p>
                        <p className="text-xl font-black text-green-600">₹{totalRevenue.toLocaleString()}</p>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-purple-100 shadow-sm">
                        <p className="text-[10px] text-gray-400 font-bold uppercase">Avg Custom Fee</p>
                        <p className="text-xl font-black text-[#8E2A8B]">₹{avgCustomizationFee.toFixed(0)}</p>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-purple-100 shadow-sm">
                        <p className="text-[10px] text-gray-400 font-bold uppercase">Avg Production Time</p>
                        <p className="text-xl font-black text-blue-600">3 Days</p>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-purple-100 shadow-sm col-span-2">
                        <p className="text-[10px] text-gray-400 font-bold uppercase">Top Customized Product</p>
                        <p className="text-sm font-black text-gray-800 truncate">{topCustomProduct}</p>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-purple-100 shadow-sm col-span-2">
                        <p className="text-[10px] text-gray-400 font-bold uppercase">Repeat Customers</p>
                        <p className="text-sm font-black text-gray-800">{repeatCustomers} Customers</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="Search by Order ID, Name, Phone, or Product..." 
                            value={orderSearchQuery}
                            onChange={(e) => setOrderSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8E2A8B]/20 focus:border-[#8E2A8B] transition-all"
                        />
                    </div>
                    <select 
                        value={orderFilterStatus}
                        onChange={(e) => setOrderFilterStatus(e.target.value)}
                        className="py-2 px-4 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#8E2A8B]/20 focus:border-[#8E2A8B]"
                    >
                        <option value="All">All Statuses</option>
                        <option value="Pending Review">Pending Review</option>
                        <option value="Approved for Production">Approved for Production</option>
                        <option value="Design Started">Design Started</option>
                        <option value="Customization Completed">Customization Completed</option>
                        <option value="Quality Check">Quality Check</option>
                        <option value="Packed">Packed</option>
                        <option value="Shipped">Shipped</option>
                        <option value="Delivered">Delivered</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
                </div>
              )}

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-[#2D1B4E] text-white">
                    <tr>
                      <th className="px-6 py-4 font-bold text-sm uppercase tracking-wider">
                        Order ID
                      </th>
                      <th className="px-6 py-4 font-bold text-sm uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-6 py-4 font-bold text-sm uppercase tracking-wider">
                        Items
                      </th>
                      <th className="px-6 py-4 font-bold text-sm uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-4 font-bold text-sm uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-6 py-4 font-bold text-sm uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 font-bold text-sm uppercase tracking-wider text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">
                          <div className="flex flex-col">
                            <span className="font-black text-[#2D1B4E]">
                              #{order.id.slice(0, 8).toUpperCase()}
                            </span>
                            {order.orderId && (
                              <span className="text-[10px] text-gray-400 font-bold">
                                RPAY: {order.orderId}
                              </span>
                            )}
                            {order.shiprocketOrderId && (
                              <div className="mt-1 flex flex-col gap-0.5">
                                <span className="text-[10px] text-[#8E2A8B] font-black uppercase tracking-tighter">
                                  🚀 SR ID: {order.shiprocketOrderId}
                                </span>
                                {order.shipmentId && (
                                  <span className="text-[9px] text-gray-500 font-bold">
                                    SHP: {order.shipmentId}
                                  </span>
                                )}
                              </div>
                            )}
                            {order.zoneName && (
                              <span className="text-[9px] text-[#8E2A8B]/60 font-black italic mt-0.5">
                                Zone: {order.zoneName}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-900">
                              {order.customerName}
                            </span>
                            <span className="text-xs text-gray-500">
                              {order.customerEmail}
                            </span>
                            <div className="flex flex-col mt-1 space-y-0.5">
                              {order.customerPhone && (
                                <span className="text-[10px] text-gray-400">
                                  📞 {order.customerPhone}
                                </span>
                              )}
                              {order.address && (
                                <span
                                  className="text-[10px] text-gray-400 truncate max-w-[200px]"
                                  title={order.address}
                                >
                                  🏠 {order.address}
                                </span>
                              )}
                              {order.city && (
                                <span className="text-[10px] text-gray-400">
                                  📍 {order.city}, {order.pincode}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            {Array.isArray(order.items) ? (
                              order.items.map((item: any, idx: number) => (
                                <div
                                  key={idx}
                                  className="flex items-center gap-2 text-xs"
                                >
                                  <span className="font-bold text-gray-800">
                                    {item.quantity}x
                                  </span>
                                  <span
                                    className="text-gray-600 truncate max-w-[150px]"
                                    title={item.name}
                                  >
                                    {item.name}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <span className="text-gray-400 italic text-xs">
                                No items
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {new Date(order.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 font-bold text-[#8E2A8B]">
                          ₹{order.total}
                        </td>
                        <td className="px-6 py-4">
                          <select
                            value={order.status}
                            onChange={(e) =>
                              updateOrderStatus(order.id, e.target.value as any)
                            }
                            className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border-0 cursor-pointer focus:ring-2 focus:ring-offset-1 focus:ring-[#8E2A8B] ${
                              order.status === "Delivered"
                                ? "bg-green-100 text-green-700"
                                : ["Shipped", "Packed"].includes(order.status)
                                  ? "bg-blue-100 text-blue-700"
                                  : ["Design Approved", "Design Started", "Customization Completed", "In Production", "Quality Check", "Approved for Production"].includes(order.status)
                                    ? "bg-purple-100 text-purple-700"
                                    : ["Processing", "Pending Review"].includes(order.status)
                                      ? "bg-yellow-100 text-yellow-700"
                                      : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            <option value="Pending">Pending</option>
                            <option value="Processing">Processing</option>
                            {orderTab === "customized" && (
                              <>
                                <option value="Pending Review">Pending Review</option>
                                <option value="Approved for Production">Approved for Production</option>
                                <option value="Design Started">Design Started</option>
                                <option value="Customization Completed">Customization Completed</option>
                                <option value="Quality Check">Quality Check</option>
                                <option value="Packed">Packed</option>
                              </>
                            )}
                            <option value="Shipped">Shipped</option>
                            <option value="Delivered">Delivered</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            {orderTab === "customized" && (
                              <button
                                onClick={() => setSelectedOrderDetails(order)}
                                className="text-[#8E2A8B] hover:text-[#2D1B4E] p-2 hover:bg-purple-50 rounded-lg transition-colors flex items-center gap-1 border border-purple-100"
                                title="View Details"
                              >
                                <Search size={18} />
                                <span className="text-[10px] font-bold">Details</span>
                              </button>
                            )}
                            <button
                              onClick={() => generateInvoice(order)}
                              className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1"
                              title="Download Invoice"
                            >
                              <FileText size={18} />
                              <span className="text-[10px] font-bold">
                                Invoice
                              </span>
                            </button>

                            {!order.shiprocketOrderId && (
                              <button
                                onClick={() => handleShiprocketPush(order)}
                                className="text-purple-600 hover:text-purple-800 p-2 hover:bg-purple-50 rounded-lg transition-colors flex items-center gap-1"
                                title="Push to Shiprocket"
                              >
                                <Package size={18} />
                                <span className="text-[10px] font-bold">
                                  Shiprocket
                                </span>
                              </button>
                            )}
                            <button
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `Delete order #${order.id.slice(0, 8)}?`,
                                  )
                                ) {
                                  deleteOrder(order.id);
                                  toast.success("Order deleted");
                                }
                              }}
                              className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Order"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {orders.length === 0 && (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-6 py-10 text-center text-gray-400"
                        >
                          No orders found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Order Details Modal */}
              {selectedOrderDetails && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl relative">
                    <button 
                      onClick={() => setSelectedOrderDetails(null)}
                      className="absolute top-4 right-4 p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                    >
                      <X size={20} className="text-gray-600" />
                    </button>
                    
                    <div className="p-8">
                      <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-6">
                        <Sparkles size={24} className="text-[#8E2A8B]" />
                        <div>
                          <h2 className="text-2xl font-black text-[#2D1B4E]">Customized Order Details</h2>
                          <p className="text-sm text-gray-500 font-medium">#{selectedOrderDetails.id.toUpperCase()}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Customer & Order Info */}
                        <div className="space-y-6">
                          <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Customer Information</h3>
                            <div className="space-y-3 text-sm">
                              <p><span className="font-medium text-gray-500 w-24 inline-block">Name:</span> <span className="font-bold text-gray-800">{selectedOrderDetails.customerName}</span></p>
                              <p><span className="font-medium text-gray-500 w-24 inline-block">Phone:</span> <span className="font-bold text-gray-800">{selectedOrderDetails.customerPhone || "N/A"}</span></p>
                              <p><span className="font-medium text-gray-500 w-24 inline-block">Email:</span> <span className="font-bold text-gray-800">{selectedOrderDetails.customerEmail}</span></p>
                              <p className="flex"><span className="font-medium text-gray-500 w-24 flex-shrink-0">Address:</span> <span className="font-bold text-gray-800">{selectedOrderDetails.address}, {selectedOrderDetails.city}, {selectedOrderDetails.state} - {selectedOrderDetails.pincode}</span></p>
                            </div>
                          </div>

                          <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Order Information</h3>
                            <div className="space-y-3 text-sm">
                              <p><span className="font-medium text-gray-500 w-24 inline-block">Order Date:</span> <span className="font-bold text-gray-800">{new Date(selectedOrderDetails.date).toLocaleString()}</span></p>
                              <p><span className="font-medium text-gray-500 w-24 inline-block">Payment:</span> <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">{selectedOrderDetails.paymentStatus || 'Paid'}</span></p>
                              <p><span className="font-medium text-gray-500 w-24 inline-block">Total Amount:</span> <span className="font-bold text-[#8E2A8B]">₹{selectedOrderDetails.total}</span></p>
                              <p><span className="font-medium text-gray-500 w-24 inline-block">Production:</span> <span className="font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded border border-purple-200">{selectedOrderDetails.status}</span></p>
                            </div>
                          </div>
                        </div>

                        {/* Customization Details */}
                        <div className="space-y-6">
                          <h3 className="text-xs font-black text-[#8E2A8B] uppercase tracking-widest mb-2 px-2 border-l-4 border-[#8E2A8B]">Customized Items</h3>
                          <div className="space-y-4">
                            {selectedOrderDetails.items.filter((i:any) => i.customizationData?.isCustomized).map((item: any, idx: number) => (
                              <div key={idx} className="bg-purple-50/50 rounded-xl p-5 border border-purple-100 shadow-sm">
                                <p className="font-black text-[#2D1B4E] mb-1">{item.name}</p>
                                <p className="text-xs text-gray-500 mb-4">Quantity: {item.quantity} • Customization Charge: ₹{item.customizationData.customizationCharge || 0}</p>
                                
                                {item.customizationData.customText && (
                                  <div className="mb-4">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Custom Text</p>
                                    <p className="bg-white p-3 rounded-lg border border-gray-200 text-sm font-medium text-gray-800 break-all">{item.customizationData.customText}</p>
                                  </div>
                                )}
                                
                                {item.customizationData.specialInstructions && (
                                  <div className="mb-4">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Special Instructions</p>
                                    <p className="bg-white p-3 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 italic break-words">{item.customizationData.specialInstructions}</p>
                                  </div>
                                )}

                                {item.customizationData.customImage && (
                                  <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Uploaded Image</p>
                                    <div className="bg-white p-2 rounded-xl border border-gray-200 inline-block">
                                      <div className="w-32 h-32 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 relative group cursor-pointer" onClick={() => window.open(item.customizationData.customImage, '_blank')}>
                                        <img src={item.customizationData.customImage} alt="Custom Preview" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-2">
                                          <ImageIcon size={20} />
                                          <span className="text-[10px] font-bold">View Full</span>
                                        </div>
                                      </div>
                                      <div className="flex gap-2 mt-2">
                                        <button onClick={() => window.open(item.customizationData.customImage, '_blank')} className="flex-1 text-[10px] font-bold py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 transition-colors">View</button>
                                        <button onClick={() => {
                                          navigator.clipboard.writeText(item.customizationData.customImage);
                                          toast.success("Image URL copied!");
                                        }} className="flex-1 text-[10px] font-bold py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 transition-colors">Copy URL</button>
                                        <a href={item.customizationData.customImage} download={`custom-${selectedOrderDetails.id}.jpg`} className="flex-1 text-center text-[10px] font-bold py-1.5 bg-purple-100 hover:bg-purple-200 rounded text-purple-700 transition-colors">Download</a>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                            {selectedOrderDetails.items.filter((i:any) => i.customizationData?.isCustomized).length === 0 && (
                              <p className="text-sm text-gray-500 italic">No customization details available.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
                  </>
                );
              })()}
            </div>
          ) : view === "whatsapp-helper" ? (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                <h3 className="text-xl font-bold text-[#2D1B4E] mb-2 flex items-center gap-2">
                  <MessageCircle className="text-[#25D366]" size={24} />
                  WhatsApp Catalog Assistant
                </h3>
                <p className="text-gray-500 text-sm mb-6">
                  Use this tool to quickly sync your website products with your{" "}
                  <b>WhatsApp Business App</b>. Copy the description and link
                  below, then paste them into your WhatsApp catalog.
                </p>

                {Object.entries(
                  products.reduce((acc: any, product) => {
                    const category = product.category || "Uncategorized";
                    if (!acc[category]) acc[category] = [];
                    acc[category].push(product);
                    return acc;
                  }, {}),
                ).map(([category, items]: [string, any]) => (
                  <div
                    key={category}
                    className="mb-10 animate-in fade-in duration-700"
                  >
                    <div className="flex items-center gap-3 mb-4 pl-1">
                      <div className="h-6 w-1 bg-[#25D366] rounded-full"></div>
                      <h4 className="text-lg font-black text-gray-700 uppercase tracking-widest">
                        {category}
                      </h4>
                      <span className="text-xs font-bold bg-gray-100 text-gray-500 px-2 py-1 rounded-md">
                        {items.length} Items
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {items.map((product: any) => (
                        <div
                          key={product.id}
                          className="bg-gray-50 rounded-2xl p-5 border border-gray-100 hover:shadow-md transition-all group"
                        >
                          <div className="flex gap-4 mb-4">
                            <div className="relative">
                              <img
                                src={product.image}
                                className="w-16 h-16 rounded-xl object-cover shadow-sm group-hover:scale-105 transition-transform"
                                alt=""
                              />
                              <div className="absolute -top-2 -left-2 bg-white rounded-full p-1 shadow-sm border border-gray-100">
                                <MessageCircle
                                  size={12}
                                  className="text-[#25D366]"
                                />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-[#2D1B4E] truncate text-sm">
                                {product.name}
                              </h4>
                              <p className="text-sm font-black text-[#8E2A8B] mt-0.5">
                                ₹{product.price}
                              </p>
                              <p className="text-[10px] text-gray-400 mt-1 truncate">
                                ID: {product.id.slice(0, 6)}...
                              </p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <button
                              onClick={() => {
                                const desc =
                                  `✨ *${product.name}*\n\n` +
                                  `📦 *Category:* ${product.category}\n` +
                                  `💰 *Price:* ₹${product.price}\n\n` +
                                  `📝 *Details:* \n${(product.shortDescription || product.description || "").slice(0, 150)}...\n\n` +
                                  `✅ Authentic Handcrafted Quality\n` +
                                  `✅ Sustainable & Eco-friendly\n\n` +
                                  `🛍️ Order Now via the link below!`;
                                navigator.clipboard.writeText(desc);
                                toast.success("Description Copied!");
                              }}
                              className="w-full flex items-center justify-center gap-2 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold hover:bg-[#25D366] hover:text-white hover:border-[#25D366] transition-all"
                            >
                              Copy Description
                            </button>

                            <button
                              onClick={() => {
                                const url = `${window.location.origin}/product/${product.slug}`;
                                navigator.clipboard.writeText(url);
                                toast.success("Product Link Copied!");
                              }}
                              className="w-full flex items-center justify-center gap-2 py-2 bg-[#2D1B4E] text-white rounded-lg text-xs font-bold hover:bg-black transition-colors"
                            >
                              <ArrowUpRight size={14} />
                              Copy Site Link
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : view === "list" ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white">
                <h3 className="text-xl font-bold text-[#2D1B4E] flex items-center gap-2">
                  <Package size={22} className="text-[#8E2A8B]" />
                  Inventory Catalog
                </h3>
                <div className="flex flex-wrap items-center gap-4">
                  {/* Status Toggle */}
                  <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
                    {(["all", "live", "draft"] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setStatusFilter(s)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                          statusFilter === s
                            ? "bg-[#2D1B4E] text-white shadow-md"
                            : "text-gray-500 hover:text-[#2D1B4E]"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>

                  {/* Search */}
                  <div className="relative">
                    <Search
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      size={16}
                    />
                    <input
                      type="text"
                      placeholder="Search items..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-200 outline-none w-48 transition-all focus:w-64"
                    />
                  </div>

                  {/* Category Select */}
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="border border-gray-200 bg-gray-50 rounded-lg px-4 py-2 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-purple-200 outline-none"
                  >
                    <option value="all">Categories: All</option>
                    {categories
                      .filter((c) => !c.parent)
                      .map((parent) => {
                        const renderSubOptions = (
                          parentSlug: string,
                          depth: number = 0,
                        ): React.ReactNode => {
                          return categories
                            .filter((c) => c.parent === parentSlug)
                            .map((sub) => (
                              <Fragment key={sub.slug}>
                                <option value={sub.slug}>
                                  {"\u00A0".repeat(depth * 4)}
                                  {depth > 0 ? "↳ " : ""}
                                  {sub.name}
                                </option>
                                {renderSubOptions(sub.slug, depth + 1)}
                              </Fragment>
                            ));
                        };
                        return (
                          <optgroup key={parent.slug} label={parent.name}>
                            <option value={parent.slug}>
                              --- General {parent.name} ---
                            </option>
                            {renderSubOptions(parent.slug)}
                          </optgroup>
                        );
                      })}
                  </select>
                </div>
              </div>
              <table className="w-full text-left">
                <thead className="bg-[#2D1B4E] text-white">
                  <tr>
                    <th className="px-6 py-4 font-bold text-sm uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-4 font-bold text-sm uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-4 font-bold text-sm uppercase tracking-wider">
                      Price
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredProducts.map((product) => (
                    <tr
                      key={product.id}
                      className="hover:bg-gray-50 transition-all border-b border-gray-100 group"
                    >
                      {quickEditId === product.id ? (
                        <td
                          colSpan={4}
                          className="p-0 animate-in slide-in-from-top-2 duration-300"
                        >
                          <div className="bg-blue-50/50 p-6 space-y-4 border-2 border-blue-200 rounded-xl m-2 shadow-sm">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
                              <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[#2D1B4E]">
                                  Title
                                </label>
                                <input
                                  type="text"
                                  value={quickEditForm.name}
                                  onChange={(e) =>
                                    setQuickEditForm({
                                      ...quickEditForm,
                                      name: e.target.value,
                                    })
                                  }
                                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-[#8E2A8B] focus:border-[#8E2A8B] outline-none bg-white"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[#2D1B4E]">
                                  Amount (₹)
                                </label>
                                <input
                                  type="number"
                                  value={quickEditForm.price}
                                  onChange={(e) =>
                                    setQuickEditForm({
                                      ...quickEditForm,
                                      price: e.target.value,
                                    })
                                  }
                                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-[#8E2A8B] focus:border-[#8E2A8B] outline-none bg-white"
                                />
                              </div>
                              <div className="flex flex-col gap-2 pt-4">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    id={`best-${product.id}`}
                                    checked={quickEditForm.isBestSeller}
                                    onChange={(e) =>
                                      setQuickEditForm({
                                        ...quickEditForm,
                                        isBestSeller: e.target.checked,
                                      })
                                    }
                                    className="w-4 h-4 rounded text-[#8E2A8B] focus:ring-[#8E2A8B] border-gray-300"
                                  />
                                  <label
                                    htmlFor={`best-${product.id}`}
                                    className="text-xs font-bold text-gray-700 cursor-pointer"
                                  >
                                    Best Seller
                                  </label>
                                </div>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    id={`bundle-${product.id}`}
                                    checked={quickEditForm.isGiftBundleItem}
                                    onChange={(e) =>
                                      setQuickEditForm({
                                        ...quickEditForm,
                                        isGiftBundleItem: e.target.checked,
                                      })
                                    }
                                    className="w-4 h-4 rounded text-[#8E2A8B] focus:ring-[#8E2A8B] border-gray-300"
                                  />
                                  <label
                                    htmlFor={`bundle-${product.id}`}
                                    className="text-xs font-bold text-gray-700 cursor-pointer"
                                  >
                                    Gift Bundle
                                  </label>
                                </div>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    id={`live-${product.id}`}
                                    checked={quickEditForm.isLive}
                                    onChange={(e) =>
                                      setQuickEditForm({
                                        ...quickEditForm,
                                        isLive: e.target.checked,
                                      })
                                    }
                                    className="w-4 h-4 rounded text-[#8E2A8B] focus:ring-[#8E2A8B] border-gray-300"
                                  />
                                  <label
                                    htmlFor={`live-${product.id}`}
                                    className="text-xs font-bold text-[#8E2A8B] cursor-pointer"
                                  >
                                    Live On Site
                                  </label>
                                </div>
                              </div>
                              <div className="flex gap-2 pt-4 justify-end">
                                <button
                                  onClick={() => setQuickEditId(null)}
                                  className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-bold hover:bg-white transition-colors"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleQuickUpdate(product)}
                                  className="px-6 py-2 bg-[#2D1B4E] text-white rounded-lg text-xs font-black uppercase tracking-widest hover:bg-[#8E2A8B] transition-colors"
                                >
                                  Update
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>
                      ) : (
                        <>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-200">
                                <img
                                  src={product.image}
                                  alt={product.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-gray-800">
                                    {product.name}
                                  </span>
                                  {product.isLive === false && (
                                    <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-black uppercase tracking-widest">
                                      Draft
                                    </span>
                                  )}
                                </div>
                                {/* Hover Actions */}
                                <div className="flex items-center gap-3 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => handleEdit(product)}
                                    className="text-[10px] font-bold text-blue-600 hover:text-blue-800 uppercase tracking-widest"
                                  >
                                    Edit
                                  </button>
                                  <span className="text-gray-300 text-[10px]">
                                    |
                                  </span>
                                  <button
                                    onClick={() => handleQuickEditInit(product)}
                                    className="text-[10px] font-bold text-emerald-600 hover:text-emerald-800 uppercase tracking-widest"
                                  >
                                    Quick Edit
                                  </button>
                                  <span className="text-gray-300 text-[10px]">
                                    |
                                  </span>
                                  <button
                                    onClick={() =>
                                      handleDeleteProduct(
                                        product.id,
                                        product.name,
                                      )
                                    }
                                    className="text-[10px] font-bold text-red-500 hover:text-red-700 uppercase tracking-widest"
                                  >
                                    Remove
                                  </button>
                                  <span className="text-gray-300 text-[10px]">
                                    |
                                  </span>
                                  <Link
                                    to={`/product/${product.slug}`}
                                    target="_blank"
                                    className="text-[10px] font-bold text-purple-600 hover:text-purple-800 uppercase tracking-widest"
                                  >
                                    View
                                  </Link>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            <span className="bg-gray-100 px-3 py-1 rounded-full text-xs font-bold text-gray-600 uppercase tracking-wide">
                              {product.category}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-bold text-[#8E2A8B]">
                            ₹{product.price}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                  {filteredProducts.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-6 py-12 text-center text-gray-400"
                      >
                        No products found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : view === "event-registrations" ? (
            <EventRegistrationsView />
          ) : view === "leads" ? (
            <LeadsView />
          ) : null}
        </div>
      </main>
    </div>
    </>
  );
};

export default AdminDashboard;
