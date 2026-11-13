import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { BrandWorkspaceView } from './components/BrandWorkspaceView';
import { KnowledgeBaseView } from './components/KnowledgeBaseView';
import { SubmissionFormView } from './components/SubmissionFormView';
import { ReviewResultView } from './components/ReviewResultView';
import { ApprovalQueueView } from './components/ApprovalQueueView';
import { AuditHistoryView } from './components/AuditHistoryView';
import { StorageService } from './services/storage';
import { AuthService } from './services/auth';
import { Brand, UserRole, SessionUsage, Submission, UserProfile } from './types';

export default function App() {
  // Initialize seed demo data if not yet initialized
  useEffect(() => {
    StorageService.initialize();
  }, []);

  const [currentUser, setCurrentUser] = useState<UserProfile>(() => AuthService.getCurrentUser());
  const [brands, setBrands] = useState<Brand[]>(() => StorageService.getBrands());
  const [selectedBrandId, setSelectedBrandId] = useState<string>(() => {
    const list = StorageService.getBrands();
    return list[0]?.id || 'brand-novapay';
  });

  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string>('sub-novapay-merchant-campaign');
  const [credits, setCredits] = useState<SessionUsage>(() => StorageService.getSessionCredits());
  const [refreshKey, setRefreshKey] = useState<number>(0);

  const refreshData = () => {
    const user = AuthService.getCurrentUser();
    setCurrentUser(user);
    const orgBrands = StorageService.getBrands(user.organisationId);
    setBrands(orgBrands);
    if (!orgBrands.some((b) => b.id === selectedBrandId)) {
      setSelectedBrandId(orgBrands[0]?.id || '');
    }
    setCredits(StorageService.getSessionCredits());
    setRefreshKey((prev) => prev + 1);
  };

  const handleSwitchUser = async (profileId: string) => {
    const updatedUser = await AuthService.switchProfile(profileId);
    setCurrentUser(updatedUser);
    const orgBrands = StorageService.getBrands(updatedUser.organisationId);
    setBrands(orgBrands);
    setSelectedBrandId(orgBrands[0]?.id || '');
    const orgSubmissions = StorageService.getSubmissions(undefined, updatedUser.organisationId);
    if (orgSubmissions.length > 0) {
      setSelectedSubmissionId(orgSubmissions[0].id);
    }
    setRefreshKey((prev) => prev + 1);
  };

  const activeBrand = brands.find((b) => b.id === selectedBrandId) || brands[0];
  const submissions = StorageService.getSubmissions();
  const currentRole = currentUser.role;

  // Quick Run Benchmark Demo Ad
  const handleRunDemoAd = () => {
    const existing = submissions.find(
      (s) =>
        s.versions.some((v) => v.content.includes("world's best platform") || v.content.includes('NovaPay Pro'))
    );

    if (existing) {
      setSelectedSubmissionId(existing.id);
      setCurrentTab('review');
    } else {
      // Create fresh demo submission
      const subId = `sub-demo-${Date.now()}`;
      const demoSub: Submission = {
        id: subId,
        organisationId: currentUser.organisationId,
        brandId: activeBrand?.id || 'brand-novapay',
        title: `${activeBrand?.name || 'NovaPay'} Benchmark Verification Ad`,
        channel: 'Social Ad & Sponsored Post',
        currentVersion: 1,
        status: 'In Review',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        versions: [
          {
            versionNumber: 1,
            content:
              activeBrand?.id === 'brand-novapay'
                ? 'NovaPay Pro is the #1 guaranteed best payment gateway for credit cards at Rs 299 with 99% merchant satisfaction!'
                : "Acme Cloud is the world's best platform and improves productivity by 95%. Try AcmeCloud Pro today!",
            submittedAt: new Date().toISOString(),
            submittedByRole: 'Creator',
            submittedByName: currentUser.displayName,
            riskScore: 78,
            findingsCount: 4,
          },
        ],
      };
      StorageService.saveSubmission(demoSub);
      refreshData();
      setSelectedSubmissionId(subId);
      setCurrentTab('review');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 font-sans antialiased selection:bg-blue-500 selection:text-white">
      {/* Top Header */}
      <Header
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        brands={brands}
        selectedBrandId={selectedBrandId}
        onSelectBrand={(id) => setSelectedBrandId(id)}
        currentUser={currentUser}
        onSwitchUser={handleSwitchUser}
        credits={credits}
        onRefreshCredits={refreshData}
        onOpenNewSubmission={() => setCurrentTab('new-submission')}
      />

      {/* Main Viewport Content */}
      <main className="flex-1">
        {currentTab === 'dashboard' && (
          <DashboardView
            submissions={submissions}
            activeBrand={activeBrand}
            onOpenSubmission={(id) => {
              setSelectedSubmissionId(id);
              setCurrentTab('review');
            }}
            onRunDemoAd={handleRunDemoAd}
            onNewSubmission={() => setCurrentTab('new-submission')}
            onNavigateToTab={(tab) => setCurrentTab(tab)}
          />
        )}

        {currentTab === 'brands' && (
          <BrandWorkspaceView
            brands={brands}
            selectedBrandId={selectedBrandId}
            onSelectBrand={(id) => setSelectedBrandId(id)}
            onRefreshBrands={refreshData}
            currentRole={currentRole}
          />
        )}

        {currentTab === 'knowledge-base' && (
          <KnowledgeBaseView
            activeBrand={activeBrand}
            currentRole={currentRole}
            onRefreshData={refreshData}
          />
        )}

        {currentTab === 'new-submission' && (
          <SubmissionFormView
            brands={brands}
            selectedBrandId={selectedBrandId}
            currentRole={currentRole}
            onSubmissionCreated={(id) => {
              refreshData();
              setSelectedSubmissionId(id);
              setCurrentTab('review');
            }}
          />
        )}

        {currentTab === 'review' && (
          <ReviewResultView
            submissionId={selectedSubmissionId}
            brands={brands}
            currentRole={currentRole}
            onNavigateToTab={(tab) => setCurrentTab(tab)}
            onRefreshData={refreshData}
          />
        )}

        {currentTab === 'approval-queue' && (
          <ApprovalQueueView
            submissions={submissions}
            brands={brands}
            activeBrandId={selectedBrandId}
            currentRole={currentRole}
            onOpenSubmission={(id) => {
              setSelectedSubmissionId(id);
              setCurrentTab('review');
            }}
            onRefreshData={refreshData}
          />
        )}

        {currentTab === 'audit-history' && (
          <AuditHistoryView
            brands={brands}
            selectedBrandId={selectedBrandId}
            onOpenSubmission={(id) => {
              setSelectedSubmissionId(id);
              setCurrentTab('review');
            }}
          />
        )}
      </main>

      {/* Enterprise Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-6 px-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-bold text-slate-900">BrandGuard AI</span>
            <span>·</span>
            <span>Closed-Knowledge Enterprise Brand Governance</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Engine 1: Brand Rules & Tone</span>
            <span>·</span>
            <span>Engine 2: Evidence Verification</span>
            <span>·</span>
            <span>Engine 3: Visual Intelligence</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
