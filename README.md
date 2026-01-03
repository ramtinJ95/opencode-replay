# opencode-replay

[![npm version](https://img.shields.io/npm/v/opencode-replay.svg)](https://www.npmjs.com/package/opencode-replay)
[![npm downloads](https://img.shields.io/npm/dm/opencode-replay.svg)](https://www.npmjs.com/package/opencode-replay)

A CLI tool that generates static HTML transcripts from [OpenCode](https://github.com/sst/opencode) sessions, enabling browsing, searching, and sharing of AI-assisted coding conversations.

**[Live Demo](https://ramtinj95.github.io/opencode-replay/)** - See example session transcripts

## Why?

OpenCode stores session data in `~/.local/share/opencode/storage/` as JSON files, but this data isn't easily browsable or shareable. `opencode-replay` transforms these sessions into clean, searchable, static HTML pages.

**Use cases:**
- **PR Documentation** - Attach session transcripts to pull requests showing the AI collaboration process
- **Self-Review** - Analyze past sessions to identify effective prompting patterns
- **Team Sharing** - Share session transcripts with teammates for knowledge transfer
- **Debugging** - Review what happened in a session when something went wrong
- **Compliance** - Maintain audit trails of AI-assisted code generation

## Installation

```bash
# Using bun (recommended)
bun install -g opencode-replay

# Using npm
npm install -g opencode-replay
```

## Quick Start

```bash
# Generate HTML for current project's sessions
cd /path/to/your/project
opencode-replay

# Open the generated transcript in your browser
opencode-replay --open
```

## Output Formats

### HTML (default)

Generate static HTML transcripts viewable in any browser:

```bash
opencode-replay                     # Current project's sessions
opencode-replay --all               # All projects
opencode-replay -o ./my-transcripts # Custom output directory
opencode-replay -a                  # Auto-name output (e.g., ./my-project-replay)
```

### Markdown

Generate markdown for sharing or piping:

```bash
# To stdout (for piping)
opencode-replay -f md -s ses_xxx
opencode-replay -f md -s ses_xxx | gh gist create --filename transcript.md -
opencode-replay -f md -s ses_xxx | pbcopy

# To file
opencode-replay -f md -s ses_xxx -o transcript.md
```

### GitHub Gist

Upload HTML directly to GitHub Gist with a shareable preview URL:

```bash
opencode-replay --gist                 # Secret gist (default)
opencode-replay --gist --gist-public   # Public gist
opencode-replay -s ses_xxx --gist      # Upload specific session
```

Requires [GitHub CLI](https://cli.github.com/) to be installed and authenticated (`gh auth login`).

The generated gist is viewable via [gisthost.github.io](https://gisthost.github.io/) which renders HTML files directly.

## Usage

### Basic Commands

```bash
# Generate HTML for current project (auto-detects from cwd)
opencode-replay

# Generate HTML for ALL projects across your machine
opencode-replay --all

# Specify output directory (default: ./opencode-replay-output)
opencode-replay -o ./my-transcripts

# Export a specific session by ID
opencode-replay --session ses_4957d04cdffeJwdujYPBCKpIsb

# Open in browser after generation
opencode-replay --open

# Include raw JSON export alongside HTML
opencode-replay --json
```

### HTTP Server Mode

Serve generated transcripts via HTTP for easier viewing and sharing:

```bash
# Generate and serve via HTTP (default port: 3000)
opencode-replay --serve

# Serve on a custom port
opencode-replay --serve --port 8080

# Serve existing output without regenerating
opencode-replay --serve --no-generate -o ./existing-output
```

The built-in server includes:
- Automatic MIME type detection
- ETag-based caching for efficient reloads
- Directory index serving (serves `index.html` for directory requests)
- Path traversal protection
- Auto-opens browser on start

### GitHub Integration

Add clickable links to GitHub commits in the rendered output:

```bash
opencode-replay --repo owner/repo-name

# Example
opencode-replay --repo sst/opencode
```

This adds links to commit hashes found in tool outputs, making it easy to navigate to the exact commits referenced during a session.

### All Options

| Option | Short | Description |
|--------|-------|-------------|
| `--all` | | Generate for all projects (default: current project only) |
| `--auto` | `-a` | Auto-name output directory from project/session name |
| `--output <path>` | `-o` | Output directory (HTML) or file (markdown) |
| `--session <id>` | `-s` | Generate for a specific session only |
| `--format <type>` | `-f` | Output format: `html` (default), `md` |
| `--stdout` | | Output to stdout (markdown only, requires `--session`) |
| `--gist` | | Upload HTML to GitHub Gist after generation |
| `--gist-public` | | Make gist public (default: secret) |
| `--json` | | Include raw JSON export alongside HTML |
| `--open` | | Open in browser after generation |
| `--storage <path>` | | Custom storage path (default: `~/.local/share/opencode/storage`) |
| `--serve` | | Start HTTP server after generation |
| `--port <number>` | | Server port (default: `3000`) |
| `--no-generate` | | Skip generation, only serve existing output |
| `--repo <owner/name>` | | GitHub repo for commit links (e.g., `sst/opencode`) |
| `--quiet` | `-q` | Suppress non-essential output |
| `--verbose` | | Show detailed debug output |
| `--help` | `-h` | Show help message |
| `--version` | `-v` | Show version |

### Examples

```bash
# Generate transcripts for your current project
cd ~/workspace/my-project
opencode-replay

# Generate all sessions and open in browser
opencode-replay --all --open

# Export a specific session with JSON data
opencode-replay --session ses_abc123 --json -o ./session-export

# Auto-name output from project name
opencode-replay -a  # Creates ./my-project-replay

# Use custom storage location
opencode-replay --storage /custom/path/to/storage

# Generate and serve for easy sharing
opencode-replay --serve --port 8080

# Quick preview of existing transcripts
opencode-replay --serve --no-generate -o ./my-transcripts

# Markdown to stdout for piping
opencode-replay -f md -s ses_xxx

# Create a GitHub Gist from a session
opencode-replay -s ses_xxx --gist

# Upload all projects to a public gist
opencode-replay --all --gist --gist-public

# Add GitHub commit links
opencode-replay --repo sst/opencode
```

## Output Structure

```
opencode-replay-output/
├── index.html                    # Master index (all sessions)
├── assets/
│   ├── styles.css               # Stylesheet
│   └── search.js                # Client-side search
├── projects/                     # Only in --all mode
│   └── {project-name}/
│       └── index.html           # Project-level session list
└── sessions/
    └── {session-id}/
        ├── index.html           # Session overview with timeline
        ├── page-001.html        # Conversation pages (5 prompts each)
        ├── page-002.html
        └── session.json         # Raw data (if --json flag)
```

## Tool Renderers

Each tool type has specialized rendering:

| Tool | Display |
|------|---------|
| `bash` | Terminal-style command with `$` prefix, dark output box |
| `read` | File path header with content preview and line numbers |
| `write` | File path with "Created" badge, content preview |
| `edit` | Side-by-side diff view (old/new comparison) |
| `glob` | Pattern with file list and type icons |
| `grep` | Pattern with matching lines (file:line format) |
| `task` | Agent type badge with collapsible prompt/result |
| `todowrite` | Checklist with status icons |
| `webfetch` | Clickable URL with content preview |
| `batch` | Nested tool call summary |

## Requirements

- [Bun](https://bun.sh) runtime (recommended) or Node.js 18+
- OpenCode sessions in standard storage location
- [GitHub CLI](https://cli.github.com/) (optional, for `--gist` feature)

## Development

```bash
# Clone the repository
git clone https://github.com/ramtinJ95/opencode-replay
cd opencode-replay

# Install dependencies
bun install

# Run in development mode
bun run src/index.ts

# Type check
bun run typecheck

# Build for distribution
bun run build
```

## License

MIT
