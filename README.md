# BrandGuard AI — Enterprise Closed-Knowledge Brand Governance Platform

**BrandGuard AI** is a B2B SaaS platform that enables enterprise organisations to store approved brand knowledge and automatically review marketing, sales, and advertising content before publication.

---

## 🏛️ Core Principles

1. **Closed-Knowledge-Base-First**: Automated reviews query and cross-examine claims strictly against the organisation's uploaded, approved internal documents. External web search is strictly prohibited to eliminate hallucinations and competitor bias.
2. **Missing Evidence Means "Unverified", Never "False"**: If approved company documents do not contain explicit confirmation of a performance number, SLA, or capability, the system classifies it as `Unverified` (requiring citation) rather than fabricating a debunking.
3. **Preserve Creator Voice & Intent**: Automated AI corrections rectify unapproved superlatives, prohibited terms, and unverified benchmarks while maintaining the copywriter's persuasive tone and core value proposition.
4. **Humans Make the Final Approval**: AI generates explainable risk scores, citations, and suggested edits; only designated human Reviewers or Admins can clear content for publication.

---

## ⚙️ Architecture & Two-Engine Pipeline

```
[ Marketing Content Input (Text / DOCX / PDF / Image) ]
                      │
     ┌────────────────┴────────────────┐
     ▼                                 ▼
┌─────────────────────────┐   ┌───────────────────────────────┐
│ ENGINE 1: Brand Intel   │   │ ENGINE 2: Evidence Intel      │
│ (Style & Wording)       │   │ (Factual Claims Verification) │
├─────────────────────────┤   ├───────────────────────────────┤
│ 1. Deterministic Rules: │   │ 1. Factual Claims Extraction  │
│    - Blacklisted terms  │   │    (Numbers, SLAs, Prices)    │
│    - Superlatives (#1)  │   │ 2. BM25 Semantic Retrieval    │
│    - Unapproved Tiers   │   │    against Closed KB Chunks   │
│ 2. Gemini Contextual    │   │ 3. Gemini Closed Verification │
│    Tone & Voice Match   │   │    - Supported                │
└────────────┬────────────┘   │    - Contradicted             │
             │                │    - Unverified               │
             │                └───────────────┬───────────────┘
             └────────────────┬───────────────┘
                              ▼
           ┌─────────────────────────────────────┐
           │ Explainable Findings & Risk Scoring │
           │ - Inline Highlights with Severity   │
           │ - Exact Knowledge Base Citations    │
           │ - AI Side-by-Side Diff Corrections  │
           └──────────────────┬──────────────────┘
                              ▼
           ┌─────────────────────────────────────┐
           │ Human Approval Workflow (Reviewer)  │
           │ [Approve] or [Request Changes]      │
           └──────────────────┬──────────────────┘
                              ▼
           ┌─────────────────────────────────────┐
           │ Audit History & Version Timeline    │
           └─────────────────────────────────────┘
```

---

## 👥 Personas & Role-Based Access Control

- **Admin**: Create and edit brand guidelines, manage approved product catalogs, blacklist terms, adjust brand hex palettes, upload knowledge base whitepapers, and configure governance rules.
- **Creator**: Submit drafts, inspect interactive highlighted findings, test suggested fixes, adopt full AI revisions, and submit version revisions (`v1.0`, `v2.0`...).
- **Reviewer**: Filter submissions by risk level in the Approval Queue, inspect exact evidence citations, request changes with structured feedback comments, or grant final publication approval.

---

## 🚀 Benchmark Demo Case (Pre-Loaded)

- **Brand**: `Acme Cloud` (v2.0 Guidelines)
- **Approved Products**: `Acme Cloud`, `Acme DataCore`, `Acme Shield` (Note: `AcmeCloud Pro` does not exist!)
- **Approved SLA / Benchmarks**: `99.95% uptime SLA`, `28% average verified productivity improvement` (2025 Third-Party Engineering Audit).
- **Prohibited Terms**: `hack-proof`, `unbreakable`, `magical`, `instant setup`.
- **Prohibited Patterns**: `world's best`, `world's leading`, `#1`, `best platform`.
- **Benchmark Demo Ad**:
  > *"Acme Cloud is the world's best platform and improves productivity by 95%. Try AcmeCloud Pro today!"*
- **Generated Findings**:
  1. `SUPERLATIVE` (High Severity, Engine 1): `"world's best platform"` violates corporate superlative policy.
  2. `PRODUCT_NAME` (Critical Severity, Engine 1): `"AcmeCloud Pro"` is an unapproved product tier.
  3. `CONTRADICTED_CLAIM` (Critical Severity, Engine 2): `"improves productivity by 95%"` directly contradicts Document 1 (*Acme Cloud Platform Overview & SLA.pdf*) which records verified benchmark at **28%**.

---

## 🛠️ Planned Production Stack for GitHub Migration

The prototype data layer is implemented in `src/services/storage.ts` using a clean, swappable interface with browser `localStorage` persistence and server-side Gemini API endpoints.

When continuing this project in production:

| Component | Current Prototype | Production Target Stack |
| :--- | :--- | :--- |
| **API & Backend** | Express.js + Vite (`server.ts`) | **Python / FastAPI** with async worker threads |
| **Database** | Swappable `StorageService` (localStorage) | **MongoDB** (JSON document store) / PostgreSQL |
| **Vector Indexing** | In-browser BM25 token ranker | **FAISS / Milvus / Qdrant** vector store |
| **Embeddings** | Closed-Corpus BM25 + Gemini embeddings | **Sentence Transformers (`all-MiniLM-L6-v2`)** |
| **Deterministic NLP**| TypeScript RegEx boundary engine | **spaCy** token matcher & entity linker |
| **Visual OCR & Canvas**| HTML5 Canvas pixel sampler + Gemini OCR | **OpenCV** + **Tesseract.js** / PaddleOCR |
| **Language Model** | Gemini 3.8 Flash (`@google/genai`) | Gemini 3.8 Flash & Gemini 4 Argon |

---

## 💻 Local Development

```bash
# Install dependencies
npm install

# Start dev server on port 3000
npm run dev

# Run TypeScript checks
npm run lint

# Build for production
npm run build
```
