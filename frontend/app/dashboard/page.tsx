"use client";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { getPortfolio, simulatePortfolio, PortfolioData, SimulationData } from "../../lib/portfolio";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import Navigation from "../components/Navigation";
import ProtectedRoute from "../components/ProtectedRoute";
import { useAuth } from "../../lib/auth";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658'];

export default function DashboardPage() {
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [simulation, setSimulation] = useState<SimulationData | null>(null);
  const [threshold, setThreshold] = useState(0.25);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { session } = useAuth();
  const pathname = usePathname();

  // Reload portfolio when navigating to this page (handles production caching)
  useEffect(() => {
    if (session?.access_token && pathname === "/dashboard") {
      loadPortfolio();
    }
  }, [session?.access_token, pathname]);

  useEffect(() => {
    if (portfolio && portfolio.total_applications > 0) {
      loadSimulation();
    }
  }, [threshold, portfolio]);

  async function loadPortfolio() {
    if (!session?.access_token) {
      return;
    }
    
    try {
      setLoading(true);
      const data = await getPortfolio(session.access_token);
      setPortfolio(data);
    } catch (err: any) {
      console.error('Portfolio load failed:', err);
      setError(err?.message || "Failed to load portfolio");
    } finally {
      setLoading(false);
    }
  }

  async function loadSimulation() {
    try {
      const data = await simulatePortfolio(threshold, session?.access_token);
      setSimulation(data);
    } catch (err: any) {
      console.error("Simulation failed:", err);
    }
  }

  if (loading) {
    return (
      <main>
        <Navigation />
        <div className="card">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white/70">Loading portfolio data...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main>
        <Navigation />
        <div className="card">
          <div className="text-center py-8">
            <p className="text-red-400 mb-4">{error}</p>
            <button onClick={loadPortfolio} className="btn">Retry</button>
          </div>
        </div>
      </main>
    );
  }

  if (!portfolio) return null;

  // Show empty state if no applications
  if (portfolio.total_applications === 0) {
    return (
      <ProtectedRoute>
        <main>
          <Navigation />
          <div className="card">
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📊</div>
              <h2 className="text-2xl font-semibold mb-4">No Applications Yet</h2>
              <p className="text-white/70 mb-6">
                You haven't submitted any loan applications yet. Get started by scoring your first application!
              </p>
              <a 
                href="/score" 
                className="btn inline-block"
              >
                Score Your First Application
              </a>
            </div>
          </div>
        </main>
      </ProtectedRoute>
    );
  }

  // Prepare data for charts
  const gradeData = Object.entries(portfolio.grade_distribution).map(([grade, count]) => ({
    grade,
    count
  }));

  const thresholdData = [];
  for (let t = 0.05; t <= 0.50; t += 0.05) {
    // This would ideally come from the backend, but for now we'll simulate
    const approved = portfolio.total_applications * (1 - t);
    thresholdData.push({
      threshold: (t * 100).toFixed(0) + '%',
      approval_rate: Math.round((approved / portfolio.total_applications) * 100)
    });
  }

  return (
    <ProtectedRoute>
      <main>
        <Navigation />
        <div className="grid gap-6">
        {/* KPI Cards */}
        <section className="grid gap-4 md:grid-cols-4">
          <div className="card">
            <div className="text-white/60 text-sm">Total Applications</div>
            <div className="text-2xl font-semibold">{portfolio.total_applications.toLocaleString()}</div>
          </div>
          <div className="card">
            <div className="text-white/60 text-sm">Average PD</div>
            <div className="text-2xl font-semibold">{(portfolio.avg_pd * 100).toFixed(2)}%</div>
          </div>
          <div className="card">
            <div className="text-white/60 text-sm">Approval Rate</div>
            <div className="text-2xl font-semibold">{(portfolio.approval_rate * 100).toFixed(1)}%</div>
          </div>
          <div className="card">
            <div className="text-white/60 text-sm">Expected Default Rate</div>
            <div className="text-2xl font-semibold">{(portfolio.default_rate * 100).toFixed(2)}%</div>
          </div>
        </section>

        {/* Charts Grid */}
        <section className="grid gap-6 lg:grid-cols-2">
          {/* Risk Grade Distribution */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Risk Grade Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={gradeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="grade" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '6px',
                    color: '#F9FAFB'
                  }} 
                />
                <Bar dataKey="count" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Approval Rate vs Threshold */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Approval Rate vs Threshold</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={thresholdData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="threshold" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '6px',
                    color: '#F9FAFB'
                  }} 
                />
                <Line type="monotone" dataKey="approval_rate" stroke="#10B981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Policy Simulator */}
        <section className="card">
          <h3 className="text-lg font-semibold mb-4">Policy Simulator</h3>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-2">
                Approval Threshold: {(threshold * 100).toFixed(1)}%
              </label>
              <input
                type="range"
                min="0.05"
                max="0.50"
                step="0.01"
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-white/60 mt-1">
                <span>5%</span>
                <span>50%</span>
              </div>
            </div>
            
            {simulation && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="text-center">
                  <div className="text-2xl font-semibold text-green-400">
                    {(simulation.approval_rate * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-white/60">Approval Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-semibold text-red-400">
                    {(simulation.expected_default_rate * 100).toFixed(2)}%
                  </div>
                  <div className="text-sm text-white/60">Expected Default Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-semibold text-blue-400">
                    {simulation.applications_approved.toLocaleString()}
                  </div>
                  <div className="text-sm text-white/60">Applications Approved</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-semibold text-orange-400">
                    {simulation.applications_rejected.toLocaleString()}
                  </div>
                  <div className="text-sm text-white/60">Applications Rejected</div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Recent Applications Table */}
        {portfolio.recent_applications.length > 0 && (
          <section className="card">
            <h3 className="text-lg font-semibold mb-4">Recent Applications</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-2">Date</th>
                    <th className="text-left py-2">Amount</th>
                    <th className="text-left py-2">Income</th>
                    <th className="text-left py-2">PD</th>
                    <th className="text-left py-2">Grade</th>
                    <th className="text-left py-2">Decision</th>
                  </tr>
                </thead>
                <tbody>
                  {portfolio.recent_applications.slice(0, 10).map((app, idx) => (
                    <tr key={idx} className="border-b border-gray-800">
                      <td className="py-2">{new Date(app.created_at).toLocaleDateString()}</td>
                      <td className="py-2">${app.loan_amnt.toLocaleString()}</td>
                      <td className="py-2">${app.annual_inc.toLocaleString()}</td>
                      <td className="py-2">{(app.pd * 100).toFixed(2)}%</td>
                      <td className="py-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          app.risk_grade === 'A' ? 'bg-green-900 text-green-300' :
                          app.risk_grade === 'B' ? 'bg-blue-900 text-blue-300' :
                          app.risk_grade === 'C' ? 'bg-yellow-900 text-yellow-300' :
                          app.risk_grade === 'D' ? 'bg-orange-900 text-orange-300' :
                          'bg-red-900 text-red-300'
                        }`}>
                          {app.risk_grade}
                        </span>
                      </td>
                      <td className="py-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          app.decision === 'approve' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
                        }`}>
                          {app.decision}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
        </div>
      </main>
    </ProtectedRoute>
  );
}