/* ═══════════════════════════════════════════════════════════════════════════════
 *  DocuGen — Intelligent Code Documentation Generator
 *  
 *  Performs deep static analysis of source code to produce accurate,
 *  language-aware documentation. Analyses function bodies, import graphs,
 *  API routes, database schemas, React components, and more.
 * ═══════════════════════════════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────────────────────────────────────
 *  LANGUAGE DETECTION — from file extension AND code content analysis
 * ───────────────────────────────────────────────────────────────────────────── */

const EXTENSION_MAP = {
  js: 'JavaScript', jsx: 'React (JSX)', ts: 'TypeScript', tsx: 'React (TSX)',
  py: 'Python', java: 'Java', go: 'Go', rb: 'Ruby', php: 'PHP',
  c: 'C', cpp: 'C++', h: 'C/C++ Header', rs: 'Rust', swift: 'Swift',
  kt: 'Kotlin', cs: 'C#', vue: 'Vue.js', svelte: 'Svelte',
  html: 'HTML', css: 'CSS', scss: 'SCSS', sass: 'SASS',
  dart: 'Dart', lua: 'Lua', r: 'R', scala: 'Scala',
  sql: 'SQL', sh: 'Shell', bash: 'Shell', zsh: 'Shell',
  yml: 'YAML', yaml: 'YAML', json: 'JSON', xml: 'XML',
  md: 'Markdown', toml: 'TOML',
};

function detectLanguageFromExtension(path) {
  const ext = path.split('.').pop().toLowerCase();
  return EXTENSION_MAP[ext] || null;
}

/**
 * Detect language from actual code content using syntax fingerprints.
 * This is critical for pasted code where the file extension may be wrong.
 */
