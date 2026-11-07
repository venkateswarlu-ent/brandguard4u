import React, { useState } from 'react';
import {
  Building2,
  Plus,
  Trash2,
  Save,
  Check,
  AlertCircle,
  Palette,
  Shield,
  FileCheck,
  Ban,
  Tag,
  Upload,
} from 'lucide-react';
import { Brand, UserRole } from '../types';
import { StorageService } from '../services/storage';

interface BrandWorkspaceViewProps {
  brands: Brand[];
  selectedBrandId: string;
  onSelectBrand: (brandId: string) => void;
  onRefreshBrands: () => void;
  currentRole: UserRole;
}

export const BrandWorkspaceView: React.FC<BrandWorkspaceViewProps> = ({
  brands,
  selectedBrandId,
  onSelectBrand,
  onRefreshBrands,
  currentRole,
}) => {
  const selectedBrand = brands.find((b) => b.id === selectedBrandId) || brands[0];

  const [formData, setFormData] = useState<Brand>(selectedBrand);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // New item input states
  const [newProductName, setNewProductName] = useState('');
  const [newApprovedTerm, setNewApprovedTerm] = useState('');
  const [newProhibitedTerm, setNewProhibitedTerm] = useState('');
  const [newProhibitedPattern, setNewProhibitedPattern] = useState('');

  // Switch edited brand when selection changes
  React.useEffect(() => {
    if (selectedBrand) {
      setFormData(selectedBrand);
      setIsCreatingNew(false);
      setSaveSuccess(false);
    }
  }, [selectedBrandId]);

  const isAdmin = currentRole === 'Admin';

  const handleSave = () => {
    if (!isAdmin) return;

    const updated: Brand = {
      ...formData,
      guidelineVersion: formData.guidelineVersion + 1,
      updatedAt: new Date().toISOString(),
    };

    StorageService.saveBrand(updated);
    onRefreshBrands();
    setSaveSuccess(true);
    setIsCreatingNew(false);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleCreateNewBrand = () => {
    const newBrand: Brand = {
      id: `brand-${Date.now()}`,
      name: 'New Brand Profile',
      brandColors: {
        primary: '#0F172A',
        secondary: '#2563EB',
        accent: '#10B981',
      },
      approvedProductNames: ['Core Product'],
      toneDescription: 'Clear, authentic, customer-focused, and evidence-grounded.',
      approvedTerms: ['enterprise-grade', 'verified'],
      prohibitedTerms: ['hack-proof', 'magical'],
      prohibitedPatterns: ["world's best", '#1'],
      guidelineVersion: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    StorageService.saveBrand(newBrand);
    onRefreshBrands();
    onSelectBrand(newBrand.id);
    setFormData(newBrand);
    setIsCreatingNew(false);
  };

  const handleDeleteBrand = () => {
    if (brands.length <= 1) {
      alert('At least one brand must remain in the workspace.');
      return;
    }
    if (confirm(`Are you sure you want to delete brand "${formData.name}"?`)) {
      StorageService.deleteBrand(formData.id);
      onRefreshBrands();
      const remaining = brands.filter((b) => b.id !== formData.id);
      if (remaining.length) {
        onSelectBrand(remaining[0].id);
      }
    }
  };

  // Add / Remove helper functions
  const addTag = (
    field: 'approvedProductNames' | 'approvedTerms' | 'prohibitedTerms' | 'prohibitedPatterns',
    value: string,
    clearFn: () => void
  ) => {
    if (!value.trim()) return;
    setFormData((prev) => ({
      ...prev,
      [field]: [...prev[field], value.trim()],
    }));
    clearFn();
  };

  const removeTag = (
    field: 'approvedProductNames' | 'approvedTerms' | 'prohibitedTerms' | 'prohibitedPatterns',
    index: number
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setFormData((prev) => ({ ...prev, logoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            <span>Module 1</span>
            <span>·</span>
            <span>Brand Workspace</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Brand Governance & Tone Guidelines
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage approved naming conventions, tone criteria, prohibited terms, and color identity.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isAdmin && (
            <button
              onClick={handleCreateNewBrand}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors inline-flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Brand
            </button>
          )}

          {isAdmin ? (
            <button
              onClick={handleSave}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2 shadow-xs"
            >
              {saveSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  Saved (v{formData.guidelineVersion}.0)
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Guidelines (v{formData.guidelineVersion + 1}.0)
                </>
              )}
            </button>
          ) : (
            <div className="text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
              Viewing as <strong className="text-slate-700">{currentRole}</strong> (Admin role required to edit)
            </div>
          )}
        </div>
      </div>

      {!isAdmin && (
        <div className="p-3.5 rounded-lg bg-amber-50/80 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            You are currently in read-only mode. Use the role switcher in the header to switch to <strong>Admin</strong> if you need to modify brand guidelines.
          </span>
        </div>
      )}

      {/* Main Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Brand Identity & Colors */}
        <div className="space-y-6">
          {/* Brand Basic Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-500" />
              Brand Identity
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Brand Name
              </label>
              <input
                type="text"
                disabled={!isAdmin}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:opacity-75"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Guideline Version
              </label>
              <div className="text-xs font-mono text-slate-600 bg-slate-100 px-3 py-2 rounded-lg border border-slate-200 flex items-center justify-between">
                <span>Version {formData.guidelineVersion}.0</span>
                <span className="text-[10px] text-slate-400">
                  Last updated {new Date(formData.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Logo / Brand Mark
              </label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-lg bg-slate-100 border border-slate-300 flex items-center justify-center overflow-hidden shrink-0">
                  {formData.logoUrl ? (
                    <img
                      src={formData.logoUrl}
                      alt="Brand Logo"
                      className="w-full h-full object-contain p-1"
                    />
                  ) : (
                    <Building2 className="w-8 h-8 text-slate-400" />
                  )}
                </div>
                {isAdmin && (
                  <div>
                    <label className="cursor-pointer px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors inline-flex items-center gap-1.5 shadow-xs">
                      <Upload className="w-3.5 h-3.5" />
                      Upload Logo
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </label>
                    <div className="text-[11px] text-slate-400 mt-1">PNG, SVG or JPG</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Brand Colors Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Palette className="w-4 h-4 text-slate-500" />
              Official Hex Palette
            </h3>
            <p className="text-xs text-slate-500">
              Used by Visual Intelligence to sample and verify promotional assets.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Primary Brand Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    disabled={!isAdmin}
                    value={formData.brandColors.primary}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        brandColors: { ...formData.brandColors, primary: e.target.value },
                      })
                    }
                    className="w-8 h-8 rounded border border-slate-300 cursor-pointer p-0"
                  />
                  <input
                    type="text"
                    disabled={!isAdmin}
                    value={formData.brandColors.primary}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        brandColors: { ...formData.brandColors, primary: e.target.value },
                      })
                    }
                    className="flex-1 font-mono text-xs bg-slate-50 border border-slate-300 rounded-md px-3 py-1.5 uppercase text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Secondary Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    disabled={!isAdmin}
                    value={formData.brandColors.secondary}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        brandColors: { ...formData.brandColors, secondary: e.target.value },
                      })
                    }
                    className="w-8 h-8 rounded border border-slate-300 cursor-pointer p-0"
                  />
                  <input
                    type="text"
                    disabled={!isAdmin}
                    value={formData.brandColors.secondary}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        brandColors: { ...formData.brandColors, secondary: e.target.value },
                      })
                    }
                    className="flex-1 font-mono text-xs bg-slate-50 border border-slate-300 rounded-md px-3 py-1.5 uppercase text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Accent Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    disabled={!isAdmin}
                    value={formData.brandColors.accent}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        brandColors: { ...formData.brandColors, accent: e.target.value },
                      })
                    }
                    className="w-8 h-8 rounded border border-slate-300 cursor-pointer p-0"
                  />
                  <input
                    type="text"
                    disabled={!isAdmin}
                    value={formData.brandColors.accent}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        brandColors: { ...formData.brandColors, accent: e.target.value },
                      })
                    }
                    className="flex-1 font-mono text-xs bg-slate-50 border border-slate-300 rounded-md px-3 py-1.5 uppercase text-slate-800"
                  />
                </div>
              </div>
            </div>

            {isAdmin && (
              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  onClick={handleDeleteBrand}
                  className="text-xs text-rose-600 hover:text-rose-800 inline-flex items-center gap-1 font-medium"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Brand Profile
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right 2 Columns: Guidelines, Terms, Products, Tone */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tone Description Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Shield className="w-4 h-4 text-slate-500" />
              Approved Brand Tone Description
            </h3>
            <p className="text-xs text-slate-500">
              Evaluated by Engine 1 via Gemini contextual prompt to grade marketing voice consistency.
            </p>
            <textarea
              rows={4}
              disabled={!isAdmin}
              value={formData.toneDescription}
              onChange={(e) => setFormData({ ...formData, toneDescription: e.target.value })}
              className="w-full text-xs leading-relaxed bg-slate-50 border border-slate-300 rounded-lg p-3 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:opacity-80"
              placeholder="e.g. Authoritative, precise, customer-centric. Avoid hyperbolic claims or aggressive urgency."
            />
          </div>

          {/* Approved Product Names Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                  Official Approved Product Names
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Any unlisted variation (e.g. "AcmeCloud Pro") triggers a Critical Naming violation in Engine 1.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {formData.approvedProductNames.map((prod, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200"
                >
                  {prod}
                  {isAdmin && (
                    <button
                      onClick={() => removeTag('approvedProductNames', idx)}
                      className="hover:text-rose-600 ml-1"
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}
            </div>

            {isAdmin && (
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="text"
                  placeholder="Add product name (e.g. Acme DataCore)"
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === 'Enter' &&
                    addTag('approvedProductNames', newProductName, () => setNewProductName(''))
                  }
                  className="flex-1 text-xs bg-slate-50 border border-slate-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
                <button
                  onClick={() =>
                    addTag('approvedProductNames', newProductName, () => setNewProductName(''))
                  }
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
                >
                  Add
                </button>
              </div>
            )}
          </div>

          {/* Prohibited Terms & Superlative Patterns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Prohibited Terms */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Ban className="w-4 h-4 text-rose-500" />
                  Prohibited Phrases
                </h3>
                <p className="text-[11px] text-slate-500">
                  Strict blacklist (e.g. "hack-proof", "unbreakable").
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5 min-h-[60px]">
                {formData.prohibitedTerms.map((term, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200"
                  >
                    {term}
                    {isAdmin && (
                      <button
                        onClick={() => removeTag('prohibitedTerms', idx)}
                        className="hover:text-rose-900 ml-0.5"
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}
              </div>

              {isAdmin && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Add blacklisted term"
                    value={newProhibitedTerm}
                    onChange={(e) => setNewProhibitedTerm(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === 'Enter' &&
                      addTag('prohibitedTerms', newProhibitedTerm, () => setNewProhibitedTerm(''))
                    }
                    className="flex-1 text-xs bg-slate-50 border border-slate-300 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                  <button
                    onClick={() =>
                      addTag('prohibitedTerms', newProhibitedTerm, () => setNewProhibitedTerm(''))
                    }
                    className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
                  >
                    Add
                  </button>
                </div>
              )}
            </div>

            {/* Prohibited Superlative Patterns */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Ban className="w-4 h-4 text-amber-500" />
                  Prohibited Superlatives
                </h3>
                <p className="text-[11px] text-slate-500">
                  Unsubstantiated supremacy claims ("world's best", "#1").
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5 min-h-[60px]">
                {formData.prohibitedPatterns.map((pat, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200"
                  >
                    {pat}
                    {isAdmin && (
                      <button
                        onClick={() => removeTag('prohibitedPatterns', idx)}
                        className="hover:text-amber-950 ml-0.5"
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}
              </div>

              {isAdmin && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Add pattern (e.g. unrivaled)"
                    value={newProhibitedPattern}
                    onChange={(e) => setNewProhibitedPattern(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === 'Enter' &&
                      addTag('prohibitedPatterns', newProhibitedPattern, () =>
                        setNewProhibitedPattern('')
                      )
                    }
                    className="flex-1 text-xs bg-slate-50 border border-slate-300 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                  <button
                    onClick={() =>
                      addTag('prohibitedPatterns', newProhibitedPattern, () =>
                        setNewProhibitedPattern('')
                      )
                    }
                    className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
                  >
                    Add
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Approved Terms Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Tag className="w-4 h-4 text-blue-500" />
              Approved Brand Lexicon & Compliance Terms
            </h3>
            <p className="text-xs text-slate-500">
              Pre-cleared legal phrasing and certified nomenclature.
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              {formData.approvedTerms.map((term, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-800 border border-blue-200"
                >
                  {term}
                  {isAdmin && (
                    <button
                      onClick={() => removeTag('approvedTerms', idx)}
                      className="hover:text-rose-600 ml-1"
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}
            </div>

            {isAdmin && (
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="text"
                  placeholder="Add approved term (e.g. 99.95% uptime SLA)"
                  value={newApprovedTerm}
                  onChange={(e) => setNewApprovedTerm(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === 'Enter' &&
                    addTag('approvedTerms', newApprovedTerm, () => setNewApprovedTerm(''))
                  }
                  className="flex-1 text-xs bg-slate-50 border border-slate-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
                <button
                  onClick={() =>
                    addTag('approvedTerms', newApprovedTerm, () => setNewApprovedTerm(''))
                  }
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
                >
                  Add Term
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
