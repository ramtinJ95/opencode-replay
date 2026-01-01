/**
 * Conversation page template - displays paginated messages
 */

import type { Session, MessageWithParts } from "../../storage/types"
// HTML utilities imported for future use
import { renderBasePage, renderHeader, renderFooter } from "./base"
import { renderMessages } from "../components/message"

export interface ConversationPageData {
  /** The session being displayed */
  session: Session
  /** Project name */
  projectName?: string
  /** Messages for this page */
  messages: MessageWithParts[]
  /** Current page number (1-indexed) */
  pageNumber: number
  /** Total number of pages */
  totalPages: number
  /** Relative path to assets directory */
  assetsPath?: string
}

/**
 * Generate page link HTML
 */
function pageLink(pageNum: number, currentPage: number): string {
  const pageFile = `page-${String(pageNum).padStart(3, "0")}.html`
  if (pageNum === currentPage) {
    return `<span class="pagination-page current">${pageNum}</span>`
  }
  return `<a href="${pageFile}" class="pagination-page">${pageNum}</a>`
}

/**
 * Calculate which page numbers to show for smart pagination
 * Returns an array where -1 represents an ellipsis
 * 
 * Strategy:
 * - Always show first and last page
 * - Show pages around current page (window of 1 on each side)
 * - Use ellipsis (...) for gaps larger than 1
 * 
 * Examples:
 * - 7 pages, current=4: [1, 2, 3, 4, 5, 6, 7] (no ellipsis needed)
 * - 20 pages, current=1: [1, 2, -1, 20]
 * - 20 pages, current=10: [1, -1, 9, 10, 11, -1, 20]
 * - 20 pages, current=20: [1, -1, 19, 20]
 */
function getPageNumbers(currentPage: number, totalPages: number): number[] {
  // For 7 or fewer pages, show all
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  const pages: number[] = []
  const windowSize = 1 // Pages to show on each side of current

  // Always include first page
  pages.push(1)

  // Calculate start and end of the window around current page
  const windowStart = Math.max(2, currentPage - windowSize)
  const windowEnd = Math.min(totalPages - 1, currentPage + windowSize)

  // Add ellipsis if there's a gap after first page
  if (windowStart > 2) {
    pages.push(-1) // -1 represents ellipsis
  }

  // Add pages in the window
  for (let i = windowStart; i <= windowEnd; i++) {
    pages.push(i)
  }

  // Add ellipsis if there's a gap before last page
  if (windowEnd < totalPages - 1) {
    pages.push(-1)
  }

  // Always include last page
  pages.push(totalPages)

  return pages
}

/**
 * Render pagination controls with smart ellipsis for large page counts
 */
function renderPagination(pageNumber: number, totalPages: number): string {
  if (totalPages <= 1) return ""

  const parts: string[] = []

  // Previous link
  if (pageNumber > 1) {
    const prevFile = `page-${String(pageNumber - 1).padStart(3, "0")}.html`
    parts.push(`<a href="${prevFile}" class="pagination-prev">&larr; Previous</a>`)
  } else {
    parts.push(`<span class="pagination-prev disabled">&larr; Previous</span>`)
  }

  // Page numbers with smart ellipsis
  const pageNumbers = getPageNumbers(pageNumber, totalPages)
  for (const num of pageNumbers) {
    if (num === -1) {
      parts.push(`<span class="pagination-ellipsis">&hellip;</span>`)
    } else {
      parts.push(pageLink(num, pageNumber))
    }
  }

  // Next link
  if (pageNumber < totalPages) {
    const nextFile = `page-${String(pageNumber + 1).padStart(3, "0")}.html`
    parts.push(`<a href="${nextFile}" class="pagination-next">Next &rarr;</a>`)
  } else {
    parts.push(`<span class="pagination-next disabled">Next &rarr;</span>`)
  }

  return `<nav class="pagination">
  ${parts.join("\n  ")}
</nav>`
}

/**
 * Render the full conversation page
 */
export function renderConversationPage(data: ConversationPageData): string {
  const {
    session,
    projectName,
    messages,
    pageNumber,
    totalPages,
    assetsPath = "../../assets",
  } = data

  const breadcrumbs = [
    { label: projectName ?? "Sessions", href: "../../index.html" },
    { label: session.title, href: "index.html" },
    { label: `Page ${pageNumber}` },
  ]

  const header = renderHeader({
    title: session.title,
    subtitle: `Page ${pageNumber} of ${totalPages}`,
    breadcrumbs,
    showSearch: true,
  })

  const messagesHtml = renderMessages(messages)
  const paginationTop = renderPagination(pageNumber, totalPages)
  const paginationBottom = renderPagination(pageNumber, totalPages)
  const footer = renderFooter()

  const content = `
${header}
${paginationTop}
${messagesHtml}
${paginationBottom}
${footer}
`

  return renderBasePage({
    title: `${session.title} - Page ${pageNumber}`,
    content,
    assetsPath,
    bodyClass: "conversation-page",
  })
}
