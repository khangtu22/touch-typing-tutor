/**
 * Code Snippets Library for Developer Typing Arena
 * Curated real-world snippets across 8 programming languages:
 * JavaScript, TypeScript, Python, HTML/CSS, SQL, Rust, C++, Bash/Shell.
 */

export const CODE_LANGUAGES = [
  { id: 'all', name: 'All Languages', icon: '💻' },
  { id: 'javascript', name: 'JavaScript', icon: '🟨' },
  { id: 'typescript', name: 'TypeScript', icon: '🔷' },
  { id: 'python', name: 'Python', icon: '🐍' },
  { id: 'html_css', name: 'HTML & CSS', icon: '🎨' },
  { id: 'sql', name: 'SQL', icon: '🗄️' },
  { id: 'rust', name: 'Rust', icon: '🦀' },
  { id: 'cpp', name: 'C++', icon: '⚙️' },
  { id: 'bash', name: 'Bash / Shell', icon: '🐚' }
];

export const CODE_SNIPPETS = [
  // --- JavaScript ---
  {
    id: 'js_fetch_async',
    language: 'javascript',
    title: 'Async Fetch API Request',
    difficulty: 'easy',
    description: 'Modern asynchronous network request with error handling.',
    code: `async function fetchData(url) {\n  try {\n    const res = await fetch(url);\n    if (!res.ok) throw new Error('HTTP Error ' + res.status);\n    return await res.json();\n  } catch (err) {\n    console.error('Fetch failed:', err.message);\n    return null;\n  }\n}`
  },
  {
    id: 'js_array_methods',
    language: 'javascript',
    title: 'Functional Array Pipeline',
    difficulty: 'medium',
    description: 'Chained map, filter, and reduce operations.',
    code: `const activeUsers = users\n  .filter(u => u.isActive && u.score >= 80)\n  .map(u => ({ id: u.id, name: u.name.trim(), rank: u.score * 1.5 }))\n  .reduce((acc, curr) => acc + curr.rank, 0);`
  },
  {
    id: 'js_debounce_hook',
    language: 'javascript',
    title: 'Debounce Utility Function',
    difficulty: 'hard',
    description: 'Higher-order closure to debounce rapid user input.',
    code: `function debounce(fn, delay = 300) {\n  let timer = null;\n  return function (...args) {\n    clearTimeout(timer);\n    timer = setTimeout(() => fn.apply(this, args), delay);\n  };\n}`
  },

  // --- TypeScript ---
  {
    id: 'ts_generic_interface',
    language: 'typescript',
    title: 'Generic API Response Model',
    difficulty: 'easy',
    description: 'TypeScript interface with generic payload and status enum.',
    code: `interface ApiResponse<T> {\n  status: 'success' | 'error' | 'pending';\n  statusCode: number;\n  data: T;\n  message?: string;\n  timestamp: number;\n}`
  },
  {
    id: 'ts_utility_types',
    language: 'typescript',
    title: 'Advanced Type Mappings',
    difficulty: 'medium',
    description: 'Conditional types, Record, and Partial utilities.',
    code: `type DeepReadonly<T> = {\n  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];\n};\n\ntype UserProfile = DeepReadonly<{ id: string; settings: Record<string, boolean> }>;`
  },
  {
    id: 'ts_react_hook',
    language: 'typescript',
    title: 'Custom React State Hook',
    difficulty: 'hard',
    description: 'Typed custom hook managing local storage synchronization.',
    code: `function useLocalStorage<T>(key: string, initialValue: T): [T, (val: T | ((prev: T) => T)) => void] {\n  const [stored, setStored] = useState<T>(() => {\n    const item = localStorage.getItem(key);\n    return item ? JSON.parse(item) : initialValue;\n  });\n  return [stored, setStored];\n}`
  },

  // --- Python ---
  {
    id: 'py_list_comprehension',
    language: 'python',
    title: 'List & Dict Comprehensions',
    difficulty: 'easy',
    description: 'Pythonic data transformations with conditionals.',
    code: `squares = [x**2 for x in range(20) if x % 2 == 0]\nlookup_table = {f"key_{i}": val for i, val in enumerate(squares) if val > 10}`
  },
  {
    id: 'py_decorator',
    language: 'python',
    title: 'Timing Function Decorator',
    difficulty: 'medium',
    description: 'Function decorator to measure execution duration with functools.',
    code: `import time\nfrom functools import wraps\n\ndef measure_time(func):\n    @wraps(func)\n    def wrapper(*args, **kwargs):\n        start = time.perf_counter()\n        result = func(*args, **kwargs)\n        print(f"{func.__name__} took {time.perf_counter() - start:.4f}s")\n        return result\n    return wrapper`
  },
  {
    id: 'py_dataclass_async',
    language: 'python',
    title: 'Async Context Manager & Dataclass',
    difficulty: 'hard',
    description: 'Python dataclasses and asynchronous resource managers.',
    code: `from dataclasses import dataclass, field\nimport asyncio\n\n@dataclass\nclass DatabaseConnection:\n    host: str = "localhost"\n    port: int = 5432\n    connected: bool = field(default=False, init=False)\n\n    async def __aenter__(self):\n        self.connected = True\n        await asyncio.sleep(0.05)\n        return self\n\n    async def __aexit__(self, exc_type, exc, tb):\n        self.connected = False`
  },

  // --- HTML / CSS ---
  {
    id: 'html_css_flexbox',
    language: 'html_css',
    title: 'Glassmorphism Card Layout',
    difficulty: 'easy',
    description: 'Modern CSS flexbox card styling with backdrop filter.',
    code: `.glass-card {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  padding: 24px;\n  background: rgba(255, 255, 255, 0.05);\n  backdrop-filter: blur(16px);\n  border: 1px solid rgba(255, 255, 255, 0.12);\n  border-radius: 16px;\n}`
  },
  {
    id: 'html_css_grid',
    language: 'html_css',
    title: 'Responsive Grid Template',
    difficulty: 'medium',
    description: 'CSS Grid template with auto-fit, minmax, and clamp.',
    code: `.dashboard-grid {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));\n  gap: clamp(16px, 2.5vw, 32px);\n  max-width: 1200px;\n  margin: 0 auto;\n}`
  },
  {
    id: 'html_css_animation',
    language: 'html_css',
    title: 'Keyframes Pulse Animation',
    difficulty: 'hard',
    description: 'CSS cubic-bezier animations with glow effects.',
    code: `@keyframes neonPulse {\n  0%, 100% {\n    box-shadow: 0 0 10px rgba(124, 92, 252, 0.3);\n    transform: scale(1);\n  }\n  50% {\n    box-shadow: 0 0 25px rgba(124, 92, 252, 0.75);\n    transform: scale(1.02);\n  }\n}`
  },

  // --- SQL ---
  {
    id: 'sql_select_join',
    language: 'sql',
    title: 'Aggregated Inner Join Query',
    difficulty: 'easy',
    description: 'SQL SELECT query joining customers and orders with aggregation.',
    code: `SELECT\n  c.customer_id,\n  c.full_name,\n  COUNT(o.order_id) AS total_orders,\n  COALESCE(SUM(o.amount), 0.00) AS total_spent\nFROM customers c\nLEFT JOIN orders o ON c.customer_id = o.customer_id\nWHERE o.created_at >= '2026-01-01'\nGROUP BY c.customer_id, c.full_name\nHAVING COUNT(o.order_id) >= 3\nORDER BY total_spent DESC\nLIMIT 25;`
  },
  {
    id: 'sql_window_function',
    language: 'sql',
    title: 'Window Functions & CTE',
    difficulty: 'medium',
    description: 'Common Table Expressions with DENSE_RANK and ROW_NUMBER.',
    code: `WITH ranked_scores AS (\n  SELECT\n    user_id,\n    lesson_id,\n    wpm,\n    accuracy,\n    DENSE_RANK() OVER (PARTITION BY lesson_id ORDER BY wpm DESC, accuracy DESC) as rank\n  FROM session_history\n)\nSELECT * FROM ranked_scores WHERE rank <= 5;`
  },

  // --- Rust ---
  {
    id: 'rust_pattern_match',
    language: 'rust',
    title: 'Pattern Matching & Result Handling',
    difficulty: 'medium',
    description: 'Idiomatic Rust enum matching and error propagation.',
    code: `fn parse_port(input: &str) -> Result<u16, String> {\n    match input.trim().parse::<u16>() {\n        Ok(port) if port > 1024 => Ok(port),\n        Ok(_) => Err(String::from("Port must be > 1024")),\n        Err(e) => Err(format!("Invalid integer: {}", e)),\n    }\n}`
  },
  {
    id: 'rust_traits_struct',
    language: 'rust',
    title: 'Trait Implementation & Generics',
    difficulty: 'hard',
    description: 'Rust structs, trait definitions, and ownership borrows.',
    code: `pub trait Summarizable {\n    fn summary(&self) -> String;\n}\n\npub struct Article<T: std::fmt::Display> {\n    pub title: String,\n    pub author: String,\n    pub payload: T,\n}\n\nimpl<T: std::fmt::Display> Summarizable for Article<T> {\n    fn summary(&self) -> String {\n        format!("'{}' by {} -> {}", self.title, self.author, self.payload)\n    }\n}`
  },

  // --- C++ ---
  {
    id: 'cpp_vector_algorithm',
    language: 'cpp',
    title: 'Modern C++ STL Algorithms',
    difficulty: 'medium',
    description: 'std::transform, lambdas, and modern auto typing.',
    code: `#include <iostream>\n#include <vector>\n#include <algorithm>\n\nint main() {\n    std::vector<int> numbers = {1, 2, 3, 4, 5, 6};\n    std::vector<int> squares;\n    std::transform(numbers.begin(), numbers.end(), std::back_inserter(squares), [](int n) {\n        return n * n;\n    });\n    return 0;\n}`
  },
  {
    id: 'cpp_smart_pointers',
    language: 'cpp',
    title: 'RAII & Smart Pointer Factory',
    difficulty: 'hard',
    description: 'std::unique_ptr and std::make_shared memory management.',
    code: `class SessionManager {\npublic:\n    explicit SessionManager(std::string id) : sessionId(std::move(id)) {}\n    void log() const { std::cout << "Session: " << sessionId << '\\n'; }\nprivate:\n    std::string sessionId;\n};\n\nauto createSession(const std::string& token) {\n    return std::make_unique<SessionManager>(token);\n}`
  },
  {
    id: 'cpp_template_class',
    language: 'cpp',
    title: 'Template Class & Rule of Five',
    difficulty: 'easy',
    description: 'Generic template stack container with move semantics.',
    code: `template <typename T>\nclass SimpleStack {\nprivate:\n    std::vector<T> elements;\npublic:\n    void push(const T& item) { elements.push_back(item); }\n    void push(T&& item) { elements.push_back(std::move(item)); }\n    bool empty() const { return elements.empty(); }\n    size_t size() const { return elements.size(); }\n};`
  },

  // --- Bash / Shell ---
  {
    id: 'bash_backup_script',
    language: 'bash',
    title: 'Automated Log Archiver Script',
    difficulty: 'easy',
    description: 'Shell script with variable interpolation, loops, and conditions.',
    code: `#!/usr/bin/env bash\nset -euo pipefail\n\nBACKUP_DIR="/var/backups/$(date +%Y%m%d)"\nmkdir -p "$BACKUP_DIR"\n\nfor log in /var/log/*.log; do\n  if [[ -f "$log" ]]; then\n    gzip -c "$log" > "$BACKUP_DIR/$(basename "$log").gz"\n    echo "Archived $(basename "$log") successfully."\n  fi\ndone`
  },
  {
    id: 'bash_cli_parser',
    language: 'bash',
    title: 'Robust Command-Line Flag Parser',
    difficulty: 'medium',
    description: 'Shell script argument parsing using getopts with error traps.',
    code: `#!/usr/bin/env bash\nPORT=8080\nENV="production"\n\nwhile getopts "p:e:h" opt; do\n  case "$opt" in\n    p) PORT="$OPTARG" ;;\n    e) ENV="$OPTARG" ;;\n    h) echo "Usage: $0 [-p port] [-e env]" ; exit 0 ;;\n    *) echo "Invalid option" ; exit 1 ;;\n  esac\ndone\n\necho "Starting server in $ENV mode on port $PORT..."`
  },
  {
    id: 'bash_git_deploy',
    language: 'bash',
    title: 'Production Zero-Downtime Deploy',
    difficulty: 'hard',
    description: 'Automated CI/CD health check and docker container rotation.',
    code: `#!/usr/bin/env bash\nset -eo pipefail\n\necho "Pulling latest release from origin/main..."\ngit fetch origin main && git checkout -q FETCH_HEAD\n\ndocker compose pull -q\ndocker compose up -d --remove-orphans\n\nuntil curl -sf http://localhost:8080/health > /dev/null; do\n  echo "Waiting for healthcheck to pass..."\n  sleep 2\ndone\n\necho "Deployment verified healthy and live."`
  },

  // --- SQL (Additional) ---
  {
    id: 'sql_transaction_rollback',
    language: 'sql',
    title: 'ACID Transaction & Savepoint',
    difficulty: 'hard',
    description: 'Safe banking balance transfer with balance checks and rollback.',
    code: `BEGIN;\n\nUPDATE accounts\nSET balance = balance - 250.00\nWHERE id = 101 AND balance >= 250.00;\n\nSAVEPOINT debit_checked;\n\nUPDATE accounts\nSET balance = balance + 250.00\nWHERE id = 202;\n\nINSERT INTO ledger (from_id, to_id, amount, status)\nVALUES (101, 202, 250.00, 'COMPLETED');\n\nCOMMIT;`
  },

  // --- Rust (Additional) ---
  {
    id: 'rust_tokio_channel',
    language: 'rust',
    title: 'Tokio Multi-Producer Async Channel',
    difficulty: 'hard',
    description: 'Concurrent message-passing pipeline with Tokio green threads.',
    code: `use tokio::sync::mpsc;\n\n#[tokio::main]\nasync fn main() {\n    let (tx, mut rx) = mpsc::channel::<String>(32);\n    let producer = tokio::spawn(async move {\n        for i in 1..=5 {\n            tx.send(format!("Packet #{}", i)).await.unwrap();\n        }\n    });\n    while let Some(msg) = rx.recv().await {\n        println!("Received telemetry: {}", msg);\n    }\n    producer.await.unwrap();\n}`
  }
];

/**
 * Returns snippets filtered by language and difficulty
 * @param {string} [language='all']
 * @param {string} [difficulty='all']
 * @returns {Array}
 */
export function getFilteredSnippets(language = 'all', difficulty = 'all') {
  return CODE_SNIPPETS.filter(s => {
    const langMatch = language === 'all' || s.language === language;
    const diffMatch = difficulty === 'all' || s.difficulty === difficulty;
    return langMatch && diffMatch;
  });
}

/**
 * Returns a random snippet
 * @param {string} [language='all']
 * @param {string|null} [excludeId=null]
 * @returns {object}
 */
export function getRandomCodeSnippet(language = 'all', excludeId = null) {
  const list = getFilteredSnippets(language).filter(s => s.id !== excludeId);
  const pool = list.length > 0 ? list : CODE_SNIPPETS;
  return pool[Math.floor(Math.random() * pool.length)];
}
