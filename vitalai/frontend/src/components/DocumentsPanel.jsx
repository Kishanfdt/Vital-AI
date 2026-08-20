import { useEffect, useState } from "react";
import { Spinner, SkeletonLines } from "./Spinner";
import { useToast } from "./Toast";
import { EmptyState, EmptyDocuments } from "./EmptyState";
import { FileText, Upload, Sparkles, ChevronDown, ChevronUp, CheckCircle, Search } from "lucide-react";
import { formatRelativeTime, formatClinicalTimestamp } from "../utils/formatters";

const API_URL = import.meta.env.VITE_API_URL;

export default function DocumentsPanel({ token }) {
  const toast = useToast();
  const [documents, setDocuments]       = useState([]);
  const [loadingDocs, setLoadingDocs]   = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading]       = useState(false);
  const [uploadError, setUploadError]   = useState("");

  const [question, setQuestion]         = useState("");
  const [asking, setAsking]             = useState(false);
  const [askError, setAskError]         = useState("");
  const [askResult, setAskResult]       = useState(null);
  const [showSources, setShowSources]   = useState(false);
  const [askTime, setAskTime]           = useState(null);

  useEffect(() => { fetchDocuments(); }, [token]);

  async function fetchDocuments() {
    setLoadingDocs(true);
    setUploadError("");
    try {
      const response = await fetch(`${API_URL}/documents`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(`Failed to fetch documents (${response.status})`);
      const data = await response.json();
      setDocuments(data);
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setLoadingDocs(false);
    }
  }

  async function handleFileUpload(e) {
    e.preventDefault();
    if (!selectedFile) return;
    setUploading(true);
    setUploadError("");
    const formData = new FormData();
    formData.append("file", selectedFile);
    try {
      const response = await fetch(`${API_URL}/documents/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.detail || `Upload failed (${response.status})`);
      }
      const data = await response.json();
      setSelectedFile(null);
      const inputEl = document.getElementById("pdf-file-input");
      if (inputEl) inputEl.value = "";
      await fetchDocuments();
      toast(`"${data.filename}" indexed into ${data.chunks_count} chunks.`, "success");
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleAskQuestion(e) {
    e.preventDefault();
    if (!question.trim()) return;
    setAsking(true);
    setAskError("");
    setAskResult(null);
    setShowSources(false);
    try {
      const response = await fetch(`${API_URL}/documents/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ question: question.trim() }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.detail || `Failed to answer question (${response.status})`);
      }
      const data = await response.json();
      setAskResult(data);
      setAskTime(new Date().toISOString());
      toast("Clinical answer synthesized from document context.", "success");
    } catch (err) {
      setAskError(err.message);
    } finally {
      setAsking(false);
    }
  }

  return (
    <div className="page-content">
      {/* ── Page Header ── */}
      <div style={{ marginBottom: 20 }}>
        <span className="section-label">Records Repository</span>
        <h1>Medical Document Q&amp;A</h1>
        <p style={{ margin: 0, color: "var(--muted)" }}>
          Upload PDF clinical notes or lab results and run grounded Q&amp;A with source attribution.
        </p>
      </div>

      {/* ── Document Upload & Repository Table ── */}
      <div className="card">
        <span className="card-section-label">Upload Medical File</span>
        <form onSubmit={handleFileUpload} style={{ marginBottom: 24 }}>
          <label htmlFor="pdf-file-input">PDF Clinical Report or Lab Summary *</label>
          <input
            id="pdf-file-input"
            type="file"
            accept=".pdf,application/pdf"
            onChange={(e) => setSelectedFile(e.target.files[0] || null)}
          />

          {uploadError && <p className="error-text" role="alert">{uploadError}</p>}

          <div className="row" style={{ marginTop: 14 }}>
            <button className="btn-primary" type="submit" disabled={uploading || !selectedFile}>
              {uploading ? (
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Spinner size="sm" /> Chunking &amp; Indexing PDF…
                </span>
              ) : (
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Upload size={15} /> Upload &amp; Index Record
                </span>
              )}
            </button>
          </div>
        </form>

        <hr className="divider" />

        {/* ── EHR Document List ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <span className="card-section-label" style={{ margin: 0 }}>Indexed Health Records Repository</span>
          <span className="timestamp-text">{documents.length} Files Indexed</span>
        </div>

        {loadingDocs ? (
          <SkeletonLines lines={3} />
        ) : documents.length === 0 ? (
          <EmptyState
            illustration={EmptyDocuments}
            message="No health documents indexed yet. Upload a PDF clinical note above to enable grounded Q&amp;A."
          />
        ) : (
          <div className="ehr-table-wrapper">
            <table className="ehr-table" aria-label="Uploaded documents table">
              <thead>
                <tr>
                  <th>Record Name</th>
                  <th>Indexed Chunks</th>
                  <th>Upload Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600, color: "var(--ink)", display: "flex", alignItems: "center", gap: 8 }}>
                      <FileText size={15} style={{ color: "var(--deep-teal)", flexShrink: 0 }} />
                      <span>{doc.filename}</span>
                    </td>
                    <td style={{ color: "#384643" }}>
                      {doc.chunks_count} {doc.chunks_count === 1 ? "chunk" : "chunks"}
                    </td>
                    <td className="timestamp-text">
                      {doc.created_at ? formatRelativeTime(doc.created_at) : "Recent"}
                    </td>
                    <td>
                      <span className="status-badge status-good" style={{ fontSize: 10, padding: "2px 6px" }}>
                        Indexed
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Grounded Q&A Card ── */}
      <div className="card">
        <span className="card-section-label">Grounded Query Engine</span>
        <h2>Query Indexed Documents</h2>
        <p style={{ marginBottom: 18, color: "var(--muted)" }}>
          Answers are strictly retrieved from your uploaded document context — never hallucinatory general knowledge.
        </p>

        <form onSubmit={handleAskQuestion}>
          <label htmlFor="rag-question">Clinical Question or Summary Request *</label>
          <textarea
            id="rag-question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g., What are my cholesterol levels and what follow-up recommendations are noted?"
            disabled={documents.length === 0}
            required
          />

          {documents.length === 0 && (
            <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
              💡 Upload a PDF document above to enable grounded context searching.
            </p>
          )}

          {askError && <p className="error-text" role="alert">{askError}</p>}

          <div className="row" style={{ marginTop: 16 }}>
            <button
              className="btn-primary"
              type="submit"
              disabled={asking || !question.trim() || documents.length === 0}
              aria-label="Search document context and synthesize answer"
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              {asking ? (
                <>
                  <Spinner size="sm" /> Searching Document Embeddings…
                </>
              ) : (
                <>
                  <Search size={15} /> Query Document AI
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ── Grounded Answer Card with Citation Drawer ── */}
      {askResult && (
        <div className="card-triage-accent accent-teal">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
            <div className="card-section-label" style={{ margin: 0, color: "var(--ink)" }}>
              Clinical Document Response
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="ai-disclaimer-chip">
                <Sparkles size={11} /> Context-Grounded Answer
              </span>
              <span className="timestamp-text">{formatClinicalTimestamp(askTime)}</span>
            </div>
          </div>

          <p style={{ whiteSpace: "pre-line", lineHeight: "var(--lh-normal)", margin: "0 0 16px", color: "var(--ink)" }}>
            {askResult.answer}
          </p>

          {/* Source Citation Drawer */}
          {askResult.sources?.length > 0 && (
            <div style={{ paddingTop: 14, borderTop: "1px dashed var(--line)" }}>
              <button
                className="btn-ghost"
                type="button"
                onClick={() => setShowSources((p) => !p)}
                aria-expanded={showSources}
                aria-controls="sources-list"
                style={{ padding: "5px 11px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                {showSources ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                <span>
                  {showSources ? "Hide Citation Evidence" : `Source: ${askResult.sources.length} Context Chunks`}
                </span>
              </button>

              {showSources && (
                <div id="sources-list" style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                  {askResult.sources.map((src, i) => (
                    <div
                      key={i}
                      style={{
                        background: "var(--paper)",
                        border: "1px solid var(--line)",
                        borderRadius: "var(--radius-xs)",
                        padding: "10px 12px",
                        fontSize: 12,
                        color: "#384643",
                      }}
                    >
                      <strong style={{ display: "block", marginBottom: 4, color: "var(--deep-teal)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Citation Grounding Evidence Chunk {i + 1}
                      </strong>
                      <p style={{ margin: 0, whiteSpace: "pre-line", lineHeight: "var(--lh-normal)", fontSize: 12 }}>
                        {src}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <p className="disclaimer" style={{ marginTop: 14 }}>
            {askResult.disclaimer || "Document Q&A synthesizes responses strictly from uploaded file text. Always review original lab reports and consult your health provider for clinical decisions."}
          </p>
        </div>
      )}
    </div>
  );
}
