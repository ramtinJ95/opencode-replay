# Implementation Plan: Markdown Output & Gist Sharing

## Overview

Add two complementary features to opencode-replay:

1. **Markdown Output** (`--format md`) - Generate markdown for piping to gists or saving to files
2. **Gist Integration** (`--gist`) - Direct upload to GitHub Gists (Simon's approach)

This plan is split into phases, with shared foundation work first.

---

## Phase 1: Shared Foundation ✅ COMPLETED

**Goal:** Create the abstraction layer needed for both markdown and gist features.

**Status:** Completed on 2026-01-03

### 1.1 Create Output Format Types

**File:** `src/render/types.ts` (new)

```typescript
export type OutputFormat = "html" | "markdown" | "json"

export interface RenderContext {
  format: OutputFormat
  /** For gist mode: inject gisthost.github.io JS */
  gistMode?: boolean
  /** Assets path (HTML only) */
  assetsPath?: string
}

export interface FormatRenderer {
  renderSession(data: SessionRenderData): string
  renderConversation(data: ConversationRenderData): string
  /** Markdown-only: render full transcript to single string */
  renderFullTranscript?(data: FullTranscriptData): string
}
```

### 1.2 Extract Shared Data Structures

Refactor `src/render/html.ts` to separate data collection from HTML rendering:

```typescript
// New: src/render/data.ts
export interface SessionRenderData {
  session: Session
  projectName?: string
  timeline: TimelineEntry[]
  messageCount: number
  totalTokens?: { input: number; output: number }
  totalCost?: number
  pageCount: number
  model?: string
}

export interface ConversationRenderData {
  session: Session
  projectName?: string
  messages: MessageWithParts[]
  pageNumber: number
  totalPages: number
}

export interface FullTranscriptData {
  session: Session
  projectName?: string
  messages: MessageWithParts[]
  timeline: TimelineEntry[]
  stats: GenerationStats
}
```

### 1.3 Tasks

| Task | File | Description | Status |
|------|------|-------------|--------|
| 1.1.1 | `src/render/types.ts` | Create shared type definitions | ✅ Done |
| 1.1.2 | `src/render/data.ts` | Extract data collection from html.ts | ✅ Done |
| 1.1.3 | `src/render/html.ts` | Refactor to use new data structures | ✅ Done |
| 1.1.4 | Tests | Update existing tests for refactor | ✅ Done |

**Estimated effort:** 2-3 hours

### 1.4 Implementation Notes

- Created `src/render/types.ts` with `OutputFormat`, `RenderContext`, `SessionRenderData`, `ConversationRenderData`, `FullTranscriptData`, and `FormatRenderer` interface
- Created `src/render/data.ts` with shared utilities: `getFirstPrompt`, `countTools`, `buildTimeline`, `paginateMessages`, `calculateSessionStats`, `buildSessionData`
- Refactored `src/render/html.ts` to use shared data utilities
- All exports available from `src/render/index.ts` barrel

---

## Phase 2: Markdown Renderer ✅ COMPLETED

**Goal:** Create markdown output format with stdout and file support.

**Status:** Completed on 2026-01-03

### 2.1 Create Markdown Component Renderers

Mirror the HTML component structure for markdown:

```
src/render/markdown/
├── index.ts           # Main markdown generator
├── message.ts         # Message rendering
├── part.ts            # Part dispatcher
└── tools/
    ├── bash.ts
    ├── read.ts
    ├── write.ts
    ├── edit.ts
    ├── glob.ts
    ├── grep.ts
    ├── task.ts
    ├── todowrite.ts
    ├── webfetch.ts
    └── batch.ts
```

### 2.2 Markdown Message Renderer

**File:** `src/render/markdown/message.ts`

```typescript
export function renderMessageMd(msg: MessageWithParts): string {
  const role = msg.message.role === "user" ? "User" : "Assistant"
  const time = formatTime(msg.message.time.created)
  
  const lines: string[] = []
  lines.push(`### ${role}`)
  lines.push(`*${time}*`)
  lines.push("")
  
  for (const part of msg.parts) {
    lines.push(renderPartMd(part))
    lines.push("")
  }
  
  // Stats for assistant messages
  if (msg.message.role === "assistant") {
    const stats = formatStatsMd(msg.message)
    if (stats) {
      lines.push(`> ${stats}`)
      lines.push("")
    }
  }
  
  return lines.join("\n")
}
```

### 2.3 Markdown Part Renderer

**File:** `src/render/markdown/part.ts`

```typescript
export function renderPartMd(part: Part): string {
  switch (part.type) {
    case "text":
      return renderTextPartMd(part)
    case "reasoning":
      return renderReasoningPartMd(part)
    case "tool":
      return renderToolPartMd(part)
    // ... other part types
  }
}

