import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { marked } from 'marked';
import './ProjectView.css';

marked.setOptions({ breaks: true, gfm: true });

export default function ProjectView() {
  const { id } = useParams();
  const { authFetch } = useAuth();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [readme, setReadme] = useState('');
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('readme');
  const [pdfLoading, setPdfLoading] = useState(false);
  const docRef = useRef(null);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const res = await authFetch(`/api/projects/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setProject(data);
        setReadme(data.readme);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProject();
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await authFetch(`/api/projects/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ readme })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setProject(data);
      setEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPDF = async () => {
    setPdfLoading(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const element = docRef.current;
      if (!element) return;

      const opt = {
        margin: [15, 15, 15, 15],
        filename: `${project.name.replace(/\s+/g, '_')}_Documentation.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error('PDF generation failed:', err);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleDownloadMD = () => {
    const blob = new Blob([readme], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.replace(/\s+/g, '_')}_Documentation.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="page">
        <div className="project-loading">
          <div className="spinner-blue" />
          <p>Loading project documentation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="error-msg">{error}</div>
        <Link to="/dashboard" className="btn btn-secondary" style={{ marginTop: 16 }}>← Back to Dashboard</Link>
      </div>
    );
  }

  const renderedHTML = marked.parse(readme || '');

  return (
    <div className="page fade-in">
      <div className="project-top">
        <Link to="/dashboard" className="back-link">← Back to Dashboard</Link>
        <div className="project-info">
          <h1>{project.name}</h1>
          <div className="project-meta">
            <span className={`badge badge-${project.source}`}>{project.source}</span>
            {project.repoUrl && (
              <a href={project.repoUrl} target="_blank" rel="noreferrer" className="repo-link">
                {project.repoUrl.replace('https://github.com/', '')} ↗
              </a>
            )}
            <span className="meta-date">
              {new Date(project.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        </div>
        <div className="project-actions">
          {editing ? (
            <>
              <button className="btn btn-secondary btn-sm" onClick={() => { setEditing(false); setReadme(project.readme); }}>
                Cancel
              </button>
              <button className="btn btn-primary btn-sm" id="save-readme-btn" onClick={handleSave} disabled={saving}>
                {saving ? <span className="spinner" /> : '💾 Save'}
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-secondary btn-sm" id="edit-readme-btn" onClick={() => setEditing(true)}>
                ✏️ Edit
              </button>
              <button className="btn btn-secondary btn-sm" onClick={handleDownloadMD}>
                📄 Markdown
              </button>
              <button className="btn btn-primary btn-sm" id="download-pdf-btn" onClick={handleDownloadPDF} disabled={pdfLoading}>
                {pdfLoading ? <><span className="spinner" /> Generating PDF...</> : '📥 Download PDF'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="project-tabs">
        <button
          className={`tab-btn ${activeTab === 'readme' ? 'active' : ''}`}
          onClick={() => setActiveTab('readme')}
        >
          📘 Documentation
        </button>
        <button
          className={`tab-btn ${activeTab === 'files' ? 'active' : ''}`}
          onClick={() => setActiveTab('files')}
        >
          📁 File Details ({project.fileDocs?.length || 0})
        </button>
      </div>

      {activeTab === 'readme' && (
        <div className="readme-container card">
          {editing ? (
            <textarea
              className="readme-editor"
              value={readme}
              onChange={(e) => setReadme(e.target.value)}
              id="readme-textarea"
            />
          ) : (
            <div
              ref={docRef}
              className="readme-rendered"
              dangerouslySetInnerHTML={{ __html: renderedHTML }}
            />
          )}
        </div>
      )}

      {activeTab === 'files' && (
        <div className="files-container">
          {project.fileDocs?.length === 0 ? (
            <div className="empty-state card">
              <h3>No file documentation available</h3>
              <p>No code files were found or documented for this project.</p>
            </div>
          ) : (
            project.fileDocs?.map((file, i) => (
              <div key={i} className="file-doc card slide-up" style={{ animationDelay: `${i * 0.04}s` }}>
                <div className="file-header">
                  <div>
                    <h3 className="file-path">{file.path}</h3>
                    <p className="file-type">{file.moduleType || 'Module'}</p>
                  </div>
                  <div className="file-badges">
                    <span className="badge badge-github">{file.language}</span>
                    <span className="file-lines">{file.lineCount} lines</span>
                  </div>
                </div>
                <p className="file-purpose">{file.purpose}</p>
                {file.imports?.length > 0 && (
                  <div className="file-imports">
                    <strong>Dependencies:</strong> {file.imports.map((imp, j) => (
                      <code key={j} className="import-tag">{imp}</code>
                    ))}
                  </div>
                )}
                {file.functions?.length > 0 && (
                  <div className="functions-section">
                    <h4>Functions ({file.functions.length})</h4>
                    <div className="functions-table-wrap">
                      <table className="functions-table">
                        <thead>
                          <tr>
                            <th>Function</th>
                            <th>Description</th>
                            <th>Parameters</th>
                            <th>Returns</th>
                          </tr>
                        </thead>
                        <tbody>
                          {file.functions.map((fn, j) => (
                            <tr key={j}>
                              <td><code>{fn.name}</code></td>
                              <td>{fn.description}</td>
                              <td>{fn.params?.length > 0 ? fn.params.map((p, k) => <code key={k} className="param-tag">{p}</code>) : <span className="no-params">none</span>}</td>
                              <td>{fn.hasReturn ? '✅ Yes' : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
