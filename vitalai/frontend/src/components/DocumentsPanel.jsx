import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL;

export default function DocumentsPanel({ token }) {
  const [documents, setDocuments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");

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
      if (!response.ok) {
        throw new Error(`Failed to fetch documents (${response.status})`);
      }
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
    setUploadSuccess("");

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await fetch(`${API_URL}/documents/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.detail || `Upload failed (${response.status})`);
      }

      const data = await response.json();
      setUploadSuccess(data.message || "Document uploaded and indexed successfully!");
      setSelectedFile(null);
      // Reset file input element
      const inputEl = document.getElementById("pdf-file-input");
      if (inputEl) inputEl.value = "";

      await fetchDocuments();
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
    } catch (err) {
      setAskError(err.message);
    } finally {
      setAsking(false);
    }
  }

  return (
    <div>
      {/* 1. Upload & Manage Documents Card */}
      <div className="card">
        <h2>Medical Document Q&A (RAG)</h2>
        <p>Upload your lab reports, clinical notes, or medical records (PDF) and ask questions grounded in your document context.</p>

        <form onSubmit={handleFileUpload} style={{ marginBottom: 24 }}>
          <label htmlFor="pdf-file-input">Upload PDF Document</label>
          <input
            id="pdf-file-input"
            type="file"
            accept=".pdf,application/pdf"
            onChange={(e) => setSelectedFile(e.target.files[0] || null)}
            style={{ marginBottom: 12 }}
          />

          {uploadError && <p className="error-text">{uploadError}</p>}
          {uploadSuccess && <p style={{ color: "#2f6b4f", fontSize: 13, marginTop: 8 }}>{uploadSuccess}</p>}

          <div className="row">
            <button className="btn-primary" type="submit" disabled={uploading || !selectedFile}>
              {uploading ? "Processing PDF & Indexing…" : "Upload & Index PDF"}
            </button>
          </div>
        </form>

        <hr style={{ border: "none", borderTop: "1px solid var(--line)", margin: "20px 0" }} />

        <h3>Uploaded Documents</h3>
        {loadingDocs ? (
          <p style={{ color: "#8a938f", fontSize: 14 }}>Loading documents…</p>
        ) : documents.length === 0 ? (
          <p style={{ color: "#8a938f", fontSize: 14 }}>No documents uploaded yet. Upload a PDF above to get started.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: "12px 0" }}>
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
                  <span style={{ color: "#6b7773", marginLeft: 10, fontSize: 13 }}>
                    ({doc.chunks_count} {doc.chunks_count === 1 ? "chunk" : "chunks"})
                  </span>
                </div>
                {doc.created_at && (
                  <span style={{ color: "#8a938f", fontSize: 12 }}>
                    {new Date(doc.created_at).toLocaleDateString()}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 2. Ask Question Card */}
      <div className="card">
        <h2>Ask Questions About Your Documents</h2>
        <p>Ask anything about your uploaded medical records. Answers are strictly based on retrieved context.</p>

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

          {askError && <p className="error-text">{askError}</p>}

          <div className="row">
            <button
              className="btn-primary"
              type="submit"
              disabled={asking || !question.trim() || documents.length === 0}
            >
              {asking ? "Searching document context…" : "Ask Document AI"}
            </button>
          </div>
        </form>
      </div>

      {/* 3. Q&A Result & Expandable Sources Card */}
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
                style={{ padding: "6px 12px", fontSize: 13 }}
              >
                {showSources ? "▼ Hide Retrieved Context Sources" : `▶ View ${askResult.sources.length} Retrieved Context Sources`}
              </button>

              {showSources && (
                <div style={{ marginTop: 14 }}>
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

