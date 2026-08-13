import { useEffect, useState } from "react";
import { Spinner, SkeletonLines } from "./Spinner";
import { useToast } from "./Toast";

const API_URL = import.meta.env.VITE_API_URL;

export default function DocumentsPanel({ token }) {
  const toast = useToast();
  const [documents, setDocuments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState("");
  const [askResult, setAskResult] = useState(null);
  const [showSources, setShowSources] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, [token]);

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
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ question: question.trim() }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.detail || `Failed to answer question (${response.status})`);
      }

      const data = await response.json();
      setAskResult(data);
      toast("Answer ready.", "success");
    } catch (err) {
      setAskError(err.message);
    } finally {
      setAsking(false);
    }
  }

  return (
    <div>
      {/* Upload Card */}
      <div className="card">
        <h2>Medical Document Q&A</h2>
        <p>Upload lab reports, clinical notes, or prescriptions (PDF) and ask questions grounded in your document context.</p>

        <form onSubmit={handleFileUpload} style={{ marginBottom: 24 }}>
          <label htmlFor="pdf-file-input">Upload PDF Document</label>
          <input
            id="pdf-file-input"
            type="file"
            accept=".pdf,application/pdf"
            onChange={(e) => setSelectedFile(e.target.files[0] || null)}
          />

          {uploadError && <p className="error-text" role="alert">{uploadError}</p>}

          <div className="row">
            <button className="btn-primary" type="submit" disabled={uploading || !selectedFile}>
              {uploading ? (
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Spinner size="sm" /> Processing PDF…
                </span>
              ) : "Upload & Index PDF"}
            </button>
          </div>
        </form>

        <hr style={{ border: "none", borderTop: "1px solid var(--line)", margin: "20px 0" }} />

        <h3>Uploaded Documents</h3>

        {loadingDocs ? (
          <div style={{ marginTop: 12 }}>
            <SkeletonLines lines={3} />
          </div>
        ) : documents.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon" aria-hidden="true">📄</span>
            <p>No documents uploaded yet — upload a PDF above to get started.</p>
          </div>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: "12px 0" }} aria-label="Uploaded documents">
            {documents.map((doc, idx) => (
              <li
                key={idx}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 14px",
                  background: "var(--paper)",
                  borderRadius: 8,
                  marginBottom: 8,
                  border: "1px solid var(--line)",
                }}
              >
                <div>
                  <strong>📄 {doc.filename}</strong>
                  <span style={{ color: "var(--muted)", marginLeft: 10, fontSize: 13 }}>
                    ({doc.chunks_count} {doc.chunks_count === 1 ? "chunk" : "chunks"})
                  </span>
                </div>
                {doc.created_at && (
                  <span style={{ color: "var(--muted)", fontSize: 12 }}>
                    {new Date(doc.created_at).toLocaleDateString()}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Ask Question Card */}
      <div className="card">
        <h2>Ask Questions About Your Documents</h2>
        <p>Answers are strictly grounded in your uploaded document context — not general knowledge.</p>

        <form onSubmit={handleAskQuestion}>
          <label htmlFor="rag-question">Your Question</label>
          <textarea
            id="rag-question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g., What are my cholesterol levels and what does my doctor recommend?"
            disabled={documents.length === 0}
            required
          />

          {documents.length === 0 && (
            <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 6 }}>
              Upload a document first to enable Q&A.
            </p>
          )}

          {askError && <p className="error-text" role="alert">{askError}</p>}

          <div className="row">
            <button
              className="btn-primary"
              type="submit"
              disabled={asking || !question.trim() || documents.length === 0}
              aria-label="Ask question about uploaded documents"
            >
              {asking ? (
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Spinner size="sm" /> Searching context…
                </span>
              ) : "Ask Document AI"}
            </button>
          </div>
        </form>
      </div>

      {/* Q&A Result Card */}
      {askResult && (
        <div className="card">
          <h3>Answer</h3>
          <p style={{ whiteSpace: "pre-line", lineHeight: 1.6 }}>{askResult.answer}</p>

          {askResult.sources && askResult.sources.length > 0 && (
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px dashed var(--line)" }}>
              <button
                className="btn-ghost"
                type="button"
                onClick={() => setShowSources((prev) => !prev)}
                aria-expanded={showSources}
                aria-controls="sources-list"
                style={{ padding: "6px 12px", fontSize: 13 }}
              >
                {showSources
                  ? "▼ Hide Retrieved Sources"
                  : `▶ View ${askResult.sources.length} Retrieved Sources`}
              </button>

              {showSources && (
                <div id="sources-list" style={{ marginTop: 14 }}>
                  {askResult.sources.map((src, i) => (
                    <div
                      key={i}
                      style={{
                        background: "var(--paper)",
                        border: "1px solid var(--line)",
                        borderRadius: 6,
                        padding: "10px 12px",
                        marginBottom: 8,
                        fontSize: 13,
                        color: "#3f4c48",
                      }}
                    >
                      <strong style={{ display: "block", marginBottom: 4, color: "var(--deep-teal)" }}>
                        Source Chunk {i + 1}
                      </strong>
                      <p style={{ margin: 0, whiteSpace: "pre-line" }}>{src}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {askResult.disclaimer && <p className="disclaimer">{askResult.disclaimer}</p>}
        </div>
      )}
    </div>
  );
}
