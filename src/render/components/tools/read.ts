/**
 * Read tool renderer
 * Renders file read operations with file path and content preview
 */

import type { ToolPart } from "../../../storage/types"
import { escapeHtml } from "../../../utils/html"

interface ReadToolInput {
  filePath: string
  offset?: number
  limit?: number
}

/**
 * Render a read tool call with file path and content
 */
export function renderReadTool(part: ToolPart): string {
  const { state } = part
  const input = state.input as ReadToolInput | undefined
  const filePath = input?.filePath || state.title || "Unknown file"
  const offset = input?.offset
  const limit = input?.limit
  const output = state.output || ""
  const error = state.error
  const status = state.status

  // Extract filename from path
  const fileName = filePath.split("/").pop() || filePath

  // Format range info if present
  let rangeInfo = ""
  if (offset !== undefined || limit !== undefined) {
    const parts = []
    if (offset !== undefined) parts.push(`from line ${offset}`)
    if (limit !== undefined) parts.push(`${limit} lines`)
    rangeInfo = `<span class="read-range">(${parts.join(", ")})</span>`
  }

  // Count lines in output
  const lineCount = output ? output.split("\n").length : 0
  const lineInfo = lineCount > 0 ? `<span class="read-lines">${lineCount} lines</span>` : ""

  // Determine if output should be collapsed by default (long output)
  const isLongOutput = lineCount > 50
  const collapsedClass = isLongOutput ? "collapsed" : ""

  // Format output - the read tool output typically includes line numbers
  let contentHtml = ""
  if (output) {
    contentHtml = `<div class="read-content">
      <pre><code>${escapeHtml(output)}</code></pre>
    </div>`
  }

  // Format error section
  let errorHtml = ""
  if (error) {
    errorHtml = `<div class="read-error">
      <span class="error-icon">&#9888;</span>
      <span class="error-message">${escapeHtml(error)}</span>
    </div>`
  }

  return `<div class="tool-call tool-read" data-status="${escapeHtml(status)}">
  <div class="tool-header" onclick="this.nextElementSibling.classList.toggle('collapsed')">
    <span class="tool-icon">&#128196;</span>
    <span class="read-file-path" title="${escapeHtml(filePath)}">${escapeHtml(fileName)}</span>
    <span class="read-full-path">${escapeHtml(filePath)}</span>
    ${rangeInfo}
    ${lineInfo}
    <span class="tool-toggle">${isLongOutput ? "+" : "-"}</span>
  </div>
  <div class="tool-body ${collapsedClass}">
    ${contentHtml}
    ${errorHtml}
  </div>
</div>`
}
