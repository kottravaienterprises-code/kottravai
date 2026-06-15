import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Workflow,
} from 'lucide-react';

interface ExecutiveCommandCenterProps {
  API_BASE: string;
}

interface ExecutiveOverview {
  summary?: {
    title?: string;
    generatedAt?: string;
    status?: string;
  };
  metrics?: Record<string, number | string>;
  modules?: Record<string, { label?: string; status?: string }>;
}

interface RecommendationItem {
  recommendationId?: string;
  category?: string;
  confidence?: number;
  impact?: string;
  recommendedAction?: string;
  requiresApproval?: boolean;
  reasoning?: string;
  generatedAt?: string;
  context?: Record<string, unknown>;
  governance?: {
    approvalThreshold?: number;
    confidenceScore?: number;
    confidenceBand?: string;
    approvalRequired?: boolean;
    policyMatch?: boolean;
    policyStatus?: string;
    autonomousExecutionAllowed?: boolean;
    humanOverrideAvailable?: boolean;
    riskLevel?: string;
    requiresHumanReview?: boolean;
  };
}

interface AuditItem {
  adminId?: string;
  action?: string;
  resource?: string;
  resourceId?: string;
  metadata?: unknown;
  createdAt?: string;
}

const ExecutiveCommandCenter = ({ API_BASE }: ExecutiveCommandCenterProps) => {
  const [overview, setOverview] = useState<ExecutiveOverview | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [auditTrail, setAuditTrail] = useState<AuditItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [orchestrating, setOrchestrating] = useState(false);
  const [message, setMessage] = useState('');
  const [showAuditDrawer, setShowAuditDrawer] = useState(false);

  const adminSecret = useMemo(() => sessionStorage.getItem('kottravai_admin_token') || '', []);

  const getHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    'x-admin-secret': adminSecret,
  }), [adminSecret]);

  const loadExecutiveData = useCallback(async () => {
    setLoading(true);
    try {
      const [overviewRes, governanceRes] = await Promise.all([
        fetch(`${API_BASE}/api/admin/executive/overview`, { headers: getHeaders() }),
        fetch(`${API_BASE}/api/admin/executive/governance`, { headers: getHeaders() }),
      ]);

      const overviewPayload = await overviewRes.json();
      const governancePayload = await governanceRes.json();

      if (overviewPayload?.success) {
        setOverview(overviewPayload.data || null);
      }

      if (governancePayload?.success) {
        setRecommendations(Array.isArray(governancePayload.data?.recommendations) ? governancePayload.data.recommendations : []);
        setAuditTrail(Array.isArray(governancePayload.data?.auditTrail) ? governancePayload.data.auditTrail : []);
      }
    } catch (error) {
      console.error('Failed to load executive command center data:', error);
      setMessage('Unable to reach the executive orchestration service right now.');
    } finally {
      setLoading(false);
    }
  }, [API_BASE, getHeaders]);

  useEffect(() => {
    loadExecutiveData();
  }, [loadExecutiveData]);

  const triggerOrchestration = async () => {
    setOrchestrating(true);
    setMessage('Launching autonomous orchestration...');
    try {
      const res = await fetch(`${API_BASE}/api/admin/executive/orchestrate`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ signalType: 'pipeline_slippage', context: { pipelineHealth: 'at_risk', forecastVariance: 14 } }),
      });
      const payload = await res.json();
      if (payload?.success) {
        setMessage(`Autonomous decision ready: ${payload.data?.recommendedAction || 'Review generated recommendation'}`);
        await loadExecutiveData();
      } else {
        setMessage(payload?.error || 'Orchestration request failed.');
      }
    } catch (error) {
      console.error('Orchestration failed:', error);
      setMessage('Orchestration request failed.');
    } finally {
      setOrchestrating(false);
    }
  };

  const triggerHumanOverride = async (recommendationId?: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/executive/override`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ recommendationId, reason: 'Human override requested from the executive command center' }),
      });
      const payload = await res.json();
      if (payload?.success) {
        setMessage('Human override recorded and persisted to the audit trail.');
        await loadExecutiveData();
      } else {
        setMessage(payload?.error || 'Override request failed.');
      }
    } catch (error) {
      console.error('Override failed:', error);
      setMessage('Override request failed.');
    }
  };

  const metricCards = useMemo(() => {
    const metrics = overview?.metrics || {};
    return [
      { label: 'Workflow Health', value: `${metrics.workflowHealth ?? 92}%`, hint: 'Operational stability', icon: Workflow },
      { label: 'Revenue Signals', value: metrics.revenueSignals ?? 6, hint: 'Live triggers', icon: TrendingUp },
      { label: 'Approvals Pending', value: metrics.approvalsPending ?? 1, hint: 'Needs review', icon: Clock3 },
      { label: 'Recommended Actions', value: metrics.recommendedActions ?? 3, hint: 'Auto-generated', icon: Sparkles },
    ];
  }, [overview]);

  const alertItems = useMemo(() => {
    const baseItems = [
      {
        title: 'Executive alert queue',
        body: 'Revenue risk signals are converging around renewal exposure and forecast drift.',
        tone: 'amber',
      },
      {
        title: 'Workflow throughput',
        body: 'Automations remain healthy while approval routing stays within target SLA.',
        tone: 'green',
      },
    ];

    if (recommendations.length > 0) {
      baseItems.push({
        title: 'Latest recommendation',
        body: recommendations[0].recommendedAction || 'No recommendation ready yet.',
        tone: 'purple',
      });
    }

    return baseItems;
  }, [recommendations]);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-fuchsia-950 p-6 text-white shadow-2xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="rounded-2xl bg-white/15 p-2.5">
                <BrainCircuit size={22} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-200">Phase 7C-A</p>
                <h2 className="text-2xl font-bold">Executive AI Command Center</h2>
              </div>
            </div>
            <p className="max-w-2xl text-sm text-indigo-100">
              Monitor revenue signals, prioritize autonomous recommendations, and keep approval controls visible from one executive surface.
            </p>
          </div>
          <button
            onClick={triggerOrchestration}
            disabled={orchestrating}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <Sparkles size={16} />
            {orchestrating ? 'Orchestrating…' : 'Run Autonomous Review'}
          </button>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {metricCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-indigo-100">{card.label}</p>
                  <div className="rounded-lg bg-white/10 p-2">
                    <Icon size={16} />
                  </div>
                </div>
                <p className="mt-3 text-2xl font-semibold">{card.value}</p>
                <p className="mt-1 text-xs text-indigo-200">{card.hint}</p>
              </div>
            );
          })}
        </div>
      </div>

      {message && (
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
          {message}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-gray-100 bg-white p-10 shadow-sm">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600" />
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-500">Executive Overview</p>
                  <h3 className="mt-1 text-lg font-semibold text-gray-900">{overview?.summary?.title || 'Executive command overview'}</h3>
                </div>
                <div className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
                  {overview?.summary?.status || 'Operational'}
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {Object.entries(overview?.modules || {}).map(([key, module]) => (
                  <div key={key} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-gray-900">{module.label || key}</p>
                      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-gray-600">
                        {module.status || 'Active'}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-500">
                      {key === 'customerSuccess' && 'Customer health telemetry is flowing into the command center.'}
                      {key === 'workflows' && 'Workflow routing, approvals, and escalations remain on track.'}
                      {key === 'revenue' && 'Revenue signals remain visible for executive review.'}
                      {key === 'executiveAutomation' && 'Autonomous controls are ready for human oversight.'}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-500">Recommended Actions</p>
                  <h3 className="mt-1 text-lg font-semibold text-gray-900">Autonomous intervention queue</h3>
                </div>
                <div className="text-sm text-gray-500">{recommendations.length} active</div>
              </div>

              <div className="mt-5 space-y-3">
                {recommendations.length > 0 ? recommendations.map((item) => (
                  <div key={item.recommendationId || item.category} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-gray-900">{item.category || 'Executive action'}</p>
                        <p className="mt-1 text-sm text-gray-600">{item.recommendedAction}</p>
                      </div>
                      <div className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-indigo-700">
                        {item.confidence ?? 0}% confidence
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-gray-500">
                      <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1">
                        <BadgeCheck size={14} /> {item.requiresApproval ? 'Requires approval' : 'Auto-safe'}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1">
                        <Activity size={14} /> {item.impact || 'Medium impact'}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1">
                        <ShieldCheck size={14} /> {item.governance?.riskLevel || 'Medium'} risk
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                      <span className={`rounded-full px-2.5 py-1 font-semibold ${item.governance?.policyMatch ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {item.governance?.policyStatus || 'Policy pending'}
                      </span>
                      <span className={`rounded-full px-2.5 py-1 font-semibold ${item.governance?.autonomousExecutionAllowed ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {item.governance?.autonomousExecutionAllowed ? 'Autonomy allowed' : 'Approval required'}
                      </span>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-gray-200 pt-3">
                      <p className="text-sm text-gray-500">
                        Approval threshold: {item.governance?.approvalThreshold ?? 80} • Confidence band: {item.governance?.confidenceBand || 'Medium'}
                      </p>
                      <button
                        type="button"
                        onClick={() => triggerHumanOverride(item.recommendationId)}
                        className="rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50"
                      >
                        Human override
                      </button>
                    </div>
                  </div>
                )) : (
                  <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-500">
                    No recommendations are being generated right now.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-500" />
                <h3 className="text-lg font-semibold text-gray-900">Executive Alerts</h3>
              </div>
              <div className="mt-5 space-y-3">
                {alertItems.map((item) => (
                  <div key={item.title} className={`rounded-xl border p-4 ${item.tone === 'amber' ? 'border-amber-100 bg-amber-50' : item.tone === 'purple' ? 'border-fuchsia-100 bg-fuchsia-50' : 'border-emerald-100 bg-emerald-50'}`}>
                    <p className="font-semibold text-gray-900">{item.title}</p>
                    <p className="mt-1 text-sm text-gray-600">{item.body}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Users size={18} className="text-indigo-500" />
                  <h3 className="text-lg font-semibold text-gray-900">Governance & Audit</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAuditDrawer((value) => !value)}
                  className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700"
                >
                  {showAuditDrawer ? 'Hide history' : 'View audit history'}
                </button>
              </div>
              {showAuditDrawer && (
                <div className="mt-4 space-y-2 rounded-xl border border-gray-100 bg-gray-50 p-3">
                  {auditTrail.length > 0 ? auditTrail.slice(0, 5).map((entry) => (
                    <div key={`${entry.action}-${entry.resourceId}-${entry.createdAt}`} className="rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-600">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-gray-900">{entry.action}</p>
                        <p className="text-xs text-gray-400">{entry.createdAt ? new Date(entry.createdAt).toLocaleString() : 'recent'}</p>
                      </div>
                      <p className="mt-1">{entry.resource || 'Executive governance'} • {entry.resourceId || 'n/a'}</p>
                    </div>
                  )) : (
                    <p className="text-sm text-gray-500">No governance activity has been captured yet.</p>
                  )}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-indigo-500" />
                <h3 className="text-lg font-semibold text-gray-900">Customer Success Signals</h3>
              </div>
              <div className="mt-5 space-y-3">
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-gray-900">Renewal readiness</p>
                    <span className="text-sm font-semibold text-emerald-600">Healthy</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">Customer health monitoring remains stable and proactive.</p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-gray-900">Escalation path</p>
                    <span className="text-sm font-semibold text-indigo-600">Available</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">Human override and approval controls stay visible for leadership review.</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-500" />
                <h3 className="text-lg font-semibold text-gray-900">Recent Autonomous Decisions</h3>
              </div>
              <div className="mt-5 space-y-3">
                {recommendations.slice(0, 3).map((item) => (
                  <div key={`${item.recommendationId || item.category}-feed`} className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <div className="rounded-full bg-white p-2">
                      <ArrowRight size={14} className="text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{item.category || 'Decision'}</p>
                      <p className="text-sm text-gray-500">{item.reasoning || item.recommendedAction}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExecutiveCommandCenter;
