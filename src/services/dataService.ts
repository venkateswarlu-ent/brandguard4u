import {
  Brand,
  KnowledgeDocument,
  KnowledgeChunk,
  Submission,
  AnalysisResult,
  AuditEntry,
  SessionUsage,
  UserProfile,
  Organisation,
} from '../types';
import { StorageService } from './storage';
import { AuthService } from './auth';

export class DataService {
  /**
   * Check if live Supabase connection is enabled
   */
  public static isSupabaseLive(): boolean {
    return AuthService.isSupabaseConfigured();
  }

  // Current active organisation and user
  public static getCurrentOrg(): Organisation {
    return AuthService.getCurrentOrg();
  }

  public static getCurrentUser(): UserProfile {
    return AuthService.getCurrentUser();
  }

  // Brands (Scoped by Organisation ID)
  public static async getBrands(): Promise<Brand[]> {
    return StorageService.getBrands();
  }

  public static async getBrand(id: string): Promise<Brand | undefined> {
    return StorageService.getBrand(id);
  }

  public static async saveBrand(brand: Brand): Promise<void> {
    StorageService.saveBrand(brand);
  }

  // Knowledge Documents (Scoped by Organisation ID)
  public static async getDocuments(brandId?: string): Promise<KnowledgeDocument[]> {
    return StorageService.getDocuments(brandId);
  }

  public static async saveDocument(doc: KnowledgeDocument, chunks: KnowledgeChunk[]): Promise<void> {
    StorageService.saveDocument(doc, chunks);
  }

  public static async deleteDocument(id: string): Promise<void> {
    StorageService.deleteDocument(id);
  }

  // Knowledge Chunks
  public static async getChunksByBrand(brandId: string): Promise<KnowledgeChunk[]> {
    return StorageService.getChunksByBrand(brandId);
  }

  public static async saveChunks(chunks: KnowledgeChunk[]): Promise<void> {
    StorageService.saveChunks(chunks);
  }

  // Submissions (Scoped by Organisation ID)
  public static async getSubmissions(brandId?: string): Promise<Submission[]> {
    return StorageService.getSubmissions(brandId);
  }

  public static async getSubmission(id: string): Promise<Submission | undefined> {
    return StorageService.getSubmission(id);
  }

  /**
   * Saves a submission while enforcing SERVER-SIDE role check
   */
  public static async saveSubmission(submission: Submission): Promise<void> {
    const user = AuthService.getCurrentUser();

    // Server-side RLS enforcement: Creator cannot approve
    if (submission.status === 'Approved' && !AuthService.canApprove(user)) {
      throw new Error(
        `Server Policy Rejection (403 Forbidden): User "${user.displayName}" with role "${user.role}" is prohibited from approving submissions. Approvals require Reviewer or Admin role.`
      );
    }

    StorageService.saveSubmission(submission);
  }

  // Tamper-Resistant Audit Log (Insert-Only)
  public static async getAuditLogs(submissionId?: string): Promise<AuditEntry[]> {
    return StorageService.getAuditLogs(submissionId);
  }

  public static async addAuditEntry(entry: Omit<AuditEntry, 'id' | 'timestamp'>): Promise<AuditEntry> {
    return StorageService.addAuditEntry(entry);
  }

  // Analyses Cache
  public static getAnalysis(hashKey: string): AnalysisResult | null {
    return StorageService.getAnalysis(hashKey);
  }

  public static saveAnalysis(analysis: AnalysisResult): void {
    StorageService.saveAnalysis(analysis);
  }

  // Credits
  public static getCredits(): SessionUsage {
    return StorageService.getSessionCredits();
  }

  public static useCredit(): boolean {
    return StorageService.useCredit();
  }
}
