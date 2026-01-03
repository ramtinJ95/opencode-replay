import { spawn } from "bun"

/**
 * Result from creating a GitHub Gist
 */
export interface GistResult {
  /** The gist ID (hash) */
  gistId: string
  /** Full gist URL on github.com */
  gistUrl: string
  /** Preview URL on gisthost.github.io */
  previewUrl: string
}

/**
 * Options for creating a gist
 */
export interface CreateGistOptions {
  /** Make the gist public (default: secret) */
  public?: boolean
  /** Description for the gist */
  description?: string
}

/**
 * Error thrown when gh CLI is not available or not authenticated
 */
export class GistError extends Error {
  constructor(
    message: string,
    public readonly code: "NOT_INSTALLED" | "NOT_AUTHENTICATED" | "CREATE_FAILED"
  ) {
    super(message)
    this.name = "GistError"
  }
}

/**
 * Check if the GitHub CLI (gh) is installed
 */
export async function isGhInstalled(): Promise<boolean> {
  try {
    const proc = spawn(["which", "gh"], {
      stdout: "pipe",
      stderr: "pipe",
    })
    const exitCode = await proc.exited
    return exitCode === 0
  } catch {
    return false
  }
}

/**
 * Check if the user is authenticated with GitHub CLI
 */
export async function isGhAuthenticated(): Promise<boolean> {
  try {
    const proc = spawn(["gh", "auth", "status"], {
      stdout: "pipe",
      stderr: "pipe",
    })
    const exitCode = await proc.exited
    return exitCode === 0
  } catch {
    return false
  }
}

/**
 * Upload files to GitHub Gist using the gh CLI
 *
 * @param files - Array of file paths to upload
 * @param options - Gist creation options
 * @returns GistResult with URLs
 * @throws GistError if gh is not installed, not authenticated, or upload fails
 */
export async function createGist(
  files: string[],
  options: CreateGistOptions = {}
): Promise<GistResult> {
  // Check gh is installed
  if (!(await isGhInstalled())) {
    throw new GistError(
      "GitHub CLI (gh) not found. Install it from https://cli.github.com/",
      "NOT_INSTALLED"
    )
  }

  // Check gh is authenticated
  if (!(await isGhAuthenticated())) {
    throw new GistError(
      "Not authenticated with GitHub CLI. Run: gh auth login",
      "NOT_AUTHENTICATED"
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
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ])

  if (exitCode !== 0) {
    throw new GistError(
      `gh gist create failed: ${stderr.trim() || "Unknown error"}`,
      "CREATE_FAILED"
    )
  }

  // Parse result - gh outputs the gist URL
  const gistUrl = stdout.trim()
  const gistId = gistUrl.split("/").pop() || ""

  if (!gistId) {
    throw new GistError(
      `Failed to parse gist ID from output: ${gistUrl}`,
      "CREATE_FAILED"
    )
  }

  // Build preview URL for gisthost.github.io
  const previewUrl = `https://gisthost.github.io/?${gistId}/index.html`

  return { gistId, gistUrl, previewUrl }
}
