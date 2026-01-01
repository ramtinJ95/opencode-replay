# Phase 4.5: Development Server & Dark Mode - Implementation Plan

This document contains everything needed to implement Phase 4.5 of opencode-replay. It is self-contained and provides all code examples, patterns, and specifications required to complete the implementation.

---

## Table of Contents

1. [Overview](#overview)
2. [Part 1: HTTP Server Implementation](#part-1-http-server-implementation) - **COMPLETED**
3. [Part 2: Dark Mode Implementation](#part-2-dark-mode-implementation) - Pending
4. [File Changes Summary](#file-changes-summary)
5. [Todo List](#todo-list)

---

## Overview

Phase 4.5 adds two quality-of-life features:

1. **Built-in HTTP Server (`--serve` flag)** - Serve generated transcripts via HTTP for easier viewing - **COMPLETED**
2. **Dark Mode Theme** - CSS-based theming with automatic OS detection and manual toggle - **Pending**

### Current Project Structure (Relevant Files)

```
src/
├── index.ts                    # CLI entry point (MODIFIED - added --serve, --port, --no-generate)
├── server.ts                   # NEW FILE - HTTP server (CREATED)
├── render/
│   ├── html.ts                 # HTML generation (needs modification for dark mode)
│   └── templates/
│       └── base.ts             # Base HTML template (needs modification for dark mode)
├── assets/
│   └── styles.css              # Main stylesheet (needs modification for dark mode)
└── assets/
    └── theme.js                # NEW FILE - Theme toggle JS (TO BE CREATED for dark mode)
```

---

## Part 1: HTTP Server Implementation

> **STATUS: COMPLETED**
> 
> Implemented in commits:
> - `ee80205` - feat(server): add HTTP server for serving generated transcripts
> - `d92af31` - feat(cli): add --serve, --port, --no-generate flags
> - `19efb4e` - fix(server): address code review issues
> - `ebb407f` - docs(readme): add HTTP server documentation
>
> **Key implementation notes:**
> - Used platform-specific path separator (`sep` from `node:path`) for Windows compatibility
> - Added port-in-use error handling with user-friendly message
> - Added output directory validation when using `--no-generate`
> - All 19 tests passed (see testing section below)

### 1.1 CLI Changes (`src/index.ts`)

Add three new CLI flags to the existing `parseArgs` configuration:

```typescript
// Add to the options object in parseArgs():
serve: {
  type: "boolean",
  default: false,
  description: "Start HTTP server after generation",
},
port: {
  type: "string",  // parseArgs doesn't support number, parse manually
  default: "3000",
  description: "Server port (default: 3000)",
},
"no-generate": {
  type: "boolean",
  default: false,
  description: "Skip generation, only serve existing output",
},
```

Update the help text to include:

```
  --serve                Start HTTP server after generation
  --port <number>        Server port (default: 3000)
  --no-generate          Skip generation, only serve existing output

Examples:
  opencode-replay --serve              # Generate and serve
  opencode-replay --serve --port 8080  # Custom port
  opencode-replay --serve --no-generate -o ./existing  # Serve existing
```

### 1.2 Server Implementation (`src/server.ts`)

Create a new file `src/server.ts` with a complete static file server:

```typescript
/**
 * HTTP server for serving generated HTML transcripts
 * Uses Bun.serve() with security best practices
 */

import { resolve, join } from "node:path"

export interface ServeOptions {
  /** Directory to serve files from */
  directory: string
  /** Port to listen on */
  port: number
  /** Whether to auto-open browser */
  open?: boolean
}

/**
 * Check if a path is safe (no directory traversal)
 */
function isPathSafe(rootDir: string, targetPath: string): boolean {
  const resolvedRoot = resolve(rootDir)
  const resolvedTarget = resolve(targetPath)
  return resolvedTarget.startsWith(resolvedRoot + "/") || resolvedTarget === resolvedRoot
}

/**
 * Start the static file server
 */
export async function serve(options: ServeOptions): Promise<void> {
  const { directory, port, open = true } = options
  const ROOT_DIR = resolve(directory)

  const server = Bun.serve({
    port,

    async fetch(req) {
      const url = new URL(req.url)

      // Only allow GET and HEAD methods
      if (req.method !== "GET" && req.method !== "HEAD") {
        return new Response("Method Not Allowed", {
          status: 405,
          headers: { Allow: "GET, HEAD" },
        })
      }

      // Decode and validate pathname
      let pathname: string
      try {
        pathname = decodeURIComponent(url.pathname)
      } catch {
        return new Response("Bad Request", { status: 400 })
      }

      // Security: remove null bytes
      pathname = pathname.replace(/\0/g, "")

      // Compute target path
      const targetPath = join(ROOT_DIR, pathname)

      // PATH TRAVERSAL PROTECTION
      if (!isPathSafe(ROOT_DIR, targetPath)) {
        return new Response("Forbidden", { status: 403 })
      }

      let file = Bun.file(targetPath)

      // Try index.html for directories or paths ending with /
      if (pathname.endsWith("/") || !(await file.exists())) {
        const indexPath = pathname.endsWith("/")
          ? join(targetPath, "index.html")
          : join(targetPath, "index.html")

        const indexFile = Bun.file(indexPath)
        if (await indexFile.exists()) {
          file = indexFile
        } else if (!(await Bun.file(targetPath).exists())) {
          return new Response("Not Found", {
            status: 404,
            headers: { "Content-Type": "text/plain" },
          })
        }
      }

      // Check if file exists
      if (!(await file.exists())) {
        return new Response("Not Found", {
          status: 404,
          headers: { "Content-Type": "text/plain" },
        })
      }

      // Read file for ETag computation
      const content = await file.arrayBuffer()
      const etag = `W/"${Bun.hash(new Uint8Array(content)).toString(16)}"`

      // Check If-None-Match for 304 response
      const ifNoneMatch = req.headers.get("If-None-Match")
      if (ifNoneMatch === etag) {
        return new Response(null, {
          status: 304,
          headers: { ETag: etag },
        })
      }

      // Determine cache strategy (hashed assets get long cache)
      const isHashed = /\.[a-f0-9]{8,}\.(js|css|png|jpg|jpeg|gif|svg|woff2?)$/i.test(
        targetPath
      )

      const responseHeaders: Record<string, string> = {
        "Content-Type": file.type,
        "Content-Length": String(content.byteLength),
        ETag: etag,
        "Cache-Control": isHashed
          ? "public, max-age=31536000, immutable"
          : "public, max-age=3600",
      }

      // HEAD request - no body
      if (req.method === "HEAD") {
        return new Response(null, { headers: responseHeaders })
      }

      return new Response(content, { headers: responseHeaders })
    },

    error(error) {
      console.error("Server error:", error)
      return new Response("Internal Server Error", { status: 500 })
    },
  })

  const serverUrl = `http://localhost:${port}`
  console.log(`\nServer running at ${serverUrl}`)
  console.log("Press Ctrl+C to stop\n")

  // Auto-open browser
  if (open) {
    const openCmd = process.platform === "darwin" ? "open" : "xdg-open"
    Bun.spawn([openCmd, serverUrl])
  }

  // Graceful shutdown handlers
  const shutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}, shutting down...`)
    await server.stop()
    console.log("Server stopped")
    process.exit(0)
  }

  process.on("SIGINT", () => shutdown("SIGINT"))
  process.on("SIGTERM", () => shutdown("SIGTERM"))

  // Keep process alive
  await new Promise(() => {}) // Never resolves - server runs until signal
}
```

### 1.3 Main Entry Point Changes (`src/index.ts`)

Update the main execution section to handle --serve:

```typescript
import { serve } from "./server"

// ... after argument parsing ...

// Main execution
const storagePath = values.storage ?? getDefaultStoragePath()
const outputDir = values.output ?? "./opencode-replay-output"
const port = parseInt(values.port ?? "3000", 10)

// Validate port
if (isNaN(port) || port < 1 || port > 65535) {
  console.error("Error: Invalid port number")
  process.exit(1)
}

console.log("opencode-replay")
console.log("---------------")
console.log(`Storage path: ${storagePath}`)
console.log(`Output directory: ${resolve(outputDir)}`)

// Skip generation if --no-generate is set
if (!values["no-generate"]) {
  console.log(`Mode: ${values.all ? "all projects" : "current project"}`)
  if (values.session) {
    console.log(`Session filter: ${values.session}`)
  }
  console.log("")

  try {
    await generateHtml({
      storagePath,
      outputDir: resolve(outputDir),
      all: values.all ?? false,
      sessionId: values.session,
      includeJson: values.json ?? false,
    })

    console.log(`\nGenerated HTML transcripts in ${resolve(outputDir)}`)
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

// Start server if --serve is set
if (values.serve) {
  await serve({
    directory: resolve(outputDir),
    port,
    open: values.open ?? true,
  })
} else if (values.open) {
  // Just open without serving
  const indexPath = resolve(outputDir, "index.html")
  const openCmd = process.platform === "darwin" ? "open" : "xdg-open"
  Bun.spawn([openCmd, indexPath])
}
```

### 1.4 Server Security Checklist

The implementation includes:

- [x] Path traversal prevention via `resolve()` + `startsWith()` check (with platform-specific separator)
- [x] Null byte removal from paths
- [x] Only GET and HEAD methods allowed
- [x] Proper 404 handling
- [x] ETag-based caching with If-None-Match support
- [x] Graceful shutdown on SIGINT/SIGTERM
- [x] Auto MIME type detection via Bun.file()
- [x] Port-in-use error handling
- [x] Output directory validation for --no-generate

### 1.5 Testing Results

All 19 tests passed:

| Test | Description | Result |
|------|-------------|--------|
| 1 | `--no-generate` with non-existent directory | Proper error, exit 1 |
| 2 | Invalid port (99999) | Proper error, exit 1 |
| 3 | Non-numeric port (abc) | Proper error, exit 1 |
| 4 | Port already in use | User-friendly error, exit 1 |
| 5 | GET / serves index.html | 200, text/html |
| 6 | GET /assets/styles.css | 200, text/css |
| 7 | GET /nonexistent | 404 |
| 8 | HEAD request | 200 with headers, no body |
| 9 | POST request | 405 Method Not Allowed |
| 10 | ETag caching (If-None-Match) | 304 Not Modified |
| 11 | Path traversal (../) | Blocked |
| 12 | Encoded path traversal (%2e%2e) | Blocked |
| 13 | Null byte injection | Sanitized |
| 14 | Directory without index.html | 404 |
| 15 | Session directory with trailing slash | 200 (serves index.html) |
| 16 | Session directory without trailing slash | 200 (serves index.html) |
| 17 | Direct file access | 200 |
| 18 | HTML content verification | Correct DOCTYPE |
| 19 | Graceful shutdown (SIGINT) | Clean shutdown |

---

## Part 2: Dark Mode Implementation

> **STATUS: PENDING**
>
> **Impact from Server Implementation:** None. The server implementation is fully independent
> and does not affect the dark mode implementation. All files that need modification for
> dark mode (`styles.css`, `base.ts`, `html.ts`) were not modified during server implementation.
>
> **Files to create:**
> - `src/assets/theme.js` - Theme toggle JavaScript
>
> **Files to modify:**
> - `src/assets/styles.css` - Add dark mode CSS variables and overrides
> - `src/render/templates/base.ts` - Add FOUC prevention script and theme toggle button
> - `src/render/html.ts` - Update copyAssets() to copy theme.js

### 2.1 Color Palette Specification

Based on GitHub's dark theme for developer familiarity, with WCAG AA compliance:

| Element | Light Mode | Dark Mode | Contrast (Dark) |
|---------|-----------|-----------|-----------------|
| Page background | `#ffffff` | `#0d1117` | - |
| Secondary background | `#f8f9fa` | `#161b22` | - |
| Tertiary background | `#f1f3f5` | `#21262d` | - |
| Primary text | `#212529` | `#e6edf3` | 13.5:1 |
| Secondary text | `#6c757d` | `#8b949e` | 6.2:1 |
| Muted text | `#adb5bd` | `#6e7681` | 4.1:1 |
| Border | `#dee2e6` | `#30363d` | - |
| User message bg | `#e3f2fd` | `#1c3a5e` | - |
| User message border | `#90caf9` | `#2d5a8b` | - |
| Assistant message bg | `#f5f5f5` | `#21262d` | - |
| Assistant message border | `#e0e0e0` | `#30363d` | - |
| Code background | `#f6f8fa` | `#161b22` | - |
| Code text | `#24292e` | `#e6edf3` | 12.1:1 |
| Link | `#17a2b8` | `#58a6ff` | 7.8:1 |
| Success | `#28a745` | `#3fb950` | - |
| Error | `#dc3545` | `#f85149` | - |
| Warning | `#ffc107` | `#d29922` | - |

### 2.2 CSS Variables Update (`src/assets/styles.css`)

Add dark mode variables at the beginning of the file, after the existing `:root` block. The approach uses:

1. Light mode as default in `:root`
2. `@media (prefers-color-scheme: dark)` for automatic OS detection
3. `[data-theme="dark"]` for manual override

```css
/* ============================================================================
   CSS Variables / Theme - LIGHT MODE (Default)
   ============================================================================ */

:root {
  /* Add color-scheme declaration */
  color-scheme: light dark;

  /* Existing variables remain unchanged... */
  
  /* Add these new variables for theming consistency */
  --color-bg-tertiary: #f1f3f5;
  --scrollbar-track: #f1f1f1;
  --scrollbar-thumb: #c1c1c1;
}

/* ============================================================================
   DARK MODE - Automatic (OS Preference)
   ============================================================================ */

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    color-scheme: dark;
    
    /* Core Colors */
    --color-bg: #0d1117;
    --color-bg-secondary: #161b22;
    --color-bg-tertiary: #21262d;
    --color-text: #e6edf3;
    --color-text-secondary: #8b949e;
    --color-text-muted: #6e7681;
    --color-border: #30363d;
    --color-border-light: #21262d;

    /* Message backgrounds */
    --user-bg: #1c3a5e;
    --user-border: #2d5a8b;
    --assistant-bg: #21262d;
    --assistant-border: #30363d;
    --tool-bg: #2d2006;
    --tool-border: #4a3c1a;
    --error-bg: #3d1418;
    --error-border: #5c2125;
    --reasoning-bg: #2d2006;
    --reasoning-border: #4a3c1a;

    /* Tool-specific colors */
    --bash-bg: #2a1f35;
    --bash-border: #4a3860;
    --read-bg: #1a2340;
    --read-border: #2d3a5a;
    --write-bg: #1a2e1a;
    --write-border: #2d4a2d;
    --edit-bg: #2d2006;
    --edit-border: #4a3c1a;

    /* Status colors */
    --color-success: #3fb950;
    --color-error: #f85149;
    --color-warning: #d29922;
    --color-info: #58a6ff;

    /* Code */
    --code-bg: #161b22;
    --code-border: #30363d;
    --code-text: #e6edf3;

    /* Shadows - darker for dark mode */
    --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
    --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.4);

    /* Scrollbar */
    --scrollbar-track: #21262d;
    --scrollbar-thumb: #484f58;
  }
}

/* ============================================================================
   DARK MODE - Manual Override via data-theme attribute
   ============================================================================ */

:root[data-theme="dark"] {
  color-scheme: dark;
  
  /* Core Colors */
  --color-bg: #0d1117;
  --color-bg-secondary: #161b22;
  --color-bg-tertiary: #21262d;
  --color-text: #e6edf3;
  --color-text-secondary: #8b949e;
  --color-text-muted: #6e7681;
  --color-border: #30363d;
  --color-border-light: #21262d;

  /* Message backgrounds */
  --user-bg: #1c3a5e;
  --user-border: #2d5a8b;
  --assistant-bg: #21262d;
  --assistant-border: #30363d;
  --tool-bg: #2d2006;
  --tool-border: #4a3c1a;
  --error-bg: #3d1418;
  --error-border: #5c2125;
  --reasoning-bg: #2d2006;
  --reasoning-border: #4a3c1a;

  /* Tool-specific colors */
  --bash-bg: #2a1f35;
  --bash-border: #4a3860;
  --read-bg: #1a2340;
  --read-border: #2d3a5a;
  --write-bg: #1a2e1a;
  --write-border: #2d4a2d;
  --edit-bg: #2d2006;
  --edit-border: #4a3c1a;

  /* Status colors */
  --color-success: #3fb950;
  --color-error: #f85149;
  --color-warning: #d29922;
  --color-info: #58a6ff;

  /* Code */
  --code-bg: #161b22;
  --code-border: #30363d;
  --code-text: #e6edf3;

  /* Shadows - darker for dark mode */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.4);

  /* Scrollbar */
  --scrollbar-track: #21262d;
  --scrollbar-thumb: #484f58;
}

/* Force light mode when explicitly set */
:root[data-theme="light"] {
  color-scheme: light;
  /* All light mode values are already the default in :root */
}
```

### 2.3 Additional Dark Mode CSS Overrides

Add these overrides for specific elements that need adjustment:

```css
/* ============================================================================
   Dark Mode Element Overrides
   ============================================================================ */

/* User message role color */
:root[data-theme="dark"] .message-user .message-role,
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .message-user .message-role {
    color: #58a6ff;
  }
}

/* Assistant message role color */
:root[data-theme="dark"] .message-assistant .message-role,
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .message-assistant .message-role {
    color: #8b949e;
  }
}

/* Bash output - keep dark in both modes, but adjust */
:root[data-theme="dark"] .bash-output,
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .bash-output {
    background: #0d1117;
  }
}

/* Edit diff colors */
:root[data-theme="dark"] .edit-diff .diff-old,
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .edit-diff .diff-old {
    background: #3d1418;
  }
}

:root[data-theme="dark"] .edit-diff .diff-new,
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .edit-diff .diff-new {
    background: #1a2e1a;
  }
}

/* Priority badges */
:root[data-theme="dark"] .priority-high,
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .priority-high {
    background: #5c2125;
    color: #f85149;
  }
}

:root[data-theme="dark"] .priority-medium,
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .priority-medium {
    background: #3d2e06;
    color: #d29922;
  }
}

:root[data-theme="dark"] .priority-low,
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .priority-low {
    background: #1a2e1a;
    color: #3fb950;
  }
}

/* Search modal */
:root[data-theme="dark"] .search-modal,
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .search-modal {
    background: rgba(0, 0, 0, 0.7);
  }
}

:root[data-theme="dark"] .search-modal-content,
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .search-modal-content {
    background: var(--color-bg-secondary);
  }
}

/* Session card hover */
:root[data-theme="dark"] .session-card:hover,
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .session-card:hover {
    border-color: #484f58;
  }
}

/* WebFetch tool */
:root[data-theme="dark"] .tool-webfetch,
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .tool-webfetch {
    background: #0a2540;
    border-color: #1a4060;
  }
}

/* TodoWrite tool */
:root[data-theme="dark"] .tool-todowrite,
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .tool-todowrite {
    background: #21262d;
    border-color: #30363d;
  }
}

/* Batch tool */
:root[data-theme="dark"] .tool-batch,
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .tool-batch {
    background: #161b22;
    border-color: #30363d;
  }
}

/* Scrollbar styling */
:root[data-theme="dark"] ::-webkit-scrollbar-track,
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) ::-webkit-scrollbar-track {
    background: var(--scrollbar-track);
  }
}

:root[data-theme="dark"] ::-webkit-scrollbar-thumb,
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) ::-webkit-scrollbar-thumb {
    background: var(--scrollbar-thumb);
  }
}

/* Firefox scrollbar */
:root[data-theme="dark"],
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    scrollbar-color: var(--scrollbar-thumb) var(--scrollbar-track);
  }
}
```

### 2.4 Theme Transitions

Add smooth transitions (respecting reduced motion):

```css
/* ============================================================================
   Theme Transitions
   ============================================================================ */

body,
.container,
.message,
.tool-call,
.session-card,
pre,
code,
.page-header,
.page-footer,
.search-modal-content {
  transition: 
    background-color 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease,
    box-shadow 0.2s ease;
}

/* Respect reduced motion preference */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }
}
```

### 2.5 Theme Toggle Button CSS

Add to styles.css:

```css
/* ============================================================================
   Theme Toggle Button
   ============================================================================ */

.theme-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-bg-secondary);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: 
    background-color 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease,
    transform 0.15s ease;
}

.theme-toggle:hover {
  background-color: var(--color-bg-tertiary, var(--color-bg-secondary));
  border-color: var(--color-text-muted);
  color: var(--color-text);
}

.theme-toggle:active {
  transform: scale(0.95);
}

.theme-toggle:focus-visible {
  outline: 2px solid var(--color-info);
  outline-offset: 2px;
}

.theme-toggle svg {
  width: 18px;
  height: 18px;
}

/* Icon visibility */
.theme-toggle .icon-sun {
  display: block;
}

.theme-toggle .icon-moon {
  display: none;
}

:root[data-theme="dark"] .theme-toggle .icon-sun {
  display: none;
}

:root[data-theme="dark"] .theme-toggle .icon-moon {
  display: block;
}

/* Auto dark mode icon states */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .theme-toggle .icon-sun {
    display: none;
  }
  :root:not([data-theme="light"]) .theme-toggle .icon-moon {
    display: block;
  }
}

/* Position in header */
.header-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}
```

### 2.6 Theme Toggle JavaScript (`src/assets/theme.js`)

Create a new file `src/assets/theme.js`:

```javascript
/**
 * OpenCode Replay - Theme Management
 * Handles dark/light mode toggle with localStorage persistence
 */
(function initTheme() {
  const THEME_KEY = 'opencode-replay-theme';

  /**
   * Get the user's preferred theme
   * Priority: localStorage > system preference > light
   */
  function getPreferredTheme() {
    const storedTheme = localStorage.getItem(THEME_KEY);
    
    if (storedTheme === 'dark' || storedTheme === 'light') {
      return storedTheme;
    }
    
    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    
    return 'light';
  }

  /**
   * Apply theme to document
   */
  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
    updateToggleButton(theme);
  }

  /**
   * Update toggle button accessibility attributes
   */
  function updateToggleButton(theme) {
    const toggle = document.getElementById('theme-toggle');
    if (toggle) {
      toggle.setAttribute('aria-label', 
        theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
      );
      toggle.setAttribute('aria-pressed', String(theme === 'dark'));
    }
  }

  /**
   * Toggle between light and dark themes
   */
  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || getPreferredTheme();
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  }

  // Initialize theme on page load
  document.addEventListener('DOMContentLoaded', function() {
    const theme = getPreferredTheme();
    setTheme(theme);

    // Set up toggle button click handler
    const toggle = document.getElementById('theme-toggle');
    if (toggle) {
      toggle.addEventListener('click', toggleTheme);
    }
  });

  // Listen for system theme changes (when no explicit preference is set)
  if (window.matchMedia) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    mediaQuery.addEventListener('change', function(e) {
      // Only auto-switch if user hasn't set an explicit preference recently
      const storedTheme = localStorage.getItem(THEME_KEY);
      const lastSet = localStorage.getItem(THEME_KEY + '-time');
      const now = Date.now();
      
      // If preference was set more than 24 hours ago, follow system
      if (!lastSet || (now - parseInt(lastSet, 10)) > 86400000) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    });
  }

  // Track when theme was last manually set
  const originalSetTheme = setTheme;
  setTheme = function(theme) {
    localStorage.setItem(THEME_KEY + '-time', String(Date.now()));
    originalSetTheme(theme);
  };
})();
```

### 2.7 FOUC Prevention Script

Add this inline script to the `<head>` of the base template (before CSS loads):

```html
<script>
  (function() {
    var theme = localStorage.getItem('opencode-replay-theme');
    if (!theme) {
      theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-theme', theme);
  })();
</script>
```

### 2.8 Base Template Updates (`src/render/templates/base.ts`)

Update the `renderBasePage` function:

```typescript
/**
 * Base HTML template wrapper
 * All pages extend this template
 */

import { escapeHtml } from "../../utils/html"

export interface BaseTemplateOptions {
  title: string
  content: string
  /** Relative path to assets directory (e.g., "../assets" or "../../assets") */
  assetsPath?: string
  /** Additional head content (e.g., meta tags) */
  headExtra?: string
  /** Additional body classes */
  bodyClass?: string
}

/**
 * Inline script to prevent Flash of Unstyled Content (FOUC)
 * Must be in <head> before CSS loads
 */
const FOUC_PREVENTION_SCRIPT = `<script>
(function() {
  var theme = localStorage.getItem('opencode-replay-theme');
  if (!theme) {
    theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.setAttribute('data-theme', theme);
})();
</script>`

/**
 * Theme toggle button HTML
 */
const THEME_TOGGLE_BUTTON = `<button 
  id="theme-toggle" 
  class="theme-toggle" 
  type="button"
  aria-label="Toggle dark mode"
  aria-pressed="false"
  title="Toggle theme"
>
  <svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/>
    <line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/>
    <line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
  <svg class="icon-moon" viewBox="0 0 24 24" fill="currentColor">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
</button>`

/**
 * Render the base HTML page template
 */
export function renderBasePage(options: BaseTemplateOptions): string {
  const {
    title,
    content,
    assetsPath = "./assets",
    headExtra = "",
    bodyClass = "",
  } = options

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="generator" content="opencode-replay">
  <meta name="color-scheme" content="light dark">
  <title>${escapeHtml(title)} - OpenCode Replay</title>
  ${FOUC_PREVENTION_SCRIPT}
  <link rel="stylesheet" href="${assetsPath}/styles.css">
  ${headExtra}
</head>
<body${bodyClass ? ` class="${bodyClass}"` : ""}>
  <div class="container">
    ${content}
  </div>
  <script src="${assetsPath}/theme.js"></script>
  <script src="${assetsPath}/search.js"></script>
</body>
</html>`
}

/**
 * Render a simple header with navigation
 */
export function renderHeader(options: {
  title: string
  subtitle?: string
  breadcrumbs?: Array<{ label: string; href?: string }>
  showSearch?: boolean
  showThemeToggle?: boolean
}): string {
  const { 
    title, 
    subtitle, 
    breadcrumbs = [], 
    showSearch = true,
    showThemeToggle = true 
  } = options

  const breadcrumbHtml =
    breadcrumbs.length > 0
      ? `<nav class="breadcrumbs">
        ${breadcrumbs
          .map((b, i) => {
            const isLast = i === breadcrumbs.length - 1
            if (isLast || !b.href) {
              return `<span class="breadcrumb-item current">${escapeHtml(b.label)}</span>`
            }
            return `<a href="${b.href}" class="breadcrumb-item">${escapeHtml(b.label)}</a>`
          })
          .join('<span class="breadcrumb-separator">/</span>')}
      </nav>`
      : ""

  const headerActions = (showSearch || showThemeToggle) 
    ? `<div class="header-actions">
    ${showSearch ? `<button class="search-trigger" type="button" aria-label="Search">
      <span class="search-icon">&#128269;</span>
      <span class="search-text">Search...</span>
      <kbd>Ctrl+K</kbd>
    </button>` : ''}
    ${showThemeToggle ? THEME_TOGGLE_BUTTON : ''}
  </div>`
    : ''

  return `<header class="page-header">
  <div class="header-top">
    ${breadcrumbHtml}
    ${headerActions}
  </div>
  <h1>${escapeHtml(title)}</h1>
  ${subtitle ? `<p class="subtitle">${escapeHtml(subtitle)}</p>` : ""}
</header>`
}

/**
 * Render a simple footer
 */
export function renderFooter(): string {
  return `<footer class="page-footer">
  <p>Generated by <a href="https://github.com/opencode-replay" target="_blank" rel="noopener">opencode-replay</a></p>
</footer>`
}
```

### 2.9 Update Header CSS

Add these styles to properly position the header elements:

```css
/* ============================================================================
   Page Header - Updated Layout
   ============================================================================ */

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--spacing-md);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex-shrink: 0;
}

/* Adjust search container for new layout */
.page-header .search-container {
  margin-top: 0;
}
```

### 2.10 Update `html.ts` to Copy Theme Assets

Update the `copyAssets` function in `src/render/html.ts`:

```typescript
/**
 * Copy asset files to output directory
 */
async function copyAssets(outputDir: string): Promise<void> {
  const assetsDir = join(outputDir, "assets")
  await ensureDir(assetsDir)

  // Copy CSS file
  const cssSource = join(import.meta.dir, "../assets/styles.css")
  await copyFile(cssSource, join(assetsDir, "styles.css"))

  // Copy theme.js
  const themeJsSource = join(import.meta.dir, "../assets/theme.js")
  await copyFile(themeJsSource, join(assetsDir, "theme.js"))

  // Create placeholder search.js for now
  const searchJs = `// OpenCode Replay - Search functionality
// Will be implemented in Phase 7
console.log("Search not yet implemented");
`
  await Bun.write(join(assetsDir, "search.js"), searchJs)
}
```

---

## File Changes Summary

### New Files to Create

| File | Description |
|------|-------------|
| `src/server.ts` | HTTP server implementation using Bun.serve() |
| `src/assets/theme.js` | Theme toggle JavaScript with localStorage persistence |

### Files to Modify

| File | Changes |
|------|---------|
| `src/index.ts` | Add --serve, --port, --no-generate flags; integrate server |
| `src/assets/styles.css` | Add dark mode CSS variables, element overrides, transitions, toggle button styles |
| `src/render/templates/base.ts` | Add FOUC prevention script, theme toggle button, update header layout |
| `src/render/html.ts` | Update copyAssets() to include theme.js |

---

## Todo List

### Phase 4.5.1: Built-in HTTP Server - COMPLETED

| ID | Task | Priority | Status |
|----|------|----------|--------|
| 4.5.1-cli-serve | Add --serve CLI flag (boolean, default: false) to index.ts | high | **completed** |
| 4.5.2-cli-port | Add --port CLI flag (number, default: 3000) to index.ts | high | **completed** |
| 4.5.3-cli-no-generate | Add --no-generate CLI flag (boolean, default: false) to skip generation and just serve | high | **completed** |
| 4.5.4-server-file | Create src/server.ts with Bun.serve() static file server implementation | high | **completed** |
| 4.5.5-mime-types | Implement proper MIME type handling via Bun.file() auto-detection | high | **completed** |
| 4.5.6-dir-index | Implement directory index handling (serve index.html for directory requests) | high | **completed** |
| 4.5.7-path-security | Implement path traversal security (prevent ../ attacks with resolve/startsWith) | high | **completed** |
| 4.5.8-404-handling | Implement 404 handling for missing files | medium | **completed** |
| 4.5.9-cache-headers | Add Cache-Control and ETag headers for static files | medium | **completed** |
| 4.5.10-graceful-shutdown | Implement graceful shutdown on SIGINT/SIGTERM | medium | **completed** |
| 4.5.11-auto-open | Auto-open browser when --serve is used (reuse existing --open logic) | medium | **completed** |
| 4.5.12-console-output | Display server URL in console output with Ctrl+C to stop message | medium | **completed** |
| 4.5.13-cli-help | Update CLI help text with new --serve, --port, --no-generate flags | low | **completed** |

### Phase 4.5.2: Dark Mode Theme - PENDING

| ID | Task | Priority | Status |
|----|------|----------|--------|
| 4.6.1-dark-css-vars | Add dark mode CSS variables to styles.css using GitHub-inspired palette | high | pending |
| 4.6.2-auto-dark | Add @media (prefers-color-scheme: dark) rules for automatic OS-based switching | high | pending |
| 4.6.3-data-theme | Add [data-theme='dark'] CSS overrides for manual toggle | high | pending |
| 4.6.4-theme-js | Create src/assets/theme.js with localStorage persistence and system preference detection | high | pending |
| 4.6.5-toggle-button | Create theme toggle button component (sun/moon icons) in base template header | high | pending |
| 4.6.6-fouc-prevention | Add inline script to prevent Flash of Unstyled Content (FOUC) in base template | high | pending |
| 4.6.7-tool-dark-colors | Update all tool-specific CSS colors for dark mode (bash, read, write, edit, etc.) | medium | pending |
| 4.6.8-code-dark | Update code block colors for dark mode (terminal output, syntax) | medium | pending |
| 4.6.9-copy-theme-js | Update html.ts to copy theme.js to output assets directory | medium | pending |
| 4.6.10-contrast-check | Verify all text colors meet WCAG AA contrast requirements (4.5:1 for text) | medium | pending |
| 4.6.11-transitions | Add smooth transitions between themes with reduced-motion respect | low | pending |
| 4.6.12-scrollbar | Add dark mode scrollbar styling | low | pending |
| 4.6.13-test-light | Test light mode renders correctly (regression test) | medium | pending |
| 4.6.14-test-dark | Test dark mode activates based on OS preference and manual toggle | medium | pending |

---

## Implementation Notes for Dark Mode

The server implementation is **completely independent** from dark mode. Key observations:

1. **No shared state**: The server just serves static files; it doesn't care about their content.

2. **No file conflicts**: The server implementation touched:
   - `src/server.ts` (new file)
   - `src/index.ts` (CLI flags only)
   - `README.md` (documentation)
   
   Dark mode will touch:
   - `src/assets/styles.css`
   - `src/assets/theme.js` (new file)
   - `src/render/templates/base.ts`
   - `src/render/html.ts`

3. **Testing synergy**: The `--serve` flag will be useful for testing dark mode visually during development. Run `opencode-replay --serve` and toggle between themes in the browser.

4. **No code changes needed**: The dark mode implementation plan in sections 2.1-2.10 can proceed exactly as written.
