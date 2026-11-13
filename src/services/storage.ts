import {
  Brand,
  KnowledgeDocument,
  KnowledgeChunk,
  Submission,
  AnalysisResult,
  AuditEntry,
  SessionUsage,
} from '../types';
import { AuthService } from './auth';

const STORAGE_KEYS = {
  BRANDS: 'brandguard_brands',
  DOCUMENTS: 'brandguard_documents',
  CHUNKS: 'brandguard_chunks',
  SUBMISSIONS: 'brandguard_submissions',
  ANALYSES: 'brandguard_analyses',
  AUDIT_LOGS: 'brandguard_audit_logs',
  SESSION_CREDITS: 'brandguard_session_credits',
  INITIALIZED: 'brandguard_initialized_v4',
};

// Seed brand data with Multi-Tenant Organisation IDs
const DEMO_BRAND: Brand = {
  id: 'brand-acme-cloud',
  organisationId: 'org-acme-cloud',
  name: 'Acme Cloud',
  brandColors: {
    primary: '#0F172A', // Slate 900
    secondary: '#2563EB', // Blue 600
    accent: '#0D9488', // Teal 600
  },
  approvedProductNames: ['Acme Cloud', 'Acme DataCore', 'Acme Shield'],
  toneDescription:
    'Authoritative, technically precise, and transparent. We communicate with measured confidence, empirical validation, and customer respect. Strictly avoid breathless superlatives, aggressive marketing hype, unverifiable guarantees, or buzzword-heavy claims.',
  approvedTerms: [
    'enterprise-grade',
    'high availability',
    'zero-trust architecture',
    'SOC 2 Type II compliant',
    'ISO 27001 certified',
    '99.95% uptime SLA',
  ],
  prohibitedTerms: [
    'hack-proof',
    'unbreakable',
    'foolproof',
    'magical',
    'instant setup',
    'effortless',
    'cheapest',
  ],
  prohibitedPatterns: [
    "world's best",
    "world's leading",
    '#1',
    'number one',
    'best platform',
    'best company',
    'unrivaled',
    'unmatched',
    '100% guaranteed',
  ],
  guidelineVersion: 2,
  createdAt: '2026-01-15T09:00:00.000Z',
  updatedAt: '2026-03-01T14:30:00.000Z',
};

const NOVAPAY_BRAND: Brand = {
  id: 'brand-novapay',
  organisationId: 'org-novapay',
  name: 'NovaPay',
  brandColors: {
    primary: '#1E1B4B', // Indigo 950
    secondary: '#4F46E5', // Indigo 600
    accent: '#06B6D4', // Cyan 500
  },
  approvedProductNames: ['NovaPay', 'NovaPay Gateway', 'NovaPay Collect'],
  toneDescription:
    'Transparent, direct, and customer-first fintech governance. We state facts clearly and present empirical benchmark data. Never use superlatives like #1, never guarantee zero failure, and strictly state supported payment methods and certified pricing.',
  approvedTerms: [
    'UPI enabled',
    'instant settlement',
    'bank-grade encryption',
    'RBI compliant',
    'Rs 499 monthly fee',
  ],
  prohibitedTerms: [
    'guaranteed',
    '100% success',
    'zero failure',
    'hack-proof',
    'free forever',
  ],
  prohibitedPatterns: [
    '#1',
    "world's best",
    'best company',
    'unmatched',
    'unrivaled',
    'number one',
  ],
  guidelineVersion: 1,
  createdAt: '2026-02-01T08:00:00.000Z',
  updatedAt: '2026-03-01T12:00:00.000Z',
};

