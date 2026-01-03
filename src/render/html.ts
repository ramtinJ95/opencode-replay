/**
 * HTML generation orchestration
 * Main entry point for generating static HTML from OpenCode sessions
 */

import { join, dirname } from "node:path"
import { mkdir, copyFile } from "node:fs/promises"
import type { Session, MessageWithParts } from "../storage/types"
import {
  listProjects,
  listSessions,
  getMessagesWithParts,
  findProjectByPath,
} from "../storage/reader"
import {
  renderIndexPage,
  renderSessionPage,
  renderConversationPage,
  type SessionCardData,
} from "./templates"
import { type RepoInfo } from "./git-commits"
import {
  PROMPTS_PER_PAGE,
  getFirstPrompt,
  buildTimeline,
  paginateMessages,
  calculateSessionStats,
  buildSessionData,
} from "./data"

// Re-export for backwards compatibility
export { PROMPTS_PER_PAGE } from "./data"

export interface GenerateHtmlOptions {
  /** Path to OpenCode storage directory */
  storagePath: string
  /** Output directory for generated HTML */
  outputDir: string
  /** Generate for all projects (true) or current project only (false) */
  all?: boolean
  /** Generate for specific session only */
  sessionId?: string
  /** Include raw JSON export */
  includeJson?: boolean
  /** Progress callback for reporting generation progress */
  onProgress?: (progress: ProgressInfo) => void
  /** GitHub repository info for commit links */
  repo?: RepoInfo
}

export interface ProgressInfo {
  /** Current session being processed (1-indexed) */
  current: number
  /** Total number of sessions to process */
  total: number
  /** Session title */
  title: string
  /** Phase of processing */
  phase: "scanning" | "generating" | "complete"
}

export interface GenerationStats {
  /** Number of sessions generated */
  sessionCount: number
  /** Total number of conversation pages generated */
  pageCount: number
  /** Total number of messages processed */
  messageCount: number
  /** Project name (if single project mode) */
  projectName?: string
}

// =============================================================================
// FILE WRITING HELPERS
// =============================================================================

/**
 * Ensure a directory exists, creating it if necessary
 */
async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true })
}

/**
 * Write an HTML file
 */
async function writeHtml(filePath: string, content: string): Promise<void> {
  await ensureDir(dirname(filePath))
  await Bun.write(filePath, content)
}

/**
 * Get the assets source directory
 * Handles both development (src/render -> src/assets) and production (dist -> dist/assets)
 */
function getAssetsSourceDir(): string {
  // In production bundle, assets are in ./assets relative to the bundle
  const prodAssetsDir = join(import.meta.dir, "assets")
  // In development, assets are in ../assets relative to src/render/
  const devAssetsDir = join(import.meta.dir, "../assets")
  
  // Check which one exists (prod takes priority since it's the installed state)
  if (Bun.file(join(prodAssetsDir, "styles.css")).size) {
    return prodAssetsDir
  }
  return devAssetsDir
}

/**
 * Copy asset files to output directory
 */
async function copyAssets(outputDir: string): Promise<void> {
  const assetsDir = join(outputDir, "assets")
  await ensureDir(assetsDir)

  const sourceDir = getAssetsSourceDir()

  // Copy CSS files
  await copyFile(join(sourceDir, "styles.css"), join(assetsDir, "styles.css"))
  await copyFile(join(sourceDir, "prism.css"), join(assetsDir, "prism.css"))

  // Copy JavaScript files
  await copyFile(join(sourceDir, "theme.js"), join(assetsDir, "theme.js"))
  await copyFile(join(sourceDir, "highlight.js"), join(assetsDir, "highlight.js"))
  await copyFile(join(sourceDir, "search.js"), join(assetsDir, "search.js"))
}

// Re-export data utilities for backwards compatibility
export { getFirstPrompt, countTools, buildTimeline, paginateMessages } from "./data"

// =============================================================================
// SESSION GENERATION
// =============================================================================

/**
 * Generate HTML for a single session
 * Uses shared data utilities from data.ts
 */
