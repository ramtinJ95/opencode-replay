/**
 * Markdown renderer - Main entry point
 * Generates markdown output for sessions and conversations
 */

import type { Session, MessageWithParts } from "../../storage/types"
import type {
  RenderContext,
  SessionRenderData,
  ConversationRenderData,
  FullTranscriptData,
  FormatRenderer,
} from "../types"
import type { SessionStats } from "../data"
import { formatDateTime, formatTokens, formatCost } from "../../utils/format"
import { renderMessageMd } from "./message"

// =============================================================================
// MARKDOWN FORMAT RENDERER
// =============================================================================

/**
 * Markdown format renderer implementation
 */
export const markdownRenderer: FormatRenderer = {
  renderSession,
  renderConversation,
  renderFullTranscript,
}

// =============================================================================
// SESSION OVERVIEW
// =============================================================================

/**
 * Render session overview as markdown
 */
function renderSession(data: SessionRenderData, _context: RenderContext): string {
  const { session, projectName, timeline, messageCount, totalTokens, totalCost, model } = data
  const lines: string[] = []

  // Title
  lines.push(`# ${session.title}`)
  lines.push("")

  // Metadata
  lines.push("## Session Info")
  lines.push("")
  lines.push(`- **Session ID:** \`${session.id}\``)
  if (projectName) {
    lines.push(`- **Project:** ${projectName}`)
  }
  lines.push(`- **Created:** ${formatDateTime(session.time.created)}`)
  lines.push(`- **Messages:** ${messageCount}`)
  if (model) {
    lines.push(`- **Model:** ${model}`)
  }
  if (totalTokens) {
    lines.push(
      `- **Tokens:** ${formatTokens(totalTokens.input)} in / ${formatTokens(totalTokens.output)} out`
    )
  }
  if (totalCost && totalCost > 0) {
    lines.push(`- **Cost:** ${formatCost(totalCost)}`)
  }
  lines.push("")

  // Timeline
  if (timeline.length > 0) {
    lines.push("## Timeline")
    lines.push("")
    lines.push("| # | Prompt | Tools |")
    lines.push("|---|--------|-------|")

    for (const entry of timeline) {
      const preview = truncateText(entry.promptPreview, 60)
      const tools = formatToolCounts(entry.toolCounts)
      lines.push(`| ${entry.promptNumber} | ${preview} | ${tools} |`)
    }
    lines.push("")
  }

  lines.push("---")
  lines.push("")

  return lines.join("\n")
}

// =============================================================================
// CONVERSATION PAGE
// =============================================================================

/**
 * Render a conversation page as markdown
 */
function renderConversation(data: ConversationRenderData, _context: RenderContext): string {
  const { messages, pageNumber, totalPages } = data
  const lines: string[] = []

  // Page header
  if (totalPages > 1) {
    lines.push(`## Page ${pageNumber} of ${totalPages}`)
    lines.push("")
  }

  // Render messages
  for (const msg of messages) {
    lines.push(renderMessageMd(msg))
    lines.push("")
    lines.push("---")
    lines.push("")
  }

  // Page navigation hint
  if (totalPages > 1) {
    const navParts: string[] = []
    if (pageNumber > 1) {
      navParts.push(`Previous: Page ${pageNumber - 1}`)
    }
    if (pageNumber < totalPages) {
      navParts.push(`Next: Page ${pageNumber + 1}`)
    }
    if (navParts.length > 0) {
      lines.push(`*${navParts.join(" | ")}*`)
      lines.push("")
    }
  }

  return lines.join("\n")
}

// =============================================================================
// FULL TRANSCRIPT
// =============================================================================

/**
 * Render full transcript as a single markdown document
 * This is the primary output format for markdown generation
 */
function renderFullTranscript(data: FullTranscriptData, _context: RenderContext): string {
  const { session, projectName, messages, stats } = data
  const lines: string[] = []

  // Header
  lines.push(`# ${session.title}`)
  lines.push("")

  // Metadata block
  lines.push(`**Session:** \`${session.id}\``)
  if (projectName) {
    lines.push(`**Project:** ${projectName}`)
  }
  lines.push(`**Created:** ${formatDateTime(session.time.created)}`)
  lines.push(`**Messages:** ${messages.length}`)

  // Stats
  if (stats.model) {
    lines.push(`**Model:** ${stats.model}`)
  }
  if (stats.totalTokensInput > 0 || stats.totalTokensOutput > 0) {
    lines.push(
      `**Tokens:** ${formatTokens(stats.totalTokensInput)} in / ${formatTokens(stats.totalTokensOutput)} out`
    )
  }
  if (stats.totalCost > 0) {
    lines.push(`**Cost:** ${formatCost(stats.totalCost)}`)
  }
  lines.push("")
  lines.push("---")
  lines.push("")

  // Messages
  for (const msg of messages) {
    lines.push(renderMessageMd(msg))
    lines.push("")
    lines.push("---")
    lines.push("")
  }

  return lines.join("\n")
}

// =============================================================================
// STANDALONE GENERATION FUNCTION
// =============================================================================

export interface GenerateMarkdownOptions {
  session: Session
  messages: MessageWithParts[]
  projectName?: string
  stats: SessionStats
  /** Include session metadata header */
  includeHeader?: boolean
}

/**
 * Generate markdown from session data
 * Convenience function that wraps the FormatRenderer interface
 */
export function generateMarkdown(options: GenerateMarkdownOptions): string {
  const { session, messages, projectName, stats, includeHeader = true } = options

  const data: FullTranscriptData = {
    session,
    projectName,
    messages,
    timeline: [], // Not needed for full transcript
    stats,
  }

  const context: RenderContext = {
    format: "markdown",
  }

  if (!includeHeader) {
    // Just render messages without header
    const lines: string[] = []
    for (const msg of messages) {
      lines.push(renderMessageMd(msg))
      lines.push("")
      lines.push("---")
      lines.push("")
    }
    return lines.join("\n")
  }

  return renderFullTranscript(data, context)
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Truncate text for table display
 */
function truncateText(text: string, maxLength: number): string {
  // Remove newlines for table display
  const singleLine = text.replace(/\n/g, " ").trim()
  if (singleLine.length <= maxLength) {
    return singleLine
  }
  return singleLine.slice(0, maxLength - 3) + "..."
}

/**
 * Format tool counts for display
 */
function formatToolCounts(counts: Record<string, number>): string {
  const entries = Object.entries(counts)
  if (entries.length === 0) return "-"

  return entries.map(([tool, count]) => `${tool}:${count}`).join(", ")
}
