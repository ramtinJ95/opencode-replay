/**
 * Glob tool renderer
 * Renders file pattern matching operations with pattern and file list
 */

import type { ToolPart } from "../../../storage/types"
import { escapeHtml } from "../../../utils/html"

interface GlobToolInput {
  pattern: string
  path?: string
}

/**
 * Render a glob tool call with pattern and matching files
 */
export function renderGlobTool(part: ToolPart): string {
  const { state } = part
  const input = state.input as GlobToolInput | undefined
  const pattern = input?.pattern || ""
  const searchPath = input?.path || "."
  const output = state.output || ""
  const error = state.error
  const status = state.status

  // Parse output as file list (newline-separated)
  const files = output.trim() ? output.trim().split("\n").filter(Boolean) : []
  const fileCount = files.length

  // Determine if list should be collapsed
  const isLongList = fileCount > 20
  const collapsedClass = isLongList ? "collapsed" : ""

  // Format file list with icons
  const fileListHtml = files.length > 0
    ? `<ul class="glob-file-list">
        ${files.map(file => `<li class="glob-file-item">
          <span class="glob-file-icon">${getFileIcon(file)}</span>
          <span class="glob-file-name">${escapeHtml(file)}</span>
        </li>`).join("\n")}
      </ul>`
    : `<div class="glob-no-matches">No matching files</div>`

  // Format error section
  let errorHtml = ""
  if (error) {
    errorHtml = `<div class="glob-error">
      <span class="error-icon">&#9888;</span>
      <span class="error-message">${escapeHtml(error)}</span>
    </div>`
  }

  return `<div class="tool-call tool-glob" data-status="${escapeHtml(status)}">
  <div class="tool-header" onclick="this.nextElementSibling.classList.toggle('collapsed')">
    <span class="tool-icon">&#128269;</span>
    <span class="glob-pattern">${escapeHtml(pattern)}</span>
    <span class="glob-path">${escapeHtml(searchPath)}</span>
    <span class="glob-count">${fileCount} files</span>
    <span class="tool-toggle">${isLongList ? "+" : "-"}</span>
  </div>
  <div class="tool-body ${collapsedClass}">
    ${fileListHtml}
    ${errorHtml}
  </div>
</div>`
}

/**
 * Get an icon for a file based on extension
 */
function getFileIcon(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase() || ""
  
  // Directory (ends with /)
  if (filePath.endsWith("/")) return "&#128193;" // folder
  
  // Common file types
  const icons: Record<string, string> = {
    ts: "&#128220;",    // page with curl (TypeScript)
    tsx: "&#128220;",
    js: "&#128220;",
    jsx: "&#128220;",
    json: "&#128203;",  // clipboard
    md: "&#128196;",    // page facing up
    css: "&#127912;",   // art palette
    html: "&#127760;",  // globe
    py: "&#128013;",    // snake
    rs: "&#9881;",      // gear
    go: "&#128039;",    // hamster face
    rb: "&#128142;",    // gem stone
    sh: "&#128187;",    // computer
    yml: "&#128203;",
    yaml: "&#128203;",
  }
  
  return icons[ext] || "&#128196;" // default: page facing up
}
