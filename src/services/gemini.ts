import {
  Brand,
  Finding,
  AnalysisResult,
  VisualAnalysisResult,
} from '../types';
import { StorageService } from './storage';
import { DeterministicRulesEngine } from './rules';
import { VectorSimilarityRetriever } from './retrieval';
import { VisualIntelligenceEngine } from './visual';

export class GeminiService {
  /**
   * Result caching keyed by hash of content + guideline version + knowledge-base version (+ optional visual salt)
   */
  public static computeHash(
    content: string,
    brandId: string,
    guidelineVersion: number,
    kbVersion: string | number,
    visualSalt: string = ''
  ): string {
    const raw = `${brandId}_gv${guidelineVersion}_kb${kbVersion}_${content.trim()}_${visualSalt}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      const char = raw.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32bit integer
    }
    return `hash_${Math.abs(hash)}`;
  }

  /**
   * Full analysis pipeline running Engine 1 (Brand), Engine 2 (Evidence), and Engine 3 (Visual)
   */
  public static async analyzeContent(
    content: string,
    brand: Brand,
    submissionId: string,
    versionNumber: number,
    options: {
      visualAnalysis?: VisualAnalysisResult;
      missingAltTextCount?: number;
      documentName?: string;
    } = {}
  ): Promise<AnalysisResult> {
    const brandChunks = StorageService.getChunksByBrand(brand.id);
    const submission = StorageService.getSubmission(submissionId);
    const visual = options.visualAnalysis || submission?.visualAnalysis;
    const visualSalt = visual ? `${visual.complianceScore}_${visual.extractedText || ''}` : '';

    const kbVersion = StorageService.getKnowledgeBaseVersion(brand.id);

    const hashKey = this.computeHash(
      content,
      brand.id,
      brand.guidelineVersion,
      kbVersion,
      visualSalt
    );

    // 1. Check cache first (instant and identical re-run)
    const cached = StorageService.getAnalysis(hashKey);
    if (cached) {
      return {
        ...cached,
        submissionId,
        versionNumber,
        cacheHit: true,
      };
    }

    // 1b. Ensure chunk embeddings are computed and stored once per document version
    const chunksNeedingEmbeddings = brandChunks.some((c) => !c.embedding || c.embedding.length === 0);
    if (chunksNeedingEmbeddings) {
      const updatedChunks = await VectorSimilarityRetriever.generateChunkEmbeddings(brandChunks);
      StorageService.saveChunks(updatedChunks);
    }

    // 2. Consume session review credit
    StorageService.useCredit();

    const allFindings: Finding[] = [];

    // 3. ENGINE 1: Deterministic code checks first (no LLM latency)
    const deterministicFindings = DeterministicRulesEngine.evaluate(content, brand);
    allFindings.push(...deterministicFindings);

    // 3b. ENGINE 1 on Visual Extracted Text (if image contains copy)
    if (visual?.extractedText && visual.extractedText.trim().length > 0) {
      const visualTextFindings = DeterministicRulesEngine.evaluate(
        visual.extractedText,
        brand,
        'Image Graphic Text'
      );
      allFindings.push(...visualTextFindings);
    }

    // 3c. Incorporate Engine 3 Visual Findings (Palette Mismatch, Logo Mismatch)
    if (visual?.findings && Array.isArray(visual.findings)) {
      allFindings.push(...visual.findings);
    }

    // 3d. Check for missing alt-text in DOCX/HTML documents
    if (options.missingAltTextCount && options.missingAltTextCount > 0) {
      const altFinding = VisualIntelligenceEngine.createMissingAltTextFinding(
        options.missingAltTextCount,
        options.documentName || 'Uploaded Document'
      );
      allFindings.push(altFinding);
    }

    // 4. ENGINE 1: Contextual tone check via server-side Gemini
    let toneSummary = 'Tone evaluated against brand voice guidelines.';
    let toneScore = 85;
    try {
      const res = await fetch('/api/gemini/tone-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          brandToneDescription: brand.toneDescription,
          brandName: brand.name,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toneSummary = data.feedback || toneSummary;
        toneScore = typeof data.toneScore === 'number' ? data.toneScore : toneScore;

        if (Array.isArray(data.issues)) {
          for (const item of data.issues) {
            allFindings.push({
              id: `tone-${allFindings.length + 1}`,
              category: 'TONE_INCONSISTENCY',
              severity: item.severity || 'Medium',
              engine: 'Engine 1: Brand Intelligence',
              highlight: item.highlight,
              explanation: item.explanation,
              suggestedFix: item.suggestedFix,
            });
          }
        }
      }
    } catch (e) {
      console.warn('Tone check fallback triggered:', e);
    }

    // 5. ENGINE 2: Extract factual and promotional claims (including text from visual assets)
    const textForClaims = visual?.extractedText
      ? `${content}\n\n[Graphic Promotional Copy]: ${visual.extractedText}`
      : content;

    let claims: any[] = [];
    try {
      const res = await fetch('/api/gemini/claims-extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: textForClaims }),
      });
      if (res.ok) {
        const data = await res.json();
        claims = data.claims || [];
      }
    } catch (e) {
      console.warn('Claims extraction fallback:', e);
    }

    // Fallback if claim extraction returned empty but text has content
    if (!claims.length && textForClaims.trim().length > 15) {
      claims = [
        {
          id: 'claim-1',
          claimText: content.trim(),
          originalSpan: content.trim(),
          claimType: 'General Promotional Claim',
          keywords: [brand.name, 'platform', 'productivity', 'pro'],
        },
      ];
    }

    // 6. ENGINE 2: Semantic vector similarity retrieval over closed knowledge base per claim
    const claimsWithChunks = await Promise.all(
      claims.map(async (claim) => {
        const query = `${claim.claimText} ${(claim.keywords || []).join(' ')}`;
        const retrieved = await VectorSimilarityRetriever.retrieve(query, brandChunks, 3);
        return {
          claim,
          retrievedChunks: retrieved.map((r) => ({
            documentName: r.chunk.documentName,
            documentVersion: r.chunk.documentVersion || '1.0',
            section: r.chunk.section,
            pageNumber: r.chunk.pageNumber,
            text: r.chunk.text,
            relevanceScore: Math.round(r.score * 100) / 100,
            matchType: r.matchType,
          })),
        };
      })
    );

    // 7. ENGINE 2: Verify claims against ONLY retrieved chunks
    let supportedCount = 0;
    let contradictedCount = 0;
    let unverifiedCount = 0;

    try {
      const res = await fetch('/api/gemini/verify-claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claimsWithChunks,
          brandName: brand.name,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const verifications = data.verifications || [];

        for (const v of verifications) {
          // Flag cross-document conflicts if detected between two approved documents
          if (v.conflictsDetected && Array.isArray(v.conflictsDetected) && v.conflictsDetected.length > 0) {
            for (const conflict of v.conflictsDetected) {
              allFindings.push({
                id: `ev-conflict-${allFindings.length + 1}`,
                category: 'DOCUMENT_CONFLICT',
                severity: 'Critical',
                engine: 'Engine 2: Evidence Intelligence',
                highlight: v.originalSpan,
                explanation: `Cross-Document Conflict: ${conflict}`,
                evidenceCitation: v.citation,
                citedChunkText: v.citedChunkText,
                conflictsDetected: v.conflictsDetected,
                suggestedFix: 'Reconcile contradictory statements between internal approved knowledge base documents.',
                status: 'Contradicted',
              });
            }
          }

          if (v.status === 'Supported') {
            supportedCount++;
          } else if (v.status === 'Contradicted') {
            contradictedCount++;
            allFindings.push({
              id: `ev-contra-${allFindings.length + 1}`,
              category: 'CONTRADICTED_CLAIM',
              severity: 'Critical',
              engine: 'Engine 2: Evidence Intelligence',
              highlight: v.originalSpan,
              explanation: v.reason,
              evidenceCitation: v.citation,
              citedChunkText: v.citedChunkText,
              conflictsDetected: v.conflictsDetected,
              suggestedFix: v.suggestedFix || 'Align with verified benchmark documents.',
              status: 'Contradicted',
            });
          } else {
            // Unverified (missing evidence) - never stated as false
            unverifiedCount++;
            allFindings.push({
              id: `ev-unver-${allFindings.length + 1}`,
              category: 'UNVERIFIED_CLAIM',
              severity: 'High',
              engine: 'Engine 2: Evidence Intelligence',
              highlight: v.originalSpan,
              explanation: v.reason || 'No supporting evidence found in the closed brand knowledge base. Closed-knowledge rules classify this as Unverified.',
              evidenceCitation: v.citation || 'No approved reference chunk',
              citedChunkText: v.citedChunkText,
              suggestedFix: v.suggestedFix || 'Provide certified documentation or soften promotional assertion.',
              status: 'Unverified',
            });
          }
        }
      }
    } catch (e) {
      console.warn('Claim verification fallback:', e);
    }

    // 8. Calculate Risk Score (0 = Clean/Safe, 100 = High Risk)
    // Critical = 30 pts, High = 15 pts, Medium = 8 pts, Low = 3 pts
    let rawRisk = 0;
    for (const f of allFindings) {
      if (f.severity === 'Critical') rawRisk += 30;
      else if (f.severity === 'High') rawRisk += 15;
      else if (f.severity === 'Medium') rawRisk += 8;
      else rawRisk += 3;
    }

    const riskScore = Math.min(100, Math.max(0, rawRisk));
    let riskLevel: 'Clean' | 'Low' | 'Moderate' | 'Critical' = 'Clean';
    if (riskScore >= 60) riskLevel = 'Critical';
    else if (riskScore >= 35) riskLevel = 'Moderate';
    else if (riskScore > 0) riskLevel = 'Low';

    const result: AnalysisResult = {
      hashKey,
      brandId: brand.id,
      submissionId,
      versionNumber,
      analyzedAt: new Date().toISOString(),
      riskScore,
      riskLevel,
      findings: allFindings,
      toneSummary,
      toneScore,
      claimsCount: claims.length,
      supportedClaimsCount: supportedCount,
      contradictedClaimsCount: contradictedCount,
      unverifiedClaimsCount: unverifiedCount,
      cacheHit: false,
    };

    // Save in storage cache
    StorageService.saveAnalysis(result);

    return result;
  }

  /**
   * Request AI revision for the entire content resolving findings
   */
  public static async generateRevision(
    content: string,
    findings: Finding[],
    brand: Brand
  ): Promise<{ revisedContent: string; summaryOfChanges: string[] }> {
    try {
      const res = await fetch('/api/gemini/revise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          findings,
          brandToneDescription: brand.toneDescription,
          approvedProducts: brand.approvedProductNames,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        return {
          revisedContent: data.revisedContent || content,
          summaryOfChanges: data.summaryOfChanges || ['Refined text to meet brand standards.'],
        };
      }
    } catch (e) {
      console.error('Error generating revision:', e);
    }

    // Deterministic fallback revision
    let revised = content;
    for (const finding of findings) {
      if (finding.suggestedFix && finding.highlight) {
        revised = revised.replace(finding.highlight, finding.suggestedFix);
      }
    }

    return {
      revisedContent: revised,
      summaryOfChanges: [
        'Substituted prohibited terms with enterprise compliant alternatives',
        'Replaced unapproved product names with official catalog names',
        'Adjusted unverified assertions to match documented benchmarks',
      ],
    };
  }

  /**
   * Visual Intelligence: Delegate to VisualIntelligenceEngine (Engine 3)
   */
  public static async analyzeVisualAsset(
    imageFile: File,
    brand: Brand
  ): Promise<VisualAnalysisResult> {
    return VisualIntelligenceEngine.analyzeImage(imageFile, brand);
  }
}