function renderTextPartMd(part: TextPart): string {
  // Text is already markdown, just return it
  return part.text
}

function renderReasoningPartMd(part: ReasoningPart): string {
  return `<details>
<summary>Thinking...</summary>

${part.text}

</details>`
}
```

### 2.4 Markdown Tool Renderers

**File:** `src/render/markdown/tools/bash.ts`

```typescript
export function renderBashToolMd(part: ToolPart): string {
  const { state } = part
  const command = state.input?.command || ""
  const description = state.input?.description || ""
  const output = state.output || ""
  const error = state.error
  
  const lines: string[] = []
  
  // Header with description
  lines.push(`**Bash:** ${description}`)
  lines.push("")
  
  // Command
  lines.push("```bash")
  lines.push(`$ ${command}`)
  lines.push("```")
  
  // Output (collapsible if long)
  if (output) {
    const outputLines = output.split("\n").length
    if (outputLines > 15) {
      lines.push("<details>")
      lines.push("<summary>Output (click to expand)</summary>")
      lines.push("")
      lines.push("```")
      lines.push(output)
      lines.push("```")
      lines.push("")
      lines.push("</details>")
    } else {
      lines.push("```")
      lines.push(output)
      lines.push("```")
    }
  }
  
  // Error
  if (error) {
    lines.push(`> **Error:** ${error}`)
  }
  
  return lines.join("\n")
}
```

**File:** `src/render/markdown/tools/edit.ts`

```typescript
export function renderEditToolMd(part: ToolPart): string {
  const { state } = part
  const filePath = state.input?.filePath || "unknown"
  const oldString = state.input?.oldString || ""
  const newString = state.input?.newString || ""
  
  const lines: string[] = []
  lines.push(`**Edit:** \`${filePath}\``)
  lines.push("")
  
  // Show diff-like format
  lines.push("```diff")
  for (const line of oldString.split("\n")) {
    lines.push(`- ${line}`)
  }
  for (const line of newString.split("\n")) {
    lines.push(`+ ${line}`)
  }
  lines.push("```")
  
  return lines.join("\n")
}
```

### 2.5 Full Transcript Generator

**File:** `src/render/markdown/index.ts`

```typescript
export interface GenerateMarkdownOptions {
  storagePath: string
  sessionId?: string
  /** Output to file instead of stdout */
  outputFile?: string
  /** Include session metadata header */
  includeHeader?: boolean
}

