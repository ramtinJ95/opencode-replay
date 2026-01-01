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
 * Render pagination controls
 */
function renderPagination(pageNumber: number, totalPages: number): string {
  if (totalPages <= 1) return ""

  const pages: string[] = []

  // Previous link
  if (pageNumber > 1) {
    const prevFile = `page-${String(pageNumber - 1).padStart(3, "0")}.html`
    pages.push(`<a href="${prevFile}" class="pagination-prev">&larr; Previous</a>`)
  } else {
    pages.push(`<span class="pagination-prev disabled">&larr; Previous</span>`)
  }

  // Page numbers
  for (let i = 1; i <= totalPages; i++) {
    const pageFile = `page-${String(i).padStart(3, "0")}.html`
    if (i === pageNumber) {
      pages.push(`<span class="current">${i}</span>`)
    } else {
      pages.push(`<a href="${pageFile}">${i}</a>`)
    }
  }

  // Next link
  if (pageNumber < totalPages) {
    const nextFile = `page-${String(pageNumber + 1).padStart(3, "0")}.html`
    pages.push(`<a href="${nextFile}" class="pagination-next">Next &rarr;</a>`)
  } else {
    pages.push(`<span class="pagination-next disabled">Next &rarr;</span>`)
  }

  return `<nav class="pagination">
  ${pages.join("\n")}
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
