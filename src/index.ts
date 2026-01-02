#!/usr/bin/env bun
/**
 * opencode-replay - Generate static HTML transcripts from OpenCode sessions
 */

import { parseArgs } from "util"
import { resolve } from "path"
import { getDefaultStoragePath, findProjectByPath, listProjects, listSessions } from "./storage/reader"
import { generateHtml, type ProgressInfo, type GenerationStats } from "./render/html"
import { serve } from "./server"

// =============================================================================
// OUTPUT HELPERS
// =============================================================================

/**
 * Format a progress message for display
 */
function formatProgress(progress: ProgressInfo): string {
  if (progress.phase === "scanning") {
    return `Scanning: ${progress.title}`
  }
  if (progress.phase === "complete") {
    return "" // Handled separately
  }
  // Truncate long titles
  const maxTitleLength = 50
  const title = progress.title.length > maxTitleLength 
    ? progress.title.slice(0, maxTitleLength - 3) + "..."
    : progress.title
  return `[${progress.current}/${progress.total}] ${title}`
}

/**
 * Format generation statistics summary
 */
function formatStats(stats: GenerationStats): string {
  const parts: string[] = []
  parts.push(`${stats.sessionCount} session${stats.sessionCount !== 1 ? "s" : ""}`)
  parts.push(`${stats.pageCount} page${stats.pageCount !== 1 ? "s" : ""}`)
  parts.push(`${stats.messageCount} message${stats.messageCount !== 1 ? "s" : ""}`)
  return parts.join(", ")
}

/**
 * Slugify a string for use as a directory name
 * Converts to lowercase, replaces spaces with hyphens, removes special characters
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single
    .replace(/^-|-$/g, "") // Remove leading/trailing hyphens
    .slice(0, 50) // Limit length
}

/**
 * Generate auto-named output directory based on mode
 */
async function getAutoOutputDir(
  storagePath: string,
  sessionId?: string,
  all?: boolean
): Promise<string> {
  if (all) {
    // All projects mode - use generic name with timestamp
    const date = new Date().toISOString().split("T")[0]
    return `./opencode-all-${date}`
  }

  if (sessionId) {
    // Single session mode - find session and use its title
    const projects = await listProjects(storagePath)
    for (const project of projects) {
      const sessions = await listSessions(storagePath, project.id)
      const session = sessions.find((s) => s.id === sessionId)
      if (session) {
        const name = slugify(session.title) || sessionId.slice(0, 12)
        return `./${name}-replay`
      }
    }
    // Session not found, use ID
    return `./${sessionId.slice(0, 12)}-replay`
  }

  // Current project mode - use project name
  const cwd = process.cwd()
  const project = await findProjectByPath(storagePath, cwd)
  if (project) {
    const name = project.name ?? project.worktree.split("/").pop() ?? "project"
    return `./${slugify(name)}-replay`
  }

  // Fallback
  return "./opencode-replay-output"
}