export async function generateMarkdown(
  options: GenerateMarkdownOptions
): Promise<string> {
  const { storagePath, sessionId, includeHeader = true } = options
  
  // Find and load session
  const session = await findSession(storagePath, sessionId)
  const messages = await getMessagesWithParts(storagePath, session.id)
  const timeline = buildTimeline(messages)
  
  const lines: string[] = []
  
  // Header
  if (includeHeader) {
    lines.push(`# ${session.title}`)
    lines.push("")
    lines.push(`**Session:** ${session.id}`)
    lines.push(`**Created:** ${formatDate(session.time.created)}`)
    lines.push(`**Messages:** ${messages.length}`)
    lines.push("")
    lines.push("---")
    lines.push("")
  }
  
  // Messages
  for (const msg of messages) {
    lines.push(renderMessageMd(msg))
    lines.push("")
    lines.push("---")
    lines.push("")
  }
  
  return lines.join("\n")
}
```

### 2.6 Tasks

| Task | File | Description | Status |
|------|------|-------------|--------|
| 2.1.1 | `src/render/markdown/index.ts` | Main markdown generator | ✅ Done |
| 2.1.2 | `src/render/markdown/message.ts` | Message renderer | ✅ Done |
| 2.1.3 | `src/render/markdown/part.ts` | Part dispatcher | ✅ Done |
| 2.2.1 | `src/render/markdown/tools/bash.ts` | Bash tool renderer | ✅ Done |
| 2.2.2 | `src/render/markdown/tools/read.ts` | Read tool renderer | ✅ Done |
| 2.2.3 | `src/render/markdown/tools/write.ts` | Write tool renderer | ✅ Done |
| 2.2.4 | `src/render/markdown/tools/edit.ts` | Edit tool renderer | ✅ Done |
| 2.2.5 | `src/render/markdown/tools/glob.ts` | Glob tool renderer | ✅ Done |
| 2.2.6 | `src/render/markdown/tools/grep.ts` | Grep tool renderer | ✅ Done |
| 2.2.7 | `src/render/markdown/tools/task.ts` | Task tool renderer | ✅ Done |
| 2.2.8 | `src/render/markdown/tools/todowrite.ts` | TodoWrite tool renderer | ✅ Done |
| 2.2.9 | `src/render/markdown/tools/webfetch.ts` | WebFetch tool renderer | ✅ Done |
| 2.2.10 | `src/render/markdown/tools/batch.ts` | Batch tool renderer | ✅ Done |
| 2.3.1 | Tests | Unit tests for markdown renderers | ✅ Done |

**Estimated effort:** 4-6 hours

### 2.7 Implementation Notes

**Files Created:**
```
src/render/markdown/
├── index.ts           # markdownRenderer, generateMarkdown, renderSession, renderConversation, renderFullTranscript
├── message.ts         # renderMessageMd, renderMessagesMd
├── message.test.ts    # 18 tests
├── part.ts            # renderPartMd (dispatches to tool renderers)
├── part.test.ts       # 21 tests
└── tools/
    ├── bash.ts        # renderBashToolMd
    ├── read.ts        # renderReadToolMd
    ├── write.ts       # renderWriteToolMd
    ├── edit.ts        # renderEditToolMd (diff format)
    ├── glob.ts        # renderGlobToolMd
    ├── grep.ts        # renderGrepToolMd
    ├── task.ts        # renderTaskToolMd
    ├── todowrite.ts   # renderTodoWriteToolMd (checkbox format)
    ├── webfetch.ts    # renderWebFetchToolMd
    └── batch.ts       # renderBatchToolMd
```

**Key Features:**
- Collapsible `<details>` sections for long output (>15-30 lines)
- Diff-style ````diff` formatting for edit operations
- Checkbox format for todos: `[x]` completed, `[ ]` pending, `[-]` in progress, `[~]` cancelled
- Stats in blockquotes for assistant messages
- All exports available from `src/render/index.ts` barrel

**Code Review Fixes Applied:**
- Fixed missing markdown module export from barrel
- Optimized `calculateSessionStats` to avoid duplicate pagination
- Fixed empty tool info handling in batch renderer
- Clarified URL truncation logic in webfetch renderer

**Test Results:** 39 new tests, all passing (784 total project tests)

---

## Phase 3: CLI Integration for Markdown

**Goal:** Add `--format md` flag and stdout support.

### 3.1 Update CLI Arguments

**File:** `src/index.ts`

```typescript
const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    // ... existing options ...
    format: {
      type: "string",
      short: "f",
      default: "html",
      description: "Output format: html, md, json",
    },
    stdout: {
      type: "boolean",
      default: false,
      description: "Output to stdout (markdown/json only)",
    },
  },
})
```

### 3.2 Add Markdown Output Mode

```typescript
// In main execution
if (values.format === "md" || values.format === "markdown") {
  const markdown = await generateMarkdown({
    storagePath,
    sessionId: values.session,
    includeHeader: true,
  })
  
  if (values.stdout || !values.output) {
    // Output to stdout for piping
    process.stdout.write(markdown)
  } else {
    // Write to file
    const outputFile = values.output.endsWith(".md") 
      ? values.output 
      : `${values.output}/transcript.md`
    await Bun.write(outputFile, markdown)
    console.log(outputFile)
  }
  process.exit(0)
}
```

### 3.3 Update Help Text