function detectLanguageFromContent(code) {
  const lines = code.split('\n');
  const sample = code.substring(0, 5000); // analyse first 5k chars

  const scores = {};
  const bump = (lang, pts) => { scores[lang] = (scores[lang] || 0) + pts; };

  // ─── Python signals ───
  if (/^(from|import)\s+\w+/.test(sample)) bump('Python', 2);
  if (/def\s+\w+\s*\(.*\)\s*(->\s*\w+\s*)?:/.test(sample)) bump('Python', 5);
  if (/class\s+\w+.*:\s*$/.test(sample)) bump('Python', 2); // Python-style class (ends with colon)
  if (sample.includes('self.')) bump('Python', 3);
  if (sample.includes('__init__') || sample.includes('__name__')) bump('Python', 4);
  if (/^\s*@\w+/.test(sample)) bump('Python', 1); // decorators (could also be Java)
  if (/print\s*\(/.test(sample)) bump('Python', 1);
  if (/elif\s+/.test(sample)) bump('Python', 3);
  if (sample.includes('True') && sample.includes('False')) bump('Python', 2);
  if (/:\s*\n\s+(pass|return|raise)/.test(sample)) bump('Python', 3);

  // ─── Java signals ───
  if (/public\s+(static\s+)?void\s+main\s*\(/.test(sample)) bump('Java', 10);
  if (/public\s+class\s+\w+/.test(sample)) bump('Java', 5);
  if (sample.includes('System.out.println')) bump('Java', 5);
  if (sample.includes('import java.')) bump('Java', 6);
  if (/private\s+(final\s+)?[\w<>\[\]]+\s+\w+\s*[;=]/.test(sample)) bump('Java', 3);
  if (/@Override|@Autowired|@Entity|@Component|@Service/.test(sample)) bump('Java', 5);

  // ─── Go signals ───
  if (/^package\s+\w+/.test(sample)) bump('Go', 5);
  if (/func\s+\w+\s*\(/.test(sample)) bump('Go', 2);
  if (/func\s+\([\w\s*]+\)\s+\w+\s*\(/.test(sample)) bump('Go', 5); // method with receiver
  if (sample.includes('fmt.Println') || sample.includes('fmt.Printf')) bump('Go', 5);
  if (sample.includes(':=')) bump('Go', 3);
  if (/import\s+\(/.test(sample)) bump('Go', 3);
  if (sample.includes('goroutine') || sample.includes('go func')) bump('Go', 3);

  // ─── Rust signals ───
  if (/fn\s+\w+\s*\(/.test(sample) && sample.includes('->')) bump('Rust', 4);
  if (/let\s+mut\s+/.test(sample)) bump('Rust', 6);
  if (sample.includes('println!') || sample.includes('vec!')) bump('Rust', 5);
  if (/use\s+\w+::/.test(sample)) bump('Rust', 4);
  if (sample.includes('impl ') || sample.includes('pub fn')) bump('Rust', 4);

  // ─── C/C++ signals ───
  if (/#include\s*[<"]/.test(sample)) bump('C++', 5);
  if (/int\s+main\s*\(/.test(sample)) bump('C++', 3);
  if (sample.includes('std::') || sample.includes('iostream')) bump('C++', 5);
  if (sample.includes('printf(') && !sample.includes('fmt.Printf')) bump('C', 3);
  if (sample.includes('malloc(') || sample.includes('free(')) bump('C', 3);

  // ─── C# signals ───
  if (/using\s+System/.test(sample)) bump('C#', 6);
  if (/namespace\s+\w+/.test(sample)) bump('C#', 3);
  if (sample.includes('Console.WriteLine')) bump('C#', 5);
  if (/async\s+Task/.test(sample)) bump('C#', 3);

  // ─── Ruby signals ───
  if (/^require\s+['"]/.test(sample)) bump('Ruby', 3);
  if (/def\s+\w+/.test(sample) && sample.includes('end')) bump('Ruby', 3);
  if (sample.includes('puts ') || sample.includes('attr_accessor')) bump('Ruby', 4);
  if (sample.includes(' do |')) bump('Ruby', 4);

  // ─── PHP signals ───
  if (sample.includes('<?php') || sample.includes('<?=')) bump('PHP', 10);
  if (/\$\w+\s*=/.test(sample) && !sample.includes('$(')) bump('PHP', 2);
  if (sample.includes('echo ') && sample.includes('$')) bump('PHP', 3);

  // ─── TypeScript signals ───
  if (/:\s*(string|number|boolean|any|void|never)\s*[;,)=]/.test(sample)) bump('TypeScript', 4);
  if (/interface\s+\w+\s*\{/.test(sample)) bump('TypeScript', 4);
  if (/type\s+\w+\s*=\s*/.test(sample) && !sample.includes('typedef')) bump('TypeScript', 3);
  if (/<\w+>/.test(sample) && /:\s*\w+/.test(sample)) bump('TypeScript', 2);

  // ─── JavaScript / React signals ───
  if (/const|let|var/.test(sample) && /=>\s*[{(]/.test(sample)) bump('JavaScript', 2);
  if (/require\s*\(\s*['"]/.test(sample)) bump('JavaScript', 3);
  if (/import\s+.*from\s+['"]/.test(sample)) bump('JavaScript', 2); // also TS
  if (/export\s+(default\s+)?function/.test(sample)) bump('JavaScript', 2);
  if (sample.includes('useState') || sample.includes('useEffect')) bump('React (JSX)', 6);
  if (/<\w+[\s/>]/.test(sample) && /return\s*\(?\s*</.test(sample)) bump('React (JSX)', 5);
  if (sample.includes('React.') || sample.includes("from 'react'")) bump('React (JSX)', 5);
  if (sample.includes('className=')) bump('React (JSX)', 4);

  // ─── Vue signals ───
  if (sample.includes('<template>') && sample.includes('<script')) bump('Vue.js', 8);

  // ─── Svelte signals ───
  if (sample.includes('<script') && sample.includes('{#if') || sample.includes('{#each')) bump('Svelte', 8);

  // ─── Swift signals ───
  if (/func\s+\w+\s*\(/.test(sample) && sample.includes('-> ')) bump('Swift', 2);
  if (sample.includes('import Foundation') || sample.includes('import UIKit')) bump('Swift', 6);
  if (/guard\s+let/.test(sample) || /if\s+let/.test(sample)) bump('Swift', 4);
  if (sample.includes('struct ') && sample.includes(': ')) bump('Swift', 2);

  // ─── Kotlin signals ───
  if (sample.includes('fun ') && sample.includes('val ') || sample.includes('var ')) bump('Kotlin', 3);
  if (sample.includes('println(') && sample.includes('fun ')) bump('Kotlin', 3);
  if (sample.includes('import kotlin.') || sample.includes('import android.')) bump('Kotlin', 6);

  // ─── Dart signals ───
  if (sample.includes('import \'package:') || sample.includes("import 'dart:")) bump('Dart', 6);
  if (sample.includes('Widget build(') || sample.includes('StatelessWidget')) bump('Dart', 5);

  // ─── HTML/CSS signals ───
  if (/<html|<head|<body|<!DOCTYPE/i.test(sample)) bump('HTML', 8);
  if (/^[\s\w.#:,[\]>~*+-]+\{[^}]*\}/m.test(sample) && !/</.test(sample)) bump('CSS', 5);
  if (sample.includes('@media') || sample.includes('@keyframes')) bump('CSS', 4);
  if (sample.includes('$') && sample.includes('@mixin')) bump('SCSS', 5);

  // ─── SQL signals ───
  if (/SELECT\s+.*\s+FROM\s+/i.test(sample)) bump('SQL', 6);
  if (/CREATE\s+TABLE\s+/i.test(sample)) bump('SQL', 6);

  // ─── Shell signals ───
  if (/^#!\/bin\/(bash|sh|zsh)/.test(sample)) bump('Shell', 10);
  if (/^\s*echo\s+/.test(sample) && !sample.includes('<?php')) bump('Shell', 2);

  // Pick the highest score
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0 || sorted[0][1] < 3) return null;
  return sorted[0][0];
}

function detectLanguage(path, code) {
  // First try extension
  const fromExt = detectLanguageFromExtension(path);
  
  // If we have code, also try content-based detection
  if (code) {
    const fromContent = detectLanguageFromContent(code);
    
    // If extension says generic "JavaScript" but content looks like React, prefer content
    if (fromExt === 'JavaScript' && fromContent === 'React (JSX)') return 'React (JSX)';
    if (fromExt === 'JavaScript' && fromContent === 'TypeScript') return fromExt; // file ext wins for JS vs TS
    
    // If file has a valid extension, trust it (it was named by the developer)
    if (fromExt && fromExt !== 'Unknown') return fromExt;
    
    // No clear extension — trust content detection
    if (fromContent) return fromContent;
  }
  
  return fromExt || 'Unknown';
}

/**
 * Given a detected language, return the best file extension.
 */
function getExtensionForLanguage(lang) {
  const map = {
    'JavaScript': 'js', 'React (JSX)': 'jsx', 'TypeScript': 'ts', 'React (TSX)': 'tsx',
    'Python': 'py', 'Java': 'java', 'Go': 'go', 'Ruby': 'rb', 'PHP': 'php',
    'C': 'c', 'C++': 'cpp', 'C/C++ Header': 'h', 'Rust': 'rs', 'Swift': 'swift',
    'Kotlin': 'kt', 'C#': 'cs', 'Vue.js': 'vue', 'Svelte': 'svelte',
    'HTML': 'html', 'CSS': 'css', 'SCSS': 'scss',
    'Dart': 'dart', 'Lua': 'lua', 'R': 'r', 'Scala': 'scala',
    'SQL': 'sql', 'Shell': 'sh', 'YAML': 'yml', 'JSON': 'json',
    'Markdown': 'md',
  };
  return map[lang] || 'txt';
}

function getLangEmoji(lang) {
  const emojis = {
    'JavaScript': '🟨', 'React (JSX)': '⚛️', 'TypeScript': '🔷', 'React (TSX)': '⚛️',
    'Python': '🐍', 'Java': '☕', 'Go': '🐹', 'Ruby': '💎', 'PHP': '🐘',
    'C': '⚙️', 'C++': '⚙️', 'Rust': '🦀', 'Swift': '🍎', 'Kotlin': '🟣',
    'C#': '🟩', 'Dart': '🎯', 'Scala': '🔴', 'R': '📊',
    'HTML': '🌐', 'CSS': '🎨', 'SCSS': '🎨', 'Vue.js': '💚', 'Svelte': '🔥',
    'Shell': '🐚', 'SQL': '🗃️', 'Lua': '🌙',
  };
  return emojis[lang] || '📄';
}

/* ─────────────────────────────────────────────────────────────────────────────
 *  DEEP FUNCTION EXTRACTION — reads function bodies for accurate descriptions
 * ───────────────────────────────────────────────────────────────────────────── */

/**
 * Extract the body of a function starting at `startIdx` in `code`.
 * Works for brace-delimited languages and indentation-based (Python).
 */
function extractFunctionBody(code, startIdx, language) {
  if (language === 'Python') {
    // Python: find the colon, then capture all indented lines
    const colonIdx = code.indexOf(':', startIdx);
    if (colonIdx === -1) return '';
    const afterColon = code.substring(colonIdx + 1);
    const bodyLines = [];
    const lines = afterColon.split('\n');
    let baseIndent = null;
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim() === '') { bodyLines.push(line); continue; }
      const indent = line.match(/^(\s*)/)[1].length;
      if (baseIndent === null) baseIndent = indent;
      if (indent >= baseIndent) {
        bodyLines.push(line);
      } else {
        break;
      }
    }
    return bodyLines.join('\n');
  }

  // Brace-delimited languages (JS, Java, Go, C, Rust, etc.)
  const braceStart = code.indexOf('{', startIdx);
  if (braceStart === -1) return '';
  let depth = 0;
  let i = braceStart;
  while (i < code.length) {
    if (code[i] === '{') depth++;
    else if (code[i] === '}') { depth--; if (depth === 0) break; }
    i++;
  }
  return code.substring(braceStart + 1, i);
}

/**
 * Analyse a function's body to determine what it actually does.
 * Returns an array of semantic tags like 'makes-http-request', 'reads-database', etc.
 */
function analyzeFunctionBody(body, language) {
  const tags = [];
  if (!body || body.trim().length === 0) return tags;

  const b = body.toLowerCase();

  // HTTP / API
  if (/fetch\s*\(|axios\.|\.get\s*\(|\.post\s*\(|\.put\s*\(|\.delete\s*\(|\.patch\s*\(|http\.request|requests\.(get|post|put|delete)|urllib|httpClient/i.test(body))
    tags.push('makes-http-request');

  // Database operations
  if (/\.find\(|\.findOne\(|\.findById\(|\.aggregate\(|SELECT\s+/i.test(body)) tags.push('reads-database');
  if (/\.create\(|\.insertOne\(|\.insertMany\(|INSERT\s+INTO/i.test(body)) tags.push('writes-database');
  if (/\.updateOne\(|\.updateMany\(|\.findOneAndUpdate\(|\.findByIdAndUpdate\(|UPDATE\s+.*SET/i.test(body)) tags.push('updates-database');
  if (/\.deleteOne\(|\.deleteMany\(|\.findOneAndDelete\(|\.findByIdAndDelete\(|\.remove\(|DELETE\s+FROM/i.test(body)) tags.push('deletes-database');
  if (/\.save\(\)/.test(body)) tags.push('saves-to-database');
  if (/mongoose|sequelize|prisma|typeorm|knex|sqlalchemy|activerecord/i.test(body)) tags.push('uses-orm');

  // Authentication
  if (/jwt\.|jsonwebtoken|\.sign\(|\.verify\(|token/i.test(body)) tags.push('handles-jwt');
  if (/bcrypt|hash|compareSync|hashSync|password/i.test(body)) tags.push('handles-password');
  if (/session|cookie|passport|auth/i.test(body)) tags.push('handles-auth');

  // File I/O
  if (/fs\.|readFile|writeFile|createReadStream|open\(|fopen|File\.|os\.path|pathlib/i.test(body)) tags.push('file-io');

  // Error handling
  if (/try\s*\{|try:|except|catch\s*\(/i.test(body)) tags.push('has-error-handling');

  // Response/rendering
  if (/res\.json\(|res\.send\(|res\.status\(|res\.render\(|response\.json\(|JsonResponse|HttpResponse/i.test(body)) tags.push('sends-response');
  if (/res\.redirect\(|redirect\(/i.test(body)) tags.push('redirects');

  // React specific
  if (/useState|useReducer/i.test(body)) tags.push('manages-state');
  if (/useEffect|useLayoutEffect/i.test(body)) tags.push('has-side-effects');
  if (/useContext|useSelector|useDispatch/i.test(body)) tags.push('uses-global-state');
  if (/useMemo|useCallback|React\.memo/i.test(body)) tags.push('optimizes-rendering');
  if (/setState\(|this\.state/i.test(body)) tags.push('manages-state');
  if (/<\w+[\s/>]/i.test(body) && /return/i.test(body)) tags.push('renders-jsx');

  // Validation
  if (/validate|validator|joi\.|yup\.|zod\.|\.isEmail|\.isLength|\.matches/i.test(body)) tags.push('validates-data');
  if (/if\s*\(\s*!\w+/.test(body) && /return\s+res\.status\s*\(\s*4\d\d\s*\)/.test(body)) tags.push('validates-input');

  // Logging
  if (/console\.\w+\(|logger\.\w+\(|logging\.\w+\(|print\(|puts\s/i.test(body)) tags.push('has-logging');

  // Async patterns
  if (/await\s|\.then\(|Promise|async\s/i.test(body)) tags.push('async');
  if (/goroutine|go\s+func|channel|<-/i.test(body)) tags.push('concurrent');

  // Event handling
  if (/addEventListener|\.on\(|\.emit\(|EventEmitter|socket\./i.test(body)) tags.push('event-driven');

  // String manipulation
  if (/\.replace\(|\.split\(|\.join\(|\.trim\(|\.match\(|regex|RegExp|\.sub\(|\.format\(/i.test(body)) tags.push('string-processing');

  // Array/collection operations
  if (/\.map\(|\.filter\(|\.reduce\(|\.forEach\(|\.some\(|\.every\(|list comprehension/i.test(body)) tags.push('data-transformation');

  // Math/computation
  if (/Math\.|numpy|\.sqrt|\.pow|\.ceil|\.floor|calculate|compute/i.test(body)) tags.push('computation');

  // Environment / config
  if (/process\.env|os\.environ|dotenv|config\./i.test(body)) tags.push('reads-config');

  // Middleware pattern
  if (/next\(\)/.test(body)) tags.push('middleware-chain');

  // Encryption
  if (/crypto|encrypt|decrypt|cipher|hmac|sha256|md5/i.test(body)) tags.push('cryptography');

  // Email
  if (/nodemailer|sendgrid|smtp|send.*mail|email/i.test(body)) tags.push('sends-email');

  // Caching
  if (/redis|cache|memcached|lru/i.test(body)) tags.push('uses-caching');

  return [...new Set(tags)];
}

/**
 * Generate an accurate, body-aware description for a function.
 */
function describeFunction(name, params, body, language, tags) {
  // 1. Check for existing doc comments / docstrings in the code near the function
  //    (we'll skip this since we don't have the full context easily – but the body analysis is enough)

  // 2. Build description from tags (what the function ACTUALLY does)
  const parts = [];

  // Start with the action verb from name analysis
  const words = name.replace(/([A-Z])/g, ' $1').replace(/[_-]/g, ' ').trim().toLowerCase().split(/\s+/);
  const firstWord = words[0];
  const rest = words.slice(1).join(' ');

  const verbMap = {
    get: 'Retrieves', fetch: 'Fetches', set: 'Sets', update: 'Updates',
    create: 'Creates', delete: 'Deletes', remove: 'Removes', add: 'Adds',
    handle: 'Handles', on: 'Responds to', is: 'Checks whether',
    has: 'Determines if', check: 'Checks', validate: 'Validates',
    parse: 'Parses', format: 'Formats', convert: 'Converts',
    render: 'Renders', display: 'Displays', show: 'Shows', hide: 'Hides',
    init: 'Initializes', setup: 'Sets up', configure: 'Configures', connect: 'Connects to',
    send: 'Sends', submit: 'Submits', save: 'Saves', load: 'Loads',
    find: 'Finds', search: 'Searches for', filter: 'Filters',
    sort: 'Sorts', map: 'Maps over', transform: 'Transforms',
    calculate: 'Calculates', compute: 'Computes', process: 'Processes',
    login: 'Handles user login', logout: 'Handles user logout',
    register: 'Handles user registration', authenticate: 'Authenticates',
    authorize: 'Authorizes', encrypt: 'Encrypts', decrypt: 'Decrypts',
    export: 'Exports', import: 'Imports', use: 'Uses',
    listen: 'Listens for', emit: 'Emits', subscribe: 'Subscribes to',
    publish: 'Publishes', dispatch: 'Dispatches', middleware: 'Middleware that processes',
    mount: 'Mounts', unmount: 'Unmounts/cleans up', reset: 'Resets',
    toggle: 'Toggles', enable: 'Enables', disable: 'Disables',
    open: 'Opens', close: 'Closes', start: 'Starts', stop: 'Stops',
    build: 'Builds', compile: 'Compiles', generate: 'Generates',
    test: 'Tests', assert: 'Asserts', expect: 'Expects',
    log: 'Logs', print: 'Prints', debug: 'Debugs', trace: 'Traces',
    run: 'Runs', exec: 'Executes', invoke: 'Invokes', call: 'Calls',
    read: 'Reads', write: 'Writes', put: 'Puts', push: 'Pushes', pop: 'Pops',
    append: 'Appends', prepend: 'Prepends', insert: 'Inserts',
    merge: 'Merges', split: 'Splits', join: 'Joins', concat: 'Concatenates',
    compare: 'Compares', diff: 'Diffs', match: 'Matches',
    encode: 'Encodes', decode: 'Decodes', serialize: 'Serializes', deserialize: 'Deserializes',
    wrap: 'Wraps', unwrap: 'Unwraps', extract: 'Extracts', inject: 'Injects',
    bind: 'Binds', unbind: 'Unbinds', attach: 'Attaches', detach: 'Detaches',
    notify: 'Notifies', alert: 'Alerts', warn: 'Warns',
    upload: 'Uploads', download: 'Downloads',
    refresh: 'Refreshes', reload: 'Reloads', retry: 'Retries',
    schedule: 'Schedules', delay: 'Delays', debounce: 'Debounces', throttle: 'Throttles',
    cache: 'Caches', clear: 'Clears', flush: 'Flushes', purge: 'Purges',
    navigate: 'Navigates to', route: 'Routes', redirect: 'Redirects to',
    render: 'Renders', paint: 'Paints', draw: 'Draws',
    animate: 'Animates', transition: 'Transitions',
  };

  // Start building the sentence
  let mainAction = '';
  if (verbMap[firstWord]) {
    mainAction = `${verbMap[firstWord]} ${rest || name}`.trim();
  } else {
    mainAction = `Handles ${words.join(' ')} logic`;
  }

  // Now enrich with what the body ACTUALLY does
  const details = [];

  if (tags.includes('reads-database')) details.push('queries the database');
  if (tags.includes('writes-database') || tags.includes('saves-to-database')) details.push('saves data to the database');
  if (tags.includes('updates-database')) details.push('updates database records');
  if (tags.includes('deletes-database')) details.push('removes records from the database');
  if (tags.includes('makes-http-request')) details.push('makes external HTTP requests');
  if (tags.includes('handles-jwt')) details.push('handles JWT token operations');
  if (tags.includes('handles-password')) details.push('performs password hashing/comparison');
  if (tags.includes('handles-auth')) details.push('manages authentication');
  if (tags.includes('sends-response')) details.push('sends an HTTP response');
  if (tags.includes('validates-input') || tags.includes('validates-data')) details.push('validates input data');
  if (tags.includes('renders-jsx')) details.push('renders React UI elements');
  if (tags.includes('manages-state')) details.push('manages component state');
  if (tags.includes('has-side-effects')) details.push('runs side effects on lifecycle events');
  if (tags.includes('file-io')) details.push('performs file system operations');
  if (tags.includes('middleware-chain')) details.push('passes control to the next middleware');
  if (tags.includes('redirects')) details.push('redirects the client');
  if (tags.includes('cryptography')) details.push('performs cryptographic operations');
  if (tags.includes('sends-email')) details.push('sends email notifications');
  if (tags.includes('event-driven')) details.push('handles event-driven communication');
  if (tags.includes('data-transformation')) details.push('transforms data collections');
  if (tags.includes('computation')) details.push('performs mathematical computations');
  if (tags.includes('reads-config')) details.push('reads environment/configuration values');
  if (tags.includes('concurrent')) details.push('uses concurrent execution');

  if (details.length > 0) {
    return `${mainAction}. Specifically, this function ${details.join(', ')}.`;
  }

  // Fallback: still use params to add context
  if (params && params.trim()) {
    const paramNames = params.split(',').map(p => p.trim().split(/[=:]/)[0].replace(/[^a-zA-Z0-9_]/g, '').trim()).filter(Boolean);
    if (paramNames.length > 0 && paramNames[0]) {
      return `${mainAction} using ${paramNames.join(', ')} as input${paramNames.length > 1 ? 's' : ''}.`;
    }
  }

  return `${mainAction}.`;
}

function extractFunctions(code, language) {
  const fns = [];
  const skip = new Set(['if', 'for', 'while', 'switch', 'catch', 'else', 'return', 'new', 'throw', 'elif', 'class', 'struct', 'enum', 'interface', 'type', 'const', 'let', 'var', 'import', 'from', 'with', 'try', 'except', 'finally', 'do', 'case']);
  const seen = new Set();

  const patterns = [];

  // Language-specific patterns
  if (['JavaScript', 'TypeScript', 'React (JSX)', 'React (TSX)'].includes(language)) {
    patterns.push(
      { re: /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/g, type: 'function' },
      { re: /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(([^)]*)\)\s*=>/g, type: 'arrow' },
      { re: /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?function\s*\(([^)]*)\)/g, type: 'expression' },
      { re: /(?:async\s+)?(\w+)\s*\(([^)]*)\)\s*\{/g, type: 'method' }, // object/class methods
    );
  } else if (language === 'Python') {
    patterns.push(
      { re: /def\s+(\w+)\s*\(([^)]*)\)/g, type: 'python' },
    );
  } else if (language === 'Java' || language === 'Kotlin' || language === 'C#') {
    patterns.push(
      { re: /(?:public|private|protected|internal)?\s*(?:static\s+)?(?:async\s+)?(?:suspend\s+)?(?:[\w<>\[\]]+\s+)?(\w+)\s*\(([^)]*)\)\s*(?:throws\s+\w+\s*)?\{/g, type: 'method' },
    );
  } else if (language === 'Go') {
    patterns.push(
      { re: /func\s+(?:\(\w+\s+\*?\w+\)\s+)?(\w+)\s*\(([^)]*)\)/g, type: 'go' },
    );
  } else if (language === 'Rust') {
    patterns.push(
      { re: /(?:pub\s+)?(?:async\s+)?fn\s+(\w+)\s*(?:<[^>]*>)?\s*\(([^)]*)\)/g, type: 'rust' },
    );
  } else if (language === 'Ruby') {
    patterns.push(
      { re: /def\s+(\w+[?!]?)\s*(?:\(([^)]*)\))?/g, type: 'ruby' },
    );
  } else if (language === 'Swift') {
    patterns.push(
      { re: /(?:public\s+|private\s+|internal\s+|open\s+)?(?:static\s+)?(?:class\s+)?func\s+(\w+)\s*\(([^)]*)\)/g, type: 'swift' },
    );
  } else if (language === 'PHP') {
    patterns.push(
      { re: /(?:public|private|protected)?\s*(?:static\s+)?function\s+(\w+)\s*\(([^)]*)\)/g, type: 'php' },
    );
  } else if (language === 'C' || language === 'C++' || language === 'C/C++ Header') {
    patterns.push(
      { re: /(?:[\w:*&<>]+\s+)+(\w+)\s*\(([^)]*)\)\s*(?:const\s*)?\{/g, type: 'c' },
    );
  } else if (language === 'Dart') {
    patterns.push(
      { re: /(?:static\s+)?(?:Future<\w+>\s+|void\s+|[\w<>]+\s+)?(\w+)\s*\(([^)]*)\)\s*(?:async\s*)?\{/g, type: 'dart' },
    );
  } else {
    // Generic fallback — try common patterns
    patterns.push(
      { re: /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/g, type: 'function' },
      { re: /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(([^)]*)\)\s*=>/g, type: 'arrow' },
      { re: /def\s+(\w+)\s*\(([^)]*)\)/g, type: 'python' },
      { re: /func\s+(\w+)\s*\(([^)]*)\)/g, type: 'go' },
      { re: /(?:pub\s+)?fn\s+(\w+)\s*\(([^)]*)\)/g, type: 'rust' },
      { re: /(?:public|private|protected)?\s*(?:static\s+)?(?:[\w<>\[\]]+\s+)(\w+)\s*\(([^)]*)\)\s*\{/g, type: 'method' },
    );
  }

  for (const { re } of patterns) {
    let match;
    while ((match = re.exec(code)) !== null) {
      const name = match[1];
      if (seen.has(name) || skip.has(name)) continue;
      if (/^[A-Z]/.test(name) && language !== 'Python' && language !== 'Go') {
        // In most languages, PascalCase names are classes/types, not functions
        // (except Python classes and Go exported functions)
        // We still include them but only if they look like constructors or React components
        if (!['React (JSX)', 'React (TSX)'].includes(language)) continue;
      }
      seen.add(name);

      const lineIdx = code.substring(0, match.index).split('\n').length;
      const body = extractFunctionBody(code, match.index, language);
      const tags = analyzeFunctionBody(body, language);
      const description = describeFunction(name, match[2], body, language, tags);

      const params = match[2] && match[2].trim()
        ? match[2].split(',').map(p => {
            let clean = p.trim();
            // Remove type annotations for display
            clean = clean.replace(/:\s*[\w<>\[\]|&?]+(\s*=\s*[^,)]+)?/, '').trim();
            clean = clean.replace(/=.*/, '').trim();
            clean = clean.replace(/[^a-zA-Z0-9_*&.]/g, '').trim();
            return clean;
          }).filter(Boolean)
        : [];

      const hasReturn = checkReturn(body, language);

      fns.push({ name, description, params, hasReturn, lineNumber: lineIdx, tags });
    }
  }
  return fns;
}

function checkReturn(body, language) {
  if (!body) return false;
  if (language === 'Python') {
    return /return\s+[^\n]/.test(body);
  }
  return /return\s+[^;}\s]/.test(body);
}

/* ─────────────────────────────────────────────────────────────────────────────
 *  IMPORT ANALYSIS — language-aware
 * ───────────────────────────────────────────────────────────────────────────── */

function analyzeImports(code, language) {
  const imports = [];

  if (['JavaScript', 'TypeScript', 'React (JSX)', 'React (TSX)'].includes(language)) {
    const patterns = [
      /import\s+(?:{[^}]+}|\w+)?(?:\s*,\s*{[^}]+})?\s+from\s+['"]([^'"]+)['"]/g,
      /const\s+\w+\s*=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
      /import\s+['"]([^'"]+)['"]/g,
    ];
    for (const pat of patterns) {
      let m;
      while ((m = pat.exec(code)) !== null) imports.push(m[1]);
    }
  } else if (language === 'Python') {
    const patterns = [
      /^import\s+([\w.]+)/gm,
      /^from\s+([\w.]+)\s+import/gm,
    ];
    for (const pat of patterns) {
      let m;
      while ((m = pat.exec(code)) !== null) imports.push(m[1]);
    }
  } else if (language === 'Java' || language === 'Kotlin') {
    const pat = /^import\s+([\w.]+)/gm;
    let m;
    while ((m = pat.exec(code)) !== null) imports.push(m[1]);
  } else if (language === 'Go') {
    // Single: import "fmt"
    const single = /import\s+"([\w./]+)"/g;
    let m;
    while ((m = single.exec(code)) !== null) imports.push(m[1]);
    // Multi: import ( ... )
    const multi = /import\s+\(([\s\S]*?)\)/g;
    while ((m = multi.exec(code)) !== null) {
      const block = m[1];
      const lines = block.split('\n');
      for (const line of lines) {
        const pkg = line.match(/["]([\w./]+)['"]/);
        if (pkg) imports.push(pkg[1]);
      }
    }
  } else if (language === 'Rust') {
    const pat = /use\s+([\w:]+)/g;
    let m;
    while ((m = pat.exec(code)) !== null) imports.push(m[1]);
  } else if (language === 'C#') {
    const pat = /using\s+([\w.]+)\s*;/g;
    let m;
    while ((m = pat.exec(code)) !== null) imports.push(m[1]);
  } else if (language === 'PHP') {
    const pat = /use\s+([\w\\]+)/g;
    let m;
    while ((m = pat.exec(code)) !== null) imports.push(m[1]);
  } else if (language === 'Ruby') {
    const pat = /require\s+['"]([^'"]+)['"]/g;
    let m;
    while ((m = pat.exec(code)) !== null) imports.push(m[1]);
  } else if (language === 'Dart') {
    const pat = /import\s+['"]([^'"]+)['"]/g;
    let m;
    while ((m = pat.exec(code)) !== null) imports.push(m[1]);
  } else if (language === 'Swift') {
    const pat = /import\s+(\w+)/g;
    let m;
    while ((m = pat.exec(code)) !== null) imports.push(m[1]);
  } else if (language === 'C' || language === 'C++' || language === 'C/C++ Header') {
    const pat = /#include\s*[<"]([^>"]+)[>"]/g;
    let m;
    while ((m = pat.exec(code)) !== null) imports.push(m[1]);
  } else {
    // Generic fallback
    const patterns = [
      /import\s+(?:{[^}]+}|\w+)?(?:\s*,\s*{[^}]+})?\s+from\s+['"]([^'"]+)['"]/g,
      /const\s+\w+\s*=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
      /^import\s+([\w.]+)/gm,
      /^from\s+([\w.]+)\s+import/gm,
    ];
    for (const pat of patterns) {
      let m;
      while ((m = pat.exec(code)) !== null) imports.push(m[1]);
    }
  }

  return [...new Set(imports)];
}

/* ─────────────────────────────────────────────────────────────────────────────
 *  MODULE CLASSIFICATION — enriched with code content analysis
 * ───────────────────────────────────────────────────────────────────────────── */

function classifyModule(path, code, imports, language) {
  const lowerPath = path.toLowerCase();

  // Path-based classification
  if (lowerPath.includes('route') || lowerPath.includes('router')) return 'API Route Handler';
  if (lowerPath.includes('model') || lowerPath.includes('schema')) return 'Data Model';
  if (lowerPath.includes('controller')) return 'Controller';
  if (lowerPath.includes('middleware')) return 'Middleware';
  if (lowerPath.includes('util') || lowerPath.includes('helper')) return 'Utility Module';
  if (lowerPath.includes('config')) return 'Configuration';
  if (lowerPath.includes('test') || lowerPath.includes('spec') || lowerPath.includes('__test__')) return 'Test Suite';
  if (lowerPath.includes('service')) return 'Service Layer';
  if (lowerPath.includes('hook') && ['React (JSX)', 'React (TSX)'].includes(language)) return 'Custom Hook';
  if (lowerPath.includes('context') || lowerPath.includes('store') || lowerPath.includes('redux') || lowerPath.includes('zustand')) return 'State Management';

  // Extension-based
  if (lowerPath.endsWith('.css') || lowerPath.endsWith('.scss') || lowerPath.endsWith('.sass') || lowerPath.endsWith('.less')) return 'Stylesheet';
  if (lowerPath.endsWith('.html') || lowerPath.endsWith('.htm')) return 'HTML Template';

  // Content-based classification
  if (['React (JSX)', 'React (TSX)'].includes(language)) return 'UI Component';
  if (language === 'Vue.js') return 'UI Component';
  if (language === 'Svelte') return 'UI Component';

  // Check content patterns
  if (/(?:app|router)\.(get|post|put|patch|delete)\s*\(/.test(code)) return 'API Route Handler';
  if (/new\s+(?:mongoose\.)?Schema\s*\(/.test(code)) return 'Data Model';
  if (/next\(\)/.test(code) && /(?:req|request)/.test(code) && /(?:res|response)/.test(code)) return 'Middleware';
  if (/class\s+\w+.*Component/.test(code) || code.includes('render()')) return 'UI Component';
  if (/module\.exports|export\s+(default|{)/.test(code) && /\bclass\b/.test(code)) return 'Class Module';
  if (language === 'SQL') return 'Database Script';
  if (language === 'Shell') return 'Shell Script';
  if (['YAML', 'JSON', 'TOML'].includes(language)) return 'Configuration';

  // Check for entry point patterns
  if (/if\s*\(\s*__name__\s*==\s*['"]__main__['"]\s*\)/.test(code)) return 'Entry Point';
  if (/int\s+main\s*\(/.test(code)) return 'Entry Point';
  if (/func\s+main\s*\(/.test(code) && code.includes('package main')) return 'Entry Point';

  return 'Module';
}

function getModuleIcon(moduleType) {
  const icons = {
    'API Route Handler': '🔌', 'Data Model': '🗄️', 'Controller': '🎮',
    'Middleware': '🛡️', 'Utility Module': '🔧', 'Configuration': '⚙️',
    'Test Suite': '🧪', 'UI Component': '🧩', 'Service Layer': '📡',
    'Custom Hook': '🪝', 'State Management': '📦', 'Stylesheet': '🎨',
    'HTML Template': '🌐', 'Module': '📄', 'Class Module': '🏛️',
    'Entry Point': '🚀', 'Database Script': '🗃️', 'Shell Script': '🐚',
  };
  return icons[moduleType] || '📄';
}

/* ─────────────────────────────────────────────────────────────────────────────
 *  CLASS / STRUCT / INTERFACE EXTRACTION
 * ───────────────────────────────────────────────────────────────────────────── */

function extractClasses(code, language) {
  const classes = [];
  let patterns = [];

  if (['JavaScript', 'TypeScript', 'React (JSX)', 'React (TSX)'].includes(language)) {
    patterns = [/(?:export\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?\s*\{/g];
  } else if (language === 'Python') {
    patterns = [/class\s+(\w+)(?:\(([^)]*)\))?\s*:/g];
  } else if (language === 'Java' || language === 'Kotlin' || language === 'C#') {
    patterns = [/(?:public|private|protected)?\s*(?:abstract\s+)?(?:static\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([\w,\s]+))?\s*\{/g];
  } else if (language === 'Rust') {
    patterns = [/(?:pub\s+)?struct\s+(\w+)/g, /(?:pub\s+)?enum\s+(\w+)/g];
  } else if (language === 'Go') {
    patterns = [/type\s+(\w+)\s+struct\s*\{/g, /type\s+(\w+)\s+interface\s*\{/g];
  } else if (language === 'Swift') {
    patterns = [/(?:public\s+|private\s+|internal\s+|open\s+)?class\s+(\w+)/g, /struct\s+(\w+)/g];
  }

  for (const re of patterns) {
    let m;
    while ((m = re.exec(code)) !== null) {
      classes.push({
        name: m[1],
        extends: m[2] || null,
        line: code.substring(0, m.index).split('\n').length
      });
    }
  }
  return classes;
}

/* ─────────────────────────────────────────────────────────────────────────────
 *  EXISTING DOCSTRING / COMMENT EXTRACTION
 * ───────────────────────────────────────────────────────────────────────────── */

function extractDocstrings(code, language) {
  const docs = [];

  if (language === 'Python') {
    // Triple-quote docstrings
    const re = /"""([\s\S]*?)"""|'''([\s\S]*?)'''/g;
    let m;
    while ((m = re.exec(code)) !== null) {
      const text = (m[1] || m[2]).trim();
      if (text.length > 5) docs.push(text);
    }
  } else {
    // JSDoc / Javadoc style
    const re = /\/\*\*([\s\S]*?)\*\//g;
    let m;
    while ((m = re.exec(code)) !== null) {
      const text = m[1].replace(/^\s*\*\s?/gm, '').trim();
      if (text.length > 5) docs.push(text);
    }
  }

  return docs;
}

/* ─────────────────────────────────────────────────────────────────────────────
 *  EXTRACT API ROUTES & DATABASE SCHEMAS (unchanged logic, refined)
 * ───────────────────────────────────────────────────────────────────────────── */

function extractApiRoutes(code) {
  const routes = [];
  const regex = /(?:app|router)\.(get|post|put|patch|delete)\s*\(\s*['"]([^'"]+)['"]/g;
  let match;
  while ((match = regex.exec(code)) !== null) {
    routes.push({ method: match[1].toUpperCase(), path: match[2] });
  }

  // Also detect Python Flask/FastAPI routes
  const pyRouteRe = /@(?:app|router|bp)\.(route|get|post|put|patch|delete)\s*\(\s*['"]([^'"]+)['"]/g;
  while ((match = pyRouteRe.exec(code)) !== null) {
    const method = match[1] === 'route' ? 'GET' : match[1].toUpperCase();
    routes.push({ method, path: match[2] });
  }

  // Django url patterns
  const djangoRe = /path\s*\(\s*['"]([^'"]+)['"]/g;
  while ((match = djangoRe.exec(code)) !== null) {
    routes.push({ method: 'ALL', path: match[1] });
  }

  // Go http handlers
  const goRe = /http\.HandleFunc\s*\(\s*['"]([^'"]+)['"]/g;
  while ((match = goRe.exec(code)) !== null) {
    routes.push({ method: 'ALL', path: match[1] });
  }

  return routes;
}

function extractSchemas(code, language) {
  const schemas = [];

  // Mongoose schemas
  const mongooseRe = /new\s+(?:mongoose\.)?Schema\s*\(\s*\{([\s\S]*?)\}\s*(?:,|\))/g;
  let match;
  while ((match = mongooseRe.exec(code)) !== null) {
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
    const codeBefore = code.substring(Math.max(0, match.index - 120), match.index);
    const nameMatch = codeBefore.match(/(?:const|let|var)\s+(\w+)(?:Schema)?\s*=/);
    const name = nameMatch ? nameMatch[1].replace(/Schema$/, '') : 'Unknown';
    if (fields.length > 0) schemas.push({ name, fields });
  }

  // Sequelize models
  const seqRe = /sequelize\.define\s*\(\s*['"](\w+)['"]\s*,\s*\{([\s\S]*?)\}/g;
  while ((match = seqRe.exec(code)) !== null) {
    const name = match[1];
    const rawFields = match[2].split(',').filter(l => l.includes(':'));
    const fields = rawFields.map(f => {
      const clean = f.trim().replace(/\n/g, ' ');
      const key = clean.split(':')[0].trim();
      let type = 'Mixed';
      if (/DataTypes?\.(STRING|TEXT)/i.test(clean)) type = 'String';
      if (/DataTypes?\.INTEGER/i.test(clean)) type = 'Integer';
      if (/DataTypes?\.BOOLEAN/i.test(clean)) type = 'Boolean';
      if (/DataTypes?\.DATE/i.test(clean)) type = 'Date';
      return { key, type, required: clean.includes('allowNull: false'), defaultVal: '' };
    }).filter(f => f.key && !f.key.startsWith('{'));
    if (fields.length > 0) schemas.push({ name, fields });
  }

  // Django models (Python)
  if (language === 'Python') {
    const classRe = /class\s+(\w+)\s*\((?:models\.)?Model\)\s*:/g;
    while ((match = classRe.exec(code)) !== null) {
      const name = match[1];
      const afterClass = code.substring(match.index + match[0].length);
      const fieldLines = afterClass.split('\n');
      const fields = [];
      for (const line of fieldLines) {
        const trimmed = line.trim();
        if (trimmed === '' || trimmed.startsWith('class ') || trimmed.startsWith('def ')) break;
        const fm = trimmed.match(/(\w+)\s*=\s*models\.(\w+)\s*\(/);
        if (fm) {
          fields.push({
            key: fm[1],
            type: fm[2].replace('Field', ''),
            required: !trimmed.includes('blank=True') && !trimmed.includes('null=True'),
            defaultVal: ''
          });
        }
      }
      if (fields.length > 0) schemas.push({ name, fields });
    }
  }

  // Prisma-like (just detect model blocks)
  const prismaRe = /model\s+(\w+)\s*\{([\s\S]*?)\}/g;
  while ((match = prismaRe.exec(code)) !== null) {
    const name = match[1];
    const lines = match[2].trim().split('\n');
    const fields = lines.map(l => {
      const parts = l.trim().split(/\s+/);
      if (parts.length >= 2) {
        return { key: parts[0], type: parts[1], required: !parts[1].endsWith('?'), defaultVal: '' };
      }
      return null;
    }).filter(Boolean).filter(f => f.key && !f.key.startsWith('@@'));
    if (fields.length > 0) schemas.push({ name, fields });
  }

  return schemas;
}

/* ─────────────────────────────────────────────────────────────────────────────
 *  REACT-SPECIFIC ANALYSIS
 * ───────────────────────────────────────────────────────────────────────────── */

function analyzeReactComponent(code) {
  const analysis = { hooks: [], props: [], stateVars: [], effects: [], isComponent: false };

  // Detect if it's a React component
  if (/<\w+[\s/>]/.test(code) && /return\s*\(?\s*</.test(code)) {
    analysis.isComponent = true;
  }

  // Extract useState calls
  const stateRe = /const\s+\[(\w+),\s*(\w+)\]\s*=\s*useState\s*(?:<[^>]*>)?\s*\(([^)]*)\)/g;
  let m;
  while ((m = stateRe.exec(code)) !== null) {
    analysis.stateVars.push({ name: m[1], setter: m[2], initial: m[3].trim() || 'undefined' });
    analysis.hooks.push('useState');
  }

  // Extract useEffect
  const effectRe = /useEffect\s*\(\s*(?:async\s*)?\(\)\s*=>\s*\{/g;
  while ((m = effectRe.exec(code)) !== null) {
    analysis.effects.push({ line: code.substring(0, m.index).split('\n').length });
    analysis.hooks.push('useEffect');
  }

  // Detect other hooks
  const hookRe = /\b(use\w+)\s*\(/g;
  while ((m = hookRe.exec(code)) !== null) {
    if (!analysis.hooks.includes(m[1])) analysis.hooks.push(m[1]);
  }

  // Props detection
  const propsRe = /(?:function|const)\s+\w+\s*\(\s*\{\s*([^}]+)\s*\}/;
  const pm = code.match(propsRe);
  if (pm) {
    analysis.props = pm[1].split(',').map(p => p.trim().split(/[=:]/)[0].trim()).filter(Boolean);
  }

  return analysis;
}

/* ─────────────────────────────────────────────────────────────────────────────
 *  GENERATE FILE SUMMARY — the heart of per-file analysis
 * ───────────────────────────────────────────────────────────────────────────── */

function generateFileSummary(path, code) {
  const language = detectLanguage(path, code);
  const lines = code.split('\n').length;
  const fns = extractFunctions(code, language);
  const imports = analyzeImports(code, language);
  const moduleType = classifyModule(path, code, imports, language);
  const apiRoutes = extractApiRoutes(code);
  const schemas = extractSchemas(code, language);
  const classes = extractClasses(code, language);
  const docstrings = extractDocstrings(code, language);
  const reactInfo = ['React (JSX)', 'React (TSX)'].includes(language) ? analyzeReactComponent(code) : null;

  const exportsMatch = code.match(/export\s+(default\s+)?(function|class|const|let|var)\s+(\w+)/g) || [];
  const hasDefault = code.includes('export default');

  // Generate a context-aware purpose description
  let purpose = generatePurpose(moduleType, language, fns, apiRoutes, schemas, classes, reactInfo, path, code, docstrings);

  return {
    path, language, moduleType, purpose, lineCount: lines,
    functions: fns, imports, exportCount: exportsMatch.length,
    hasDefaultExport: hasDefault, apiRoutes, schemas, classes,
    docstrings, reactInfo
  };
}

/**
 * Generate an accurate, code-aware purpose description for a file.
 */
function generatePurpose(moduleType, language, fns, apiRoutes, schemas, classes, reactInfo, path, code, docstrings) {
  // If the file has a top-level docstring/comment, use part of it
  if (docstrings.length > 0) {
    const firstDoc = docstrings[0];
    if (firstDoc.length < 200) return firstDoc;
    return firstDoc.substring(0, 197) + '...';
  }

  const filename = path.split('/').pop().replace(/\.\w+$/, '');
  const langLabel = getLangEmoji(language) + ' ' + language;

  // Collect all semantic tags from all functions in the file
  const allTags = new Set();
  fns.forEach(fn => (fn.tags || []).forEach(t => allTags.add(t)));

  // React component
  if (reactInfo?.isComponent) {
    const hookList = reactInfo.hooks.length > 0 ? ` Uses ${reactInfo.hooks.join(', ')} hooks.` : '';
    const stateList = reactInfo.stateVars.length > 0
      ? ` Manages state: ${reactInfo.stateVars.map(s => s.name).join(', ')}.`
      : '';
    const propsList = reactInfo.props.length > 0
      ? ` Accepts props: ${reactInfo.props.join(', ')}.`
      : '';
    return `${langLabel} React component that renders the ${filename} UI.${hookList}${stateList}${propsList}`;
  }

  // API route handler
  if (moduleType === 'API Route Handler') {
    const methods = [...new Set(apiRoutes.map(r => r.method))].join(', ');
    const paths = apiRoutes.map(r => `\`${r.method} ${r.path}\``).join(', ');
    let desc = `${langLabel} route handler defining ${apiRoutes.length} endpoint${apiRoutes.length !== 1 ? 's' : ''}: ${paths}.`;
    if (allTags.has('handles-auth') || allTags.has('handles-jwt')) desc += ' Includes authentication logic.';
    if (allTags.has('reads-database') || allTags.has('writes-database')) desc += ' Interacts with the database.';
    return desc;
  }

  // Data model
  if (moduleType === 'Data Model') {
    const schemaNames = schemas.map(s => s.name).join(', ');
    const fieldCount = schemas.reduce((sum, s) => sum + s.fields.length, 0);
    return `${langLabel} data model defining ${schemas.length} schema${schemas.length !== 1 ? 's' : ''} (${schemaNames}) with ${fieldCount} total fields. Structures how data is stored and validated in the database.`;
  }

  // Middleware
  if (moduleType === 'Middleware') {
    let desc = `${langLabel} middleware that intercepts requests`;
    if (allTags.has('handles-jwt') || allTags.has('handles-auth')) desc += ' for authentication verification';
    if (allTags.has('validates-input') || allTags.has('validates-data')) desc += ' and input validation';
    desc += ' before passing to route handlers.';
    return desc;
  }

  // Utility module
  if (moduleType === 'Utility Module' || moduleType === 'Service Layer') {
    const fnNames = fns.slice(0, 5).map(f => f.name).join(', ');
    let desc = `${langLabel} utility providing ${fns.length} helper function${fns.length !== 1 ? 's' : ''}`;
    if (fnNames) desc += `: ${fnNames}`;
    desc += '.';
    if (allTags.has('makes-http-request')) desc += ' Makes external API calls.';
    if (allTags.has('file-io')) desc += ' Performs file I/O operations.';
    if (allTags.has('cryptography')) desc += ' Includes cryptographic operations.';
    return desc;
  }

  // Configuration
  if (moduleType === 'Configuration') {
    if (allTags.has('reads-config')) return `${langLabel} configuration module that reads environment variables and exports app settings.`;
    return `${langLabel} configuration file that defines application settings and constants.`;
  }

  // Test suite
  if (moduleType === 'Test Suite') {
    return `${langLabel} test suite containing ${fns.length} test function${fns.length !== 1 ? 's' : ''} for validating application behavior.`;
  }

  // Stylesheet
  if (moduleType === 'Stylesheet') {
    // Count selectors roughly
    const selectorCount = (code.match(/\{/g) || []).length;
    const hasMedia = code.includes('@media');
    const hasAnimations = code.includes('@keyframes') || code.includes('animation');
    const hasVars = code.includes('--') || code.includes('$');
    let desc = `${langLabel} stylesheet with ~${selectorCount} style rules`;
    const features = [];
    if (hasMedia) features.push('responsive media queries');
    if (hasAnimations) features.push('animations');
    if (hasVars) features.push('CSS variables/tokens');
    if (features.length > 0) desc += ` including ${features.join(', ')}`;
    return desc + '.';
  }

  // Classes
  if (classes.length > 0) {
    const classNames = classes.map(c => c.name).join(', ');
    let desc = `${langLabel} module defining class${classes.length > 1 ? 'es' : ''}: ${classNames}.`;
    if (classes[0].extends) desc += ` Extends ${classes[0].extends}.`;
    return desc;
  }

  // Entry point
  if (moduleType === 'Entry Point') {
    return `${langLabel} application entry point — the main file that bootstraps and starts the program.`;
  }

  // Generic with function info
  if (fns.length > 0) {
    const fnNames = fns.slice(0, 4).map(f => f.name).join(', ');
    let desc = `${langLabel} module containing ${fns.length} function${fns.length !== 1 ? 's' : ''} (${fnNames}${fns.length > 4 ? ', ...' : ''}).`;
    // Add context from tags
    if (allTags.has('makes-http-request')) desc += ' Handles external API communication.';
    if (allTags.has('reads-database')) desc += ' Queries the database.';
    if (allTags.has('handles-auth')) desc += ' Includes authentication logic.';
    return desc;
  }

  // Absolute fallback
  return `${langLabel} ${moduleType.toLowerCase()} implementing ${filename} functionality.`;
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

  // Show detected languages prominently
  if (languages.length > 0) {
    md += `**Built with:** ${languages.map(l => `${getLangEmoji(l)} ${l}`).join(' · ')}\n\n`;
  }

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
    md += `This is a full-stack ${languages.join('/')} application that provides a web server with ${allRoutes.length} API endpoints and stores data using ${allSchemas.length} database model${allSchemas.length > 1 ? 's' : ''}. `;
  } else if (allRoutes.length > 0) {
    md += `This ${languages.join('/')} application runs a web server exposing ${allRoutes.length} API endpoints for clients to interact with. `;
  } else if (allSchemas.length > 0) {
    md += `This ${languages.join('/')} application manages data through ${allSchemas.length} database model${allSchemas.length > 1 ? 's' : ''}. `;
  } else {
    md += `This codebase is written in ${languages.join(' and ')} and provides the following functionality: `;
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
  if (filesByType['Test Suite']) capabilities.push(`🧪 **Testing** — ${filesByType['Test Suite'].length} test file${filesByType['Test Suite'].length > 1 ? 's' : ''} that validate correctness of the application`);

  if (capabilities.length > 0) {
    capabilities.forEach(cap => { md += `- ${cap}\n`; });
  } else {
    md += `- 📄 General-purpose ${languages.join('/')} module${fileDocs.length > 1 ? 's' : ''} implementing application logic\n`;
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
    allRoutes.forEach(r => {
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

      // Show classes if any
      if (f.classes && f.classes.length > 0) {
        md += `**🏛️ Classes defined:**\n`;
        f.classes.forEach(cls => {
          md += `- \`${cls.name}\`${cls.extends ? ` extends \`${cls.extends}\`` : ''} (line ${cls.line})\n`;
        });
        md += `\n`;
      }

      // React component info
      if (f.reactInfo?.isComponent) {
        if (f.reactInfo.stateVars.length > 0) {
          md += `**📊 Component State:**\n\n`;
          md += `| State Variable | Setter | Initial Value |\n`;
          md += `|---------------|--------|---------------|\n`;
          f.reactInfo.stateVars.forEach(s => {
            md += `| \`${s.name}\` | \`${s.setter}\` | \`${s.initial || 'undefined'}\` |\n`;
          });
          md += `\n`;
        }
        if (f.reactInfo.hooks.length > 0) {
          md += `**🪝 React Hooks used:** ${f.reactInfo.hooks.map(h => `\`${h}\``).join(', ')}\n\n`;
        }
        if (f.reactInfo.props.length > 0) {
          md += `**📥 Props accepted:** ${f.reactInfo.props.map(p => `\`${p}\``).join(', ')}\n\n`;
        }
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

  // Detect the primary technology for setup instructions
  const hasNode = externalDeps.some(d => ['express', 'react', 'next', 'vue', 'koa', 'fastify', 'mongoose', 'cors'].includes(d))
    || languages.some(l => ['JavaScript', 'TypeScript', 'React (JSX)', 'React (TSX)'].includes(l));
  const hasPython = languages.includes('Python');
  const hasGo = languages.includes('Go');
  const hasRust = languages.includes('Rust');
  const hasJava = languages.includes('Java');
  const hasDart = languages.includes('Dart');

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
    md += `# 2. Create a virtual environment\n`;
    md += `python -m venv venv\n`;
    md += `source venv/bin/activate  # On Windows: venv\\Scripts\\activate\n`;
    md += `\n`;
    md += `# 3. Install dependencies\n`;
    md += `pip install -r requirements.txt\n`;
    md += `\n`;
    md += `# 4. Run the application\n`;
    md += `python main.py\n`;
    md += `\`\`\`\n\n`;
  } else if (hasGo) {
    md += `### Prerequisites\n\n`;
    md += `- **Go** (v1.19 or higher) — [Download here](https://go.dev/dl)\n\n`;
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
    md += `go mod tidy\n`;
    md += `\n`;
    md += `# 3. Run the application\n`;
    md += `go run .\n`;
    md += `\`\`\`\n\n`;
  } else if (hasRust) {
    md += `### Prerequisites\n\n`;
    md += `- **Rust** — [Install via rustup](https://rustup.rs/)\n\n`;
    md += `### Installation\n\n`;
    md += `\`\`\`bash\n`;
    md += `# 1. Clone the repository\n`;
    if (repoUrl) {
      md += `git clone ${repoUrl}\n`;
    } else {
      md += `git clone <your-repository-url>\n`;
    }
    md += `\n`;
    md += `# 2. Build and run\n`;
    md += `cargo build\n`;
    md += `cargo run\n`;
    md += `\`\`\`\n\n`;
  } else if (hasJava) {
    md += `### Prerequisites\n\n`;
    md += `- **Java JDK** (v11 or higher) — [Download here](https://adoptium.net/)\n`;
    md += `- **Maven** or **Gradle**\n\n`;
    md += `### Installation\n\n`;
    md += `\`\`\`bash\n`;
    md += `# 1. Clone the repository\n`;
    if (repoUrl) {
      md += `git clone ${repoUrl}\n`;
    } else {
      md += `git clone <your-repository-url>\n`;
    }
    md += `\n`;
    md += `# 2. Build and run\n`;
    md += `mvn clean install\n`;
    md += `mvn spring-boot:run\n`;
    md += `\`\`\`\n\n`;
  } else if (hasDart) {
    md += `### Prerequisites\n\n`;
    md += `- **Flutter** / **Dart** — [Install here](https://flutter.dev/docs/get-started/install)\n\n`;
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
    md += `flutter pub get\n`;
    md += `\n`;
    md += `# 3. Run the app\n`;
    md += `flutter run\n`;
    md += `\`\`\`\n\n`;
  } else {
    md += `### Setup\n\n`;
    md += `1. Clone or download the source code\n`;
    md += `2. Install any required dependencies for ${languages.join(', ') || 'your language'}\n`;
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
 *  HELPER: Describe common packages (expanded)
 * ───────────────────────────────────────────────────────────────────────────── */

function describePackage(name) {
  const known = {
    // Node.js / JavaScript
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
    'prisma': 'Type-safe database ORM with auto-generated queries',
    'sequelize': 'Promise-based ORM for SQL databases',
    'knex': 'SQL query builder for Node.js',
    'pg': 'PostgreSQL client for Node.js',
    'mysql2': 'MySQL client for Node.js',
    'redis': 'Redis client for caching and pub/sub',
    'ioredis': 'Redis client with cluster support',
    'winston': 'Logging library with transport support',
    'pino': 'Fast JSON logger for Node.js',
    'nodemailer': 'Send emails from Node.js applications',
    'sharp': 'High-performance image processing library',
    'cheerio': 'Server-side HTML parsing (like jQuery)',
    'puppeteer': 'Headless Chrome browser automation',
    'jest': 'JavaScript testing framework',
    'mocha': 'JavaScript test framework',
    'chai': 'BDD/TDD assertion library for Node.js',
    'supertest': 'HTTP assertions for testing Express apps',
    'lodash': 'Utility library for data manipulation',
    'moment': 'Date/time parsing and formatting library',
    'dayjs': 'Lightweight date/time library',
    'uuid': 'Generate RFC-compliant unique identifiers',
    'zod': 'TypeScript-first schema validation',
    'yup': 'Schema validation library',
    'formik': 'Form management library for React',
    'zustand': 'Lightweight state management for React',
    '@tanstack/react-query': 'Data fetching and caching for React',
    'swr': 'React hooks for remote data fetching',
    'framer-motion': 'Animation library for React',
    'three': '3D graphics library using WebGL',
    'd3': 'Data visualization library',
    'chart.js': 'Charting library for web',
    'stripe': 'Payment processing API client',
    'aws-sdk': 'Amazon Web Services SDK',
    'firebase': 'Google Firebase SDK for web',
    'firebase-admin': 'Firebase Admin SDK for server-side',
    'graphql': 'GraphQL query language implementation',
    'apollo-server': 'GraphQL server framework',
    'typeorm': 'TypeScript ORM for SQL and NoSQL databases',
    'class-validator': 'Decorator-based validation for TypeScript classes',
    'class-transformer': 'Transform plain objects to class instances',
    'compression': 'Response compression middleware',
    'cookie-parser': 'Parse HTTP request cookies',
    'express-rate-limit': 'Rate limiting middleware for Express',
    'express-validator': 'Input validation middleware for Express',
    'body-parser': 'Parse incoming request bodies',
    'path': 'Node.js path utilities (built-in)',
    'fs': 'Node.js file system module (built-in)',
    'http': 'Node.js HTTP module (built-in)',
    'https': 'Node.js HTTPS module (built-in)',
    'crypto': 'Node.js cryptography module (built-in)',
    'os': 'Node.js operating system module (built-in)',
    'url': 'Node.js URL parsing module (built-in)',
    'stream': 'Node.js stream module (built-in)',
    'events': 'Node.js event emitter module (built-in)',
    'child_process': 'Node.js child process module (built-in)',
    'cluster': 'Node.js clustering module (built-in)',
    'net': 'Node.js networking module (built-in)',
    'buffer': 'Node.js buffer module (built-in)',
    'util': 'Node.js utility module (built-in)',

    // Python
    'flask': 'Lightweight Python web framework',
    'django': 'Full-featured Python web framework',
    'fastapi': 'Modern high-performance Python API framework',
    'requests': 'HTTP library for Python',
    'numpy': 'Numerical computing library for Python',
    'pandas': 'Data analysis and manipulation library',
    'scikit-learn': 'Machine learning library for Python',
    'tensorflow': 'Deep learning framework by Google',
    'torch': 'PyTorch deep learning framework',
    'pytorch': 'Deep learning framework by Meta',
    'sqlalchemy': 'Python SQL toolkit and ORM',
    'celery': 'Distributed task queue for Python',
    'pytest': 'Python testing framework',
    'opencv-python': 'Computer vision library',
    'pillow': 'Python imaging library',
    'beautifulsoup4': 'HTML/XML parser for web scraping',
    'scrapy': 'Web scraping framework',
    'selenium': 'Browser automation tool',
    'matplotlib': 'Data visualization library for Python',
    'seaborn': 'Statistical data visualization',
    'scipy': 'Scientific computing library',
    'pydantic': 'Data validation using Python type hints',
    'uvicorn': 'ASGI server for Python web apps',
    'gunicorn': 'WSGI HTTP server for Python',
    'asyncio': 'Asynchronous I/O framework (built-in)',
    'aiohttp': 'Async HTTP client/server for Python',
    'boto3': 'AWS SDK for Python',

    // Go
    'fmt': 'Go formatted I/O (built-in)',
    'net/http': 'Go HTTP client/server (built-in)',
    'encoding/json': 'Go JSON encoding/decoding (built-in)',
    'github.com/gin-gonic/gin': 'Go web framework',
    'github.com/gorilla/mux': 'Go HTTP router',
    'gorm.io/gorm': 'Go ORM for databases',

    // Rust
    'tokio': 'Async runtime for Rust',
    'serde': 'Rust serialization/deserialization framework',
    'actix-web': 'Rust web framework',
    'reqwest': 'Rust HTTP client',
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
  // For pasted code, auto-detect language and fix the file path/extension
  const processedFiles = files.map(f => {
    const detectedLang = detectLanguage(f.path, f.content);
    // If this is a pasted file with a generic name, fix the extension
    if (f.path === 'main.js' && source === 'paste') {
      const ext = getExtensionForLanguage(detectedLang);
      return { ...f, path: `main.${ext}` };
    }
    return f;
  });

  const fileDocs = processedFiles.map(f => generateFileSummary(f.path, f.content));
  const readme = generateReadme(projectName, source, repoUrl, fileDocs);
  return { readme, fileDocs };
}
