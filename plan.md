# opencode-replay

A standalone CLI tool that generates static HTML transcripts from OpenCode sessions, enabling retroactive browsing, searching, and exporting of AI-assisted coding conversations.

## Project Goal

OpenCode stores session data in `~/.local/share/opencode/storage/` as JSON files, but this data isn't easily browsable or shareable. `opencode-replay` transforms these sessions into clean, searchable, static HTML pages - similar to what [claude-code-transcripts](https://github.com/simonw/claude-code-transcripts) does for Claude Code.

### Why This Exists

**1. Shareable Session Transcripts for Code Review**

In professional environments, AI-assisted coding sessions should be part of the PR review process. Reviewers need to understand not just *what* changed, but *how* and *why* - the prompts given, the AI's reasoning, the tool calls made, and the iterations involved. A shareable HTML transcript makes this possible:
- Attach session link to PRs for full context
- Enable reviewers to audit AI-generated code decisions
- Document the human-AI collaboration process
- Provide accountability and transparency

**2. Pattern Detection Across Sessions for Self-Improvement**

Becoming better at agentic coding requires understanding your own patterns:
- Which prompts lead to successful outcomes vs. wasted iterations?
- What tool usage patterns are most effective?
- Where do you tend to over-specify or under-specify?
- How much context do you typically provide?
- What types of tasks work well with AI assistance vs. manual coding?

By making sessions browsable and searchable across time, users can identify trends, learn from past mistakes, and develop better prompting strategies.

**3. Session Recall and Documentation**

- Browse past sessions to recall what was done and why
- Search across session content (titles + message text)
- Create documentation from AI-assisted development work
- Archive sessions for future reference

### Primary Use Cases

| Use Case | Description |
|----------|-------------|
| **PR Documentation** | Generate shareable HTML to attach to pull requests, showing the AI collaboration process |
| **Self-Review** | Analyze past sessions to identify effective vs. ineffective prompting patterns |
| **Team Sharing** | Share session transcripts with teammates for knowledge transfer |
| **Debugging** | Review what happened in a session when something went wrong |
| **Learning** | Study how experienced users interact with AI coding tools |
| **Compliance** | Maintain audit trails of AI-assisted code generation |

### Design Implications

These goals influence the implementation:

| Goal | Design Implication |
|------|-------------------|
| **Shareability** | Static HTML that works anywhere (no server), single-file export option, clean URLs |
| **PR Integration** | Session summary with key metrics (files changed, tokens used, cost), diff highlighting |
| **Pattern Detection** | Statistics aggregation, tool usage counts, prompt length analysis, success/failure tracking |
| **Cross-Session Analysis** | Master index across all sessions, search across all content, filtering by date/project |
| **Professional Context** | Clean, professional design suitable for work environments |

## v1 Scope

| Feature | Details |
|---------|---------|
| **Output** | Static HTML generation (no server required) |
| **Tech Stack** | TypeScript / Bun |
| **Distribution** | npm package (`opencode-replay`) |
| **Search** | Client-side JavaScript (session titles + message text) |
| **Export Formats** | HTML (primary), JSON (optional alongside) |
| **Scope Modes** | Current project only, or all projects |
| **TUI** | Deferred to v1.1 |

## CLI Interface

```bash
# Generate HTML for current project's sessions (auto-detect from cwd)
opencode-replay

# Generate HTML for all projects across the machine
opencode-replay --all

# Specify output directory
opencode-replay -o ./my-transcripts

# Auto-name output directory from project/session name
opencode-replay -a

# Export specific session by ID
opencode-replay --session ses_4957d04cdffeJwdujYPBCKpIsb

# Include raw JSON export alongside HTML
opencode-replay --json

# Open in browser after generation
opencode-replay --open

# Specify custom storage path (defaults to ~/.local/share/opencode/storage)
opencode-replay --storage /path/to/storage

# Generate and serve via HTTP server (Phase 4.5)
opencode-replay --serve

# Serve on a specific port (default: 3000)
opencode-replay --serve --port 8080

# Serve existing output without regenerating
opencode-replay --serve -o ./existing-output --no-generate
```

## Output Structure

```
output/
├── index.html                    # Master index (all projects) or project index
├── assets/
│   ├── styles.css               # Main stylesheet
│   ├── search.js                # Client-side search functionality
│   └── tools.css                # Tool-specific styling (bash, edit, etc.)
├── projects/                     # Only if --all mode
│   └── {project-name}/
│       └── index.html           # Project-level session list
└── sessions/
    └── {session-id}/
        ├── index.html           # Session overview/timeline
        ├── page-001.html        # Paginated conversation pages
        ├── page-002.html
        └── session.json         # Raw data (if --json flag)
```

## Architecture

### Project Structure

```
opencode-replay/
├── src/
│   ├── index.ts                 # CLI entry point (argument parsing)
│   ├── cli.ts                   # CLI command handlers
│   │
│   ├── storage/
│   │   ├── reader.ts            # Read OpenCode storage files
│   │   ├── types.ts             # TypeScript types (mirroring OpenCode's Zod schemas)
│   │   └── index.ts             # Storage module exports
│   │
│   ├── render/
│   │   ├── html.ts              # HTML generation orchestration
│   │   ├── index-page.ts        # Master/project index generation
│   │   ├── session-page.ts      # Session overview page
│   │   ├── conversation-page.ts # Paginated conversation pages
│   │   │
│   │   ├── components/
│   │   │   ├── message.ts       # User/Assistant message rendering
│   │   │   ├── part.ts          # Part type dispatcher
│   │   │   └── tools/           # Per-tool renderers
│   │   │       ├── bash.ts
│   │   │       ├── read.ts
│   │   │       ├── write.ts
│   │   │       ├── edit.ts
│   │   │       ├── glob.ts
│   │   │       ├── grep.ts
│   │   │       ├── task.ts
│   │   │       ├── todowrite.ts
│   │   │       └── webfetch.ts
│   │   │
│   │   └── templates/           # HTML template strings
│   │       ├── base.ts          # Base HTML wrapper
│   │       ├── index.ts         # Index page template
│   │       ├── session.ts       # Session page template
│   │       └── page.ts          # Conversation page template
│   │
│   ├── assets/
│   │   ├── styles.css           # Main CSS
│   │   ├── tools.css            # Tool-specific CSS
│   │   └── search.js            # Client-side search
│   │
│   └── utils/
│       ├── id.ts                # Parse timestamps from IDs
│       ├── format.ts            # Date/time formatting
│       └── fs.ts                # File system helpers
│
├── package.json
├── tsconfig.json
├── plan.md                      # This file
├── opencode-storage-implementation.md  # Storage architecture reference
└── README.md
```

### Key Modules

#### 1. Storage Reader (`src/storage/`)

Reads OpenCode's file-based storage without depending on OpenCode's internal modules.

```typescript
// Types matching OpenCode's Zod schemas
interface Project {
  id: string
  worktree: string
  vcs?: "git"
  name?: string
  time: { created: number; updated: number }
}

interface Session {
  id: string
  projectID: string
  directory: string
  title: string
  version: string
  time: { created: number; updated: number }
  parentID?: string
  // ...
}

interface Message {
  id: string
  sessionID: string
  role: "user" | "assistant"
  // ... role-specific fields
}

interface Part {
  id: string
  sessionID: string
  messageID: string
  type: "text" | "tool" | "reasoning" | "file" | "snapshot" | ...
  // ... type-specific fields
}

// Reader functions
async function listProjects(storagePath: string): Promise<Project[]>
async function listSessions(storagePath: string, projectId: string): Promise<Session[]>
async function getMessagesWithParts(storagePath: string, sessionId: string): Promise<MessageWithParts[]>
```

#### 2. HTML Renderer (`src/render/`)

Generates static HTML files from session data.

**Pagination**: 5 user prompts per page (following claude-code-transcripts pattern)

**Templates**: Raw TypeScript template strings (simplest approach, no dependencies)

```typescript
// Example template approach
function renderBasePage(content: string, title: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="../assets/styles.css">
</head>
<body>
  ${content}
  <script src="../assets/search.js"></script>
</body>
</html>`
}
```

#### 3. Tool Renderers (`src/render/components/tools/`)

Each OpenCode tool gets custom rendering:

| Tool | Rendering |
|------|-----------|
| `bash` | Command box with `$` prefix, collapsible output |
| `read` | File path header, syntax-highlighted content preview |
| `write` | File path with "created" indicator, content preview |
| `edit` | File path, old/new diff view (or unified diff) |
| `glob` | Pattern shown, file list results |
| `grep` | Pattern + include filter, matching lines |
| `task` | Agent type badge, prompt summary, expandable result |
| `todowrite` | Checklist UI with status icons |
| `webfetch` | URL link, response preview |

#### 4. Search (`src/assets/search.js`)

Client-side search implementation:
- Builds search index from all pages on first search
- Searches session titles + message text content
- Results shown in modal with links to specific messages
- URL fragment support for shareable search links (`#search=query`)

### Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLI Entry Point                              │
│  Parse args → Determine mode (current project / all / specific)     │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Storage Reader                                │
│  Read projects → Read sessions → Read messages → Read parts         │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        HTML Renderer                                 │
│  Generate index → Generate session pages → Generate conv pages      │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        File Writer                                   │
│  Write HTML files → Copy assets → (Optional) Write JSON exports     │
└─────────────────────────────────────────────────────────────────────┘
```

## Implementation Plan

### Phase 1: Project Setup (COMPLETED)
- [x] Initialize Bun/TypeScript project (`bun init`)
- [x] Set up package.json with CLI entry point, scripts, and metadata
- [x] Configure TypeScript (tsconfig.json with strict mode, paths, bun-types)
- [x] Set up basic project structure (src/storage, src/render, src/utils, src/assets)
- [x] Create CLI entry point with argument parsing (--help, --version, --all, --output, etc.)
- [x] Configure .gitignore

### Phase 2: Storage Reader (COMPLETED)
- [x] Define TypeScript types for Project entity
- [x] Define TypeScript types for Session entity
- [x] Define TypeScript types for Message entity (User + Assistant with discriminated union)
- [x] Define TypeScript types for all Part types (text, tool, reasoning, file, snapshot, patch, agent, compaction, subtask, retry)
- [x] Implement getDefaultStoragePath() utility
- [x] Implement listProjects() - read all projects from storage
- [x] Implement listSessions() - read sessions for a project
- [x] Implement listMessages() - read messages for a session
- [x] Implement listParts() - read parts for a message
- [x] Implement getMessagesWithParts() - combined message+parts query
- [x] Implement findProjectByPath() - find project by cwd
- [x] Add ID parsing utilities (compareIds, isSessionId, isMessageId, isPartId)
- [x] Handle edge cases (missing files, malformed JSON - returns null/empty array)
- [x] Test with real OpenCode data (verified: 27 projects, 137 sessions)

### Phase 3: Basic HTML Generation (COMPLETED)
- [x] Create base HTML template (`src/render/templates/base.ts`)
  - HTML wrapper with DOCTYPE, meta tags, viewport, generator meta
  - Header component with breadcrumbs navigation
  - Footer component with attribution link
  - Search button placeholder (Ctrl+K hint)
- [x] Create CSS stylesheet (`src/assets/styles.css` - 938 lines)
  - CSS variables for theming (colors, spacing, typography)
  - Message backgrounds: user (light blue), assistant (light gray), tool (light orange)
  - Tool-specific colors: bash (purple), read (indigo), write (green), edit (orange)
  - Status colors for success/error/warning/info
  - Responsive design with mobile breakpoints
  - Print styles that hide navigation and expand collapsed sections
- [x] Create HTML utility functions (`src/utils/html.ts`)
  - `escapeHtml()` - XSS prevention
  - `renderMarkdown()` - code blocks, inline code, bold, italic, links
  - `isSafeUrl()` - URL validation to prevent javascript: XSS
  - `truncate()`, `slugify()` helpers
- [x] Create formatting utilities (`src/utils/format.ts`)
  - Date/time formatting (formatDate, formatDateTime, formatTime, formatRelativeTime)
  - Duration formatting with edge case handling for negative values
  - Token count formatting with k/M suffixes
  - Cost formatting with appropriate decimal places
  - Diff formatting (+additions -deletions)
- [x] Implement index page template (`src/render/templates/index-page.ts`)
  - Session cards with title, date, message count, first prompt preview
  - Summary stats (total sessions, messages, code changes)
  - Support for multi-project view with project names
- [x] Implement session overview page (`src/render/templates/session.ts`)
  - Session header with breadcrumbs and stats
  - Timeline view showing each user prompt with tool usage counts
  - Stats: created date, duration, message count, model, tokens, cost, file changes
  - Pagination links to conversation pages
- [x] Implement message rendering (`src/render/components/message.ts`)
  - User message with role badge, timestamp, model info
  - Assistant message with token stats, cost, finish reason
  - Renders all parts within each message
- [x] Implement part rendering (`src/render/components/part.ts`)
  - Text parts with markdown rendering
  - Reasoning parts (extended thinking) with special styling
  - Tool parts with collapsible input/output sections
  - Tool icons for common tools (bash, read, write, edit, glob, grep, task, todowrite, webfetch)
  - Generic fallback for unknown part types
- [x] Implement conversation page template (`src/render/templates/page.ts`)
  - Paginated message display (5 user prompts per page)
  - Previous/Next navigation with page numbers
  - Breadcrumb navigation back to session and index
- [x] Implement HTML generation orchestration (`src/render/html.ts`)
  - Main `generateHtml()` function coordinating all generation
  - Three modes: current project, all projects, single session
  - Timeline building from messages with tool usage counts
  - Message pagination logic
  - Asset copying (CSS, placeholder search.js)
  - Progress output during generation
- [x] Wire up CLI to call generateHtml()
  - Tested with 987 real sessions successfully
  - Cross-platform browser opening (xdg-open on Linux, open on macOS)

**Phase 3 Design Decisions:**
- Pagination: 5 user prompts per page (matches claude-code-transcripts)
- Templates: Raw TypeScript template strings (zero dependencies)
- Tool rendering: Generic collapsible view for all tools (specific renderers deferred to Phase 4)
- Assets: Separate files (not embedded) for easier customization
- Security: URL validation in markdown to prevent XSS via javascript: links

### Phase 4: Tool Renderers (COMPLETED)
- [x] Implement `bash` tool renderer
  - Terminal-style command display with `$` prefix
  - Dark background output box with monospace font
  - Collapsible output for long results (>20 lines)
  - Error styling with red background
- [x] Implement `read` tool renderer
  - File path header with filename highlight
  - Full path shown on hover/secondary text
  - Line count display
  - Range info (offset/limit) when applicable
- [x] Implement `write` tool renderer
  - File path with "Created" badge
  - Line count and byte size display
  - Collapsible content preview
- [x] Implement `edit` tool renderer (with diff view)
  - Side-by-side diff view for short edits (<50 lines)
  - Collapsible sections for longer edits
  - Line count comparison (X lines -> Y lines)
  - "Replace All" badge when applicable
- [x] Implement `glob` tool renderer
  - Pattern display with monospace styling
  - File list with type-specific icons
  - File count summary
- [x] Implement `grep` tool renderer
  - Pattern and include filter display
  - Parsed file:line:content matches
  - Match count summary
- [x] Implement `task` tool renderer
  - Agent type badge with colors (General/Explore/Reviewer/Docs)
  - Collapsible prompt section
  - Expandable result section
- [x] Implement `todowrite` tool renderer
  - Checklist with status icons (checkmark/arrow/circle/X)
  - Priority badges (high=red, medium=orange)
  - Progress summary (X/Y done)
- [x] Implement `webfetch` tool renderer
  - Clickable URL (validated for safety)
  - Format badge (text/markdown/html)
  - Content size display
  - Collapsible content preview
- [x] Implement `batch` tool renderer (added during implementation)
  - Nested tool call list with icons
  - Tool count summary by type
  - Combined output section
- [x] Handle unknown tools gracefully
  - Generic renderer with input/output labels
  - JSON-formatted input display
  - Collapsible sections for long output

**Phase 4 Design Decisions:**
- All tool renderers follow consistent pattern: type interface, main render function, helper functions
- Security: All `data-status` attributes escaped with `escapeHtml()` to prevent XSS
- Edit tool shows line counts instead of fake +/- diff stats (accurate diff requires complex algorithm)
- `formatBytes()` utility extracted to shared `utils/format.ts` to avoid duplication
- Batch tool added (not in original plan) to properly display nested tool calls
- Long outputs auto-collapse (threshold varies by tool: 20-50 lines)
- Toggle indicators show `+`/`-` reflecting collapsed state
- Tool-specific CSS colors defined in variables for consistency

**Phase 4 Files Created:**
- `src/render/components/tools/bash.ts`
- `src/render/components/tools/read.ts`
- `src/render/components/tools/write.ts`
- `src/render/components/tools/edit.ts`
- `src/render/components/tools/glob.ts`
- `src/render/components/tools/grep.ts`
- `src/render/components/tools/task.ts`
- `src/render/components/tools/todowrite.ts`
- `src/render/components/tools/webfetch.ts`
- `src/render/components/tools/batch.ts`

**Phase 4 Files Modified:**
- `src/render/components/part.ts` - Tool dispatcher with switch statement
- `src/assets/styles.css` - Added ~400 lines of tool-specific CSS
- `src/utils/format.ts` - Added `formatBytes()` utility
- `src/utils/html.ts` - Exported `isSafeUrl()` for webfetch

### Phase 4.5: Development Server & Dark Mode (COMPLETED)

This phase adds two quality-of-life features: a built-in HTTP server for easier viewing of generated transcripts, and a dark mode theme for improved readability in low-light environments.

#### 4.5.1: Built-in HTTP Server (`--serve` flag) - COMPLETED

**Motivation:** Static HTML files opened via `file://` protocol have limitations (CORS, some JS features). A simple HTTP server makes viewing and sharing locally much easier, especially for development and review workflows.

**CLI Changes:**
```bash
# Generate and immediately serve the output
opencode-replay --serve

# Serve on a specific port (default: 3000)
opencode-replay --serve --port 8080

# Serve existing output directory without regenerating
opencode-replay --serve -o ./existing-output --no-generate
```

**Implementation Tasks:**
- [x] Add `--serve` CLI flag (boolean, default: false)
- [x] Add `--port` CLI flag (number, default: 3000)
- [x] Add `--no-generate` CLI flag (boolean, default: false) - skip generation, just serve
- [x] Implement HTTP server using `Bun.serve()` in `src/server.ts`
  - Serve static files from output directory
  - Proper MIME type handling (html, css, js, json)
  - Directory index (serve index.html for directory requests)
  - 404 handling for missing files
- [x] Auto-open browser when `--serve` is used (unless `--no-open` specified)
- [x] Display server URL in console output: `Server running at http://localhost:3000`
- [x] Graceful shutdown on Ctrl+C with cleanup message
- [x] Update CLI help text with new flags

