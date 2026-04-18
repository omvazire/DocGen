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

function getLangEmoji(lang) {
  const emojis = {
    'JavaScript': '🟨', 'React (JSX)': '⚛️', 'TypeScript': '🔷', 'React (TSX)': '⚛️',
    'Python': '🐍', 'Java': '☕', 'Go': '🐹', 'Ruby': '💎', 'PHP': '🐘',
    'C': '⚙️', 'C++': '⚙️', 'Rust': '🦀', 'Swift': '🍎',
    'HTML': '🌐', 'CSS': '🎨', 'SCSS': '🎨', 'Vue.js': '💚', 'Svelte': '🔥'
  };
  return emojis[lang] || '📄';
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

function getModuleIcon(moduleType) {
  const icons = {
    'API Route Handler': '🔌', 'Data Model': '🗄️', 'Controller': '🎮',
    'Middleware': '🛡️', 'Utility Module': '🔧', 'Configuration': '⚙️',
    'Test Suite': '🧪', 'UI Component': '🧩', 'Service Layer': '📡',
    'Custom Hook': '🪝', 'State Management': '📦', 'Stylesheet': '🎨',
    'HTML Template': '🌐', 'Module': '📄'
  };
  return icons[moduleType] || '📄';
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
      let required = clean.includes('required') && clean.includes('true');
      let defaultVal = '';
      if (clean.includes('String')) type = 'String';
      if (clean.includes('Number')) type = 'Number';
      if (clean.includes('Boolean')) type = 'Boolean';
      if (clean.includes('Date')) type = 'Date';
      if (clean.includes('ObjectId')) type = 'ObjectId (Reference)';
      if (clean.includes('[String]') || clean.includes('[{')) type = 'Array';
      const defMatch = clean.match(/default:\s*([^,}]+)/);
      if (defMatch) defaultVal = defMatch[1].trim();
      return { key, type, required, defaultVal };
    }).filter(f => f.key && !f.key.startsWith('{') && !f.key.startsWith('['));
    const codeBefore = code.substring(Math.max(0, match.index - 80), match.index);
    const nameMatch = codeBefore.match(/(?:const|let|var)\s+(\w+)(?:Schema)?\s*=/);
    const name = nameMatch ? nameMatch[1].replace(/Schema$/, '') : 'Unknown';
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
  if (moduleType === 'API Route Handler') purpose += `defines ${apiRoutes.length} API endpoints for handling HTTP requests.`;
  else if (moduleType === 'Data Model') purpose += `defines ${schemas.length} database schema${schemas.length !== 1 ? 's' : ''} and data structures.`;
  else if (moduleType === 'Middleware') purpose += `intercepts incoming requests for authentication and validation checks.`;
  else if (moduleType === 'UI Component') purpose += `renders interactive user interface elements.`;
  else if (moduleType === 'Stylesheet') purpose += `provides visual styling rules and design tokens.`;
  else if (moduleType === 'Configuration') purpose += `manages environment settings and application configuration.`;
  else if (moduleType === 'Utility Module') purpose += `provides reusable helper functions.`;
  else purpose += `implements core logic for ${path.split('/').pop()}.`;

  return {
    path, language: lang, moduleType, purpose, lineCount: lines,
    functions: fns, imports, exportCount: exportsMatch.length,
    hasDefaultExport: hasDefault, apiRoutes, schemas
  };
}

/* ─────────────────────────────────────────────────────────────────────────────
 *  ARCHITECTURE DIAGRAM BUILDER
 * ───────────────────────────────────────────────────────────────────────────── */

