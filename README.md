# BrandGuard AI — Enterprise Closed-Knowledge Brand Governance Platform

**BrandGuard AI** is a B2B SaaS platform that enables enterprise organisations to store approved brand knowledge and automatically review promotional copy and marketing graphics before publication.

---

## 🏛️ Core Principles

1. **Closed-Knowledge-Base-First**: Automated reviews query and verify claims strictly against the organisation's uploaded, approved internal documents. External web search is strictly prohibited to eliminate hallucinations and competitor bias.
2. **Missing Evidence Means "Unverified", Never "False"**: If approved company documents do not contain explicit confirmation of a performance number, SLA, or pricing, the system classifies it as `Unverified` (requiring certified documentation) rather than fabricating a debunking.
3. **Preserve Creator Voice & Intent**: Automated AI corrections rectify unapproved superlatives, prohibited terms, and unverified benchmarks while maintaining the copywriter's persuasive tone and core value proposition.
4. **Humans Make the Final Approval**: AI generates explainable risk scores, citations, and suggested edits; only designated human Reviewers or Admins can approve content for publication. AI never approves.

---

## ⚙️ Architecture: Three-Engine Intelligence Pipeline

```
[ Marketing Content & Image Assets (Copy, PNG/JPG, DOCX, HTML) ]
                              │
     ┌────────────────────────┼────────────────────────┐
     ▼                        ▼                        ▼
┌────────────────────────┐ ┌──────────────────────┐ ┌───────────────────────┐
│ ENGINE 1: Brand Intel  │ │ ENGINE 2: Evidence   │ │ ENGINE 3: Visual      │
│ (Style & Wording)      │ │ (Semantic Retrieval) │ │ (Color, Logo, OCR)    │
├────────────────────────┤ ├──────────────────────┤ ├───────────────────────┤
│ • Deterministic Rules  │ │ • Dense Embeddings   │ │ • Euclidean Color     │
│   (Zero-cost RegEx):   │ │   (pgvector / cosine)│ │   Distance Tolerance  │
│   - Prohibited terms   │ │ • Closed Retrieval   │ │ • Logo Template Match │
│   - Superlatives (#1)  │ │   (top-k chunks only)│ │ • OCR Text Extraction │
│   - Product catalog    │ │ • Claim Verification │ │   (sent to E1 & E2)   │
│ • Contextual Tone      │ │   (Supported / Contra│ │ • Missing Alt-Text    │
│   Alignment (Gemini)   │ │   / Unverified)      │ │   Check (DOCX/HTML)   │
│                        │ │ • Document Conflicts │ │                       │
└───────────┬────────────┘ └──────────┬───────────┘ └───────────┬───────────┘
            │                         │                         │
            └─────────────────────────┼─────────────────────────┘
                                      ▼
                   ┌─────────────────────────────────────┐
                   │ Explainable Findings & Risk Scoring │
                   │ - Severity: Critical, High, Med, Low│
                   │ - Document Citations & Quoted Chunks│
                   │ - AI Compliance Corrections & Diff  │
                   └──────────────────┬──────────────────┘
                                      ▼
                   ┌─────────────────────────────────────┐
                   │ Human Approval Workflow (Reviewer)  │
                   │ • Disabled until analysis passes    │
                   │ • Mandatory written justification   │
                   │   override for Critical findings    │
                   └──────────────────┬──────────────────┘
                                      ▼
                   ┌─────────────────────────────────────┐
                   │ Tamper-Resistant Audit Trail (RLS)  │
                   │ Insert-only log of who, what, when  │
                   └──────────────────┬──────────────────┘
```

---

## 🔒 Security & Multi-User Governance

- **Zero API Keys in Frontend Bundle**: Gemini API keys and Supabase service-role keys live strictly in server environment variables and are never bundled into client JavaScript.
- **Server-Side Functions**: All AI interactions, OCR extractions, tone evaluations, and embedding generations are routed through server functions (`server.ts` or Supabase Edge Functions).
- **Row Level Security (RLS)**: Enforced directly on PostgreSQL tables:
  - **Multi-Tenant Isolation**: Users only see records belonging to their authenticated organisation (`organisation_id = get_user_org_id()`).
  - **Server-Side Role Protection**: A Creator role is physically blocked by database RLS and server data checks from updating submission status to `Approved`.
  - **Insert-Only Audit Trail**: `audit_events` allows `INSERT` and `SELECT` only; `UPDATE` and `DELETE` operations are completely forbidden by database governance.
