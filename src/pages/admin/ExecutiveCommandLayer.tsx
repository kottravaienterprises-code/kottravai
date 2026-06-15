import React, { useState, useEffect, useRef } from "react";
import {
  Terminal,
  Send,
  ShieldAlert,
  Zap,
  CheckCircle,
  AlertTriangle,
  Bot,
  User,
  Activity,
  BarChart3,
  Globe
} from "lucide-react";
import axios from "axios";

interface AuditLog {
  id: string;
  prompt: string;
  parsed_intent: string;
  actions_triggered: any[];
  execution_outcome: string;
  created_at: string;
}

export const ExecutiveCommandLayer = () => {
  const [prompt, setPrompt] = useState("");
  const [chatHistory, setChatHistory] = useState<any[]>([
    {
      role: 'ai',
      text: 'Welcome to the Executive Command Layer. I am ready to analyze global churn risk, pipeline readiness, or execute operational overrides.'
    }
  ]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchHistory = async () => {
    try {
      const r = await axios.get("http://localhost:5000/api/admin/autonomous/command/history", {
        headers: { "x-admin-secret": "Admin!Kottravai2025%100" }
      });
      setAuditLogs(r.data.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const handleCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    const userText = prompt;
    setChatHistory(prev => [...prev, { role: 'user', text: userText }]);
    setPrompt("");
    setIsProcessing(true);

    try {
      const r = await axios.post("http://localhost:5000/api/admin/autonomous/command/execute", {
        prompt: userText
      }, {
        headers: { "x-admin-secret": "Admin!Kottravai2025%100" }
      });

      setChatHistory(prev => [...prev, { role: 'ai', text: r.data.data.response, intent: r.data.data.intent }]);
      fetchHistory();
    } catch (e: any) {
      setChatHistory(prev => [...prev, { role: 'ai', text: `Error: ${e.response?.data?.error || e.message}` }]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-6rem)] gap-6 p-6 font-sans bg-[#0f172a] text-slate-200">
      
      {/* LEFT PANEL: Conversational Interface */}
      <div className="flex-1 flex flex-col bg-slate-900 rounded-xl border border-slate-800 shadow-2xl overflow-hidden">
        <div className="bg-slate-800 p-4 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="text-emerald-400" size={24} />
            <h2 className="font-semibold text-lg text-white">Executive Command Interface</h2>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full">
            <Zap size={14} /> AUTONOMOUS ENGINE: ONLINE
          </div>
        </div>

        <div className="flex-1 p-6 overflow-y-auto space-y-6" ref={scrollRef}>
          {chatHistory.map((msg, i) => (
            <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'ai' && (
                <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0 border border-indigo-500/50">
                  <Bot size={16} className="text-indigo-400" />
                </div>
              )}
              
              <div className={`max-w-[80%] rounded-2xl p-4 ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'bg-slate-800 border border-slate-700 text-slate-200 shadow-sm'
              }`}>
                <p className="text-sm leading-relaxed">{msg.text}</p>
                {msg.intent && (
                  <div className="mt-3 flex gap-2">
                    <span className="text-[10px] font-mono bg-black/30 px-2 py-1 rounded text-slate-400 border border-slate-700">
                      INTENT: {msg.intent}
                    </span>
                  </div>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 border border-blue-500/50">
                  <User size={16} className="text-blue-400" />
                </div>
              )}
            </div>
          ))}
          {isProcessing && (
            <div className="flex gap-4 justify-start">
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0 animate-pulse border border-indigo-500/50">
                <Bot size={16} className="text-indigo-400" />
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 flex items-center gap-2 shadow-sm">
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-200" />
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-slate-800/50 border-t border-slate-700">
          <form onSubmit={handleCommand} className="relative">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="E.g., Show global churn risk, Pause discount workflows..."
              className="w-full bg-slate-900 border border-slate-700 rounded-full pl-6 pr-14 py-4 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-slate-200 placeholder-slate-500"
              disabled={isProcessing}
            />
            <button
              type="submit"
              disabled={isProcessing || !prompt.trim()}
              className="absolute right-2 top-2 bottom-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white w-10 flex items-center justify-center rounded-full transition-colors shadow-sm"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>

      {/* RIGHT PANEL: Command Audit Log */}
      <div className="w-[400px] flex flex-col gap-6">
        
        {/* Dynamic Context Widget */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 shadow-2xl">
          <h3 className="text-sm font-semibold text-slate-400 mb-4 flex items-center gap-2 uppercase tracking-wider">
            <Activity size={16} /> Global Operational Context
          </h3>
          <div className="space-y-4">
            <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
              <div className="text-xs text-slate-400 mb-1 flex items-center gap-2"><Globe size={14}/> Active Policies</div>
              <div className="text-sm font-mono text-emerald-400">8 Autonomous Enabled</div>
            </div>
            <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
              <div className="text-xs text-slate-400 mb-1 flex items-center gap-2"><BarChart3 size={14}/> Risk Posture</div>
              <div className="text-sm font-mono text-amber-400">Medium (Churn Alert Active)</div>
            </div>
          </div>
        </div>

        {/* Audit Log Stream */}
        <div className="flex-1 bg-slate-900 rounded-xl border border-slate-800 flex flex-col overflow-hidden shadow-2xl">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
            <h3 className="font-semibold text-slate-200 flex items-center gap-2">
              <ShieldAlert size={18} className="text-blue-400" /> Command Audit Trail
            </h3>
            <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-400 border border-slate-700 font-mono">LIVE</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {auditLogs.length === 0 ? (
              <p className="text-slate-500 text-sm text-center mt-10">No recent commands.</p>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="bg-slate-800 rounded-lg p-4 border border-slate-700 shadow-sm transition-all hover:border-slate-600">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-mono text-indigo-400 bg-indigo-400/10 px-2 py-0.5 rounded border border-indigo-400/20">
                      {log.parsed_intent}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {new Date(log.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm text-slate-300 font-medium mb-3">"{log.prompt}"</p>
                  
                  <div className="space-y-2 mt-3 border-t border-slate-700 pt-3">
                    <div className="flex items-center gap-2 text-xs">
                      <CheckCircle size={12} className="text-emerald-400" />
                      <span className="text-slate-400">{log.execution_outcome}</span>
                    </div>
                    {log.actions_triggered && log.actions_triggered.length > 0 && (
                      <div className="flex items-start gap-2 text-xs mt-1">
                        <AlertTriangle size={12} className="text-amber-400 shrink-0 mt-0.5" />
                        <span className="text-slate-400 font-mono text-[10px] break-all bg-black/20 p-1.5 rounded">
                          {JSON.stringify(log.actions_triggered)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
