/**
 * WebFetch tool renderer
 * Renders URL fetching operations with clickable URL and content preview
 */

import type { ToolPart } from "../../../storage/types"
import { escapeHtml, isSafeUrl } from "../../../utils/html"
import { formatBytes } from "../../../utils/format"

interface WebFetchToolInput {
  url: string
  format?: "text" | "markdown" | "html"
  timeout?: number
}

/**
 * Render a webfetch tool call with URL and content preview
 */
export function renderWebFetchTool(part: ToolPart): string {
  const { state } = part
  const input = state.input as WebFetchToolInput | undefined
  const url = input?.url || ""
  const format = input?.format || "markdown"
  const output = state.output || ""
  const error = state.error
  const status = state.status

  // Format URL as clickable link (if safe)
  const urlHtml = url && isSafeUrl(url)
    ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="webfetch-url">${escapeHtml(truncateUrl(url))}</a>`
    : `<span class="webfetch-url">${escapeHtml(url)}</span>`

  // Format badge
  const formatBadge = `<span class="webfetch-format">${escapeHtml(format)}</span>`

  // Count content size
  const contentLines = output.split("\n").length
  const contentSize = formatBytes(output.length)
  const sizeInfo = output ? `<span class="webfetch-size">${contentSize}</span>` : ""

  // Determine if content should be collapsed (long content)
  const isLongContent = contentLines > 30
  const collapsedClass = isLongContent ? "collapsed" : ""

  // Format content preview
  let contentHtml = ""
  if (output) {
    contentHtml = `<div class="webfetch-content">
      <pre><code>${escapeHtml(output)}</code></pre>
    </div>`
  }

  // Format error section
  let errorHtml = ""
  if (error) {
    errorHtml = `<div class="webfetch-error">
      <span class="error-icon">&#9888;</span>
      <span class="error-message">${escapeHtml(error)}</span>
    </div>`
  }

  return `<div class="tool-call tool-webfetch" data-status="${escapeHtml(status)}">
  <div class="tool-header" onclick="this.nextElementSibling.classList.toggle('collapsed')">
    <span class="tool-icon">&#127760;</span>
    ${urlHtml}
    ${formatBadge}
    ${sizeInfo}
    <span class="tool-toggle">${isLongContent ? "+" : "-"}</span>
  </div>
  <div class="tool-body ${collapsedClass}">
    ${contentHtml}
    ${errorHtml}
  </div>
</div>`
}

/**
 * Truncate URL for display
 */
function truncateUrl(url: string, maxLength = 60): string {
  if (url.length <= maxLength) return url

  // Try to show domain and path intelligently
  try {
    const parsed = new URL(url)
    const domain = parsed.hostname
    const path = parsed.pathname

    if (domain.length + path.length <= maxLength) {
      return domain + path
    }

    // Truncate path
    const availableForPath = maxLength - domain.length - 3
    if (availableForPath > 10) {
      return domain + path.slice(0, availableForPath) + "..."
    }

    return url.slice(0, maxLength - 3) + "..."
  } catch {
    return url.slice(0, maxLength - 3) + "..."
  }
}