```
Options:
  -f, --format <type>    Output format: html (default), md, json
  --stdout               Output to stdout instead of file (md/json only)
  
Examples:
  opencode-replay --format md                    # Markdown to stdout
  opencode-replay --format md -o transcript.md   # Markdown to file
  opencode-replay --format md | gh gist create - # Pipe to gist
  opencode-replay --format md -s ses_xxx         # Specific session
```

### 3.4 Tasks

| Task | File | Description |
|------|------|-------------|
| 3.1.1 | `src/index.ts` | Add --format and --stdout flags |
| 3.1.2 | `src/index.ts` | Implement markdown output path |
| 3.1.3 | `src/index.ts` | Update help text |
| 3.2.1 | Tests | Integration tests for markdown CLI |

**Estimated effort:** 1-2 hours

---

## Phase 4: Gist Integration (Simon's Approach)

**Goal:** Add `--gist` flag for direct GitHub Gist upload.

### 4.1 Gist Upload Module

**File:** `src/gist.ts`

```typescript
import { spawn } from "bun"

export interface GistResult {
  gistId: string
  gistUrl: string
  previewUrl: string
}

/**
 * Upload files to GitHub Gist using gh CLI
 */
export async function createGist(
  files: string[],
  options: { public?: boolean; description?: string } = {}
): Promise<GistResult> {
  // Check gh is installed
  const whichResult = await spawn(["which", "gh"]).exited
  if (whichResult !== 0) {
    throw new Error(
      "GitHub CLI (gh) not found. Install it from https://cli.github.com/"
    )
  }
  
  // Check gh is authenticated
  const authResult = await spawn(["gh", "auth", "status"]).exited
  if (authResult !== 0) {
    throw new Error(
      "Not authenticated with GitHub CLI. Run: gh auth login"
    )
  }
  
  // Build command
  const cmd = ["gh", "gist", "create"]
  if (options.description) {
    cmd.push("--desc", options.description)
  }
  if (options.public) {
    cmd.push("--public")
  }
  cmd.push(...files)
  
  // Execute
  const proc = spawn(cmd, { stdout: "pipe", stderr: "pipe" })
  const output = await new Response(proc.stdout).text()
  const exitCode = await proc.exited
  
  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text()
    throw new Error(`gh gist create failed: ${stderr}`)
  }
  
  // Parse result
  const gistUrl = output.trim()
  const gistId = gistUrl.split("/").pop() || ""
  const previewUrl = `https://gisthost.github.io/?${gistId}/index.html`
  
  return { gistId, gistUrl, previewUrl }
}
```

### 4.2 Gist Preview JavaScript

**File:** `src/assets/gist-preview.js`

```javascript
// Rewrite relative links for gisthost.github.io
(function() {
  if (!window.location.host.includes('gisthost.github.io')) return;
  
  // Extract gist ID from URL (format: ?GIST_ID/filename.html)
  const search = window.location.search.slice(1);
  const gistId = search.split('/')[0];
  if (!gistId) return;
  
  // Rewrite all relative links
  document.querySelectorAll('a[href]').forEach(link => {
    const href = link.getAttribute('href');
    if (href && !href.startsWith('http') && !href.startsWith('#')) {
      link.setAttribute('href', `?${gistId}/${href}`);
    }
  });
})();
```

### 4.3 Inject Gist Preview JS

**File:** `src/render/html.ts` (modify)

```typescript
export interface GenerateHtmlOptions {
  // ... existing options ...
  /** Inject gisthost.github.io preview JS */
  gistMode?: boolean
}

// In template rendering, conditionally include gist-preview.js
const gistScriptHtml = gistMode 
  ? `<script>${GIST_PREVIEW_JS}</script>` 
  : ""
```

### 4.4 CLI Integration

**File:** `src/index.ts`

```typescript
const { values } = parseArgs({
  options: {
    // ... existing options ...
    gist: {
      type: "boolean",
      default: false,
      description: "Upload to GitHub Gist after generation",
    },
    "gist-public": {
      type: "boolean",
      default: false,
      description: "Make gist public (default: secret)",
    },
  },
})

