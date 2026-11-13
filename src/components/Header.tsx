import React, { useState } from 'react';
import {
  ShieldCheck,
  Building2,
  UserCheck,
  Sparkles,
  RotateCcw,
  PlusCircle,
  ChevronDown,
  Lock,
  LogOut,
  CheckCircle,
  User,
} from 'lucide-react';
import { Brand, UserRole, SessionUsage, UserProfile } from '../types';
import { StorageService } from '../services/storage';
import { AuthService, DEMO_USER_PROFILES } from '../services/auth';

interface HeaderProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  brands: Brand[];
  selectedBrandId: string;
  onSelectBrand: (brandId: string) => void;
  currentUser: UserProfile;
  onSwitchUser: (profileId: string) => void;
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
  currentUser,
  onSwitchUser,
  credits,
  onRefreshCredits,
  onOpenNewSubmission,
}) => {
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const activeBrand = brands.find((b) => b.id === selectedBrandId) || brands[0];

  const navLinks = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'approval-queue', label: 'Approval Queue' },
    { id: 'knowledge-base', label: 'Knowledge Base' },
    { id: 'brands', label: 'Brand Workspace' },
    { id: 'audit-history', label: 'Audit History' },
  ];

  const isSupabase = AuthService.isSupabaseConfigured();

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      {/* Upper Enterprise Utility Ribbon */}
      <div className="bg-slate-900 text-slate-300 text-xs px-6 py-1.5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 font-medium text-slate-200">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            Closed Knowledge & RLS Active
          </span>
          <span className="text-slate-500">|</span>
          <span className="hidden sm:inline text-slate-400">
            Organisation: <strong className="text-slate-200">{currentUser.organisationName}</strong>
          </span>
          <span className="text-slate-500 hidden md:inline">|</span>
          <span className="hidden md:inline text-slate-400 text-[11px]">
            {isSupabase ? 'Supabase Postgres + pgvector' : 'Postgres RLS Multi-Tenant Model'}
          </span>
        </div>

        {/* User Session & Credits */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1 rounded-md border border-slate-700 transition-colors shadow-xs"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  currentUser.role === 'Admin'
                    ? 'bg-purple-400'
                    : currentUser.role === 'Reviewer'
                    ? 'bg-emerald-400'
                    : 'bg-blue-400'
                }`}
              />
              <span className="font-semibold text-white">{currentUser.displayName}</span>
              <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-600">
                {currentUser.role}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {/* User Session Dropdown */}
            {showUserDropdown && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 text-slate-800">
                <div className="px-4 py-2 border-b border-slate-100">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Authenticated Enterprise Session
                  </div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {currentUser.displayName}
                  </div>
                  <div className="text-xs text-slate-500 font-mono">{currentUser.email}</div>
                  <div className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                    <Building2 className="w-3 h-3 text-slate-400" />
                    <span>{currentUser.organisationName}</span>
                  </div>
                </div>

                <div className="px-4 py-2">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Switch Organisation Member (Server RLS)
                  </div>
                  <div className="space-y-1 max-h-60 overflow-y-auto">
                    {DEMO_USER_PROFILES.map((profile) => {
                      const isCurrent = profile.id === currentUser.id;
                      return (
                        <button
                          key={profile.id}
                          onClick={() => {
                            onSwitchUser(profile.id);
                            setShowUserDropdown(false);
                          }}
                          className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                            isCurrent
                              ? 'bg-blue-50 border border-blue-200'
                              : 'hover:bg-slate-50 border border-transparent'
                          }`}
                        >
                          <div>
                            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                              {profile.displayName}
                              {isCurrent && <CheckCircle className="w-3.5 h-3.5 text-blue-600" />}
                            </div>
                            <div className="text-[11px] text-slate-500">{profile.organisationName}</div>
                          </div>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                              profile.role === 'Admin'
                                ? 'bg-purple-100 text-purple-800'
                                : profile.role === 'Reviewer'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {profile.role}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="px-4 py-2 border-t border-slate-100 text-[11px] text-slate-500 bg-slate-50 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Row Level Security guarantees organisation isolation</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 pl-2 border-l border-slate-700">
            <span className="text-slate-400">Credits:</span>
            <span className="font-mono tabular-nums text-slate-200">
              {credits.remainingCredits}/{credits.totalCredits}
            </span>
            <button
              onClick={() => {
                StorageService.resetCredits();
                onRefreshCredits();
              }}
              title="Reset session review credits"
              className="text-slate-400 hover:text-white transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Top Bar */}
      <div className="flex items-center justify-between gap-8 px-6 py-3.5">
        {/* Zone 1: Title & Brand Selector */}
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

          {/* Active Brand Switcher (Filtered by User's Organisation) */}
          <div className="hidden lg:flex items-center gap-2 pl-4 border-l border-slate-200">
            <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedBrandId}
              onChange={(e) => onSelectBrand(e.target.value)}
              className="text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-300 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-900"
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