**Server Implementation (`src/server.ts`):**
```typescript
interface ServeOptions {
  directory: string
  port: number
  open?: boolean
}

export async function serve(options: ServeOptions): Promise<void> {
  const { directory, port, open = true } = options
  
  const server = Bun.serve({
    port,
    async fetch(req) {
      const url = new URL(req.url)
      let path = url.pathname
      
      // Serve index.html for directory requests
      if (path.endsWith('/')) path += 'index.html'
      
      const filePath = join(directory, path)
      const file = Bun.file(filePath)
      
      if (await file.exists()) {
        return new Response(file)
      }
      
      return new Response('Not Found', { status: 404 })
    }
  })
  
  console.log(`Server running at http://localhost:${port}`)
  
  if (open) {
    const openCmd = process.platform === 'darwin' ? 'open' : 'xdg-open'
    Bun.spawn([openCmd, `http://localhost:${port}`])
  }
}
```

**Files Created:**
- `src/server.ts` - HTTP server implementation

**Files Modified:**
- `src/index.ts` - Add --serve, --port, --no-generate flags and server invocation
- `README.md` - Document new flags

#### 4.5.2: Dark Mode Theme - COMPLETED

**Motivation:** Many developers prefer dark mode for reduced eye strain. The generated transcripts should support both light and dark themes.

**Implementation Approach:** CSS-only solution using `prefers-color-scheme` media query for automatic OS-based switching, plus a manual toggle button for user preference override stored in localStorage.

**Implementation Tasks:**
- [x] Add CSS variables for dark mode colors in `src/assets/styles.css`
  - Background colors (page, cards, messages, code blocks)
  - Text colors (primary, secondary, muted)
  - Border colors
  - Tool-specific colors adapted for dark backgrounds
  - Status colors (success, error, warning) with appropriate contrast
- [x] Add `@media (prefers-color-scheme: dark)` rules for automatic switching
- [x] Add `[data-theme="dark"]` class overrides for manual toggle
- [x] Create theme toggle button component in base template
  - Sun/moon SVG icon toggle
  - Positioned in header (top-right corner)
  - Accessible with proper ARIA labels
- [x] Add theme toggle JavaScript in `src/assets/theme.js`
  - Check localStorage for saved preference
  - Check system preference as fallback
  - Toggle between light/dark modes
  - Save preference to localStorage
  - Listen for system preference changes
  - 24-hour auto-follow for system changes
- [x] Add FOUC prevention inline script in base template head
- [x] Update base HTML template to include theme toggle button and script
- [x] Ensure all tool renderers look good in dark mode
- [x] Test contrast ratios meet WCAG AA standards (4.5:1 for text)
- [x] Add smooth transitions with prefers-reduced-motion support
- [x] Add custom scrollbar styling for both themes

**Dark Mode Color Scheme (GitHub-inspired):**

| Element | Light Mode | Dark Mode |
|---------|-----------|-----------|
| Page background | `#ffffff` | `#0d1117` |
| Secondary background | `#f8f9fa` | `#161b22` |
| Tertiary background | `#f1f3f5` | `#21262d` |
| Primary text | `#212529` | `#e6edf3` |
| Secondary text | `#6c757d` | `#8b949e` |
| Border | `#dee2e6` | `#30363d` |
| User message bg | `#e3f2fd` | `#1c3a5e` |
| Assistant message bg | `#f5f5f5` | `#21262d` |

**Files Created:**
- `src/assets/theme.js` - Theme toggle functionality with localStorage persistence

**Files Modified:**
- `src/assets/styles.css` - Added 613 lines of dark mode CSS variables, media queries, element overrides, transitions, and scrollbar styling
- `src/render/templates/base.ts` - Added FOUC prevention script, theme toggle button with sun/moon SVG icons, and updated header layout
- `src/render/html.ts` - Copy theme.js to output assets directory

**Testing Checklist:**
- [x] Light mode renders correctly (regression test)
- [x] Dark mode activates automatically based on OS preference
- [x] Manual toggle overrides system preference
- [x] Preference persists across page reloads (localStorage)
- [x] All tool renderers have adequate contrast in dark mode
- [x] Code blocks remain readable in both modes
- [x] Toggle button is visible and accessible in both modes
- [x] FOUC prevention script works (no flash on page load)
- [x] Smooth transitions with reduced-motion respect

### Phase 5: Part Type Renderers (COMPLETED)
- [x] Text parts (user input, assistant response)
  - Enhanced markdown rendering with code block language labels
  - Added syntax highlighting with custom highlight.js
  - Support for JS/TS, Python, Go, Rust, Bash, SQL, JSON, YAML, HTML, CSS, Markdown, diff
- [x] Reasoning parts (extended thinking)
  - Collapsible content with toggle
  - Duration display when timing info available
  - Auto-collapse for long content (>20 lines)
- [x] File parts (attachments)
  - Image previews for image mime types
  - File size estimation from data URLs
  - Mime-type specific icons
  - Download links for non-image files
- [x] Snapshot parts (undo/redo markers)
  - Visual marker with camera icon
  - Snapshot ID display
- [x] Patch parts (file changes checkpoint)
  - File list with icons
  - Hash preview
  - File count display
- [x] Agent parts (sub-agent invocations)
  - Agent name badge
  - Source value preview
- [x] Compaction parts (context compaction)
  - Visual divider with icon
  - Distinguish auto vs manual compaction
- [x] Subtask parts (task metadata)
  - Agent type badge with color coding
  - Command display when present
  - Collapsible prompt section
- [x] Retry parts (retry attempts)
  - Attempt number badge
  - Error name, message, and code display

**Phase 5 Files Created:**
- `src/assets/highlight.js` - Lightweight syntax highlighter
- `src/assets/prism.css` - GitHub-inspired code theme with dark mode

**Phase 5 Files Modified:**
- `src/render/components/part.ts` - All part type renderers
- `src/assets/styles.css` - CSS for all new part types
- `src/render/templates/base.ts` - Include new CSS/JS assets
- `src/render/html.ts` - Copy new assets to output
- `src/utils/html.ts` - Enhanced markdown with code block wrappers

### Phase 6: Pagination & Navigation (COMPLETED)
- [x] Implement conversation pagination (5 prompts/page)
  - `paginateMessages()` in `src/render/html.ts` groups messages by user prompts
  - Configurable via `PROMPTS_PER_PAGE` constant (default: 5)
- [x] Add prev/next navigation
  - Previous/Next links with arrow indicators
  - Disabled state styling when at first/last page
- [x] Add page number links
  - Smart pagination with ellipsis for large page counts (8+ pages)
  - Shows: first page, window around current page, last page
  - Example: `1 ... 9 10 11 ... 20` when on page 10 of 20
- [x] Deep-link support (anchor to specific messages)
  - Each message has `id="{message.id}"` attribute
  - Timeline entries link to `page-XXX.html#msg-{id}`

**Phase 6 Files Modified:**
- `src/render/templates/page.ts` - Added `getPageNumbers()` for smart pagination, updated `renderPagination()`
- `src/assets/styles.css` - Added `.pagination-ellipsis` styling

**Phase 6 Design Decisions:**
- Threshold for smart pagination: 7 pages (8+ triggers ellipsis mode)
- Window size: 1 page on each side of current page
- Always shows first and last page for quick navigation

### Phase 7: Search (COMPLETED)
- [x] Implement search index generation (on-demand page fetching, no pre-built index)
- [x] Create search.js client-side search
  - Fetches paginated HTML pages on-demand
  - Case-insensitive substring matching in `.message` elements
  - Batched fetching (3 pages at a time for performance)
  - Streaming UX - results appear as pages are processed
- [x] Add search UI (modal)
  - HTML `<dialog>` element for accessibility
  - Search input with magnifying glass icon
  - Status text showing progress ("Found X result(s) in Y/Z pages...")
  - Scrollable results container with role badges
- [x] URL fragment support (`#search=query`)
  - Auto-opens modal and performs search on page load
  - Updates URL when searching for shareable links
- [x] Keyboard shortcut (Ctrl+K / Cmd+K)
- [x] Result highlighting with `<mark>` tags using TreeWalker
- [x] Progressive enhancement - hidden for `file://` protocol (CORS limitation)
- [x] Dark mode support for all search elements
- [x] Responsive design for mobile

**Phase 7 Files Created:**
- `src/assets/search.js` - Complete search implementation (~350 lines)

**Phase 7 Files Modified:**
- `src/assets/styles.css` - Added ~200 lines of search modal and result styles
- `src/render/templates/base.ts` - Added `totalPages` data attribute support
- `src/render/templates/page.ts` - Pass `totalPages` to base template
- `src/render/templates/session.ts` - Pass `totalPages` to base template
- `src/render/html.ts` - Copy search.js to output assets

**Search UX Pattern (matching claude-code-transcripts):**
- On session pages: searches within `.message` elements across all paginated pages
- On index page: searches session titles and previews (no fetching needed)
- Results link directly to messages via `page-XXX.html#msg-{id}`
- Max 100 results displayed to prevent performance issues

### Phase 7.5: Git Commit Integration
- [ ] Extract git commits from bash tool outputs (parse `git commit` and `git push` commands)
- [ ] Parse commit hashes and messages from tool output
- [ ] Add commit cards to session timeline (like claude-code-transcripts)
- [ ] Support `--repo OWNER/NAME` CLI flag for GitHub commit links
- [ ] Auto-detect repo from git remote if not specified
- [ ] Display commits inline in timeline between prompts
- [ ] Link commit hashes to GitHub when repo is known

