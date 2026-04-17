function detectLanguage(path) {
  const ext = path.split('.').pop().toLowerCase();
  const map = {
    js: 'JavaScript', jsx: 'React (JSX)', ts: 'TypeScript', tsx: 'React (TSX)',
    py: 'Python', java: 'Java', go: 'Go', rb: 'Ruby', php: 'PHP',
    c: 'C', cpp: 'C++', h: 'C/C++ Header', rs: 'Rust', swift: 'Swift',
    kt: 'Kotlin', cs: 'C#', vue: 'Vue.js', svelte: 'Svelte',
    html: 'HTML', css: 'CSS', scss: 'SCSS'
  };
  return map[ext] || 'Unknown';
}

function extractFunctions(code) {
  const fns = [];
  const lines = code.split('\n');
  const patterns = [
    { re: /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/g, type: 'function' },
    { re: /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(([^)]*)\)\s*=>/g, type: 'arrow' },
    { re: /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?function\s*\(([^)]*)\)/g, type: 'expression' },
    { re: /def\s+(\w+)\s*\(([^)]*)\)/g, type: 'python' },
    { re: /func\s+(\w+)\s*\(([^)]*)\)/g, type: 'go' },
    { re: /(?:public|private|protected)?\s*(?:static\s+)?(?:\w+\s+)(\w+)\s*\(([^)]*)\)\s*\{/g, type: 'method' },
  ];

  const skip = new Set(['if', 'for', 'while', 'switch', 'catch', 'else', 'return', 'new', 'throw']);
  const seen = new Set();

  for (const { re } of patterns) {
    let match;
    while ((match = re.exec(code)) !== null) {
      const name = match[1];
      if (seen.has(name) || skip.has(name)) continue;
      seen.add(name);

      const lineIdx = code.substring(0, match.index).split('\n').length;
      let description = describeFunction(name, match[2], code, lineIdx, lines);

      const params = match[2].trim()
        ? match[2].split(',').map(p => {
            const clean = p.trim().replace(/=.*/, '').replace(/:.*/,'').trim();
            return clean;
          }).filter(Boolean)
        : [];

      const hasReturn = checkReturn(code, match.index);

      fns.push({ name, description, params, hasReturn, lineNumber: lineIdx });
    }
  }
  return fns;
}

function describeFunction(name, params, code, lineIdx, lines) {
  const words = name.replace(/([A-Z])/g, ' $1').replace(/[_-]/g, ' ').trim().toLowerCase().split(/\s+/);

  const verbs = {
    get: 'Retrieves', fetch: 'Fetches data from', set: 'Sets the value of', update: 'Updates',
    create: 'Creates a new', delete: 'Deletes', remove: 'Removes', add: 'Adds',
    handle: 'Handles the', on: 'Event handler that responds to', is: 'Checks whether',
    has: 'Determines if there is', check: 'Validates', validate: 'Validates the input for',
    parse: 'Parses and processes', format: 'Formats', convert: 'Converts',
    render: 'Renders the', display: 'Displays', show: 'Shows', hide: 'Hides',
    init: 'Initializes', setup: 'Sets up', configure: 'Configures', connect: 'Establishes connection to',
    send: 'Sends', submit: 'Submits', save: 'Saves', load: 'Loads',
    find: 'Searches for', search: 'Searches through', filter: 'Filters',
    sort: 'Sorts the', map: 'Maps', reduce: 'Reduces', transform: 'Transforms',
    calculate: 'Calculates', compute: 'Computes', process: 'Processes',
    login: 'Authenticates user login', logout: 'Logs out the current user',
    register: 'Registers a new user account', authenticate: 'Authenticates',
    authorize: 'Authorizes', encrypt: 'Encrypts', decrypt: 'Decrypts',
    export: 'Exports', import: 'Imports', use: 'Applies or uses',
    listen: 'Listens for', emit: 'Emits', subscribe: 'Subscribes to',
    publish: 'Publishes', dispatch: 'Dispatches',
  };

  const firstWord = words[0];
  const rest = words.slice(1).join(' ');

  if (verbs[firstWord]) {
    return `${verbs[firstWord]} ${rest || 'the specified data'}`.trim() + '.';
  }

  const paramStr = params ? params.trim() : '';
  if (paramStr) {
    const paramNames = paramStr.split(',').map(p => p.trim().split(/[=:]/)[0].trim()).filter(Boolean);
    return `Processes ${rest || name} using the provided ${paramNames.join(', ')} parameter${paramNames.length > 1 ? 's' : ''}.`;
  }

  return `Handles ${words.join(' ')} functionality for the application.`;
}

function checkReturn(code, startIdx) {
  const block = code.substring(startIdx, startIdx + 500);
  return /return\s+[^;]/.test(block);
}

