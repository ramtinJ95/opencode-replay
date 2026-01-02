/**
 * HTML generation orchestration
 * Main entry point for generating static HTML from OpenCode sessions
 */

import { join, dirname } from "node:path"
import { mkdir, copyFile } from "node:fs/promises"
import type { Session, MessageWithParts, TextPart } from "../storage/types"
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
  type TimelineEntry,
} from "./templates"

// =============================================================================
// CONFIGURATION
// =============================================================================

/** Number of user prompts per conversation page */
export const PROMPTS_PER_PAGE = 5

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
 * Copy asset files to output directory
 */
async function copyAssets(outputDir: string): Promise<void> {
  const assetsDir = join(outputDir, "assets")
  await ensureDir(assetsDir)

  // Copy CSS files
  const cssSource = join(import.meta.dir, "../assets/styles.css")
  await copyFile(cssSource, join(assetsDir, "styles.css"))
  
  const prismCssSource = join(import.meta.dir, "../assets/prism.css")
  await copyFile(prismCssSource, join(assetsDir, "prism.css"))

  // Copy JavaScript files
  const themeJsSource = join(import.meta.dir, "../assets/theme.js")
  await copyFile(themeJsSource, join(assetsDir, "theme.js"))
  
  const highlightJsSource = join(import.meta.dir, "../assets/highlight.js")
  await copyFile(highlightJsSource, join(assetsDir, "highlight.js"))

  // Copy search.js
  const searchJsSource = join(import.meta.dir, "../assets/search.js")
  await copyFile(searchJsSource, join(assetsDir, "search.js"))
}

// =============================================================================
// DATA EXTRACTION HELPERS
// =============================================================================

/**
 * Extract the first user prompt text from messages
 */
export function getFirstPrompt(messages: MessageWithParts[]): string | undefined {
  for (const msg of messages) {
    if (msg.message.role === "user") {
      for (const part of msg.parts) {
        if (part.type === "text") {
          return (part as TextPart).text
        }
      }
    }
  }
  return undefined
}

/**
 * Count tool usage in an assistant message's parts
 */
export function countTools(parts: MessageWithParts["parts"]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const part of parts) {
    if (part.type === "tool") {
      counts[part.tool] = (counts[part.tool] ?? 0) + 1
    }
  }
  return counts
}

/**
 * Build timeline entries from messages
 */
export function buildTimeline(messages: MessageWithParts[]): TimelineEntry[] {
  const timeline: TimelineEntry[] = []
  let promptNumber = 0

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]!
    if (msg.message.role !== "user") continue

    promptNumber++

    // Get user prompt text
    let promptPreview = ""
    for (const part of msg.parts) {
      if (part.type === "text") {
        promptPreview = (part as TextPart).text
        break
      }
    }

    // Get tool counts from the following assistant message(s)
    const toolCounts: Record<string, number> = {}
    for (let j = i + 1; j < messages.length; j++) {
      const nextMsg = messages[j]!
      if (nextMsg.message.role === "user") break
      const counts = countTools(nextMsg.parts)
      for (const [tool, count] of Object.entries(counts)) {
        toolCounts[tool] = (toolCounts[tool] ?? 0) + count
      }
    }

    // Calculate page number
    const pageNumber = Math.ceil(promptNumber / PROMPTS_PER_PAGE)

    timeline.push({
      promptNumber,
      messageId: msg.message.id,
      promptPreview,
      timestamp: msg.message.time.created,
      toolCounts,
      pageNumber,
    })
  }

  return timeline
}

/**
 * Paginate messages by user prompts
 * Returns array of message groups, each containing up to PROMPTS_PER_PAGE user messages
 */
export function paginateMessages(
  messages: MessageWithParts[]
): MessageWithParts[][] {
  const pages: MessageWithParts[][] = []
  let currentPage: MessageWithParts[] = []
  let promptCount = 0

  for (const msg of messages) {
    if (msg.message.role === "user") {
      promptCount++
      if (promptCount > PROMPTS_PER_PAGE) {
        pages.push(currentPage)
        currentPage = []
        promptCount = 1
      }
    }
    currentPage.push(msg)
  }

  if (currentPage.length > 0) {
    pages.push(currentPage)
  }

  return pages
}

// =============================================================================
// SESSION GENERATION
// =============================================================================

/**
 * Generate HTML for a single session
 */
async function generateSessionHtml(
  storagePath: string,
  outputDir: string,
  session: Session,
  projectName?: string
): Promise<{ messageCount: number; pageCount: number; firstPrompt?: string }> {
  const sessionDir = join(outputDir, "sessions", session.id)
  await ensureDir(sessionDir)

  // Load messages
  const messages = await getMessagesWithParts(storagePath, session.id)
  const messageCount = messages.length
  const firstPrompt = getFirstPrompt(messages)

  // Build timeline
  const timeline = buildTimeline(messages)

  // Calculate totals
  let totalTokensInput = 0
  let totalTokensOutput = 0
  let totalCost = 0
  let model: string | undefined

  for (const msg of messages) {
    if (msg.message.role === "assistant") {
      const asst = msg.message
      if (asst.tokens) {
        totalTokensInput += asst.tokens.input
        totalTokensOutput += asst.tokens.output
      }
      if (asst.cost) {
        totalCost += asst.cost
      }
      if (!model && asst.modelID) {
        model = asst.modelID
      }
    }
  }

  // Paginate messages
  const pages = paginateMessages(messages)
  const pageCount = pages.length

  // Generate session overview page
  const sessionOverviewHtml = renderSessionPage({
    session,
    projectName,
    timeline,
    messageCount,
    totalTokens:
      totalTokensInput > 0 || totalTokensOutput > 0
        ? { input: totalTokensInput, output: totalTokensOutput }
        : undefined,
    totalCost: totalCost > 0 ? totalCost : undefined,
    pageCount,
    model,
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
      totalPages: pageCount,
      assetsPath: "../../assets",
    })
    const pageFile = `page-${String(pageNumber).padStart(3, "0")}.html`
    await writeHtml(join(sessionDir, pageFile), pageHtml)
  }

  return { messageCount, pageCount, firstPrompt }
}

// =============================================================================
// MAIN ENTRY POINT
// =============================================================================

/**
 * Generate static HTML transcripts from OpenCode sessions
 */
export async function generateHtml(options: GenerateHtmlOptions): Promise<GenerationStats> {
  const { storagePath, outputDir, all = false, sessionId, onProgress } = options

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
      project.name
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