**Commit Detection Strategy:**
- Scan bash tool outputs for patterns like:
  - `[branch hash] commit message` (git commit output)
  - `To github.com:owner/repo.git` followed by commit range (git push output)
- Extract: hash (short), message, timestamp (from tool execution time)
- Store commits associated with the preceding user prompt

**UI Design:**
- Commit cards styled similar to claude-code-transcripts (orange/amber theme)
- Show commit hash (monospace, linked if repo known), message, timestamp
- Position between timeline entries where the commit occurred

### Phase 8: CLI Polish (COMPLETED)
- [x] Implement all CLI flags (--all, --auto, --output, --session, --json, --open, --storage, --serve, --port, --no-generate, --quiet, --verbose, --help, --version)
- [x] Add progress output with session counts ([3/15] Session Title)
- [x] Add `--open` browser launch (cross-platform: macOS, Windows, Linux)
- [x] Error handling and helpful messages with actionable suggestions
- [x] Add -a/--auto flag for auto-naming output directory from project/session
- [x] Add colored terminal output (respects NO_COLOR env var)
- [x] Add -q/--quiet flag to suppress non-essential output
- [x] Add --verbose flag for detailed debug output
- [x] Add summary statistics at end of generation (sessions, pages, messages)
- [x] Storage path validation with helpful error messages

### Phase 9: Testing & Documentation
- [ ] Test with real OpenCode sessions
- [ ] Test edge cases (empty sessions, huge sessions)
- [ ] Write README with usage examples
- [ ] Add screenshots/examples

### Phase 10: Publishing
- [ ] Publish to npm
- [ ] Add GitHub Actions for releases
- [ ] Create example output for demo

## Design Decisions

### Why TypeScript/Bun?
- Matches OpenCode's stack
- Can directly reference OpenCode's type definitions for accuracy
- Bun provides fast file I/O and glob support
- npm distribution is natural for the ecosystem