function analyzeImports(code) {
  const imports = [];
  const importPatterns = [
    /import\s+(?:{[^}]+}|\w+)?(?:\s*,\s*{[^}]+})?\s+from\s+['"]([^'"]+)['"]/g,
    /const\s+\w+\s*=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /import\s+['"]([^'"]+)['"]/g,
  ];

  for (const pattern of importPatterns) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      imports.push(match[1]);
    }
  }
  return [...new Set(imports)];
}

function classifyModule(path, code, imports) {
  const lowerPath = path.toLowerCase();
  if (lowerPath.includes('route') || lowerPath.includes('router')) return 'API Route Handler';
  if (lowerPath.includes('model') || lowerPath.includes('schema')) return 'Data Model';
  if (lowerPath.includes('controller')) return 'Controller';
  if (lowerPath.includes('middleware')) return 'Middleware';
  if (lowerPath.includes('util') || lowerPath.includes('helper')) return 'Utility Module';
  if (lowerPath.includes('config')) return 'Configuration';
  if (lowerPath.includes('test') || lowerPath.includes('spec')) return 'Test Suite';
  if (lowerPath.includes('component') || code.includes('React') || code.includes('jsx')) return 'UI Component';
  if (lowerPath.includes('service')) return 'Service Layer';
  if (lowerPath.includes('hook')) return 'Custom Hook';
  if (lowerPath.includes('context') || lowerPath.includes('store')) return 'State Management';
  if (lowerPath.endsWith('.css') || lowerPath.endsWith('.scss')) return 'Stylesheet';
  if (lowerPath.endsWith('.html')) return 'HTML Template';
  return 'Module';
}