function buildArchitectureDiagram(fileDocs, allRoutes, allSchemas) {
  const hasFrontend = fileDocs.some(f =>
    f.moduleType === 'UI Component' || f.moduleType === 'Stylesheet' ||
    f.path.toLowerCase().includes('component') || f.path.toLowerCase().includes('src/')
  );
  const hasBackend = allRoutes.length > 0 || fileDocs.some(f =>
    f.moduleType === 'API Route Handler' || f.moduleType === 'Middleware' ||
    f.moduleType === 'Controller'
  );
  const hasDatabase = allSchemas.length > 0 || fileDocs.some(f => f.moduleType === 'Data Model');
  const hasMiddleware = fileDocs.some(f => f.moduleType === 'Middleware');
  const hasUtils = fileDocs.some(f => f.moduleType === 'Utility Module' || f.moduleType === 'Service Layer');
  const hasConfig = fileDocs.some(f => f.moduleType === 'Configuration');

  let diagram = '```\n';
  diagram += '┌─────────────────────────────────────────────────────────────────┐\n';
  diagram += '│                    🏗️  SYSTEM ARCHITECTURE                     │\n';
  diagram += '└─────────────────────────────────────────────────────────────────┘\n\n';

  if (hasFrontend) {
    diagram += '   ┌───────────────────────────────────────┐\n';
    diagram += '   │          🖥️  FRONTEND LAYER            │\n';
    diagram += '   │  ┌─────────┐ ┌─────────┐ ┌─────────┐ │\n';
    diagram += '   │  │  Pages  │ │  Comps  │ │ Styles  │ │\n';
    diagram += '   │  └─────────┘ └─────────┘ └─────────┘ │\n';
    diagram += '   └──────────────────┬────────────────────┘\n';
    diagram += '                      │  HTTP Requests\n';
    diagram += '                      ▼\n';
  }

  if (hasMiddleware) {
    diagram += '   ┌───────────────────────────────────────┐\n';
    diagram += '   │         🛡️  MIDDLEWARE LAYER            │\n';
    diagram += '   │    Auth · Validation · Error Handle   │\n';
    diagram += '   └──────────────────┬────────────────────┘\n';
    diagram += '                      │\n';
    diagram += '                      ▼\n';
  }

  if (hasBackend) {
    diagram += '   ┌───────────────────────────────────────┐\n';
    diagram += '   │          🔌  API / ROUTE LAYER          │\n';
    const methodCounts = {};
    allRoutes.forEach(r => { methodCounts[r.method] = (methodCounts[r.method] || 0) + 1; });
    const methodSummary = Object.entries(methodCounts).map(([m, c]) => `${m}:${c}`).join(' · ');
    if (methodSummary) {
      diagram += `   │       ${methodSummary.padEnd(33)}│\n`;
    }
    diagram += '   └──────────────────┬────────────────────┘\n';
    if (hasUtils) {
      diagram += '                      │\n';
      diagram += '        ┌─────────────┼─────────────┐\n';
      diagram += '        │             │             │\n';
      diagram += '        ▼             ▼             ▼\n';
      diagram += '   ┌─────────┐  ┌─────────┐  ┌─────────┐\n';
      diagram += '   │ 🔧 Utils│  │📡 Servcs│  │⚙️ Config│\n';
      diagram += '   └─────────┘  └─────────┘  └─────────┘\n';
      diagram += '                      │\n';
      diagram += '                      ▼\n';
    } else {
      diagram += '                      │\n';
      diagram += '                      ▼\n';
    }
  }

  if (hasDatabase) {
    diagram += '   ┌───────────────────────────────────────┐\n';
    diagram += '   │         🗄️  DATABASE LAYER              │\n';
    const schemaNames = allSchemas.map(s => s.name).join(' · ');
    if (schemaNames) {
      diagram += `   │    Collections: ${schemaNames.padEnd(22)}│\n`;
    }
    diagram += '   └───────────────────────────────────────┘\n';
  }

  diagram += '```\n';
  return diagram;
}

/* ─────────────────────────────────────────────────────────────────────────────
 *  DATA FLOW DIAGRAM
 * ───────────────────────────────────────────────────────────────────────────── */

function buildDataFlowDiagram(allRoutes) {
  if (allRoutes.length === 0) return '';

  let diagram = '```\n';
  diagram += '┌─────────────────────────────────────────────────────────────────┐\n';
  diagram += '│                    🔄  DATA FLOW DIAGRAM                       │\n';
  diagram += '└─────────────────────────────────────────────────────────────────┘\n\n';

  diagram += '  👤 User / Client\n';
  diagram += '       │\n';
  diagram += '       │  1. Sends HTTP Request\n';
  diagram += '       ▼\n';
  diagram += '  ┌─────────────┐     ┌──────────────┐     ┌─────────────┐\n';
  diagram += '  │   Browser   │────▶│  API Server  │────▶│  Database   │\n';
  diagram += '  │  (Frontend) │◀────│  (Backend)   │◀────│  (MongoDB)  │\n';
  diagram += '  └─────────────┘     └──────────────┘     └─────────────┘\n';
  diagram += '       │                     │                     │\n';
  diagram += '       │  4. Renders Data    │  2. Process &      │  3. Store/\n';
  diagram += '       │     to Screen       │     Validate       │     Retrieve\n';
  diagram += '       ▼                     ▼                     ▼\n';
  diagram += '   📊 UI Update         🔧 Business Logic    💾 Persistence\n';

  diagram += '```\n';
  return diagram;
}

/* ─────────────────────────────────────────────────────────────────────────────
 *  FOLDER STRUCTURE TREE
 * ───────────────────────────────────────────────────────────────────────────── */