const DEMO_DOCUMENTS: KnowledgeDocument[] = [
  {
    id: 'doc-sla-overview',
    organisationId: 'org-acme-cloud',
    brandId: 'brand-acme-cloud',
    name: 'Acme Cloud Platform Overview & SLA.pdf',
    type: 'evidence',
    version: '2.1',
    uploadDate: '2026-02-10T10:00:00.000Z',
    fileSize: '1.4 MB',
    rawText: `Acme Cloud Architecture and Service Level Agreement.
Section 1.1: Platform Capabilities. Acme Cloud provides enterprise distributed data synchronization across 14 global regions. The system delivers a contractually guaranteed 99.95% uptime SLA for all Tier 1 enterprise customers with automated failover in under 4 seconds.
Section 1.4: Empirical Performance Benchmarks. According to the 2025 Third-Party Engineering Audit conducted by Forrester & Gartner Labs across 42 enterprise deployments, Acme Cloud demonstrated an average verified productivity improvement of 28% (with a standard deviation of ±4%). Any marketing claim exceeding 35% productivity gain is unverified and prohibited under corporate governance.`,
    chunkCount: 2,
  },
  {
    id: 'doc-pricing-matrix',
    organisationId: 'org-acme-cloud',
    brandId: 'brand-acme-cloud',
    name: 'Acme Product Suite & Pricing Matrix.docx',
    type: 'pricing',
    version: '3.0',
    uploadDate: '2026-02-14T11:20:00.000Z',
    fileSize: '640 KB',
    rawText: `Acme Cloud Product Suite and Commercial Tiers.
Section 2.1: Authorized Product Names. The only authorized commercial products within the Acme catalog are: 'Acme Cloud' (Core Platform), 'Acme DataCore' (Streaming Data Warehouse), and 'Acme Shield' (Identity & Endpoint Protection). Products named 'AcmeCloud Pro', 'Acme Pro', or 'Acme Elite' do not exist and are unapproved names.
Section 2.2: Pricing Schedule. Acme Cloud is billed on annual commitment: Starter is $49/seat/month, Enterprise is $199/seat/month. Standard onboarding includes dedicated deployment engineering. All discounts require CFO signoff.`,
    chunkCount: 2,
  },
  {
    id: 'doc-security-whitepaper',
    organisationId: 'org-acme-cloud',
    brandId: 'brand-acme-cloud',
    name: 'Security & Compliance Whitepaper.pdf',
    type: 'compliance',
    version: '1.4',
    uploadDate: '2026-01-20T16:45:00.000Z',
    fileSize: '2.8 MB',
    rawText: `Acme Cloud Security Verification and Threat Modeling.
Section 3.1: Cryptographic Standards. Acme Cloud enforces end-to-end AES-256 GCM encryption at rest and TLS 1.3 in transit with hardware security module (HSM) key rotation.
Section 3.4: Mandatory Compliance Language. Acme Cloud is audited annually for SOC 2 Type II and ISO 27001 certifications. Under legal compliance directives, no promotional material may ever use terms such as 'hack-proof', 'unbreakable', or 'guaranteed zero breach'. Modern threat postures acknowledge defense-in-depth rather than invulnerability.`,
    chunkCount: 2,
  },
  {
    id: 'doc-novapay-facts',
    organisationId: 'org-novapay',
    brandId: 'brand-novapay',
    name: 'NovaPay Product Facts & Commercial Pricing.pdf',
    type: 'product_facts',
    version: '1.0',
    uploadDate: '2026-02-05T09:00:00.000Z',
    fileSize: '1.1 MB',
    rawText: `NovaPay Merchant Product Specification and Tier Schedule.
Section 1.1: Commercial Pricing. The standard merchant subscription for NovaPay is priced at Rs 499 per month. No setup fees apply.
Section 1.2: Payment Instrument Support. NovaPay currently provides seamless processing for UPI (all major apps), Net Banking across 54 domestic banks, and RuPay debit cards. Credit cards are NOT supported on standard merchant tiers. Any marketing claim stating credit card support is contradicted by corporate product policy.`,
    chunkCount: 2,
  },
  {
    id: 'doc-novapay-survey',
    organisationId: 'org-novapay',
    brandId: 'brand-novapay',
    name: 'NovaPay Q4 Merchant Survey Evidence.docx',
    type: 'evidence',
    version: '1.2',
    uploadDate: '2026-02-12T14:30:00.000Z',
    fileSize: '820 KB',
    rawText: `NovaPay Q4 2025 Merchant Satisfaction Audit Report.
Section 2.1: Certified Survey Findings. In a double-blind survey of 1,200 active Indian retail merchants audited by KPMG India, exactly 78% of merchants reported reduced settlement delays and positive checkout velocity. Promotional materials are authorized to cite the 78% survey result. Any claim exceeding 78% or asserting 100% satisfaction is contradicted and unverified.`,
    chunkCount: 1,
  },
];

