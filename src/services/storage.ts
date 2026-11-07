import {
  Brand,
  KnowledgeDocument,
  KnowledgeChunk,
  Submission,
  AnalysisResult,
  AuditEntry,
  SessionUsage,
} from '../types';

const STORAGE_KEYS = {
  BRANDS: 'brandguard_brands',
  DOCUMENTS: 'brandguard_documents',
  CHUNKS: 'brandguard_chunks',
  SUBMISSIONS: 'brandguard_submissions',
  ANALYSES: 'brandguard_analyses',
  AUDIT_LOGS: 'brandguard_audit_logs',
  SESSION_CREDITS: 'brandguard_session_credits',
  INITIALIZED: 'brandguard_initialized_v2',
};

// Seed brand data
const DEMO_BRAND: Brand = {
  id: 'brand-acme-cloud',
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
    'unrivaled',
    'unmatched',
    '100% guaranteed',
  ],
  guidelineVersion: 2,
  createdAt: '2026-01-15T09:00:00.000Z',
  updatedAt: '2026-03-01T14:30:00.000Z',
};

const DEMO_DOCUMENTS: KnowledgeDocument[] = [
  {
    id: 'doc-sla-overview',
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
];

const DEMO_CHUNKS: KnowledgeChunk[] = [
  {
    id: 'chunk-1',
    documentId: 'doc-sla-overview',
    brandId: 'brand-acme-cloud',
    documentName: 'Acme Cloud Platform Overview & SLA.pdf',
    section: 'Section 1.1: Platform Capabilities',
    pageNumber: 3,
    text: 'Acme Cloud provides enterprise distributed data synchronization across 14 global regions. The system delivers a contractually guaranteed 99.95% uptime SLA for all Tier 1 enterprise customers with automated failover in under 4 seconds.',
    tokenCount: 42,
  },
  {
    id: 'chunk-2',
    documentId: 'doc-sla-overview',
    brandId: 'brand-acme-cloud',
    documentName: 'Acme Cloud Platform Overview & SLA.pdf',
    section: 'Section 1.4: Empirical Performance Benchmarks',
    pageNumber: 8,
    text: 'According to the 2025 Third-Party Engineering Audit conducted by Forrester & Gartner Labs across 42 enterprise deployments, Acme Cloud demonstrated an average verified productivity improvement of 28% (with a standard deviation of ±4%). Any marketing claim exceeding 35% productivity gain is unverified and prohibited under corporate governance.',
    tokenCount: 56,
  },
  {
    id: 'chunk-3',
    documentId: 'doc-pricing-matrix',
    brandId: 'brand-acme-cloud',
    documentName: 'Acme Product Suite & Pricing Matrix.docx',
    section: 'Section 2.1: Authorized Product Names',
    pageNumber: 2,
    text: "The only authorized commercial products within the Acme catalog are: 'Acme Cloud' (Core Platform), 'Acme DataCore' (Streaming Data Warehouse), and 'Acme Shield' (Identity & Endpoint Protection). Products named 'AcmeCloud Pro', 'Acme Pro', or 'Acme Elite' do not exist and are unapproved names.",
    tokenCount: 51,
  },
  {
    id: 'chunk-4',
    documentId: 'doc-pricing-matrix',
    brandId: 'brand-acme-cloud',
    documentName: 'Acme Product Suite & Pricing Matrix.docx',
    section: 'Section 2.2: Pricing Schedule',
    pageNumber: 5,
    text: 'Acme Cloud is billed on annual commitment: Starter is $49/seat/month, Enterprise is $199/seat/month. Standard onboarding includes dedicated deployment engineering. All discounts require CFO signoff.',
    tokenCount: 34,
  },
  {
    id: 'chunk-5',
    documentId: 'doc-security-whitepaper',
    brandId: 'brand-acme-cloud',
    documentName: 'Security & Compliance Whitepaper.pdf',
    section: 'Section 3.1: Cryptographic Standards',
    pageNumber: 4,
    text: 'Acme Cloud enforces end-to-end AES-256 GCM encryption at rest and TLS 1.3 in transit with hardware security module (HSM) key rotation.',
    tokenCount: 26,
  },
  {
    id: 'chunk-6',
    documentId: 'doc-security-whitepaper',
    brandId: 'brand-acme-cloud',
    documentName: 'Security & Compliance Whitepaper.pdf',
    section: 'Section 3.4: Mandatory Compliance Language',
    pageNumber: 12,
    text: "Acme Cloud is audited annually for SOC 2 Type II and ISO 27001 certifications. Under legal compliance directives, no promotional material may ever use terms such as 'hack-proof', 'unbreakable', or 'guaranteed zero breach'. Modern threat postures acknowledge defense-in-depth rather than invulnerability.",
    tokenCount: 47,
  },
];

const DEMO_SUBMISSION: Submission = {
  id: 'sub-acme-q1-campaign',
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

const DEMO_AUDIT: AuditEntry[] = [
  {
    id: 'audit-1',
    submissionId: 'sub-acme-q1-campaign',
    brandId: 'brand-acme-cloud',
    timestamp: '2026-03-02T10:15:00.000Z',
    role: 'Creator',
    actorName: 'Jordan Vance',
    action: 'CREATED',
    details: 'Submitted content draft for automated brand and evidence verification.',
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
    localStorage.setItem(STORAGE_KEYS.BRANDS, JSON.stringify([DEMO_BRAND]));
    localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(DEMO_DOCUMENTS));
    localStorage.setItem(STORAGE_KEYS.CHUNKS, JSON.stringify(DEMO_CHUNKS));
    localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify([DEMO_SUBMISSION]));
    localStorage.setItem(STORAGE_KEYS.ANALYSES, JSON.stringify({}));
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(DEMO_AUDIT));
    localStorage.setItem(
      STORAGE_KEYS.SESSION_CREDITS,
      JSON.stringify({ totalCredits: 50, usedCredits: 4, remainingCredits: 46 })
    );
    localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
  }

  // Brands
  public static getBrands(): Brand[] {
    const raw = localStorage.getItem(STORAGE_KEYS.BRANDS);
    return raw ? JSON.parse(raw) : [DEMO_BRAND];
  }

  public static getBrand(id: string): Brand | undefined {
    return this.getBrands().find((b) => b.id === id);
  }

  public static saveBrand(brand: Brand): void {
    const brands = this.getBrands();
    const idx = brands.findIndex((b) => b.id === brand.id);
    if (idx >= 0) {
      brands[idx] = { ...brand, updatedAt: new Date().toISOString() };
    } else {
      brands.push(brand);
    }
    localStorage.setItem(STORAGE_KEYS.BRANDS, JSON.stringify(brands));
  }

  public static deleteBrand(id: string): void {
    const brands = this.getBrands().filter((b) => b.id !== id);
    localStorage.setItem(STORAGE_KEYS.BRANDS, JSON.stringify(brands));
  }

  // Knowledge Documents
  public static getDocuments(brandId?: string): KnowledgeDocument[] {
    const raw = localStorage.getItem(STORAGE_KEYS.DOCUMENTS);
    const docs: KnowledgeDocument[] = raw ? JSON.parse(raw) : [];
    return brandId ? docs.filter((d) => d.brandId === brandId) : docs;
  }

  public static getDocument(id: string): KnowledgeDocument | undefined {
    const docs = this.getDocuments();
    return docs.find((d) => d.id === id);
  }

  public static saveDocument(doc: KnowledgeDocument, chunks: KnowledgeChunk[]): void {
    const docs = this.getDocuments();
    const idx = docs.findIndex((d) => d.id === doc.id);
    if (idx >= 0) {
      docs[idx] = doc;
    } else {
      docs.push(doc);
    }
    localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(docs));

    // Save chunks
    const allChunks = this.getAllChunks().filter((c) => c.documentId !== doc.id);
    allChunks.push(...chunks);
    localStorage.setItem(STORAGE_KEYS.CHUNKS, JSON.stringify(allChunks));
  }

  public static deleteDocument(id: string): void {
    const docs = this.getDocuments().filter((d) => d.id !== id);
    localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(docs));
    const chunks = this.getAllChunks().filter((c) => c.documentId !== id);
    localStorage.setItem(STORAGE_KEYS.CHUNKS, JSON.stringify(chunks));
  }

  // Chunks
  public static getAllChunks(): KnowledgeChunk[] {
    const raw = localStorage.getItem(STORAGE_KEYS.CHUNKS);
    return raw ? JSON.parse(raw) : [];
  }

  public static getChunksByBrand(brandId: string): KnowledgeChunk[] {
    return this.getAllChunks().filter((c) => c.brandId === brandId);
  }

  // Submissions
  public static getSubmissions(brandId?: string): Submission[] {
    const raw = localStorage.getItem(STORAGE_KEYS.SUBMISSIONS);
    const list: Submission[] = raw ? JSON.parse(raw) : [];
    return brandId ? list.filter((s) => s.brandId === brandId) : list;
  }

  public static getSubmission(id: string): Submission | undefined {
    return this.getSubmissions().find((s) => s.id === id);
  }

  public static saveSubmission(submission: Submission): void {
    const list = this.getSubmissions();
    const idx = list.findIndex((s) => s.id === submission.id);
    if (idx >= 0) {
      list[idx] = { ...submission, updatedAt: new Date().toISOString() };
    } else {
      list.unshift(submission);
    }
    localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(list));
  }

  public static deleteSubmission(id: string): void {
    const list = this.getSubmissions().filter((s) => s.id !== id);
    localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(list));
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

  // Audit Logs
  public static getAuditLogs(submissionId?: string): AuditEntry[] {
    const raw = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
    const list: AuditEntry[] = raw ? JSON.parse(raw) : [];
    return submissionId ? list.filter((l) => l.submissionId === submissionId) : list;
  }

  public static addAuditEntry(entry: Omit<AuditEntry, 'id' | 'timestamp'>): AuditEntry {
    const list = this.getAuditLogs();
    const newEntry: AuditEntry = {
      ...entry,
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date().toISOString(),
    };
    list.unshift(newEntry);
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(list));
    return newEntry;
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
