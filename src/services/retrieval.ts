import { KnowledgeChunk } from '../types';

const STOPWORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren',
  'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
  'can', 'could', 'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from',
  'further', 'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself',
  'his', 'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'me', 'more', 'most',
  'my', 'myself', 'no', 'nor', 'not', 'now', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our',
  'ours', 'ourselves', 'out', 'over', 'own', 'same', 'she', 'should', 'so', 'some', 'such', 'than',
  'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they', 'this',
  'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'we', 'were', 'what', 'when',
  'where', 'which', 'while', 'who', 'whom', 'why', 'with', 'would', 'you', 'your', 'yours', 'yourself',
]);

export interface ScoredChunk {
  chunk: KnowledgeChunk;
  score: number;
}

export class BM25Retriever {
  private static tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9%$.-]/g, ' ')
      .split(/\s+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 1 && !STOPWORDS.has(t));
  }

  /**
   * Retrieve top K knowledge base chunks relevant to query using BM25
   */
  public static retrieve(
    query: string,
    chunks: KnowledgeChunk[],
    topK: number = 4
  ): ScoredChunk[] {
    if (!chunks.length || !query.trim()) {
      return [];
    }

    const queryTokens = this.tokenize(query);
    if (!queryTokens.length) {
      return [];
    }

    const N = chunks.length;
    const docTokensList = chunks.map((c) => this.tokenize(c.text + ' ' + c.section + ' ' + c.documentName));
    const docLengths = docTokensList.map((tokens) => tokens.length);
    const avgdl = docLengths.reduce((acc, len) => acc + len, 0) / (N || 1);

    const k1 = 1.5;
    const b = 0.75;

    // Document frequencies for query terms
    const dfMap: Record<string, number> = {};
    for (const qTerm of queryTokens) {
      let df = 0;
      for (const dTokens of docTokensList) {
        if (dTokens.includes(qTerm)) {
          df++;
        }
      }
      dfMap[qTerm] = df;
    }

    // Calculate BM25 scores
    const scoredChunks: ScoredChunk[] = chunks.map((chunk, idx) => {
      const dTokens = docTokensList[idx];
      const dLen = docLengths[idx];

      // Frequency map for this doc
      const tfMap: Record<string, number> = {};
      for (const t of dTokens) {
        tfMap[t] = (tfMap[t] || 0) + 1;
      }

      let score = 0;
      for (const qTerm of queryTokens) {
        const tf = tfMap[qTerm] || 0;
        const df = dfMap[qTerm] || 0;

        if (tf > 0) {
          // BM25 IDF
          const idf = Math.log((N - df + 0.5) / (df + 0.5) + 1);
          // Term saturation
          const numerator = tf * (k1 + 1);
          const denominator = tf + k1 * (1 - b + b * (dLen / (avgdl || 1)));
          score += idf * (numerator / denominator);
        }
      }

      return {
        chunk,
        score,
      };
    });

    // Sort descending by score, filter out non-matching (score > 0.05)
    return scoredChunks
      .filter((item) => item.score > 0.05)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }
}
