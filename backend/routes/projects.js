import { Router } from 'express';
import auth from '../middleware/auth.js';
import Project from '../models/Project.js';
import { fetchGitHubRepo } from '../utils/github.js';
import { generateDocs } from '../utils/docGenerator.js';

const router = Router();

router.post('/create', auth, async (req, res) => {
  try {
    const { name, source, repoUrl, code, fileName } = req.body;

    if (!name || !source) {
      return res.status(400).json({ error: 'Name and source are required' });
    }

    let files = [];
    let rawCode = '';

    if (source === 'github') {
      if (!repoUrl) return res.status(400).json({ error: 'GitHub URL is required' });
      const repoData = await fetchGitHubRepo(repoUrl);
      files = repoData.files;
    } else {
      if (!code) return res.status(400).json({ error: 'Code is required' });
      rawCode = code;
      // Use user-provided filename for correct language detection, fallback to main.js
      // (docGenerator will auto-detect language from content anyway)
      const codePath = fileName && fileName.includes('.') ? fileName : 'main.js';
      files = [{ path: codePath, content: code }];
    }

    const { readme, fileDocs } = generateDocs(files, name, source, repoUrl);

    const project = await Project.create({
      user: req.userId,
      name,
      source,
      repoUrl: repoUrl || '',
      readme,
      fileDocs,
      rawCode
    });

    res.status(201).json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/get', auth, async (req, res) => {
  try {
    const projects = await Project.find({ user: req.userId })
      .select('name source repoUrl createdAt updatedAt')
      .sort({ updatedAt: -1 });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, user: req.userId });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { readme } = req.body;
    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { readme, updatedAt: Date.now() },
      { new: true }
    );
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json({ message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