// Parse CLI arguments
const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    all: {
      type: "boolean",
      default: false,
      description: "Generate for all projects",
    },
    auto: {
      type: "boolean",
      short: "a",
      default: false,
      description: "Auto-name output directory from project/session",
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
    serve: {
      type: "boolean",
      default: false,
      description: "Start HTTP server after generation",
    },
    port: {
      type: "string",
      default: "3000",
      description: "Server port (default: 3000)",
    },
    "no-generate": {
      type: "boolean",
      default: false,
      description: "Skip generation, only serve existing output",
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
  --all                  Generate for all projects (default: current project only)
  -a, --auto             Auto-name output directory from project/session name
  -o, --output <dir>     Output directory (default: ./opencode-replay-output)
  -s, --session <id>     Generate for specific session only
  --json                 Include raw JSON export alongside HTML
  --open                 Open in browser after generation
  --storage <path>       Custom storage path (default: ~/.local/share/opencode/storage)
  --serve                Start HTTP server after generation
  --port <number>        Server port (default: 3000)
  --no-generate          Skip generation, only serve existing output
  -h, --help             Show this help message
  -v, --version          Show version

Examples:
  opencode-replay                     # Current project's sessions
  opencode-replay --all               # All projects
  opencode-replay -a                  # Auto-name output (e.g., ./my-project-replay)
  opencode-replay -o ./my-transcripts # Custom output directory
  opencode-replay --session ses_xxx   # Specific session only
  opencode-replay --serve             # Generate and serve via HTTP
  opencode-replay --serve --port 8080 # Serve on custom port
  opencode-replay --serve --no-generate -o ./existing  # Serve existing output
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
const port = parseInt(values.port ?? "3000", 10)

// Validate port
if (isNaN(port) || port < 1 || port > 65535) {
  console.error("Error: Invalid port number")
  process.exit(1)
}

// Validate storage path exists by trying to list projects
try {
  const projects = await listProjects(storagePath)
  // If we get here without an error, storage path is valid
  // (empty array is ok - just means no projects yet)
  void projects
} catch {
  console.error(`Error: OpenCode storage not found at: ${storagePath}`)
  console.error("")
  console.error("This could mean:")
  console.error("  1. OpenCode has not been used on this machine yet")
  console.error("  2. The storage path is incorrect")
  console.error("")
  console.error("Solutions:")
  console.error("  - Run OpenCode at least once to create the storage directory")
  console.error("  - Use --storage <path> to specify a custom storage location")
  console.error("")
  console.error(`Expected path: ${storagePath}`)
  process.exit(1)
}

// Determine output directory (explicit, auto, or default)
let outputDir: string
if (values.output) {
  // Explicit output directory
  outputDir = values.output
} else if (values.auto) {
  // Auto-generate output directory name
  outputDir = await getAutoOutputDir(storagePath, values.session, values.all)
} else {
  // Default
  outputDir = "./opencode-replay-output"
}

console.log("opencode-replay")
console.log("---------------")
console.log(`Storage path: ${storagePath}`)
console.log(`Output directory: ${resolve(outputDir)}`)

// Skip generation if --no-generate is set
if (values["no-generate"]) {
  // Validate output directory exists when skipping generation
  const indexFile = Bun.file(resolve(outputDir, "index.html"))
  if (!(await indexFile.exists())) {
    console.error(
      `Error: Output directory not found or missing index.html: ${resolve(outputDir)}`
    )
    console.error("Run without --no-generate to generate output first.")
    process.exit(1)
  }
  console.log("Skipping generation (--no-generate)")
  console.log("")
} else {
  console.log(`Mode: ${values.all ? "all projects" : "current project"}`)
  if (values.session) {
    console.log(`Session filter: ${values.session}`)
  }
  console.log("")

  try {
    const stats = await generateHtml({
      storagePath,
      outputDir: resolve(outputDir),
      all: values.all ?? false,
      sessionId: values.session,
      includeJson: values.json ?? false,
      onProgress: (progress) => {
        const msg = formatProgress(progress)
        if (msg) {
          // Use process.stdout.write for cleaner output (no newline)
          // Clear line and write new progress
          process.stdout.write(`\r\x1b[K${msg}`)
        }
      },
    })

    // Clear the progress line and print summary
    process.stdout.write("\r\x1b[K")
    console.log(`Generated ${formatStats(stats)}`)
    console.log(`Output: ${resolve(outputDir)}`)
  } catch (error) {
    // Clear any progress output before showing error
    process.stdout.write("\r\x1b[K")
    console.error("Error:", error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

// Start server if --serve is set
if (values.serve) {
  await serve({
    directory: resolve(outputDir),
    port,
    // Only auto-open if --open was explicitly passed, or if not specified (default for --serve)
    // This makes --serve auto-open by default, but respects explicit --open false
    open: values.open ?? true,
  })
} else if (values.open) {
  // Just open without serving (cross-platform)
  const indexPath = resolve(outputDir, "index.html")
  openInBrowser(indexPath)
}

/**
 * Open a file or URL in the default browser (cross-platform)
 */
function openInBrowser(target: string): void {
  const platform = process.platform
  
  if (platform === "darwin") {
    // macOS
    Bun.spawn(["open", target])
  } else if (platform === "win32") {
    // Windows - use cmd /c start with empty title
    Bun.spawn(["cmd", "/c", "start", "", target])
  } else {
    // Linux and others
    Bun.spawn(["xdg-open", target])
  }
}
