import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  Sparkles,
  RotateCcw,
  BookOpen,
  FileText,
  ThumbsUp,
  MessageSquare,
  History,
  Layers,
  Check,
  X,
  FileCheck2,
  Eye,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  Submission,
  Brand,
  UserRole,
  Finding,
  AnalysisResult,
  Severity,
  EngineType,
} from '../types';
import { StorageService } from '../services/storage';
import { GeminiService } from '../services/gemini';

interface ReviewResultViewProps {
  submissionId: string;
  brands: Brand[];
  currentRole: UserRole;
  onNavigateToTab: (tab: string) => void;
  onRefreshData: () => void;
}

export const ReviewResultView: React.FC<ReviewResultViewProps> = ({
  submissionId,
  brands,
  currentRole,
  onNavigateToTab,
  onRefreshData,
}) => {
  const submission = StorageService.getSubmission(submissionId);
  const brand = brands.find((b) => b.id === submission?.brandId) || brands[0];

  const [activeVersionIndex, setActiveVersionIndex] = useState(
    submission ? submission.versions.length - 1 : 0
  );
  const currentVersion = submission?.versions[activeVersionIndex];

  // Analysis State
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);

  // Filters
  const [severityFilter, setSeverityFilter] = useState<'ALL' | Severity>('ALL');
  const [engineFilter, setEngineFilter] = useState<'ALL' | 'Engine 1' | 'Engine 2'>('ALL');

  // AI Revision Diff View State
  const [activeTab, setActiveTab] = useState<'findings' | 'diff' | 'visual'>('findings');
  const [aiRevision, setAiRevision] = useState<{
    revisedContent: string;
    summaryOfChanges: string[];
  } | null>(null);
  const [isGeneratingRevision, setIsGeneratingRevision] = useState(false);

  // Creator editing state for resubmission
  const [isEditing, setIsEditing] = useState(false);
  const [editableContent, setEditableContent] = useState(currentVersion?.content || '');

  // Reviewer comment modal state
  const [showRequestChangesModal, setShowRequestChangesModal] = useState(false);
  const [reviewerComment, setReviewerComment] = useState('');

  // Load or trigger analysis
  const runAnalysis = async () => {
    if (!submission || !currentVersion || !brand) return;
    setIsAnalyzing(true);
    try {
      const result = await GeminiService.analyzeContent(
        currentVersion.content,
        brand,
        submission.id,
        currentVersion.versionNumber
      );
      setAnalysis(result);

      // Select first finding if available
      if (result.findings.length > 0) {
        setSelectedFindingId(result.findings[0].id);
      }
    } catch (e) {
      console.error('Failed to run analysis:', e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (submission && currentVersion && brand) {
      setEditableContent(currentVersion.content);
      const hash = GeminiService.computeHash(
        currentVersion.content,
        brand.id,
        brand.guidelineVersion,
        StorageService.getChunksByBrand(brand.id).length
      );
      const cached = StorageService.getAnalysis(hash);
      if (cached) {
        setAnalysis(cached);
        if (cached.findings.length > 0) {
          setSelectedFindingId(cached.findings[0].id);
        }
      } else {
        runAnalysis();
      }
    }
  }, [submissionId, activeVersionIndex]);

  if (!submission || !currentVersion || !brand) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12 text-center">
        <h2 className="text-lg font-bold text-slate-800">Submission not found</h2>
        <button
          onClick={() => onNavigateToTab('dashboard')}
          className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  // Filtered findings
  const filteredFindings = (analysis?.findings || []).filter((f) => {
    if (severityFilter !== 'ALL' && f.severity !== severityFilter) return false;
    if (engineFilter === 'Engine 1' && !f.engine.includes('Engine 1')) return false;
    if (engineFilter === 'Engine 2' && !f.engine.includes('Engine 2')) return false;
    return true;
  });

  // Apply single finding fix to editable content
  const handleApplySingleFix = (finding: Finding) => {
    if (!finding.suggestedFix) return;
    const updated = editableContent.replace(finding.highlight, finding.suggestedFix);
    setEditableContent(updated);
    setIsEditing(true);
  };

  // Generate full AI Revision
  const handleGenerateFullRevision = async () => {
    if (!analysis) return;
    setIsGeneratingRevision(true);
    try {
      const rev = await GeminiService.generateRevision(
        currentVersion.content,
        analysis.findings,
        brand
      );
      setAiRevision(rev);
      setActiveTab('diff');
    } catch (e) {
      console.error('Error generating full revision:', e);
    } finally {
      setIsGeneratingRevision(false);
    }
  };

  // Creator: Save revised content and submit version (v2, v3...)
  const handleResubmitRevision = async () => {
    if (!editableContent.trim()) return;

    const nextVerNumber = submission.versions.length + 1;
    const newVersion = {
      versionNumber: nextVerNumber,
      content: editableContent.trim(),
      submittedAt: new Date().toISOString(),
      submittedByRole: currentRole,
      submittedByName: `${currentRole} User`,
      riskScore: 0,
      findingsCount: 0,
    };

    const updatedSubmission: Submission = {
      ...submission,
      currentVersion: nextVerNumber,
      status: 'In Review',
      versions: [...submission.versions, newVersion],
      updatedAt: new Date().toISOString(),
    };

    StorageService.saveSubmission(updatedSubmission);
    StorageService.addAuditEntry({
      submissionId: submission.id,
      brandId: brand.id,
      role: currentRole,
      actorName: `${currentRole} User`,
      action: 'REVISED',
      details: `Submitted Revision v${nextVerNumber}.0 for automated governance verification.`,
    });

    setIsEditing(false);
    onRefreshData();
    setActiveVersionIndex(updatedSubmission.versions.length - 1);
  };

  // Reviewer: Approve content
  const handleApprove = () => {
    if (currentRole === 'Creator') {
      alert('Only a designated Reviewer or Admin can approve content for publication.');
      return;
    }

    const updated: Submission = {
      ...submission,
      status: 'Approved',
      updatedAt: new Date().toISOString(),
    };
    StorageService.saveSubmission(updated);

    StorageService.addAuditEntry({
      submissionId: submission.id,
      brandId: brand.id,
      role: currentRole,
      actorName: `${currentRole} Reviewer`,
      action: 'APPROVED',
      details: `Approved content version v${currentVersion.versionNumber}.0 for final publication.`,
    });

    onRefreshData();
  };

  // Reviewer: Request changes
  const handleRequestChanges = () => {
    if (currentRole === 'Creator') {
      alert('Only a designated Reviewer or Admin can request changes.');
      return;
    }

    const updated: Submission = {
      ...submission,
      status: 'Changes Requested',
      reviewerComment: reviewerComment.trim() || 'Please resolve identified compliance and factual findings.',
      updatedAt: new Date().toISOString(),
    };
    StorageService.saveSubmission(updated);

    StorageService.addAuditEntry({
      submissionId: submission.id,
      brandId: brand.id,
      role: currentRole,
      actorName: `${currentRole} Reviewer`,
      action: 'CHANGES_REQUESTED',
      details: `Requested revisions: "${updated.reviewerComment}"`,
    });

    setShowRequestChangesModal(false);
    onRefreshData();
  };

  // Render Highlighted Content
  const renderHighlightedContent = () => {
    const text = currentVersion.content;
    const findings = analysis?.findings || [];

    if (!findings.length) {
      return <p className="text-sm text-slate-800 leading-relaxed font-sans">{text}</p>;
    }

    // Sort findings by position if possible or highlight substrings
    const parts: { text: string; finding?: Finding }[] = [];
    let remaining = text;

    // Split text based on finding highlights
    // We sort highlights by length descending to match longer phrases first
    const sortedFindings = [...findings].sort(
      (a, b) => b.highlight.length - a.highlight.length
    );

    // Naive multi-phrase splitter
    let segments: { text: string; finding?: Finding }[] = [{ text }];

    for (const f of sortedFindings) {
      const newSegments: { text: string; finding?: Finding }[] = [];
      for (const seg of segments) {
        if (seg.finding) {
          newSegments.push(seg);
          continue;
        }

        const idx = seg.text.indexOf(f.highlight);
        if (idx >= 0) {
          const before = seg.text.substring(0, idx);
          const matched = seg.text.substring(idx, idx + f.highlight.length);
          const after = seg.text.substring(idx + f.highlight.length);

          if (before) newSegments.push({ text: before });
          newSegments.push({ text: matched, finding: f });
          if (after) newSegments.push({ text: after });
        } else {
          newSegments.push(seg);
        }
      }
      segments = newSegments;
    }

    return (
      <div className="text-sm leading-relaxed text-slate-800 font-sans whitespace-pre-wrap">
        {segments.map((seg, i) => {
          if (!seg.finding) {
            return <span key={i}>{seg.text}</span>;
          }

          const f = seg.finding;
          const isSelected = selectedFindingId === f.id;

          let highlightClasses = 'border-b-2 cursor-pointer transition-all px-0.5 rounded-xs ';
          if (f.severity === 'Critical') {
            highlightClasses += isSelected
              ? 'bg-rose-200 text-rose-950 border-rose-600 font-semibold ring-2 ring-rose-400'
              : 'bg-rose-100 text-rose-900 border-rose-500 hover:bg-rose-200';
          } else if (f.severity === 'High') {
            highlightClasses += isSelected
              ? 'bg-amber-200 text-amber-950 border-amber-600 font-semibold ring-2 ring-amber-400'
              : 'bg-amber-100 text-amber-900 border-amber-500 hover:bg-amber-200';
          } else {
            highlightClasses += isSelected
              ? 'bg-blue-200 text-blue-950 border-blue-600 font-semibold ring-2 ring-blue-400'
              : 'bg-blue-100 text-blue-900 border-blue-500 hover:bg-blue-200';
          }

          return (
            <mark
              key={i}
              onClick={() => setSelectedFindingId(f.id)}
              className={highlightClasses}
              title={`${f.category}: Click to view evidence rationale`}
            >
              {seg.text}
            </mark>
          );
        })}
      </div>
    );
  };

  const selectedFinding = analysis?.findings.find((f) => f.id === selectedFindingId);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      {/* Top Breadcrumb & Status Ribbon */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span
              onClick={() => onNavigateToTab('dashboard')}
              className="cursor-pointer hover:text-slate-800"
            >
              Dashboard
            </span>
            <span>/</span>
            <span>{brand.name}</span>
            <span>/</span>
            <span className="text-slate-900 font-semibold truncate max-w-md">
              {submission.title}
            </span>
          </div>

          <div className="flex items-center gap-3 mt-1.5">
            <h1 className="text-xl font-bold text-slate-900">{submission.title}</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
              {submission.channel}
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                submission.status === 'Approved'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                  : submission.status === 'Changes Requested'
                  ? 'bg-rose-50 text-rose-800 border border-rose-300'
                  : 'bg-amber-50 text-amber-800 border border-amber-300'
              }`}
            >
              {submission.status}
            </span>
          </div>
        </div>

        {/* Action Buttons: Workflow & Approvals */}
        <div className="flex items-center gap-3">
          {submission.status !== 'Approved' && (
            <>
              {currentRole !== 'Creator' && (
                <>
                  <button
                    onClick={() => setShowRequestChangesModal(true)}
                    className="px-3.5 py-2 text-xs font-semibold text-rose-700 bg-white border border-rose-300 rounded-lg hover:bg-rose-50 transition-colors shadow-xs"
                  >
                    Request Changes
                  </button>
                  <button
                    onClick={handleApprove}
                    className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors inline-flex items-center gap-1.5 shadow-xs"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Approve Content
                  </button>
                </>
              )}

              {currentRole === 'Creator' && (
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
                >
                  {isEditing ? 'Cancel Edit' : 'Edit & Revise Draft'}
                </button>
              )}
            </>
          )}

          <button
            onClick={runAnalysis}
            disabled={isAnalyzing}
            className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-xs"
            title="Re-run analysis engine"
          >
            <RotateCcw className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Reviewer Comment Banner (if Changes Requested) */}
      {submission.reviewerComment && submission.status === 'Changes Requested' && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start gap-3">
          <MessageSquare className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="font-semibold">Reviewer Revision Request:</strong>
            <p className="text-rose-800 leading-relaxed">{submission.reviewerComment}</p>
          </div>
        </div>
      )}

      {/* Score and Metrics Bar */}
      {analysis && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Overall Risk Score
            </div>
            <div className="flex items-baseline gap-2">
              <span
                className={`text-2xl font-bold font-mono tabular-nums ${
                  analysis.riskScore >= 60
                    ? 'text-rose-600'
                    : analysis.riskScore >= 35
                    ? 'text-amber-600'
                    : 'text-emerald-600'
                }`}
              >
                {analysis.riskScore}
              </span>
              <span className="text-xs text-slate-400">/100</span>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded ${
                  analysis.riskLevel === 'Critical'
                    ? 'bg-rose-50 text-rose-700'
                    : analysis.riskLevel === 'Moderate'
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-emerald-50 text-emerald-700'
                }`}
              >
                {analysis.riskLevel}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Brand Tone Score
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                {analysis.toneScore || 85}
              </span>
              <span className="text-xs text-slate-400">/100</span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Supported Claims
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-emerald-600">
              {analysis.supportedClaimsCount}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Contradicted Claims
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-rose-600">
              {analysis.contradictedClaimsCount}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Unverified Claims
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-amber-600">
              {analysis.unverifiedClaimsCount}
            </div>
          </div>
        </div>
      )}

      {/* Main Workspace: Left Column (Content & Highlights) | Right Column (Explainable Findings & Diff) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 6 Columns: Content Viewport & Version History */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            {/* Version Switcher Bar */}
            <div className="p-3 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-slate-400" />
                <span className="font-semibold text-slate-700">Content Version:</span>
                <div className="flex items-center gap-1">
                  {submission.versions.map((ver, idx) => (
                    <button
                      key={ver.versionNumber}
                      onClick={() => {
                        setActiveVersionIndex(idx);
                        setIsEditing(false);
                      }}
                      className={`px-2 py-0.5 rounded text-xs font-mono font-medium ${
                        activeVersionIndex === idx
                          ? 'bg-slate-900 text-white'
                          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      v{ver.versionNumber}.0
                    </button>
                  ))}
                </div>
              </div>

              <span className="text-slate-400">
                Submitted by {currentVersion.submittedByName}
              </span>
            </div>

            {/* Content Area */}
            <div className="p-6">
              {isEditing ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span>Direct Content Revision:</span>
                    <span className="text-blue-600">Editing as {currentRole}</span>
                  </div>
                  <textarea
                    rows={8}
                    value={editableContent}
                    onChange={(e) => setEditableContent(e.target.value)}
                    className="w-full text-sm leading-relaxed p-4 bg-slate-50 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => {
                        setEditableContent(currentVersion.content);
                        setIsEditing(false);
                      }}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
                    >
                      Discard
                    </button>
                    <button
                      onClick={handleResubmitRevision}
                      className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs"
                    >
                      Submit Revision v{submission.versions.length + 1}.0
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Interactive Text Inspector
                    </span>
                    <span className="text-xs text-slate-400">
                      Click highlighted spans to inspect findings
                    </span>
                  </div>

                  {renderHighlightedContent()}

                  {analysis && analysis.findings.length === 0 && (
                    <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <span>
                        Clean content! No prohibited terminology, superlatives, or contradicted claims detected.
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Tone Feedback Footer */}
            {analysis?.toneSummary && (
              <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold text-slate-900">Engine 1 Voice Feedback:</strong>{' '}
                  {analysis.toneSummary}
                </div>
              </div>
            )}
          </div>

          {/* Quick AI Correction Generator Button */}
          {analysis && analysis.findings.length > 0 && !isEditing && (
            <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  AI Brand Correction Assistant
                </h4>
                <p className="text-[11px] text-indigo-800 mt-0.5">
                  Generate an enterprise-compliant draft resolving all {analysis.findings.length} findings while preserving your original persuasive voice.
                </p>
              </div>

              <button
                onClick={handleGenerateFullRevision}
                disabled={isGeneratingRevision}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors inline-flex items-center gap-1.5 shadow-xs shrink-0 disabled:opacity-50"
              >
                {isGeneratingRevision ? 'Generating...' : 'Generate Full Revision'}
              </button>
            </div>
          )}
        </div>

        {/* Right 6 Columns: Findings Panel / Diff View / Visual Inspector */}
        <div className="lg:col-span-6 space-y-4">
          {/* Segmented View Tabs */}
          <div className="flex items-center justify-between bg-slate-100 p-1 rounded-lg border border-slate-200">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveTab('findings')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  activeTab === 'findings'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Explainable Findings ({filteredFindings.length})
              </button>
              <button
                onClick={() => {
                  setActiveTab('diff');
                  if (!aiRevision) handleGenerateFullRevision();
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  activeTab === 'diff'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                AI Corrections & Diff
              </button>
              {submission.visualAnalysis && (
                <button
                  onClick={() => setActiveTab('visual')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    activeTab === 'visual'
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Visual Intelligence
                </button>
              )}
            </div>
          </div>

          {/* TAB 1: EXPLAINABLE FINDINGS */}
          {activeTab === 'findings' && (
            <div className="space-y-4">
              {/* Filter controls */}
              <div className="flex items-center justify-between text-xs text-slate-600 gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-slate-400">Severity:</span>
                  {(['ALL', 'Critical', 'High', 'Medium'] as const).map((sev) => (
                    <button
                      key={sev}
                      onClick={() => setSeverityFilter(sev)}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                        severityFilter === sev
                          ? 'bg-slate-900 text-white'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-slate-400">Engine:</span>
                  {(['ALL', 'Engine 1', 'Engine 2'] as const).map((eng) => (
                    <button
                      key={eng}
                      onClick={() => setEngineFilter(eng)}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                        engineFilter === eng
                          ? 'bg-slate-900 text-white'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {eng}
                    </button>
                  ))}
                </div>
              </div>

              {/* Findings List */}
              <div className="space-y-3">
                {filteredFindings.map((finding) => {
                  const isSelected = selectedFindingId === finding.id;

                  let cardBorder = 'border-slate-200 hover:border-slate-300';
                  let badgeClass = 'bg-slate-100 text-slate-700';

                  if (finding.severity === 'Critical') {
                    cardBorder = isSelected
                      ? 'border-rose-500 ring-2 ring-rose-200'
                      : 'border-rose-200 hover:border-rose-400';
                    badgeClass = 'bg-rose-50 text-rose-800 border-rose-200';
                  } else if (finding.severity === 'High') {
                    cardBorder = isSelected
                      ? 'border-amber-500 ring-2 ring-amber-200'
                      : 'border-amber-200 hover:border-amber-400';
                    badgeClass = 'bg-amber-50 text-amber-800 border-amber-200';
                  } else {
                    cardBorder = isSelected
                      ? 'border-blue-500 ring-2 ring-blue-200'
                      : 'border-blue-200 hover:border-blue-400';
                    badgeClass = 'bg-blue-50 text-blue-800 border-blue-200';
                  }

                  return (
                    <div
                      key={finding.id}
                      onClick={() => setSelectedFindingId(finding.id)}
                      className={`bg-white rounded-xl border p-5 shadow-xs transition-all cursor-pointer ${cardBorder}`}
                    >
                      {/* Top Header of Finding Card */}
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${badgeClass}`}
                            >
                              {finding.severity}
                            </span>
                            <span className="text-xs font-semibold text-slate-900">
                              {finding.category.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400">{finding.engine}</div>
                        </div>

                        {finding.suggestedFix && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApplySingleFix(finding);
                            }}
                            className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded transition-colors whitespace-nowrap shadow-xs"
                          >
                            Apply Fix
                          </button>
                        )}
                      </div>

                      {/* Flagged Snippet */}
                      <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-800 font-mono mb-3">
                        <span className="text-slate-400 select-none mr-1.5">Flagged:</span>
                        <span className="font-semibold text-rose-700">"{finding.highlight}"</span>
                      </div>

                      {/* Rationale / Why it matters */}
                      <div className="text-xs text-slate-600 leading-relaxed space-y-2">
                        <p>{finding.explanation}</p>

                        {/* Evidence Citation (for Engine 2) */}
                        {finding.evidenceCitation && (
                          <div className="p-2.5 bg-blue-50/60 rounded border border-blue-200 text-[11px] text-blue-900 space-y-1">
                            <div className="font-semibold flex items-center gap-1.5">
                              <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                              Closed KB Citation: {finding.evidenceCitation}
                            </div>
                            {finding.citedChunkText && (
                              <p className="italic text-slate-600 font-sans">
                                "{finding.citedChunkText}"
                              </p>
                            )}
                          </div>
                        )}

                        {/* Suggested Alternative */}
                        {finding.suggestedFix && (
                          <div className="pt-2 border-t border-slate-100 flex items-start gap-1.5 text-xs text-emerald-800">
                            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                            <span>
                              <strong>Recommended Phrasing:</strong> "{finding.suggestedFix}"
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {filteredFindings.length === 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-xs text-slate-500">
                    No findings match the selected severity and engine filters.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: AI CORRECTIONS & DIFF */}
          {activeTab === 'diff' && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    AI Correction & Side-by-Side Review
                  </h3>
                  <p className="text-xs text-slate-500">
                    Preserves original meaning while bringing copy into strict compliance with closed knowledge.
                  </p>
                </div>

                <button
                  onClick={handleGenerateFullRevision}
                  disabled={isGeneratingRevision}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-300 rounded hover:bg-slate-100 transition-colors inline-flex items-center gap-1"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isGeneratingRevision ? 'animate-spin' : ''}`} />
                  Regenerate
                </button>
              </div>

              {isGeneratingRevision ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  <Sparkles className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-2" />
                  Generating compliant revision from approved brand guidelines and evidence...
                </div>
              ) : aiRevision ? (
                <div className="space-y-4">
                  {/* Side-by-side or stacked diff */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Original */}
                    <div className="p-4 rounded-lg bg-rose-50/50 border border-rose-200 text-xs space-y-2">
                      <div className="font-semibold text-rose-900 flex items-center gap-1.5">
                        <XCircle className="w-4 h-4 text-rose-600" />
                        Original Content (v{currentVersion.versionNumber}.0)
                      </div>
                      <p className="text-slate-800 leading-relaxed font-sans">
                        {currentVersion.content}
                      </p>
                    </div>

                    {/* AI Revised */}
                    <div className="p-4 rounded-lg bg-emerald-50/50 border border-emerald-200 text-xs space-y-2">
                      <div className="font-semibold text-emerald-900 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Compliant Revision (Ready for Publication)
                      </div>
                      <p className="text-slate-800 leading-relaxed font-sans font-medium">
                        {aiRevision.revisedContent}
                      </p>
                    </div>
                  </div>

                  {/* Summary of Changes */}
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-2">
                    <div className="font-semibold text-slate-900">Applied Adjustments:</div>
                    <ul className="list-disc list-inside space-y-1 text-slate-600">
                      {aiRevision.summaryOfChanges.map((change, idx) => (
                        <li key={idx}>{change}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Accept & Adopt Revision Button */}
                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => {
                        setEditableContent(aiRevision.revisedContent);
                        setIsEditing(true);
                      }}
                      className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors inline-flex items-center gap-1.5 shadow-xs"
                    >
                      <Check className="w-4 h-4" />
                      Adopt into Editor as Revision v{submission.versions.length + 1}.0
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-500">
                  Click below to generate an AI revised copy with all findings addressed.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: VISUAL INTELLIGENCE LITE */}
          {activeTab === 'visual' && submission.visualAnalysis && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Visual Intelligence Lite: Graphic Inspection
                </h3>
                <p className="text-xs text-slate-500">
                  Dominant canvas color sampling against approved brand hex palette and OCR text extraction.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 items-start">
                <img
                  src={submission.visualAnalysis.imageUrl}
                  alt="Promotional Asset"
                  className="w-48 h-32 object-cover rounded-lg border border-slate-200 shadow-xs shrink-0"
                />

                <div className="space-y-3 flex-1 text-xs">
                  <div>
                    <span className="font-semibold text-slate-700">Palette Compliance Score:</span>
                    <div className="text-xl font-bold font-mono text-blue-600 mt-0.5">
                      {submission.visualAnalysis.complianceScore}%
                    </div>
                  </div>

                  {/* Palette Matches */}
                  <div className="space-y-1.5">
                    <div className="font-semibold text-slate-700">Hex Palette Comparison:</div>
                    {submission.visualAnalysis.paletteMatches.map((m, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-200 text-[11px]">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-4 h-4 rounded border border-slate-300"
                            style={{ backgroundColor: m.detectedHex }}
                          />
                          <span>{m.target} (Approved: {m.brandHex})</span>
                        </div>
                        <span className={`font-medium ${m.isCompliant ? 'text-emerald-700' : 'text-amber-700'}`}>
                          {m.isCompliant ? 'Compliant' : `Divergent (Δ ${m.distance})`}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* OCR Extracted Text */}
                  {submission.visualAnalysis.extractedText && (
                    <div className="p-3 bg-purple-50/60 rounded border border-purple-200 text-purple-900 space-y-1">
                      <div className="font-semibold text-[11px]">OCR Extracted Copy:</div>
                      <p className="text-[11px] font-mono leading-normal">
                        "{submission.visualAnalysis.extractedText}"
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reviewer Comment Modal for "Request Changes" */}
      {showRequestChangesModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                Request Changes from Creator
              </h3>
              <button
                onClick={() => setShowRequestChangesModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold px-2"
              >
                ×
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Feedback & Specific Revision Instructions
              </label>
              <textarea
                rows={4}
                required
                placeholder="Detail what claims must be substantiated, which terms to replace, or tone guidelines to apply..."
                value={reviewerComment}
                onChange={(e) => setReviewerComment(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-3 text-slate-900 focus:outline-none focus:ring-1 focus:ring-rose-500 font-sans"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                onClick={() => setShowRequestChangesModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestChanges}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors shadow-xs"
              >
                Send Feedback to Creator
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
