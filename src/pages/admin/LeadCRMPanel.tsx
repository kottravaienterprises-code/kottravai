import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Clock, User, Calendar, MessageSquare, Send, Activity, List, Check } from 'lucide-react';
import { API_BASE } from "@/config/api";
import { LeadCRMPanelProps, LeadActivity, SalesRepresentative } from "@/types/crm";

export default function LeadCRMPanel({ lead, onUpdate }: LeadCRMPanelProps) {
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [assignedTo, setAssignedTo] = useState(lead.assigned_to || "");
  const [nextAction, setNextAction] = useState(lead.next_action || "");
  const [nextFollowup, setNextFollowup] = useState(lead.next_followup_at ? new Date(lead.next_followup_at).toISOString().split('T')[0] : "");
  const [status, setStatus] = useState(lead.status || "new");
  const [salesStage, setSalesStage] = useState(lead.sales_stage || "New Lead");
  const [estimatedDealValue, setEstimatedDealValue] = useState(lead.estimated_deal_value || "");
  const [conversionProbability, setConversionProbability] = useState(lead.conversion_probability || "");
  const [salesReps, setSalesReps] = useState<SalesRepresentative[]>([]);
  const [activeTab, setActiveTab] = useState<'timeline' | 'communications'>('timeline');

  const adminSecret = sessionStorage.getItem("kottravai_admin_token") || "";
  const headers = { "X-Admin-Secret": adminSecret };

  const fetchSalesReps = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/admin/sales-reps`, { headers });
      if (res.data.success) setSalesReps(res.data.salesReps || []);
    } catch (err) {
      console.error("Failed to fetch sales reps", err);
    }
  };

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/api/admin/leads/${lead.id}/activities`, { headers });
      if (res.data.success) {
        setActivities(res.data.activities || []);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load timeline");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
    fetchSalesReps();
  }, [lead.id]);

  const saveUpdates = async () => {
    try {
      const payload = {
        status,
        sales_stage: salesStage,
        estimated_deal_value: estimatedDealValue ? parseFloat(String(estimatedDealValue)) : 0,
        conversion_probability: conversionProbability ? parseInt(String(conversionProbability), 10) : 0,
        assigned_to: assignedTo,
        next_action: nextAction,
        next_followup_at: nextFollowup || null
      };
      const res = await axios.patch(`${API_BASE}/api/admin/leads/${lead.id}`, payload, { headers });
      if (res.data.success) {
        toast.success("Lead CRM details updated");
        onUpdate();
        fetchActivities(); // Refresh to potentially show new events if backend added them
      }
    } catch (err) {
      toast.error("Failed to update lead details");
    }
  };

  const addNote = async () => {
    if (!newNote.trim()) return;
    try {
      const res = await axios.post(`${API_BASE}/api/admin/leads/${lead.id}/activities`, {
        activity_type: "Note Added",
        activity_description: newNote
      }, { headers });
      if (res.data.success) {
        toast.success("Note added");
        setNewNote("");
        fetchActivities();
      }
    } catch (err) {
      toast.error("Failed to add note");
    }
  };

  const isOverdue = nextFollowup && new Date(nextFollowup) < new Date(new Date().setHours(0,0,0,0));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6 border-t border-gray-100 pt-6">
      {/* LEFT COL: CRM CONTROLS */}
      <div className="space-y-4">
        <h4 className="text-xs font-black text-[#2D1B4E] uppercase tracking-widest flex items-center gap-2 mb-4">
          <User size={14} /> CRM Controls
        </h4>
        
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-4">
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Status</label>
            <select 
              value={status} 
              onChange={e => setStatus(e.target.value as any)}
              className="w-full text-sm font-medium bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#8E2A8B]"
            >
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="proposal_sent">Proposal Sent</option>
              <option value="negotiation">Negotiation</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Assigned To</label>
            <select 
              value={assignedTo} 
              onChange={e => setAssignedTo(e.target.value)}
              className="w-full text-sm font-medium bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#8E2A8B]"
            >
              <option value="">Unassigned</option>
              {salesReps.map(rep => (
                <option key={rep.id} value={rep.id}>{rep.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Sales Stage</label>
            <select 
              value={salesStage} 
              onChange={e => setSalesStage(e.target.value)}
              className="w-full text-sm font-medium bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#8E2A8B]"
            >
              <option value="New Lead">New Lead</option>
              <option value="Qualified">Qualified</option>
              <option value="Contacted">Contacted</option>
              <option value="Proposal Sent">Proposal Sent</option>
              <option value="Negotiation">Negotiation</option>
              <option value="Closed Won">Closed Won</option>
              <option value="Closed Lost">Closed Lost</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Estimated Value (₹)</label>
              <input 
                type="number"
                placeholder="AI Suggests: ₹50,000"
                value={estimatedDealValue}
                onChange={e => setEstimatedDealValue(e.target.value)}
                className="w-full text-sm font-medium bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#8E2A8B]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Probability (%)</label>
              <input 
                type="number"
                placeholder="AI Suggests: 40%"
                value={conversionProbability}
                onChange={e => setConversionProbability(e.target.value)}
                className="w-full text-sm font-medium bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#8E2A8B]"
                min="0"
                max="100"
              />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-4">
          <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
            <Calendar size={12} /> Follow-up Manager
          </h5>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-[10px] text-gray-500 mb-1">Next Follow-up Date</label>
              <input 
                type="date" 
                value={nextFollowup}
                onChange={e => setNextFollowup(e.target.value)}
                className={`w-full text-sm font-medium bg-gray-50 border rounded-lg px-3 py-2 outline-none ${isOverdue ? 'border-red-300 text-red-600 focus:border-red-500' : 'border-gray-200 focus:border-[#8E2A8B]'}`}
              />
              {isOverdue && <p className="text-[10px] text-red-500 mt-1 font-bold">Overdue!</p>}
            </div>
            <div className="flex-1">
              <label className="block text-[10px] text-gray-500 mb-1">Next Action</label>
              <input 
                type="text" 
                placeholder="e.g. Call to discuss pricing"
                value={nextAction}
                onChange={e => setNextAction(e.target.value)}
                className="w-full text-sm font-medium bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#8E2A8B]"
              />
            </div>
          </div>
          <button onClick={saveUpdates} className="w-full py-2 bg-[#2D1B4E] hover:bg-[#1a0f2e] text-white text-xs font-bold rounded-lg transition">
            Save CRM Details
          </button>
        </div>
      </div>

      {/* RIGHT COL: TIMELINE & NOTES */}
      <div className="space-y-4 flex flex-col h-full">
        <div className="flex items-center gap-4 border-b border-gray-200">
          <button 
            onClick={() => setActiveTab('timeline')}
            className={`text-xs font-black uppercase tracking-widest pb-2 flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'timeline' ? 'text-[#2D1B4E] border-[#8E2A8B]' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
          >
            <Clock size={14} /> Activity Timeline
          </button>
          <button 
            onClick={() => setActiveTab('communications')}
            className={`text-xs font-black uppercase tracking-widest pb-2 flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'communications' ? 'text-[#2D1B4E] border-[#8E2A8B]' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
          >
            <Send size={14} /> Communications
          </button>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto max-h-[300px] pr-2 space-y-4 mb-4">
            {loading ? (
              <div className="flex justify-center p-4"><div className="animate-spin h-5 w-5 border-b-2 border-[#8E2A8B] rounded-full"></div></div>
            ) : activities.length === 0 ? (
              <p className="text-xs text-gray-400 italic text-center p-4">No activities found.</p>
            ) : activeTab === 'timeline' ? (
              activities.map((act) => (
                <div key={act.id} className="flex gap-3 text-sm">
                  <div className="mt-1">
                    {act.activity_type.toLowerCase().includes('note') ? (
                      <div className="bg-blue-100 p-1.5 rounded-full text-blue-600"><MessageSquare size={12}/></div>
                    ) : act.activity_type.toLowerCase().includes('status') ? (
                      <div className="bg-purple-100 p-1.5 rounded-full text-purple-600"><Activity size={12}/></div>
                    ) : (
                      <div className="bg-gray-100 p-1.5 rounded-full text-gray-600"><List size={12}/></div>
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-gray-800 text-xs">{act.activity_type} <span className="text-gray-400 font-normal">by {act.performed_by || 'System'}</span></p>
                    {act.activity_description && <p className="text-gray-600 text-xs mt-0.5">{act.activity_description}</p>}
                    <p className="text-[9px] text-gray-400 mt-1">{new Date(act.created_at).toLocaleString('en-IN')}</p>
                  </div>
                </div>
              ))
            ) : (
              // Communications Tab
              activities
                .filter(act => ['Email Sent', 'Email Failed', 'WhatsApp Sent', 'WhatsApp Failed', 'WhatsApp Manual Send Opened', 'Call Initiated', 'Call Completed'].includes(act.activity_type))
                .map((act) => (
                  <div key={act.id} className="flex gap-3 text-sm bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <div className="mt-1">
                      {act.activity_type.includes('Email') ? (
                        <div className="bg-blue-100 p-1.5 rounded-full text-blue-600"><Send size={12}/></div>
                      ) : act.activity_type.includes('WhatsApp') ? (
                        <div className="bg-emerald-100 p-1.5 rounded-full text-emerald-600"><MessageSquare size={12}/></div>
                      ) : (
                        <div className="bg-purple-100 p-1.5 rounded-full text-purple-600"><Activity size={12}/></div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <p className="font-bold text-gray-800 text-xs">{act.activity_type}</p>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          act.activity_type.includes('Failed') ? 'bg-red-100 text-red-600' :
                          act.activity_type.includes('Manual') ? 'bg-orange-100 text-orange-600' :
                          'bg-emerald-100 text-emerald-600'
                        }`}>
                          {act.metadata?.status || (act.activity_type.includes('Failed') ? 'Error' : 'Success')}
                        </span>
                      </div>
                      <p className="text-gray-600 text-xs mt-1 line-clamp-2">{act.activity_description}</p>
                      
                      {act.metadata && Object.keys(act.metadata).length > 0 && (
                        <div className="mt-2 grid grid-cols-2 gap-1 text-[10px] text-gray-500 bg-white p-2 rounded border border-gray-100">
                          {act.metadata.recipient && <div><span className="font-bold">To:</span> {act.metadata.recipient}</div>}
                          {act.metadata.phone && <div><span className="font-bold">To:</span> {act.metadata.phone}</div>}
                          {act.metadata.outcome && <div><span className="font-bold">Outcome:</span> {act.metadata.outcome}</div>}
                          {act.metadata.duration && <div><span className="font-bold">Duration:</span> {act.metadata.duration}</div>}
                        </div>
                      )}
                      
                      <p className="text-[9px] text-gray-400 mt-2">{new Date(act.created_at).toLocaleString('en-IN')} by {act.performed_by}</p>
                    </div>
                  </div>
                ))
            )}

            {activeTab === 'timeline' && (
              <div className="flex gap-3 text-sm opacity-60">
                <div className="mt-1">
                  <div className="bg-emerald-100 p-1.5 rounded-full text-emerald-600"><Check size={12}/></div>
                </div>
                <div>
                  <p className="font-bold text-gray-800 text-xs">Lead Captured</p>
                  <p className="text-[9px] text-gray-400 mt-1">{new Date(lead.created_at).toLocaleString('en-IN')}</p>
                </div>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-gray-100">
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Add an internal note..." 
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addNote()}
                className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-400"
              />
              <button 
                onClick={addNote}
                disabled={!newNote.trim()}
                className="bg-blue-50 text-blue-600 hover:bg-blue-100 p-2 rounded-lg transition disabled:opacity-50"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