function extractApiRoutes(code) {
  const routes = [];
  const regex = /(?:app|router)\.(get|post|put|patch|delete)\s*\(\s*['"]([^'"]+)['"]/g;
  let match;
  while ((match = regex.exec(code)) !== null) {
    routes.push({ method: match[1].toUpperCase(), path: match[2] });
  }
  return routes;
}

function extractSchemas(code) {
  const schemas = [];
  const regex = /new\s+(?:mongoose\.)?Schema\s*\(\s*{([\s\S]*?)}\s*(?:,|\))/g;
  let match;
  while ((match = regex.exec(code)) !== null) {
    const rawFields = match[1].split(',').filter(l => l.includes(':'));
    const fields = rawFields.map(f => {
      const clean = f.trim().replace(/\n/g, ' ').replace(/\s+/g, ' ');
      const key = clean.split(':')[0].trim();
      let type = 'Mixed';
      if (clean.includes('String')) type = 'String';
      if (clean.includes('Number')) type = 'Number';
      if (clean.includes('Boolean')) type = 'Boolean';
      if (clean.includes('Date')) type = 'Date';
      if (clean.includes('ObjectId')) type = 'ObjectId';
      return { key, type };
    });
    // Try to guess schema name based on the variable declaring it
    const codeBefore = code.substring(Math.max(0, match.index - 50), match.index);
    const nameMatch = codeBefore.match(/(?:const|let|var)\s+(\w+)Schema\s*=/);
    const name = nameMatch ? nameMatch[1] : 'Unknown';
    if(fields.length > 0) schemas.push({ name, fields });
  }
  return schemas;
}

function generateFileSummary(path, code) {
  const lang = detectLanguage(path);
  const lines = code.split('\n').length;
  const fns = extractFunctions(code);
  const imports = analyzeImports(code);
  const moduleType = classifyModule(path, code, imports);
  const apiRoutes = extractApiRoutes(code);
  const schemas = extractSchemas(code);

  const exportsMatch = code.match(/export\s+(default\s+)?(function|class|const|let|var)\s+(\w+)/g) || [];
  const hasDefault = code.includes('export default');

  let purpose = `This ${moduleType.toLowerCase()} `;
  if (moduleType === 'API Route Handler') purpose += `defines ${apiRoutes.length} API endpoints.`;
  else if (moduleType === 'Data Model') purpose += `defines ${schemas.length} database schemas.`;
  else if (moduleType === 'Middleware') purpose += `intercepts requests for validation.`;
  else if (moduleType === 'UI Component') purpose += `renders the UI.`;
  else purpose += `implements core logic for ${path.split('/').pop()}.`;

  return {
    path, language: lang, moduleType, purpose, lineCount: lines,
    functions: fns, imports, exportCount: exportsMatch.length,
    hasDefaultExport: hasDefault, apiRoutes, schemas
  };
}

function generateReadme(projectName, source, repoUrl, fileDocs) {
  const languages = [...new Set(fileDocs.map(f => f.language))].filter(l => l !== 'Unknown');
  
  // Scrape all routes and schemas across the entire project
  const allRoutes = fileDocs.flatMap(f => f.apiRoutes || []).map(r => ({ ...r, file: f.path }));
  const allSchemas = fileDocs.flatMap(f => f.schemas || []).map(s => ({ ...s, file: f.path }));
  const dependencies = [...new Set(fileDocs.flatMap(f => f.imports))].filter(i => !i.startsWith('.') && !i.startsWith('/'));

  let md = '';

  md += `# 🚀 ${projectName}\n\n`;
  md += `## 1️⃣ Project Overview\n\n`;
  md += `**${projectName}** is a functional codebase parsed from \`${source}\`.\n\n`;
  md += `**What it does:** Based on the source code, this application utilizes **${languages.join(', ')}** to provide robust capabilities. `;
  if(allRoutes.length > 0) md += `It acts as an API server handling **${allRoutes.length} dedicated endpoints**. `;
  if(allSchemas.length > 0) md += `It interacts with a database managing **${allSchemas.length} distinct data models**. `;
  md += `\n\n`;

  md += `## 2️⃣ Table of Contents\n\n`;
  md += `- [1. Project Overview](#1️⃣-project-overview)\n`;
  md += `- [3. Architecture Overview](#3️⃣-architecture-overview)\n`;
  md += `- [4. File & Folder Structure](#4️⃣-file--folder-structure)\n`;
  md += `- [5. Dependencies & Setup](#5️⃣-dependencies--setup)\n`;
  md += `- [6. API Documentation](#7️⃣-api-documentation)\n`;
  md += `- [7. Code Explanation](#8️⃣-code-explanation-)\n`;
  md += `- [8. Database Design](#9️⃣-database-design)\n\n`;

  md += `## 3️⃣ Architecture Overview\n\n`;
  md += `Based on the code structure:\n`;
  if(fileDocs.some(f => f.path.includes('components') || f.path.includes('src/') && f.language.includes('React'))) {
    md += `- **Frontend Component:** The application features a UI layer built using modern frameworks.\n`;
  }
  if(allRoutes.length > 0) {
    md += `- **Backend API:** Exposes RESTful HTTP methods for data exchange.\n`;
  }
  if(allSchemas.length > 0) {
    md += `- **Database Layer:** Directly maps object-oriented code to database persistence via schemas.\n`;
  }
  md += `\n`;

  md += `## 4️⃣ File & Folder Structure\n\n`;
  md += `\`\`\`text\n`;
  fileDocs.forEach(f => { md += `${f.path} (${f.lineCount} lines)\n`; });
  md += `\`\`\`\n\n`;

  md += `## 5️⃣ Dependencies & Setup\n\n`;
  md += `**Identified Imports:**\n`;
  dependencies.forEach(dep => { md += `- \`${dep}\`\n`; });
  if (dependencies.length === 0) md += `*No external imports detected in the provided code.*\n`;
  md += `\n`;

  md += `## 7️⃣ API Documentation (🔥)\n\n`;
  if (allRoutes.length > 0) {
    md += `*The following HTTP Endpoints were detected natively in the code:*\n\n`;
    allRoutes.forEach(r => {
      let colorType = r.method === 'GET' ? '🟢' : r.method === 'POST' ? '🔵' : r.method === 'DELETE' ? '🔴' : '🟠';
      md += `### ${colorType} \`${r.method} ${r.path}\`\n`;
      md += `- **Origin:** Defined in \`${r.file}\`\n`;
      md += `- **Purpose:** Executes logic when this path is requested.\n\n`;
    });
  } else {
    md += `*No HTTP API endpoints (app.get, router.post, etc) were found in the scanned files.*\n\n`;
  }

  md += `## 8️⃣ Code Explanation 🤖\n\n`;
  fileDocs.forEach(f => {
    md += `### 📄 \`${f.path}\`\n`;
    md += `**Purpose:** ${f.purpose}\n\n`;
    if (f.functions.length > 0) {
      md += `**Exported/Declared Functions:**\n`;
      f.functions.forEach(fn => {
        md += `- \`${fn.name}(${fn.params.join(', ')})\` → ${fn.description}\n`;
      });
      md += `\n`;
    }
  });

  md += `## 9️⃣ Database Design\n\n`;
  if (allSchemas.length > 0) {
    md += `*The following Database Schemas were extracted directly from your code:*\n\n`;
    allSchemas.forEach(schema => {
      md += `### Collection: \`${schema.name}\`\n`;
      md += `| Field | Data Type |\n`;
      md += `|-------|-----------|\n`;
      schema.fields.forEach(field => {
        md += `| \`${field.key}\` | **${field.type}** |\n`;
      });
      md += `\n`;
    });
  } else {
    md += `*No structural Database Schemas (like Mongoose models) were detected in the codebase.*\n\n`;
  }

  return md;
}

export function generateDocs(files, projectName, source, repoUrl) {
  const fileDocs = files.map(f => generateFileSummary(f.path, f.content));
  const readme = generateReadme(projectName, source, repoUrl, fileDocs);
  return { readme, fileDocs };
}
