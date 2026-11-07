import React, { useState } from 'react';
import {
  FileText,
  Upload,
  Sparkles,
  Zap,
  ArrowRight,
  Image as ImageIcon,
  Building2,
  Share2,
} from 'lucide-react';
import { Brand, UserRole, Submission } from '../types';
import { DocumentParser } from '../services/parser';
import { StorageService } from '../services/storage';
import { GeminiService } from '../services/gemini';

interface SubmissionFormViewProps {
  brands: Brand[];
  selectedBrandId: string;
  currentRole: UserRole;
  onSubmissionCreated: (submissionId: string) => void;
  initialDemoContent?: boolean;
}

export const SubmissionFormView: React.FC<SubmissionFormViewProps> = ({
  brands,
  selectedBrandId,
  currentRole,
  onSubmissionCreated,
  initialDemoContent = false,
}) => {
  const [brandId, setBrandId] = useState(selectedBrandId);
  const [title, setTitle] = useState(
    initialDemoContent ? 'Q1 Global Product Launch Headline' : ''
  );
  const [channel, setChannel] = useState('LinkedIn Sponsored Post');
  const [content, setContent] = useState(
    initialDemoContent
      ? "Acme Cloud is the world's best platform and improves productivity by 95%. Try AcmeCloud Pro today!"
      : ''
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [parsingFile, setParsingFile] = useState(false);

  const selectedBrand = brands.find((b) => b.id === brandId) || brands[0];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParsingFile(true);
    try {
      const parsed = await DocumentParser.parseFile(file);
      setContent(parsed.text);
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    } catch (err) {
      console.error('File parsing error:', err);
    } finally {
      setParsingFile(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleLoadDemoAd = () => {
    setBrandId('brand-acme-cloud');
    setTitle('Q1 Global Product Launch Headline');
    setChannel('Social Ad & LinkedIn Sponsored Post');
    setContent(
      "Acme Cloud is the world's best platform and improves productivity by 95%. Try AcmeCloud Pro today!"
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !title.trim()) return;

    setIsSubmitting(true);

    const submissionId = `sub-${Date.now()}`;
    const newSubmission: Submission = {
      id: submissionId,
      brandId,
      title: title.trim(),
      channel,
      currentVersion: 1,
      status: 'In Review',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      versions: [
        {
          versionNumber: 1,
          content: content.trim(),
          submittedAt: new Date().toISOString(),
          submittedByRole: currentRole,
          submittedByName: `${currentRole} User`,
          riskScore: 0,
          findingsCount: 0,
        },
      ],
    };

    // If promotional image attached, run Visual Intelligence Lite
    if (imageFile && selectedBrand) {
      try {
        const visualResult = await GeminiService.analyzeVisualAsset(imageFile, selectedBrand);
        newSubmission.visualAnalysis = visualResult;
      } catch (e) {
        console.warn('Visual analysis error:', e);
      }
    }

    StorageService.saveSubmission(newSubmission);

    StorageService.addAuditEntry({
      submissionId,
      brandId,
      role: currentRole,
      actorName: `${currentRole} User`,
      action: 'CREATED',
      details: `Created new submission "${title}" for automated closed-knowledge review.`,
    });

    // Run Engine 1 & 2 analysis pipeline immediately
    try {
      const analysis = await GeminiService.analyzeContent(
        content.trim(),
        selectedBrand,
        submissionId,
        1
      );

      // Update submission with risk score
      newSubmission.versions[0].riskScore = analysis.riskScore;
      newSubmission.versions[0].findingsCount = analysis.findings.length;
      StorageService.saveSubmission(newSubmission);

      StorageService.addAuditEntry({
        submissionId,
        brandId,
        role: 'Admin',
        actorName: 'BrandGuard Automated Engine',
        action: 'ANALYSIS_RUN',
        details: `Analysis complete: Risk Score ${analysis.riskScore}/100 with ${analysis.findings.length} findings identified.`,
      });
    } catch (e) {
      console.error('Initial analysis run error:', e);
    } finally {
      setIsSubmitting(false);
      onSubmissionCreated(submissionId);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            <span>Module 3</span>
            <span>·</span>
            <span>Content Submission</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Submit Content for Governance Review
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Draft or paste copy to initiate Engine 1 (Brand style) & Engine 2 (Closed evidence verification).
          </p>
        </div>

        <button
          type="button"
          onClick={handleLoadDemoAd}
          className="px-3.5 py-2 text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg transition-colors inline-flex items-center gap-1.5 shadow-xs shrink-0"
        >
          <Zap className="w-4 h-4 text-amber-600" />
          Load Benchmark Demo Ad
        </button>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
        {/* Brand & Channel Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Target Brand Workspace
            </label>
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={brandId}
                onChange={(e) => setBrandId(e.target.value)}
                className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
              >
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} (v{b.guidelineVersion}.0 Guidelines)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Distribution Channel / Audience
            </label>
            <div className="flex items-center gap-2">
              <Share2 className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
              >
                <option value="LinkedIn Sponsored Post">LinkedIn Sponsored Post</option>
                <option value="Product Landing Page Copy">Product Landing Page Copy</option>
                <option value="Sales One-Pager / Slide Deck">Sales One-Pager / Slide Deck</option>
                <option value="Email Marketing Campaign">Email Marketing Campaign</option>
                <option value="Press Release / Media Advisory">Press Release / Media Advisory</option>
                <option value="Google Display Ad / SEM">Google Display Ad / SEM</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content Title */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Campaign / Document Title
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Q1 Global Product Launch Headline or Enterprise Security Pitch"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2.5 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 font-medium"
          />
        </div>

        {/* Content Body & File Upload Option */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Content Draft
            </label>
            <div className="flex items-center gap-2">
              <label className="cursor-pointer text-xs text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Document (PDF, DOCX, TXT)</span>
                <input
                  type="file"
                  accept=".pdf,.docx,.txt,.md"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <textarea
            rows={6}
            required
            placeholder="Paste your marketing copy, ad text, headline, or promotional draft here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full text-xs leading-relaxed bg-slate-50 border border-slate-300 rounded-lg p-3.5 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 font-sans"
          />
          {parsingFile && (
            <div className="text-xs text-blue-600 font-medium mt-1">
              Extracting text from uploaded file in-browser...
            </div>
          )}
        </div>

        {/* Optional Visual Asset (Visual Intelligence Lite) */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-purple-600" />
                Optional: Promotional Graphic / Ad Banner (Visual Intelligence Lite)
              </span>
              <p className="text-[11px] text-slate-500">
                Samples canvas pixels against approved brand hex colors and extracts banner text via OCR.
              </p>
            </div>

            <label className="cursor-pointer px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors inline-flex items-center gap-1 shadow-xs">
              <Upload className="w-3.5 h-3.5" />
              Attach Graphic
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
          </div>

          {imagePreview && (
            <div className="flex items-center gap-4 p-3 bg-purple-50/50 rounded-lg border border-purple-200 mt-2">
              <img
                src={imagePreview}
                alt="Uploaded Banner Preview"
                className="w-24 h-16 object-cover rounded border border-purple-200"
              />
              <div className="text-xs text-purple-900">
                <div className="font-semibold">{imageFile?.name}</div>
                <div className="text-[11px] text-purple-700">
                  Visual color sampling & OCR will execute alongside content review.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Submit Action */}
        <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Status will initialize to <strong className="text-amber-700">In Review</strong>. AI produces explainable findings; humans make the approval decision.
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !content.trim() || !title.trim()}
            className="px-6 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors inline-flex items-center gap-2 shadow-xs disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin" />
                Executing Brand & Evidence Intelligence...
              </>
            ) : (
              <>
                Run Closed Governance Analysis
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
