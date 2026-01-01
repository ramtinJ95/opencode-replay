/**
 * Write tool renderer
 * Renders file write operations with file path, status badge, and content preview
 */

import type { ToolPart } from "../../../storage/types"
import { escapeHtml } from "../../../utils/html"

interface WriteToolInput {
  filePath: string
  content: string
}

/**
 * Render a write tool call with file path and content preview
 */
export function renderWriteTool(part: ToolPart): string {
  const { state } = part
  const input = state.input as WriteToolInput | undefined
  const filePath = input?.filePath || state.title || "Unknown file"
  const content = input?.content || ""
  const error = state.error
  const status = state.status

  // Extract filename from path
  const fileName = filePath.split("/").pop() || filePath

  // Count lines in content
  const lineCount = content ? content.split("\n").length : 0
  const lineInfo = `<span class="write-lines">${lineCount} lines</span>`

  // Character count
  const charCount = content.length
  const charInfo = `<span class="write-chars">${formatBytes(charCount)}</span>`

  // Determine if content should be collapsed by default (long content)
  const isLongContent = lineCount > 30
  const collapsedClass = isLongContent ? "collapsed" : ""

  // Status badge - write tool creates or updates files
  const statusBadge = status === "completed"
    ? `<span class="write-badge badge-success">Created</span>`
    : status === "error"
    ? `<span class="write-badge badge-error">Failed</span>`
    : `<span class="write-badge">Writing...</span>`

  // Format content preview
  let contentHtml = ""
  if (content) {
    contentHtml = `<div class="write-content">
      <pre><code>${escapeHtml(content)}</code></pre>
    </div>`
  }

  // Format error section
  let errorHtml = ""
  if (error) {
    errorHtml = `<div class="write-error">
      <span class="error-icon">&#9888;</span>
      <span class="error-message">${escapeHtml(error)}</span>
    </div>`
  }

  return `<div class="tool-call tool-write" data-status="${escapeHtml(status)}">
  <div class="tool-header" onclick="this.nextElementSibling.classList.toggle('collapsed')">
    <span class="tool-icon">&#128221;</span>
    ${statusBadge}
    <span class="write-file-path" title="${escapeHtml(filePath)}">${escapeHtml(fileName)}</span>
    <span class="write-full-path">${escapeHtml(filePath)}</span>
    ${lineInfo}
    ${charInfo}
    <span class="tool-toggle">${isLongContent ? "+" : "-"}</span>
  </div>
  <div class="tool-body ${collapsedClass}">
    ${contentHtml}
    ${errorHtml}
  </div>
</div>`
}

/**
 * Format byte count to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