### Why Static HTML (not live server)?
- Simpler architecture
- Output is portable and shareable
- Can host anywhere (GitHub Pages, Gist, local file://)
- No runtime dependencies for viewing
- Follows proven pattern from claude-code-transcripts

### Why Separate Asset Files?
- Easier to customize/theme later
- Better caching if serving from web server
- Cleaner separation of concerns
- Can be changed to embedded in v2 if needed

### Why Raw Template Strings (not JSX/templating engine)?
- Zero dependencies
- Full type safety
- Simple to understand and modify
- Fast compilation
- Good enough for static HTML generation

## Future Considerations (Post v1)

- **v1.1: TUI mode** - Browse sessions interactively in terminal
- **v1.2: Live server mode** - Optional local server with hot reload
- **v1.3: Cost analytics** - Token usage graphs and cost summaries
- **v1.4: Custom themes** - Theme configuration file support
- **v1.5: Gist publishing** - `--gist` flag to upload HTML to GitHub Gist and get shareable preview URL:
  - Requires GitHub CLI (`gh`) to be installed and authenticated
  - Upload all generated HTML files to a new gist
  - Return gist URL and gistpreview.github.io preview URL
  - Inject JavaScript to fix relative links when served through gistpreview
  - Combine with `-o` to keep local copy alongside gist upload
- **v1.6: Pattern Analytics Dashboard** - Cross-session analysis for self-improvement:
  - Prompt effectiveness scoring (iterations to completion)
  - Tool usage frequency and patterns
  - Token efficiency trends over time
  - Common failure modes identification
  - Session duration vs. complexity metrics
  - Model comparison (if using multiple models)
- **v1.7: PR Integration Helpers** - Features specifically for code review:
  - Single-file HTML export for easy attachment
  - Session summary generation (AI-generated or templated)
  - Diff-focused view showing only file changes
  - Cost/token summary badge for PR comments

## References

- [OpenCode Storage Architecture](./opencode-storage-implementation.md) - Detailed analysis of OpenCode's storage system
- [claude-code-transcripts](https://github.com/simonw/claude-code-transcripts) - Inspiration project for Claude Code
- [OpenCode Repository](https://github.com/sst/opencode) - Source code reference

---

# Implementation Reference

This section contains detailed implementation guidance extracted from research on OpenCode's storage system and the claude-code-transcripts project.

## Complete TypeScript Type Definitions

These types should be placed in `src/storage/types.ts`. They mirror OpenCode's Zod schemas.

```typescript
// =============================================================================
// BASE TYPES
// =============================================================================

export interface TimeStamps {
  created: number  // Unix milliseconds
  updated: number
}

export interface SessionTime extends TimeStamps {
  compacting?: number
  archived?: number
}

// =============================================================================
// PROJECT
// =============================================================================

export interface Project {
  id: string                    // SHA-1 hash of worktree path
  worktree: string              // Absolute path to project root
  vcsDir?: string               // Path to .git directory
  vcs?: "git"
  name?: string
  time: TimeStamps
}

// =============================================================================
// SESSION
// =============================================================================

export interface SessionSummary {
  additions?: number
  deletions?: number
  files?: number
}

export interface SessionShare {
  url: string
}

export interface SessionRevert {
  messageID: string
  partID?: string
}

export interface Session {
  id: string                    // "ses_{timestamp}{random}"
  projectID: string             // References Project.id
  directory: string             // Working directory
  title: string                 // Auto-generated or user-set
  version: string               // OpenCode version (e.g., "1.0.207")
  time: SessionTime
  parentID?: string             // For branched sessions
  share?: SessionShare
  revert?: SessionRevert
  summary?: SessionSummary
}

// =============================================================================
// MESSAGE
// =============================================================================

export interface MessageModel {
  providerID: string            // "anthropic", "openai", etc.
  modelID: string               // "claude-sonnet-4-20250514", etc.
}

export interface MessagePath {
  cwd: string
  root: string
}

export interface TokenUsage {
  input: number
  output: number
  reasoning: number
  cache?: {
    read: number
    write: number
  }
}

export interface FileDiff {
  file: string
  additions: number
  deletions: number
}

export interface UserMessageSummary {
  title?: string
  diffs?: FileDiff[]
}

// Base message fields
interface MessageBase {
  id: string                    // "msg_{timestamp}{random}"
  sessionID: string
}

// User message
export interface UserMessage extends MessageBase {
  role: "user"
  time: { created: number }
  model: MessageModel
  agent?: string                // "build", "docs", "plan", etc.
  system?: string               // Custom system prompt
  tools?: Record<string, boolean>  // Tool permissions
  summary?: UserMessageSummary
}

// Assistant message
export interface AssistantMessage extends MessageBase {
  role: "assistant"
  time: { created: number; completed?: number }
  parentID: string              // Links to UserMessage.id
  providerID: string
  modelID: string
  mode: string                  // "code", "compaction", etc.
  agent?: string
  path?: MessagePath
  cost?: number
  tokens?: TokenUsage
  finish?: "stop" | "tool-calls" | "length" | "content-filter" | "error" | "unknown"
  summary?: string
  error?: {
    name: string
    message: string
  }
}

export type Message = UserMessage | AssistantMessage

// =============================================================================
// PARTS
// =============================================================================

interface PartBase {
  id: string                    // "prt_{timestamp}{sequence}"
  sessionID: string
  messageID: string
}

// Text Part - User input or assistant response text
export interface TextPart extends PartBase {
  type: "text"
  text: string
  synthetic?: boolean           // Generated, not from model
  ignored?: boolean
  time?: { start?: number; end?: number }
  metadata?: Record<string, unknown>
}

// Reasoning Part - Extended thinking
export interface ReasoningPart extends PartBase {
  type: "reasoning"
  text: string
  time: { start: number; end?: number }
  metadata?: Record<string, unknown>
}

// Tool Part - Tool invocation with state
export interface ToolPartState {
  status: "pending" | "running" | "completed" | "error"
  input?: Record<string, unknown>
  output?: string
  error?: string
  metadata?: Record<string, unknown>
  title?: string
  time?: { start: number; end: number }
}

export interface ToolPart extends PartBase {
  type: "tool"
  tool: string                  // Tool name: "bash", "read", "edit", etc.
  callID: string                // Unique call identifier
  state: ToolPartState
  metadata?: Record<string, unknown>
}

// File Part - Attachments
export interface FilePart extends PartBase {
  type: "file"
  mime: string
  filename?: string
  url: string                   // data: URL or file path
  source?: {
    type: "user" | "tool"
    toolName?: string
    toolCallID?: string
  }
}

// Snapshot Part - Undo/redo markers
export interface SnapshotPart extends PartBase {
  type: "snapshot"
  snapshot: string              // Snapshot ID
}

// Patch Part - File changes
export interface PatchPart extends PartBase {
  type: "patch"
  hash: string
  files: string[]
}

// Agent Part - Sub-agent invocations
export interface AgentPart extends PartBase {
  type: "agent"
  name: string                  // Agent name
  source?: { value: string }
}

// Compaction Part - Context compaction marker
export interface CompactionPart extends PartBase {
  type: "compaction"
  auto: boolean
}

// Subtask Part - Task tool invocations
export interface SubtaskPart extends PartBase {
  type: "subtask"
  prompt: string
  description: string
  agent: string
  command?: string
}

// Retry Part - Retry attempt marker
export interface RetryPart extends PartBase {
  type: "retry"
  attempt: number
  error: {
    name: string
    message: string
    code?: string
  }
}

// Union of all part types
export type Part =
  | TextPart
  | ReasoningPart
  | ToolPart
  | FilePart
  | SnapshotPart
  | PatchPart
  | AgentPart
  | CompactionPart
  | SubtaskPart
  | RetryPart

// Message with its parts
export interface MessageWithParts {
  info: Message
  parts: Part[]
}

// =============================================================================
// ADDITIONAL STORAGE ENTITIES
// =============================================================================

// Session Diff - File changes for undo/redo
export interface SessionDiffEntry {
  file: string
  before: string
  after: string
  additions: number
  deletions: number
}

export type SessionDiff = SessionDiffEntry[]

// Todo - Task list
export interface TodoItem {
  id: string
  content: string
  priority: "high" | "medium" | "low"
  status: "pending" | "in_progress" | "completed" | "cancelled"
}

export type TodoList = TodoItem[]
```

## Storage Reader Implementation

```typescript
// src/storage/reader.ts
import { readdir, readFile } from "fs/promises"
import { join } from "path"
import { homedir } from "os"
import type {
  Project,
  Session,
  Message,
  Part,
  MessageWithParts,
  SessionDiff,
  TodoList,
} from "./types"

// Default storage path
export function getDefaultStoragePath(): string {
  return join(homedir(), ".local", "share", "opencode", "storage")
}

// Read and parse JSON file
async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    const content = await readFile(filePath, "utf-8")
    return JSON.parse(content) as T
  } catch (error) {
    // File doesn't exist or invalid JSON
    return null
  }
}

// List all JSON files in a directory (non-recursive)
async function listJsonFiles(dirPath: string): Promise<string[]> {
  try {
    const entries = await readdir(dirPath, { withFileTypes: true })
    return entries
      .filter((e) => e.isFile() && e.name.endsWith(".json"))
      .map((e) => e.name.replace(".json", ""))
  } catch {
    return []
  }
}

// List subdirectories
async function listDirs(dirPath: string): Promise<string[]> {
  try {
    const entries = await readdir(dirPath, { withFileTypes: true })
    return entries.filter((e) => e.isDirectory()).map((e) => e.name)
  } catch {
    return []
  }
}

// =============================================================================
// PUBLIC API
// =============================================================================

export async function listProjects(storagePath: string): Promise<Project[]> {
  const projectDir = join(storagePath, "project")
  const projectIds = await listJsonFiles(projectDir)

  const projects: Project[] = []
  for (const id of projectIds) {
    const project = await readJson<Project>(join(projectDir, `${id}.json`))
    if (project) projects.push(project)
  }

  // Sort by most recently updated
  return projects.sort((a, b) => b.time.updated - a.time.updated)
}

export async function listSessions(
  storagePath: string,
  projectId: string
): Promise<Session[]> {
  const sessionDir = join(storagePath, "session", projectId)
  const sessionIds = await listJsonFiles(sessionDir)

  const sessions: Session[] = []
  for (const id of sessionIds) {
    const session = await readJson<Session>(join(sessionDir, `${id}.json`))
    if (session) sessions.push(session)
  }

  // Sort by most recently updated
  return sessions.sort((a, b) => b.time.updated - a.time.updated)
}

export async function getSession(
  storagePath: string,
  projectId: string,
  sessionId: string
): Promise<Session | null> {
  return readJson<Session>(
    join(storagePath, "session", projectId, `${sessionId}.json`)
  )
}

export async function listMessages(
  storagePath: string,
  sessionId: string
): Promise<Message[]> {
  const messageDir = join(storagePath, "message", sessionId)
  const messageIds = await listJsonFiles(messageDir)

  const messages: Message[] = []
  for (const id of messageIds) {
    const message = await readJson<Message>(join(messageDir, `${id}.json`))
    if (message) messages.push(message)
  }

  // Sort by ID (which contains timestamp) - chronological order
  return messages.sort((a, b) => (a.id > b.id ? 1 : -1))
}

export async function listParts(
  storagePath: string,
  messageId: string
): Promise<Part[]> {
  const partDir = join(storagePath, "part", messageId)
  const partIds = await listJsonFiles(partDir)

  const parts: Part[] = []
  for (const id of partIds) {
    const part = await readJson<Part>(join(partDir, `${id}.json`))
    if (part) parts.push(part)
  }

  // Sort by ID - chronological order
  return parts.sort((a, b) => (a.id > b.id ? 1 : -1))
}

export async function getMessagesWithParts(
  storagePath: string,
  sessionId: string
): Promise<MessageWithParts[]> {
  const messages = await listMessages(storagePath, sessionId)

  const result: MessageWithParts[] = []
  for (const message of messages) {
    const parts = await listParts(storagePath, message.id)
    result.push({ info: message, parts })
  }

  return result
}

export async function getSessionDiff(
  storagePath: string,
  sessionId: string
): Promise<SessionDiff | null> {
  return readJson<SessionDiff>(
    join(storagePath, "session_diff", `${sessionId}.json`)
  )
}

export async function getTodoList(
  storagePath: string,
  sessionId: string
): Promise<TodoList | null> {
  return readJson<TodoList>(join(storagePath, "todo", `${sessionId}.json`))
}

// Get project by current working directory
export async function findProjectByPath(
  storagePath: string,
  workdir: string
): Promise<Project | null> {
  const projects = await listProjects(storagePath)
  return projects.find((p) => workdir.startsWith(p.worktree)) ?? null
}

// Get all sessions across all projects
export async function listAllSessions(
  storagePath: string
): Promise<Array<{ project: Project; session: Session }>> {
  const projects = await listProjects(storagePath)
  const results: Array<{ project: Project; session: Session }> = []

  for (const project of projects) {
    const sessions = await listSessions(storagePath, project.id)
    for (const session of sessions) {
      results.push({ project, session })
    }
  }

  // Sort by session update time
  return results.sort((a, b) => b.session.time.updated - a.session.time.updated)
}
```

## Tool Input/Output Structures

Each tool has specific input parameters and output formats. These are critical for rendering.

### bash Tool

```typescript
interface BashToolInput {
  command: string
  description?: string
  timeout?: number
  workdir?: string
}

// Output is plain string (stdout/stderr combined)
// May be truncated with "... (truncated)" suffix
```

**Rendering approach:**
- Show command with `$` prefix in monospace
- Collapsible output section
- Error styling if status is "error"

### read Tool

```typescript
interface ReadToolInput {
  filePath: string
  offset?: number
  limit?: number
}

// Output format: "cat -n" style with line numbers
// Example:
// "    1\tconst foo = 'bar'\n    2\tfunction test() {\n..."
```

**Rendering approach:**
- Show file path as header
- Content with line numbers preserved
- Syntax highlighting (future)

### write Tool

```typescript
interface WriteToolInput {
  filePath: string
  content: string
}

// Output: usually empty or confirmation message
```

**Rendering approach:**
- Show file path with "Created" or "Updated" badge
- Collapsible content preview
- Show line count

### edit Tool

```typescript
interface EditToolInput {
  filePath: string
  oldString: string
  newString: string
  replaceAll?: boolean
}

// Output: usually empty or confirmation
```

**Rendering approach:**
- Show file path
- Side-by-side or unified diff view
- Highlight removed (red) and added (green) lines

### glob Tool

```typescript
interface GlobToolInput {
  pattern: string
  path?: string
}

// Output: newline-separated list of matching file paths
```

**Rendering approach:**
- Show pattern
- File list with icons

### grep Tool

```typescript
interface GrepToolInput {
  pattern: string      // Regex pattern
  path?: string
  include?: string     // File pattern filter
}

// Output format:
// "filepath:linenum:content" per match
```

**Rendering approach:**
- Show pattern and include filter
- List of matches with file:line links

### task Tool

```typescript
interface TaskToolInput {
  description: string
  prompt: string
  subagent_type: string  // "general", "explore", "reviewer", "docs"
  command?: string
  session_id?: string
}

// Output: agent's response text
```

**Rendering approach:**
- Badge showing agent type
- Collapsible prompt
- Expandable result

### todowrite Tool

```typescript
interface TodoWriteToolInput {
  todos: Array<{
    id: string
    content: string
    status: "pending" | "in_progress" | "completed" | "cancelled"
    priority: "high" | "medium" | "low"
  }>
}

// Output: usually empty
```

**Rendering approach:**
- Checklist with status icons:
  - `completed`: ✓ (green)
  - `in_progress`: → (blue)
  - `pending`: ○ (gray)
  - `cancelled`: ✗ (red)
- Priority indicators

### webfetch Tool

```typescript
interface WebFetchToolInput {
  url: string
  format?: "text" | "markdown" | "html"
  timeout?: number
}

// Output: fetched content (possibly summarized)
```

**Rendering approach:**
- Clickable URL
- Collapsible content preview

### batch Tool

```typescript
interface BatchToolInput {
  tool_calls: Array<{
    tool: string
    parameters: Record<string, unknown>
  }>
}

// Output: combined results from all calls
```

**Rendering approach:**
- Show as nested tool calls
- Each sub-call rendered with its own tool renderer

## HTML/CSS Design Patterns from claude-code-transcripts

### Color Scheme

```css
:root {
  /* Message backgrounds */
  --user-bg: #e3f2fd;           /* Light blue for user */
  --assistant-bg: #f5f5f5;      /* Light gray for assistant */
  --tool-bg: #fff3e0;           /* Light orange for tool results */
  --error-bg: #ffebee;          /* Light red for errors */
  --reasoning-bg: #fffde7;      /* Light yellow for thinking */

  /* Tool-specific colors */
  --bash-bg: #f3e5f5;           /* Purple tint */
  --write-bg: linear-gradient(135deg, #e8f5e9, #c8e6c9);  /* Green gradient */
  --edit-bg: linear-gradient(135deg, #fff3e0, #ffe0b2);   /* Orange gradient */
  --read-bg: #e8eaf6;           /* Indigo tint */

  /* Status colors */
  --success: #4caf50;
  --error: #f44336;
  --warning: #ff9800;
  --info: #2196f3;

  /* Text */
  --text-primary: #212121;
  --text-secondary: #757575;
  --code-bg: #1e1e1e;
  --code-text: #d4d4d4;
}
```

### Message Structure

```html
<!-- User message -->
<div class="message message-user" id="msg-{timestamp}">
  <div class="message-header">
    <span class="message-role">USER</span>
    <span class="message-time">{formatted-time}</span>
  </div>
  <div class="message-content">
    {rendered content}
  </div>
</div>

<!-- Assistant message -->
<div class="message message-assistant" id="msg-{timestamp}">
  <div class="message-header">
    <span class="message-role">ASSISTANT</span>
    <span class="message-time">{formatted-time}</span>
    <span class="message-model">{model-name}</span>
  </div>
  <div class="message-content">
    {rendered content}
  </div>
  <div class="message-stats">
    <span class="stat">Tokens: {input}/{output}</span>
    <span class="stat">Cost: ${cost}</span>
  </div>
</div>
```

### Tool Call Structure

```html
<!-- Tool call container -->
<div class="tool-call tool-{toolname}" data-status="{status}">
  <div class="tool-header">
    <span class="tool-icon">{icon}</span>
    <span class="tool-name">{toolname}</span>
    <span class="tool-title">{title or summary}</span>
    <button class="tool-toggle">▼</button>
  </div>
  <div class="tool-body">
    <div class="tool-input">
      {rendered input}
    </div>
    <div class="tool-output">
      {rendered output}
    </div>
  </div>
</div>
```

### Specific Tool Renderings

#### Bash Tool
```html
<div class="tool-call tool-bash">
  <div class="tool-header">
    <span class="tool-icon">$</span>
    <span class="tool-command">{command}</span>
    <span class="tool-description">{description}</span>
  </div>
  <div class="tool-output">
    <pre><code>{output}</code></pre>
  </div>
</div>
```

#### Edit Tool (Diff View)
```html
<div class="tool-call tool-edit">
  <div class="tool-header">
    <span class="tool-icon">✏️</span>
    <span class="tool-file">{filePath}</span>
  </div>
  <div class="tool-diff">
    <div class="diff-old">
      <div class="diff-label">Old</div>
      <pre><code class="diff-removed">{oldString}</code></pre>
    </div>
    <div class="diff-new">
      <div class="diff-label">New</div>
      <pre><code class="diff-added">{newString}</code></pre>
    </div>
  </div>
</div>
```

#### TodoWrite Tool
```html
<div class="tool-call tool-todowrite">
  <div class="tool-header">
    <span class="tool-icon">📋</span>
    <span class="tool-name">Todo List Updated</span>
  </div>
  <ul class="todo-list">
    <li class="todo-item todo-completed">
      <span class="todo-status">✓</span>
      <span class="todo-content">{content}</span>
      <span class="todo-priority priority-high">high</span>
    </li>
    <li class="todo-item todo-in-progress">
      <span class="todo-status">→</span>
      <span class="todo-content">{content}</span>
    </li>
    <li class="todo-item todo-pending">
      <span class="todo-status">○</span>
      <span class="todo-content">{content}</span>
    </li>
  </ul>
</div>
```

### Index Page Structure

```html
<div class="index-page">
  <header class="page-header">
    <h1>{project-name}</h1>
    <div class="stats">
      <span>{n} sessions</span>
      <span>{total-messages} messages</span>
    </div>
    <div class="search-container">
      <input type="search" id="search" placeholder="Search sessions...">
    </div>
  </header>

  <div class="session-list">
    <div class="session-card" data-session-id="{id}">
      <div class="session-title">{title}</div>
      <div class="session-meta">
        <span class="session-date">{formatted-date}</span>
        <span class="session-messages">{n} messages</span>
      </div>
      <div class="session-summary">
        {first-prompt-preview}
      </div>
      <div class="session-stats">
        <span class="stat-changes">+{additions} -{deletions}</span>
        <span class="stat-files">{files} files</span>
      </div>
    </div>
  </div>
</div>
```

### Session Timeline Page

```html
<div class="session-page">
  <header class="session-header">
    <h1>{session-title}</h1>
    <div class="session-meta">
      <span>Created: {date}</span>
      <span>Duration: {duration}</span>
      <span>Model: {model}</span>
    </div>
  </header>

  <div class="session-timeline">
    <!-- Each prompt is a timeline entry -->
    <div class="timeline-entry">
      <div class="timeline-marker">#1</div>
      <div class="timeline-content">
        <a href="page-001.html#msg-{id}" class="prompt-link">
          {prompt-preview}
        </a>
        <div class="timeline-stats">
          <span>5 bash</span>
          <span>3 edit</span>
          <span>2 read</span>
        </div>
      </div>
    </div>
  </div>

  <nav class="pagination">
    <a href="page-001.html">Page 1</a>
    <a href="page-002.html">Page 2</a>
    ...
  </nav>
</div>
```

## Utility Functions

### ID Timestamp Parsing

```typescript
// src/utils/id.ts

/**
 * OpenCode IDs contain embedded timestamps.
 * Format: "{prefix}_{timestamp}{random}"
 * Example: "ses_4957d04cdffeJwdujYPBCKpIsb"
 *
 * The timestamp appears to be a modified base-36 or hex encoding.
 * For sorting, we can just compare IDs lexicographically since
 * the timestamp portion comes first after the prefix.
 */

export function parseIdTimestamp(id: string): Date | null {
  // Extract timestamp portion (after prefix_)
  const match = id.match(/^[a-z]+_([0-9a-f]+)/i)
  if (!match) return null

  // The timestamp is hex-encoded milliseconds
  const hex = match[1]
  const ms = parseInt(hex, 16)

  if (isNaN(ms)) return null
  return new Date(ms)
}

export function compareIds(a: string, b: string): number {
  // IDs are designed to sort chronologically
  return a.localeCompare(b)
}
```

### Date Formatting

```typescript
// src/utils/format.ts

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function formatDuration(startMs: number, endMs: number): string {
  const seconds = Math.floor((endMs - startMs) / 1000)

  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${hours}h ${minutes}m`
}

export function formatTokens(tokens: number): string {
  if (tokens < 1000) return tokens.toString()
  if (tokens < 1000000) return `${(tokens / 1000).toFixed(1)}k`
  return `${(tokens / 1000000).toFixed(2)}M`
}

export function formatCost(cost: number): string {
  if (cost === 0) return "—"
  if (cost < 0.01) return `$${cost.toFixed(4)}`
  return `$${cost.toFixed(2)}`
}
```

### HTML Escaping

```typescript
// src/utils/html.ts

const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
}

export function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char])
}

