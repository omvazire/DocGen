const IGNORE_DIRS = new Set([
  'node_modules', 'dist', 'build', '.git', '.github',
  '.vscode', '__pycache__', '.next', 'coverage', 'vendor'
]);

const CODE_EXTENSIONS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.go',
  '.rb', '.php', '.c', '.cpp', '.h', '.rs', '.swift',
  '.kt', '.cs', '.vue', '.svelte', '.html', '.css', '.scss'
]);

function parseGitHubUrl(url) {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) throw new Error('Invalid GitHub URL');
  return { owner: match[1], repo: match[2].replace('.git', '') };
}

async function fetchRepoTree(owner, repo) {
  const headers = { Accept: 'application/vnd.github.v3+json' };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`,
    { headers }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub API error (${res.status}): ${body}`);
  }

  const data = await res.json();
  return data.tree
    .filter(item => item.type === 'blob')
    .filter(item => {
      const parts = item.path.split('/');
      return !parts.some(p => IGNORE_DIRS.has(p));
    })
    .filter(item => {
      const ext = '.' + item.path.split('.').pop();
      return CODE_EXTENSIONS.has(ext);
    })
    .slice(0, 50);
}

async function fetchFileContent(owner, repo, path) {
  const headers = { Accept: 'application/vnd.github.v3.raw' };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
    { headers }
  );

  if (!res.ok) return null;
  return res.text();
}

export async function fetchGitHubRepo(url) {
  const { owner, repo } = parseGitHubUrl(url);
  const tree = await fetchRepoTree(owner, repo);

  const files = [];
  for (const item of tree) {
    const content = await fetchFileContent(owner, repo, item.path);
    if (content && content.length < 50000) {
      files.push({ path: item.path, content });
    }
  }

  return { owner, repo, files };
}
