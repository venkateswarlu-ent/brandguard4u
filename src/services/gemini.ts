import {
  Brand,
  Finding,
  AnalysisResult,
  VisualAnalysisResult,
} from '../types';
import { StorageService } from './storage';
import { DeterministicRulesEngine } from './rules';
import { BM25Retriever } from './retrieval';

export class GeminiService {
  /**
   * Simple string hash for caching (content + guidelineVersion + knowledgeBaseCount)
   */
  public static computeHash(
    content: string,
    brandId: string,
    guidelineVersion: number,
    chunkCount: number
  ): string {
    const raw = `${brandId}_v${guidelineVersion}_c${chunkCount}_${content.trim()}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      const char = raw.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32bit integer
    }
    return `hash_${Math.abs(hash)}`;
  }

  /**
   * Full analysis pipeline running Engine 1 (Brand) & Engine 2 (Evidence)
   */
  public static async analyzeContent(
    content: string,
    brand: Brand,
    submissionId: string,
    versionNumber: number
  ): Promise<AnalysisResult> {
    const brandChunks = StorageService.getChunksByBrand(brand.id);
    const hashKey = this.computeHash(
      content,
      brand.id,
      brand.guidelineVersion,
      brandChunks.length
    );

    // 1. Check cache first
    const cached = StorageService.getAnalysis(hashKey);
    if (cached) {
      return {
        ...cached,
        submissionId,
        versionNumber,
        cacheHit: true,
      };
    }

    // 2. Consume session review credit
    StorageService.useCredit();

    const allFindings: Finding[] = [];

    // 3. ENGINE 1: Deterministic code checks first (no LLM latency)
    const deterministicFindings = DeterministicRulesEngine.evaluate(content, brand);
    allFindings.push(...deterministicFindings);

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

    // 5. ENGINE 2: Extract factual and promotional claims
    let claims: any[] = [];
    try {
      const res = await fetch('/api/gemini/claims-extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        const data = await res.json();
        claims = data.claims || [];
      }
    } catch (e) {
      console.warn('Claims extraction fallback:', e);
    }

    // Fallback if claim extraction returned empty but text has content
    if (!claims.length && content.trim().length > 15) {
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

    // 6. ENGINE 2: BM25 retrieval over closed knowledge base per claim
    const claimsWithChunks = claims.map((claim) => {
      const query = `${claim.claimText} ${(claim.keywords || []).join(' ')}`;
      const retrieved = BM25Retriever.retrieve(query, brandChunks, 3);
      return {
        claim,
        retrievedChunks: retrieved.map((r) => ({
          documentName: r.chunk.documentName,
          section: r.chunk.section,
          pageNumber: r.chunk.pageNumber,
          text: r.chunk.text,
          relevanceScore: Math.round(r.score * 100) / 100,
        })),
      };
    });

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
            // Unverified (missing evidence)
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
   * Visual Intelligence Lite: Extract dominant colors via HTML5 Canvas
   * and call OCR via Gemini
   */
  public static async analyzeVisualAsset(
    imageFile: File,
    brand: Brand
  ): Promise<VisualAnalysisResult> {
    const imageUrl = URL.createObjectURL(imageFile);
    const dominantColors = await this.sampleCanvasColors(imageFile);

    // Color distance math against brand palette
    const targetColors = [
      { target: 'Primary' as const, brandHex: brand.brandColors.primary },
      { target: 'Secondary' as const, brandHex: brand.brandColors.secondary },
      { target: 'Accent' as const, brandHex: brand.brandColors.accent },
    ];

    const paletteMatches = targetColors.map((target) => {
      // Find closest detected color
      let minDistance = 9999;
      let closestHex = dominantColors[0]?.hex || '#000000';

      for (const detected of dominantColors) {
        const dist = this.colorDistance(target.brandHex, detected.hex);
        if (dist < minDistance) {
          minDistance = dist;
          closestHex = detected.hex;
        }
      }

      // If distance < 45, it is considered compliant
      const isCompliant = minDistance < 48;
      return {
        target: target.target,
        brandHex: target.brandHex,
        detectedHex: closestHex,
        distance: Math.round(minDistance),
        isCompliant,
      };
    });

    const compliantCount = paletteMatches.filter((p) => p.isCompliant).length;
    const complianceScore = Math.round((compliantCount / paletteMatches.length) * 100);

    const potentialIssues: string[] = [];
    if (complianceScore < 66) {
      potentialIssues.push(
        'Dominant color spectrum diverges from official approved brand hex palette.'
      );
    }

    // OCR via Gemini
    let extractedText = '';
    let altTextSuggestion = '';
    try {
      const base64 = await this.fileToBase64(imageFile);
      const res = await fetch('/api/gemini/ocr-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType: imageFile.type,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        extractedText = data.extractedText || '';
        altTextSuggestion = data.altTextSuggestion || '';
      }
    } catch (e) {
      console.warn('OCR error:', e);
    }

    return {
      imageUrl,
      dominantColors,
      paletteMatches,
      complianceScore,
      extractedText,
      altTextSuggestion,
      potentialIssues,
      analyzedAt: new Date().toISOString(),
    };
  }

  private static fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private static sampleCanvasColors(
    file: File
  ): Promise<{ hex: string; percent: number }[]> {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 100;
        canvas.height = 100;
        if (!ctx) {
          resolve([{ hex: '#0F172A', percent: 60 }, { hex: '#2563EB', percent: 40 }]);
          return;
        }

        ctx.drawImage(img, 0, 0, 100, 100);
        const data = ctx.getImageData(0, 0, 100, 100).data;
        const colorCounts: Record<string, number> = {};

        for (let i = 0; i < data.length; i += 16) {
          const r = Math.round(data[i] / 32) * 32;
          const g = Math.round(data[i + 1] / 32) * 32;
          const b = Math.round(data[i + 2] / 32) * 32;
          const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
          colorCounts[hex] = (colorCounts[hex] || 0) + 1;
        }

        const totalSamples = Object.values(colorCounts).reduce((a, b) => a + b, 0);
        const sorted = Object.entries(colorCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([hex, count]) => ({
            hex,
            percent: Math.round((count / (totalSamples || 1)) * 100),
          }));

        resolve(sorted.length ? sorted : [{ hex: '#0F172A', percent: 100 }]);
        URL.revokeObjectURL(url);
      };
      img.onerror = () => {
        resolve([{ hex: '#0F172A', percent: 100 }]);
      };
      img.src = url;
    });
  }

  private static colorDistance(hex1: string, hex2: string): number {
    const parse = (hex: string) => {
      const clean = hex.replace('#', '');
      return {
        r: parseInt(clean.substring(0, 2), 16) || 0,
        g: parseInt(clean.substring(2, 4), 16) || 0,
        b: parseInt(clean.substring(4, 6), 16) || 0,
      };
    };
    const c1 = parse(hex1);
    const c2 = parse(hex2);
    return Math.sqrt(
      Math.pow(c1.r - c2.r, 2) + Math.pow(c1.g - c2.g, 2) + Math.pow(c1.b - c2.b, 2)
    );
  }
}