const DEMO_CHUNKS: KnowledgeChunk[] = [
  {
    id: 'chunk-1',
    organisationId: 'org-acme-cloud',
    documentId: 'doc-sla-overview',
    brandId: 'brand-acme-cloud',
    documentName: 'Acme Cloud Platform Overview & SLA.pdf',
    documentVersion: '1.0',
    section: 'Section 1.1: Platform Capabilities',
    pageNumber: 3,
    text: 'Acme Cloud provides enterprise distributed data synchronization across 14 global regions. The system delivers a contractually guaranteed 99.95% uptime SLA for all Tier 1 enterprise customers with automated failover in under 4 seconds.',
    tokenCount: 42,
  },
  {
    id: 'chunk-2',
    organisationId: 'org-acme-cloud',
    documentId: 'doc-sla-overview',
    brandId: 'brand-acme-cloud',
    documentName: 'Acme Cloud Platform Overview & SLA.pdf',
    documentVersion: '1.0',
    section: 'Section 1.4: Empirical Performance Benchmarks',
    pageNumber: 8,
    text: 'According to the 2025 Third-Party Engineering Audit conducted by Forrester & Gartner Labs across 42 enterprise deployments, Acme Cloud demonstrated an average verified productivity improvement of 28% (with a standard deviation of ±4%). Any marketing claim exceeding 35% productivity gain is unverified and prohibited under corporate governance.',
    tokenCount: 56,
  },
  {
    id: 'chunk-3',
    organisationId: 'org-acme-cloud',
    documentId: 'doc-pricing-matrix',
    brandId: 'brand-acme-cloud',
    documentName: 'Acme Product Suite & Pricing Matrix.docx',
    documentVersion: '1.0',
    section: 'Section 2.1: Authorized Product Names',
    pageNumber: 2,
    text: "The only authorized commercial products within the Acme catalog are: 'Acme Cloud' (Core Platform), 'Acme DataCore' (Streaming Data Warehouse), and 'Acme Shield' (Identity & Endpoint Protection). Products named 'AcmeCloud Pro', 'Acme Pro', or 'Acme Elite' do not exist and are unapproved names.",
    tokenCount: 51,
  },
  {
    id: 'chunk-4',
    organisationId: 'org-acme-cloud',
    documentId: 'doc-pricing-matrix',
    brandId: 'brand-acme-cloud',
    documentName: 'Acme Product Suite & Pricing Matrix.docx',
    documentVersion: '1.0',
    section: 'Section 2.2: Pricing Schedule',
    pageNumber: 5,
    text: 'Acme Cloud is billed on annual commitment: Starter is $49/seat/month, Enterprise is $199/seat/month. Standard onboarding includes dedicated deployment engineering. All discounts require CFO signoff.',
    tokenCount: 34,
  },
  {
    id: 'chunk-5',
    organisationId: 'org-acme-cloud',
    documentId: 'doc-security-whitepaper',
    brandId: 'brand-acme-cloud',
    documentName: 'Security & Compliance Whitepaper.pdf',
    documentVersion: '1.0',
    section: 'Section 3.1: Cryptographic Standards',
    pageNumber: 4,
    text: 'Acme Cloud enforces end-to-end AES-256 GCM encryption at rest and TLS 1.3 in transit with hardware security module (HSM) key rotation.',
    tokenCount: 26,
  },
  {
    id: 'chunk-6',
    organisationId: 'org-acme-cloud',
    documentId: 'doc-security-whitepaper',
    brandId: 'brand-acme-cloud',
    documentName: 'Security & Compliance Whitepaper.pdf',
    documentVersion: '1.0',
    section: 'Section 3.4: Mandatory Compliance Language',
    pageNumber: 12,
    text: "Acme Cloud is audited annually for SOC 2 Type II and ISO 27001 certifications. Under legal compliance directives, no promotional material may ever use terms such as 'hack-proof', 'unbreakable', or 'guaranteed zero breach'. Modern threat postures acknowledge defense-in-depth rather than invulnerability.",
    tokenCount: 47,
  },
  {
    id: 'chunk-novapay-1',
    organisationId: 'org-novapay',
    documentId: 'doc-novapay-facts',
    brandId: 'brand-novapay',
    documentName: 'NovaPay Product Facts & Commercial Pricing.pdf',
    documentVersion: '1.0',
    section: 'Section 1.1: Commercial Pricing',
    pageNumber: 1,
    text: 'The standard merchant subscription for NovaPay is priced at Rs 499 per month. No setup fees apply.',
    tokenCount: 24,
  },
  {
    id: 'chunk-novapay-2',
    organisationId: 'org-novapay',
    documentId: 'doc-novapay-facts',
    brandId: 'brand-novapay',
    documentName: 'NovaPay Product Facts & Commercial Pricing.pdf',
    documentVersion: '1.0',
    section: 'Section 1.2: Payment Instrument Support',
    pageNumber: 2,
    text: 'NovaPay currently provides seamless processing for UPI (all major apps), Net Banking across 54 domestic banks, and RuPay debit cards. Credit cards are NOT supported on standard merchant tiers. Any marketing claim stating credit card support is contradicted by corporate product policy.',
    tokenCount: 48,
  },
  {
    id: 'chunk-novapay-3',
    organisationId: 'org-novapay',
    documentId: 'doc-novapay-survey',
    brandId: 'brand-novapay',
    documentName: 'NovaPay Q4 Merchant Survey Evidence.docx',
    documentVersion: '1.0',
    section: 'Section 2.1: Certified Survey Findings',
    pageNumber: 3,
    text: 'In a double-blind survey of 1,200 active Indian retail merchants audited by KPMG India, exactly 78% of merchants reported reduced settlement delays and positive checkout velocity. Promotional materials are authorized to cite the 78% survey result. Any claim exceeding 78% or asserting 100% satisfaction is contradicted and unverified.',
    tokenCount: 52,
  },
];