export function escapeAttr(str: string): string {
  return str.replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char])
}

// Convert newlines to <br> tags
export function nl2br(str: string): string {
  return escapeHtml(str).replace(/\n/g, "<br>")
}

// Render markdown-like content (basic)
export function renderMarkdown(text: string): string {
  let html = escapeHtml(text)

  // Code blocks
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre><code class="language-${lang}">${code.trim()}</code></pre>`
  })

  // Inline code
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>")

  // Bold
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")

  // Italic
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>")

  // Links
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank">$1</a>'
  )

  // Paragraphs
  html = html.replace(/\n\n/g, "</p><p>")
  html = `<p>${html}</p>`

  return html
}
```

## Search Implementation

```javascript
// src/assets/search.js

(function () {
  // Search index: built on first search
  let searchIndex = null
  let searchModal = null

  // Build index from all session data embedded in pages
  async function buildSearchIndex() {
    if (searchIndex) return searchIndex

    searchIndex = []

    // Find all session links on the page
    const sessionCards = document.querySelectorAll("[data-session-id]")

    for (const card of sessionCards) {
      const sessionId = card.dataset.sessionId
      const title = card.querySelector(".session-title")?.textContent || ""
      const preview = card.querySelector(".session-summary")?.textContent || ""

      searchIndex.push({
        type: "session",
        id: sessionId,
        title,
        content: `${title} ${preview}`.toLowerCase(),
        url: `sessions/${sessionId}/index.html`,
      })
    }

    // Also index message content from current page (if on a conversation page)
    const messages = document.querySelectorAll(".message")
    for (const msg of messages) {
      const id = msg.id
      const content = msg.querySelector(".message-content")?.textContent || ""

      searchIndex.push({
        type: "message",
        id,
        title: content.slice(0, 100),
        content: content.toLowerCase(),
        url: `#${id}`,
      })
    }

    return searchIndex
  }

  // Search function
  function search(query) {
    if (!searchIndex) return []

    const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
    if (terms.length === 0) return []

    return searchIndex.filter((item) =>
      terms.every((term) => item.content.includes(term))
    )
  }

  // Create and show modal
  function showSearchModal() {
    if (searchModal) {
      searchModal.style.display = "flex"
      searchModal.querySelector("input").focus()
      return
    }

    searchModal = document.createElement("div")
    searchModal.className = "search-modal"
    searchModal.innerHTML = `
      <div class="search-modal-content">
        <div class="search-header">
          <input type="search" placeholder="Search sessions and messages..." autofocus>
          <button class="search-close">&times;</button>
        </div>
        <div class="search-results"></div>
      </div>
    `

    document.body.appendChild(searchModal)

    const input = searchModal.querySelector("input")
    const results = searchModal.querySelector(".search-results")
    const closeBtn = searchModal.querySelector(".search-close")

    let debounceTimer = null
    input.addEventListener("input", () => {
      clearTimeout(debounceTimer)
      debounceTimer = setTimeout(async () => {
        await buildSearchIndex()
        const matches = search(input.value)
        renderResults(results, matches, input.value)
      }, 150)
    })

    closeBtn.addEventListener("click", hideSearchModal)
    searchModal.addEventListener("click", (e) => {
      if (e.target === searchModal) hideSearchModal()
    })

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") hideSearchModal()
    })
  }

  function hideSearchModal() {
    if (searchModal) {
      searchModal.style.display = "none"
    }
  }

  function renderResults(container, matches, query) {
    if (matches.length === 0) {
      container.innerHTML = query
        ? '<div class="no-results">No results found</div>'
        : ""
      return
    }

    container.innerHTML = matches
      .slice(0, 50)
      .map(
        (item) => `
        <a href="${item.url}" class="search-result">
          <span class="result-type">${item.type}</span>
          <span class="result-title">${escapeHtml(item.title)}</span>
        </a>
      `
      )
      .join("")
  }

  function escapeHtml(str) {
    const div = document.createElement("div")
    div.textContent = str
    return div.innerHTML
  }

  // Initialize
  document.addEventListener("DOMContentLoaded", () => {
    // Keyboard shortcut: Cmd/Ctrl + K
    document.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        showSearchModal()
      }
    })

    // Search button click
    const searchBtn = document.querySelector(".search-trigger")
    if (searchBtn) {
      searchBtn.addEventListener("click", showSearchModal)
    }

    // Check URL hash for search query
    const hash = window.location.hash
    if (hash.startsWith("#search=")) {
      const query = decodeURIComponent(hash.slice(8))
      showSearchModal()
      setTimeout(() => {
        const input = searchModal.querySelector("input")
        input.value = query
        input.dispatchEvent(new Event("input"))
      }, 100)
    }
  })
})()
```

## package.json Template

```json
{
  "name": "opencode-replay",
  "version": "0.1.0",
  "description": "Generate static HTML transcripts from OpenCode sessions",
  "type": "module",
  "bin": {
    "opencode-replay": "./dist/index.js"
  },
  "files": [
    "dist"
  ],
  "scripts": {
    "build": "bun build ./src/index.ts --outdir ./dist --target node",
    "dev": "bun run ./src/index.ts",
    "typecheck": "tsc --noEmit",
    "prepublishOnly": "bun run build"
  },
  "dependencies": {},
  "devDependencies": {
    "@types/bun": "latest",
    "typescript": "^5.0.0"
  },
  "keywords": [
    "opencode",
    "ai",
    "coding",
    "transcripts",
    "sessions",
    "html"
  ],
  "author": "",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/username/opencode-replay"
  }
}
```

## tsconfig.json Template

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "resolveJsonModule": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["bun-types"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## CLI Entry Point Template

```typescript
// src/index.ts
import { parseArgs } from "util"
import { resolve } from "path"
import { getDefaultStoragePath } from "./storage/reader"
import { generateHtml } from "./render/html"

