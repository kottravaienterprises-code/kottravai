import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import {
  Activity, Settings, CheckSquare, Zap,
  ChevronRight, PlayCircle, Bot
} from "lucide-react";

export default function WorkflowCommandCenter({ API_BASE }: { API_BASE: string }) {
  const [activeTab, setActiveTab] = useState<"monitor" | "workflows" | "approvals" | "ai" | "templates">("monitor");
  const [loading, setLoading] = useState(false);

  const [events, setEvents] = useState<any[]>([]);
  const [executions, setExecutions] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [aiTraces, setAiTraces] = useState<any[]>([]);
  const [playbooks, setPlaybooks] = useState<any[]>([]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const token = sessionStorage.getItem("kottravai_admin_token") || "";
    const headers = { "x-admin-secret": token };
    try {
      const [evt, exc, app, ai, plb] = await Promise.all([
        axios.get(`${API_BASE}/api/admin/workflows/events`, { headers }).catch(() => ({ data: { data: [] } })),
        axios.get(`${API_BASE}/api/admin/workflows/executions`, { headers }).catch(() => ({ data: { data: [] } })),
        axios.get(`${API_BASE}/api/admin/workflows/approvals`, { headers }).catch(() => ({ data: { data: [] } })),
        axios.get(`${API_BASE}/api/admin/workflows/ai-traces`, { headers }).catch(() => ({ data: { data: [] } })),
        axios.get(`${API_BASE}/api/admin/workflows/playbooks`, { headers }).catch(() => ({ data: { data: [] } }))
      ]);
      setEvents(evt.data.data || []);
      setExecutions(exc.data.data || []);
      setApprovals(app.data.data || []);
      setAiTraces(ai.data.data || []);
      setPlaybooks(plb.data.data || []);
    } catch (err) {
      toast.error("Failed to load workflow data");
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleApprove = async (id: string, status: "Approved" | "Rejected") => {
    try {
      const token = sessionStorage.getItem("kottravai_admin_token") || "";
      await axios.post(`${API_BASE}/api/admin/workflows/approvals/${id}`, { status, comments: "Handled via Command Center" }, { headers: { "x-admin-secret": token } });
      toast.success(`Successfully ${status.toLowerCase()}`);
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Approval failed");
    }
  };

  const executePlaybook = async (id: string) => {
    try {
      const token = sessionStorage.getItem("kottravai_admin_token") || "";
      await axios.post(`${API_BASE}/api/admin/workflows/playbooks/${id}/execute`, { context: { source: "Manual Trigger" } }, { headers: { "x-admin-secret": token } });
      toast.success("Playbook started");
      setActiveTab("workflows");
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Execution failed");
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Completed': case 'Approved': return 'bg-emerald-100 text-emerald-700';
      case 'Failed': case 'Rejected': return 'bg-red-100 text-red-700';
      case 'Running': case 'In Progress': return 'bg-blue-100 text-blue-700';
      case 'Waiting Approval': case 'Pending': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-[#2D1B4E]">Workflow & AI Operations</h2>
          <p className="text-sm text-gray-500">Enterprise orchestration, event bus, and AI automation</p>
        </div>
        <button onClick={fetchAll} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-bold flex items-center gap-2">
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        {[
          { id: "monitor", label: "Event Bus Monitor", icon: Activity },
          { id: "workflows", label: "Active Executions", icon: Zap },
          { id: "approvals", label: "Approval Queue", icon: CheckSquare },
          { id: "ai", label: "AI Operations", icon: Bot },
          { id: "templates", label: "Playbook Templates", icon: Settings }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === tab.id ? "border-[#8E2A8B] text-[#8E2A8B]" : "border-transparent text-gray-500 hover:text-gray-700"}`}
          >
            <tab.icon size={16} /> {tab.label}
            {tab.id === "approvals" && approvals.filter(a => a.status === 'Pending').length > 0 && (
              <span className="bg-orange-100 text-orange-700 text-[10px] px-2 py-0.5 rounded-full ml-1">
                {approvals.filter(a => a.status === 'Pending').length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm min-h-[400px]">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8E2A8B]"></div>
          </div>
        ) : (
          <div className="p-6">
            {activeTab === "monitor" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold">Live Event Firehose</h3>
                  <div className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full animate-pulse">Monitoring Active</div>
                </div>
                {events.length === 0 ? <p className="text-gray-400 text-sm">No events recorded.</p> : events.map(evt => (
                  <div key={evt.id} className="flex items-start gap-4 p-4 border border-gray-100 rounded-xl hover:bg-gray-50">
                    <div className="mt-1"><Activity size={18} className="text-blue-500" /></div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-sm">{evt.event_type}</span>
                        <span className="text-[10px] px-2 py-0.5 bg-gray-100 rounded text-gray-600">{evt.category}</span>
                      </div>
                      <p className="text-xs text-gray-500">Source: {evt.source} | Actor: {evt.actor}</p>
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(evt.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "workflows" && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold mb-4">Workflow Executions</h3>
                {executions.length === 0 ? <p className="text-gray-400 text-sm">No active executions.</p> : executions.map(exc => (
                  <div key={exc.id} className="border border-gray-100 rounded-xl p-5 mb-4">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h4 className="font-bold text-[#2D1B4E]">{exc.playbook_name || "Unknown Playbook"}</h4>
                        <p className="text-xs text-gray-500">ID: {exc.id}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(exc.status)}`}>{exc.status}</span>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Execution Trace</p>
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {exc.tasks?.map((t: any, i: number) => (
                          <div key={t.id} className="flex items-center gap-2">
                            <div className={`text-xs px-3 py-1.5 rounded-lg border flex flex-col min-w-[120px] ${t.status === 'Completed' ? 'bg-emerald-50 border-emerald-100' : t.status === 'In Progress' ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-100'}`}>
                              <span className="font-bold">{t.title}</span>
                              <span className="text-[10px] text-gray-500">{t.status}</span>
                            </div>
                            {i < exc.tasks.length - 1 && <ChevronRight size={14} className="text-gray-300" />}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "approvals" && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold mb-4">Executive Approvals Queue</h3>
                {approvals.length === 0 ? <p className="text-gray-400 text-sm">No pending approvals.</p> : approvals.map(app => (
                  <div key={app.id} className="flex items-center justify-between p-5 border border-gray-100 rounded-xl">
                    <div>
                      <h4 className="font-bold text-sm">{app.playbook_name}</h4>
                      <p className="text-xs text-gray-600 mt-1">Task: {app.task_title}</p>
                      <div className="flex gap-3 mt-2 text-[10px]">
                        <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded font-bold">Required: {app.approver_role}</span>
                        <span className="text-gray-500">Requested: {new Date(app.requested_at).toLocaleString()}</span>
                      </div>
                    </div>
                    {app.status === 'Pending' ? (
                      <div className="flex gap-2">
                        <button onClick={() => handleApprove(app.id, "Rejected")} className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded text-xs font-bold transition">Reject</button>
                        <button onClick={() => handleApprove(app.id, "Approved")} className="px-3 py-1.5 bg-emerald-500 text-white hover:bg-emerald-600 rounded text-xs font-bold transition">Approve</button>
                      </div>
                    ) : (
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(app.status)}`}>{app.status}</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {activeTab === "ai" && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold mb-4">AI Agent Activity Trace</h3>
                {aiTraces.length === 0 ? <p className="text-gray-400 text-sm">No AI operations logged.</p> : aiTraces.map(trace => (
                  <div key={trace.id} className="p-4 border border-indigo-100 bg-indigo-50/30 rounded-xl flex gap-4">
                    <Bot className="text-indigo-500 mt-1" size={20} />
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-bold text-sm text-indigo-900">{trace.agent_name}</span>
                          <span className="text-xs text-indigo-600 ml-2">({trace.action_type})</span>
                        </div>
                        <span className="text-[10px] text-gray-400">{new Date(trace.created_at).toLocaleString()}</span>
                      </div>
                      <pre className="mt-2 text-[10px] bg-white p-3 rounded border border-indigo-100 overflow-x-auto text-gray-700">
                        {JSON.stringify(trace.output_result, null, 2)}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "templates" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {playbooks.map(pb => (
                  <div key={pb.id} className="p-5 border border-gray-200 rounded-xl hover:border-[#8E2A8B] transition group">
                    <h4 className="font-bold text-lg mb-1">{pb.name}</h4>
                    <p className="text-xs text-gray-500 mb-4 h-8 line-clamp-2">{pb.description}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold bg-gray-100 px-2 py-1 rounded">Trigger: {pb.trigger_event || 'Manual'}</span>
                      <button onClick={() => executePlaybook(pb.id)} className="opacity-0 group-hover:opacity-100 transition flex items-center gap-1 text-sm font-bold text-[#8E2A8B]">
                        <PlayCircle size={16} /> Run Now
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const RefreshCw = ({ size, className }: { size: number; className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
);
