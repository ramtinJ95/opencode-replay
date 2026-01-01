/**
 * Grep tool renderer
 * Renders content search operations with pattern, filter, and matches
 */

import type { ToolPart } from "../../../storage/types"
import { escapeHtml } from "../../../utils/html"

interface GrepToolInput {
  pattern: string
  path?: string
  include?: string
}

interface GrepMatch {
  file: string
  line: number
  content: string
}

/**
 * Render a grep tool call with pattern and matching lines
 */
export function renderGrepTool(part: ToolPart): string {
  const { state } = part
  const input = state.input as GrepToolInput | undefined
  const pattern = input?.pattern || ""
  const searchPath = input?.path || "."
  const include = input?.include
  const output = state.output || ""
  const error = state.error
  const status = state.status

  // Parse output as matches (format: "filepath:linenum:content")
  const matches = parseGrepOutput(output)
  const matchCount = matches.length

  // Determine if list should be collapsed
  const isLongList = matchCount > 20
  const collapsedClass = isLongList ? "collapsed" : ""

  // Format include filter if present
  const includeHtml = include
    ? `<span class="grep-include" title="File filter">${escapeHtml(include)}</span>`
    : ""

  // Format matches list
  const matchesHtml = matches.length > 0
    ? `<ul class="grep-matches">
        ${matches.map(match => `<li class="grep-match">
          <span class="grep-match-file">${escapeHtml(match.file)}</span>
          <span class="grep-match-line">:${match.line}</span>
          <span class="grep-match-content">${escapeHtml(match.content)}</span>
        </li>`).join("\n")}
      </ul>`
    : `<div class="grep-no-matches">No matches found</div>`

  // Format error section
  let errorHtml = ""
  if (error) {
    errorHtml = `<div class="grep-error">
      <span class="error-icon">&#9888;</span>
      <span class="error-message">${escapeHtml(error)}</span>
    </div>`
  }

  return `<div class="tool-call tool-grep" data-status="${status}">
  <div class="tool-header" onclick="this.nextElementSibling.classList.toggle('collapsed')">
    <span class="tool-icon">&#128270;</span>
    <span class="grep-pattern">${escapeHtml(pattern)}</span>
    ${includeHtml}
    <span class="grep-path">${escapeHtml(searchPath)}</span>
    <span class="grep-count">${matchCount} matches</span>
    <span class="tool-toggle">${isLongList ? "+" : "-"}</span>
  </div>
  <div class="tool-body ${collapsedClass}">
    ${matchesHtml}
    ${errorHtml}
  </div>
</div>`
}

/**
 * Parse grep output into structured matches
 * Output format is typically "filepath:linenum:content" per line
 */
function parseGrepOutput(output: string): GrepMatch[] {
  if (!output.trim()) return []

  const lines = output.trim().split("\n")
  const matches: GrepMatch[] = []

  for (const line of lines) {
    // Match format: file:line:content or file:line
    const match = line.match(/^(.+?):(\d+):?(.*)$/)
    if (match && match[1] && match[2]) {
      matches.push({
        file: match[1],
        line: parseInt(match[2], 10),
        content: match[3] || "",
      })
    }
  }

  return matches
}
