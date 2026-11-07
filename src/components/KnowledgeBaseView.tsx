import React, { useState } from 'react';
import {
  FileText,
  Upload,
  Search,
  Trash2,
  FileCheck2,
  Layers,
  Sparkles,
  Database,
  ExternalLink,
  CheckCircle,
  FileCode,
  Tag,
  AlertCircle,
} from 'lucide-react';
import { Brand, KnowledgeDocument, KnowledgeChunk, DocumentType, UserRole } from '../types';
import { StorageService } from '../services/storage';
import { DocumentParser } from '../services/parser';
import { BM25Retriever, ScoredChunk } from '../services/retrieval';

interface KnowledgeBaseViewProps {
  activeBrand: Brand;
  currentRole: UserRole;
  onRefreshData: () => void;
}

export const KnowledgeBaseView: React.FC<KnowledgeBaseViewProps> = ({
  activeBrand,
  currentRole,
  onRefreshData,
}) => {
  const documents = StorageService.getDocuments(activeBrand.id);
  const chunks = StorageService.getChunksByBrand(activeBrand.id);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedDocForChunks, setSelectedDocForChunks] = useState<KnowledgeDocument | null>(null);

  // BM25 Retrieval Sandbox Query State
  const [testQuery, setTestQuery] = useState('productivity improvement benchmark');
  const [retrievedResults, setRetrievedResults] = useState<ScoredChunk[]>([]);
  const [hasQueried, setHasQueried] = useState(false);

  // Manual Document modal / form state
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualType, setManualType] = useState<DocumentType>('product_facts');
  const [manualVersion, setManualVersion] = useState('1.0');
  const [manualContent, setManualContent] = useState('');

  const isAdmin = currentRole === 'Admin';

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const parsed = await DocumentParser.parseFile(file);

        const docId = `doc-${Date.now()}-${i}`;
        const newDoc: KnowledgeDocument = {
          id: docId,
          brandId: activeBrand.id,
          name: file.name,
          type: file.name.toLowerCase().includes('sla')
            ? 'evidence'
            : file.name.toLowerCase().includes('pric')
            ? 'pricing'
            : file.name.toLowerCase().includes('sec')
            ? 'compliance'
            : 'product_facts',
          version: '1.0',
          uploadDate: new Date().toISOString(),
          fileSize: `${(file.size / 1024).toFixed(1)} KB`,
          rawText: parsed.text,
          chunkCount: parsed.chunks.length,
        };

        const chunkObjects: KnowledgeChunk[] = parsed.chunks.map((c, cIdx) => ({
          ...c,
          id: `chunk-${docId}-${cIdx + 1}`,
          documentId: docId,
          brandId: activeBrand.id,
        }));

        StorageService.saveDocument(newDoc, chunkObjects);
      }

      onRefreshData();
      setIsUploading(false);
    } catch (err: any) {
      console.error('File parsing error:', err);
      setUploadError(err.message || 'Failed to parse file. Please try TXT or DOCX format.');
      setIsUploading(false);
    }
  };

  const handleCreateManualDoc = () => {
    if (!manualTitle.trim() || !manualContent.trim()) return;

    const docId = `doc-manual-${Date.now()}`;
    const chunksRaw = DocumentParser.chunkText(manualContent, manualTitle);

    const newDoc: KnowledgeDocument = {
      id: docId,
      brandId: activeBrand.id,
      name: manualTitle.endsWith('.txt') ? manualTitle : `${manualTitle}.txt`,
      type: manualType,
      version: manualVersion,
      uploadDate: new Date().toISOString(),
      fileSize: `${(manualContent.length / 1024).toFixed(1)} KB`,
      rawText: manualContent,
      chunkCount: chunksRaw.length,
    };

    const chunkObjects: KnowledgeChunk[] = chunksRaw.map((c, cIdx) => ({
      ...c,
      id: `chunk-${docId}-${cIdx + 1}`,
      documentId: docId,
      brandId: activeBrand.id,
    }));

    StorageService.saveDocument(newDoc, chunkObjects);
    onRefreshData();
    setShowManualModal(false);
    setManualTitle('');
    setManualContent('');
  };

  const handleDeleteDocument = (docId: string, name: string) => {
    if (confirm(`Remove "${name}" and all associated evidence chunks?`)) {
      StorageService.deleteDocument(docId);
      onRefreshData();
      if (selectedDocForChunks?.id === docId) {
        setSelectedDocForChunks(null);
      }
    }
  };

  const handleRunBM25Test = () => {
    if (!testQuery.trim()) return;
    const results = BM25Retriever.retrieve(testQuery, chunks, 4);
    setRetrievedResults(results);
    setHasQueried(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            <span>Module 2</span>
            <span>·</span>
            <span>Closed Knowledge Base</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Approved Enterprise Evidence Repository
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Closed-knowledge storage for {activeBrand.name}. Content analysis uses ONLY chunks from these documents.
          </p>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowManualModal(true)}
              className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
            >
              Add Text Document
            </button>
            <label className="cursor-pointer px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2 shadow-xs">
              <Upload className="w-4 h-4" />
              Upload Files (PDF, DOCX, TXT)
              <input
                type="file"
                multiple
                accept=".pdf,.docx,.txt,.md"
                onChange={handleFileUpload}
                className="hidden"
                disabled={isUploading}
              />
            </label>
          </div>
        )}
      </div>

      {uploadError && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Approved Documents</div>
            <div className="text-xl font-bold text-slate-900 font-mono tabular-nums">
              {documents.length}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Cached Semantic Chunks</div>
            <div className="text-xl font-bold text-indigo-600 font-mono tabular-nums">
              {chunks.length}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Indexing Method</div>
            <div className="text-sm font-bold text-slate-900">BM25 Closed-Corpus</div>
          </div>
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Approved Knowledge Documents</h3>
            <p className="text-xs text-slate-500">
              Extracted in-browser, chunked with metadata, and cached locally for rapid reuse.
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {documents.length} active documents
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-xs font-semibold">
                <th className="py-3 px-5">Document Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Version</th>
                <th className="py-3 px-4">Chunks</th>
                <th className="py-3 px-4">File Size</th>
                <th className="py-3 px-4">Uploaded</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs text-slate-700">
              {documents.map((doc) => {
                let catBadge = 'bg-slate-100 text-slate-700';
                if (doc.type === 'evidence') catBadge = 'bg-blue-50 text-blue-700 border-blue-200';
                if (doc.type === 'pricing') catBadge = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                if (doc.type === 'compliance') catBadge = 'bg-purple-50 text-purple-700 border-purple-200';

                return (
                  <tr key={doc.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-5 font-semibold text-slate-900 flex items-center gap-2">
                      <FileCheck2 className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>{doc.name}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-medium border ${catBadge}`}>
                        {doc.type.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono">v{doc.version}</td>
                    <td className="py-3.5 px-4 font-mono tabular-nums">{doc.chunkCount} chunks</td>
                    <td className="py-3.5 px-4 font-mono text-slate-500">{doc.fileSize}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-500">
                      {new Date(doc.uploadDate).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-5 text-right space-x-2">
                      <button
                        onClick={() => setSelectedDocForChunks(doc)}
                        className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors inline-flex items-center gap-1"
                      >
                        <Layers className="w-3 h-3 text-slate-500" />
                        View Chunks
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteDocument(doc.id, doc.name)}
                          className="px-2 py-1 text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded transition-colors"
                          title="Delete document"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* BM25 Retrieval Sandbox / Test Query Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Search className="w-4 h-4 text-blue-600" />
            BM25 Closed-Knowledge Retrieval Inspector
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Test how claims are matched against approved knowledge base chunks. Only top-ranked chunks are provided to Gemini for verification.
          </p>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={testQuery}
            onChange={(e) => setTestQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRunBM25Test()}
            placeholder="Type a marketing claim or query to test retrieval (e.g. productivity improvement, 99.95% SLA, pricing)..."
            className="flex-1 text-xs bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2.5 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
          />
          <button
            onClick={handleRunBM25Test}
            className="px-4 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors inline-flex items-center gap-2 shadow-xs shrink-0"
          >
            <Search className="w-3.5 h-3.5" />
            Run BM25 Match
          </button>
        </div>

        {/* Retrieval Results */}
        {hasQueried && (
          <div className="pt-2 space-y-3">
            <div className="text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span>Retrieved Evidence Chunks ({retrievedResults.length} matches):</span>
              <span className="text-[11px] text-slate-400 font-mono">
                BM25 k1=1.5, b=0.75
              </span>
            </div>

            {retrievedResults.length === 0 ? (
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600">
                No matching chunks found above relevance threshold for "{testQuery}". Under closed-knowledge rules, claims referencing this will be classified as <strong>Unverified</strong>.
              </div>
            ) : (
              <div className="space-y-3">
                {retrievedResults.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-2 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-center justify-between text-slate-600">
                      <div className="font-semibold text-slate-900 flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-mono">
                          {idx + 1}
                        </span>
                        <span>{item.chunk.documentName}</span>
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-600">{item.chunk.section}</span>
                      </div>
                      <span className="font-mono text-[11px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        BM25 Score: {item.score.toFixed(3)}
                      </span>
                    </div>
                    <p className="text-slate-700 leading-relaxed font-sans bg-white p-2.5 rounded border border-slate-200">
                      "{item.chunk.text}"
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selected Document Chunks Modal / Drawer */}
      {selectedDocForChunks && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {selectedDocForChunks.name}
                </h3>
                <p className="text-xs text-slate-500">
                  Cached semantic chunks (v{selectedDocForChunks.version})
                </p>
              </div>
              <button
                onClick={() => setSelectedDocForChunks(null)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold px-2 py-1"
              >
                ×
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              {chunks
                .filter((c) => c.documentId === selectedDocForChunks.id)
                .map((chunk, idx) => (
                  <div
                    key={chunk.id}
                    className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between font-semibold text-slate-900">
                      <span>Chunk #{idx + 1}: {chunk.section}</span>
                      <span className="font-mono text-slate-500">~{chunk.tokenCount} tokens</span>
                    </div>
                    <p className="text-slate-700 leading-relaxed bg-white p-3 rounded border border-slate-200">
                      {chunk.text}
                    </p>
                  </div>
                ))}
            </div>

            <div className="p-4 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedDocForChunks(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Text Document Creation Modal */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Add Knowledge Document (Text)
              </h3>
              <button
                onClick={() => setShowManualModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold px-2"
              >
                ×
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Document Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Q1 Product SLA Specifications.txt"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Document Category
                  </label>
                  <select
                    value={manualType}
                    onChange={(e) => setManualType(e.target.value as DocumentType)}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  >
                    <option value="guideline">Guideline</option>
                    <option value="product_facts">Product Facts</option>
                    <option value="evidence">Evidence / Benchmark</option>
                    <option value="pricing">Pricing Matrix</option>
                    <option value="compliance">Compliance & Legal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Version
                  </label>
                  <input
                    type="text"
                    value={manualVersion}
                    onChange={(e) => setManualVersion(e.target.value)}
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Approved Knowledge Content
                </label>
                <textarea
                  rows={8}
                  placeholder="Paste verified factual statements, SLA numbers, pricing, or product specifications..."
                  value={manualContent}
                  onChange={(e) => setManualContent(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-3 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 font-sans"
                />
                <div className="text-[11px] text-slate-400 mt-1">
                  Text will be automatically partitioned into semantic search chunks with headers.
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                onClick={() => setShowManualModal(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateManualDoc}
                disabled={!manualTitle.trim() || !manualContent.trim()}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
              >
                Extract Chunks & Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
