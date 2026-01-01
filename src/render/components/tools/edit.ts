/**
 * Edit tool renderer
 * Renders file edit operations with side-by-side diff view
 */

import type { ToolPart } from "../../../storage/types"
import { escapeHtml } from "../../../utils/html"

interface EditToolInput {
  filePath: string
  oldString: string
  newString: string
  replaceAll?: boolean
}

/**
 * Render an edit tool call with diff view
 */
export function renderEditTool(part: ToolPart): string {
  const { state } = part
  const input = state.input as EditToolInput | undefined
  const filePath = input?.filePath || state.title || "Unknown file"
  const oldString = input?.oldString || ""
  const newString = input?.newString || ""
  const replaceAll = input?.replaceAll || false
  const error = state.error
  const status = state.status

  // Extract filename from path
  const fileName = filePath.split("/").pop() || filePath

  // Count changes
  const oldLines = oldString.split("\n").length
  const newLines = newString.split("\n").length
  const lineDiff = newLines - oldLines

  // Format diff stats
  const additions = lineDiff > 0 ? lineDiff : 0
  const deletions = lineDiff < 0 ? Math.abs(lineDiff) : 0
  const diffStats = `<span class="edit-stats">
    <span class="edit-additions">+${additions}</span>
    <span class="edit-deletions">-${deletions}</span>
  </span>`

  // Replace all indicator
  const replaceAllBadge = replaceAll
    ? `<span class="edit-replace-all">Replace All</span>`
    : ""

  // Format diff view
  const diffHtml = renderDiff(oldString, newString)

  // Format error section
  let errorHtml = ""
  if (error) {
    errorHtml = `<div class="edit-error">
      <span class="error-icon">&#9888;</span>
      <span class="error-message">${escapeHtml(error)}</span>
    </div>`
  }

  return `<div class="tool-call tool-edit" data-status="${status}">
  <div class="tool-header" onclick="this.nextElementSibling.classList.toggle('collapsed')">
    <span class="tool-icon">&#9998;</span>
    <span class="edit-file-path" title="${escapeHtml(filePath)}">${escapeHtml(fileName)}</span>
    <span class="edit-full-path">${escapeHtml(filePath)}</span>
    ${replaceAllBadge}
    ${diffStats}
    <span class="tool-toggle">-</span>
  </div>
  <div class="tool-body">
    ${diffHtml}
    ${errorHtml}
  </div>
</div>`
}

/**
 * Render side-by-side diff view
 */
function renderDiff(oldString: string, newString: string): string {
  // For short strings, show simple side-by-side
  const oldLines = oldString.split("\n")
  const newLines = newString.split("\n")

  // If both are relatively short, use side-by-side view
  if (oldLines.length <= 50 && newLines.length <= 50) {
    return `<div class="edit-diff">
      <div class="diff-old">
        <div class="diff-label">Old</div>
        <pre><code class="diff-removed">${escapeHtml(oldString)}</code></pre>
      </div>
      <div class="diff-new">
        <div class="diff-label">New</div>
        <pre><code class="diff-added">${escapeHtml(newString)}</code></pre>
      </div>
    </div>`
  }

  // For longer content, use collapsible sections
  return `<div class="edit-diff-long">
    <details class="diff-section diff-old-section">
      <summary class="diff-label">Old (${oldLines.length} lines)</summary>
      <pre><code class="diff-removed">${escapeHtml(oldString)}</code></pre>
    </details>
    <details class="diff-section diff-new-section" open>
      <summary class="diff-label">New (${newLines.length} lines)</summary>
      <pre><code class="diff-added">${escapeHtml(newString)}</code></pre>
    </details>
  </div>`
}
