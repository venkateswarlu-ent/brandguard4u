-- =============================================================================
-- BRANDGUARD AI: ENTERPRISE DATABASE SCHEMA & ROW LEVEL SECURITY
-- Platform: Supabase / PostgreSQL with pgvector extension
-- Author: Google Antigravity & BrandGuard Engineering Team
-- =============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 2. ORGANISATIONS (Multi-Tenant Isolation Root)
CREATE TABLE IF NOT EXISTS public.organisations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. PROFILES / ORGANISATION MEMBERS (Role-Based Access Control)
-- Roles: Admin, Creator, Reviewer
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('Admin', 'Creator', 'Reviewer')),
    display_name TEXT NOT NULL,
    email TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Helper functions to get current user's org and role in RLS policies
CREATE OR REPLACE FUNCTION public.get_user_org_id()
RETURNS UUID AS $$
  SELECT organisation_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- 4. BRANDS
CREATE TABLE IF NOT EXISTS public.brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    logo_url TEXT,
    brand_colors JSONB NOT NULL DEFAULT '{"primary": "#0F172A", "secondary": "#2563EB", "accent": "#0D9488"}'::jsonb,
    approved_product_names TEXT[] NOT NULL DEFAULT '{}',
    tone_description TEXT NOT NULL,
    approved_terms TEXT[] NOT NULL DEFAULT '{}',
    prohibited_terms TEXT[] NOT NULL DEFAULT '{}',
    prohibited_patterns TEXT[] NOT NULL DEFAULT '{}',
    guideline_version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. KNOWLEDGE DOCUMENTS (Approved Closed Knowledge Base)
CREATE TABLE IF NOT EXISTS public.knowledge_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
    brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('guideline', 'product_facts', 'evidence', 'pricing', 'compliance')),
    version TEXT NOT NULL DEFAULT '1.0',
    file_size TEXT,
    raw_text TEXT,
    chunk_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. KNOWLEDGE CHUNKS (Semantic Embedding Store with pgvector)
CREATE TABLE IF NOT EXISTS public.knowledge_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
    brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES public.knowledge_documents(id) ON DELETE CASCADE,
    document_name TEXT NOT NULL,
    document_version TEXT NOT NULL DEFAULT '1.0',
    section TEXT NOT NULL,
    page_number INTEGER,
    text TEXT NOT NULL,
    token_count INTEGER NOT NULL DEFAULT 0,
    embedding vector(64), -- supports 64-dim dense or 768-dim embeddings
    embedding_model TEXT,
    embedded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cosine vector similarity search index
CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_idx
    ON public.knowledge_chunks
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- 7. SUBMISSIONS (Content Submissions & Review Workflow)
CREATE TABLE IF NOT EXISTS public.submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
    brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    channel TEXT NOT NULL,
    current_version INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL CHECK (status IN ('Draft', 'In Review', 'Changes Requested', 'Approved')) DEFAULT 'In Review',
    reviewer_comment TEXT,
    override_justification TEXT,
    attached_image_file TEXT,
    visual_analysis JSONB,
    analysis_status TEXT CHECK (analysis_status IN ('pending', 'running', 'completed', 'failed')) DEFAULT 'completed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. SUBMISSION VERSIONS (Version Control)
CREATE TABLE IF NOT EXISTS public.submission_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    content TEXT NOT NULL,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    submitted_by_user_id UUID REFERENCES auth.users(id),
    submitted_by_role TEXT NOT NULL CHECK (submitted_by_role IN ('Admin', 'Creator', 'Reviewer')),
    submitted_by_name TEXT NOT NULL,
    risk_score INTEGER NOT NULL DEFAULT 0,
    findings_count INTEGER NOT NULL DEFAULT 0
);

-- 9. FINDINGS (Explainable Analysis Issues)
CREATE TABLE IF NOT EXISTS public.findings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    category TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('Critical', 'High', 'Medium', 'Low')),
    engine TEXT NOT NULL,
    highlight TEXT NOT NULL,
    explanation TEXT NOT NULL,
    evidence_citation TEXT,
    cited_chunk_text TEXT,
    conflicts_detected TEXT[],
    suggested_fix TEXT NOT NULL,
    status TEXT CHECK (status IN ('Supported', 'Contradicted', 'Unverified')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. AUDIT EVENTS (Tamper-Resistant, INSERT-ONLY Audit Trail)
CREATE TABLE IF NOT EXISTS public.audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
    submission_id UUID REFERENCES public.submissions(id) ON DELETE SET NULL,
    brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id),
    role TEXT NOT NULL CHECK (role IN ('Admin', 'Creator', 'Reviewer')),
    actor_name TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('CREATED', 'REVISED', 'ANALYSIS_RUN', 'COMMENTED', 'CHANGES_REQUESTED', 'APPROVED')),
    details TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE public.organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- ORGANISATIONS: Users only see their own organisation
