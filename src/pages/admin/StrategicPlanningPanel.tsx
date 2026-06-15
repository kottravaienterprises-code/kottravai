import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

interface StrategicPlanningPanelProps {
    API_BASE?: string;
}

export const StrategicPlanningPanel: React.FC<StrategicPlanningPanelProps> = ({ API_BASE = '' }) => {
    const [variables, setVariables] = useState({
        targetArrGrowth: 20,
        churnRateModifier: -2,
        dealSizeModifier: 5,
        pipelineVelocityModifier: 10,
        expansionRevenueGrowth: 15
    });

    const [results, setResults] = useState<any>(null);
    const [scenarios, setScenarios] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadHistory();
        runSimulation();
    }, []);

    const loadHistory = async () => {
        try {
            const { data } = await axios.get(`${API_BASE}/admin/revenue/simulation/history`, { withCredentials: true });
            if (data.success) {
                setScenarios(data.data);
            }
        } catch (err) {
            console.error('Failed to load history', err);
        }
    };

    const runSimulation = async () => {
        setLoading(true);
        try {
            const { data } = await axios.post(`${API_BASE}/admin/revenue/simulation/run`, variables, { withCredentials: true });
            if (data.success) {
                setResults(data.data);
            }
        } catch (err) {
            console.error('Simulation failed', err);
        } finally {
            setLoading(false);
        }
    };

    const handleVariableChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setVariables(prev => ({ ...prev, [name]: Number(value) }));
    };

    const saveScenario = async () => {
        try {
            const payload = {
                name: `Scenario ${new Date().toLocaleDateString()}`,
                description: 'Generated from Executive Workspace',
                variables,
                results: results?.projected,
                status: 'DRAFT'
            };
            await axios.post(`${API_BASE}/admin/revenue/simulation/save`, payload, { withCredentials: true });
            loadHistory();
            toast.success('Scenario saved');
        } catch (err) {
            console.error('Save failed', err);
            toast.error('Failed to save scenario');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Strategic Planning & Simulation</h2>
                <button onClick={saveScenario} className="bg-[#8E2A8B] text-white px-4 py-2 rounded-xl font-bold hover:bg-[#722270] transition-colors">Save Scenario</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Inputs Panel */}
                <div className="col-span-1 p-6 bg-white rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold mb-4">Simulation Levers</h3>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Target ARR Growth (%)</label>
                            <input 
                                type="range" name="targetArrGrowth" min="-50" max="100" 
                                value={variables.targetArrGrowth} onChange={handleVariableChange} 
                                onMouseUp={runSimulation} className="w-full"
                            />
                            <div className="text-right text-sm text-gray-500">{variables.targetArrGrowth}%</div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Churn Rate Modifier (pts)</label>
                            <input 
                                type="range" name="churnRateModifier" min="-10" max="10" 
                                value={variables.churnRateModifier} onChange={handleVariableChange} 
                                onMouseUp={runSimulation} className="w-full"
                            />
                            <div className="text-right text-sm text-gray-500">{variables.churnRateModifier}%</div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Deal Size Modifier (%)</label>
                            <input 
                                type="range" name="dealSizeModifier" min="-20" max="50" 
                                value={variables.dealSizeModifier} onChange={handleVariableChange} 
                                onMouseUp={runSimulation} className="w-full"
                            />
                            <div className="text-right text-sm text-gray-500">{variables.dealSizeModifier}%</div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Pipeline Velocity Modifier (%)</label>
                            <input 
                                type="range" name="pipelineVelocityModifier" min="-30" max="50" 
                                value={variables.pipelineVelocityModifier} onChange={handleVariableChange} 
                                onMouseUp={runSimulation} className="w-full"
                            />
                            <div className="text-right text-sm text-gray-500">{variables.pipelineVelocityModifier}%</div>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium mb-1">Expansion Revenue Growth (%)</label>
                            <input 
                                type="range" name="expansionRevenueGrowth" min="0" max="50" 
                                value={variables.expansionRevenueGrowth} onChange={handleVariableChange} 
                                onMouseUp={runSimulation} className="w-full"
                            />
                            <div className="text-right text-sm text-gray-500">{variables.expansionRevenueGrowth}%</div>
                        </div>
                    </div>
                </div>

                {/* Outputs Panel */}
                <div className="col-span-2 p-6 bg-white rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold mb-4">Projected Outcomes</h3>
                    {loading ? (
                        <div className="animate-pulse space-y-4">
                            <div className="h-8 bg-gray-200 rounded"></div>
                            <div className="h-8 bg-gray-200 rounded"></div>
                        </div>
                    ) : results ? (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-gray-50 rounded-lg border">
                                <p className="text-sm text-gray-500">Projected ARR</p>
                                <p className="text-2xl font-bold text-blue-600">
                                    ${Number(results.projected.arr).toLocaleString()}
                                </p>
                                <p className="text-xs text-gray-400">Baseline: ${Number(results.baseline.arr).toLocaleString()}</p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg border">
                                <p className="text-sm text-gray-500">Projected NRR</p>
                                <p className="text-2xl font-bold text-green-600">
                                    {Number(results.projected.nrr).toFixed(1)}%
                                </p>
                                <p className="text-xs text-gray-400">Baseline: {Number(results.baseline.nrr).toFixed(1)}%</p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg border">
                                <p className="text-sm text-gray-500">Projected Churn</p>
                                <p className="text-2xl font-bold text-red-600">
                                    {Number(results.projected.churn).toFixed(1)}%
                                </p>
                                <p className="text-xs text-gray-400">Baseline: {Number(results.baseline.churn).toFixed(1)}%</p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg border">
                                <p className="text-sm text-gray-500">Confidence Score</p>
                                <p className="text-2xl font-bold text-purple-600">
                                    {Number(results.projected.confidence).toFixed(0)}%
                                </p>
                            </div>
                        </div>
                    ) : (
                        <p>No results available.</p>
                    )}
                </div>
            </div>

            <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold mb-4">Saved Scenarios</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b">
                                <th className="pb-2">Name</th>
                                <th className="pb-2">Status</th>
                                <th className="pb-2">Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {scenarios.map(s => (
                                <tr key={s.id} className="border-b last:border-0">
                                    <td className="py-3">{s.name}</td>
                                    <td className="py-3">
                                        <span className={`px-2 py-1 text-xs rounded-full ${s.status === 'LOCKED' ? 'bg-yellow-100 text-yellow-800' : s.status === 'APPROVED' ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}>
                                            {s.status}
                                        </span>
                                    </td>
                                    <td className="py-3">{new Date(s.created_at).toLocaleDateString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