const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    all: { type: "boolean", short: "a", default: false },
    output: { type: "string", short: "o" },
    session: { type: "string", short: "s" },
    json: { type: "boolean", default: false },
    open: { type: "boolean", default: false },
    storage: { type: "string" },
    help: { type: "boolean", short: "h", default: false },
    version: { type: "boolean", short: "v", default: false },
  },
  allowPositionals: true,
})

if (values.help) {
  console.log(`
opencode-replay - Generate static HTML transcripts from OpenCode sessions

Usage:
  opencode-replay [options]

Options:
  -a, --all              Generate for all projects (default: current project only)
  -o, --output <dir>     Output directory (default: ./opencode-replay-output)
  -s, --session <id>     Generate for specific session only
  --json                 Include raw JSON export alongside HTML
  --open                 Open in browser after generation
  --storage <path>       Custom storage path (default: ~/.local/share/opencode/storage)
  -h, --help             Show this help message
  -v, --version          Show version

Examples:
  opencode-replay                     # Current project's sessions
  opencode-replay --all               # All projects
  opencode-replay -o ./my-transcripts # Custom output directory
  opencode-replay --session ses_xxx   # Specific session only
`)
  process.exit(0)
}

if (values.version) {
  const pkg = await Bun.file("./package.json").json()
  console.log(pkg.version)
  process.exit(0)
}

// Main execution
const storagePath = values.storage ?? getDefaultStoragePath()
const outputDir = values.output ?? "./opencode-replay-output"

try {
  await generateHtml({
    storagePath,
    outputDir: resolve(outputDir),
    all: values.all ?? false,
    sessionId: values.session,
    includeJson: values.json ?? false,
  })

  console.log(`✓ Generated HTML transcripts in ${outputDir}`)

  if (values.open) {
    const indexPath = resolve(outputDir, "index.html")
    // Open in default browser
    const proc = Bun.spawn(["open", indexPath])
    await proc.exited
  }
} catch (error) {
  console.error("Error:", error instanceof Error ? error.message : error)
  process.exit(1)
}
```

## Real JSON Examples from OpenCode Storage

These are real examples from the storage to help with testing and understanding the data structure.

### Project Example
```json
{
  "id": "437bb51279515345f7b879a07f651cfa601f1648",
  "worktree": "/home/user/workspace/my-project",
  "vcsDir": "/home/user/workspace/my-project/.git",
  "vcs": "git",
  "time": {
    "created": 1765304018823,
    "updated": 1767040841159
  }
}
```

### Session Example
```json
{
  "id": "ses_4957d04cdffeJwdujYPBCKpIsb",
  "version": "1.0.207",
  "projectID": "437bb51279515345f7b879a07f651cfa601f1648",
  "directory": "/home/user/workspace/my-project",
  "title": "Migrating Salesforce loads from Matillion",
  "time": {
    "created": 1767018527538,
    "updated": 1767022799912
  },
  "summary": {
    "additions": 407,
    "deletions": 98,
    "files": 5
  }
}
```

### User Message Example
```json
{
  "id": "msg_b6a82fb38001Ei3X3A63gRCfuN",
  "sessionID": "ses_4957d04cdffeJwdujYPBCKpIsb",
  "role": "user",
  "time": { "created": 1767018527551 },
  "summary": { "title": "Migrating Salesforce jobs to Prefect", "diffs": [] },
  "agent": "build",
  "model": { "providerID": "anthropic", "modelID": "claude-opus-4-5" },
  "tools": {
    "todowrite": false,
    "bash": true,
    "edit": false
  }
}
```

### Assistant Message Example
```json
{
  "id": "msg_b6a82fb4d001AV4Y5VjLn2J4MS",
  "sessionID": "ses_4957d04cdffeJwdujYPBCKpIsb",
  "role": "assistant",
  "parentID": "msg_b6a82fb38001Ei3X3A63gRCfuN",
  "time": { "created": 1767018527565, "completed": 1767018690875 },
  "modelID": "claude-opus-4-5",
  "providerID": "anthropic",
  "mode": "build",
  "agent": "build",
  "path": { "cwd": "/home/user/project", "root": "/home/user/project" },
  "cost": 0.0234,
  "tokens": {
    "input": 15420,
    "output": 438,
    "reasoning": 0,
    "cache": { "read": 12000, "write": 18848 }
  },
  "finish": "tool-calls"
}
```

### Text Part Example
```json
{
  "id": "prt_990882f75002cw7B1Eg1BdaxzV",
  "type": "text",
  "text": "I want to modify the bindings.conf file to add new keybindings for window management.",
  "synthetic": false,
  "time": { "start": 0, "end": 0 },
  "messageID": "msg_990882f75001T0nOQd4qo23BmY",
  "sessionID": "ses_66f77d08fffe6XbrK2q9oQmmTA"
}
```

### Tool Part Example (bash)
```json
{
  "id": "prt_990884b1a001mwaFx5y2K922UF",
  "messageID": "msg_9908839fa001y36NNrb1hPFuOU",
  "sessionID": "ses_66f77d08fffe6XbrK2q9oQmmTA",
  "type": "tool",
  "tool": "bash",
  "callID": "tooluse_g2DCZWIQR9OmPuANGXzq6w",
  "state": {
    "status": "completed",
    "input": {
      "command": "ls -la ~/.config/hypr",
      "description": "List Hyprland config files"
    },
    "output": "total 48\ndrwxr-xr-x  2 user user 4096 Dec 15 10:30 .\ndrwxr-xr-x 45 user user 4096 Dec 20 14:22 ..\n-rw-r--r--  1 user user 2048 Dec 15 10:30 hyprland.conf\n",
    "metadata": {},
    "title": "List Hyprland config files",
    "time": { "start": 1759066475716, "end": 1759066475731 }
  }
}
```

### Tool Part Example (edit)
```json
{
  "id": "prt_990884c2a001xyz",
  "messageID": "msg_9908839fa001y36NNrb1hPFuOU",
  "sessionID": "ses_66f77d08fffe6XbrK2q9oQmmTA",
  "type": "tool",
  "tool": "edit",
  "callID": "tooluse_abc123",
  "state": {
    "status": "completed",
    "input": {
      "filePath": "/home/user/.config/hypr/bindings.conf",
      "oldString": "bind = $mod, Q, killactive",
      "newString": "bind = $mod, Q, killactive\nbind = $mod, F, fullscreen"
    },
    "output": "",
    "title": "bindings.conf",
    "time": { "start": 1759066476000, "end": 1759066476050 }
  }
}
```

### Tool Part Example (read)
```json
{
  "id": "prt_990884d3a001abc",
  "messageID": "msg_9908839fa001y36NNrb1hPFuOU",
  "sessionID": "ses_66f77d08fffe6XbrK2q9oQmmTA",
  "type": "tool",
  "tool": "read",
  "callID": "tooluse_def456",
  "state": {
    "status": "completed",
    "input": {
      "filePath": "/home/user/project/src/index.ts",
      "limit": 100
    },
    "output": "     1\timport { App } from './app'\n     2\t\n     3\tconst app = new App()\n     4\tapp.start()\n",
    "metadata": { "lineCount": 4 },
    "title": "src/index.ts",
    "time": { "start": 1759066477000, "end": 1759066477100 }
  }
}
```

### Reasoning Part Example
```json
{
  "id": "prt_990884e4a001def",
  "type": "reasoning",
  "text": "Let me think about how to approach this. The user wants to add keybindings, so I should first read the current configuration to understand the existing structure...",
  "time": { "start": 1759066474000, "end": 1759066475000 },
  "messageID": "msg_9908839fa001y36NNrb1hPFuOU",
  "sessionID": "ses_66f77d08fffe6XbrK2q9oQmmTA",
  "metadata": {
    "redacted": false
  }
}
```

### TodoWrite Tool Input Example
```json
{
  "todos": [
    {
      "id": "1",
      "content": "Read current Hyprland configuration",
      "status": "completed",
      "priority": "high"
    },
    {
      "id": "2",
      "content": "Add window management keybindings",
      "status": "in_progress",
      "priority": "high"
    },
    {
      "id": "3",
      "content": "Test new keybindings",
      "status": "pending",
      "priority": "medium"
    }
  ]
}
```

### Task Tool Input Example
```json
{
  "description": "Research Hyprland docs",
  "prompt": "Find documentation about Hyprland keybinding syntax and available actions for window management",
  "subagent_type": "docs"
}
```

## CSS Styles Template

```css
/* src/assets/styles.css */