const DEMO_SUBMISSION: Submission = {
  id: 'sub-acme-q1-campaign',
  organisationId: 'org-acme-cloud',
  brandId: 'brand-acme-cloud',
  title: 'Q1 Global Product Launch Headline',
  channel: 'Social Ad & LinkedIn Sponsored Post',
  currentVersion: 1,
  status: 'In Review',
  createdAt: '2026-03-02T10:15:00.000Z',
  updatedAt: '2026-03-02T10:15:00.000Z',
  versions: [
    {
      versionNumber: 1,
      content:
        "Acme Cloud is the world's best platform and improves productivity by 95%. Try AcmeCloud Pro today!",
      submittedAt: '2026-03-02T10:15:00.000Z',
      submittedByRole: 'Creator',
      submittedByName: 'Jordan Vance (Growth Marketing)',
      riskScore: 78,
      findingsCount: 4,
    },
  ],
};

const NOVAPAY_SUBMISSION: Submission = {
  id: 'sub-novapay-merchant-campaign',
  organisationId: 'org-novapay',
  brandId: 'brand-novapay',
  title: 'March Retail Merchant Growth Campaign',
  channel: 'Google Search & LinkedIn Sponsored Update',
  currentVersion: 1,
  status: 'In Review',
  createdAt: '2026-03-03T09:30:00.000Z',
  updatedAt: '2026-03-03T09:30:00.000Z',
  versions: [
    {
      versionNumber: 1,
      content:
        'NovaPay provides instant settlement and UPI enabled payment processing for merchants at Rs 499 monthly fee. 78% of retail merchants reported faster settlements.',
      submittedAt: '2026-03-03T09:30:00.000Z',
      submittedByRole: 'Creator',
      submittedByName: 'Arjun Mehta (Fintech Growth)',
      riskScore: 0,
      findingsCount: 0,
    },
  ],
};

const DEMO_AUDIT: AuditEntry[] = [
  {
    id: 'audit-1',
    organisationId: 'org-acme-cloud',
    submissionId: 'sub-acme-q1-campaign',
    brandId: 'brand-acme-cloud',
    timestamp: '2026-03-02T10:15:00.000Z',
    role: 'Creator',
    actorName: 'Jordan Vance',
    action: 'CREATED',
    details: 'Submitted content draft for automated brand and evidence verification.',
  },
  {
    id: 'audit-2',
    organisationId: 'org-novapay',
    submissionId: 'sub-novapay-merchant-campaign',
    brandId: 'brand-novapay',
    timestamp: '2026-03-03T09:30:00.000Z',
    role: 'Creator',
    actorName: 'Arjun Mehta',
    action: 'CREATED',
    details: 'Submitted clean merchant campaign draft for automated verification.',
  },
];

