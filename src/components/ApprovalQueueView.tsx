import React, { useState } from 'react';
import {
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Search,
  ArrowRight,
  Filter,
  Check,
  Building2,
} from 'lucide-react';
import { Submission, Brand, UserRole, SubmissionStatus } from '../types';
import { StorageService } from '../services/storage';

interface ApprovalQueueViewProps {
  submissions: Submission[];
  brands: Brand[];
  activeBrandId: string;
  currentRole: UserRole;
  onOpenSubmission: (submissionId: string) => void;
  onRefreshData: () => void;
}

export const ApprovalQueueView: React.FC<ApprovalQueueViewProps> = ({
  submissions,
  brands,
  activeBrandId,
  currentRole,
  onOpenSubmission,
  onRefreshData,
}) => {
  const [statusFilter, setStatusFilter] = useState<'ALL' | SubmissionStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = submissions.filter((s) => {
    if (activeBrandId && s.brandId !== activeBrandId) return false;
    if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        s.title.toLowerCase().includes(q) ||
        s.channel.toLowerCase().includes(q) ||
        s.versions.some((v) => v.content.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleQuickApprove = (e: React.MouseEvent, sub: Submission) => {
    e.stopPropagation();
    if (currentRole === 'Creator') {
      alert('Only Reviewer or Admin can approve content.');
      return;
    }

    const updated: Submission = {
      ...sub,
      status: 'Approved',
      updatedAt: new Date().toISOString(),
    };
    StorageService.saveSubmission(updated);

    StorageService.addAuditEntry({
      submissionId: sub.id,
      brandId: sub.brandId,
      role: currentRole,
      actorName: `${currentRole} Reviewer`,
      action: 'APPROVED',
      details: `Quick-approved content "${sub.title}" from queue.`,
    });

    onRefreshData();
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            <span>Module 8</span>
            <span>·</span>
            <span>Governance Workflow</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Human Approval Queue
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Human reviewers make the final publication decisions. AI provides explainability and risk signals.
          </p>
        </div>

        {/* Status Filter Chips */}
        <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
          {(['ALL', 'In Review', 'Changes Requested', 'Approved'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {st === 'ALL' ? 'All Submissions' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          type="text"
          placeholder="Search submissions by title, channel, or keyword..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 text-xs bg-transparent border-none text-slate-900 focus:outline-none"
        />
        <span className="text-xs text-slate-400 font-mono">
          {filtered.length} results
        </span>
      </div>

      {/* Submissions List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <div className="font-semibold text-slate-700">No submissions found</div>
            <p className="mt-1">Try switching status filters or clearing the search query.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-xs font-semibold">
                  <th className="py-3 px-5">Title & Channel</th>
                  <th className="py-3 px-4">Brand</th>
                  <th className="py-3 px-4">Version</th>
                  <th className="py-3 px-4">Risk Evaluation</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Last Updated</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs text-slate-700">
                {filtered.map((sub) => {
                  const brand = brands.find((b) => b.id === sub.brandId);
                  const latestVer = sub.versions[sub.versions.length - 1];
                  const riskScore = latestVer?.riskScore ?? 0;

                  let riskColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
                  let riskLabel = 'Low Risk';
                  if (riskScore >= 60) {
                    riskColor = 'text-rose-700 bg-rose-50 border-rose-200';
                    riskLabel = 'Critical Risk';
                  } else if (riskScore >= 35) {
                    riskColor = 'text-amber-700 bg-amber-50 border-amber-200';
                    riskLabel = 'Moderate Risk';
                  }

                  let statusColor = 'bg-slate-100 text-slate-700';
                  if (sub.status === 'Approved') statusColor = 'bg-emerald-50 text-emerald-800 border-emerald-300';
                  if (sub.status === 'Changes Requested') statusColor = 'bg-rose-50 text-rose-800 border-rose-300';
                  if (sub.status === 'In Review') statusColor = 'bg-amber-50 text-amber-800 border-amber-300';

                  return (
                    <tr
                      key={sub.id}
                      onClick={() => onOpenSubmission(sub.id)}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                    >
                      <td className="py-4 px-5">
                        <div className="font-semibold text-slate-900">{sub.title}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{sub.channel}</div>
                      </td>
                      <td className="py-4 px-4 font-medium text-slate-800">
                        {brand?.name || 'Acme Cloud'}
                      </td>
                      <td className="py-4 px-4 font-mono">v{sub.currentVersion}.0</td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${riskColor}`}>
                          {riskLabel} ({riskScore})
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${statusColor}`}>
                          {sub.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-mono text-slate-500">
                        {new Date(sub.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-5 text-right space-x-2">
                        {sub.status !== 'Approved' && currentRole !== 'Creator' && (
                          <button
                            onClick={(e) => handleQuickApprove(e, sub)}
                            className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded transition-colors inline-flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" />
                            Approve
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenSubmission(sub.id);
                          }}
                          className="px-3 py-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors inline-flex items-center gap-1"
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