:root {
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-mono: "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;

  --bg-primary: #ffffff;
  --bg-secondary: #f8f9fa;
  --bg-user: #e3f2fd;
  --bg-assistant: #f5f5f5;
  --bg-tool: #fff8e1;
  --bg-reasoning: #fffde7;
  --bg-error: #ffebee;
  --bg-code: #1e1e1e;

  --text-primary: #212121;
  --text-secondary: #616161;
  --text-muted: #9e9e9e;
  --text-code: #e0e0e0;

  --border-color: #e0e0e0;
  --border-radius: 8px;

  --color-success: #4caf50;
  --color-error: #f44336;
  --color-warning: #ff9800;
  --color-info: #2196f3;

  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: var(--font-sans);
  font-size: 15px;
  line-height: 1.6;
  color: var(--text-primary);
  background: var(--bg-primary);
}

/* Layout */
.container {
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem;
}

/* Header */
.page-header {
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color);
}

.page-header h1 {
  font-size: 1.75rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.page-header .meta {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

/* Messages */
.message {
  margin-bottom: 1.5rem;
  padding: 1rem;
  border-radius: var(--border-radius);
  border: 1px solid var(--border-color);
}

.message-user {
  background: var(--bg-user);
  border-color: #bbdefb;
}

.message-assistant {
  background: var(--bg-assistant);
}

.message-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
  font-size: 0.85rem;
}

.message-role {
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.message-user .message-role {
  color: #1565c0;
}

.message-assistant .message-role {
  color: #616161;
}

.message-time {
  color: var(--text-muted);
}

.message-model {
  color: var(--text-secondary);
  font-size: 0.8rem;
}

.message-content {
  white-space: pre-wrap;
  word-wrap: break-word;
}

.message-content p {
  margin-bottom: 0.75rem;
}

.message-content p:last-child {
  margin-bottom: 0;
}

.message-stats {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-color);
  font-size: 0.8rem;
  color: var(--text-muted);
  display: flex;
  gap: 1rem;
}

/* Tool calls */
.tool-call {
  margin: 1rem 0;
  border-radius: var(--border-radius);
  border: 1px solid var(--border-color);
  overflow: hidden;
}

.tool-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: var(--bg-tool);
  font-size: 0.9rem;
  cursor: pointer;
}

.tool-icon {
  font-weight: 600;
  opacity: 0.7;
}

.tool-name {
  font-weight: 600;
}

.tool-title {
  color: var(--text-secondary);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tool-toggle {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.8rem;
  color: var(--text-muted);
}

.tool-body {
  padding: 0.75rem;
  background: var(--bg-primary);
}

.tool-body.collapsed {
  display: none;
}

.tool-input,
.tool-output {
  margin-bottom: 0.5rem;
}

.tool-input:last-child,
.tool-output:last-child {
  margin-bottom: 0;
}

/* Code blocks */
pre {
  background: var(--bg-code);
  color: var(--text-code);
  padding: 1rem;
  border-radius: var(--border-radius);
  overflow-x: auto;
  font-family: var(--font-mono);
  font-size: 0.85rem;
  line-height: 1.5;
}

code {
  font-family: var(--font-mono);
  font-size: 0.9em;
  background: rgba(0, 0, 0, 0.05);
  padding: 0.1em 0.3em;
  border-radius: 3px;
}

pre code {
  background: none;
  padding: 0;
}

/* Tool-specific styles */
.tool-bash .tool-header {
  background: #f3e5f5;
}

.tool-bash .tool-icon::before {
  content: "$";
}

.tool-edit .tool-header {
  background: linear-gradient(135deg, #fff3e0, #ffe0b2);
}

.tool-write .tool-header {
  background: linear-gradient(135deg, #e8f5e9, #c8e6c9);
}

.tool-read .tool-header {
  background: #e8eaf6;
}

/* Diff view */
.diff-view {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.diff-old,
.diff-new {
  overflow: hidden;
}

.diff-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  margin-bottom: 0.25rem;
}

.diff-old .diff-label {
  color: var(--color-error);
}

.diff-new .diff-label {
  color: var(--color-success);
}

.diff-removed {
  background: #ffebee;
}

.diff-added {
  background: #e8f5e9;
}

/* Reasoning */
.reasoning {
  background: var(--bg-reasoning);
  border-left: 3px solid #ffc107;
  padding: 0.75rem 1rem;
  margin: 0.75rem 0;
  font-style: italic;
  color: var(--text-secondary);
}

.reasoning-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  color: #f57c00;
  margin-bottom: 0.25rem;
}

/* Todo list */
.todo-list {
  list-style: none;
}

.todo-item {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.25rem 0;
}

.todo-status {
  width: 1.25rem;
  text-align: center;
  font-weight: 600;
}

.todo-completed .todo-status {
  color: var(--color-success);
}

.todo-in-progress .todo-status {
  color: var(--color-info);
}

.todo-pending .todo-status {
  color: var(--text-muted);
}

.todo-cancelled .todo-status {
  color: var(--color-error);
}

.todo-priority {
  font-size: 0.7rem;
  padding: 0.1rem 0.3rem;
  border-radius: 3px;
  text-transform: uppercase;
}

.priority-high {
  background: #ffebee;
  color: var(--color-error);
}

.priority-medium {
  background: #fff3e0;
  color: var(--color-warning);
}

.priority-low {
  background: #e8f5e9;
  color: var(--color-success);
}

/* Session list */
.session-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.session-card {
  padding: 1rem;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  transition: box-shadow 0.2s;
}

.session-card:hover {
  box-shadow: var(--shadow-md);
}

.session-card a {
  text-decoration: none;
  color: inherit;
}

.session-title {
  font-weight: 600;
  font-size: 1.1rem;
  margin-bottom: 0.25rem;
}

.session-meta {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
}

.session-summary {
  color: var(--text-secondary);
  font-size: 0.9rem;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.session-stats {
  margin-top: 0.5rem;
  font-size: 0.8rem;
  color: var(--text-muted);
}

/* Pagination */
.pagination {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
}

.pagination a {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  text-decoration: none;
  color: var(--text-primary);
}

.pagination a:hover {
  background: var(--bg-secondary);
}

.pagination a.active {
  background: var(--color-info);
  color: white;
  border-color: var(--color-info);
}

/* Search modal */
.search-modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 10vh;
  z-index: 1000;
}

.search-modal-content {
  background: var(--bg-primary);
  border-radius: var(--border-radius);
  width: 100%;
  max-width: 600px;
  max-height: 70vh;
  overflow: hidden;
  box-shadow: var(--shadow-md);
}

.search-header {
  display: flex;
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
}

.search-header input {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  font-size: 1rem;
}

.search-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0 0.5rem;
  color: var(--text-muted);
}

.search-results {
  max-height: 50vh;
  overflow-y: auto;
}

.search-result {
  display: block;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border-color);
  text-decoration: none;
  color: var(--text-primary);
}

.search-result:hover {
  background: var(--bg-secondary);
}

.result-type {
  font-size: 0.7rem;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-right: 0.5rem;
}

.no-results {
  padding: 2rem;
  text-align: center;
  color: var(--text-muted);
}

/* Responsive */
@media (max-width: 768px) {
  .container {
    padding: 1rem;
  }

  .diff-view {
    grid-template-columns: 1fr;
  }

  .message-header {
    flex-wrap: wrap;
  }
}
```

This completes the implementation reference. All the code templates, type definitions, and examples are now documented for use during development.
