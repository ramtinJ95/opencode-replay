/**
 * Session page template - displays session overview with timeline
 */

import type { Session } from "../../storage/types"
import type { CommitInfo } from "../git-commits"
import { escapeHtml, truncate, isSafeUrl } from "../../utils/html"
import {
  formatDateTime,
  formatDuration,
  formatTokens,
  formatCost,
  formatDiff,
  formatTime,
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
  /** Commits made after this prompt */
  commits?: CommitInfo[]
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
  /** Include gist-preview.js for gisthost.github.io compatibility */
  gistMode?: boolean
}

/**
 * Render a single commit card
 */
function renderCommitCard(commit: CommitInfo): string {
  const { hash, message, branch, timestamp, url } = commit

  // Format the commit hash as a link if URL is available and safe
  const hashDisplay = url && isSafeUrl(url)
    ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="commit-hash">${escapeHtml(hash)}</a>`
    : `<span class="commit-hash">${escapeHtml(hash)}</span>`

  // Format branch if available
  const branchHtml = branch
    ? `<span class="commit-branch">${escapeHtml(branch)}</span>`
    : ""

  // Format timestamp
  const timeHtml = timestamp
    ? `<span class="commit-time">${formatTime(timestamp)}</span>`
    : ""

  return `<div class="commit-card">
  <div class="commit-icon">
    <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
      <path d="M11.75 7.5a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0zm1.5 0a5.25 5.25 0 1 1-10.5 0 5.25 5.25 0 0 1 10.5 0zm-1.5 0a3.75 3.75 0 1 0-7.5 0 3.75 3.75 0 0 0 7.5 0z"/>
      <path d="M8 4.5a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/>
    </svg>
  </div>
  <div class="commit-content">
    <div class="commit-header">
      ${hashDisplay}
      ${branchHtml}
      ${timeHtml}
    </div>
    <div class="commit-message">${escapeHtml(message)}</div>
  </div>
</div>`
}

/**
 * Render commit cards for a timeline entry
 */
function renderCommitCards(commits: CommitInfo[]): string {
  if (!commits || commits.length === 0) return ""
  
  return `<div class="commit-cards">
  ${commits.map(renderCommitCard).join("\n")}
</div>`
}

/**
 * Render a timeline entry
 */
function renderTimelineEntry(entry: TimelineEntry): string {
  const { promptNumber, messageId, promptPreview, toolCounts, pageNumber, commits } = entry

  // Format tool counts
  const toolStats = Object.entries(toolCounts)
    .filter(([_, count]) => count > 0)
    .map(([tool, count]) => `<span>${count} ${tool}</span>`)
    .join("")

  // Render commits if any
  const commitsHtml = renderCommitCards(commits ?? [])

  return `<div class="timeline-entry">
  <div class="timeline-marker">${promptNumber}</div>
  <div class="timeline-content">
    <a href="page-${String(pageNumber).padStart(3, "0")}.html#${messageId}" class="prompt-link">
      ${escapeHtml(truncate(promptPreview, 150))}
    </a>
    ${toolStats ? `<div class="timeline-stats">${toolStats}</div>` : ""}
    ${commitsHtml}
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
  const { session, projectName, timeline, pageCount, assetsPath = "../../assets", gistMode } = data

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
    gistMode,
  })
}