function buildFolderTree(fileDocs) {
  const tree = {};
  fileDocs.forEach(f => {
    const parts = f.path.split('/');
    let current = tree;
    parts.forEach((part, i) => {
      if (!current[part]) current[part] = i === parts.length - 1 ? null : {};
      if (current[part] !== null) current = current[part];
    });
  });

  function renderTree(node, prefix = '', isRoot = true) {
    let result = '';
    const entries = Object.entries(node);
    entries.forEach(([name, children], i) => {
      const isLast = i === entries.length - 1;
      const connector = isRoot ? '' : (isLast ? '└── ' : '├── ');
      const icon = children === null ? '📄' : '📁';
      result += `${prefix}${connector}${icon} ${name}\n`;
      if (children !== null) {
        const childPrefix = prefix + (isRoot ? '' : (isLast ? '    ' : '│   '));
        result += renderTree(children, childPrefix, false);
      }
    });
    return result;
  }

  return renderTree(tree);
}

/* ─────────────────────────────────────────────────────────────────────────────
 *  DATABASE ER DIAGRAM
 * ───────────────────────────────────────────────────────────────────────────── */

function buildERDiagram(allSchemas) {
  if (allSchemas.length === 0) return '';

  let diagram = '```\n';
  diagram += '┌─────────────────────────────────────────────────────────────────┐\n';
  diagram += '│                 🗄️  DATABASE SCHEMA DIAGRAM                    │\n';
  diagram += '└─────────────────────────────────────────────────────────────────┘\n\n';

  allSchemas.forEach((schema, idx) => {
    const maxFieldLen = Math.max(...schema.fields.map(f => f.key.length), 8);
    const maxTypeLen = Math.max(...schema.fields.map(f => f.type.length), 8);
    const boxWidth = maxFieldLen + maxTypeLen + 11;
    const titlePad = Math.max(0, boxWidth - schema.name.length - 4);

    diagram += `  ┌${'─'.repeat(boxWidth)}┐\n`;
    diagram += `  │ 📋 ${schema.name.toUpperCase()}${' '.repeat(Math.max(0, titlePad - 2))}│\n`;
    diagram += `  ├${'─'.repeat(maxFieldLen + 4)}┬${'─'.repeat(maxTypeLen + 5)}┤\n`;
    diagram += `  │ ${'Field'.padEnd(maxFieldLen + 2)} │ ${'Type'.padEnd(maxTypeLen + 3)} │\n`;
    diagram += `  ├${'─'.repeat(maxFieldLen + 4)}┼${'─'.repeat(maxTypeLen + 5)}┤\n`;

    schema.fields.forEach(field => {
      const req = field.required ? ' ✱' : '  ';
      diagram += `  │ ${field.key.padEnd(maxFieldLen + 2)} │ ${field.type.padEnd(maxTypeLen + 1)}${req} │\n`;
    });

    diagram += `  └${'─'.repeat(maxFieldLen + 4)}┴${'─'.repeat(maxTypeLen + 5)}┘\n`;

    if (idx < allSchemas.length - 1) {
      diagram += '        │\n';
      diagram += '        │  references\n';
      diagram += '        ▼\n';
    }
  });

  diagram += '\n  ✱ = required field\n';
  diagram += '```\n';
  return diagram;
}

/* ─────────────────────────────────────────────────────────────────────────────
 *  MAIN README GENERATOR
 * ───────────────────────────────────────────────────────────────────────────── */

