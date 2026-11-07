import React, { useState } from 'react';
import {
  History,
  FileCheck2,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  MessageSquare,
  Search,
  Filter,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { AuditEntry, Brand, AuditAction } from '../types';
import { StorageService } from '../services/storage';

interface AuditHistoryViewProps {
  brands: Brand[];
  selectedBrandId: string;
  onOpenSubmission: (submissionId: string) => void;
}

export const AuditHistoryView: React.FC<AuditHistoryViewProps> = ({
  brands,
  selectedBrandId,
  onOpenSubmission,
}) => {
  const allLogs = StorageService.getAuditLogs();
  const [filterAction, setFilterAction] = useState<'ALL' | AuditAction>('ALL');
  const [search, setSearch] = useState('');

  const filteredLogs = allLogs.filter((log) => {
    if (filterAction !== 'ALL' && log.action !== filterAction) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        log.actorName.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getActionBadge = (action: AuditAction) => {
    switch (action) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Approved for Publication
          </span>
        );
      case 'CHANGES_REQUESTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-300">
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            Changes Requested
          </span>
        );
      case 'ANALYSIS_RUN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
            <Sparkles className="w-3 h-3 text-blue-600" />
            Automated Analysis Run
          </span>
        );
      case 'REVISED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200">
            <History className="w-3 h-3 text-indigo-600" />
            Content Revision
          </span>
        );
      case 'CREATED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-300">
            <FileCheck2 className="w-3 h-3 text-slate-600" />
            Initial Draft Created
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-300">
            {action}
          </span>
        );
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            <span>Module 9</span>
            <span>·</span>
            <span>Compliance & Audit Trail</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Governance Audit Timeline
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Immutable log of all content submissions, analysis evaluations, comments, and reviewer approvals.
          </p>
        </div>

        {/* Action Filters */}
        <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
          {(['ALL', 'CREATED', 'ANALYSIS_RUN', 'CHANGES_REQUESTED', 'APPROVED'] as const).map(
            (act) => (
              <button
                key={act}
                onClick={() => setFilterAction(act)}
                className={`px-2.5 py-1 font-medium rounded transition-colors whitespace-nowrap ${
                  filterAction === act
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {act === 'ALL' ? 'All Events' : act.replace('_', ' ')}
              </button>
            )
          )}
        </div>
      </div>

      {/* Search Input */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          type="text"
          placeholder="Filter audit entries by actor name, feedback comment, or action details..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 text-xs bg-transparent border-none text-slate-900 focus:outline-none"
        />
        <span className="text-xs text-slate-400 font-mono">
          {filteredLogs.length} entries
        </span>
      </div>

      {/* Timeline List */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        {filteredLogs.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            No audit logs found matching your filter criteria.
          </div>
        ) : (
          <div className="relative border-l-2 border-slate-200 ml-4 space-y-6 my-2">
            {filteredLogs.map((entry) => (
              <div key={entry.id} className="relative pl-6">
                {/* Timeline node icon */}
                <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-white border-2 border-blue-600" />

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2 hover:border-slate-300 transition-colors">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      {getActionBadge(entry.action)}
                      <span className="font-semibold text-slate-900">{entry.actorName}</span>
                      <span className="text-slate-400">({entry.role})</span>
                    </div>

                    <span className="font-mono text-[11px] text-slate-400">
                      {new Date(entry.timestamp).toLocaleString()}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed font-sans">
                    {entry.details}
                  </p>

                  {entry.submissionId && (
                    <div className="pt-2 border-t border-slate-200/60 flex justify-end">
                      <button
                        onClick={() => onOpenSubmission(entry.submissionId)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1"
                      >
                        Inspect Submission <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