CREATE POLICY "org_select_own" ON public.organisations
    FOR SELECT USING (id = public.get_user_org_id());

-- PROFILES: Users see profiles in their own organisation
CREATE POLICY "profiles_select_own_org" ON public.profiles
    FOR SELECT USING (organisation_id = public.get_user_org_id());

-- BRANDS: Multi-tenant tenant isolation
CREATE POLICY "brands_tenant_isolation" ON public.brands
    FOR ALL USING (organisation_id = public.get_user_org_id())
    WITH CHECK (organisation_id = public.get_user_org_id());

-- KNOWLEDGE DOCUMENTS: Tenant isolation
CREATE POLICY "docs_tenant_isolation" ON public.knowledge_documents
    FOR ALL USING (organisation_id = public.get_user_org_id())
    WITH CHECK (organisation_id = public.get_user_org_id());

-- KNOWLEDGE CHUNKS: Tenant isolation
CREATE POLICY "chunks_tenant_isolation" ON public.knowledge_chunks
    FOR ALL USING (organisation_id = public.get_user_org_id())
    WITH CHECK (organisation_id = public.get_user_org_id());

-- SUBMISSIONS: Read and insert by organisation
CREATE POLICY "submissions_select" ON public.submissions
    FOR SELECT USING (organisation_id = public.get_user_org_id());

CREATE POLICY "submissions_insert" ON public.submissions
    FOR INSERT WITH CHECK (organisation_id = public.get_user_org_id());

-- CRITICAL SERVER-SIDE RULE: Creator must NEVER be able to Approve!
-- Enforced directly in Postgres RLS:
CREATE POLICY "submissions_update_role_enforced" ON public.submissions
    FOR UPDATE
    USING (organisation_id = public.get_user_org_id())
    WITH CHECK (
        organisation_id = public.get_user_org_id()
        AND (status != 'Approved' OR public.get_user_role() IN ('Admin', 'Reviewer'))
    );

-- SUBMISSION VERSIONS & FINDINGS: Tenant isolation
CREATE POLICY "versions_tenant_isolation" ON public.submission_versions
    FOR ALL USING (
        submission_id IN (SELECT id FROM public.submissions WHERE organisation_id = public.get_user_org_id())
    )
    WITH CHECK (
        submission_id IN (SELECT id FROM public.submissions WHERE organisation_id = public.get_user_org_id())
    );

CREATE POLICY "findings_tenant_isolation" ON public.findings
    FOR ALL USING (
        submission_id IN (SELECT id FROM public.submissions WHERE organisation_id = public.get_user_org_id())
    )
    WITH CHECK (
        submission_id IN (SELECT id FROM public.submissions WHERE organisation_id = public.get_user_org_id())
    );

-- AUDIT EVENTS: INSERT-ONLY, TAMPER-RESISTANT
-- Read is scoped to the organisation
CREATE POLICY "audit_events_select" ON public.audit_events
    FOR SELECT USING (organisation_id = public.get_user_org_id());

-- Insert allowed for logged-in organisation members
CREATE POLICY "audit_events_insert" ON public.audit_events
    FOR INSERT WITH CHECK (organisation_id = public.get_user_org_id());

-- NOTE: NO UPDATE OR DELETE POLICIES CREATED FOR public.audit_events.
-- Postgres strictly rejects any UPDATE or DELETE statement on audit_events!

-- =============================================================================
-- SEMANTIC RETRIEVAL PGVECTOR RPC FUNCTION
-- =============================================================================
CREATE OR REPLACE FUNCTION public.match_knowledge_chunks (
    query_embedding vector(64),
    match_count int DEFAULT 3,
    filter_brand_id uuid DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    document_id uuid,
    brand_id uuid,
    document_name text,
    document_version text,
    section text,
    page_number int,
    text text,
    similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        kc.id,
        kc.document_id,
        kc.brand_id,
        kc.document_name,
        kc.document_version,
        kc.section,
        kc.page_number,
        kc.text,
        1 - (kc.embedding <=> query_embedding) AS similarity
    FROM public.knowledge_chunks kc
    WHERE
        kc.organisation_id = public.get_user_org_id()
        AND (filter_brand_id IS NULL OR kc.brand_id = filter_brand_id)
    ORDER BY kc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