function generateReadme(projectName, source, repoUrl, fileDocs) {
  const languages = [...new Set(fileDocs.map(f => f.language))].filter(l => l !== 'Unknown');
  const allRoutes = fileDocs.flatMap(f => f.apiRoutes || []).map(r => ({ ...r }));
  // attach file info to routes
  fileDocs.forEach(f => {
    (f.apiRoutes || []).forEach(r => {
      const found = allRoutes.find(ar => ar.method === r.method && ar.path === r.path && !ar.file);
      if (found) found.file = f.path;
    });
  });
  const allSchemas = fileDocs.flatMap(f => (f.schemas || []).map(s => ({ ...s, file: f.path })));
  const externalDeps = [...new Set(fileDocs.flatMap(f => f.imports))].filter(i => !i.startsWith('.') && !i.startsWith('/'));
  const localDeps = [...new Set(fileDocs.flatMap(f => f.imports))].filter(i => i.startsWith('.') || i.startsWith('/'));
  const totalLines = fileDocs.reduce((sum, f) => sum + f.lineCount, 0);
  const totalFunctions = fileDocs.reduce((sum, f) => sum + f.functions.length, 0);

  // Categorize files by module type
  const filesByType = {};
  fileDocs.forEach(f => {
    if (!filesByType[f.moduleType]) filesByType[f.moduleType] = [];
    filesByType[f.moduleType].push(f);
  });

  let md = '';

  // ──── TITLE & BANNER ────
  md += `<div align="center">\n\n`;
  md += `# 🚀 ${projectName}\n\n`;
  md += `**Auto-Generated Project Documentation**\n\n`;
  md += `---\n\n`;

  // Stats badges
  md += `| 📁 Files | 📝 Lines of Code | ⚡ Functions | 🔌 API Endpoints | 🗄️ Data Models |\n`;
  md += `|:--------:|:----------------:|:------------:|:-----------------:|:---------------:|\n`;
  md += `| **${fileDocs.length}** | **${totalLines.toLocaleString()}** | **${totalFunctions}** | **${allRoutes.length}** | **${allSchemas.length}** |\n\n`;

  md += `</div>\n\n`;

  // ──── TABLE OF CONTENTS ────
  md += `---\n\n`;
  md += `## 📑 Table of Contents\n\n`;
  md += `| # | Section | Description |\n`;
  md += `|:-:|---------|-------------|\n`;
  md += `| 1 | [🎯 What This Project Does](#-what-this-project-does) | A plain-English explanation of the system |\n`;
  md += `| 2 | [🏗️ Architecture Overview](#️-architecture-overview) | Visual diagram of how components connect |\n`;
  md += `| 3 | [🔄 Data Flow](#-data-flow) | How data moves through the system |\n`;
  md += `| 4 | [🛠️ Technology Stack](#️-technology-stack) | Languages, frameworks, and libraries used |\n`;
  md += `| 5 | [📁 File & Folder Structure](#-file--folder-structure) | Project organization and file tree |\n`;
  if (allRoutes.length > 0) {
    md += `| 6 | [🔌 API Reference](#-api-reference) | All HTTP endpoints with details |\n`;
  }
  if (allSchemas.length > 0) {
    md += `| 7 | [🗄️ Database Design](#️-database-design) | Schema diagrams and field definitions |\n`;
  }
  md += `| 8 | [📖 Code Walkthrough](#-code-walkthrough) | Detailed explanation of every file |\n`;
  md += `| 9 | [🚀 Getting Started](#-getting-started) | How to set up and run the project |\n\n`;

  // ──── SECTION 1: WHAT THIS PROJECT DOES ────
  md += `---\n\n`;
  md += `## 🎯 What This Project Does\n\n`;

  md += `> **In Simple Terms:** `;
  if (allRoutes.length > 0 && allSchemas.length > 0) {
    md += `This is a full-stack application that provides a web server with ${allRoutes.length} API endpoints and stores data using ${allSchemas.length} database model${allSchemas.length > 1 ? 's' : ''}. `;
  } else if (allRoutes.length > 0) {
    md += `This application runs a web server exposing ${allRoutes.length} API endpoints for clients to interact with. `;
  } else if (allSchemas.length > 0) {
    md += `This application manages data through ${allSchemas.length} database model${allSchemas.length > 1 ? 's' : ''}. `;
  } else {
    md += `This codebase provides functionality using ${languages.join(' and ')}. `;
  }
  md += `\n\n`;

  md += `**Here's what the system is built to handle:**\n\n`;

  // Bullet points by capability
  const capabilities = [];
  if (filesByType['UI Component']) capabilities.push(`🖥️ **User Interface** — ${filesByType['UI Component'].length} UI component${filesByType['UI Component'].length > 1 ? 's' : ''} that render the visual experience users see and interact with`);
  if (filesByType['API Route Handler']) capabilities.push(`🔌 **API Server** — ${allRoutes.length} HTTP endpoint${allRoutes.length > 1 ? 's' : ''} that receive requests, process data, and send back responses`);
  if (filesByType['Middleware']) capabilities.push(`🛡️ **Security & Validation** — Middleware layer${filesByType['Middleware'].length > 1 ? 's' : ''} that protect routes and verify incoming requests before they reach the business logic`);
  if (filesByType['Data Model']) capabilities.push(`🗄️ **Data Persistence** — ${allSchemas.length} database schema${allSchemas.length > 1 ? 's' : ''} that define how information is structured, validated, and stored permanently`);
  if (filesByType['Utility Module'] || filesByType['Service Layer']) {
    const count = (filesByType['Utility Module']?.length || 0) + (filesByType['Service Layer']?.length || 0);
    capabilities.push(`🔧 **Helper Services** — ${count} utility module${count > 1 ? 's' : ''} providing reusable logic shared across the project`);
  }
  if (filesByType['Configuration']) capabilities.push(`⚙️ **Configuration** — Centralized settings that control how the application connects to services and behaves in different environments`);
  if (filesByType['Stylesheet']) capabilities.push(`🎨 **Styling** — ${filesByType['Stylesheet'].length} stylesheet${filesByType['Stylesheet'].length > 1 ? 's' : ''} that define the visual appearance, colors, and layout of the UI`);

  if (capabilities.length > 0) {
    capabilities.forEach(cap => { md += `- ${cap}\n`; });
  } else {
    md += `- 📄 General-purpose module${fileDocs.length > 1 ? 's' : ''} implementing application logic\n`;
  }
  md += `\n`;

  // ──── SECTION 2: ARCHITECTURE OVERVIEW ────
  md += `---\n\n`;
  md += `## 🏗️ Architecture Overview\n\n`;
  md += `The diagram below shows how the different parts of this application are connected. Each box represents a layer, and the arrows show the direction data travels.\n\n`;
  md += buildArchitectureDiagram(fileDocs, allRoutes, allSchemas);
  md += `\n`;

  // Layer explanation
  md += `**What each layer does:**\n\n`;
  const layerExplanations = [];
  if (fileDocs.some(f => f.moduleType === 'UI Component' || f.moduleType === 'Stylesheet')) {
    layerExplanations.push(`| 🖥️ **Frontend** | The part users see and interact with — buttons, forms, pages, and visual feedback |`);
  }
  if (fileDocs.some(f => f.moduleType === 'Middleware')) {
    layerExplanations.push(`| 🛡️ **Middleware** | Acts as a gatekeeper — checks authentication tokens, validates data, and handles errors before requests reach the main logic |`);
  }
  if (allRoutes.length > 0) {
    layerExplanations.push(`| 🔌 **API Layer** | The "brain" — receives HTTP requests, runs the appropriate business logic, and sends back responses |`);
  }
  if (allSchemas.length > 0) {
    layerExplanations.push(`| 🗄️ **Database** | The "memory" — permanently stores and retrieves structured data so nothing is lost when the server restarts |`);
  }

  if (layerExplanations.length > 0) {
    md += `| Layer | What It Does |\n`;
    md += `|-------|-------------|\n`;
    layerExplanations.forEach(row => { md += `${row}\n`; });
    md += `\n`;
  }

  // ──── SECTION 3: DATA FLOW ────
  md += `---\n\n`;
  md += `## 🔄 Data Flow\n\n`;
  md += `This diagram shows the journey of a typical request from when a user takes an action to when they see the result:\n\n`;

  if (allRoutes.length > 0) {
    md += buildDataFlowDiagram(allRoutes);
    md += `\n`;
    md += `**Step-by-step breakdown:**\n\n`;
    md += `| Step | What Happens | Example |\n`;
    md += `|:----:|-------------|--------|\n`;
    md += `| 1️⃣ | User performs an action (click, submit form) | Clicking "Save" button |\n`;
    md += `| 2️⃣ | Browser sends an HTTP request to the server | \`POST /api/data\` with form data |\n`;
    md += `| 3️⃣ | Server validates the request and runs logic | Checks auth token, processes data |\n`;
    md += `| 4️⃣ | Database stores or retrieves the data | Saves new record to collection |\n`;
    md += `| 5️⃣ | Server sends response back to the browser | Returns the saved record as JSON |\n`;
    md += `| 6️⃣ | UI updates to show the result | Shows success message to user |\n\n`;
  } else {
    md += `> This project does not expose HTTP API endpoints, so data flow is handled internally within the application logic.\n\n`;
  }

  // ──── SECTION 4: TECHNOLOGY STACK ────
  md += `---\n\n`;
  md += `## 🛠️ Technology Stack\n\n`;
  md += `Here are all the technologies and tools detected in this project:\n\n`;

  md += `### Languages Used\n\n`;
  md += `| Language | Icon | Files Using It |\n`;
  md += `|----------|:----:|:--------------:|\n`;
  languages.forEach(lang => {
    const count = fileDocs.filter(f => f.language === lang).length;
    md += `| ${lang} | ${getLangEmoji(lang)} | ${count} |\n`;
  });
  md += `\n`;

  if (externalDeps.length > 0) {
    md += `### External Libraries & Packages\n\n`;
    md += `These are third-party packages the project depends on:\n\n`;
    md += `| Package | What It's Likely Used For |\n`;
    md += `|---------|-------------------------|\n`;
    externalDeps.forEach(dep => {
      md += `| \`${dep}\` | ${describePackage(dep)} |\n`;
    });
    md += `\n`;
  }

  // ──── SECTION 5: FILE & FOLDER STRUCTURE ────
  md += `---\n\n`;
  md += `## 📁 File & Folder Structure\n\n`;
  md += `Here is every file in the project, organized in a tree view:\n\n`;
  md += `\`\`\`\n`;
  md += `📦 ${projectName}\n`;
  md += buildFolderTree(fileDocs);
  md += `\`\`\`\n\n`;

  md += `**File Summary by Category:**\n\n`;
  md += `| Category | Files | Total Lines |\n`;
  md += `|----------|:-----:|:-----------:|\n`;
  Object.entries(filesByType).forEach(([type, files]) => {
    const icon = getModuleIcon(type);
    const lines = files.reduce((s, f) => s + f.lineCount, 0);
    md += `| ${icon} ${type} | ${files.length} | ${lines.toLocaleString()} |\n`;
  });
  md += `\n`;

  // ──── SECTION 6: API REFERENCE ────
  if (allRoutes.length > 0) {
    md += `---\n\n`;
    md += `## 🔌 API Reference\n\n`;
    md += `These are all the HTTP endpoints your application exposes. Clients (browsers, mobile apps, other servers) can call these URLs to interact with your system.\n\n`;

    // Group routes by their base path
    const routeGroups = {};
    allRoutes.forEach(r => {
      const basePath = '/' + (r.path.split('/').filter(Boolean)[0] || 'root');
      if (!routeGroups[basePath]) routeGroups[basePath] = [];
      routeGroups[basePath].push(r);
    });

    md += `### Quick Overview\n\n`;
    md += `| Method | Endpoint | Defined In |\n`;
    md += `|:------:|----------|------------|\n`;
    allRoutes.forEach(r => {
      const badge = r.method === 'GET' ? '🟢 GET'
        : r.method === 'POST' ? '🔵 POST'
        : r.method === 'PUT' ? '🟠 PUT'
        : r.method === 'PATCH' ? '🟡 PATCH'
        : r.method === 'DELETE' ? '🔴 DELETE'
        : `⚪ ${r.method}`;
      md += `| **${badge}** | \`${r.path}\` | \`${r.file || 'unknown'}\` |\n`;
    });
    md += `\n`;

    md += `### Detailed Endpoint Documentation\n\n`;
    allRoutes.forEach((r, i) => {
      const badge = r.method === 'GET' ? '🟢'
        : r.method === 'POST' ? '🔵'
        : r.method === 'PUT' ? '🟠'
        : r.method === 'PATCH' ? '🟡'
        : r.method === 'DELETE' ? '🔴' : '⚪';

      md += `#### ${badge} \`${r.method} ${r.path}\`\n\n`;
      md += `| Property | Value |\n`;
      md += `|----------|-------|\n`;
      md += `| **Method** | \`${r.method}\` |\n`;
      md += `| **URL Path** | \`${r.path}\` |\n`;
      md += `| **Source File** | \`${r.file || 'unknown'}\` |\n`;
      md += `| **What It Does** | ${describeRoute(r.method, r.path)} |\n\n`;

      if (r.method === 'GET') {
        md += `> 📖 **GET** requests are used to *read* data. They don't change anything on the server — they just ask for information and return it.\n\n`;
      } else if (r.method === 'POST') {
        md += `> ✏️ **POST** requests are used to *create* new data. The client sends information in the request body, and the server saves it.\n\n`;
      } else if (r.method === 'PUT') {
        md += `> 🔄 **PUT** requests are used to *update* existing data. The client sends the updated information, and the server replaces the old version.\n\n`;
      } else if (r.method === 'DELETE') {
        md += `> 🗑️ **DELETE** requests are used to *remove* data permanently from the server.\n\n`;
      } else if (r.method === 'PATCH') {
        md += `> 🩹 **PATCH** requests are used to *partially update* existing data — only the specified fields are changed.\n\n`;
      }
    });
  }

  // ──── SECTION 7: DATABASE DESIGN ────
  if (allSchemas.length > 0) {
    md += `---\n\n`;
    md += `## 🗄️ Database Design\n\n`;
    md += `The application stores its data in a database. Below you'll find the structure of each data collection — think of these as "tables" that define what information is stored.\n\n`;

    md += buildERDiagram(allSchemas);
    md += `\n`;

    md += `### Detailed Schema Definitions\n\n`;
    allSchemas.forEach(schema => {
      md += `#### 📋 Collection: \`${schema.name}\`\n\n`;
      if (schema.file) {
        md += `*Defined in: \`${schema.file}\`*\n\n`;
      }
      md += `| # | Field Name | Data Type | Required | Notes |\n`;
      md += `|:-:|-----------|:---------:|:--------:|-------|\n`;
      schema.fields.forEach((field, i) => {
        const req = field.required ? '✅ Yes' : '—';
        const notes = field.defaultVal ? `Default: \`${field.defaultVal}\`` : '—';
        md += `| ${i + 1} | \`${field.key}\` | **${field.type}** | ${req} | ${notes} |\n`;
      });
      md += `\n`;

      // Plain English explanation
      md += `> **What this stores:** The \`${schema.name}\` collection holds records where each entry contains: ${schema.fields.map(f => `**${f.key}** (${f.type.toLowerCase()})`).join(', ')}.\n\n`;
    });
  }

  // ──── SECTION 8: CODE WALKTHROUGH ────
  md += `---\n\n`;
  md += `## 📖 Code Walkthrough\n\n`;
  md += `Below is a detailed, file-by-file explanation of the entire codebase. Each section describes what one file does, what functions it contains, and how they work.\n\n`;

  Object.entries(filesByType).forEach(([type, files]) => {
    const icon = getModuleIcon(type);
    md += `### ${icon} ${type} Files\n\n`;

    files.forEach(f => {
      md += `#### 📄 \`${f.path}\`\n\n`;
      md += `| Property | Value |\n`;
      md += `|----------|-------|\n`;
      md += `| **Language** | ${getLangEmoji(f.language)} ${f.language} |\n`;
      md += `| **Type** | ${icon} ${f.moduleType} |\n`;
      md += `| **Lines** | ${f.lineCount} |\n`;
      md += `| **Purpose** | ${f.purpose} |\n\n`;

      if (f.imports && f.imports.length > 0) {
        md += `**📦 Dependencies this file uses:**\n`;
        f.imports.forEach(imp => {
          const isExternal = !imp.startsWith('.') && !imp.startsWith('/');
          md += `- \`${imp}\` ${isExternal ? '(external package)' : '(local file)'}\n`;
        });
        md += `\n`;
      }

      if (f.functions.length > 0) {
        md += `**⚡ Functions in this file:**\n\n`;
        md += `| Function Name | What It Does | Parameters | Returns Value? |\n`;
        md += `|-------------|-------------|:----------:|:--------------:|\n`;
        f.functions.forEach(fn => {
          const params = fn.params.length > 0 ? fn.params.map(p => `\`${p}\``).join(', ') : '*none*';
          md += `| \`${fn.name}\` | ${fn.description} | ${params} | ${fn.hasReturn ? '✅ Yes' : '—'} |\n`;
        });
        md += `\n`;

        // Detailed function descriptions
        md += `<details>\n<summary>📚 Click to expand detailed function descriptions</summary>\n\n`;
        f.functions.forEach(fn => {
          md += `**\`${fn.name}(${fn.params.join(', ')})\`**\n\n`;
          md += `${fn.description}`;
          if (fn.params.length > 0) {
            md += ` This function accepts ${fn.params.length} parameter${fn.params.length > 1 ? 's' : ''}: ${fn.params.map(p => `\`${p}\``).join(', ')}.`;
          }
          if (fn.hasReturn) {
            md += ` It returns a value after processing.`;
          }
          md += `\n\n`;
        });
        md += `</details>\n\n`;
      }

      if (f.apiRoutes && f.apiRoutes.length > 0) {
        md += `**🔌 Routes defined here:**\n`;
        f.apiRoutes.forEach(r => {
          const badge = r.method === 'GET' ? '🟢' : r.method === 'POST' ? '🔵'
            : r.method === 'PUT' ? '🟠' : r.method === 'DELETE' ? '🔴' : '⚪';
          md += `- ${badge} \`${r.method} ${r.path}\`\n`;
        });
        md += `\n`;
      }

      md += `---\n\n`;
    });
  });

  // ──── SECTION 9: GETTING STARTED ────
  md += `## 🚀 Getting Started\n\n`;
  md += `Follow these steps to set up and run this project on your own machine:\n\n`;

  const hasNode = externalDeps.some(d => ['express', 'react', 'next', 'vue', 'koa', 'fastify', 'mongoose', 'cors'].includes(d));
  const hasPython = languages.includes('Python');

  if (hasNode) {
    md += `### Prerequisites\n\n`;
    md += `- **Node.js** (v16 or higher) — [Download here](https://nodejs.org)\n`;
    md += `- **npm** (comes with Node.js) or **yarn**\n`;
    if (externalDeps.includes('mongoose')) {
      md += `- **MongoDB** — [Get it here](https://www.mongodb.com/try/download) or use MongoDB Atlas (cloud)\n`;
    }
    md += `\n`;
    md += `### Installation\n\n`;
    md += `\`\`\`bash\n`;
    md += `# 1. Clone the repository\n`;
    if (repoUrl) {
      md += `git clone ${repoUrl}\n`;
    } else {
      md += `git clone <your-repository-url>\n`;
    }
    md += `\n`;
    md += `# 2. Navigate into the project folder\n`;
    md += `cd ${projectName.toLowerCase().replace(/\s+/g, '-')}\n`;
    md += `\n`;
    md += `# 3. Install all dependencies\n`;
    md += `npm install\n`;
    md += `\n`;
    md += `# 4. Set up environment variables (if needed)\n`;
    md += `cp .env.example .env\n`;
    md += `# Edit .env with your configuration\n`;
    md += `\n`;
    md += `# 5. Start the development server\n`;
    md += `npm run dev\n`;
    md += `\`\`\`\n\n`;
  } else if (hasPython) {
    md += `### Prerequisites\n\n`;
    md += `- **Python** (v3.8 or higher) — [Download here](https://python.org)\n`;
    md += `- **pip** (comes with Python)\n\n`;
    md += `### Installation\n\n`;
    md += `\`\`\`bash\n`;
    md += `# 1. Clone the repository\n`;
    if (repoUrl) {
      md += `git clone ${repoUrl}\n`;
    } else {
      md += `git clone <your-repository-url>\n`;
    }
    md += `\n`;
    md += `# 2. Install dependencies\n`;
    md += `pip install -r requirements.txt\n`;
    md += `\n`;
    md += `# 3. Run the application\n`;
    md += `python main.py\n`;
    md += `\`\`\`\n\n`;
  } else {
    md += `### Setup\n\n`;
    md += `1. Clone or download the source code\n`;
    md += `2. Install any required dependencies for ${languages.join(', ')}\n`;
    md += `3. Run the main entry point file\n\n`;
  }

  // ──── FOOTER ────
  md += `---\n\n`;
  md += `<div align="center">\n\n`;
  md += `**📄 This documentation was auto-generated by DocuGen**\n\n`;
  md += `*Generated on ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}*\n\n`;
  if (repoUrl) {
    md += `[🔗 View Repository](${repoUrl})\n\n`;
  }
  md += `</div>\n`;

  return md;
}

