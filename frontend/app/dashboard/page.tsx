"use client";
import { useState, useEffect } from "react";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getPortfolio, simulatePortfolio, getApplication, deleteApplication, PortfolioData, SimulationData, ApplicationDetail } from "../../lib/portfolio";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import Navigation from "../components/Navigation";
import { useAuth } from "../../lib/auth";
import ExplanationDisplay from "../components/ExplanationDisplay";
import InfoIcon from "../components/InfoIcon";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658'];

const ITEMS_PER_PAGE = 10;

export default function DashboardPage() {
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [simulation, setSimulation] = useState<SimulationData | null>(null);
  const [threshold, setThreshold] = useState(0.15);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<ApplicationDetail | null>(null);
  const [loadingApplication, setLoadingApplication] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const { session, user, loading: authLoading } = useAuth();
  const pathname = usePathname();

  // Reload portfolio when navigating to this page (handles production caching)
  useEffect(() => {
    if (session?.access_token && pathname === "/dashboard") {
      loadPortfolio();
    } else if (!authLoading && !user) {
      // User is not authenticated, stop loading
      setLoading(false);
    }
  }, [session?.access_token, pathname, authLoading, user]);

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

  async function handleApplicationClick(applicationId: string) {
    if (!session?.access_token) return;
    
    try {
      setLoadingApplication(true);
      const app = await getApplication(applicationId, session.access_token);
      setSelectedApplication(app);
    } catch (err: any) {
      console.error("Failed to load application:", err);
      setError(err?.message || "Failed to load application details");
    } finally {
      setLoadingApplication(false);
    }
  }

  async function handleDeleteApplication() {
    if (!selectedApplication?.id || !session?.access_token) return;
    
    const applicationId = selectedApplication.id;
    const confirmed = window.confirm("Are you sure you want to delete this application? This action cannot be undone.");
    
    if (!confirmed) return;
    
    try {
      setLoadingApplication(true);
      await deleteApplication(applicationId, session.access_token);
      
      // Close modal and reload portfolio
      setSelectedApplication(null);
      setCurrentPage(1); // Reset to first page after deletion
      await loadPortfolio();
      
      // Also reload simulation if we have portfolio data
      if (portfolio) {
        await loadSimulation();
      }
    } catch (err: any) {
      console.error("Failed to delete application:", err);
      setError(err?.message || "Failed to delete application");
      alert(err?.message || "Failed to delete application. Please try again.");
    } finally {
      setLoadingApplication(false);
    }
  }

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (selectedApplication) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedApplication]);

  // Show loading state while checking auth
  if (authLoading || (user && loading && !portfolio && !error)) {
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

  // Show CTA for unauthenticated users
  if (!user && !authLoading) {
    return (
      <main>
        <Navigation />
        <div className="card text-center py-12">
          <div className="text-6xl mb-4">📊</div>
          <h2 className="text-2xl font-semibold mb-4">Portfolio Dashboard</h2>
          <p className="text-white/70 mb-6 max-w-xl mx-auto">
            Sign up for a free account to access your portfolio analytics dashboard. Track your scored applications, view risk distributions, simulate approval policies, and monitor your lending portfolio.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/auth?mode=signup" 
              className="btn px-6 py-3 text-center"
            >
              Sign Up Free
            </Link>
            <Link 
              href="/auth?mode=login" 
              className="px-6 py-3 text-center text-white/80 hover:text-white border border-white/20 rounded-xl hover:border-white/40 transition-colors"
            >
              Already have an account? Sign In
            </Link>
          </div>
          <div className="mt-8 pt-8 border-t border-white/10">
            <p className="text-sm text-white/60 mb-4">Want to try scoring first?</p>
            <Link 
              href="/score" 
              className="text-blue-400 hover:text-blue-300 underline"
            >
              Score an application for free (no sign-up required)
            </Link>
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

  if (!portfolio && user) {
    // User is authenticated but portfolio hasn't loaded yet (shouldn't happen, but safety check)
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

  // At this point, portfolio must exist if user is authenticated
  // Show empty state if no applications
  if (portfolio && portfolio.total_applications === 0) {
    return (
      <main>
        <Navigation />
        <div className="card">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📊</div>
            <h2 className="text-2xl font-semibold mb-4">No Applications Yet</h2>
            <p className="text-white/70 mb-6">
              You haven't submitted any loan applications yet. Get started by scoring your first application!
            </p>
            <Link 
              href="/score" 
              className="btn inline-block"
            >
              Score Your First Application
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // At this point, portfolio must exist (already checked above)
  if (!portfolio) {
    return null; // This shouldn't happen, but TypeScript requires it
  }

  // Prepare data for charts
  const gradeData = Object.entries(portfolio.grade_distribution).map(([grade, count]) => ({
    grade,
    count
  }));

  const thresholdData = [];
  for (let t = 0.01; t <= 0.25; t += 0.02) {
    // This would ideally come from the backend, but for now we'll simulate
    const approved = portfolio.total_applications * (1 - t);
    thresholdData.push({
      threshold: (t * 100).toFixed(0) + '%',
      approval_rate: Math.round((approved / portfolio.total_applications) * 100)
    });
  }

  return (
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
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-white/70">
                  Approval Threshold: <span className="font-semibold text-white">{(threshold * 100).toFixed(0)}%</span>
                </label>
                <span className="text-xs text-white/50">Range: 1% - 25%</span>
              </div>
              <input
                type="range"
                min="0.01"
                max="0.25"
                step="0.01"
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-xs text-white/50 mt-1">
                <span>1%</span>
                <span>25%</span>
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
          <section className="card overflow-visible">
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
                    <th className="text-left py-2">
                      <div className="flex items-center gap-2">
                        Decision
                        <InfoIcon 
                          position="above"
                          usePortal={true}
                          explanation="The decision (approve/review) is based on a 15% probability of default (PD) threshold. Applications with PD below 15% are auto-approved, while those with PD at or above 15% require manual review." 
                        />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {portfolio.recent_applications
                    .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                    .map((app, idx) => (
                    <tr 
                      key={app.id || idx} 
                      className="border-b border-gray-800 hover:bg-white/5 cursor-pointer transition-colors"
                      onClick={() => app.id && handleApplicationClick(app.id)}
                    >
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
            {/* Pagination Controls */}
            {portfolio.recent_applications.length > ITEMS_PER_PAGE && (
              <div className="mt-4 flex items-center justify-between px-4">
                <div className="text-sm text-white/60">
                  Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, portfolio.recent_applications.length)} of {portfolio.recent_applications.length} applications
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:text-white/30 disabled:cursor-not-allowed text-white text-sm transition-colors"
                  >
                    Previous
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.ceil(portfolio.recent_applications.length / ITEMS_PER_PAGE) }, (_, i) => i + 1)
                      .filter(page => {
                        // Show first page, last page, current page, and pages around current
                        const totalPages = Math.ceil(portfolio.recent_applications.length / ITEMS_PER_PAGE);
                        return page === 1 || 
                               page === totalPages || 
                               (page >= currentPage - 1 && page <= currentPage + 1);
                      })
                      .map((page, idx, array) => {
                        // Add ellipsis if there's a gap
                        const prevPage = array[idx - 1];
                        const showEllipsis = prevPage && page - prevPage > 1;
                        return (
                          <React.Fragment key={page}>
                            {showEllipsis && <span className="text-white/40 px-1">...</span>}
                            <button
                              onClick={() => setCurrentPage(page)}
                              className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                                currentPage === page
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-white/10 hover:bg-white/20 text-white/70'
                              }`}
                            >
                              {page}
                            </button>
                          </React.Fragment>
                        );
                      })}
                  </div>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(Math.ceil(portfolio.recent_applications.length / ITEMS_PER_PAGE), prev + 1))}
                    disabled={currentPage >= Math.ceil(portfolio.recent_applications.length / ITEMS_PER_PAGE)}
                    className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:text-white/30 disabled:cursor-not-allowed text-white text-sm transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Application Detail Modal */}
        {selectedApplication && (
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto"
            onClick={() => setSelectedApplication(null)}
            style={{ overscrollBehavior: 'contain' }}
          >
            <div 
              className="bg-gray-900 border border-white/20 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto my-auto"
              onClick={(e) => e.stopPropagation()}
              style={{ overscrollBehavior: 'contain' }}
            >
              <div className="sticky top-0 bg-gray-900/95 backdrop-blur-sm border-b border-white/10 p-6 flex justify-between items-start z-10">
                <h2 className="text-2xl font-semibold">Application Details</h2>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleDeleteApplication}
                    disabled={loadingApplication}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors"
                    aria-label="Delete application"
                  >
                    {loadingApplication ? "Deleting..." : "Delete"}
                  </button>
                  <button
                    onClick={() => setSelectedApplication(null)}
                    className="text-white/60 hover:text-white text-3xl leading-none w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
                    aria-label="Close modal"
                  >
                    ×
                  </button>
                </div>
              </div>
              
              <div className="p-6">

              {loadingApplication ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
                  <p className="text-white/70">Loading application details...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Results Summary */}
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="text-white/60 text-sm">Probability of Default</div>
                      <div className="text-2xl font-semibold">{(selectedApplication.pd * 100).toFixed(2)}%</div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="text-white/60 text-sm">Risk Grade</div>
                      <div className="text-2xl font-semibold">{selectedApplication.risk_grade}</div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="text-white/60 text-sm">Decision</div>
                      <div className="text-2xl font-semibold capitalize">{selectedApplication.decision}</div>
                    </div>
                  </div>

                  {/* Application Input Fields */}
                  <div className="rounded-xl border border-white/10 bg-white/5 p-6">
                    <h3 className="text-lg font-semibold mb-4">Application Input</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <span className="text-white/60 text-sm">Loan Amount</span>
                        <div className="text-white font-medium">${selectedApplication.loan_amnt.toLocaleString()}</div>
                      </div>
                      <div>
                        <span className="text-white/60 text-sm">Annual Income</span>
                        <div className="text-white font-medium">${selectedApplication.annual_inc.toLocaleString()}</div>
                      </div>
                      <div>
                        <span className="text-white/60 text-sm">DTI</span>
                        <div className="text-white font-medium">{selectedApplication.dti}%</div>
                      </div>
                      <div>
                        <span className="text-white/60 text-sm">Employment Length</span>
                        <div className="text-white font-medium">{selectedApplication.emp_length} years</div>
                      </div>
                      <div>
                        <span className="text-white/60 text-sm">FICO Score</span>
                        <div className="text-white font-medium">{selectedApplication.fico}</div>
                      </div>
                      <div>
                        <span className="text-white/60 text-sm">Revolving Utilization</span>
                        <div className="text-white font-medium">{selectedApplication.revol_util}%</div>
                      </div>
                      <div>
                        <span className="text-white/60 text-sm">Grade</span>
                        <div className="text-white font-medium">{selectedApplication.grade}</div>
                      </div>
                      <div>
                        <span className="text-white/60 text-sm">Term</span>
                        <div className="text-white font-medium">{selectedApplication.term}</div>
                      </div>
                      <div>
                        <span className="text-white/60 text-sm">Purpose</span>
                        <div className="text-white font-medium">{selectedApplication.purpose.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}</div>
                      </div>
                      <div>
                        <span className="text-white/60 text-sm">Home Ownership</span>
                        <div className="text-white font-medium">{selectedApplication.home_ownership}</div>
                      </div>
                      <div>
                        <span className="text-white/60 text-sm">State</span>
                        <div className="text-white font-medium">{selectedApplication.state}</div>
                      </div>
                      <div>
                        <span className="text-white/60 text-sm">Created At</span>
                        <div className="text-white font-medium">{new Date(selectedApplication.created_at).toLocaleString()}</div>
                      </div>
                    </div>
                  </div>

                  {/* Explanation */}
                  {selectedApplication.explanation && (
                    <ExplanationDisplay explanation={selectedApplication.explanation} pd={selectedApplication.pd} />
                  )}
                </div>
              )}
              </div>
            </div>
          </div>
        )}
        </div>
      </main>
  );
}