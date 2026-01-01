# opencode-replay

A CLI tool that generates static HTML transcripts from [OpenCode](https://github.com/sst/opencode) sessions, enabling browsing, searching, and sharing of AI-assisted coding conversations.

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

### All Options

| Option | Short | Description |
|--------|-------|-------------|
| `--all` | `-a` | Generate for all projects (default: current project only) |
| `--output <dir>` | `-o` | Output directory (default: `./opencode-replay-output`) |
| `--session <id>` | `-s` | Generate for a specific session only |
| `--json` | | Include raw JSON export alongside HTML |
| `--open` | | Open in browser after generation |
| `--storage <path>` | | Custom storage path (default: `~/.local/share/opencode/storage`) |
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

# Use custom storage location
opencode-replay --storage /custom/path/to/storage
```

## Output Structure

```
opencode-replay-output/
├── index.html                    # Master index (all sessions)
├── assets/
│   ├── styles.css               # Stylesheet
│   └── search.js                # Client-side search (coming soon)
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

## Development

```bash
# Clone the repository
git clone https://github.com/username/opencode-replay
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
