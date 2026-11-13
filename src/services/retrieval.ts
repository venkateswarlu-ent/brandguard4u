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
  matchType?: 'semantic' | 'keyword' | 'hybrid';
}

// In-memory query embedding cache to avoid recomputing identical queries during a session
const queryEmbeddingCache = new Map<string, number[]>();

export class VectorSimilarityRetriever {
  /**
   * Calculates cosine similarity between two unit or non-unit vectors
   */
  public static cosineSimilarity(a: number[], b: number[]): number {
    if (!a || !b || a.length === 0 || b.length === 0) return 0;
    const len = Math.min(a.length, b.length);
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < len; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Generates embeddings for an array of text snippets via server endpoint
   */
  public static async fetchEmbeddings(texts: string[]): Promise<{ embeddings: number[][]; model: string }> {
    if (!texts.length) return { embeddings: [], model: 'none' };
    try {
      const endpoint = typeof window === 'undefined' ? 'http://localhost:3000/api/gemini/embeddings' : '/api/gemini/embeddings';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts }),
      });
      if (res.ok) {
        const data = await res.json();
        return {
          embeddings: data.embeddings || [],
          model: data.model || 'text-embedding-004',
        };
      }
    } catch (err) {
      console.warn('Vector embedding fetch error:', err);
    }

    // Client-side deterministic dense fallback if network unavailable
    return {
      embeddings: texts.map((t) => this.generateClientFallbackEmbedding(t)),
      model: 'client-deterministic-64',
    };
  }

  /**
   * Client-side 64-dim dense embedding generator (used as zero-latency offline fallback)
   */
  private static generateClientFallbackEmbedding(text: string): number[] {
    const DIM = 64;
    const vec = new Array(DIM).fill(0);
    const clean = (text || '').toLowerCase().replace(/[^a-z0-9%$. -]/g, ' ');
    const words = clean.split(/\s+/).filter((w) => w.length > 1);
    for (const w of words) {
      let h = 0;
      for (let i = 0; i < w.length; i++) {
        h = (h << 5) - h + w.charCodeAt(i);
        h |= 0;
      }
      const idx = Math.abs(h) % DIM;
      vec[idx] += (h & 1) === 0 ? 1 : -1;
    }
    const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
    return vec.map((v) => (norm > 0 ? v / norm : 0));
  }

  /**
   * Generate and attach embeddings to chunks once when document is uploaded.
   * Never recomputes unless documentVersion changes or forceRecompute is true.
   */
  public static async generateChunkEmbeddings(
    chunks: KnowledgeChunk[],
    documentVersion: string = '1.0',
    forceRecompute: boolean = false
  ): Promise<KnowledgeChunk[]> {
    const chunksNeedingEmbeddings = chunks.filter(
      (c) => forceRecompute || !c.embedding || c.embedding.length === 0 || c.documentVersion !== documentVersion
    );

    if (chunksNeedingEmbeddings.length === 0) {
      return chunks;
    }

    const textsToEmbed = chunksNeedingEmbeddings.map((c) => `${c.section}: ${c.text}`);
    const { embeddings, model } = await this.fetchEmbeddings(textsToEmbed);

    const now = new Date().toISOString();
    chunksNeedingEmbeddings.forEach((chunk, idx) => {
      chunk.embedding = embeddings[idx] || this.generateClientFallbackEmbedding(chunk.text);
      chunk.embeddingModel = model;
      chunk.embeddedAt = now;
      chunk.documentVersion = documentVersion;
    });

    return chunks;
  }

  /**
   * Retrieve top-K chunks per claim using semantic vector cosine similarity
   */
  public static async retrieve(
    query: string,
    chunks: KnowledgeChunk[],
    topK: number = 3
  ): Promise<ScoredChunk[]> {
    if (!chunks.length || !query.trim()) {
      return [];
    }

    // 1. Ensure all chunks have embeddings
    const needsEmbedding = chunks.some((c) => !c.embedding || c.embedding.length === 0);
    if (needsEmbedding) {
      await this.generateChunkEmbeddings(chunks);
    }

    // 2. Obtain query embedding (with session cache)
    const normalizedQuery = query.trim().toLowerCase();
    let queryVec = queryEmbeddingCache.get(normalizedQuery);
    if (!queryVec) {
      const res = await this.fetchEmbeddings([query]);
      if (res.embeddings.length > 0) {
        queryVec = res.embeddings[0];
        queryEmbeddingCache.set(normalizedQuery, queryVec);
      } else {
        queryVec = this.generateClientFallbackEmbedding(query);
      }
    }

    // 3. Compute cosine similarity for each chunk
    const scored: ScoredChunk[] = chunks.map((chunk) => {
      const chunkVec = chunk.embedding && chunk.embedding.length > 0
        ? chunk.embedding
        : this.generateClientFallbackEmbedding(chunk.text);

      const sim = this.cosineSimilarity(queryVec!, chunkVec);
      return {
        chunk,
        score: Math.max(0, Math.round(sim * 1000) / 1000),
        matchType: 'semantic',
      };
    });

    // Sort descending by vector similarity
    const sorted = scored
      .filter((s) => s.score > 0.05)
      .sort((a, b) => b.score - a.score);

    // If top vector match has low confidence, augment with keyword signals to prevent miss
    if (sorted.length < topK) {
      const bm25Results = BM25Retriever.retrieve(query, chunks, topK);
      for (const bRes of bm25Results) {
        if (!sorted.some((s) => s.chunk.id === bRes.chunk.id)) {
          sorted.push({
            chunk: bRes.chunk,
            score: Math.min(0.5, bRes.score / 10),
            matchType: 'hybrid',
          });
        }
      }
    }

    return sorted.slice(0, topK);
  }
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
        matchType: 'keyword',
      };
    });

    // Sort descending by score, filter out non-matching (score > 0.05)
    return scoredChunks
      .filter((item) => item.score > 0.05)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }
}