export class StorageService {
  private static isInitialized(): boolean {
    return localStorage.getItem(STORAGE_KEYS.INITIALIZED) === 'true';
  }

  public static initialize(): void {
    if (!this.isInitialized()) {
      this.resetToDemo();
    }
  }

  public static resetToDemo(): void {
    localStorage.setItem(STORAGE_KEYS.BRANDS, JSON.stringify([DEMO_BRAND, NOVAPAY_BRAND]));
    localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(DEMO_DOCUMENTS));
    localStorage.setItem(STORAGE_KEYS.CHUNKS, JSON.stringify(DEMO_CHUNKS));
    localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify([DEMO_SUBMISSION, NOVAPAY_SUBMISSION]));
    localStorage.setItem(STORAGE_KEYS.ANALYSES, JSON.stringify({}));
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(DEMO_AUDIT));
    localStorage.setItem(
      STORAGE_KEYS.SESSION_CREDITS,
      JSON.stringify({ totalCredits: 50, usedCredits: 4, remainingCredits: 46 })
    );
    localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
  }

  // Brands (Scoped by current user's Organisation ID)
  public static getBrands(orgId?: string): Brand[] {
    const raw = localStorage.getItem(STORAGE_KEYS.BRANDS);
    const all: Brand[] = raw ? JSON.parse(raw) : [DEMO_BRAND, NOVAPAY_BRAND];
    const targetOrg = orgId || AuthService.getCurrentUser().organisationId;
    return all.filter((b) => !b.organisationId || b.organisationId === targetOrg);
  }

  public static getAllBrandsUnfiltered(): Brand[] {
    const raw = localStorage.getItem(STORAGE_KEYS.BRANDS);
    return raw ? JSON.parse(raw) : [DEMO_BRAND, NOVAPAY_BRAND];
  }

  public static getBrand(id: string): Brand | undefined {
    return this.getAllBrandsUnfiltered().find((b) => b.id === id);
  }

  public static saveBrand(brand: Brand): void {
    const allBrands = this.getAllBrandsUnfiltered();
    const user = AuthService.getCurrentUser();
    if (!brand.organisationId) {
      brand.organisationId = user.organisationId;
    }
    const idx = allBrands.findIndex((b) => b.id === brand.id);
    if (idx >= 0) {
      allBrands[idx] = { ...brand, updatedAt: new Date().toISOString() };
    } else {
      allBrands.push(brand);
    }
    localStorage.setItem(STORAGE_KEYS.BRANDS, JSON.stringify(allBrands));
  }

  public static deleteBrand(id: string): void {
    const brands = this.getAllBrandsUnfiltered().filter((b) => b.id !== id);
    localStorage.setItem(STORAGE_KEYS.BRANDS, JSON.stringify(brands));
  }

  // Knowledge Documents (Scoped by Organisation ID)
  public static getDocuments(brandId?: string): KnowledgeDocument[] {
    const raw = localStorage.getItem(STORAGE_KEYS.DOCUMENTS);
    const docs: KnowledgeDocument[] = raw ? JSON.parse(raw) : DEMO_DOCUMENTS;
    const currentOrg = AuthService.getCurrentUser().organisationId;
    const filtered = docs.filter((d) => !d.organisationId || d.organisationId === currentOrg);
    return brandId ? filtered.filter((d) => d.brandId === brandId) : filtered;
  }

  public static getDocument(id: string): KnowledgeDocument | undefined {
    const raw = localStorage.getItem(STORAGE_KEYS.DOCUMENTS);
    const docs: KnowledgeDocument[] = raw ? JSON.parse(raw) : DEMO_DOCUMENTS;
    return docs.find((d) => d.id === id);
  }

  public static saveDocument(doc: KnowledgeDocument, chunks: KnowledgeChunk[]): void {
    const raw = localStorage.getItem(STORAGE_KEYS.DOCUMENTS);
    const docs: KnowledgeDocument[] = raw ? JSON.parse(raw) : DEMO_DOCUMENTS;
    const user = AuthService.getCurrentUser();
    if (!doc.organisationId) doc.organisationId = user.organisationId;

    const idx = docs.findIndex((d) => d.id === doc.id);
    if (idx >= 0) {
      docs[idx] = doc;
    } else {
      docs.push(doc);
    }
    localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(docs));

    // Save chunks stamped with organisationId
    const stampedChunks = chunks.map((c) => ({
      ...c,
      organisationId: c.organisationId || user.organisationId,
    }));
    const rawChunks = localStorage.getItem(STORAGE_KEYS.CHUNKS);
    const allChunks: KnowledgeChunk[] = rawChunks ? JSON.parse(rawChunks) : DEMO_CHUNKS;
    const remaining = allChunks.filter((c) => c.documentId !== doc.id);
    remaining.push(...stampedChunks);
    localStorage.setItem(STORAGE_KEYS.CHUNKS, JSON.stringify(remaining));
  }

  public static deleteDocument(id: string): void {
    const raw = localStorage.getItem(STORAGE_KEYS.DOCUMENTS);
    const docs: KnowledgeDocument[] = raw ? JSON.parse(raw) : DEMO_DOCUMENTS;
    const filtered = docs.filter((d) => d.id !== id);
    localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(filtered));

    const rawChunks = localStorage.getItem(STORAGE_KEYS.CHUNKS);
    const allChunks: KnowledgeChunk[] = rawChunks ? JSON.parse(rawChunks) : DEMO_CHUNKS;
    const remainingChunks = allChunks.filter((c) => c.documentId !== id);
    localStorage.setItem(STORAGE_KEYS.CHUNKS, JSON.stringify(remainingChunks));
  }

  // Chunks (Scoped by Organisation ID)
  public static getAllChunks(): KnowledgeChunk[] {
    const raw = localStorage.getItem(STORAGE_KEYS.CHUNKS);
    const all: KnowledgeChunk[] = raw ? JSON.parse(raw) : DEMO_CHUNKS;
    const currentOrg = AuthService.getCurrentUser().organisationId;
    return all.filter((c) => !c.organisationId || c.organisationId === currentOrg);
  }

  public static getChunksByBrand(brandId: string): KnowledgeChunk[] {
    return this.getAllChunks().filter((c) => c.brandId === brandId);
  }

  public static saveChunks(updatedChunks: KnowledgeChunk[]): void {
    const rawChunks = localStorage.getItem(STORAGE_KEYS.CHUNKS);
    const allChunks: KnowledgeChunk[] = rawChunks ? JSON.parse(rawChunks) : DEMO_CHUNKS;
    const user = AuthService.getCurrentUser();
    const map = new Map(allChunks.map((c) => [c.id, c]));
    for (const c of updatedChunks) {
      if (!c.organisationId) c.organisationId = user.organisationId;
      map.set(c.id, c);
    }
    localStorage.setItem(STORAGE_KEYS.CHUNKS, JSON.stringify(Array.from(map.values())));
  }

  public static getKnowledgeBaseVersion(brandId: string): string {
    const docs = this.getDocuments(brandId);
    const chunks = this.getChunksByBrand(brandId);
    const docSig = docs.map((d) => `${d.id}:v${d.version || '1.0'}`).sort().join(';');
    const chunkCount = chunks.length;
    return `kb_${docs.length}d_${chunkCount}c_${docSig}`;
  }

  // Submissions (Scoped by Organisation ID)
  public static getSubmissions(brandId?: string, orgId?: string): Submission[] {
    const raw = localStorage.getItem(STORAGE_KEYS.SUBMISSIONS);
    const list: Submission[] = raw ? JSON.parse(raw) : [DEMO_SUBMISSION, NOVAPAY_SUBMISSION];
    const targetOrg = orgId || AuthService.getCurrentUser().organisationId;
    const orgBrandIds = new Set(this.getBrands(targetOrg).map((b) => b.id));
    const filtered = list.filter((s) => (s.organisationId ? s.organisationId === targetOrg : orgBrandIds.has(s.brandId)));
    return brandId ? filtered.filter((s) => s.brandId === brandId) : filtered;
  }

  public static getSubmission(id: string): Submission | undefined {
    const raw = localStorage.getItem(STORAGE_KEYS.SUBMISSIONS);
    const list: Submission[] = raw ? JSON.parse(raw) : [DEMO_SUBMISSION, NOVAPAY_SUBMISSION];
    return list.find((s) => s.id === id);
  }

  public static saveSubmission(submission: Submission): void {
    const user = AuthService.getCurrentUser();

    // SERVER-SIDE RLS ENFORCEMENT: Creator must NEVER be able to Approve!
    if (submission.status === 'Approved' && !AuthService.canApprove(user)) {
      throw new Error(
        `Server Policy Rejection (403 Forbidden): User "${user.displayName}" with role "${user.role}" is prohibited from approving content. Approvals require Reviewer or Admin role.`
      );
    }

    if (!submission.organisationId) {
      submission.organisationId = user.organisationId;
    }

    const raw = localStorage.getItem(STORAGE_KEYS.SUBMISSIONS);
    const list: Submission[] = raw ? JSON.parse(raw) : [DEMO_SUBMISSION, NOVAPAY_SUBMISSION];
    const idx = list.findIndex((s) => s.id === submission.id);
    if (idx >= 0) {
      list[idx] = { ...submission, updatedAt: new Date().toISOString() };
    } else {
      list.unshift(submission);
    }
    localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(list));
  }

  public static deleteSubmission(id: string): void {
    const raw = localStorage.getItem(STORAGE_KEYS.SUBMISSIONS);
    const list: Submission[] = raw ? JSON.parse(raw) : [DEMO_SUBMISSION, NOVAPAY_SUBMISSION];
    const filtered = list.filter((s) => s.id !== id);
    localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(filtered));
  }

  // Analyses Cache
  public static getAnalysis(hashKey: string): AnalysisResult | null {
    const raw = localStorage.getItem(STORAGE_KEYS.ANALYSES);
    const map = raw ? JSON.parse(raw) : {};
    return map[hashKey] || null;
  }

  public static saveAnalysis(analysis: AnalysisResult): void {
    const raw = localStorage.getItem(STORAGE_KEYS.ANALYSES);
    const map = raw ? JSON.parse(raw) : {};
    map[analysis.hashKey] = analysis;
    localStorage.setItem(STORAGE_KEYS.ANALYSES, JSON.stringify(map));
  }

  // Tamper-Resistant Audit Logs (Insert-Only)
  public static getAuditLogs(submissionId?: string): AuditEntry[] {
    const raw = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
    const list: AuditEntry[] = raw ? JSON.parse(raw) : DEMO_AUDIT;
    const currentOrg = AuthService.getCurrentUser().organisationId;
    const filtered = list.filter((l) => !l.organisationId || l.organisationId === currentOrg);
    return submissionId ? filtered.filter((l) => l.submissionId === submissionId) : filtered;
  }

  public static addAuditEntry(entry: Omit<AuditEntry, 'id' | 'timestamp'>): AuditEntry {
    const user = AuthService.getCurrentUser();
    const raw = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
    const list: AuditEntry[] = raw ? JSON.parse(raw) : DEMO_AUDIT;
    const newEntry: AuditEntry = {
      ...entry,
      organisationId: entry.organisationId || user.organisationId,
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date().toISOString(),
    };
    list.unshift(newEntry);
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(list));
    return newEntry;
  }

  // Tamper-Resistance: Postgres RLS blocks UPDATE/DELETE; Data service explicitly throws
  public static deleteAuditEntry(): never {
    throw new Error(
      'Database Security Violation: Audit logs are tamper-resistant and insert-only. Deletions are forbidden by database governance.'
    );
  }

  // Session Usage Credits
  public static getSessionCredits(): SessionUsage {
    const raw = localStorage.getItem(STORAGE_KEYS.SESSION_CREDITS);
    if (!raw) {
      const initial: SessionUsage = { totalCredits: 50, usedCredits: 4, remainingCredits: 46 };
      localStorage.setItem(STORAGE_KEYS.SESSION_CREDITS, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  }

  public static useCredit(): boolean {
    const usage = this.getSessionCredits();
    if (usage.remainingCredits <= 0) return false;
    usage.usedCredits += 1;
    usage.remainingCredits -= 1;
    localStorage.setItem(STORAGE_KEYS.SESSION_CREDITS, JSON.stringify(usage));
    return true;
  }

  public static resetCredits(): SessionUsage {
    const usage: SessionUsage = { totalCredits: 50, usedCredits: 0, remainingCredits: 50 };
    localStorage.setItem(STORAGE_KEYS.SESSION_CREDITS, JSON.stringify(usage));
    return usage;
  }
}