/* ─────────────────────────────────────────────────────────────────────────────
 *  HELPER: Describe common npm packages
 * ───────────────────────────────────────────────────────────────────────────── */

function describePackage(name) {
  const known = {
    'express': 'Web server framework for handling HTTP requests & routing',
    'react': 'UI library for building interactive user interfaces',
    'react-dom': 'Renders React components into the browser DOM',
    'react-router-dom': 'Client-side page navigation and URL routing',
    'mongoose': 'MongoDB database ORM — models, schemas, queries',
    'mongodb': 'Official MongoDB database driver',
    'cors': 'Cross-Origin Resource Sharing — allows frontend-backend communication',
    'dotenv': 'Loads environment variables from .env file',
    'jsonwebtoken': 'JSON Web Token auth — sign & verify user sessions',
    'bcrypt': 'Password hashing for secure storage',
    'bcryptjs': 'Password hashing for secure storage (pure JS)',
    'axios': 'HTTP client for making API requests',
    'helmet': 'Security middleware that sets protective HTTP headers',
    'morgan': 'HTTP request logger for debugging',
    'multer': 'File upload handling middleware',
    'nodemon': 'Auto-restarts server during development',
    'socket.io': 'Real-time bidirectional communication (WebSockets)',
    'next': 'React framework for server-side rendering & static sites',
    'vue': 'Progressive JavaScript framework for building UIs',
    'svelte': 'Compile-time UI framework',
    'tailwindcss': 'Utility-first CSS framework',
    'styled-components': 'CSS-in-JS library for React components',
    'redux': 'Predictable state container for JS apps',
    'passport': 'Authentication middleware with strategy plugins',
    'validator': 'String validation and sanitization',
    'joi': 'Schema-based data validation',
    'marked': 'Markdown to HTML converter',
    'html2pdf.js': 'Converts HTML content to downloadable PDF files',
    'vite': 'Fast development server and build tool',
  };
  return known[name] || 'Third-party library providing additional functionality';
}

