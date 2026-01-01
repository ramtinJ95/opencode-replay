/**
 * Index page template - displays list of sessions or projects
 */

import type { Session, Project } from "../../storage/types"
import { escapeHtml, truncate } from "../../utils/html"
import { formatDate, formatRelativeTime, formatDiff } from "../../utils/format"
import { renderBasePage, renderHeader, renderFooter } from "./base"

export interface SessionCardData {
  session: Session
  project?: Project
  messageCount?: number
  firstPrompt?: string
}

export interface IndexPageData {
  /** Page title */
  title: string
  /** Optional subtitle */
  subtitle?: string
  /** List of sessions to display */
  sessions: SessionCardData[]
  /** Whether this is a multi-project view */
  isAllProjects?: boolean
  /** Breadcrumbs for navigation */
  breadcrumbs?: Array<{ label: string; href?: string }>
  /** Relative path to assets directory */
  assetsPath?: string
}

/**
 * Render a single session card
 */
function renderSessionCard(data: SessionCardData, isAllProjects: boolean): string {
  const { session, project, messageCount, firstPrompt } = data
  const sessionUrl = `sessions/${session.id}/index.html`

  // Format date
  const dateStr = formatRelativeTime(session.time.updated)
  const fullDate = formatDate(session.time.created)

  // Summary stats
  const summary = session.summary
  const hasStats = summary && (summary.additions || summary.deletions || summary.files)

  return `<a href="${sessionUrl}" class="session-card" data-session-id="${escapeHtml(session.id)}">
  <div class="session-title">${escapeHtml(session.title)}</div>
  <div class="session-meta">
    <span title="${fullDate}">${dateStr}</span>
    ${messageCount !== undefined ? `<span>${messageCount} messages</span>` : ""}
    ${isAllProjects && project?.name ? `<span>${escapeHtml(project.name)}</span>` : ""}
  </div>
  ${firstPrompt ? `<div class="session-summary">${escapeHtml(truncate(firstPrompt, 200))}</div>` : ""}
  ${
    hasStats
      ? `<div class="session-stats">
    ${summary?.additions ? `<span class="stat-additions">+${summary.additions}</span>` : ""}
    ${summary?.deletions ? `<span class="stat-deletions">-${summary.deletions}</span>` : ""}
    ${summary?.files ? `<span>${summary.files} files</span>` : ""}
  </div>`
      : ""
  }
</a>`
}

/**
 * Render the session list
 */
function renderSessionList(sessions: SessionCardData[], isAllProjects: boolean): string {
  if (sessions.length === 0) {
    return `<div class="no-sessions">
      <p>No sessions found.</p>
    </div>`
  }

  return `<div class="session-list">
  ${sessions.map((s) => renderSessionCard(s, isAllProjects)).join("\n")}
</div>`
}

/**
 * Render stats summary for the index page
 */
function renderIndexStats(sessions: SessionCardData[]): string {
  const totalSessions = sessions.length
  const totalMessages = sessions.reduce((sum, s) => sum + (s.messageCount ?? 0), 0)

  // Calculate total changes
  const totalAdditions = sessions.reduce((sum, s) => sum + (s.session.summary?.additions ?? 0), 0)
  const totalDeletions = sessions.reduce((sum, s) => sum + (s.session.summary?.deletions ?? 0), 0)

  return `<div class="stats">
  <div class="stat">
    <span class="stat-label">Sessions</span>
    <span class="stat-value">${totalSessions}</span>
  </div>
  ${
    totalMessages > 0
      ? `<div class="stat">
    <span class="stat-label">Messages</span>
    <span class="stat-value">${totalMessages}</span>
  </div>`
      : ""
  }
  ${
    totalAdditions > 0 || totalDeletions > 0
      ? `<div class="stat">
    <span class="stat-label">Changes</span>
    <span class="stat-value">${formatDiff(totalAdditions, totalDeletions)}</span>
  </div>`
      : ""
  }
</div>`
}

/**
 * Render the full index page
 */
export function renderIndexPage(data: IndexPageData): string {
  const {
    title,
    subtitle,
    sessions,
    isAllProjects = false,
    breadcrumbs = [],
    assetsPath = "./assets",
  } = data

  const header = renderHeader({
    title,
    subtitle,
    breadcrumbs,
    showSearch: true,
  })

  const stats = renderIndexStats(sessions)
  const sessionList = renderSessionList(sessions, isAllProjects)
  const footer = renderFooter()

  const content = `
${header}
${stats}
${sessionList}
${footer}
`

  return renderBasePage({
    title,
    content,
    assetsPath,
    bodyClass: "index-page",
  })
}
