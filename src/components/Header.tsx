import React from 'react';
import {
  ShieldCheck,
  Building2,
  UserCheck,
  Sparkles,
  RotateCcw,
  PlusCircle,
} from 'lucide-react';
import { Brand, UserRole, SessionUsage } from '../types';
import { StorageService } from '../services/storage';

interface HeaderProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  brands: Brand[];
  selectedBrandId: string;
  onSelectBrand: (brandId: string) => void;
  currentRole: UserRole;
  onSelectRole: (role: UserRole) => void;
  credits: SessionUsage;
  onRefreshCredits: () => void;
  onOpenNewSubmission: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  brands,
  selectedBrandId,
  onSelectBrand,
  currentRole,
  onSelectRole,
  credits,
  onRefreshCredits,
  onOpenNewSubmission,
}) => {
  const activeBrand = brands.find((b) => b.id === selectedBrandId) || brands[0];

  const navLinks = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'approval-queue', label: 'Approval Queue' },
    { id: 'knowledge-base', label: 'Knowledge Base' },
    { id: 'brands', label: 'Brand Workspace' },
    { id: 'audit-history', label: 'Audit History' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      {/* Upper Utility Ribbon */}
      <div className="bg-slate-900 text-slate-300 text-xs px-6 py-1.5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 font-medium text-slate-200">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            Closed-Knowledge Engine Active
          </span>
          <span className="text-slate-500">|</span>
          <span className="hidden sm:inline text-slate-400">
            Zero external web queries · Deterministic style gates · Human final approval
          </span>
        </div>

        {/* Role Switcher & Credits */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Role:</span>
            <div className="flex items-center bg-slate-800 p-0.5 rounded-md border border-slate-700">
              {(['Admin', 'Creator', 'Reviewer'] as UserRole[]).map((role) => (
                <button
                  key={role}
                  onClick={() => onSelectRole(role)}
                  className={`px-2.5 py-0.5 text-xs font-medium rounded transition-all whitespace-nowrap ${
                    currentRole === role
                      ? 'bg-slate-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title={`Switch active persona to ${role}`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 pl-2 border-l border-slate-700">
            <span className="text-slate-400">Session Usage:</span>
            <span className="font-mono tabular-nums text-slate-200">
              {credits.remainingCredits}/{credits.totalCredits}
            </span>
            <button
              onClick={() => {
                StorageService.resetCredits();
                onRefreshCredits();
              }}
              title="Reset demo review credits"
              className="text-slate-400 hover:text-white transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Top Bar */}
      <div className="flex items-center justify-between gap-8 px-6 py-3.5">
        {/* Zone 1: Brand Title & Active Brand Selector */}
        <div className="flex items-center gap-6 shrink-0">
          <div
            onClick={() => onSelectTab('dashboard')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
              BrandGuard<span className="text-blue-600 font-extrabold">.AI</span>
            </span>
          </div>

          {/* Brand Switcher */}
          <div className="hidden lg:flex items-center gap-2 pl-4 border-l border-slate-200">
            <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedBrandId}
              onChange={(e) => onSelectBrand(e.target.value)}
              className="text-xs font-medium text-slate-700 bg-slate-50 border border-slate-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-slate-900"
            >
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} (v{b.guidelineVersion}.0)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          {navLinks.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap py-1 relative ${
                currentTab === tab.id ? 'text-slate-900 font-semibold' : ''
              }`}
            >
              {tab.label}
              {currentTab === tab.id && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-slate-900 rounded-full" />
              )}
            </button>
          ))}
        </nav>

        {/* Zone 3: Primary Actions */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onOpenNewSubmission}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            Submit Content
          </button>
        </div>
      </div>
    </header>
  );
};