- **Rate Limiting & Review Credits**: Server endpoints enforce per-user rate limiting (40 req/min) and session review credits.

---

## 👥 Enterprise Personas & Organisations

The system is pre-configured with two isolated enterprise organisations and authenticated personas:

### 1. NovaPay Global Fintech Inc. (`org-novapay`)
- **Brand**: `NovaPay`
- **Approved Products**: `NovaPay`, `NovaPay Gateway`, `NovaPay Collect`
- **Commercial Facts**: Standard merchant pricing is Rs 499/month; UPI, Net Banking, and RuPay debit cards are supported; credit cards are **NOT** supported.
- **Survey Evidence**: 78% of audited retail merchants reported reduced settlement delays (KPMG India audit).
- **Users**:
  - `arjun@novapay.com` — **Creator** (Submits copy, inspects findings, cannot approve)
  - `sunita@novapay.com` — **Reviewer** (Conducts governance review, grants final approval with justification)
  - `vikram@novapay.com` — **Admin** (Manages guidelines, products, and documents)

### 2. Acme Cloud Enterprises Ltd. (`org-acme-cloud`)
- **Brand**: `Acme Cloud`
- **Approved Products**: `Acme Cloud`, `Acme DataCore`, `Acme Shield` (Note: `AcmeCloud Pro` does not exist!)
- **Approved Benchmarks**: 99.95% uptime SLA; 28% average verified productivity improvement.
- **Users**:
  - `jordan@acme.com` — **Creator**
  - `elena@acme.com` — **Reviewer**
  - `marcus@acme.com` — **Admin**

---

## 🗄️ Database Schema & Migrations

The database migration script is provided in `supabase/schema.sql` and `supabase/migrations/20260303000000_brandguard_schema.sql`:

1. `organisations`: Multi-tenant root entity.
2. `profiles`: User identity, organisation membership, and role (`Admin`, `Creator`, `Reviewer`).
3. `brands`: Guidelines, hex palette, approved products, approved/prohibited terms.
4. `knowledge_documents`: Approved reference PDFs, DOCX, and TXT files.
5. `knowledge_chunks`: Text chunks stored with `vector(64)` dense embeddings for pgvector cosine search.
6. `submissions`: Content submissions and version tracking.
7. `submission_versions`: Content versions, submitted by roles, risk scores.
8. `findings`: Detailed findings with exact citations and quoted chunk snippets.
9. `audit_events`: Tamper-resistant, insert-only audit log.

---

## 💻 Local Setup & Environment Variables

### 1. Configuration
Create a `.env` file in the root directory (refer to `.env.example`):

```bash
# Server-side Gemini API Key (keep secret)
GEMINI_API_KEY="your-gemini-api-key"

# Supabase Public Configuration (optional, falls back seamlessly to local adapter)
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Port
PORT=3000
```

### 2. Install & Run

```bash
# Install dependencies
npm install

# Run development server (serves frontend & backend on port 3000)
npm run dev

# Run TypeScript compilation checks
npm run lint

# Build for production
npm run build
```

---

## 🚢 Deployment Architecture

- **Frontend**: Deployed on **Vercel** connected to the GitHub repository (automatic deployment on push).
- **Backend**:
  - **Supabase**: PostgreSQL database with `pgvector` extension enabled, Supabase Auth, and Supabase Storage for uploaded document files.
  - **API Functions**: Server-side Express API or Supabase Edge Functions for secure Gemini interactions.
  - **No Google AI Studio**: AI Studio is completely decoupled; Gemini API is accessed solely through server-side environment variables.

---

## ⚠️ Known Limitations & Next Steps

1. **Edge Function Migration**: The current server functions run via the integrated Express server (`server.ts`). When deploying to production on Supabase, these endpoints can be copied directly to Deno-based Supabase Edge Functions.
2. **High-Dimensional Embedding Indexing**: The current offline vector fallback uses 64-dimensional dense vectors. In production with live Gemini credentials, `text-embedding-004` generates 768-dimensional vectors indexed via pgvector IVFFlat / HNSW.
3. **Advanced Image Segmentation**: Visual logo detection uses structural bounding-box and aspect ratio similarity matching. Complex multi-object 3D logo perspective distortion can be augmented with YOLO/OpenCV bounding box models in future releases.
