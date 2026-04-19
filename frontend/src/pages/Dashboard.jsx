import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Dashboard.css';

export default function Dashboard() {
  const { user, authFetch } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', source: 'github', repoUrl: '', code: '', fileName: '' });

  const fetchProjects = async () => {
    try {
      const res = await authFetch('/api/projects/get');
      const data = await res.json();
      setProjects(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProjects(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setCreateLoading(true);
    try {
      const res = await authFetch('/api/projects/create', {
        method: 'POST',
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setProjects([data, ...projects]);
      setShowModal(false);
      setForm({ name: '', source: 'github', repoUrl: '', code: '', fileName: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this project?')) return;
    try {
      await authFetch(`/api/projects/${id}`, { method: 'DELETE' });
      setProjects(projects.filter(p => p._id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="page fade-in">
      <div className="dashboard-header">
        <div>
          <h1>Your Projects</h1>
          <p className="dashboard-subtitle">
            Welcome back, <strong>{user?.name}</strong>. You have {projects.length} project{projects.length !== 1 ? 's' : ''}.
          </p>
        </div>
        <button className="btn btn-primary" id="new-project-btn" onClick={() => setShowModal(true)}>
          <span>+</span> New Project
        </button>
      </div>

      {error && <div className="error-msg">{error}</div>}

      {loading ? (
        <div className="loading-grid">
          {[1, 2, 3].map(i => <div key={i} className="skeleton-card" />)}
        </div>
      ) : projects.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-icon">📄</div>
          <h3>No projects yet</h3>
          <p>Create your first project to generate documentation from a GitHub repo or pasted code.</p>
          <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={() => setShowModal(true)}>
            Create Project
          </button>
        </div>
      ) : (
        <div className="project-grid">
          {projects.map((project, i) => (
            <div key={project._id} className="project-card card slide-up" style={{ animationDelay: `${i * 0.06}s` }}>
              <div className="project-card-header">
                <h3 className="project-name">{project.name}</h3>
                <span className={`badge badge-${project.source}`}>{project.source}</span>
              </div>
              {project.repoUrl && (
                <p className="project-repo">{project.repoUrl.replace('https://github.com/', '')}</p>
              )}
              <p className="project-date">
                {new Date(project.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
              <div className="project-card-actions">
                <Link to={`/project/${project._id}`} className="btn btn-secondary btn-sm">View Docs</Link>
                <button onClick={() => handleDelete(project._id)} className="btn btn-danger btn-sm" id={`delete-${project._id}`}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Project</h2>
              <button className="modal-close" id="modal-close-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              {error && <div className="error-msg">{error}</div>}
              <div className="form-group">
                <label htmlFor="project-name">Project Name</label>
                <input
                  id="project-name"
                  type="text"
                  placeholder="My Awesome Project"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="project-source">Source</label>
                <div className="source-toggle">
                  <button
                    type="button"
                    className={`toggle-btn ${form.source === 'github' ? 'active' : ''}`}
                    onClick={() => setForm({ ...form, source: 'github' })}
                  >
                    GitHub Repo
                  </button>
                  <button
                    type="button"
                    className={`toggle-btn ${form.source === 'paste' ? 'active' : ''}`}
                    onClick={() => setForm({ ...form, source: 'paste' })}
                  >
                    Paste Code
                  </button>
                </div>
              </div>
              {form.source === 'github' ? (
                <div className="form-group">
                  <label htmlFor="repo-url">Repository URL</label>
                  <input
                    id="repo-url"
                    type="url"
                    placeholder="https://github.com/user/repo"
                    value={form.repoUrl}
                    onChange={(e) => setForm({ ...form, repoUrl: e.target.value })}
                    required
                  />
                </div>
              ) : (
                <>
                  <div className="form-group">
                    <label htmlFor="file-name">File Name <span style={{ opacity: 0.5 }}>(optional — helps detect language)</span></label>
                    <input
                      id="file-name"
                      type="text"
                      placeholder="e.g. app.py, main.go, index.ts"
                      value={form.fileName}
                      onChange={(e) => setForm({ ...form, fileName: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="code-input">Code</label>
                    <textarea
                      id="code-input"
                      placeholder="Paste your code here... (language is auto-detected from content)"
                      rows="8"
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value })}
                      required
                    />
                  </div>
                </>
              )}
              <button type="submit" className="btn btn-primary btn-block" id="create-project-submit" disabled={createLoading}>
                {createLoading ? (
                  <><span className="spinner" /> Generating Documentation...</>
                ) : (
                  'Generate Documentation'
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