/* ─────────────────────────────────────────────────────────────────────────────
 *  HELPER: Describe an API route in human language
 * ───────────────────────────────────────────────────────────────────────────── */

function describeRoute(method, path) {
  const parts = path.split('/').filter(Boolean);
  const hasParam = parts.some(p => p.startsWith(':'));
  const resource = parts.filter(p => !p.startsWith(':') && p !== 'api').pop() || 'resource';

  if (method === 'GET' && hasParam) return `Retrieves a specific ${resource} record by its unique ID`;
  if (method === 'GET') return `Retrieves a list of ${resource} records`;
  if (method === 'POST') return `Creates a new ${resource} record with the provided data`;
  if (method === 'PUT' && hasParam) return `Updates an existing ${resource} record identified by ID`;
  if (method === 'PUT') return `Updates ${resource} data`;
  if (method === 'PATCH') return `Partially updates specific fields of a ${resource} record`;
  if (method === 'DELETE' && hasParam) return `Permanently deletes a ${resource} record by its ID`;
  if (method === 'DELETE') return `Deletes ${resource} data`;
  return `Handles ${method} requests to \`${path}\``;
}

/* ─────────────────────────────────────────────────────────────────────────────
 *  EXPORT
 * ───────────────────────────────────────────────────────────────────────────── */

export function generateDocs(files, projectName, source, repoUrl) {
  const fileDocs = files.map(f => generateFileSummary(f.path, f.content));
  const readme = generateReadme(projectName, source, repoUrl, fileDocs);
  return { readme, fileDocs };
}
