/**
 * Grep tool markdown renderer
 * Renders content search operations
 */

import type { ToolPart } from "../../../storage/types"

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
 * Render a grep tool call as markdown
 */
export function renderGrepToolMd(part: ToolPart): string {
  const { state } = part
  const input = state.input as GrepToolInput | undefined
  const pattern = input?.pattern || ""
  const searchPath = input?.path || "."
  const include = input?.include
  const output = state.output || ""
  const error = state.error

  const lines: string[] = []

  // Parse output as matches
  const matches = parseGrepOutput(output)
  const matchCount = matches.length

  // Header
  const includeText = include ? ` (filter: \`${include}\`)` : ""
  lines.push(`**Grep:** \`${pattern}\` in \`${searchPath}\`${includeText} - ${matchCount} matches`)
  lines.push("")

  // Match list (collapsible if long)
  if (matches.length > 0) {
    if (matches.length > 20) {
      lines.push("<details>")
      lines.push(`<summary>Matches (${matchCount})</summary>`)
      lines.push("")
      for (const match of matches) {
        lines.push(`- \`${match.file}:${match.line}\` ${match.content}`)
      }
      lines.push("")
      lines.push("</details>")
    } else {
      for (const match of matches) {
        lines.push(`- \`${match.file}:${match.line}\` ${match.content}`)
      }
    }
    lines.push("")
  } else if (!error) {
    lines.push("*No matches found*")
    lines.push("")
  }

  // Error
  if (error) {
    lines.push(`> **Error:** ${error}`)
    lines.push("")
  }

  return lines.join("\n")
}

/**
 * Parse grep output into structured matches
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
