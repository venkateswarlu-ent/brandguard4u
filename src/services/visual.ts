import {
  Brand,
  Finding,
  VisualAnalysisResult,
  LogoCheckResult,
} from '../types';

export class VisualIntelligenceEngine {
  /**
   * Complete Visual Analysis Pipeline (Engine 3)
   */
  public static async analyzeImage(
    imageSource: File | string,
    brand: Brand,
    options: { isEmbeddedInDoc?: boolean } = {}
  ): Promise<VisualAnalysisResult> {
    let imageUrl = '';
    let base64 = '';

    if (imageSource instanceof File) {
      imageUrl = URL.createObjectURL(imageSource);
      try {
        base64 = await this.fileToBase64(imageSource);
      } catch (e) {
        console.warn('Could not read image file as base64:', e);
      }
    } else {
      imageUrl = imageSource;
      base64 = imageSource;
    }

    const potentialIssues: string[] = [];
    const visualFindings: Finding[] = [];

    // 1. Colour Check: Dominant colors via Canvas & distance against approved brand palette
    let dominantColors: { hex: string; percent: number }[] = [];
    try {
      dominantColors = await this.sampleCanvasColors(imageUrl);
    } catch (e) {
      console.warn('Canvas color sampling warning:', e);
      dominantColors = [{ hex: '#0F172A', percent: 100 }];
    }

    const targetColors = [
      { target: 'Primary' as const, brandHex: brand.brandColors.primary || '#0F172A' },
      { target: 'Secondary' as const, brandHex: brand.brandColors.secondary || '#2563EB' },
      { target: 'Accent' as const, brandHex: brand.brandColors.accent || '#0D9488' },
    ];

    const paletteMatches = targetColors.map((target) => {
      let minDistance = 9999;
      let closestHex = dominantColors[0]?.hex || '#000000';

      for (const detected of dominantColors) {
        const dist = this.colorDistance(target.brandHex, detected.hex);
        if (dist < minDistance) {
          minDistance = dist;
          closestHex = detected.hex;
        }
      }

      // Tolerance of 48 in RGB Euclidean space
      const isCompliant = minDistance <= 48;
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

    if (complianceScore < 66) {
      const issueMsg = `Potential issue: Dominant color spectrum diverges from official approved ${brand.name} brand palette (${paletteMatches.filter(m => !m.isCompliant).map(m => `${m.target}: ${m.brandHex} vs detected ${m.detectedHex}`).join(', ')}).`;
      potentialIssues.push(issueMsg);

      visualFindings.push({
        id: `vis-palette-${Date.now()}`,
        category: 'VISUAL_PALETTE_MISMATCH',
        severity: 'Medium',
        engine: 'Engine 3: Visual Intelligence',
        highlight: `Palette Compliance: ${complianceScore}%`,
        explanation: `${issueMsg} Automated visual checks flag this for human creative review.`,
        suggestedFix: `Adjust color grading or background accents toward approved brand hex values: Primary (${brand.brandColors.primary}), Secondary (${brand.brandColors.secondary}), Accent (${brand.brandColors.accent}).`,
      });
    }

    // 2. Logo Check: Compare against brand logo reference if configured
    let logoCheck: LogoCheckResult = {
      checked: false,
      hasLogoConfigured: !!brand.logoUrl,
      isDetected: false,
      similarityScore: 0,
      details: brand.logoUrl ? 'Initiating logo check...' : 'No brand reference logo configured; skipped.',
    };

    if (brand.logoUrl && base64) {
      try {
        const logoRes = await fetch('/api/gemini/logo-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: base64,
            logoBase64: brand.logoUrl,
            brandName: brand.name,
          }),
        });

        if (logoRes.ok) {
          const logoData = await logoRes.json();
          logoCheck = {
            checked: true,
            hasLogoConfigured: true,
            isDetected: !!logoData.isDetected,
            similarityScore: logoData.similarityScore ?? (logoData.isDetected ? 85 : 40),
            details: logoData.details || (logoData.isDetected ? 'Brand logo identified in graphic.' : 'Brand logo not detected.'),
          };

          if (!logoCheck.isDetected || logoCheck.similarityScore < 60) {
            const logoIssue = `Potential issue: Official brand logo was not clearly detected in the promotional graphic (Similarity score: ${logoCheck.similarityScore}/100).`;
            potentialIssues.push(logoIssue);

            visualFindings.push({
              id: `vis-logo-${Date.now()}`,
              category: 'VISUAL_LOGO_MISMATCH',
              severity: 'Medium',
              engine: 'Engine 3: Visual Intelligence',
              highlight: 'Brand Logo Detection',
              explanation: `${logoIssue} Check if the logo is present, unobstructed, and conforms to brand spacing guidelines. Flagged for human review.`,
              suggestedFix: `Ensure the official ${brand.name} logo mark is included in a prominent corner with approved clear-space margin.`,
            });
          }
        }
      } catch (e) {
        console.warn('Logo check service warning:', e);
        logoCheck.details = 'Logo comparison service temporarily unavailable.';
      }
    }

    // 3. OCR Text Extraction via Server Vision Model
    let extractedText = '';
    let altTextSuggestion = '';
    if (base64) {
      try {
        const ocrRes = await fetch('/api/gemini/ocr-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: base64,
            mimeType: imageSource instanceof File ? imageSource.type : 'image/png',
          }),
        });

        if (ocrRes.ok) {
          const ocrData = await ocrRes.json();
          extractedText = (ocrData.extractedText || '').trim();
          altTextSuggestion = (ocrData.altTextSuggestion || '').trim();
        }
      } catch (e) {
        console.warn('OCR service warning:', e);
      }
    }

    return {
      imageUrl,
      dominantColors,
      paletteMatches,
      complianceScore,
      logoCheck,
      extractedText,
      altTextSuggestion,
      potentialIssues,
      findings: visualFindings,
      analyzedAt: new Date().toISOString(),
    };
  }

  /**
   * Generate Alt-Text Finding for DOCX/HTML documents containing embedded images without alt-text
   */
  public static createMissingAltTextFinding(count: number, documentName: string): Finding {
    return {
      id: `vis-alt-${Date.now()}`,
      category: 'VISUAL_ALT_TEXT_MISSING',
      severity: 'Low',
      engine: 'Engine 3: Visual Intelligence',
      highlight: `Embedded Document Imagery (${count} image${count > 1 ? 's' : ''})`,
      explanation: `Potential issue: The uploaded document "${documentName}" contains ${count} embedded image(s) lacking alternative text (alt-text). Enterprise brand accessibility guidelines require descriptive alt-text for all published graphics.`,
      suggestedFix: 'Add descriptive alternative text to embedded images explaining their content and business purpose.',
    };
  }

  /**
   * Canvas pixel color sampler
   */
  private static sampleCanvasColors(
    imageUrl: string
  ): Promise<{ hex: string; percent: number }[]> {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        try {
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
        } catch (e) {
          console.warn('Canvas pixel read error (CORS or canvas unavailable):', e);
          resolve([{ hex: '#0F172A', percent: 60 }, { hex: '#2563EB', percent: 40 }]);
        }
      };
      img.onerror = () => {
        resolve([{ hex: '#0F172A', percent: 100 }]);
      };
      img.src = imageUrl;
    });
  }

  /**
   * Euclidean color distance between two hex codes
   */
  public static colorDistance(hex1: string, hex2: string): number {
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

  /**
   * Convert File to Base64
   */
  public static fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}