async function generateSessionHtml(
  storagePath: string,
  outputDir: string,
  session: Session,
  projectName?: string,
  repo?: RepoInfo,
  includeJson?: boolean
): Promise<{ messageCount: number; pageCount: number; firstPrompt?: string }> {
  const sessionDir = join(outputDir, "sessions", session.id)
  await ensureDir(sessionDir)

  // Load messages
  const messages = await getMessagesWithParts(storagePath, session.id)
  
  // Use shared data utilities
  const firstPrompt = getFirstPrompt(messages)
  const timeline = buildTimeline(messages, repo)
  const stats = calculateSessionStats(messages)
  const pages = paginateMessages(messages)

  // Generate session overview page
  const sessionOverviewHtml = renderSessionPage({
    session,
    projectName,
    timeline,
    messageCount: stats.messageCount,
    totalTokens:
      stats.totalTokensInput > 0 || stats.totalTokensOutput > 0
        ? { input: stats.totalTokensInput, output: stats.totalTokensOutput }
        : undefined,
    totalCost: stats.totalCost > 0 ? stats.totalCost : undefined,
    pageCount: stats.pageCount,
    model: stats.model,
    assetsPath: "../../assets",
  })
  await writeHtml(join(sessionDir, "index.html"), sessionOverviewHtml)

  // Generate conversation pages
  for (let i = 0; i < pages.length; i++) {
    const pageNumber = i + 1
    const pageMessages = pages[i] ?? []
    const pageHtml = renderConversationPage({
      session,
      projectName,
      messages: pageMessages,
      pageNumber,
      totalPages: stats.pageCount,
      assetsPath: "../../assets",
    })
    const pageFile = `page-${String(pageNumber).padStart(3, "0")}.html`
    await writeHtml(join(sessionDir, pageFile), pageHtml)
  }

  // Write JSON export if requested
  if (includeJson) {
    const jsonData = {
      session,
      messages,
      timeline,
      stats,
    }
    await Bun.write(
      join(sessionDir, "session.json"),
      JSON.stringify(jsonData, null, 2)
    )
  }

  return { messageCount: stats.messageCount, pageCount: stats.pageCount, firstPrompt }
}

// =============================================================================
// MAIN ENTRY POINT
// =============================================================================

/**
 * Generate static HTML transcripts from OpenCode sessions
 */
export async function generateHtml(options: GenerateHtmlOptions): Promise<GenerationStats> {
  const { storagePath, outputDir, all = false, sessionId, includeJson = false, onProgress, repo } = options

  // Ensure output directory exists
  await ensureDir(outputDir)

  // Copy assets
  await copyAssets(outputDir)

  // Collect sessions to process
  const sessionCards: SessionCardData[] = []
  let title = "OpenCode Sessions"
  let projectName: string | undefined

  // Track generation statistics
  let totalPageCount = 0
  let totalMessageCount = 0

  // Helper to process a session and update stats
  async function processSession(
    session: Session,
    project: { id: string; name?: string; worktree: string; time: { created: number; updated: number } },
    index: number,
    total: number
  ) {
    onProgress?.({
      current: index + 1,
      total,
      title: session.title,
      phase: "generating",
    })

    const result = await generateSessionHtml(
      storagePath,
      outputDir,
      session,
      project.name,
      repo,
      includeJson
    )

    totalPageCount += result.pageCount
    totalMessageCount += result.messageCount

    sessionCards.push({
      session,
      project,
      messageCount: result.messageCount,
      firstPrompt: result.firstPrompt,
    })
  }

  if (sessionId) {
    // Single session mode
    onProgress?.({ current: 0, total: 1, title: "Scanning...", phase: "scanning" })
    const projects = await listProjects(storagePath)
    for (const project of projects) {
      const sessions = await listSessions(storagePath, project.id)
      const session = sessions.find((s) => s.id === sessionId)
      if (session) {
        await processSession(session, project, 0, 1)
        title = session.title
        projectName = project.name
        break
      }
    }
  } else if (all) {
    // All projects mode - first scan to count total sessions
    onProgress?.({ current: 0, total: 0, title: "Scanning projects...", phase: "scanning" })
    const projects = await listProjects(storagePath)
    
    // Collect all sessions first to know the total count
    const allSessions: Array<{ session: Session; project: typeof projects[0] }> = []
    for (const project of projects) {
      const sessions = await listSessions(storagePath, project.id)
      for (const session of sessions) {
        allSessions.push({ session, project })
      }
    }

    // Now process with accurate progress
    for (let i = 0; i < allSessions.length; i++) {
      const { session, project } = allSessions[i]!
      await processSession(session, project, i, allSessions.length)
    }
    title = "All OpenCode Sessions"
  } else {
    // Current project mode
    const cwd = process.cwd()
    onProgress?.({ current: 0, total: 0, title: "Finding project...", phase: "scanning" })
    const project = await findProjectByPath(storagePath, cwd)

    if (!project) {
      throw new Error(
        `No OpenCode project found for directory: ${cwd}\n` +
          `Run this command from a directory where you have used OpenCode, ` +
          `or use --all to generate for all projects.`
      )
    }

    projectName = project.name ?? project.worktree.split("/").pop()
    title = projectName ?? "OpenCode Sessions"

    const sessions = await listSessions(storagePath, project.id)
    for (let i = 0; i < sessions.length; i++) {
      const session = sessions[i]!
      await processSession(session, project, i, sessions.length)
    }
  }

  // Generate index page
  const indexHtml = renderIndexPage({
    title,
    subtitle: projectName,
    sessions: sessionCards,
    isAllProjects: all,
    assetsPath: "./assets",
  })
  await writeHtml(join(outputDir, "index.html"), indexHtml)

  onProgress?.({
    current: sessionCards.length,
    total: sessionCards.length,
    title: "Complete",
    phase: "complete",
  })

  return {
    sessionCount: sessionCards.length,
    pageCount: totalPageCount,
    messageCount: totalMessageCount,
    projectName,
  }
}
