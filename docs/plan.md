# opencode-replay

A standalone CLI tool that generates static HTML transcripts from OpenCode sessions, enabling retroactive browsing, searching, and exporting of AI-assisted coding conversations.

## Current Status: v1.0.0 Released

Published to npm: https://www.npmjs.com/package/opencode-replay
GitHub: https://github.com/ramtinJ95/opencode-replay

### Installation

```bash
bun install -g opencode-replay
# or
npm install -g opencode-replay
```

### Implemented Features (v1.0.0)

| Feature | Status |
|---------|--------|
| Static HTML generation | Done |
| Storage reader (projects, sessions, messages, parts) | Done |
| All tool renderers (bash, read, write, edit, glob, grep, task, todowrite, webfetch, batch) | Done |
| All part type renderers (text, reasoning, file, snapshot, patch, agent, compaction, subtask, retry) | Done |
| Pagination & navigation (5 prompts/page, smart ellipsis) | Done |
| Client-side search with Ctrl+K | Done |
| Dark mode with system preference detection | Done |
| Built-in HTTP server (`--serve`) | Done |
| Git commit integration with GitHub links | Done |
| Syntax highlighting for code blocks | Done |
| CLI with all flags (--all, --auto, --output, --session, --json, --open, --storage, --serve, --port, --no-generate, --repo, --quiet, --verbose) | Done |

## Future Work

### v1.1: TUI Mode
- Browse sessions interactively in terminal
- Navigate with keyboard shortcuts
- Preview sessions without generating HTML

### v1.2: Live Server Mode
- Optional local server with hot reload
- Watch for new sessions and auto-regenerate
- WebSocket for live updates

### v1.3: Cost Analytics
- Token usage graphs and cost summaries
- Per-session and aggregate statistics
- Model comparison charts
- Export analytics data

### v1.4: Custom Themes
- Theme configuration file support
- Custom color schemes
- CSS override mechanism
- Theme presets (GitHub, VS Code, etc.)

### v1.5: Gist Publishing
- `--gist` flag to upload HTML to GitHub Gist
- Get shareable preview URL via gistpreview.github.io
- Requires GitHub CLI (`gh`) to be installed and authenticated
- Inject JavaScript to fix relative links when served through gistpreview
- Combine with `-o` to keep local copy alongside gist upload

### v1.6: Pattern Analytics Dashboard
Cross-session analysis for self-improvement:
- Prompt effectiveness scoring (iterations to completion)
- Tool usage frequency and patterns
- Token efficiency trends over time
- Common failure modes identification
- Session duration vs. complexity metrics
- Model comparison (if using multiple models)

### v1.7: PR Integration Helpers
Features specifically for code review:
- Single-file HTML export for easy attachment
- Session summary generation (AI-generated or templated)
- Diff-focused view showing only file changes
- Cost/token summary badge for PR comments

## References

- [OpenCode Storage Architecture](./opencode-storage-implementation.md) - Detailed analysis of OpenCode's storage system
- [claude-code-transcripts](https://github.com/simonw/claude-code-transcripts) - Inspiration project for Claude Code
- [OpenCode Repository](https://github.com/sst/opencode) - Source code reference
