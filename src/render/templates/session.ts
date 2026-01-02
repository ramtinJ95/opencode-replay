/**
 * Session page template - displays session overview with timeline
 */

import type { Session } from "../../storage/types"
import { escapeHtml, truncate } from "../../utils/html"
import {
  formatDateTime,
  formatDuration,
  formatTokens,
  formatCost,
  formatDiff,
} from "../../utils/format"
import { renderBasePage, renderHeader, renderFooter } from "./base"

export interface TimelineEntry {
  /** Prompt number (1-indexed) */
  promptNumber: number
  /** User message ID */
  messageId: string
  /** Preview of the user's prompt */
  promptPreview: string
  /** Timestamp */
  timestamp: number
  /** Tool usage counts */
  toolCounts: Record<string, number>
  /** Which page this prompt appears on */
  pageNumber: number
}

export interface SessionPageData {
  /** The session being displayed */
  session: Session
  /** Project name */
  projectName?: string
  /** Timeline entries (one per user prompt) */
  timeline: TimelineEntry[]
  /** Total message count */
  messageCount: number
  /** Total token usage */
  totalTokens?: { input: number; output: number }
  /** Total cost */
  totalCost?: number
  /** Total pages */
  pageCount: number
  /** Model used (from first assistant message) */
  model?: string
  /** Relative path to assets directory */
  assetsPath?: string
}

/**
 * Render a timeline entry
 */
function renderTimelineEntry(entry: TimelineEntry): string {
  const { promptNumber, messageId, promptPreview, toolCounts, pageNumber } = entry

  // Format tool counts
  const toolStats = Object.entries(toolCounts)
    .filter(([_, count]) => count > 0)
    .map(([tool, count]) => `<span>${count} ${tool}</span>`)
    .join("")

  return `<div class="timeline-entry">
  <div class="timeline-marker">${promptNumber}</div>
  <div class="timeline-content">
    <a href="page-${String(pageNumber).padStart(3, "0")}.html#${messageId}" class="prompt-link">
      ${escapeHtml(truncate(promptPreview, 150))}
    </a>
    ${toolStats ? `<div class="timeline-stats">${toolStats}</div>` : ""}
  </div>
</div>`
}

/**
 * Render the session timeline
 */
function renderTimeline(entries: TimelineEntry[]): string {
  if (entries.length === 0) {
    return `<div class="no-timeline">
      <p>No messages in this session.</p>
    </div>`
  }

  return `<div class="session-timeline">
  ${entries.map(renderTimelineEntry).join("\n")}
</div>`
}

/**
 * Render session stats
 */
function renderSessionStats(data: SessionPageData): string {
  const { session, messageCount, totalTokens, totalCost, model } = data

  // Calculate duration if we have timestamps
  const duration =
    session.time.updated > session.time.created
      ? formatDuration(session.time.created, session.time.updated)
      : null

  const stats: Array<{ label: string; value: string }> = []

  stats.push({ label: "Created", value: formatDateTime(session.time.created) })

  if (duration) {
    stats.push({ label: "Duration", value: duration })
  }

  stats.push({ label: "Messages", value: String(messageCount) })

  if (model) {
    stats.push({ label: "Model", value: model })
  }

  if (totalTokens) {
    const tokenStr = `${formatTokens(totalTokens.input)} in / ${formatTokens(totalTokens.output)} out`
    stats.push({ label: "Tokens", value: tokenStr })
  }

  if (totalCost !== undefined && totalCost > 0) {
    stats.push({ label: "Cost", value: formatCost(totalCost) })
  }

  if (session.summary) {
    const { additions, deletions, files } = session.summary
    if (additions || deletions) {
      stats.push({ label: "Changes", value: formatDiff(additions ?? 0, deletions ?? 0) })
    }
    if (files) {
      stats.push({ label: "Files", value: String(files) })
    }
  }

  return `<div class="stats">
  ${stats.map((s) => `<div class="stat"><span class="stat-label">${s.label}</span><span class="stat-value">${escapeHtml(s.value)}</span></div>`).join("\n")}
</div>`
}

/**
 * Render pagination links
 */
function renderPagination(pageCount: number): string {
  if (pageCount <= 1) return ""

  const links = Array.from({ length: pageCount }, (_, i) => {
    const pageNum = i + 1
    const pageFile = `page-${String(pageNum).padStart(3, "0")}.html`
    return `<a href="${pageFile}">Page ${pageNum}</a>`
  }).join("\n")

  return `<nav class="pagination">
  ${links}
</nav>`
}

/**
 * Render the full session overview page
 */
export function renderSessionPage(data: SessionPageData): string {
  const { session, projectName, timeline, pageCount, assetsPath = "../../assets" } = data

  const breadcrumbs = [
    { label: projectName ?? "Sessions", href: "../../index.html" },
    { label: session.title },
  ]

  const header = renderHeader({
    title: session.title,
    subtitle: `Session ${session.id}`,
    breadcrumbs,
    showSearch: true,
  })

  const stats = renderSessionStats(data)
  const timelineHtml = renderTimeline(timeline)
  const pagination = renderPagination(pageCount)
  const footer = renderFooter()

  const content = `
${header}
${stats}
<h2>Timeline</h2>
${timelineHtml}
${pagination}
${footer}
`

  return renderBasePage({
    title: session.title,
    content,
    assetsPath,
    bodyClass: "session-page",
    totalPages: pageCount,
  })
}
