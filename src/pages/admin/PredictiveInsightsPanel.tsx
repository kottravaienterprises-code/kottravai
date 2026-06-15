import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Activity, TrendingUp, CheckCircle, Clock, FileText, BrainCircuit } from 'lucide-react';
import toast from 'react-hot-toast';

interface PredictiveInsightsPanelProps {
  API_BASE: string;
}

export const PredictiveInsightsPanel: React.FC<PredictiveInsightsPanelProps> = ({ API_BASE }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInsights();
  }, []);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/admin/revenue/predictive-insights`, { withCredentials: true });
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load predictive insights');
    } finally {
      setLoading(false);
    }
  };

  const executeRecommendation = async (_recId: string) => {
    toast.success('Recommendation execution triggered!');
    // In production, this would call an execute endpoint
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500 animate-pulse">Loading Intelligence Feed...</div>;
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-2">
            <BrainCircuit className="w-6 h-6 text-purple-600" />
            Intelligence & Predictive Feed
          </h2>
          <p className="text-sm text-gray-500 mt-1">AI-driven anomaly detection and autonomous intervention recommendations</p>
        </div>
        <div className="flex gap-4">
            <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg border border-red-100 flex flex-col items-center">
                <span className="text-xs font-bold uppercase tracking-wider">Active Anomalies</span>
                <span className="text-xl font-bold">{data.summary?.activeAnomalies || 0}</span>
            </div>
            <div className="bg-yellow-50 text-yellow-700 px-4 py-2 rounded-lg border border-yellow-100 flex flex-col items-center">
                <span className="text-xs font-bold uppercase tracking-wider">High Risk</span>
                <span className="text-xl font-bold">{data.summary?.highRiskAccounts || 0}</span>
            </div>
            <div className="bg-green-50 text-green-700 px-4 py-2 rounded-lg border border-green-100 flex flex-col items-center">
                <span className="text-xs font-bold uppercase tracking-wider">Expansion Signals</span>
                <span className="text-xl font-bold">{data.summary?.expansionOpportunities || 0}</span>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Anomalies & Signals */}
        <div className="lg:col-span-2 space-y-6">
          {/* Anomalies */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-red-500" />
              Detected Revenue Anomalies
            </h3>
            {data.anomalies?.length > 0 ? (
              <div className="space-y-3">
                {data.anomalies.map((a: any) => (
                  <div key={a.id} className="p-4 rounded-lg bg-red-50 border border-red-100 flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-red-900">{a.category}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${a.severity === 'Critical' ? 'bg-red-600 text-white' : 'bg-red-200 text-red-800'}`}>
                          {a.severity}
                        </span>
                      </div>
                      <p className="text-sm text-red-800">{a.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-red-600 uppercase">Variance</p>
                      <p className="font-bold text-red-700">{a.variance_percent}%</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No active anomalies detected.</p>
            )}
          </div>

          {/* Predictive Signals */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-500" />
              Predictive AI Signals
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                    <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Churn Risk</h4>
                    {data.churnRisks?.length > 0 ? data.churnRisks.map((s: any) => (
                        <div key={s.id} className="p-3 rounded-lg border border-orange-200 bg-orange-50">
                            <div className="flex justify-between">
                                <span className="font-bold text-orange-900">{s.company_name}</span>
                                <span className="text-orange-700 font-bold">{s.risk_score}/100</span>
                            </div>
                            <div className="mt-2 text-xs text-orange-800">
                                <strong>AI Explainability:</strong>
                                <ul className="list-disc pl-4 mt-1">
                                    {(s.drivers || []).map((d: string, i: number) => <li key={i}>{d}</li>)}
                                </ul>
                            </div>
                            <div className="mt-2 text-right">
                                <span className="text-xs text-gray-500 font-mono">Confidence: {s.confidence}%</span>
                            </div>
                        </div>
                    )) : <p className="text-xs text-gray-400">No high churn risks.</p>}
                </div>
                
                <div className="space-y-3">
                    <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Expansion Opportunity</h4>
                    {data.expansionSignals?.length > 0 ? data.expansionSignals.map((s: any) => (
                        <div key={s.id} className="p-3 rounded-lg border border-green-200 bg-green-50">
                            <div className="flex justify-between">
                                <span className="font-bold text-green-900">{s.company_name}</span>
                                <span className="text-green-700 font-bold">{s.risk_score}/100</span>
                            </div>
                            <div className="mt-2 text-xs text-green-800">
                                <strong>AI Explainability:</strong>
                                <ul className="list-disc pl-4 mt-1">
                                    {(s.drivers || []).map((d: string, i: number) => <li key={i}>{d}</li>)}
                                </ul>
                            </div>
                            <div className="mt-2 text-right">
                                <span className="text-xs text-gray-500 font-mono">Confidence: {s.confidence}%</span>
                            </div>
                        </div>
                    )) : <p className="text-xs text-gray-400">No expansion signals.</p>}
                </div>
            </div>
          </div>
        </div>

        {/* Right Column: Recommendations Queue */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col h-full">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-blue-500" />
              Autonomous Interventions
            </h3>
            
            <div className="flex-1 space-y-4 overflow-y-auto">
                {data.recommendations?.length > 0 ? data.recommendations.map((r: any) => (
                    <div key={r.id} className="p-4 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors bg-white shadow-sm">
                        <div className="flex justify-between mb-2">
                            <span className="font-bold text-sm text-gray-900">{r.action_type}</span>
                            <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase ${r.approval_status === 'AUTO_APPROVED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                {r.approval_status.replace(/_/g, ' ')}
                            </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{r.description}</p>
                        
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                                <FileText className="w-3 h-3" />
                                {r.recommended_playbook}
                            </div>
                            {r.approval_status.includes('REQUIRED') ? (
                                <button onClick={() => executeRecommendation(r.id)} className="text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3 py-1.5 rounded font-bold transition-colors">
                                    Review & Approve
                                </button>
                            ) : (
                                <span className="text-xs text-green-600 font-bold flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> Queued
                                </span>
                            )}
                        </div>
                    </div>
                )) : (
                    <div className="text-center py-10 text-gray-400">
                        <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-20" />
                        <p className="text-sm">No pending interventions.</p>
                    </div>
                )}
            </div>
        </div>

      </div>
    </div>
  );
};
