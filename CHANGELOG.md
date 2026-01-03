# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.0] - 2026-01-03

### Added

- **Markdown output format** (`-f md`/`--format md`) - Generate markdown transcripts for sharing or piping
  - Output to stdout for piping: `opencode-replay -f md -s ses_xxx | gh gist create --filename transcript.md -`
  - Output to file: `opencode-replay -f md -s ses_xxx -o transcript.md`
  - Includes collapsible `<details>` sections for long tool outputs
  - Diff-style formatting for edit operations
  - Checkbox format for todo items

- **GitHub Gist integration** (`--gist`) - Upload HTML transcripts directly to GitHub Gist
  - Secret gists by default, use `--gist-public` for public gists
  - Generates shareable preview URL via [gisthost.github.io](https://gisthost.github.io/)
  - Requires [GitHub CLI](https://cli.github.com/) to be installed and authenticated

- **GitHub commit links** (`--repo <owner/name>`) - Add clickable links to GitHub commits
  - Automatically links commit hashes found in tool outputs
  - Example: `opencode-replay --repo sst/opencode`

- **Auto-naming** (`-a`/`--auto`) - Automatically name output directory from project or session name
  - Current project mode: `./my-project-replay`
  - Single session mode: `./session-title-replay`
  - All projects mode: `./opencode-all-2026-01-03`

- **Output control flags**
  - `-q`/`--quiet` - Suppress non-essential output
  - `--verbose` - Show detailed debug output
  - `--stdout` - Output markdown to stdout (requires `--session`)

### Changed

- Restructured README with new "Output Formats" section documenting HTML, Markdown, and Gist workflows
- Updated "All Options" table with all available CLI flags

## [1.0.2] - 2026-01-02

### Fixed

- Minor bug fixes and stability improvements

## [1.0.1] - 2026-01-01

### Fixed

- Initial bug fixes after release

## [1.0.0] - 2025-12-31

### Added

- Initial release
- Static HTML transcript generation from OpenCode sessions
- Support for all OpenCode tool types (bash, read, write, edit, glob, grep, task, todowrite, webfetch, batch)
- Session overview with timeline and statistics
- Paginated conversation view (5 prompts per page)
- Built-in HTTP server mode (`--serve`)
- JSON export option (`--json`)
- Multi-project support (`--all`)
- Syntax highlighting for code blocks
- Dark/light theme support
- Client-side search functionality

[Unreleased]: https://github.com/ramtinJ95/opencode-replay/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/ramtinJ95/opencode-replay/compare/v1.0.2...v1.1.0
[1.0.2]: https://github.com/ramtinJ95/opencode-replay/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/ramtinJ95/opencode-replay/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/ramtinJ95/opencode-replay/releases/tag/v1.0.0
