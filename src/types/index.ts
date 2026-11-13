export type UserRole = 'Admin' | 'Creator' | 'Reviewer';

export interface Organisation {
  id: string;
  name: string;
  domain?: string;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  organisationId: string;
  organisationName: string;
  role: UserRole;
  displayName: string;
  email: string;
  avatarUrl?: string;
}

export interface AuthSession {
  user: UserProfile;
  token: string;
  isSupabaseConnected: boolean;
}

export interface BrandColors {
  primary: string;
  secondary: string;
  accent: string;
}

export interface Brand {
  id: string;
  organisationId?: string;
  name: string;
  logoUrl?: string;
  brandColors: BrandColors;
  approvedProductNames: string[];
  toneDescription: string;
  approvedTerms: string[];
  prohibitedTerms: string[];
  prohibitedPatterns: string[];
  guidelineVersion: number;
  createdAt: string;
  updatedAt: string;
}

export type DocumentType = 'guideline' | 'product_facts' | 'evidence' | 'pricing' | 'compliance';

export interface KnowledgeDocument {
  id: string;
  organisationId?: string;
  brandId: string;
  name: string;
  type: DocumentType;
  version: string;
  uploadDate: string;
  fileSize: string;
  rawText: string;
  chunkCount: number;
}

export interface KnowledgeChunk {
  id: string;
  organisationId?: string;
  documentId: string;
  brandId: string;
  documentName: string;
  documentVersion?: string;
  section: string;
  pageNumber?: number;
  text: string;
  tokenCount: number;
  embedding?: number[];
  embeddingModel?: string;
  embeddedAt?: string;
}

export type SubmissionStatus = 'Draft' | 'In Review' | 'Changes Requested' | 'Approved';

export interface SubmissionVersion {
  versionNumber: number;
  content: string;
  submittedAt: string;
  submittedByRole: UserRole;
  submittedByName: string;
  riskScore: number;
  findingsCount: number;
}

export interface LogoCheckResult {
  checked: boolean;
  hasLogoConfigured: boolean;
  isDetected: boolean;
  similarityScore: number;
  details: string;
}

export interface VisualAnalysisResult {
  imageUrl: string;
  dominantColors: { hex: string; percent: number }[];
  paletteMatches: {
    target: 'Primary' | 'Secondary' | 'Accent';
    brandHex: string;
    detectedHex: string;
    distance: number;
    isCompliant: boolean;
  }[];
  complianceScore: number;
  logoCheck?: LogoCheckResult;
  extractedText?: string;
  altTextSuggestion?: string;
  potentialIssues: string[];
  findings?: Finding[];
  analyzedAt: string;
}

export interface Submission {
  id: string;
  organisationId?: string;
  brandId: string;
  title: string;
  channel: string;
  currentVersion: number;
  versions: SubmissionVersion[];
  status: SubmissionStatus;
  createdAt: string;
  updatedAt: string;
  reviewerComment?: string;
  overrideJustification?: string;
  visualAnalysis?: VisualAnalysisResult;
  attachedImageFile?: string;
  analysisStatus?: 'pending' | 'running' | 'completed' | 'failed';
  analysisError?: string;
}

export type FindingCategory =
  | 'PROHIBITED_TERM'
  | 'SUPERLATIVE'
  | 'PRODUCT_NAME'
  | 'TONE_INCONSISTENCY'
  | 'CONTRADICTED_CLAIM'
  | 'UNVERIFIED_CLAIM'
  | 'DOCUMENT_CONFLICT'
  | 'VISUAL_PALETTE_MISMATCH'
  | 'VISUAL_LOGO_MISMATCH'
  | 'VISUAL_ALT_TEXT_MISSING';

export type Severity = 'Critical' | 'High' | 'Medium' | 'Low';

export type EngineType =
  | 'Engine 1: Brand Intelligence'
  | 'Engine 2: Evidence Intelligence'
  | 'Engine 3: Visual Intelligence';

export interface Finding {
  id: string;
  category: FindingCategory;
  severity: Severity;
  engine: EngineType;
  highlight: string;
  startIndex?: number;
  endIndex?: number;
  explanation: string;
  evidenceCitation?: string;
  citedChunkText?: string;
  conflictsDetected?: string[];
  suggestedFix: string;
  status?: 'Supported' | 'Contradicted' | 'Unverified';
}

export interface AnalysisResult {
  hashKey: string;
  brandId: string;
  submissionId: string;
  versionNumber: number;
  analyzedAt: string;
  riskScore: number; // 0 to 100
  riskLevel: 'Clean' | 'Low' | 'Moderate' | 'Critical';
  findings: Finding[];
  toneSummary?: string;
  toneScore?: number;
  claimsCount: number;
  supportedClaimsCount: number;
  contradictedClaimsCount: number;
  unverifiedClaimsCount: number;
  cacheHit?: boolean;
}

export type AuditAction =
  | 'CREATED'
  | 'REVISED'
  | 'ANALYSIS_RUN'
  | 'COMMENTED'
  | 'CHANGES_REQUESTED'
  | 'APPROVED';

export interface AuditEntry {
  id: string;
  organisationId?: string;
  submissionId: string;
  brandId: string;
  timestamp: string;
  role: UserRole;
  actorName: string;
  action: AuditAction;
  details: string;
  metadata?: Record<string, any>;
}

export interface SessionUsage {
  totalCredits: number;
  usedCredits: number;
  remainingCredits: number;
}
