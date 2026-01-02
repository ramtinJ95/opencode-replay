#!/usr/bin/env bun
/**
 * opencode-replay - Generate static HTML transcripts from OpenCode sessions
 */

import { parseArgs } from "util"
import { resolve, join } from "path"
import { readdir } from "node:fs/promises"
import { getDefaultStoragePath, findProjectByPath, listProjects, listSessions } from "./storage/reader"
import { generateHtml, type ProgressInfo, type GenerationStats } from "./render/html"
import { serve } from "./server"

// =============================================================================
// TERMINAL COLORS
// =============================================================================

// ANSI color codes for terminal output
const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  
  // Foreground colors
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  gray: "\x1b[90m",
}

// Check if colors should be used (respects NO_COLOR env var and TTY)
const useColors = !process.env.NO_COLOR && process.stdout.isTTY

function color(text: string, ...codes: string[]): string {
  if (!useColors) return text
  return codes.join("") + text + colors.reset
}

// Output mode flags (set after argument parsing)
let quietMode = false
let verboseMode = false

/**
 * Log a message (respects --quiet flag)
 */
function log(message: string): void {
  if (!quietMode) {
    console.log(message)
  }
}

/**
 * Log a debug message (only shows with --verbose flag)
 */
function debug(message: string): void {
  if (verboseMode && !quietMode) {
    console.log(color("[debug]", colors.gray) + " " + message)
  }
}

/**
 * Write to stdout (for progress updates, respects --quiet flag)
 */
function writeProgress(message: string): void {
  if (!quietMode) {
    process.stdout.write(message)
  }
}

// =============================================================================
// OUTPUT HELPERS
// =============================================================================

/**
 * Format a progress message for display
 */
function formatProgress(progress: ProgressInfo): string {
  if (progress.phase === "scanning") {
    return color("Scanning: ", colors.cyan) + color(progress.title, colors.dim)
  }
  if (progress.phase === "complete") {
    return "" // Handled separately
  }
  // Truncate long titles
  const maxTitleLength = 50
  const title = progress.title.length > maxTitleLength 
    ? progress.title.slice(0, maxTitleLength - 3) + "..."
    : progress.title
  const counter = color(`[${progress.current}/${progress.total}]`, colors.cyan)
  return `${counter} ${title}`
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
    const slug = slugify(name) || "project"
    return `./${slug}-replay`
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
    quiet: {
      type: "boolean",
      short: "q",
      default: false,
      description: "Suppress non-essential output",
    },
    verbose: {
      type: "boolean",
      default: false,
      description: "Show detailed debug output",
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
  -q, --quiet            Suppress non-essential output
  --verbose              Show detailed debug output
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
quietMode = values.quiet ?? false
verboseMode = values.verbose ?? false

debug(`CLI arguments: ${JSON.stringify(values)}`)
debug(`Storage path: ${storagePath}`)
debug(`Working directory: ${process.cwd()}`)

// Validate port
if (isNaN(port) || port < 1 || port > 65535) {
  console.error("Error: Invalid port number")
  process.exit(1)
}

// Validate storage path exists
// First check if the directory exists, then verify it has the expected structure
try {
  await readdir(storagePath)
  // Directory exists - verify it has the project/ subdirectory (OpenCode storage structure)
  const projectDir = join(storagePath, "project")
  try {
    await readdir(projectDir)
  } catch {
    throw new Error("INVALID_STORAGE")
  }
} catch (err) {
  const error = err as NodeJS.ErrnoException
  console.error(color("Error:", colors.red, colors.bold) + ` OpenCode storage not found at: ${storagePath}`)
  console.error("")
  if (error.code === "ENOENT") {
    console.error(color("The directory does not exist.", colors.yellow))
  } else if (error.message === "INVALID_STORAGE") {
    console.error(color("The directory exists but is not a valid OpenCode storage.", colors.yellow))
    console.error(color("Missing 'project/' subdirectory.", colors.dim))
  } else {
    console.error(color("The directory exists but is not a valid OpenCode storage.", colors.yellow))
  }
  console.error("")
  console.error(color("This could mean:", colors.dim))
  console.error("  1. OpenCode has not been used on this machine yet")
  console.error("  2. The storage path is incorrect")
  console.error("")
  console.error(color("Solutions:", colors.green))
  console.error("  - Run OpenCode at least once to create the storage directory")
  console.error("  - Use --storage <path> to specify a custom storage location")
  console.error("")
  console.error(color("Expected path:", colors.dim) + ` ${storagePath}`)
  process.exit(1)
}

// Determine output directory (explicit, auto, or default)
let outputDir: string
if (values.output) {
  // Explicit output directory
  outputDir = values.output
  debug(`Using explicit output directory: ${outputDir}`)
} else if (values.auto) {
  // Auto-generate output directory name
  debug("Auto-generating output directory name...")
  outputDir = await getAutoOutputDir(storagePath, values.session, values.all)
  debug(`Auto-generated output directory: ${outputDir}`)
} else {
  // Default
  outputDir = "./opencode-replay-output"
  debug(`Using default output directory: ${outputDir}`)
}

log(color("opencode-replay", colors.bold, colors.cyan))
log(color("---------------", colors.dim))
log(color("Storage:", colors.dim) + ` ${storagePath}`)
log(color("Output:", colors.dim) + ` ${resolve(outputDir)}`)

// Skip generation if --no-generate is set
if (values["no-generate"]) {
  // Validate output directory exists when skipping generation
  const indexFile = Bun.file(resolve(outputDir, "index.html"))
  if (!(await indexFile.exists())) {
    console.error(
      color("Error:", colors.red, colors.bold) + 
      ` Output directory not found or missing index.html: ${resolve(outputDir)}`
    )
    console.error("Run without --no-generate to generate output first.")
    process.exit(1)
  }
  log(color("Skipping generation (--no-generate)", colors.yellow))
  log("")
} else {
  const modeText = values.all ? "all projects" : "current project"
  log(color("Mode:", colors.dim) + ` ${modeText}`)
  if (values.session) {
    log(color("Session:", colors.dim) + ` ${values.session}`)
  }
  log("")

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
          // Use writeProgress for cleaner output (no newline)
          // Clear line and write new progress
          writeProgress(`\r\x1b[K${msg}`)
        }
      },
    })

    // Clear the progress line and print summary
    writeProgress("\r\x1b[K")
    
    // Warn if --session was specified but no session was found
    if (values.session && stats.sessionCount === 0) {
      console.error(color("Warning:", colors.yellow, colors.bold) + ` Session not found: ${values.session}`)
      console.error("Use --all to see all available sessions, or check the session ID.")
      process.exit(1)
    }
    
    log(color("Done!", colors.green, colors.bold) + ` Generated ${formatStats(stats)}`)
    // Always output the final path (even in quiet mode for scripting)
    console.log(resolve(outputDir))
  } catch (error) {
    // Clear any progress output before showing error
    process.stdout.write("\r\x1b[K")
    console.error(color("Error:", colors.red, colors.bold) + " " + (error instanceof Error ? error.message : error))
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
