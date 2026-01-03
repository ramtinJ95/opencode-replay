/**
 * Data extraction and processing utilities
 * Shared between HTML and Markdown renderers
 */

import type { Session, MessageWithParts, TextPart, AssistantMessage } from "../storage/types"
import type { TimelineEntry } from "./templates"
import type { RepoInfo, CommitInfo } from "./git-commits"
import { extractCommitsFromMessages, detectRepoFromMessages } from "./git-commits"

// =============================================================================
// CONFIGURATION
// =============================================================================

/** Number of user prompts per conversation page */
export const PROMPTS_PER_PAGE = 5

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
 * Optionally includes git commits if repoInfo is provided or detected
 */
export function buildTimeline(
  messages: MessageWithParts[],
  repoOverride?: RepoInfo
): TimelineEntry[] {
  const timeline: TimelineEntry[] = []
  let promptNumber = 0

  // Extract commits from messages
  // First try to detect repo from messages if not provided
  const detectedRepo = repoOverride ?? detectRepoFromMessages(messages) ?? undefined
  const commitsWithPrompts = extractCommitsFromMessages(messages, detectedRepo)
  
  // Group commits by prompt number for efficient lookup
  const commitsByPrompt = new Map<number, CommitInfo[]>()
  for (const { commit, afterPromptNumber } of commitsWithPrompts) {
    const existing = commitsByPrompt.get(afterPromptNumber) ?? []
    existing.push(commit)
    commitsByPrompt.set(afterPromptNumber, existing)
  }

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

    // Get commits for this prompt
    const commits = commitsByPrompt.get(promptNumber)

    timeline.push({
      promptNumber,
      messageId: msg.message.id,
      promptPreview,
      timestamp: msg.message.time.created,
      toolCounts,
      pageNumber,
      commits,
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
// SESSION STATISTICS
// =============================================================================

/** Aggregated statistics for a session */
export interface SessionStats {
  messageCount: number
  pageCount: number
  totalTokensInput: number
  totalTokensOutput: number
  totalCost: number
  model?: string
}

/**
 * Calculate aggregated statistics from messages
 */
export function calculateSessionStats(messages: MessageWithParts[]): SessionStats {
  let totalTokensInput = 0
  let totalTokensOutput = 0
  let totalCost = 0
  let model: string | undefined
  let userMessageCount = 0

  for (const msg of messages) {
    if (msg.message.role === "assistant") {
      const asst = msg.message as AssistantMessage
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
    } else if (msg.message.role === "user") {
      userMessageCount++
    }
  }

  // Calculate page count directly instead of calling paginateMessages
  const pageCount = userMessageCount > 0 ? Math.ceil(userMessageCount / PROMPTS_PER_PAGE) : 0

  return {
    messageCount: messages.length,
    pageCount,
    totalTokensInput,
    totalTokensOutput,
    totalCost,
    model,
  }
}

// =============================================================================
// FULL SESSION DATA
// =============================================================================

/** Complete data for rendering a session (used by both HTML and Markdown) */
export interface SessionData {
  session: Session
  projectName?: string
  messages: MessageWithParts[]
  timeline: TimelineEntry[]
  stats: SessionStats
  firstPrompt?: string
}

/**
 * Build complete session data from raw inputs
 * This is the main data structure used by format renderers
 */
export function buildSessionData(
  session: Session,
  messages: MessageWithParts[],
  projectName?: string,
  repo?: RepoInfo
): SessionData {
  const timeline = buildTimeline(messages, repo)
  const stats = calculateSessionStats(messages)
  const firstPrompt = getFirstPrompt(messages)

  return {
    session,
    projectName,
    messages,
    timeline,
    stats,
    firstPrompt,
  }
}
