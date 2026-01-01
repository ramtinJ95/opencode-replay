#!/usr/bin/env bun
/**
 * opencode-replay - Generate static HTML transcripts from OpenCode sessions
 */

import { parseArgs } from "util"
import { resolve } from "path"
import { homedir } from "os"

// Default storage path for OpenCode
function getDefaultStoragePath(): string {
  return resolve(homedir(), ".local", "share", "opencode", "storage")
}

// Parse CLI arguments
const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    all: {
      type: "boolean",
      short: "a",
      default: false,
      description: "Generate for all projects",
    },
    output: {
      type: "string",
      short: "o",
      description: "Output directory",
    },
    session: {
      type: "string",
      short: "s",
      description: "Generate for specific session only",
    },
    json: {
      type: "boolean",
      default: false,
      description: "Include raw JSON export",
    },
    open: {
      type: "boolean",
      default: false,
      description: "Open in browser after generation",
    },
    storage: {
      type: "string",
      description: "Custom storage path",
    },
    help: {
      type: "boolean",
      short: "h",
      default: false,
      description: "Show help",
    },
    version: {
      type: "boolean",
      short: "v",
      default: false,
      description: "Show version",
    },
  },
  allowPositionals: true,
})

// Show help
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

// Show version
if (values.version) {
  // Read version from package.json
  const pkg = await Bun.file(
    resolve(import.meta.dir, "..", "package.json")
  ).json()
  console.log(pkg.version)
  process.exit(0)
}

// Main execution
const storagePath = values.storage ?? getDefaultStoragePath()
const outputDir = values.output ?? "./opencode-replay-output"

console.log("opencode-replay")
console.log("---------------")
console.log(`Storage path: ${storagePath}`)
console.log(`Output directory: ${resolve(outputDir)}`)
console.log(`Mode: ${values.all ? "all projects" : "current project"}`)
if (values.session) {
  console.log(`Session filter: ${values.session}`)
}
console.log("")
console.log("(HTML generation not yet implemented)")

// TODO: Implement in Phase 2+
// try {
//   await generateHtml({
//     storagePath,
//     outputDir: resolve(outputDir),
//     all: values.all ?? false,
//     sessionId: values.session,
//     includeJson: values.json ?? false,
//   })
//
//   console.log(`Generated HTML transcripts in ${outputDir}`)
//
//   if (values.open) {
//     const indexPath = resolve(outputDir, "index.html")
//     Bun.spawn(["open", indexPath])
//   }
// } catch (error) {
//   console.error("Error:", error instanceof Error ? error.message : error)
//   process.exit(1)
// }
