import React from 'react';
import {
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Zap,
  ShieldAlert,
  Database,
  Layers,
} from 'lucide-react';
import { Submission, Brand } from '../types';

interface DashboardViewProps {
  submissions: Submission[];
  activeBrand: Brand;
  onOpenSubmission: (submissionId: string) => void;
  onRunDemoAd: () => void;
  onNewSubmission: () => void;
  onNavigateToTab: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  submissions,
  activeBrand,
  onOpenSubmission,
  onRunDemoAd,
  onNewSubmission,
  onNavigateToTab,
}) => {
  const brandSubmissions = submissions.filter((s) => s.brandId === activeBrand.id);

  const totalCount = brandSubmissions.length;
  const inReviewCount = brandSubmissions.filter((s) => s.status === 'In Review').length;
  const changesCount = brandSubmissions.filter((s) => s.status === 'Changes Requested').length;
  const approvedCount = brandSubmissions.filter((s) => s.status === 'Approved').length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-6 py-8">
      {/* Hero Strip */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <span>Enterprise Brand Governance</span>
            <span>·</span>
            <span>Closed-Knowledge Standard</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Governance Workspace: {activeBrand.name}
          </h1>
          <p className="text-sm text-slate-600 max-w-2xl">
            Automated closed-knowledge verification pipeline. Every marketing claim is checked against approved documents before publication. Missing evidence is categorized as{' '}
            <strong className="text-slate-900 font-semibold">Unverified</strong>, never guessed.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onRunDemoAd}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg transition-colors whitespace-nowrap shadow-xs"
          >
            <Zap className="w-4 h-4 text-amber-600" />
            Quick Run Benchmark Demo Ad
          </button>
          <button
            onClick={onNewSubmission}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shadow-xs"
          >
            New Submission
          </button>
        </div>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-3">
            <span>Total Submissions</span>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-3xl font-bold text-slate-900 font-mono tabular-nums">
            {totalCount}
          </div>
          <div className="text-xs text-slate-500 mt-2">Active brand marketing assets</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-3">
            <span>Pending Review</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-3xl font-bold text-amber-600 font-mono tabular-nums">
            {inReviewCount}
          </div>
          <div className="text-xs text-slate-500 mt-2">Awaiting reviewer sign-off</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-3">
            <span>Changes Requested</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-3xl font-bold text-rose-600 font-mono tabular-nums">
            {changesCount}
          </div>
          <div className="text-xs text-slate-500 mt-2">Requires creator revision</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-3">
            <span>Approved for Publication</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-bold text-emerald-600 font-mono tabular-nums">
            {approvedCount}
          </div>
          <div className="text-xs text-slate-500 mt-2">Human reviewer cleared</div>
        </div>
      </div>

      {/* Two Column Grid: Pipeline Architecture & Top Violations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline Architecture Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2">
              <Database className="w-3.5 h-3.5" />
              <span>Closed Governance Engine</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">
              Two-Engine Verification Stack
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Designed for enterprise compliance and legal review accuracy without risk of AI hallucinations.
            </p>

            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-xs font-bold text-slate-900 mb-1 flex items-center justify-between">
                  <span>Engine 1: Brand Intelligence</span>
                  <span className="text-[10px] text-slate-500 font-mono">STYLE & VOICE</span>
                </div>
                <div className="text-xs text-slate-600 leading-normal">
                  Deterministic code rules execute first for prohibited phrases, superlative patterns, and product name typos. Gemini assesses contextual tone consistency.
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-xs font-bold text-slate-900 mb-1 flex items-center justify-between">
                  <span>Engine 2: Evidence Intelligence</span>
                  <span className="text-[10px] text-slate-500 font-mono">CLOSED KB</span>
                </div>
                <div className="text-xs text-slate-600 leading-normal">
                  Extracts claims, retrieves matching chunks via BM25, and validates strictly against uploaded documents. Outputs Supported, Contradicted, or Unverified.
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Guidelines Version: {activeBrand.guidelineVersion}.0</span>
            <button
              onClick={() => onNavigateToTab('knowledge-base')}
              className="text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1"
            >
              Manage KB Chunks <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Top Recurring Violations Card */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Top Enterprise Violations & Compliance Risks
              </h3>
              <p className="text-xs text-slate-500">
                Aggregated cross-campaign findings from automated analysis runs
              </p>
            </div>
            <span className="text-xs text-slate-500 font-mono">Last 30 Days</span>
          </div>

          <div className="space-y-3.5">
            <div>
              <div className="flex items-center justify-between text-xs font-medium text-slate-700 mb-1">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  Unsupported Superlatives ("world's best", "#1", "unrivaled")
                </span>
                <span className="font-mono tabular-nums text-slate-900 font-semibold">41%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-rose-500 h-full rounded-full" style={{ width: '41%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-medium text-slate-700 mb-1">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  Unverified Quantitative Claims (missing benchmark citations)
                </span>
                <span className="font-mono tabular-nums text-slate-900 font-semibold">29%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full rounded-full" style={{ width: '29%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-medium text-slate-700 mb-1">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                  Unauthorized Product Tiers & Spelling ("AcmeCloud Pro")
                </span>
                <span className="font-mono tabular-nums text-slate-900 font-semibold">18%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-indigo-500 h-full rounded-full" style={{ width: '18%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-medium text-slate-700 mb-1">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                  Prohibited Security Terms ("hack-proof", "unbreakable")
                </span>
                <span className="font-mono tabular-nums text-slate-900 font-semibold">12%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-slate-500 h-full rounded-full" style={{ width: '12%' }}></div>
              </div>
            </div>
          </div>

          <div className="mt-5 p-3 rounded-lg bg-blue-50/70 border border-blue-200 text-xs text-blue-900 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold">Governance Insight:</strong> 85% of findings are automatically resolved by creators using AI Corrections before reviewer sign-off, reducing approval latency by 3.2 days.
            </div>
          </div>
        </div>
      </div>

      {/* Recent Submissions Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Recent Content Submissions</h3>
            <p className="text-xs text-slate-500">
              Live submission queue and risk score evaluations for {activeBrand.name}
            </p>
          </div>
          <button
            onClick={() => onNavigateToTab('approval-queue')}
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1"
          >
            View Full Queue <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {brandSubmissions.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <div className="text-sm font-semibold text-slate-700">No submissions yet</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              Submit your first marketing copy or ad draft to trigger the closed-knowledge analysis.
            </p>
            <button
              onClick={onNewSubmission}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Submit Content
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-xs font-semibold">
                  <th className="py-3 px-5">Content Title</th>
                  <th className="py-3 px-4">Channel</th>
                  <th className="py-3 px-4">Version</th>
                  <th className="py-3 px-4">Risk Level</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Submitted Date</th>
                  <th className="py-3 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs text-slate-700">
                {brandSubmissions.map((sub) => {
                  const latestVer = sub.versions[sub.versions.length - 1];
                  const riskScore = latestVer?.riskScore ?? 0;
                  let riskBadgeColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
                  let riskLabel = 'Low Risk';

                  if (riskScore >= 60) {
                    riskBadgeColor = 'text-rose-700 bg-rose-50 border-rose-200';
                    riskLabel = 'Critical Risk';
                  } else if (riskScore >= 35) {
                    riskBadgeColor = 'text-amber-700 bg-amber-50 border-amber-200';
                    riskLabel = 'Moderate Risk';
                  }

                  let statusBadgeColor = 'text-slate-600 bg-slate-100';
                  if (sub.status === 'Approved') statusBadgeColor = 'text-emerald-700 bg-emerald-50 border border-emerald-200';
                  if (sub.status === 'Changes Requested') statusBadgeColor = 'text-rose-700 bg-rose-50 border border-rose-200';
                  if (sub.status === 'In Review') statusBadgeColor = 'text-amber-700 bg-amber-50 border border-amber-200';

                  return (
                    <tr
                      key={sub.id}
                      className="hover:bg-slate-50/60 transition-colors cursor-pointer"
                      onClick={() => onOpenSubmission(sub.id)}
                    >
                      <td className="py-3.5 px-5 font-semibold text-slate-900">
                        {sub.title}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{sub.channel}</td>
                      <td className="py-3.5 px-4 font-mono">v{sub.currentVersion}.0</td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${riskBadgeColor}`}>
                          {riskLabel} ({riskScore})
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium ${statusBadgeColor}`}>
                          {sub.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono tabular-nums text-slate-500">
                        {new Date(sub.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenSubmission(sub.id);
                          }}
                          className="px-3 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors inline-flex items-center gap-1"
                        >
                          Review <ArrowRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
