import { Brand, Finding } from '../types';

export class DeterministicRulesEngine {
  private static buildBoundaryRegex(phrase: string): RegExp {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const startBoundary = /^\w/.test(phrase) ? '\\b' : '(?<!\\w)';
    const endBoundary = /\w$/.test(phrase) ? '\\b' : '(?!\\w)';
    return new RegExp(`${startBoundary}${escaped}${endBoundary}`, 'gi');
  }

  /**
   * Run all deterministic Brand Intelligence checks (zero LLM calls)
   */
  public static evaluate(content: string, brand: Brand, prefixLabel: string = ''): Finding[] {
    const findings: Finding[] = [];
    const prefix = prefixLabel ? `[${prefixLabel}] ` : '';

    // 1. Check prohibited terms
    for (const term of brand.prohibitedTerms) {
      if (!term.trim()) continue;
      const regex = this.buildBoundaryRegex(term);
      let match;

      while ((match = regex.exec(content)) !== null) {
        findings.push({
          id: `det-prohibited-${match.index}-${Math.random().toString(36).substr(2, 4)}`,
          category: 'PROHIBITED_TERM',
          severity: 'Critical',
          engine: 'Engine 1: Brand Intelligence',
          highlight: match[0],
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          explanation: `${prefix}The term "${match[0]}" is explicitly blacklisted. Guideline Reference: ${brand.name} Brand Guidelines (v${brand.guidelineVersion}.0 - Prohibited Terms). Enterprise policy strictly mandates verified architectural claims over absolute guarantees.`,
          suggestedFix: this.getSuggestedProhibitedTermReplacement(match[0]),
        });
      }
    }

    // 2. Check prohibited superlative patterns
    for (const pattern of brand.prohibitedPatterns) {
      if (!pattern.trim()) continue;
      const regex = this.buildBoundaryRegex(pattern);
      let match: RegExpExecArray | null;

      while ((match = regex.exec(content)) !== null) {
        // Prevent duplicate findings on overlapping spans
        const matchIndex = match.index;
        const matchText = match[0];
        const alreadyFlagged = findings.some(
          (f) =>
            f.startIndex !== undefined &&
            matchIndex >= f.startIndex &&
            matchIndex < (f.endIndex || 0)
        );
        if (!alreadyFlagged) {
          findings.push({
            id: `det-superlative-${matchIndex}-${Math.random().toString(36).substr(2, 4)}`,
            category: 'SUPERLATIVE',
            severity: 'High',
            engine: 'Engine 1: Brand Intelligence',
            highlight: matchText,
            startIndex: matchIndex,
            endIndex: matchIndex + matchText.length,
            explanation: `${prefix}Unsupported superlative "${matchText}" violates corporate compliance. Guideline Reference: ${brand.name} Brand Guidelines (v${brand.guidelineVersion}.0 - Superlatives & Supremacy Claims). Marketing claims must use empirical metrics or peer-reviewed benchmarks rather than unsubstantiated supremacy statements.`,
            suggestedFix: this.getSuggestedSuperlativeReplacement(matchText),
          });
        }
      }
    }

    // 3. Product naming and capitalization checks
    // Check for common misspellings or unauthorized product tiers (e.g. "AcmeCloud Pro", "AcmeCloud", "Acme-Cloud")
    const brandName = brand.name;
    const cleanBrandName = brandName.replace(/\s+/g, '');

    // Pattern A: Closed-compound or hyphenated brand name, e.g. "AcmeCloud" or "Acme-Cloud" when brand is "Acme Cloud"
    if (brandName.includes(' ')) {
      const closedRegex = new RegExp(`\\b${cleanBrandName}\\b`, 'g');
      let match;
      while ((match = closedRegex.exec(content)) !== null) {
        findings.push({
          id: `det-prodname-closed-${match.index}`,
          category: 'PRODUCT_NAME',
          severity: 'High',
          engine: 'Engine 1: Brand Intelligence',
          highlight: match[0],
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          explanation: `${prefix}Brand name formatting error: "${match[0]}" should be formatted with proper brand spacing as "${brandName}". Guideline Reference: ${brandName} Brand Guidelines (v${brand.guidelineVersion}.0 - Approved Product Names).`,
          suggestedFix: brandName,
        });
      }
    }

    // Pattern B: Unauthorized product suffix (e.g., "AcmeCloud Pro", "Acme Cloud Pro", "Acme Cloud Max", "Acme Cloud Ultra")
    const productSuffixRegex = new RegExp(
      `\\b(${brandName}|${cleanBrandName})\\s+(Pro|Plus|Max|Ultra|Lite|Ultimate|360|Suite)\\b`,
      'gi'
    );
    let suffixMatch;
    while ((suffixMatch = productSuffixRegex.exec(content)) !== null) {
      const candidateName = suffixMatch[0];
      const isApproved = brand.approvedProductNames.some(
        (p) => p.toLowerCase() === candidateName.toLowerCase()
      );

      if (!isApproved) {
        findings.push({
          id: `det-prodname-tier-${suffixMatch.index}`,
          category: 'PRODUCT_NAME',
          severity: 'Critical',
          engine: 'Engine 1: Brand Intelligence',
          highlight: candidateName,
          startIndex: suffixMatch.index,
          endIndex: suffixMatch.index + candidateName.length,
          explanation: `${prefix}Unauthorized product designation: "${candidateName}" is not an officially approved commercial offering in the ${brandName} catalog. Guideline Reference: ${brandName} Brand Guidelines (v${brand.guidelineVersion}.0 - Product Catalog). Approved products are: ${brand.approvedProductNames.join(', ')}.`,
          suggestedFix: brand.approvedProductNames[0] || brandName,
        });
      }
    }

    return findings;
  }

  private static getSuggestedProhibitedTermReplacement(term: string): string {
    const map: Record<string, string> = {
      'hack-proof': 'defense-in-depth architecture with end-to-end encryption',
      unbreakable: 'fault-tolerant and highly resilient',
      foolproof: 'rigorously automated',
      magical: 'intelligent and streamlined',
      'instant setup': 'rapid onboarding with pre-built templates',
      effortless: 'streamlined',
      cheapest: 'cost-optimized with high enterprise ROI',
    };
    return map[term.toLowerCase()] || 'enterprise-compliant phrasing';
  }

  private static getSuggestedSuperlativeReplacement(superlative: string): string {
    const lower = superlative.toLowerCase();
    if (lower.includes('best platform') || lower.includes("world's best")) {
      return 'leading enterprise-grade platform';
    }
    if (lower.includes('#1') || lower.includes('number one')) {
      return 'industry-recognized';
    }
    if (lower.includes("world's leading")) {
      return 'globally trusted';
    }
    if (lower.includes('unrivaled') || lower.includes('unmatched')) {
      return 'rigorously verified';
    }
    if (lower.includes('guaranteed')) {
      return 'backed by an SLA';
    }
    return 'proven enterprise';
  }
}
