import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from '@/config/api';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, ComposedChart, Area, LineChart, Line, AreaChart
} from 'recharts';
import { TrendingUp, Users, Target, DollarSign, Download, Activity, FileText, Send, CheckCircle2, ShieldAlert, Clock, AlertTriangle, Play, Brain } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const COLORS = ['#8E2A8B', '#a64ca3', '#bd6ebd', '#d490d8', '#ebb3f4', '#fdf4fc'];

export default function PipelineDashboard() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'executive' | 'revops' | 'pipeline' | 'forecast' | 'trends' | 'funnel' | 'opportunities' | 'performance'>('executive');
  
  // Data states
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [forecastData, setForecastData] = useState<any>(null);
  const [funnelData, setFunnelData] = useState<any[]>([]);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [performanceData, setPerformanceData] = useState<any>(null);
  
  // Phase 4D New states
  const [healthScoreData, setHealthScoreData] = useState<any>(null);
  const [insightsData, setInsightsData] = useState<any>(null);
  const [trendsData, setTrendsData] = useState<any>(null);
  const [forecastAccuracy, setForecastAccuracy] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [demoMode, setDemoMode] = useState<boolean>(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'30d' | '90d' | '12m'>('30d');
  
  // Phase 5A RevOps states
  const [velocityData, setVelocityData] = useState<any>(null);
  const [escalationsData, setEscalationsData] = useState<any>(null);
  const [predictionInput, setPredictionInput] = useState({
    source: 'Website',
    industry: 'Software',
    org_type: 'Enterprise',
    location: 'Chennai',
    lead_score: 75,
    intent_score: 80,
    comm_activity_count: 8
  });
  const [predictedValue, setPredictedValue] = useState<any>(null);
  const [loadingPredict, setLoadingPredict] = useState<boolean>(false);
  const [runningSlaCheck, setRunningSlaCheck] = useState<boolean>(false);

  // Email states
  const [emailRecipient, setEmailRecipient] = useState<string>('admin@kottravai.in');
  const [reportType, setReportType] = useState<'weekly' | 'monthly'>('weekly');
  const [sendingEmail, setSendingEmail] = useState<boolean>(false);
  const [emailStatus, setEmailStatus] = useState<string>('');

  const adminSecret = sessionStorage.getItem("kottravai_admin_token") || "";
  const headers = { "X-Admin-Secret": adminSecret };

  // 1. Initial Load of all pipeline data
  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      try {
        const [
          dashRes, forecastRes, funnelRes, oppRes, perfRes, 
          healthRes, insightsRes, trendsRes, accuracyRes,
          velocityRes, escalationsRes
        ] = await Promise.all([
          axios.get(`${API_BASE}/api/admin/pipeline/dashboard`, { headers }),
          axios.get(`${API_BASE}/api/admin/pipeline/forecast`, { headers }),
          axios.get(`${API_BASE}/api/admin/pipeline/funnel`, { headers }),
          axios.get(`${API_BASE}/api/admin/pipeline/opportunities`, { headers }),
          axios.get(`${API_BASE}/api/admin/pipeline/performance`, { headers }),
          axios.get(`${API_BASE}/api/admin/pipeline/health`, { headers }),
          axios.get(`${API_BASE}/api/admin/pipeline/insights`, { headers }),
          axios.get(`${API_BASE}/api/admin/pipeline/trends`, { headers }),
          axios.get(`${API_BASE}/api/admin/pipeline/forecast-accuracy`, { headers }),
          axios.get(`${API_BASE}/api/admin/revops/pipeline-velocity`, { headers }),
          axios.get(`${API_BASE}/api/admin/revops/escalations`, { headers })
        ]);
        
        if (dashRes.data.success) setDashboardData(dashRes.data.data);
        if (forecastRes.data.success) setForecastData(forecastRes.data.data);
        if (funnelRes.data.success) setFunnelData(funnelRes.data.data);
        if (oppRes.data.success) setOpportunities(oppRes.data.data);
        if (perfRes.data.success) setPerformanceData(perfRes.data.data);
        if (healthRes.data.success) setHealthScoreData(healthRes.data.data);
        if (insightsRes.data.success) setInsightsData(insightsRes.data.data);
        if (trendsRes.data.success) setTrendsData(trendsRes.data.data);
        if (accuracyRes.data.success) setForecastAccuracy(accuracyRes.data.data);
        if (velocityRes.data.success) setVelocityData(velocityRes.data.data);
        if (escalationsRes.data.success) setEscalationsData(escalationsRes.data.data);
      } catch (err) {
        console.error("Failed to load pipeline analytics:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, []);

  // 2. Fetch Leaderboard when Demo Mode changes
  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/admin/pipeline/leaderboard?demo_mode=${demoMode}`, { headers });
        if (res.data.success) setLeaderboard(res.data.data);
      } catch (err) {
        console.error("Failed to fetch leaderboard:", err);
      }
    };
    fetchLeaderboard();
  }, [demoMode]);

  const formatCurrency = (val: any) => `₹${parseFloat(val || 0).toLocaleString('en-IN')}`;

  const sendEmailReport = async () => {
    setSendingEmail(true);
    setEmailStatus('');
    try {
      const res = await axios.post(`${API_BASE}/api/admin/pipeline/report/send-email`, {
        recipient: emailRecipient,
        reportType: reportType
      }, { headers });

      if (res.data.success) {
        setEmailStatus('success');
      } else {
        setEmailStatus('error');
      }
    } catch (err) {
      console.error("Failed to send email report:", err);
      setEmailStatus('error');
    } finally {
      setSendingEmail(false);
    }
  };

  const handlePredictDealValue = async () => {
    setLoadingPredict(true);
    setPredictedValue(null);
    try {
      const res = await axios.post(`${API_BASE}/api/admin/revops/predict-deal-value`, predictionInput, { headers });
      if (res.data.success) {
        setPredictedValue(res.data.data);
      }
    } catch (err) {
      console.error("AI prediction simulator error:", err);
    } finally {
      setLoadingPredict(false);
    }
  };

  const handleRunSlaSweep = async () => {
    setRunningSlaCheck(true);
    try {
      const res = await axios.post(`${API_BASE}/api/admin/revops/run-sla-check`, {}, { headers });
      if (res.data.success) {
        alert(`SLA Sweep completed! Flagged ${res.data.results?.flaggedOverdue || 0} overdue leads.`);
        // Reload escalations
        const escRes = await axios.get(`${API_BASE}/api/admin/revops/escalations`, { headers });
        if (escRes.data.success) setEscalationsData(escRes.data.data);
      }
    } catch (err) {
      console.error("Manual SLA check failed:", err);
    } finally {
      setRunningSlaCheck(false);
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('Kottravai Pipeline Intelligence & Executive Summary', 14, 22);
    
    doc.setFontSize(14);
    doc.text('1. Pipeline Health & Core Metrics', 14, 32);
    const healthTable = [
      ['Total Pipeline Value', formatCurrency(dashboardData?.totalPipelineValue)],
      ['Expected Revenue Forecast', formatCurrency(dashboardData?.expectedRevenue)],
      ['Pipeline Health Score', `${healthScoreData?.score || 0}/100 (${healthScoreData?.status || 'N/A'})`],
      ['At-Risk Leads Count', String(healthScoreData?.metrics?.staleLeads || 0)],
      ['Forecast Accuracy', `${forecastAccuracy?.accuracy || 0}% (${forecastAccuracy?.confidence || 'Low'} Confidence)`]
    ];
    (doc as any).autoTable({ startY: 36, body: healthTable });

    let finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.text('2. Sales Performance Leaderboard', 14, finalY);
    const leadColumns = ['Representative', 'Leads Managed', 'Wins', 'Emails', 'WhatsApp', 'Calls', 'Revenue Closed'];
    const leadRows = leaderboard.map(rep => [
      rep.rep_name,
      String(rep.leads_managed),
      String(rep.opportunities_won),
      String(rep.emails_sent),
      String(rep.whatsapp_sent),
      String(rep.calls_logged),
      formatCurrency(rep.revenue_closed)
    ]);
    (doc as any).autoTable({ startY: finalY + 4, head: [leadColumns], body: leadRows });

    finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.text('3. Top Sales Opportunities', 14, finalY);
    const oppColumns = ['Opportunity Name', 'Company', 'Stage', 'Value', 'Probability'];
    const oppRows = opportunities.slice(0, 5).map(opp => [
      opp.name,
      opp.company,
      opp.stage,
      formatCurrency(opp.value),
      `${opp.probability}%`
    ]);
    (doc as any).autoTable({ startY: finalY + 4, head: [oppColumns], body: oppRows });

    doc.save('kottravai_pipeline_executive_summary.pdf');
  };

  const exportToCSV = () => {
    let csv = 'Top Opportunities\n';
    csv += 'Name,Company,Stage,Estimated Value,Probability,Rank Score\n';
    opportunities.forEach(opp => {
      csv += `"${opp.name}","${opp.company}","${opp.stage}",${opp.value},${opp.probability},${opp.score}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'kottravai_top_opportunities.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin h-8 w-8 border-b-2 border-[#8E2A8B] rounded-full"></div></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="flex overflow-x-auto gap-2 pb-2 md:pb-0 hide-scrollbar w-full md:w-auto">
          {['executive', 'revops', 'pipeline', 'forecast', 'trends', 'funnel', 'opportunities', 'performance'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap capitalize ${
                activeTab === tab ? 'bg-[#8E2A8B] text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {tab.replace('-', ' ')}
            </button>
          ))}
        </div>
        <div className="flex gap-2 w-full md:w-auto justify-end">
          <button onClick={exportToCSV} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold rounded-lg flex items-center gap-2 transition">
            <FileText size={16} /> Export CSV
          </button>
          <button onClick={exportToPDF} className="px-4 py-2 bg-[#2D1B4E] hover:bg-[#1a0f2e] text-white text-sm font-bold rounded-lg flex items-center gap-2 transition">
            <Download size={16} /> Export PDF
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'executive' && (
        <div className="space-y-6">
          {/* Metrics Ribbon */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm border-l-4 border-l-[#8E2A8B]">
              <div className="flex items-center justify-between"><h3 className="text-gray-500 font-bold text-xs uppercase">Pipeline Health Score</h3><Activity size={20} className="text-[#8E2A8B]" /></div>
              <p className="text-3xl font-black text-[#2D1B4E] mt-2">{healthScoreData?.score || 0}/100 ({healthScoreData?.status || 'N/A'})</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm border-l-4 border-l-[#a64ca3]">
              <div className="flex items-center justify-between"><h3 className="text-gray-500 font-bold text-xs uppercase">Total Pipeline</h3><DollarSign size={20} className="text-[#a64ca3]" /></div>
              <p className="text-3xl font-black text-[#2D1B4E] mt-2">{formatCurrency(dashboardData?.totalPipelineValue)}</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm border-l-4 border-l-[#bd6ebd]">
              <div className="flex items-center justify-between"><h3 className="text-gray-500 font-bold text-xs uppercase">Forecast (Quarter)</h3><TrendingUp size={20} className="text-[#bd6ebd]" /></div>
              <p className="text-3xl font-black text-[#2D1B4E] mt-2">{formatCurrency(forecastData?.forecastQuarterly)}</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm border-l-4 border-l-red-400">
              <div className="flex items-center justify-between"><h3 className="text-gray-500 font-bold text-xs uppercase">At-Risk Leads</h3><Target size={20} className="text-red-400" /></div>
              <p className="text-3xl font-black text-[#2D1B4E] mt-2">{healthScoreData?.metrics?.staleLeads || 0}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* AI Executive Insights & Narrative */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[#2D1B4E] font-black text-lg">AI Executive Insights</h3>
                  {insightsData?.aiGenerated && <span className="bg-green-50 text-green-700 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-green-200">AI Verified</span>}
                </div>
                <p className="text-gray-600 text-sm leading-relaxed">{insightsData?.summary}</p>
                
                {/* Opportunities & Risks Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 space-y-2">
                    <h4 className="font-bold text-[#8E2A8B] text-xs uppercase tracking-wider">Opportunity Areas</h4>
                    <ul className="space-y-2 text-xs text-gray-700">
                      {insightsData?.opportunities?.map((opp: any, idx: number) => (
                        <li key={idx}><strong>{opp.title}</strong>: {opp.description}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg border border-red-100 space-y-2">
                    <h4 className="font-bold text-red-600 text-xs uppercase tracking-wider">Identified Risks</h4>
                    <ul className="space-y-2 text-xs text-gray-700">
                      {insightsData?.risks?.map((risk: any, idx: number) => (
                        <li key={idx}><strong>{risk.title}</strong>: {risk.description} (Impact: <span className="font-bold">{risk.impact}</span>)</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Recommendations */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-4 space-y-2">
                  <h4 className="font-bold text-[#2D1B4E] text-xs uppercase tracking-wider">Actionable Recommendations</h4>
                  <ul className="list-disc pl-4 space-y-1 text-xs text-gray-600">
                    {insightsData?.recommendations?.map((rec: string, idx: number) => (
                      <li key={idx}>{rec}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Automated Executive Report Generator */}
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4">
                <h3 className="text-[#2D1B4E] font-black text-lg">Executive Report Control</h3>
                <p className="text-xs text-gray-500">Compile and send a formatted sales intelligence summary report directly to leadership.</p>
                
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">Report Interval</label>
                    <select 
                      value={reportType} 
                      onChange={(e) => setReportType(e.target.value as any)} 
                      className="w-full text-sm border border-gray-200 rounded-lg p-2 bg-white"
                    >
                      <option value="weekly">Weekly Report</option>
                      <option value="monthly">Monthly Report</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">Recipient Email</label>
                    <input 
                      type="email" 
                      value={emailRecipient} 
                      onChange={(e) => setEmailRecipient(e.target.value)}
                      placeholder="admin@kottravai.in" 
                      className="w-full text-sm border border-gray-200 rounded-lg p-2"
                    />
                  </div>

                  <button 
                    onClick={sendEmailReport} 
                    disabled={sendingEmail}
                    className="w-full py-2.5 bg-[#8E2A8B] hover:bg-[#7a2478] disabled:bg-[#d490d8] text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition shadow-sm mt-4"
                  >
                    <Send size={14} /> {sendingEmail ? 'Sending Report...' : 'Email Executive Report'}
                  </button>

                  {emailStatus === 'success' && (
                    <div className="bg-green-50 text-green-700 text-xs p-3 rounded-lg border border-green-200 flex items-center gap-2">
                      <CheckCircle2 size={16} /> Report emailed successfully to {emailRecipient}
                    </div>
                  )}

                  {emailStatus === 'error' && (
                    <div className="bg-red-50 text-red-700 text-xs p-3 rounded-lg border border-red-200 flex items-center gap-2">
                      <ShieldAlert size={16} /> Failed to send report. Please verify SMTP setup.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'pipeline' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Health Score Details */}
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4">
              <h3 className="text-[#2D1B4E] font-black text-lg">Health Score Breakdown</h3>
              <div className="flex flex-col justify-center items-center py-4">
                <div className="relative flex items-center justify-center">
                  <svg className="w-32 h-32 transform -rotate-90">
                    <circle cx="64" cy="64" r="54" stroke="#f0edf4" strokeWidth="8" fill="transparent" />
                    <circle 
                      cx="64" cy="64" r="54" stroke="#8E2A8B" strokeWidth="8" fill="transparent"
                      strokeDasharray={2 * Math.PI * 54}
                      strokeDashoffset={2 * Math.PI * 54 * (1 - (healthScoreData?.score || 0) / 100)} 
                    />
                  </svg>
                  <span className="absolute text-2xl font-black text-[#2D1B4E]">{healthScoreData?.score || 0}%</span>
                </div>
                <span className="text-sm font-black text-[#8E2A8B] mt-2 capitalize">{healthScoreData?.status || 'Good'}</span>
              </div>
              <div className="space-y-3">
                {healthScoreData?.factors && Object.entries(healthScoreData.factors).map(([key, val]: any) => (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-gray-500">
                      <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                      <span>{val}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className="bg-[#8E2A8B] h-1.5 rounded-full" style={{ width: `${val}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Team Leaderboard */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-[#2D1B4E] font-black text-lg">Team Performance Leaderboard</h3>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-gray-500">Demo Mode</label>
                  <button 
                    onClick={() => setDemoMode(!demoMode)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${demoMode ? 'bg-[#8E2A8B]' : 'bg-gray-200'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${demoMode ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-[10px] uppercase tracking-widest text-gray-400 font-black">
                      <th className="p-4">Representative</th>
                      <th className="p-4 text-center">Managed</th>
                      <th className="p-4 text-center">Emails</th>
                      <th className="p-4 text-center">WhatsApp</th>
                      <th className="p-4 text-center">Calls</th>
                      <th className="p-4 text-center">Wins</th>
                      <th className="p-4 text-right">Revenue Closed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {leaderboard.length > 0 ? (
                      leaderboard.map((rep, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 transition">
                          <td className="p-4 font-bold text-[#2D1B4E] text-sm">{rep.rep_name}</td>
                          <td className="p-4 text-center text-sm text-gray-600 font-medium">{rep.leads_managed}</td>
                          <td className="p-4 text-center text-sm text-gray-600 font-medium">{rep.emails_sent}</td>
                          <td className="p-4 text-center text-sm text-gray-600 font-medium">{rep.whatsapp_sent}</td>
                          <td className="p-4 text-center text-sm text-gray-600 font-medium">{rep.calls_logged}</td>
                          <td className="p-4 text-center">
                            <span className="px-2 py-0.5 bg-green-50 text-green-700 text-xs font-bold rounded-full">{rep.opportunities_won}</span>
                          </td>
                          <td className="p-4 text-right text-[#8E2A8B] font-bold text-sm">{formatCurrency(rep.revenue_closed)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-gray-400 text-sm">
                          No representative activity data available yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm h-[400px]">
              <h3 className="text-[#2D1B4E] font-black text-lg mb-4">Leads by Stage</h3>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboardData?.leadsByStage || []} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" />
                  <YAxis dataKey="sales_stage" type="category" width={100} tick={{ fontSize: 12 }} />
                  <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="count" fill="#8E2A8B" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm h-[400px]">
              <h3 className="text-[#2D1B4E] font-black text-lg mb-4">Leads by Quality</h3>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={dashboardData?.leadsByQuality || []} dataKey="count" nameKey="quality" cx="50%" cy="50%" outerRadius={120} label>
                    {(dashboardData?.leadsByQuality || []).map((_entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'forecast' && (
        <div className="space-y-6">
          {/* Forecast Accuracy Tracker */}
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-[#2D1B4E] font-black text-lg">Forecast Accuracy Tracker (90 Days)</h3>
              <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                forecastAccuracy?.confidence === 'High' ? 'bg-green-50 text-green-700 border border-green-200' :
                forecastAccuracy?.confidence === 'Medium' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {forecastAccuracy?.confidence || 'Low'} Confidence
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-2">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <span className="text-gray-400 font-bold text-[10px] uppercase">Weighted Forecasted</span>
                <p className="text-xl font-black text-[#2D1B4E] mt-1">{formatCurrency(forecastAccuracy?.forecastRevenue)}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <span className="text-gray-400 font-bold text-[10px] uppercase">Actual Closed Won</span>
                <p className="text-xl font-black text-[#2D1B4E] mt-1">{formatCurrency(forecastAccuracy?.actualRevenue)}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <span className="text-gray-400 font-bold text-[10px] uppercase">Variance</span>
                <p className={`text-xl font-black mt-1 ${forecastAccuracy?.variance >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {forecastAccuracy?.variance >= 0 ? '+' : ''}{formatCurrency(forecastAccuracy?.variance)}
                </p>
              </div>
              <div className="bg-[#2D1B4E] text-white p-4 rounded-lg">
                <span className="text-gray-300 font-bold text-[10px] uppercase">Forecast Accuracy</span>
                <p className="text-xl font-black mt-1">{forecastAccuracy?.accuracy || 0}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm h-[400px]">
            <h3 className="text-[#2D1B4E] font-black text-lg mb-4">Revenue Forecast Projection</h3>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={[
                { name: '30 Days', value: forecastData?.forecast30Days },
                { name: '90 Days', value: forecastData?.forecast90Days },
                { name: 'Quarter', value: forecastData?.forecastQuarterly },
                { name: 'Yearly', value: forecastData?.forecastAnnual }
              ]} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <RechartsTooltip formatter={(value) => formatCurrency(value)} />
                <Area type="monotone" dataKey="value" fill="#fdf4fc" stroke="#8E2A8B" />
                <Bar dataKey="value" barSize={40} fill="#a64ca3" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === 'trends' && (
        <div className="space-y-6">
          {/* Trends Period Selector */}
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
            <h3 className="text-[#2D1B4E] font-black text-lg">Sales Trend Analytics</h3>
            <div className="flex gap-2">
              {['30d', '90d', '12m'].map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period as any)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                    selectedPeriod === period ? 'bg-[#8E2A8B] text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {period === '30d' ? '30 Days' : period === '90d' ? '90 Days' : '12 Months'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm h-[380px]">
              <h4 className="text-[#2D1B4E] font-bold text-sm mb-4">Leads Generation (Created vs Qualified)</h4>
              <ResponsiveContainer width="100%" height="90%">
                <BarChart data={trendsData?.[selectedPeriod] || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date_label" tick={{ fontSize: 10 }} />
                  <YAxis />
                  <RechartsTooltip />
                  <Legend />
                  <Bar dataKey="leads_created" name="Leads Created" fill="#8E2A8B" />
                  <Bar dataKey="leads_qualified" name="Qualified Leads" fill="#a64ca3" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm h-[380px]">
              <h4 className="text-[#2D1B4E] font-bold text-sm mb-4">Weighted Forecast Revenue Trend</h4>
              <ResponsiveContainer width="100%" height="90%">
                <AreaChart data={trendsData?.[selectedPeriod] || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date_label" tick={{ fontSize: 10 }} />
                  <YAxis tickFormatter={(val) => `₹${val}`} />
                  <RechartsTooltip formatter={(val) => formatCurrency(val)} />
                  <Area type="monotone" dataKey="forecast_revenue" name="Expected Revenue" fill="#fdf4fc" stroke="#8E2A8B" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-100 shadow-sm h-[380px]">
              <h4 className="text-[#2D1B4E] font-bold text-sm mb-4">Sales Team Activity Engagement</h4>
              <ResponsiveContainer width="100%" height="90%">
                <LineChart data={trendsData?.[selectedPeriod] || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date_label" tick={{ fontSize: 10 }} />
                  <YAxis />
                  <RechartsTooltip />
                  <Line type="monotone" dataKey="activity_count" name="Communications Logged" stroke="#8E2A8B" strokeWidth={2} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'funnel' && (
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <h3 className="text-[#2D1B4E] font-black text-lg mb-6">Sales Funnel Conversion</h3>
          <div className="space-y-4 max-w-3xl mx-auto">
            {funnelData.map((step, idx) => (
              <div key={step.stage} className="relative">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200" style={{ width: `${Math.max(30, 100 - (idx * 12))}%`, margin: '0 auto' }}>
                  <div>
                    <h4 className="font-bold text-[#2D1B4E]">{step.stage}</h4>
                    <p className="text-xs text-gray-500">{step.count} Leads</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-[#8E2A8B]">{step.conversion}%</p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest">Conversion</p>
                  </div>
                </div>
                {idx < funnelData.length - 1 && (
                  <div className="h-6 flex justify-center items-center relative z-10 -my-1">
                     <div className="bg-white px-2 py-0.5 rounded-full border border-gray-200 text-[10px] font-bold text-red-500 shadow-sm">
                       -{funnelData[idx+1].dropOff}% Drop
                     </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'opportunities' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-[#2D1B4E] font-black text-lg">Top Opportunities Ranked</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-[10px] uppercase tracking-widest text-gray-400 font-black">
                  <th className="p-4">Lead Name</th>
                  <th className="p-4">Company</th>
                  <th className="p-4">Stage</th>
                  <th className="p-4">Deal Value</th>
                  <th className="p-4">Probability</th>
                  <th className="p-4">Rank Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {opportunities.map(opp => (
                  <tr key={opp.id} className="hover:bg-gray-50 transition">
                    <td className="p-4 font-bold text-[#2D1B4E] text-sm">{opp.name}</td>
                    <td className="p-4 text-gray-600 text-sm">{opp.company || '-'}</td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-purple-50 text-purple-700 text-xs font-bold rounded-full">{opp.stage}</span>
                    </td>
                    <td className="p-4 text-[#8E2A8B] font-bold text-sm">{formatCurrency(opp.value)}</td>
                    <td className="p-4">
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div className="bg-[#8E2A8B] h-2.5 rounded-full" style={{ width: `${opp.probability || 0}%` }}></div>
                      </div>
                    </td>
                    <td className="p-4 text-gray-500 font-medium text-sm">{opp.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'performance' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-4"><Users className="text-[#8E2A8B]" /><h3 className="font-bold text-[#2D1B4E]">Lead Activity</h3></div>
            <div className="space-y-3">
              <div className="flex justify-between items-center"><span className="text-gray-500 text-sm">Leads Created</span><span className="font-black text-lg">{performanceData?.leadsCreated || 0}</span></div>
              <div className="flex justify-between items-center"><span className="text-gray-500 text-sm">Opportunities Won</span><span className="font-black text-lg text-green-600">{performanceData?.opportunitiesWon || 0}</span></div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-4"><Activity className="text-[#8E2A8B]" /><h3 className="font-bold text-[#2D1B4E]">Communication Log</h3></div>
            <div className="space-y-3">
              <div className="flex justify-between items-center"><span className="text-gray-500 text-sm">Emails Sent</span><span className="font-black text-lg">{performanceData?.emailsSent || 0}</span></div>
              <div className="flex justify-between items-center"><span className="text-gray-500 text-sm">WhatsApp Sent</span><span className="font-black text-lg">{performanceData?.whatsappSent || 0}</span></div>
              <div className="flex justify-between items-center"><span className="text-gray-500 text-sm">Calls Logged</span><span className="font-black text-lg">{performanceData?.callsLogged || 0}</span></div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm bg-[#2D1B4E] text-white">
            <div className="flex items-center gap-3 mb-4"><TrendingUp className="text-white" /><h3 className="font-bold text-white">Efficiency</h3></div>
            <div className="space-y-3">
              <div className="flex justify-between items-center"><span className="text-gray-300 text-sm">Follow-ups Completed</span><span className="font-black text-lg">{performanceData?.followUpsCompleted || 0}</span></div>
              <div className="flex justify-between items-center"><span className="text-gray-300 text-sm">Avg Response Time</span><span className="font-black text-lg">{performanceData?.averageResponseTime || '-'}</span></div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'revops' && (
        <div className="space-y-6 animate-fade-in">
          {/* Revenue Operations Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm border-l-4 border-l-[#8E2A8B]">
              <div className="flex items-center justify-between">
                <h3 className="text-gray-500 font-bold text-xs uppercase">Avg Days in Stage</h3>
                <Clock size={20} className="text-[#8E2A8B]" />
              </div>
              <p className="text-3xl font-black text-[#2D1B4E] mt-2">
                {velocityData ? (velocityData.stageAverages.reduce((acc: number, val: any) => acc + (val.avgDays || 0), 0) / velocityData.stageAverages.length).toFixed(1) : '0.0'} Days
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm border-l-4 border-l-red-500">
              <div className="flex items-center justify-between">
                <h3 className="text-gray-500 font-bold text-xs uppercase">SLA Violations</h3>
                <AlertTriangle size={20} className="text-red-500" />
              </div>
              <p className="text-3xl font-black text-[#2D1B4E] mt-2">
                {escalationsData?.slaViolations?.length || 0} Leads
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm border-l-4 border-l-yellow-500">
              <div className="flex items-center justify-between">
                <h3 className="text-gray-500 font-bold text-xs uppercase">Missed Follow-Ups</h3>
                <Target size={20} className="text-yellow-500" />
              </div>
              <p className="text-3xl font-black text-[#2D1B4E] mt-2">
                {escalationsData?.missedFollowUps?.length || 0} Leads
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm border-l-4 border-l-green-500">
              <div className="flex items-center justify-between">
                <h3 className="text-gray-500 font-bold text-xs uppercase">Forecast Accuracy</h3>
                <TrendingUp size={20} className="text-green-500" />
              </div>
              <p className="text-3xl font-black text-[#2D1B4E] mt-2">
                {forecastAccuracy?.accuracy || 0}%
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Section (2/3) - Velocity and Accuracy Trends */}
            <div className="lg:col-span-2 space-y-6">
              {/* Pipeline Velocity Chart */}
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-[#2D1B4E] font-black text-lg">Pipeline Velocity Report</h3>
                  <span className="text-xs text-gray-400 font-medium">Average days spent in each stage before exit</span>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={velocityData?.stageAverages || []} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                      <XAxis dataKey="stage" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} label={{ value: 'Days', angle: -90, position: 'insideLeft', style: { fill: '#9CA3AF', fontSize: 11 } }} />
                      <RechartsTooltip cursor={{ fill: '#fcf4fc', opacity: 0.5 }} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
                      <Bar dataKey="avgDays" fill="#8E2A8B" radius={[4, 4, 0, 0]} maxBarSize={40}>
                        {velocityData?.stageAverages?.map((_entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Milestone conversion speeds */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
                  <div className="bg-gray-50 p-3 rounded-lg text-center">
                    <span className="text-[10px] uppercase font-bold text-gray-400">Time to Qualify</span>
                    <p className="text-lg font-black text-[#2D1B4E] mt-1">{velocityData?.milestones?.time_to_qualification || '0.0'}d</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg text-center">
                    <span className="text-[10px] uppercase font-bold text-gray-400">Time to Proposal</span>
                    <p className="text-lg font-black text-[#2D1B4E] mt-1">{velocityData?.milestones?.time_to_proposal || '0.0'}d</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg text-center">
                    <span className="text-[10px] uppercase font-bold text-gray-400">Time to Negotiate</span>
                    <p className="text-lg font-black text-[#2D1B4E] mt-1">{velocityData?.milestones?.time_to_negotiation || '0.0'}d</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg text-center">
                    <span className="text-[10px] uppercase font-bold text-gray-400">Time to Close</span>
                    <p className="text-lg font-black text-[#2D1B4E] mt-1">{velocityData?.milestones?.time_to_close || '0.0'}d</p>
                  </div>
                </div>
              </div>

              {/* Forecast Accuracy Widget & Trend Line */}
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-[#2D1B4E] font-black text-lg">Forecast Accuracy & Confidence Trend</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 font-bold">Confidence:</span>
                    <span className={`px-2.5 py-0.5 text-xs font-extrabold rounded-full ${
                      forecastAccuracy?.confidence === 'High' ? 'bg-green-50 text-green-700 border border-green-200' :
                      forecastAccuracy?.confidence === 'Medium' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
                      'bg-red-50 text-red-700 border border-red-200'
                    }`}>{forecastAccuracy?.confidence || 'Low'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <span className="text-xs text-gray-400 font-bold">Weighted Forecast (90d)</span>
                    <p className="text-xl font-black text-gray-700 mt-1">{formatCurrency(forecastAccuracy?.forecastRevenue)}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <span className="text-xs text-gray-400 font-bold">Actual Revenue Won (90d)</span>
                    <p className="text-xl font-black text-green-600 mt-1">{formatCurrency(forecastAccuracy?.actualRevenue)}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <span className="text-xs text-gray-400 font-bold">Revenue Variance</span>
                    <p className={`text-xl font-black mt-1 ${forecastAccuracy?.variance >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {formatCurrency(forecastAccuracy?.variance)} ({forecastAccuracy?.variancePercent || 0}%)
                    </p>
                  </div>
                </div>

                <div className="h-64 pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={forecastAccuracy?.trend || []} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                      <XAxis dataKey="month" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <RechartsTooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
                      <Legend verticalAlign="top" height={36} iconType="circle" />
                      <Line type="monotone" dataKey="forecast" name="Forecasted (₹)" stroke="#8E2A8B" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="actual" name="Actual Won (₹)" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Right Section (1/3) - SLA Violations and AI Prediction Simulator */}
            <div className="space-y-6">
              {/* SLA Violations Widget */}
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-[#2D1B4E] font-black text-lg">SLA Overdue Queue</h3>
                  <button 
                    onClick={handleRunSlaSweep}
                    disabled={runningSlaCheck}
                    className="p-1.5 bg-gray-50 hover:bg-gray-100 rounded-lg text-gray-500 disabled:opacity-50 transition"
                    title="Trigger SLA Check sweep"
                  >
                    <Play size={14} className={runningSlaCheck ? 'animate-spin' : ''} />
                  </button>
                </div>

                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                  {escalationsData?.slaViolations && escalationsData.slaViolations.length > 0 ? (
                    escalationsData.slaViolations.map((lead: any) => (
                      <div key={lead.id} className="p-3 bg-red-50 rounded-lg border border-red-100 flex justify-between items-center text-xs">
                        <div className="space-y-0.5">
                          <p className="font-bold text-gray-800">{lead.name}</p>
                          <p className="text-[10px] text-gray-400">{lead.company} &bull; <span className="font-bold text-[#8E2A8B]">{lead.sales_stage}</span></p>
                        </div>
                        <span className="bg-red-100 text-red-700 text-[10px] font-extrabold px-2 py-0.5 rounded">
                          +{lead.stage_duration_days || 0}d Over
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-gray-400 text-xs font-medium">
                      No active SLA violations detected. All leads on track!
                    </div>
                  )}
                </div>
              </div>

              {/* AI Deal Value Prediction Panel */}
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                  <Brain size={20} className="text-[#8E2A8B]" />
                  <h3 className="text-[#2D1B4E] font-black text-lg">AI Deal Value Predictor</h3>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Predict target deal value based on lead signals (Location, Org Type, Scores).
                </p>

                <div className="space-y-3 text-xs pt-1">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-gray-500 font-bold block mb-1">Org Type</label>
                      <select 
                        value={predictionInput.org_type}
                        onChange={(e) => setPredictionInput({ ...predictionInput, org_type: e.target.value })}
                        className="w-full border border-gray-200 rounded p-1.5 bg-white"
                      >
                        <option value="Enterprise">Enterprise</option>
                        <option value="Mid-Market">Mid-Market</option>
                        <option value="Startup">Startup</option>
                        <option value="SMB">SMB</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-gray-500 font-bold block mb-1">Industry</label>
                      <select 
                        value={predictionInput.industry}
                        onChange={(e) => setPredictionInput({ ...predictionInput, industry: e.target.value })}
                        className="w-full border border-gray-200 rounded p-1.5 bg-white"
                      >
                        <option value="Software">Software</option>
                        <option value="Finance">Finance</option>
                        <option value="Healthcare">Healthcare</option>
                        <option value="Retail">Retail</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-gray-500 font-bold block mb-1">Location</label>
                      <input 
                        type="text" 
                        value={predictionInput.location}
                        onChange={(e) => setPredictionInput({ ...predictionInput, location: e.target.value })}
                        className="w-full border border-gray-200 rounded p-1.5"
                      />
                    </div>
                    <div>
                      <label className="text-gray-500 font-bold block mb-1">Source</label>
                      <input 
                        type="text" 
                        value={predictionInput.source}
                        onChange={(e) => setPredictionInput({ ...predictionInput, source: e.target.value })}
                        className="w-full border border-gray-200 rounded p-1.5"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-gray-500 font-bold block mb-1">Lead Score</label>
                      <input 
                        type="number" 
                        value={predictionInput.lead_score}
                        onChange={(e) => setPredictionInput({ ...predictionInput, lead_score: Number(e.target.value) })}
                        className="w-full border border-gray-200 rounded p-1.5"
                      />
                    </div>
                    <div>
                      <label className="text-gray-500 font-bold block mb-1">Intent Score</label>
                      <input 
                        type="number" 
                        value={predictionInput.intent_score}
                        onChange={(e) => setPredictionInput({ ...predictionInput, intent_score: Number(e.target.value) })}
                        className="w-full border border-gray-200 rounded p-1.5"
                      />
                    </div>
                    <div>
                      <label className="text-gray-500 font-bold block mb-1">Activities</label>
                      <input 
                        type="number" 
                        value={predictionInput.comm_activity_count}
                        onChange={(e) => setPredictionInput({ ...predictionInput, comm_activity_count: Number(e.target.value) })}
                        className="w-full border border-gray-200 rounded p-1.5"
                      />
                    </div>
                  </div>

                  <button 
                    onClick={handlePredictDealValue}
                    disabled={loadingPredict}
                    className="w-full py-2 bg-[#8E2A8B] hover:bg-[#72216e] text-white font-bold rounded shadow transition disabled:opacity-50 mt-2 flex justify-center items-center gap-2"
                  >
                    <Brain size={14} /> {loadingPredict ? 'Predicting...' : 'Predict Deal Value'}
                  </button>
                </div>

                {predictedValue && (
                  <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-100 space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] uppercase font-bold text-[#8E2A8B]">Suggested Value</span>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                        predictedValue.confidence === 'High' ? 'bg-green-100 text-green-800' :
                        predictedValue.confidence === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>{predictedValue.confidence} Confidence</span>
                    </div>
                    <p className="text-xl font-black text-[#2D1B4E]">{formatCurrency(predictedValue.estimatedDealValue)}</p>
                    <p className="text-[10px] text-gray-600 leading-relaxed italic">{predictedValue.reasoning}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