// After HTML generation
if (values.gist) {
  log(color("Uploading to GitHub Gist...", colors.cyan))
  
  // Collect HTML files
  const htmlFiles = await glob(join(outputDir, "**/*.html"))
  
  try {
    const result = await createGist(htmlFiles, {
      public: values["gist-public"],
      description: `OpenCode transcript: ${projectName || "session"}`,
    })
    
    log("")
    log(color("Gist created!", colors.green, colors.bold))
    log(color("Gist URL:", colors.dim) + ` ${result.gistUrl}`)
    log(color("Preview:", colors.dim) + ` ${result.previewUrl}`)
    
    // Output preview URL for scripting
    console.log(result.previewUrl)
  } catch (error) {
    console.error(color("Error:", colors.red) + ` ${error.message}`)
    process.exit(1)
  }
}
```

### 4.5 Tasks

| Task | File | Description |
|------|------|-------------|
| 4.1.1 | `src/gist.ts` | Gist upload module |
| 4.1.2 | `src/assets/gist-preview.js` | Gisthost.github.io link rewriter |
| 4.2.1 | `src/render/html.ts` | Add gistMode option |
| 4.2.2 | `src/render/templates/base.ts` | Conditionally inject gist JS |
| 4.3.1 | `src/index.ts` | Add --gist and --gist-public flags |
| 4.3.2 | `src/index.ts` | Implement gist upload flow |
| 4.4.1 | Tests | Unit tests for gist module |
| 4.4.2 | Tests | Integration tests for --gist flag |

**Estimated effort:** 3-4 hours

---

## Phase 5: Polish & Documentation

**Goal:** Final touches, testing, and documentation.

### 5.1 Update README

```markdown
## Output Formats

### HTML (default)
Generate static HTML transcript viewable in any browser:
```bash
opencode-replay                    # Current project
opencode-replay --all              # All projects
opencode-replay -o ./output        # Custom output directory
```

### Markdown
Generate markdown for sharing or piping:
```bash
# To stdout (for piping)
opencode-replay --format md
opencode-replay --format md | gh gist create -
opencode-replay --format md | pbcopy

# To file
opencode-replay --format md -o transcript.md
```

### GitHub Gist
Upload HTML directly to GitHub Gist:
```bash
opencode-replay --gist             # Secret gist
opencode-replay --gist --gist-public  # Public gist
```

Requires [GitHub CLI](https://cli.github.com/) to be installed and authenticated.
```

### 5.2 Tasks

| Task | File | Description |
|------|------|-------------|
| 5.1.1 | `README.md` | Update with new features |
| 5.1.2 | - | End-to-end testing |
| 5.1.3 | - | Update CHANGELOG |

**Estimated effort:** 1-2 hours

---

## Summary

| Phase | Description | Effort | Dependencies | Status |
|-------|-------------|--------|--------------|--------|
| 1 | Shared Foundation | 2-3 hrs | None | ✅ Done |
| 2 | Markdown Renderer | 4-6 hrs | Phase 1 | ✅ Done |
| 3 | Markdown CLI | 1-2 hrs | Phase 2 | Pending |
| 4 | Gist Integration | 3-4 hrs | Phase 1 | Pending |
| 5 | Polish & Docs | 1-2 hrs | Phases 3 & 4 | Pending |

**Total estimated effort:** 11-17 hours
**Completed:** Phases 1 & 2 (~6-9 hrs)

### Suggested Order

1. **Phase 1** - Required for both features
2. **Phase 4** - Quick win, uses existing HTML output
3. **Phase 2 + 3** - More complex, but delivers the core markdown feature
4. **Phase 5** - Final polish

This order means you get a working `--gist` feature early while the more complex markdown renderer is being built.

---

## Design Decisions

### Why Not HTML-to-Markdown Conversion?

While using a library like `turndown` would be faster to implement, building a native markdown renderer provides:

1. **Better control** - Optimize output specifically for gist readability
2. **Semantic preservation** - Tool types, collapsible sections, code language hints
3. **Smaller output** - No HTML artifacts or conversion overhead
4. **Consistency** - Same code patterns as HTML renderer

### Why Both `--format md` and `--gist`?

Different use cases:

- `--format md` - Maximum flexibility, works with any markdown consumer
- `--gist` - Convenience for the common GitHub Gist workflow

### Stdout vs File

Markdown defaults to stdout for piping ergonomics:
```bash
replay --format md | gh gist create -
replay --format md | pbcopy
replay --format md > transcript.md
```

But `-o` allows explicit file output when needed.
